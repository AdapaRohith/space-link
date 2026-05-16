import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, X, Download, Upload, ChevronLeft, ChevronRight, UserPlus, User, Phone
} from 'lucide-react';
import { createLead, filterLeads } from '../services/leadService';
import { getAllSources, getSourceName } from '../services/sourceService';
import { getAllUsers, getUserName, getSession } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import { LEAD_STATUSES } from '../data/seedData';
import './LeadList.css';

const PAGE_SIZE = 15;
const IMPORT_EXPORT_FIELDS = [
  'lead_name', 'phone', 'alternate_phone', 'email', 'source_id', 'source',
  'assigned_to', 'assigned_to_name', 'status', 'budget', 'preferred_location',
  'property_type', 'bhk', 'notes', 'referrer_name', 'referrer_phone',
];

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
  return header.trim().toLowerCase().replace(/\s+/g, '_');
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

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await filterLeads({ search: query.trim() });
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      }
      if (!cancelled) setLoading(false);
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

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
        <>
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
                      <div style={{ fontWeight: 600 }}>{lead.lead_name}</div>
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
        </>
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

  const getLeadFilters = useCallback(() => ({
    search,
    source_id: sourceFilter,
    status: statusFilter,
    assigned_to: assigneeFilter,
    date_from: dateFrom,
    date_to: dateTo,
  }), [search, sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo]);

  // Load leads when filters change
  useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      setLoading(true);
      try {
        const data = await filterLeads(getLeadFilters());
        if (!cancelled) {
          setLeads(data);
        }
      } catch {
        if (!cancelled) setLeads([]);
      }
      if (!cancelled) setLoading(false);
    }
    // Debounce search
    const timer = setTimeout(loadLeads, search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [getLeadFilters, search, refreshKey]);

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

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  const handleExport = async () => {
    const exportLeads = await filterLeads(getLeadFilters());
    const lines = [
      IMPORT_EXPORT_FIELDS.join(','),
      ...exportLeads.map(lead => IMPORT_EXPORT_FIELDS.map(field => {
        if (field === 'source') return csvEscape(getSourceName(lead.source_id, sources));
        if (field === 'assigned_to_name') return csvEscape(getUserName(lead.assigned_to, users));
        return csvEscape(lead[field]);
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

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage('');

    try {
      const rows = parseCsv(await file.text());
      const headers = rows[0]?.map(normalizeHeader) || [];
      const dataRows = rows.slice(1);
      let imported = 0;
      let skipped = 0;

      for (const row of dataRows) {
        const record = Object.fromEntries(headers.map((header, index) => [header, (row[index] || '').trim()]));
        const sourceId = record.source_id || sources.find(s =>
          s.source_name?.toLowerCase() === record.source?.toLowerCase()
        )?.id;
        const assignedTo = record.assigned_to || users.find(u =>
          u.name?.toLowerCase() === record.assigned_to_name?.toLowerCase()
        )?.id;

        if (!record.lead_name || !record.phone || !sourceId || !assignedTo) {
          skipped += 1;
          continue;
        }

        await createLead({
          lead_name: record.lead_name,
          phone: record.phone,
          alternate_phone: record.alternate_phone,
          email: record.email,
          source_id: sourceId,
          assigned_to: assignedTo,
          attended_by: record.attended_by || '',
          status: record.status || 'new',
          budget: record.budget,
          preferred_location: record.preferred_location,
          property_type: record.property_type,
          bhk: record.bhk,
          notes: record.notes,
          referrer_name: record.referrer_name,
          referrer_phone: record.referrer_phone,
        }, session.userId);
        imported += 1;
      }

      setImportMessage(`Imported ${imported} lead${imported !== 1 ? 's' : ''}${skipped ? `, skipped ${skipped} row${skipped !== 1 ? 's' : ''}` : ''}.`);
      setRefreshKey(key => key + 1);
    } catch {
      setImportMessage('Import failed. Please check the CSV format and try again.');
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
          <p className="page-subtitle">{leads.length} lead{leads.length !== 1 ? 's' : ''} found</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary" onClick={() => importInputRef.current?.click()} disabled={importing}>
            <Upload size={16} /> {importing ? 'Importing...' : 'Import'}
          </button>
          <button className="btn btn-secondary" onClick={handleExport} disabled={loading}>
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

      {/* Table */}
      {paginatedLeads.length > 0 ? (
        <>
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
                      <div style={{ fontWeight: 600 }}>{lead.lead_name}</div>
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
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <UserPlus size={28} />
          </div>
          <h3>No leads found</h3>
          <p>{search || activeFilters > 0 ? 'Try adjusting your search or filters' : 'Start by adding your first lead'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/leads/new')}>
            <Plus size={16} /> Add New Lead
          </button>
        </div>
      )}
    </div>
  );
}
