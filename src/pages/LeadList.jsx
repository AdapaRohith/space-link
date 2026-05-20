import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, X, Download, Upload, ChevronLeft, ChevronRight, UserPlus, User, Phone
} from 'lucide-react';
import { bulkCreateLeads, filterLeads } from '../services/leadService';
import { getAllSources, getSourceName } from '../services/sourceService';
import { getAllUsers, getUserName, getSession } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
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
  { label: 'Tele Caller Name', key: 'tele_caller_name' },
  { label: 'Requirement Summary', key: 'requirement_summary' },
  { label: 'Site Visit Scheduled', key: 'site_visit_scheduled' },
  { label: 'Site Visit Done', key: 'site_visit_done' },
  { label: 'Feedback', key: 'feedback' },
  { label: 'Attended / Handled by', key: 'attended_by' },
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
  name: 'lead_name',
  lead_name: 'lead_name',
  email: 'email',
  email_id: 'email',
  phone: 'phone',
  phone_no: 'phone',
  phone_number: 'phone',
  country_code: 'phone_country_code',
  phone_country_code: 'phone_country_code',
  data_source: 'data_source',
  source: 'data_source',
  source_id: 'data_source',
  tele_caller_name: 'tele_caller_name',
  telecaller_name: 'tele_caller_name',
  requirement_summary: 'requirement_summary',
  requirements: 'requirement_summary',
  site_visit_scheduled: 'site_visit_scheduled',
  site_visit_done: 'site_visit_done',
  feedback: 'feedback',
  feed_back: 'feedback',
  attended_handled_by: 'attended_by',
  attended_by: 'attended_by',
  handled_by: 'attended_by',
  assigned_to: 'attended_by',
};

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
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
    } else if (char === ',' && !inQuotes) {
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

function normalizeHeader(header) {
  return header.trim().toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function canonicalHeader(header) {
  return HEADER_ALIASES[normalizeHeader(header)] || normalizeHeader(header);
}

function parseSheetBoolean(value) {
  const text = String(value || '').trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'done', 'scheduled'].includes(text);
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
    <div className="page">
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
  const [refreshKey, setRefreshKey] = useState(0);
  const session = getSession();

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
  const canShowLeads = hasSearch || hasFilters;

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
  }, [getLeadFilters, search, refreshKey, canShowLeads]);

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
  };

  const handleExport = async () => {
    const exportLeads = await filterLeads(getLeadFilters());
    const lines = [
      IMPORT_EXPORT_COLUMNS.map(column => column.label).join(','),
      ...exportLeads.map(lead => IMPORT_EXPORT_COLUMNS.map(column => {
        if (column.key === 'date') return csvEscape(lead.created_at ? formatDate(lead.created_at) : '');
        if (column.key === 'data_source') return csvEscape(lead.data_source || getSourceName(lead.source_id, sources));
        if (column.key === 'attended_by') return csvEscape(getUserName(lead.attended_by || lead.assigned_to, users));
        if (column.key === 'site_visit_scheduled' || column.key === 'site_visit_done') {
          return csvEscape(lead[column.key] ? 'Yes' : 'No');
        }
        return csvEscape(lead[column.key]);
      }).join(',')),
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
      const rows = parseCsv(await file.text());
      const headers = rows[0]?.map(canonicalHeader) || [];
      const missingHeaders = REQUIRED_IMPORT_KEYS.filter(key => !headers.includes(key));
      if (missingHeaders.length) {
        setImportMessage(`Import failed. Missing required columns: ${missingHeaders.map(key => REQUIRED_IMPORT_LABELS[key]).join(', ')}.`);
        return;
      }
      const dataRows = rows.slice(1);
      const importRecords = [];
      const rowErrors = [];

      dataRows.forEach((row, index) => {
        const record = Object.fromEntries(headers.map((header, index) => [header, (row[index] || '').trim()]));
        const cleanPhone = record.phone.replace(/\D/g, '');
        const sourceId = sources.find(s =>
          s.id?.toLowerCase() === record.data_source?.toLowerCase()
          || s.source_name?.toLowerCase() === record.data_source?.toLowerCase()
        )?.id;
        const handledBy = users.find(u =>
          u.id?.toLowerCase() === record.attended_by?.toLowerCase()
          || u.email?.toLowerCase() === record.attended_by?.toLowerCase()
          || u.name?.toLowerCase() === record.attended_by?.toLowerCase()
        )?.id;

        const missing = [];
        if (!record.lead_name) missing.push('Name');
        if (!cleanPhone) missing.push('Phone No.');
        if (!sourceId) missing.push('Data Source');
        if (!handledBy) missing.push('Attended / Handled by');

        if (missing.length) {
          rowErrors.push(`row ${index + 2}: ${missing.join(', ')}`);
          return;
        }

        importRecords.push({
          date: record.date,
          lead_name: record.lead_name,
          phone: cleanPhone,
          phone_country_code: record.phone_country_code,
          email: record.email,
          source_id: sourceId,
          data_source: record.data_source,
          assigned_to: handledBy,
          attended_by: handledBy,
          tele_caller_name: record.tele_caller_name,
          requirement_summary: record.requirement_summary,
          site_visit_scheduled: parseSheetBoolean(record.site_visit_scheduled),
          site_visit_done: parseSheetBoolean(record.site_visit_done),
          feedback: record.feedback,
          status: record.status || 'new',
          notes: record.requirement_summary,
        });
      });

      if (rowErrors.length) {
        setImportMessage(`Import failed. Fix ${rowErrors.slice(0, 5).join('; ')}${rowErrors.length > 5 ? ` and ${rowErrors.length - 5} more` : ''}.`);
        return;
      }

      if (!importRecords.length) {
        setImportMessage('Import failed. No valid data rows found.');
        return;
      }

      const result = await bulkCreateLeads(importRecords, session.userId);
      const imported = result.imported || importRecords.length;
      setImportMessage(`Imported ${imported} lead${imported !== 1 ? 's' : ''}.`);
      setRefreshKey(key => key + 1);
    } catch (err) {
      setImportMessage(err.message || 'Import failed. Please check the CSV format and try again.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="page">
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
            accept=".csv,text/csv,application/vnd.ms-excel"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary" onClick={handleImportClick} disabled={importing}>
            <Upload size={16} /> {importing ? 'Importing...' : 'Import'}
          </button>
          <button className="btn btn-secondary" onClick={handleExport} disabled={loading || importing}>
            <Download size={16} /> Export
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
          Optional columns: Date, Email Id, Country Code, Tele Caller Name, Requirement Summary, Site Visit Scheduled, Site Visit Done, Feedback.
        </div>
      )}

      <ConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => setShowImportConfirm(false)}
        onConfirm={handleConfirmImport}
        title="Confirm Import"
        message="Your CSV must include Name, Phone No., Data Source, and Attended / Handled by for every row. Missing required columns or values will reject the import."
        confirmText="Choose CSV"
      />

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
          {sources.map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
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
