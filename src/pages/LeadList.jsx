import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, X, Download, Upload, ChevronLeft, ChevronRight, UserPlus, User, Phone
} from 'lucide-react';
import { bulkCreateLeads, checkDuplicate, filterLeads } from '../services/leadService';
import { addCustomSource, getAllSources, getSourceName } from '../services/sourceService';
import { getAllUsers, getUserName, getSession } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import MobileLeadStack from '../components/MobileLeadStack';
import { LEAD_STATUSES } from '../data/seedData';
import './LeadList.css';

// Case-insensitive prefix match on first name, last name, or full name.
// Digits-only query → phone contains match.
// "su" matches "Sushanth" or "Kumar Su..." but NOT "Kasu".
function matchesQuery(lead, query) {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (/^\d+$/.test(q)) {
    return (lead.phone || '').includes(q) || (lead.alternate_phone || '').includes(q);
  }
  const first = (lead.first_name || '').toLowerCase();
  const last  = (lead.last_name  || '').toLowerCase();
  const full  = (lead.lead_name  || '').toLowerCase();
  return first.startsWith(q) || last.startsWith(q) || full.startsWith(q);
}

const PAGE_SIZE = 15;
const IMPORT_EXPORT_COLUMNS = [
  { label: 'Date', key: 'date' },
  { label: 'Name', key: 'lead_name' },
  { label: 'Email Id', key: 'email' },
  { label: 'Phone No.', key: 'phone' },
  { label: 'Country Code', key: 'phone_country_code' },
  { label: 'Data Source', key: 'data_source' },
  { label: 'Requirement Summary', key: 'requirement_summary' },
  { label: 'Site Visit Scheduled', key: 'site_visit_scheduled' },
  { label: 'Site Visit Done', key: 'site_visit_done' },
  { label: 'Feedback', key: 'feedback' },
  { label: 'Attended / Handled by', key: 'attended_by' },
];
const EXPORT_COLUMNS = [
  { label: 'Date', key: 'date' },
  { label: 'Name', key: 'lead_name' },
  { label: 'Phone No.', key: 'phone' },
  { label: 'Alternate Number', key: 'alternate_phone' },
  { label: 'Country Code', key: 'phone_country_code' },
  { label: 'Email Id', key: 'email' },
  { label: 'Data Source', key: 'data_source' },
  { label: 'Status', key: 'status' },
  { label: 'Assigned To', key: 'assigned_to' },
  { label: 'Attended / Handled by', key: 'attended_by' },
  { label: 'Requirement Summary', key: 'requirement_summary' },
  { label: 'Budget', key: 'budget' },
  { label: 'Preferred Location', key: 'preferred_location' },
  { label: 'Property Type', key: 'property_type' },
  { label: 'BHK', key: 'bhk' },
  { label: 'Site Visit Scheduled', key: 'site_visit_scheduled' },
  { label: 'Site Visit Done', key: 'site_visit_done' },
  { label: 'Feedback', key: 'feedback' },
  { label: 'Created By', key: 'created_by' },
  { label: 'Updated At', key: 'updated_at' },
];
const REQUIRED_IMPORT_KEYS = ['lead_name', 'phone', 'data_source', 'attended_by'];
const REQUIRED_IMPORT_LABELS = {
  lead_name: 'Name',
  phone: 'Phone No.',
  data_source: 'Data Source',
  attended_by: 'Attended / Handled by',
};
const HEADER_ALIASES = {
  date: 'date',
  created_at: 'date',
  first_name: 'first_name',
  last_name: 'last_name',
  name: 'lead_name',
  lead_name: 'lead_name',
  email: 'email',
  email_id: 'email',
  phone: 'phone',
  phone_no: 'phone',
  phone_number: 'phone',
  mobile: 'phone',
  mobile_no: 'phone',
  mobile_number: 'phone',
  contact: 'phone',
  contact_no: 'phone',
  contact_number: 'phone',
  alternate_phone: 'alternate_phone',
  alternate_number: 'alternate_phone',
  alt_phone: 'alternate_phone',
  alternate_no: 'alternate_phone',
  secondary_phone: 'alternate_phone',
  secondary_number: 'alternate_phone',
  country_code: 'phone_country_code',
  phone_country_code: 'phone_country_code',
  data_source: 'data_source',
  source: 'data_source',
  source_id: 'data_source',
  lead_source: 'data_source',
  requirement_summary: 'requirement_summary',
  requirements: 'requirement_summary',
  budget: 'budget',
  preferred_location: 'preferred_location',
  location: 'preferred_location',
  property_type: 'property_type',
  bhk: 'bhk',
  status: 'status',
  site_visit_scheduled: 'site_visit_scheduled',
  site_visit_done: 'site_visit_done',
  feedback: 'feedback',
  feed_back: 'feedback',
  remarks: 'notes',
  notes: 'notes',
  attended_handled_by: 'attended_by',
  attended_by: 'attended_by',
  handled_by: 'attended_by',
  assigned_to: 'attended_by',
};

const SOURCE_ALIASES = {
  fb: 'Facebook',
  'fb ads': 'Facebook',
  facebook_ads: 'Facebook',
  facebook: 'Facebook',
  meta: 'Facebook',
  'meta ads': 'Facebook',
  instagram: 'Instagram',
  insta: 'Instagram',
  walkin: 'Walk-In',
  'walk in': 'Walk-In',
  reference: 'Reference',
  referral: 'Reference',
};

function normalizeCellValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeText(value) {
  const text = normalizeCellValue(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvEscape(value) {
  const raw = String(value ?? '');
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find(line => line.trim()) || '';
  const candidates = [',', ';', '\t'];
  return candidates
    .map(delimiter => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function parseCsv(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

async function inflateZipEntry(data, method) {
  if (method === 0) return data;
  if (method !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('XLSX import is not supported in this browser.');
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readXlsxEntries(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Import failed. Invalid XLSX file.');

  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map();

  for (let i = 0; i < entryCount; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    entries.set(name, await inflateZipEntry(compressed, method));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function parseXml(bytes) {
  return new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
}

function getText(node, tagName) {
  return Array.from(node.getElementsByTagName(tagName)).map(child => child.textContent || '').join('');
}

function columnIndex(cellRef) {
  const letters = String(cellRef || '').match(/[A-Z]+/i)?.[0] || 'A';
  return letters.toUpperCase().split('').reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function resolveZipPath(basePath, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = `${basePath}/${target}`.split('/');
  const resolved = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
}

async function parseXlsx(file) {
  const entries = await readXlsxEntries(file);
  const workbook = parseXml(entries.get('xl/workbook.xml'));
  const rels = parseXml(entries.get('xl/_rels/workbook.xml.rels'));
  const firstSheet = workbook.getElementsByTagName('sheet')[0];
  const relId = firstSheet?.getAttribute('r:id') || firstSheet?.getAttribute('id');
  const relationship = Array.from(rels.getElementsByTagName('Relationship'))
    .find(rel => rel.getAttribute('Id') === relId);
  const sheetPath = relationship
    ? resolveZipPath('xl', relationship.getAttribute('Target') || 'worksheets/sheet1.xml')
    : 'xl/worksheets/sheet1.xml';
  const sheetBytes = entries.get(sheetPath);
  if (!sheetBytes) throw new Error('Import failed. Could not read the first worksheet.');

  const sharedBytes = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedBytes
    ? Array.from(parseXml(sharedBytes).getElementsByTagName('si')).map(item => getText(item, 't'))
    : [];
  const sheet = parseXml(sheetBytes);

  return Array.from(sheet.getElementsByTagName('row')).map(row => {
    const cells = [];
    Array.from(row.getElementsByTagName('c')).forEach(cell => {
      const type = cell.getAttribute('t');
      const value = cell.getElementsByTagName('v')[0]?.textContent || '';
      const formula = cell.getElementsByTagName('f')[0]?.textContent || '';
      const inline = cell.getElementsByTagName('is')[0];
      const text = type === 's'
        ? sharedStrings[Number(value)] || ''
        : type === 'inlineStr'
          ? getText(inline || cell, 't')
          : value || (formula ? `=${formula}` : '');
      cells[columnIndex(cell.getAttribute('r'))] = text;
    });
    return cells.map(value => normalizeCellValue(value));
  }).filter(row => row.some(Boolean));
}

function isXlsxFile(file) {
  return file.name.toLowerCase().endsWith('.xlsx')
    || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

function normalizeHeader(header) {
  return normalizeCellValue(header).toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function canonicalHeader(header) {
  return HEADER_ALIASES[normalizeHeader(header)] || normalizeHeader(header);
}

function buildHeaders(row) {
  const headers = row.map(canonicalHeader);
  const seen = new Map();
  const duplicates = [];
  headers.forEach(header => {
    if (!header) return;
    if (seen.has(header)) duplicates.push(header);
    seen.set(header, true);
  });
  return { headers, duplicates };
}

function parseSheetBoolean(value) {
  const text = String(value || '').trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'done', 'scheduled'].includes(text);
}

function getLeadName(record) {
  const leadName = safeText(record.lead_name);
  if (leadName) return leadName;
  return [safeText(record.first_name), safeText(record.last_name)].filter(Boolean).join(' ').trim();
}

function splitLeadName(leadName) {
  const parts = String(leadName || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
  };
}

function normalizeImportStatus(status) {
  const text = normalizeCellValue(status).toLowerCase();
  const normalized = text.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const matched = LEAD_STATUSES.find(s => s.value === normalized || s.label.toLowerCase() === text);
  return matched?.value || 'new';
}

function normalizeImportDate(value) {
  const text = normalizeCellValue(value);
  if (!/^\d+(\.\d+)?$/.test(text)) return text;
  const serial = Number(text);
  if (!Number.isFinite(serial) || serial < 1) return text;
  const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(serial)));
  return date.toISOString().slice(0, 10);
}

function normalizeSourceName(value) {
  const text = safeText(value);
  const key = text.toLowerCase();
  return SOURCE_ALIASES[key] || text;
}

function expandScientificNumber(value) {
  const text = normalizeCellValue(value);
  if (!/^\d+(\.\d+)?e\+?\d+$/i.test(text)) return text;
  const number = Number(text);
  if (!Number.isFinite(number)) return text;
  return number.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 0 });
}

function phoneCandidates(value) {
  const text = expandScientificNumber(value);
  const splitCandidates = text
    .split(/[\/,;|]+|\bor\b/gi)
    .map(part => part.replace(/\D/g, ''))
    .filter(Boolean);
  const combined = text.replace(/\D/g, '');
  return [...splitCandidates, combined].filter(Boolean);
}

function normalizePhone(value) {
  const candidates = phoneCandidates(value);
  for (const digits of candidates) {
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length > 10 && digits.length <= 15) return digits.slice(-10);
  }
  return '';
}

function getExtraPhone(value, primaryPhone) {
  return phoneCandidates(value)
    .map(candidate => normalizePhone(candidate))
    .find(phone => phone && phone !== primaryPhone) || '';
}

function exportFieldValue(lead, column, sources, users) {
  if (column.key === 'date') return lead.created_at ? formatDate(lead.created_at) : '';
  if (column.key === 'updated_at') return lead.updated_at ? formatDate(lead.updated_at) : '';
  if (column.key === 'data_source') return lead.data_source || getSourceName(lead.source_id, sources);
  if (column.key === 'assigned_to' || column.key === 'created_by') return getUserName(lead[column.key], users);
  if (column.key === 'attended_by') return lead.attended_by || '';
  if (column.key === 'site_visit_scheduled' || column.key === 'site_visit_done') {
    return lead[column.key] ? 'Yes' : 'No';
  }
  return lead[column.key] ?? '';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ── Sales-only search view ────────────────────────────────── */
function SalesSearchView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [users, setUsers] = useState([]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    async function loadRef() {
      setUsers(await getAllUsers());
      try { setSources(await getAllSources()); } catch { setSources([]); }
    }
    loadRef();
  }, []);

  // Only search when user has typed at least 3 characters
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }

    const q = query.trim();
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await filterLeads({ search: q });
        if (!cancelled) setResults((data || []).filter(l => matchesQuery(l, q)));
      } catch {
        if (!cancelled) setResults([]);
      }
      if (!cancelled) setLoading(false);
    }, 120);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return (
    <div className="page leads-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Search Leads</h1>
          <p className="page-subtitle">Find a lead by name or phone number</p>
        </div>
      </div>

      {/* Search Bar — prominent, centered */}
      <div className="sales-search-wrapper">
        <div className="sales-search-box">
          <Search size={20} className="sales-search-icon" />
          <input
            type="text"
            placeholder="Enter lead name or phone number..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        {query.trim().length > 0 && query.trim().length < 3 && (
          <p className="sales-search-hint">Type at least 3 characters to search</p>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="sales-search-status">
          <div className="spinner" />
          <span>Searching...</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={28} />
          </div>
          <h3>No matching leads</h3>
          <p>No lead found with that name or phone number. Please try a different search.</p>
        </div>
      )}

      {!loading && searched && results.length > 0 && (
        isMobile ? (
          <MobileLeadStack leads={results} onRefresh={() => {}} />
        ) : (
        <div key={query} className="results-appear">
          <div className="sales-results-header">
            <span className="sales-results-count">
              Found <strong>{results.length}</strong> matching lead{results.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {results.map(lead => (
                  <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {lead.first_name ? `${lead.first_name} ${lead.last_name || ''}`.trim() : lead.lead_name}
                      </div>
                      {lead.email && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {lead.email}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {lead.phone}
                    </td>
                    <td>{getSourceName(lead.source_id, sources)}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{getUserName(lead.assigned_to, users)}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* Hero section — shown when no search is active */}
      {!loading && !searched && (
        <div className="sales-search-hero">
          {/* Animated visual */}
          <div className="sales-hero-visual">
            <div className="sales-hero-icon">
              <Search size={28} />
            </div>
          </div>

          {/* Text */}
          <div className="sales-hero-text">
            <h3>Search for a Lead</h3>
            <p>Enter a lead's name or phone number in the search bar above to quickly find their details.</p>
          </div>

          {/* Tip cards */}
          <div className="sales-tips">
            <div className="sales-tip-card">
              <div className="sales-tip-icon tip-name">
                <User size={18} />
              </div>
              <div className="sales-tip-label">
                <strong>By Name</strong>
                Search using the lead's full or partial name
              </div>
            </div>
            <div className="sales-tip-card">
              <div className="sales-tip-icon tip-phone">
                <Phone size={18} />
              </div>
              <div className="sales-tip-label">
                <strong>By Phone</strong>
                Enter the phone number to find a match
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component — role switch ──────────────────────────── */
export default function LeadList() {
  const session = getSession();
  const isSales = session?.role === 'sales';

  // Sales users get the search-only view
  if (isSales) return <SalesSearchView />;

  // Admin/other roles get the full list view
  return <AdminLeadList />;
}

/* ── Admin full lead list (original) ───────────────────────── */
function AdminLeadList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importInputRef = useRef(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [assigneeFilter, setAssigneeFilter] = useState(searchParams.get('assignee') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  const [page, setPage] = useState(1);

  const [sources, setSources] = useState([]);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [showImportRequirements, setShowImportRequirements] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportUseCurrentFilters, setExportUseCurrentFilters] = useState(true);
  const [exportDateFrom, setExportDateFrom] = useState(searchParams.get('from') || '');
  const [exportDateTo, setExportDateTo] = useState(searchParams.get('to') || '');
  const [selectedExportFields, setSelectedExportFields] = useState(
    EXPORT_COLUMNS.map(column => column.key)
  );
  const [recentImportedLeads, setRecentImportedLeads] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const session = getSession();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load reference data once
  useEffect(() => {
    async function loadRef() {
      setUsers(await getAllUsers());
      try {
        const srcs = await getAllSources();
        setSources(srcs);
      } catch {
        setSources([]);
      }
    }
    loadRef();
  }, []);

  const hasSearch = search.trim().length > 0;
  const hasFilters = !!(sourceFilter || statusFilter || assigneeFilter || dateFrom || dateTo);
  const canShowRecentImports = recentImportedLeads.length > 0 && !hasSearch && !hasFilters;
  const canShowLeads = hasSearch || hasFilters || canShowRecentImports;
  const visibleSources = sources.filter(s => s.source_name?.trim().toLowerCase() !== 'other');

  const getLeadFilters = useCallback(() => ({
    search,
    source_id: sourceFilter,
    status: statusFilter,
    assigned_to: assigneeFilter,
    date_from: dateFrom,
    date_to: dateTo,
  }), [search, sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo]);

  // Only load leads when a search term or filter is active
  useEffect(() => {
    if (canShowRecentImports) {
      setLeads(recentImportedLeads);
      setLoading(false);
      return;
    }
    if (!canShowLeads) {
      setLeads([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function loadLeads() {
      setLoading(true);
      try {
        const data = await filterLeads(getLeadFilters());
        if (!cancelled) {
          // Client-side exact substring filter so backend fuzzy matches don't leak through
          const s = search.trim();
          const filtered = s
            ? (data || []).filter(l => matchesQuery(l, s))
            : (data || []);
          setLeads(filtered);
        }
      } catch {
        if (!cancelled) setLeads([]);
      }
      if (!cancelled) setLoading(false);
    }
    const timer = setTimeout(loadLeads, search ? 100 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [getLeadFilters, search, refreshKey, canShowLeads, canShowRecentImports, recentImportedLeads]);

  const totalPages = Math.ceil(leads.length / PAGE_SIZE);
  const paginatedLeads = leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo]);

  const activeFilters = [sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setSourceFilter('');
    setStatusFilter('');
    setAssigneeFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setRecentImportedLeads([]);
  };

  const toggleExportField = (key) => {
    setSelectedExportFields(fields => (
      fields.includes(key)
        ? fields.filter(field => field !== key)
        : [...fields, key]
    ));
  };

  const handleExport = async () => {
    const exportColumns = EXPORT_COLUMNS.filter(column => selectedExportFields.includes(column.key));
    if (!exportColumns.length) {
      setImportMessage('Export failed. Select at least one field.');
      return;
    }

    setExporting(true);
    try {
      const filters = exportUseCurrentFilters
        ? { ...getLeadFilters(), date_from: exportDateFrom || dateFrom, date_to: exportDateTo || dateTo }
        : { date_from: exportDateFrom, date_to: exportDateTo };
      const exportLeads = exportUseCurrentFilters && canShowRecentImports
        ? recentImportedLeads
        : await filterLeads(filters);
      const filteredLeads = exportUseCurrentFilters && search.trim()
        ? (exportLeads || []).filter(lead => matchesQuery(lead, search.trim()))
        : (exportLeads || []);

      const lines = [
        exportColumns.map(column => column.label).join(','),
        ...filteredLeads.map(lead => exportColumns.map(column => (
          csvEscape(exportFieldValue(lead, column, sources, users))
        )).join(',')),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `space-link-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
      setImportMessage(`Exported ${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      setImportMessage(err.message || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    setShowImportRequirements(true);
    setShowImportConfirm(true);
  };

  const handleConfirmImport = () => {
    setShowImportConfirm(false);
    importInputRef.current?.click();
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage('');

    try {
      const rows = isXlsxFile(file) ? await parseXlsx(file) : parseCsv(await file.text());
      if (!rows.length) {
        setImportMessage('Import failed. The sheet is empty.');
        return;
      }

      const { headers, duplicates: duplicateHeaders } = buildHeaders(rows[0] || []);
      if (duplicateHeaders.length) {
        setImportMessage(`Import failed. Duplicate column headers: ${duplicateHeaders.map(key => REQUIRED_IMPORT_LABELS[key] || key).join(', ')}.`);
        return;
      }

      const missingHeaders = REQUIRED_IMPORT_KEYS.filter(key => !headers.includes(key));
      if (missingHeaders.length) {
        setImportMessage(`Import failed. Missing required columns: ${missingHeaders.map(key => REQUIRED_IMPORT_LABELS[key]).join(', ')}.`);
        return;
      }
      const dataRows = rows.slice(1);
      let importRecords = [];
      const rowErrors = [];
      const sourceMap = new Map(
        sources.map(source => [
          source.source_name.trim().toLowerCase(),
          { id: source.id, source_name: source.source_name },
        ])
      );
      const phonesInFile = new Map();

      for (const [index, row] of dataRows.entries()) {
        if (!row.some(value => normalizeCellValue(value))) continue;

        const record = Object.fromEntries(headers.map((header, index) => [header, normalizeCellValue(row[index])]));
        const leadName = getLeadName(record);
        const nameParts = splitLeadName(leadName);
        const cleanPhone = normalizePhone(record.phone);
        const cleanAlternatePhone = normalizePhone(record.alternate_phone) || getExtraPhone(record.phone, cleanPhone);
        const sourceText = normalizeSourceName(record.data_source);
        const sourceKey = sourceText?.toLowerCase();
        const handledBy = safeText(record.attended_by);

        const missing = [];
        if (!leadName) missing.push('Name');
        if (!cleanPhone) missing.push('Phone No.');
        if (!sourceText) missing.push('Data Source');
        if (!handledBy) missing.push('Attended / Handled by');
        if (record.phone && !cleanPhone) missing.push('valid 10-digit phone');
        if (record.alternate_phone && !cleanAlternatePhone) missing.push('valid alternate phone');

        if (missing.length) {
          rowErrors.push(`row ${index + 2}: ${missing.join(', ')}`);
          continue;
        }

        for (const phone of [cleanPhone, cleanAlternatePhone].filter(Boolean)) {
          if (phonesInFile.has(phone)) {
            missing.push(`duplicate phone also on row ${phonesInFile.get(phone)}`);
          } else {
            phonesInFile.set(phone, index + 2);
          }
        }

        if (missing.length) {
          rowErrors.push(`row ${index + 2}: ${missing.join(', ')}`);
          continue;
        }

        importRecords.push({
          _rowNumber: index + 2,
          date: normalizeImportDate(record.date),
          first_name: safeText(record.first_name) || nameParts.first_name,
          last_name: safeText(record.last_name) || nameParts.last_name,
          lead_name: leadName,
          phone: cleanPhone,
          alternate_phone: cleanAlternatePhone,
          phone_country_code: record.phone_country_code || '91',
          email: safeText(record.email),
          source_id: '',
          data_source: sourceText,
          _sourceKey: sourceKey,
          assigned_to: session.userId,
          attended_by: handledBy,
          tele_caller_name: '',
          requirement_summary: safeText(record.requirement_summary),
          site_visit_scheduled: parseSheetBoolean(record.site_visit_scheduled),
          site_visit_done: parseSheetBoolean(record.site_visit_done),
          feedback: safeText(record.feedback),
          status: normalizeImportStatus(record.status),
          budget: safeText(record.budget),
          preferred_location: safeText(record.preferred_location),
          property_type: safeText(record.property_type),
          bhk: safeText(record.bhk),
          notes: safeText(record.notes || record.requirement_summary),
        });
      }

      if (!importRecords.length) {
        setImportMessage(`Import failed. No valid data rows found.${rowErrors.length ? ` Skipped ${rowErrors.slice(0, 5).join('; ')}${rowErrors.length > 5 ? ` and ${rowErrors.length - 5} more` : ''}.` : ''}`);
        return;
      }

      const backendDuplicates = [];
      const dedupedRecords = [];
      for (const record of importRecords) {
        const dupes = await checkDuplicate(record.phone, record.alternate_phone);
        if (dupes.length) {
          const existing = dupes[0];
          backendDuplicates.push(
            `row ${record._rowNumber}: ${record.phone} already exists as ${existing.lead_name || existing.phone}`
          );
        } else {
          dedupedRecords.push(record);
        }
      }
      rowErrors.push(...backendDuplicates);
      importRecords = dedupedRecords;

      if (!importRecords.length) {
        setImportMessage(`Import failed. No new valid leads to import. Skipped ${rowErrors.slice(0, 5).join('; ')}${rowErrors.length > 5 ? ` and ${rowErrors.length - 5} more` : ''}.`);
        return;
      }

      for (const record of importRecords) {
        let source = sourceMap.get(record._sourceKey);
        if (!source) {
          source = await addCustomSource(record.data_source);
          sourceMap.set(record._sourceKey, source);
        }
        record.source_id = source.id;
        record.data_source = source.source_name;
        delete record._sourceKey;
        delete record._rowNumber;
      }

      const result = await bulkCreateLeads(importRecords, session.userId);
      const imported = result.imported || importRecords.length;
      const importedLeads = Array.isArray(result.leads) ? result.leads : [];
      setRecentImportedLeads(importedLeads);
      setLeads(importedLeads);
      setSearch('');
      setSourceFilter('');
      setStatusFilter('');
      setAssigneeFilter('');
      setDateFrom('');
      setDateTo('');
      setImportMessage(
        `Imported ${imported} lead${imported !== 1 ? 's' : ''}.`
        + (rowErrors.length
          ? ` Skipped ${rowErrors.length} row${rowErrors.length !== 1 ? 's' : ''}: ${rowErrors.slice(0, 5).join('; ')}${rowErrors.length > 5 ? ` and ${rowErrors.length - 5} more` : ''}.`
          : '')
        + ' Showing imported leads below.'
      );
      try {
        setSources(await getAllSources());
      } catch {}
      setRefreshKey(key => key + 1);
    } catch (err) {
      setImportMessage(err.message || 'Import failed. Please check the CSV format and try again.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="page leads-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">All Leads</h1>
          <p className="page-subtitle">
            {canShowLeads
              ? `${leads.length} lead${leads.length !== 1 ? 's' : ''} found`
              : 'Search by name or phone to view leads'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary" onClick={handleImportClick} disabled={importing}>
            <Download size={16} /> {importing ? 'Importing...' : 'Import'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowExportModal(true)} disabled={loading || importing || exporting}>
            <Upload size={16} /> {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/leads/new')}>
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="form-error" style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
          {importMessage}
        </div>
      )}

      {showImportRequirements && (
        <div style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
          Import sheet required columns: Name, Phone No., Data Source, Attended / Handled by.
          Accepted formats: CSV or XLSX. Optional columns: Date, Email Id, Country Code, Requirement Summary, Site Visit Scheduled, Site Visit Done, Feedback.
        </div>
      )}

      <ConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => setShowImportConfirm(false)}
        onConfirm={handleConfirmImport}
        title="Confirm Import"
        message="Your CSV or XLSX must include Name, Phone No., Data Source, and Attended / Handled by for every row. Missing required columns or values will reject the import."
        confirmText="Choose File"
      />

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Leads"
        wide
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting || selectedExportFields.length === 0}>
            <Upload size={14} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </>}
      >
        <div className="form-row">
          <div className="form-group">
            <label>Export Scope</label>
            <select value={exportUseCurrentFilters ? 'current' : 'all'} onChange={e => setExportUseCurrentFilters(e.target.value === 'current')}>
              <option value="current">Current search and filters</option>
              <option value="all">All leads</option>
            </select>
          </div>
          <div className="form-group">
            <label>From Date</label>
            <input type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)} />
          </div>
        </div>

        <div className="form-section-title" style={{ marginTop: 'var(--space-3)' }}>Fields</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-3)' }}>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedExportFields(EXPORT_COLUMNS.map(column => column.key))}>
            Select All
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedExportFields([])}>
            Clear
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {EXPORT_COLUMNS.map(column => (
            <label key={column.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="checkbox"
                checked={selectedExportFields.includes(column.key)}
                onChange={() => toggleExportField(column.key)}
              />
              {column.label}
            </label>
          ))}
        </div>
      </Modal>

      {/* Search & Filters */}
      <div className="filter-bar">
        <div className="search-box" style={{ maxWidth: '280px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {visibleSources.map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
          <option value="">All Assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="From Date"
          style={{ minWidth: '140px' }}
        />

        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="To Date"
          style={{ minWidth: '140px' }}
        />

        {activeFilters > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <X size={14} /> Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* Prompt — shown when no search or filter is active */}
      {!canShowLeads && (
        <div className="sales-search-hero">
          <div className="sales-hero-visual">
            <div className="sales-hero-icon"><Search size={28} /></div>
          </div>
          <div className="sales-hero-text">
            <h3>Search to see leads</h3>
            <p>Type a name or phone number in the search box, or use the filters above to find leads.</p>
          </div>
        </div>
      )}

      {/* Table */}
      {canShowLeads && paginatedLeads.length > 0 ? (
        isMobile ? (
          <MobileLeadStack leads={leads} onRefresh={() => setRefreshKey(k => k + 1)} />
        ) : (
        <div key={search + sourceFilter + statusFilter} className="results-appear">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map(lead => (
                  <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td>
                      <div className="lead-name-cell">
                        <div className="lead-avatar">
                          {(lead.first_name || lead.lead_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {lead.first_name ? `${lead.first_name} ${lead.last_name || ''}`.trim() : lead.lead_name}
                          </div>
                          {lead.email && (
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {lead.phone}
                    </td>
                    <td>{getSourceName(lead.source_id, sources)}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{getUserName(lead.assigned_to, users)}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {formatDate(lead.created_at)}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {formatDate(lead.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        )
      ) : canShowLeads ? (
        <div className="empty-state">
          <div className="empty-state-icon"><UserPlus size={28} /></div>
          <h3>No leads found</h3>
          <p>No lead matched your search. Try a different name or phone number.</p>
          <button className="btn btn-primary" onClick={() => navigate('/leads/new')}>
            <Plus size={16} /> Add New Lead
          </button>
        </div>
      ) : null}
    </div>
  );
}
