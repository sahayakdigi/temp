import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Search, Download, ShieldCheck, Eye, MapPin,
  Package, ArrowRight, ChevronDown, ChevronUp, CheckCircle,
  Clock, Truck, Layers, CreditCard, TrendingUp, AlertTriangle,
  BarChart3, Navigation, Calendar, Hash, Weight, Zap, X,
  Sun, Moon
} from 'lucide-react';
import GlossaryTooltip from '../components/GlossaryTooltip';
import { GLOSSARY } from '../components/glossaryData';
import { INITIAL_RATES } from '../data/mockDb';
import { api } from '../services/api';

// ─── Lane transit time estimates ──────────────────────────────────────────────
const LANE_TRANSIT = {
  'DEL-BOM': { days: '2–3', km: 1420 },
  'DEL-BLR': { days: '3–4', km: 2150 },
  'BOM-DEL': { days: '2–3', km: 1420 },
  'BOM-BLR': { days: '1–2', km: 980  },
  'BLR-DEL': { days: '3–4', km: 2150 },
  'BLR-BOM': { days: '1–2', km: 980  },
};
const CITIES = ['Delhi', 'Mumbai', 'Bangalore'];
const CITY_CODE = { Delhi: 'DEL', Mumbai: 'BOM', Bangalore: 'BLR' };
const STEPS = ['Booked', 'AtHub', 'Manifested', 'InTransit', 'Delivered'];

const STEP_LABELS = {
  Booked:     'Booked',
  AtHub:      'At Hub',
  Manifested: 'Manifested',
  InTransit:  'In Transit',
  Delivered:  'Delivered',
};

const MOCK_GPS = {
  'InTransit': '22.3511° N, 78.6677° E (MP NH-44)',
  'Manifested': '28.7041° N, 77.1025° E (Delhi Hub)',
  'AtHub':     '28.7041° N, 77.1025° E (Transit Hub)',
  'Booked':    '28.6270° N, 77.2190° E (Booking Branch)',
  'Delivered': 'Destination — Delivered',
};

const MOCK_ETA = {
  'InTransit': '4h 30m',
  'Manifested': 'Dispatching soon',
  'AtHub':      'Processing at hub',
  'Booked':     'Pending dispatch',
  'Delivered':  'Delivered ✓',
};

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date() - new Date(dateStr);
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function ClientPortal({ lrs = [], currentUser = {}, parties = [], onLogout }) {
  // ── View Toggle & Profile States ───────────────────────────────────────────
  const [currentView, setCurrentView]   = useState('dashboard'); // 'dashboard' or 'settings'
  const [profileName, setProfileName]   = useState(currentUser.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [oldPassword, setOldPassword]   = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // ── Theme state & sync ──
  const [theme, setTheme] = useState(localStorage.getItem('temp-theme') || 'dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('temp-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('temp-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  };

  // ── Tab & search state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [expandedLrNo, setExpandedLrNo] = useState(null);
  const [toast, setToast]               = useState('');

  // ── Rate calculator state ──────────────────────────────────────────────────
  const [rateOrigin, setRateOrigin]   = useState('Delhi');
  const [rateDest, setRateDest]       = useState('Mumbai');
  const [rateMode, setRateMode]       = useState('PTL');
  const [rateWeight, setRateWeight]   = useState('');
  const [rateVolume, setRateVolume]   = useState('');
  const [proposedRate, setProposedRate] = useState('');

  // ── Helper: fire toast ───────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await api.updateSettings({
        userId: currentUser.id,
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        oldPassword: oldPassword || null,
        newPassword: newPassword || null
      });
      showToast('Profile updated successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // ── Identify client from logged-in user ───────────────────────────────────
  // Admin / Owner / Branch Manager sees all LRs; Client sees only their own
  const isClientRole  = currentUser.role === 'Client';
  const clientParty   = parties.find(p =>
    p.id === currentUser.partyId ||
    p.id === currentUser.party_id ||
    p.name?.toLowerCase().includes(currentUser.name?.split(' ')[0]?.toLowerCase() ?? '')
  ) || parties[0] || {};

  const visibleLrs = isClientRole
    ? lrs.filter(l => 
        l.consignor === clientParty.name || 
        l.consignorId === clientParty.id || 
        l.consigneeId === clientParty.id
      )
    : lrs;

  // ── Tab filter logic ───────────────────────────────────────────────────────
  const tabCounts = useMemo(() => ({
    all:       visibleLrs.length,
    active:    visibleLrs.filter(l => !['Delivered'].includes(l.status)).length,
    intransit: visibleLrs.filter(l => l.status === 'InTransit').length,
    delivered: visibleLrs.filter(l => l.status === 'Delivered').length,
  }), [visibleLrs]);

  const filteredLrs = useMemo(() => {
    let list = visibleLrs;
    if (activeTab === 'active')    list = list.filter(l => l.status !== 'Delivered');
    if (activeTab === 'intransit') list = list.filter(l => l.status === 'InTransit');
    if (activeTab === 'delivered') list = list.filter(l => l.status === 'Delivered');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l =>
        l.lrNo?.toLowerCase().includes(q) ||
        l.privateMark?.toLowerCase().includes(q) ||
        l.consignor?.toLowerCase().includes(q) ||
        l.saidToContain?.toLowerCase().includes(q) ||
        l.origin?.toLowerCase().includes(q) ||
        l.destination?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [visibleLrs, activeTab, searchQuery]);

  // ── Billing / outstanding calcs ────────────────────────────────────────────
  const totalBilled      = visibleLrs.reduce((s, l) => s + (l.freightAmt || 0), 0);
  const outstanding      = visibleLrs.filter(l => l.status !== 'Paid' && l.freightTerms !== 'Paid').reduce((s, l) => s + (l.freightAmt || 0), 0);
  const creditLimit      = clientParty.creditLimit || 500000;
  const creditUsedPct    = Math.min(100, Math.round((outstanding / creditLimit) * 100));

  // ── Rate calculator ────────────────────────────────────────────────────────
  const laneKey = `${CITY_CODE[rateOrigin]}-${CITY_CODE[rateDest]}`;
  const rateCard = INITIAL_RATES.find(r =>
    r.lane === laneKey || r.lane === laneKey.split('-').reverse().join('-')
  );
  const volWt      = rateVolume ? Math.round(Number(rateVolume) * 1000 / 4) : 0;
  const chargeWt   = Math.max(Number(rateWeight) || 0, volWt);
  
  // Use proposed rate if provided, fallback to rateCard.rate, fallback to 10
  const ratePerKg = proposedRate ? Number(proposedRate) : (rateCard ? rateCard.rate : 10);
  const baseFreight = chargeWt > 0
    ? Math.round(chargeWt * ratePerKg + (rateCard ? rateCard.surcharges : 0))
    : 0;
  const gstAmt     = Math.round(baseFreight * 0.18); // always IGST for interstate
  const grossAmt   = baseFreight + gstAmt;
  const transit    = LANE_TRANSIT[laneKey] || LANE_TRANSIT[laneKey.split('-').reverse().join('-')];

  // ── Status badge class helper ─────────────────────────────────────────────
  const statusClass = (status) => {
    if (status === 'Delivered')  return 'badge-success';
    if (status === 'InTransit')  return 'badge-warning';
    if (status === 'Manifested') return 'badge-cyan';
    if (status === 'AtHub')      return 'badge-brand';
    return 'badge-brand';
  };

  return (
    <div className="animate-fade-in responsive-page-pad" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          background: 'var(--accent-success-glow)', border: '1px solid var(--accent-success)',
          color: 'var(--text-primary)', padding: '14px 22px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle size={18} style={{ color: 'var(--accent-success)' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>{toast}</span>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Client Portal & Order Desk</h2>
          <p className="page-subtitle">Enterprise track & trace · Live ETAs · Legal document download · Instant rate quotes</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-brand" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            {visibleLrs.length} Consignments
          </span>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light (White) Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Color Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} style={{ color: 'var(--brand-light)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Light</span>
              </>
            ) : (
              <>
                <Moon size={14} style={{ color: 'var(--accent-info)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Dark</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setCurrentView(currentView === 'dashboard' ? 'settings' : 'dashboard')}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '6px 12px', height: 'auto', cursor: 'pointer' }}
          >
            {currentView === 'dashboard' ? 'Profile Settings' : 'View Shipments'}
          </button>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '6px 12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {currentView === 'dashboard' ? (
        <>
          {/* ══ SECTION 1: Client Account Header ══════════════════════════════════ */}
      <div className="glass-panel client-kpi-grid" style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, hsla(205, 90%, 55%,0.06) 0%, hsla(222,22%,14%,0.9) 100%)',
        borderColor: 'hsla(205, 90%, 55%,0.15)',
        alignItems: 'center'
      }}>
        {/* Client Identity */}
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Account</p>
          <p style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
            {clientParty.name || currentUser.name || 'Guest Client'}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            GSTIN: {clientParty.gstin || 'N/A'}
          </p>
        </div>

        {/* Credit Terms */}
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Credit Terms</p>
          <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>
            {clientParty.creditDays || 30} days
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Limit: ₹{(creditLimit / 100000).toFixed(1)}L
          </p>
        </div>

        {/* Active Shipments */}
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Active Shipments</p>
          <p style={{ fontWeight: '800', fontSize: '1.4rem', color: 'var(--accent-info)', fontFamily: 'var(--font-display)' }}>
            {tabCounts.active}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {tabCounts.delivered} delivered this cycle
          </p>
        </div>

        {/* Credit Utilisation */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Credit Utilisation</p>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: creditUsedPct > 80 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
              {creditUsedPct}%
            </span>
          </div>
          <div style={{ background: 'var(--border-subtle)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${creditUsedPct}%`, borderRadius: '4px',
              background: creditUsedPct > 80 ? 'var(--accent-danger)' : 'linear-gradient(90deg, var(--accent-success), var(--brand))',
              transition: 'width 0.5s ease'
            }} />
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            ₹{outstanding.toLocaleString('en-IN')} outstanding of ₹{creditLimit.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* ══ SECTION 2: Live Shipment Dashboard ════════════════════════════════ */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        {/* Tab Bar + Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0', background: 'var(--bg-void)', borderRadius: 'var(--radius-sm)', padding: '3px', border: '1px solid var(--border-subtle)' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'intransit', label: 'In Transit' },
              { key: 'delivered', label: 'Delivered' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 14px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
                  borderRadius: '4px', border: 'none', transition: 'var(--t-fast)',
                  background: activeTab === tab.key ? 'var(--brand)' : 'transparent',
                  color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
                <span style={{
                  marginLeft: '6px', fontSize: '0.68rem', fontWeight: '700',
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
                  padding: '1px 5px', borderRadius: '8px'
                }}>
                  {tabCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-premium"
              style={{ paddingLeft: '33px', fontSize: '0.82rem' }}
              placeholder="Search LR No, Private Mark, content…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* LR Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredLrs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Package size={36} style={{ opacity: 0.2, marginBottom: '10px', color: 'var(--brand)' }} />
              <p>No consignments match your filter.</p>
            </div>
          ) : filteredLrs.map(lr => {
            const isExpanded  = expandedLrNo === lr.lrNo;
            const stepIdx     = STEPS.indexOf(lr.status);
            const progressPct = Math.max(10, ((stepIdx + 1) / STEPS.length) * 100);
            const age         = daysSince(lr.date);

            return (
              <div key={lr.lrNo} style={{
                background: isExpanded ? 'hsla(205, 90%, 55%,0.04)' : 'var(--bg-elevated)',
                border: `1px solid ${isExpanded ? 'hsla(205, 90%, 55%,0.2)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease'
              }}>

                {/* ── Row (always visible) ── */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr auto',
                    gap: '12px',
                    padding: '14px 16px',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedLrNo(isExpanded ? null : lr.lrNo)}
                >
                  {/* LR No + Route */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', fontFamily: 'var(--font-display)', color: 'var(--brand-light)' }}>
                        <GlossaryTooltip term="LR" glossary={GLOSSARY}>{lr.lrNo}</GlossaryTooltip>
                      </span>
                      <span className={`badge ${statusClass(lr.status)}`} style={{ fontSize: '0.65rem' }}>{lr.status}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{lr.origin}</span>
                      <ArrowRight size={10} style={{ color: 'var(--brand)' }} />
                      <span>{lr.destination}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {lr.privateMark} · {lr.saidToContain}
                    </div>
                  </div>

                  {/* E-Way Bill */}
                  <div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>E-Way Bill</p>
                    <p style={{ fontSize: '0.78rem', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
                      {lr.ewayBill ? `${lr.ewayBill.slice(0,6)}…` : 'N/A'}
                    </p>
                  </div>

                  {/* Articles + Weight */}
                  <div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Pkgs / Wt</p>
                    <p style={{ fontSize: '0.78rem', fontWeight: '600' }}>{lr.articles} pkgs</p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{(lr.chargeWt || 0).toLocaleString('en-IN')} kg</p>
                  </div>

                  {/* Freight */}
                  <div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Freight</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-info)' }}>₹{(lr.freightAmt || 0).toLocaleString('en-IN')}</p>
                    <span className={`badge ${lr.freightTerms === 'To-Pay' ? 'badge-warning' : lr.freightTerms === 'TBB' ? 'badge-cyan' : 'badge-success'}`} style={{ fontSize: '0.6rem' }}>
                      <GlossaryTooltip term={lr.freightTerms === 'To-Pay' ? 'TO_PAY' : lr.freightTerms === 'TBB' ? 'TBB' : 'FREIGHT_TERMS'} glossary={GLOSSARY}>
                        {lr.freightTerms}
                      </GlossaryTooltip>
                    </span>
                  </div>

                  {/* Age */}
                  <div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Age</p>
                    <p style={{ fontSize: '0.78rem', fontWeight: '600', color: age > 10 ? 'var(--accent-warning)' : 'var(--text-secondary)' }}>
                      {age}d ago
                    </p>
                  </div>

                  {/* Expand toggle */}
                  <div style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* ── Expanded Tracking Panel ── */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    {/* Progress Timeline */}
                    <div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Shipment Journey</p>
                      <div style={{ position: 'relative', padding: '6px 0 28px' }}>
                        <div style={{ position: 'absolute', top: '11px', left: '4px', right: '4px', height: '3px', background: 'var(--border-subtle)', borderRadius: '2px' }} />
                        <div style={{ position: 'absolute', top: '11px', left: '4px', width: `calc(${progressPct}% - 8px)`, height: '3px', background: 'linear-gradient(90deg, var(--brand-deep), var(--brand-light))', borderRadius: '2px', boxShadow: '0 0 8px hsla(205, 90%, 55%,0.45)', transition: 'width 0.6s ease' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                          {STEPS.map((step, idx) => {
                            const done = idx <= stepIdx;
                            const current = idx === stepIdx;
                            return (
                              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                  width: '14px', height: '14px', borderRadius: '50%',
                                  background: done ? (current ? 'var(--brand)' : 'var(--brand-deep)') : 'var(--bg-secondary)',
                                  border: `2px solid ${done ? 'var(--brand)' : 'var(--border-default)'}`,
                                  boxShadow: current ? '0 0 12px hsla(205, 90%, 55%,0.7)' : 'none',
                                  transition: 'all 0.3s ease'
                                }} />
                                <span style={{ fontSize: '0.65rem', color: done ? 'var(--brand-light)' : 'var(--text-muted)', fontWeight: done ? '600' : '400', whiteSpace: 'nowrap' }}>
                                  {STEP_LABELS[step]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* GPS + ETA + Details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      {/* GPS */}
                      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                          <Navigation size={13} style={{ color: 'var(--brand)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>GPS Location</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{MOCK_GPS[lr.status] || 'Unknown'}</p>
                      </div>

                      {/* ETA */}
                      <div style={{ padding: '12px 14px', background: 'hsla(205, 90%, 55%,0.06)', border: '1px solid hsla(205, 90%, 55%,0.15)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                          <Clock size={13} style={{ color: 'var(--brand)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Live ETA</span>
                        </div>
                        <p style={{ fontSize: '1rem', fontWeight: '800', color: lr.status === 'Delivered' ? 'var(--accent-success)' : 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
                          {MOCK_ETA[lr.status] || '—'}
                        </p>
                      </div>

                      {/* Shipment details */}
                      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                          <Package size={13} style={{ color: 'var(--accent-info)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Consignment</span>
                        </div>
                        <p>Consignor: <strong style={{ color: 'var(--text-primary)' }}>{lr.consignor}</strong></p>
                        <p>Consignee: {lr.consignee}</p>
                        <p>E-Way Bill: {lr.ewayBill}</p>
                        <p>Booked: {lr.date}</p>
                      </div>
                    </div>

                    {/* Document Repository */}
                    <div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Document Repository</p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Lorry Receipt (Bilty)', available: true },
                          { label: 'GST e-Invoice',         available: true },
                          { label: 'E-Way Bill Copy',       available: !!lr.ewayBill },
                        ].map(doc => (
                          <div key={doc.label} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '9px 14px', flex: '1', minWidth: '180px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)', justifyContent: 'space-between'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              <FileText size={13} style={{ color: 'var(--accent-info)' }} /> {doc.label}
                            </span>
                            <button
                              className="btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.7rem', flexShrink: 0 }}
                              onClick={(e) => { e.stopPropagation(); showToast(`${doc.label} for ${lr.lrNo} sent to your email.`); }}
                            >
                              <Download size={11} /> PDF
                            </button>
                          </div>
                        ))}

                        {/* ePOD — only if delivered */}
                        {lr.physicalPodReceived && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '9px 14px', flex: '1', minWidth: '180px',
                            background: 'var(--accent-success-glow)', border: '1px solid hsla(152,72%,42%,0.3)',
                            borderRadius: 'var(--radius-sm)', justifyContent: 'space-between'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: 'var(--accent-success)' }}>
                              <ShieldCheck size={13} /> Signed ePOD
                            </span>
                            <button
                              className="btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.7rem', flexShrink: 0, color: 'var(--accent-success)' }}
                              onClick={(e) => { e.stopPropagation(); showToast('ePOD document downloaded successfully.'); }}
                            >
                              <Eye size={11} /> View
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ SECTION 3 + 4: Rate Calculator & Billing Summary (side-by-side) ═══ */}
      <div className="responsive-grid-split">

        {/* ── Section 3: Instant Rate Calculator ─────────────────────────────── */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Zap size={17} style={{ color: 'var(--brand)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Instant Rate Calculator</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0', background: 'var(--bg-void)', borderRadius: 'var(--radius-sm)', padding: '3px', border: '1px solid var(--border-subtle)', alignSelf: 'flex-start' }}>
              {['PTL', 'FTL'].map(m => (
                <button key={m} onClick={() => setRateMode(m)} style={{
                  padding: '5px 20px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                  borderRadius: '4px', border: 'none', transition: 'var(--t-fast)',
                  background: rateMode === m ? 'var(--brand)' : 'transparent',
                  color: rateMode === m ? '#fff' : 'var(--text-secondary)',
                }}>
                  {m}
                </button>
              ))}
            </div>

            {/* Origin → Dest */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
              <div>
                <label className="label-premium">From</label>
                <select className="input-premium" value={rateOrigin} onChange={e => setRateOrigin(e.target.value)}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--brand)', marginTop: '18px' }} />
              <div>
                <label className="label-premium">To</label>
                <select className="input-premium" value={rateDest} onChange={e => setRateDest(e.target.value)}>
                  {CITIES.filter(c => c !== rateOrigin).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Weight + Volume */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">Actual Weight (kg)</label>
                <input type="number" className="input-premium" placeholder="e.g. 5000"
                  value={rateWeight} onChange={e => setRateWeight(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Volume (CBM) <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>optional</span></label>
                <input type="number" className="input-premium" placeholder="e.g. 12.5"
                  value={rateVolume} onChange={e => setRateVolume(e.target.value)} />
              </div>
            </div>

            {/* Proposed Rate */}
            <div>
              <label className="label-premium">Proposed Rate (₹/kg) <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>optional</span></label>
              <input type="number" step="0.01" className="input-premium" placeholder={rateCard ? `System rate: ₹${rateCard.rate}/kg` : "e.g. 8.50"}
                value={proposedRate} onChange={e => setProposedRate(e.target.value)} />
            </div>

            {/* Live Rate Preview */}
            {chargeWt > 0 && (
              <div style={{
                background: 'hsla(205, 90%, 55%,0.07)', border: '1px solid hsla(205, 90%, 55%,0.2)',
                borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Estimated Freight</span>
                  {transit && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-info)', fontWeight: '600', background: 'var(--accent-info-glow)', padding: '2px 8px', borderRadius: '10px' }}>
                      {transit.days} days transit
                    </span>
                  )}
                </div>

                {volWt > 0 && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Volumetric wt: {volWt.toLocaleString('en-IN')} kg · Chargeable: <strong style={{ color: 'var(--brand-light)' }}>{chargeWt.toLocaleString('en-IN')} kg</strong>
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Base Freight ({rateCard ? `₹${rateCard.rate}/kg + ₹${rateCard.surcharges} surcharge` : 'N/A'}):</span>
                    <span>₹{baseFreight.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>IGST (18%):</span>
                    <span>₹{gstAmt.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', fontWeight: '800', color: 'var(--brand-light)', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
                    <span>Total Estimate:</span>
                    <span>₹{grossAmt.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {!rateCard && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--accent-warning)' }}>
                    ⚠ No rate card for this lane — estimate based on default rates. Contact sales for exact quote.
                  </p>
                )}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
              onClick={async () => {
                try {
                  await api.submitFeedback({
                    userId: currentUser.id || 'anonymous',
                    userName: currentUser.name || 'Anonymous Client',
                    type: 'Rate Enquiry',
                    priority: 'High',
                    subject: `Rate Request: ${rateOrigin} to ${rateDest} (${rateMode})`,
                    message: `Instant Rate Inquiry:\n• Lane: ${rateOrigin} to ${rateDest}\n• Mode: ${rateMode}\n• Weight: ${rateWeight || '0'} kg\n• Volume: ${rateVolume || '0'} CFT\n• Chargeable Weight: ${chargeWt} kg\n• Proposed Target Rate: ${proposedRate ? `₹${proposedRate}/kg` : 'Not specified (system fallback)'}\n• Estimated Freight: ₹${grossAmt.toLocaleString('en-IN')}`
                  });
                  showToast('Rate enquiry submitted! Our sales team will contact you within 15 minutes.');
                } catch (err) {
                  console.error('Failed to submit rate enquiry:', err);
                  showToast('Failed to submit rate enquiry. Please try again.');
                }
              }}
            >
              Send Rate Enquiry
            </button>
          </div>
        </div>

        {/* ── Section 4: Billing & Outstanding Summary ───────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Billing KPIs */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <CreditCard size={17} style={{ color: 'var(--accent-info)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Billing Summary</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Total Freight Billed', value: `₹${totalBilled.toLocaleString('en-IN')}`, color: 'var(--accent-info)', sub: 'This billing cycle' },
                { label: 'Outstanding Balance', value: `₹${outstanding.toLocaleString('en-IN')}`, color: outstanding > 0 ? 'var(--accent-warning)' : 'var(--accent-success)', sub: outstanding > 0 ? 'Awaiting payment' : 'Fully settled' },
                { label: 'Delivered Consignments', value: `${tabCounts.delivered}`, color: 'var(--accent-success)', sub: `of ${tabCounts.all} total` },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)'
                }}>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{kpi.label}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{kpi.sub}</p>
                  </div>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800', color: kpi.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: <Download size={14} />, label: 'Download Account Statement',    msg: 'Account statement (PDF) emailed to your registered email address.' },
                { icon: <BarChart3 size={14} />, label: 'Request Credit Limit Increase', msg: 'Credit limit increase request submitted to our finance team.' },
                { icon: <FileText size={14} />, label: 'Download GST Invoice Bundle',   msg: 'GST invoice bundle for this billing cycle is being compiled.' },
              ].map(action => (
                <button
                  key={action.label}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '9px 14px', fontSize: '0.78rem', gap: '10px' }}
                  onClick={() => showToast(action.msg)}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      ) : (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Zap size={20} style={{ color: 'var(--brand)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '850', fontFamily: 'var(--font-display)' }}>Modify User Profile Details</h3>
          </div>
          
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label className="label-premium">Contact Person Name</label>
              <input 
                type="text" 
                required 
                className="input-premium" 
                value={profileName} 
                onChange={e => setProfileName(e.target.value)} 
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label-premium">Registered Email</label>
                <input 
                  type="email" 
                  required 
                  className="input-premium" 
                  value={profileEmail} 
                  onChange={e => setProfileEmail(e.target.value)} 
                />
              </div>
              <div>
                <label className="label-premium">Phone Number</label>
                <input 
                  type="text" 
                  className="input-premium" 
                  value={profilePhone} 
                  onChange={e => setProfilePhone(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ padding: '16px', background: 'hsla(205, 90%, 55%,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--brand-light)' }}>Change Password (Optional)</p>
              <div>
                <label className="label-premium">Current Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input-premium" 
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)} 
                />
              </div>
              <div>
                <label className="label-premium">New Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input-premium" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={updatingProfile} 
              style={{ justifyContent: 'center', padding: '12px', fontSize: '0.9rem', marginTop: '10px' }}
            >
              {updatingProfile ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
