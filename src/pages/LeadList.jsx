import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Plus, X, Download, ChevronLeft, ChevronRight, UserPlus
} from 'lucide-react';
import { filterLeads } from '../services/leadService';
import { getAllSources, getSourceName } from '../services/sourceService';
import { getAllUsers, getUserName } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import { LEAD_STATUSES } from '../data/seedData';
import './LeadList.css';

const PAGE_SIZE = 15;

export default function LeadList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Load reference data once
  useEffect(() => {
    async function loadRef() {
      setUsers(getAllUsers());
      try {
        const srcs = await getAllSources();
        setSources(srcs);
      } catch {
        setSources([]);
      }
    }
    loadRef();
  }, []);

  // Load leads when filters change
  useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      setLoading(true);
      try {
        const data = await filterLeads({
          search,
          source_id: sourceFilter,
          status: statusFilter,
          assigned_to: assigneeFilter,
          date_from: dateFrom,
          date_to: dateTo,
        });
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
  }, [search, sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo]);

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

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">All Leads</h1>
          <p className="page-subtitle">{leads.length} lead{leads.length !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/leads/new')}>
          <Plus size={16} /> Add Lead
        </button>
      </div>

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
