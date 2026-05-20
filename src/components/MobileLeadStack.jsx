import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, ChevronRight, RefreshCw } from 'lucide-react';
import StatusBadge from './StatusBadge';
import './MobileLeadStack.css';

function getLeadName(lead) {
  if (lead.first_name || lead.last_name) {
    return `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  }
  return lead.lead_name || 'Unknown';
}

function getWhatsAppUrl(phone, countryCode) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) {
    const code = countryCode ? String(countryCode).replace(/\D/g, '') : '91';
    digits = `${code}${digits}`;
  }
  return digits ? `https://wa.me/${digits}` : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MobileLeadStack({ leads, onRefresh }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const pullRef = useRef({ startY: 0, pulling: false });
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    containerRef.current?.scrollTo({ top: 0 });
  }, [leads]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCurrentIndex(Math.round(el.scrollTop / el.clientHeight));
  };

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      pullRef.current = { startY: e.touches[0].clientY, pulling: true };
    } else {
      pullRef.current.pulling = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!pullRef.current.pulling) return;
    const delta = e.touches[0].clientY - pullRef.current.startY;
    if (delta > 0) setPullDistance(Math.min(delta, 80));
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    pullRef.current.pulling = false;
  };

  if (!leads.length) return null;

  return (
    <div className="mls-wrap">
      <div
        className="mls-pull-indicator"
        style={{ opacity: pullDistance / 80, transform: `translateY(${pullDistance * 0.4}px)` }}
      >
        <RefreshCw
          size={18}
          className={refreshing ? 'mls-spinning' : ''}
          style={{ transform: `rotate(${pullDistance * 4}deg)` }}
        />
        <span>{pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
      <div className="mls-counter">{currentIndex + 1} / {leads.length}</div>
      <div
        ref={containerRef}
        className="mls-container"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {leads.map((lead) => {
          const waUrl = getWhatsAppUrl(lead.phone, lead.phone_country_code);
          const telHref = lead.phone
            ? `tel:${lead.phone_country_code ? `+${String(lead.phone_country_code).replace(/\D/g,'')}` : ''}${lead.phone}`
            : '';

          return (
            <div key={lead.id} className="mls-card">
              <div className="mls-card-inner">
                <div className="mls-top-row">
                  <StatusBadge status={lead.status} />
                  {lead.source_name && (
                    <span className="mls-source-chip">{lead.source_name}</span>
                  )}
                </div>

                <div className="mls-name">{getLeadName(lead)}</div>

                {lead.phone && (
                  <a href={telHref} className="mls-phone">
                    <Phone size={13} />
                    {lead.phone}
                    {lead.alternate_phone && (
                      <span className="mls-alt-badge">+alt</span>
                    )}
                  </a>
                )}

                {(lead.property_type || lead.bhk || lead.preferred_location) && (
                  <div className="mls-chips">
                    {lead.property_type && <span className="mls-chip">{lead.property_type}</span>}
                    {lead.bhk && <span className="mls-chip">{lead.bhk}</span>}
                    {lead.preferred_location && (
                      <span className="mls-chip">{lead.preferred_location}</span>
                    )}
                  </div>
                )}

                {lead.requirement_summary && (
                  <div className="mls-summary">{lead.requirement_summary}</div>
                )}

                <div className="mls-meta">{formatDate(lead.created_at)}</div>

                <div className="mls-actions">
                  {lead.phone && (
                    <a href={telHref} className="mls-btn mls-btn-call">
                      <Phone size={17} />
                      <span>Call</span>
                    </a>
                  )}
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mls-btn mls-btn-wa"
                    >
                      <MessageCircle size={17} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    className="mls-btn mls-btn-view"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <span>Details</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
