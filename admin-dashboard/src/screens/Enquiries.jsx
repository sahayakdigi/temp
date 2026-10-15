import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Search, Filter, Clock, CheckCircle2, 
  AlertCircle, ChevronRight, Send, ArrowRight, Info,
  TrendingUp, Award, User, Phone, MapPin, Package,
  Weight, Sliders, DollarSign, Calendar, Trash2
} from 'lucide-react';
import { api } from '../services/api';

export default function Enquiries({ showToast }) {
  const extractProposedRate = (msg) => {
    if (!msg) return null;
    const match = msg.match(/Proposed Target Rate:\s*([^\n]+)/);
    return match ? match[1] : null;
  };

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  
  // Interactive quote action states
  const [adminNotes, setAdminNotes] = useState('');
  const [customQuotePrice, setCustomQuotePrice] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    loadEnquiries();
  }, []);

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      // Fetch all feedback/enquiries for the admin
      const data = await api.getFeedback('admin');
      // Filter for Rate Enquiries
      const filtered = (data || []).filter(item => item.type === 'Rate Enquiry');
      setEnquiries(filtered);
      
      // Select first enquiry by default if available
      if (filtered.length > 0 && !selectedEnquiry) {
        setSelectedEnquiry(filtered[0]);
      } else if (selectedEnquiry) {
        // Refresh currently selected enquiry details if it exists
        const updatedSelected = filtered.find(e => e.id === selectedEnquiry.id);
        if (updatedSelected) setSelectedEnquiry(updatedSelected);
      }
    } catch (err) {
      console.error('Failed to load enquiries:', err);
      showToast('Error loading enquiries');
    } finally {
      setLoading(false);
    }
  };

  const totalEnquiries = enquiries.length;
  const pendingCount = enquiries.filter(e => e.status === 'Submitted' || e.status === 'Under Review').length;
  const respondedCount = enquiries.filter(e => e.status === 'Quoted' || e.status === 'Completed').length;
  const conversionRate = totalEnquiries > 0 ? Math.round((respondedCount / totalEnquiries) * 100) : 0;

  // Filter enquiries list
  const filteredList = enquiries.filter(enq => {
    const matchesSearch = 
      enq.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (enq.userName && enq.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      enq.message.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || enq.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--brand-glow)', padding: '8px', borderRadius: 'var(--radius-md)', color: 'var(--brand-light)' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Rate Enquiries</h1>
            <p className="page-subtitle" style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Manage, review, and issue quotes for instant rate requests submitted by clients.
            </p>
          </div>
        </div>

        {enquiries.some(e => String(e.id).startsWith('FB-')) && (
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to clear all mock enquiries from local storage?')) {
                localStorage.removeItem('temp_feedback');
                showToast('Mock enquiries cleared.');
                setSelectedEnquiry(null);
                loadEnquiries();
              }
            }}
            className="btn-ghost"
            style={{
              padding: '8px 16px',
              fontSize: '0.78rem',
              color: 'var(--accent-warning)',
              border: '1px solid hsla(205, 90%, 55%, 0.2)',
              background: 'var(--brand-glow)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            Clear Mock Enquiries
          </button>
        )}
      </div>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--brand-glow)', padding: '12px', borderRadius: '50%', color: 'var(--brand-light)' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Total Inquiries</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{totalEnquiries}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--accent-warning-glow)', padding: '12px', borderRadius: '50%', color: 'var(--accent-warning)' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Pending Review</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--accent-success-glow)', padding: '12px', borderRadius: '50%', color: 'var(--accent-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Responded</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{respondedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--accent-info-glow)', padding: '12px', borderRadius: '50%', color: 'var(--accent-info)' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Response Rate</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{conversionRate}%</div>
          </div>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px', flex: 1, minHeight: '480px', maxHeight: '700px' }}>
        
        {/* Left Side: Inquiry list */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Header search & filter controls */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search inquiries..." 
                className="input-premium" 
                style={{ paddingLeft: '34px', fontSize: '0.8rem', width: '100%' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['All', 'Submitted', 'Under Review', 'Quoted', 'Closed'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: '1px solid ' + (statusFilter === tab ? 'var(--brand)' : 'var(--border-subtle)'),
                    background: statusFilter === tab ? 'var(--brand-glow)' : 'transparent',
                    color: statusFilter === tab ? 'var(--brand-light)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'var(--t-fast)'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* List panel */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Loading rate inquiries...
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={24} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>No inquiries found</div>
                <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>Try adjusting your filters or search query.</div>
              </div>
            ) : (
              filteredList.map(enq => {
                const isSelected = selectedEnquiry && selectedEnquiry.id === enq.id;
                
                const statusStyles = {
                  'Submitted': { bg: 'var(--accent-info-glow)', color: 'var(--accent-info)', border: 'var(--accent-info)' },
                  'Under Review': { bg: 'var(--accent-warning-glow)', color: 'var(--accent-warning)', border: 'var(--accent-warning)' },
                  'Quoted': { bg: 'var(--accent-success-glow)', color: 'var(--accent-success)', border: 'var(--accent-success)' },
                  'Closed': { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'var(--border-subtle)' }
                };
                const style = statusStyles[enq.status] || statusStyles['Submitted'];

                const formattedDate = enq.createdAt
                  ? new Date(enq.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : 'Recent';

                return (
                  <div
                    key={enq.id}
                    onClick={() => setSelectedEnquiry(enq)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--bg-float)' : 'transparent',
                      borderLeft: '3px solid ' + (isSelected ? 'var(--brand)' : 'transparent'),
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        ID: {enq.id}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.color}30`
                      }}>
                        {enq.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {enq.subject}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {enq.userName || 'Anonymous Client'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {formattedDate}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detail pane */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedEnquiry ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Detail Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                    {selectedEnquiry.subject}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Inquiry ID: <strong>{selectedEnquiry.id}</strong></span>
                    <span>•</span>
                    <span>Received: {selectedEnquiry.createdAt ? new Date(selectedEnquiry.createdAt).toLocaleString('en-IN') : 'Recent'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleDeleteEnquiry(selectedEnquiry.id)}
                    disabled={submittingAction}
                    className="btn-ghost"
                    style={{ padding: '6.5px 12px', fontSize: '0.75rem', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid hsla(4,86%,62%,0.2)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Trash2 size={13} /> Delete Enquiry
                  </button>
                  {selectedEnquiry.status !== 'Closed' && (
                    <button
                      onClick={() => handleAction('Closed', 'Inquiry archived/closed.')}
                      disabled={submittingAction}
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--accent-danger)' }}
                    >
                      Close Inquiry
                    </button>
                  )}
                  
                  {selectedEnquiry.status === 'Submitted' && (
                    <button
                      onClick={() => handleAction('Under Review', 'Admin has marked this enquiry under active review.')}
                      disabled={submittingAction}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      Mark Under Review
                    </button>
                  )}
                </div>
              </div>

              {/* Detail Content */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Client Profile Card */}
                <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.9rem' }}>
                    {selectedEnquiry.userName ? selectedEnquiry.userName.substring(0, 2).toUpperCase() : 'C'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {selectedEnquiry.userName || 'Anonymous Client'}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> Client ID: {selectedEnquiry.userId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rates Enquiry Details Card */}
                <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap' }}>
                    <Info size={14} style={{ color: 'var(--brand-light)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--brand-light)' }}>
                      Requested Lane Estimate
                    </span>
                    {extractProposedRate(selectedEnquiry.message) && (
                      <span className="badge-warning" style={{ 
                        marginLeft: 'auto', 
                        fontSize: '0.68rem', 
                        fontWeight: '700',
                        padding: '2px 8px', 
                        borderRadius: '10px', 
                        background: 'var(--accent-warning-glow)', 
                        color: 'var(--accent-warning)',
                        border: '1px solid hsla(205, 90%, 55%, 0.2)'
                      }}>
                        Proposed Target: {extractProposedRate(selectedEnquiry.message)}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                    {selectedEnquiry.message}
                  </p>
                </div>

                {/* Respond & Action Panel */}
                {selectedEnquiry.status !== 'Closed' && (
                  <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-glow)', background: 'hsla(205, 90%, 55%,0.02)' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Send size={13} style={{ color: 'var(--brand-light)' }} /> Send Quote / Proposal Response
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label className="label-premium">Custom Quote Value (₹)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 42000" 
                          className="input-premium" 
                          style={{ width: '100%', fontSize: '0.8rem' }}
                          value={customQuotePrice}
                          onChange={e => setCustomQuotePrice(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="label-premium">Proposal Notes / Response Message</label>
                        <textarea 
                          rows={3} 
                          placeholder="Write custom terms, transit guarantees, or vehicle details..."
                          className="input-premium" 
                          style={{ width: '100%', fontSize: '0.8rem', resize: 'vertical', fontFamily: 'inherit' }}
                          value={adminNotes}
                          onChange={e => setAdminNotes(e.target.value)}
                        />
                      </div>

                      <button
                        onClick={() => handleSendQuote()}
                        disabled={submittingAction || !customQuotePrice}
                        className="btn-primary"
                        style={{ width: '100%', padding: '10px', justifyContent: 'center', fontSize: '0.8rem', gap: '8px' }}
                      >
                        <Send size={14} /> Send Official Quote Proposal
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select an inquiry from the list</div>
              <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>Verify customer request details and issue instant quotes.</div>
            </div>
          )}
        </div>

      </div>

    </div>
  );

  async function handleAction(newStatus, toastMsg) {
    setSubmittingAction(true);
    try {
      // Create feedback status update call
      await api.submitFeedback({
        id: selectedEnquiry.id,
        status: newStatus,
        userId: selectedEnquiry.userId,
        userName: selectedEnquiry.userName,
        type: selectedEnquiry.type,
        priority: selectedEnquiry.priority,
        subject: selectedEnquiry.subject,
        message: selectedEnquiry.message + (toastMsg ? `\n\n[System Update: ${toastMsg}]` : '')
      });

      // Update local state item
      setEnquiries(prev => prev.map(e => e.id === selectedEnquiry.id ? { ...e, status: newStatus } : e));
      setSelectedEnquiry(prev => ({ ...prev, status: newStatus }));
      
      showToast(toastMsg || `Enquiry updated to ${newStatus}`);
      loadEnquiries();
    } catch (err) {
      console.error(err);
      showToast('Error updating enquiry status');
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleSendQuote() {
    if (!customQuotePrice) return;
    setSubmittingAction(true);
    try {
      const responseMessage = `CUSTOM RATE QUOTE ISSUED: ₹${Number(customQuotePrice).toLocaleString('en-IN')}\n\nNotes from Logistic Desk:\n${adminNotes || 'No custom notes provided.'}`;
      
      // Update feedback in DB/LocalStorage
      await api.submitFeedback({
        id: selectedEnquiry.id,
        status: 'Quoted',
        userId: selectedEnquiry.userId,
        userName: selectedEnquiry.userName,
        type: selectedEnquiry.type,
        priority: selectedEnquiry.priority,
        subject: selectedEnquiry.subject,
        message: selectedEnquiry.message + `\n\n-------------------------\n${responseMessage}`
      });

      setEnquiries(prev => prev.map(e => e.id === selectedEnquiry.id ? { ...e, status: 'Quoted' } : e));
      setSelectedEnquiry(prev => ({ ...prev, status: 'Quoted' }));
      
      setCustomQuotePrice('');
      setAdminNotes('');
      showToast(`Rate proposal of ₹${Number(customQuotePrice).toLocaleString('en-IN')} submitted successfully!`);
      loadEnquiries();
    } catch (err) {
      console.error(err);
      showToast('Failed to submit proposal');
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleDeleteEnquiry(enquiryId) {
    if (!window.confirm('Are you sure you want to permanently delete this rate enquiry? This action cannot be undone.')) {
      return;
    }
    setSubmittingAction(true);
    try {
      await api.deleteFeedback(enquiryId);
      showToast('Rate enquiry deleted successfully.');
      setSelectedEnquiry(null);
      loadEnquiries();
    } catch (err) {
      console.error('Failed to delete enquiry:', err);
      showToast('Failed to delete rate enquiry.');
    } finally {
      setSubmittingAction(false);
    }
  }
}
