import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle, Landmark, PlusCircle, Users, Settings,
  Search, Pencil, Trash2, Save, X, Building2, MapPin,
  Truck, CreditCard, ShieldCheck, AlertTriangle,
  BookOpen, ChevronRight, BarChart3, FileText, Zap
} from 'lucide-react';
import { api } from '../services/api';
import { GLOSSARY, CATEGORIES } from '../components/glossaryData';

// ── Shared helper ─────────────────────────────────────────────────────────────
const LANE_OPTIONS = ['DEL-BOM', 'DEL-BLR', 'BOM-DEL', 'BOM-BLR', 'BLR-DEL', 'BLR-BOM'];

export default function Masters({
  branches = [], setBranches,
  parties = [], setParties,
  rateCards = [],
  vehicleOwners = [], setVehicleOwners,
  lrs = []
}) {
  const [activeTab, setActiveTab] = useState('org');
  const [toast, setToast]         = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(''), 4500);
  };

  // ── TAB definitions ────────────────────────────────────────────────────────
  const TABS = [
    { id: 'org',      label: 'Organization',      icon: <Landmark size={14} /> },
    { id: 'parties',  label: 'Clients & Parties',  icon: <Users size={14} /> },
    { id: 'rates',    label: 'Rate Cards',          icon: <BarChart3 size={14} /> },
    { id: 'owners',   label: 'Lorry Owners',        icon: <Truck size={14} /> },
    { id: 'glossary', label: 'Glossary & Compliance', icon: <BookOpen size={14} /> },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          background: toast.type === 'error' ? 'var(--accent-danger-glow)' : 'var(--accent-success-glow)',
          border: `1px solid ${toast.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)'}`,
          color: 'var(--text-primary)', padding: '14px 22px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.type === 'error'
            ? <AlertTriangle size={18} style={{ color: 'var(--accent-danger)' }} />
            : <CheckCircle size={18} style={{ color: 'var(--accent-success)' }} />}
          <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="page-title">Master Configuration Center</h2>
        <p className="page-subtitle">Branch hierarchy · Rate cards · Customer profiles · Compliance entities · Glossary</p>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {TABS.map(tab => (
          <button key={tab.id}
            className={`toggle-btn ${activeTab === tab.id ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: Organization ═════════════════════════════════════════════════ */}
      {activeTab === 'org' && (
        <OrgTab
          branches={branches}
          setBranches={setBranches}
          lrs={lrs}
          showToast={showToast}
        />
      )}

      {/* ══ TAB: Clients & Parties ════════════════════════════════════════════ */}
      {activeTab === 'parties' && (
        <PartiesTab
          parties={parties}
          setParties={setParties}
          lrs={lrs}
          showToast={showToast}
        />
      )}

      {/* ══ TAB: Rate Cards ═══════════════════════════════════════════════════ */}
      {activeTab === 'rates' && (
        <RateCardsTab rateCards={rateCards} showToast={showToast} />
      )}

      {/* ══ TAB: Lorry Owners ════════════════════════════════════════════════ */}
      {activeTab === 'owners' && (
        <OwnersTab
          vehicleOwners={vehicleOwners}
          setVehicleOwners={setVehicleOwners}
          showToast={showToast}
        />
      )}

      {/* ══ TAB: Glossary & Compliance ════════════════════════════════════════ */}
      {activeTab === 'glossary' && <GlossaryTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-component: Organization Tab
// ══════════════════════════════════════════════════════════════════════════════
function OrgTab({ branches, setBranches, lrs, showToast }) {
  const [selectedId, setSelectedId]   = useState(branches[1]?.id || null);
  const [editMode, setEditMode]       = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editLanes, setEditLanes]     = useState('');

  const selectedBranch = branches.find(b => b.id === selectedId);

  const startEdit = () => {
    setEditAddress(selectedBranch.address);
    setEditLanes(selectedBranch.lanes || 'Delhi ↔ Mumbai ↔ Bangalore');
    setEditMode(true);
  };

  const saveEdit = () => {
    setBranches(prev => prev.map(b =>
      b.id === selectedId ? { ...b, address: editAddress, lanes: editLanes } : b
    ));
    setEditMode(false);
    showToast(`Branch "${selectedBranch.name}" updated successfully.`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>

      {/* Branch tree */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Landmark size={17} style={{ color: 'var(--brand)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>HQ → Branch Tree</h3>
        </div>

        {/* HO Root */}
        <div style={{ padding: '12px 14px', background: 'var(--brand-glow)', border: '1px solid hsla(35,95%,55%,0.2)', borderRadius: 'var(--radius-md)', fontWeight: '700', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Building2 size={15} style={{ color: 'var(--brand)' }} />
          <div>
            <p>Temp India (HO)</p>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '400', marginTop: '2px' }}>
              {branches.find(b => b.type === 'HO')?.gstin}
            </p>
          </div>
        </div>

        {/* Child branches */}
        <div style={{ paddingLeft: '20px', marginLeft: '10px', borderLeft: '2px dashed var(--border-default)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {branches.filter(b => b.type !== 'HO').map(branch => {
            const sel = selectedId === branch.id;
            const branchLrs = lrs.filter(l => l.bookingBranch === branch.id).length;
            const typeColor = branch.type === 'branch' ? 'var(--accent-info)' : branch.type === 'hub' ? 'var(--accent-violet)' : 'var(--accent-warning)';
            return (
              <div key={branch.id} onClick={() => { setSelectedId(branch.id); setEditMode(false); }}
                style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: sel ? 'hsla(35,95%,55%,0.08)' : 'transparent',
                  border: `1px solid ${sel ? 'hsla(35,95%,55%,0.3)' : 'transparent'}`,
                  transition: 'var(--t-fast)'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={13} style={{ color: typeColor }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: sel ? '700' : '400', color: sel ? 'var(--brand-light)' : 'var(--text-secondary)' }}>
                    {branch.name}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: `${typeColor}20`, color: typeColor, padding: '2px 6px', borderRadius: '8px', fontWeight: '600' }}>
                    {branch.type}
                  </span>
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px', paddingLeft: '21px' }}>
                  {branchLrs} LRs booked · {branch.id}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Branch config panel */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        {selectedBranch ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{selectedBranch.name}</h3>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <span className="badge badge-brand" style={{ fontSize: '0.65rem' }}>{selectedBranch.type}</span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{selectedBranch.id}</span>
                </div>
              </div>
              {!editMode ? (
                <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }} onClick={startEdit}>
                  <Pencil size={12} /> Edit Branch
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }} onClick={saveEdit}>
                    <Save size={12} /> Save
                  </button>
                  <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }} onClick={() => setEditMode(false)}>
                    <X size={12} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              {[
                { label: 'GSTIN', value: selectedBranch.gstin, editable: false },
              ].map(row => (
                <div key={row.label} style={{ padding: '12px 14px', background: 'hsla(222,22%,12%,0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{row.label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>{row.value}</p>
                </div>
              ))}

              {/* Address — editable */}
              <div style={{ padding: '12px 14px', background: editMode ? 'hsla(35,95%,55%,0.04)' : 'hsla(222,22%,12%,0.6)', borderRadius: 'var(--radius-md)', border: `1px solid ${editMode ? 'hsla(35,95%,55%,0.25)' : 'var(--border-subtle)'}` }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Address</p>
                {editMode
                  ? <textarea rows="2" className="input-premium" style={{ resize: 'none', fontSize: '0.82rem', width: '100%' }} value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                  : <p style={{ color: 'var(--text-secondary)' }}>{selectedBranch.address}</p>
                }
              </div>

              {/* Lanes served — editable */}
              <div style={{ padding: '12px 14px', background: editMode ? 'hsla(35,95%,55%,0.04)' : 'hsla(222,22%,12%,0.6)', borderRadius: 'var(--radius-md)', border: `1px solid ${editMode ? 'hsla(35,95%,55%,0.25)' : 'var(--border-subtle)'}` }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Lanes Served</p>
                {editMode
                  ? <input className="input-premium" style={{ fontSize: '0.82rem', width: '100%' }} value={editLanes} onChange={e => setEditLanes(e.target.value)} />
                  : <p style={{ color: 'var(--text-secondary)' }}>{selectedBranch.lanes || 'Delhi Corridor ↔ Mumbai Hub ↔ Bangalore Corridor'}</p>
                }
              </div>

              {/* KPI mini-summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'LRs Booked', value: lrs.filter(l => l.bookingBranch === selectedBranch.id).length },
                  { label: 'Delivered', value: lrs.filter(l => l.bookingBranch === selectedBranch.id && l.status === 'Delivered').length },
                ].map(kpi => (
                  <div key={kpi.label} style={{ padding: '12px', background: 'var(--brand-glow)', border: '1px solid hsla(35,95%,55%,0.15)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>{kpi.value}</p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Landmark size={36} style={{ opacity: 0.2, color: 'var(--brand)' }} />
            <p>Select a branch node to view configuration details.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-component: Parties Tab
// ══════════════════════════════════════════════════════════════════════════════
function PartiesTab({ parties, setParties, lrs, showToast }) {
  const [partyName, setPartyName]       = useState('');
  const [partyType, setPartyType]       = useState('client');
  const [partyGstin, setPartyGstin]     = useState('');
  const [partyLimit, setPartyLimit]     = useState('');
  const [partyDays, setPartyDays]       = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyPhone, setPartyPhone]     = useState('');
  const [partyEmail, setPartyEmail]     = useState('');
  const [partyPassword, setPartyPassword] = useState('');
  const [search, setSearch]             = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Edit state
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [editForm, setEditForm]             = useState({});

  const filtered = useMemo(() =>
    parties.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.type?.toLowerCase().includes(search.toLowerCase()) ||
      p.gstin?.toLowerCase().includes(search.toLowerCase())
    ), [parties, search]);

  const handleAddParty = (e) => {
    e.preventDefault();
    if (!partyName) return;
    api.createParty({
      id: `PAR-0${parties.length + 1}`,
      name: partyName, type: partyType, gstin: partyGstin || null,
      credit_limit: partyLimit ? Number(partyLimit) : null,
      credit_days: partyDays ? Number(partyDays) : null,
      address: partyAddress || null,
      phone: partyPhone || '',
      email: partyType === 'client' && partyEmail ? partyEmail.trim() : null,
      password: partyType === 'client' && partyPassword ? partyPassword : null
    }).then(saved => {
      setParties([{
        id: saved.id, name: saved.name, type: saved.type, gstin: saved.gstin,
        creditLimit: saved.creditLimit !== undefined ? saved.creditLimit : (saved.credit_limit ? Number(saved.credit_limit) : null),
        creditDays: saved.creditDays !== undefined ? saved.creditDays : (saved.credit_days ? Number(saved.credit_days) : null),
        address: saved.address, phone: partyPhone
      }, ...parties]);
      showToast(`Party "${partyName}" registered successfully!`);
      setPartyName(''); setPartyGstin(''); setPartyLimit(''); setPartyDays(''); setPartyAddress(''); setPartyPhone('');
      setPartyEmail(''); setPartyPassword('');
    }).catch(err => showToast(`Failed: ${err.message}`, 'error'));
  };

  const startEdit = (p) => {
    setEditingPartyId(p.id);
    setEditForm({
      name: p.name || '',
      type: p.type || 'client',
      gstin: p.gstin || '',
      phone: p.phone || '',
      creditLimit: p.creditLimit !== undefined && p.creditLimit !== null ? String(p.creditLimit) : (p.credit_limit ? String(p.credit_limit) : ''),
      creditDays: p.creditDays !== undefined && p.creditDays !== null ? String(p.creditDays) : (p.credit_days ? String(p.credit_days) : ''),
      address: p.address || ''
    });
  };

  const handleSaveEdit = (id) => {
    if (!editForm.name) {
      showToast('Party Name is required.', 'error');
      return;
    }
    const updatedData = {
      name: editForm.name,
      type: editForm.type,
      gstin: editForm.gstin || null,
      phone: editForm.phone || '',
      credit_limit: editForm.creditLimit ? Number(editForm.creditLimit) : null,
      credit_days: editForm.creditDays ? Number(editForm.creditDays) : null,
      address: editForm.address || null
    };

    api.updateParty(id, updatedData).then(updated => {
      setParties(prev => prev.map(p => p.id === id ? {
        ...p,
        name: updated.name || editForm.name,
        type: updated.type || editForm.type,
        gstin: updated.gstin !== undefined ? updated.gstin : (editForm.gstin || null),
        phone: updated.phone || editForm.phone || '',
        creditLimit: updated.creditLimit !== undefined ? updated.creditLimit : (editForm.creditLimit ? Number(editForm.creditLimit) : null),
        creditDays: updated.creditDays !== undefined ? updated.creditDays : (editForm.creditDays ? Number(editForm.creditDays) : null),
        address: updated.address !== undefined ? updated.address : (editForm.address || null)
      } : p));
      showToast(`Party "${editForm.name}" updated successfully!`);
      setEditingPartyId(null);
    }).catch(err => showToast(`Update failed: ${err.message}`, 'error'));
  };

  const handleDelete = (id, name) => {
    api.deleteParty(id).then(() => {
      setParties(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      showToast(`Party "${name}" removed from registry.`);
    }).catch(err => showToast(`Failed to delete party: ${err.message}`, 'error'));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>

      {/* Add Party Form */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <PlusCircle size={17} style={{ color: 'var(--brand)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Register Consignor / Consignee</h3>
        </div>
        <form onSubmit={handleAddParty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="label-premium">Party Name *</label>
            <input type="text" required placeholder="e.g. Tata Steel Ltd" className="input-premium" value={partyName} onChange={e => setPartyName(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="label-premium">Party Type</label>
              <select className="input-premium" value={partyType} onChange={e => setPartyType(e.target.value)}>
                <option value="client">Consignor (Client)</option>
                <option value="consignee">Consignee</option>
              </select>
            </div>
            <div>
              <label className="label-premium">GSTIN</label>
              <input type="text" placeholder="27AAAAA1111A1Z1" className="input-premium" value={partyGstin} onChange={e => setPartyGstin(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-premium">Contact Phone</label>
            <input type="tel" placeholder="+91-98100-00000" className="input-premium" value={partyPhone} onChange={e => setPartyPhone(e.target.value)} />
          </div>
          {partyType === 'client' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">Client Portal Email (Optional)</label>
                <input type="email" placeholder="client@company.com" className="input-premium" value={partyEmail} onChange={e => setPartyEmail(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Client Portal Password</label>
                <input type="password" placeholder="••••••••" className="input-premium" value={partyPassword} onChange={e => setPartyPassword(e.target.value)} />
              </div>
            </div>
          )}
          {partyType === 'client' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">Credit Limit (₹)</label>
                <input type="number" placeholder="500000" className="input-premium" value={partyLimit} onChange={e => setPartyLimit(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Credit Days</label>
                <input type="number" placeholder="30" className="input-premium" value={partyDays} onChange={e => setPartyDays(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label className="label-premium">Address</label>
            <textarea rows="2" placeholder="Street address..." className="input-premium" style={{ resize: 'none' }} value={partyAddress} onChange={e => setPartyAddress(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
            <PlusCircle size={14} /> Register Party
          </button>
        </form>
      </div>

      {/* Parties Cards List */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Users size={17} style={{ color: 'var(--brand)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Parties & Credit Terms</h3>
          <span className="badge badge-brand" style={{ marginLeft: 'auto' }}>{parties.length} parties</span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="input-premium" style={{ paddingLeft: '33px', fontSize: '0.82rem' }}
            placeholder="Search by name, type, or GSTIN…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(p => {
            const consignmentCount = lrs.filter(l => l.consignor === p.name).length;
            const isEditing = editingPartyId === p.id;
            const creditLimitNum = p.creditLimit !== undefined && p.creditLimit !== null ? p.creditLimit : p.credit_limit;
            const usedPct = creditLimitNum ? Math.min(100, Math.round((consignmentCount * 20000 / creditLimitNum) * 100)) : 0;

            if (isEditing) {
              return (
                <div key={p.id} style={{ padding: '16px', background: 'hsla(35,95%,55%,0.05)', border: '1px solid hsla(35,95%,55%,0.3)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--brand-light)' }}>
                      Edit Party ({p.id})
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem', gap: '4px' }} onClick={() => handleSaveEdit(p.id)}>
                        <Save size={12} /> Save
                      </button>
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.75rem', gap: '4px' }} onClick={() => setEditingPartyId(null)}>
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label-premium" style={{ fontSize: '0.7rem' }}>Party Name *</label>
                    <input type="text" className="input-premium" style={{ fontSize: '0.82rem' }} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.7rem' }}>Party Type</label>
                      <select className="input-premium" style={{ fontSize: '0.82rem' }} value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                        <option value="client">Consignor (Client)</option>
                        <option value="consignee">Consignee</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.7rem' }}>GSTIN</label>
                      <input type="text" className="input-premium" style={{ fontSize: '0.82rem' }} value={editForm.gstin} onChange={e => setEditForm({ ...editForm, gstin: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="label-premium" style={{ fontSize: '0.7rem' }}>Contact Phone</label>
                    <input type="tel" className="input-premium" style={{ fontSize: '0.82rem' }} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>

                  {editForm.type === 'client' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium" style={{ fontSize: '0.7rem' }}>Credit Limit (₹)</label>
                        <input type="number" className="input-premium" style={{ fontSize: '0.82rem' }} value={editForm.creditLimit} onChange={e => setEditForm({ ...editForm, creditLimit: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-premium" style={{ fontSize: '0.7rem' }}>Credit Days</label>
                        <input type="number" className="input-premium" style={{ fontSize: '0.82rem' }} value={editForm.creditDays} onChange={e => setEditForm({ ...editForm, creditDays: e.target.value })} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label-premium" style={{ fontSize: '0.7rem' }}>Address</label>
                    <textarea rows="2" className="input-premium" style={{ resize: 'none', fontSize: '0.82rem' }} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                  </div>
                </div>
              );
            }

            return (
              <div key={p.id} style={{ padding: '14px 16px', background: 'hsla(222,22%,12%,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{p.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-display)' }}>{p.gstin || 'No GSTIN'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`badge ${p.type === 'client' ? 'badge-brand' : 'badge-cyan'}`} style={{ fontSize: '0.65rem' }}>{p.type}</span>
                    {consignmentCount > 0 && (
                      <span style={{ fontSize: '0.65rem', background: 'var(--accent-info-glow)', color: 'var(--accent-info)', border: '1px solid var(--accent-info)', padding: '2px 7px', borderRadius: '10px', fontWeight: '600' }}>
                        {consignmentCount} LRs
                      </span>
                    )}
                    <button onClick={() => startEdit(p)} title="Edit Party details" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '2px', display: 'flex', alignItems: 'center' }}>
                      <Pencil size={13} />
                    </button>
                    {deleteConfirm === p.id ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleDelete(p.id, p.name)} style={{ padding: '3px 8px', fontSize: '0.68rem', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} style={{ padding: '3px 8px', fontSize: '0.68rem', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(p.id)} title="Delete Party" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: creditLimitNum ? '10px' : '0' }}>
                  {(p.creditDays || p.credit_days) && <span>Credit: {p.creditDays || p.credit_days} days</span>}
                  {creditLimitNum && <span>Limit: ₹{Number(creditLimitNum).toLocaleString('en-IN')}</span>}
                  {p.phone && <span>Phone: {p.phone}</span>}
                  {p.address && <span style={{ color: 'var(--text-muted)' }}>{p.address}</span>}
                </div>

                {creditLimitNum && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Credit Utilisation</span>
                      <span style={{ fontSize: '0.65rem', color: usedPct > 80 ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: '600' }}>{usedPct}%</span>
                    </div>
                    <div style={{ background: 'var(--border-subtle)', borderRadius: '3px', height: '4px' }}>
                      <div style={{ height: '100%', width: `${usedPct}%`, background: usedPct > 80 ? 'var(--accent-danger)' : 'var(--accent-success)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-component: Rate Cards Tab
// ══════════════════════════════════════════════════════════════════════════════
function RateCardsTab({ rateCards, showToast }) {
  const [localCards, setLocalCards] = useState(rateCards);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editRate, setEditRate]     = useState('');
  const [editSurcharge, setEditSurcharge] = useState('');
  const [editVolFactor, setEditVolFactor] = useState('');
  const [simWeight, setSimWeight]   = useState({});

  // Add rate card form
  const [newLane, setNewLane]         = useState('DEL-BOM');
  const [newType, setNewType]         = useState('General Cargo');
  const [newRate, setNewRate]         = useState('');
  const [newSurcharge, setNewSurcharge] = useState('');
  const [newVolFactor, setNewVolFactor] = useState('12');

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditRate(localCards[idx].rate.toString());
    setEditSurcharge(localCards[idx].surcharges.toString());
    setEditVolFactor(localCards[idx].volumetricFactor.toString());
  };

  const saveEdit = (idx) => {
    setLocalCards(prev => prev.map((rc, i) => i === idx
      ? { ...rc, rate: Number(editRate), surcharges: Number(editSurcharge), volumetricFactor: Number(editVolFactor) }
      : rc
    ));
    setEditingIdx(null);
    showToast(`Rate card for ${localCards[idx].lane} updated.`);
  };

  const addRateCard = (e) => {
    e.preventDefault();
    if (!newRate) return;
    const card = { lane: newLane, articleType: newType, rate: Number(newRate), surcharges: Number(newSurcharge) || 0, volumetricFactor: Number(newVolFactor) || 12, weightSlabKg: 1000 };
    setLocalCards(prev => [...prev, card]);
    setNewRate(''); setNewSurcharge(''); setNewType('General Cargo');
    showToast(`Rate card for ${newLane} added.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <BarChart3 size={17} style={{ color: 'var(--brand)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Auto-Pricing Rate Cards</h3>
          <span className="badge badge-brand" style={{ marginLeft: 'auto' }}>{localCards.length} lanes</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {localCards.map((rc, idx) => {
            const isEditing = editingIdx === idx;
            const wt = Number(simWeight[idx] || 0);
            const freight = wt > 0 ? Math.round(wt * (isEditing ? Number(editRate) : rc.rate) + (isEditing ? Number(editSurcharge) : rc.surcharges)) : 0;

            return (
              <div key={idx} style={{ padding: '16px', background: isEditing ? 'hsla(35,95%,55%,0.04)' : 'hsla(222,22%,12%,0.6)', border: `1px solid ${isEditing ? 'hsla(35,95%,55%,0.25)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Lane Header */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '800', fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brand-light)' }}>{rc.lane}</span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{rc.articleType}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Rate / kg', field: 'rate', value: editRate, set: setEditRate, display: `₹${rc.rate?.toFixed(2)}` },
                        { label: 'Surcharges (₹)', field: 'surcharges', value: editSurcharge, set: setEditSurcharge, display: `₹${rc.surcharges}` },
                        { label: 'Vol. Factor', field: 'vol', value: editVolFactor, set: setEditVolFactor, display: rc.volumetricFactor },
                      ].map(field => (
                        <div key={field.label} style={{ padding: '8px 10px', background: 'var(--bg-void)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{field.label}</p>
                          {isEditing
                            ? <input type="number" className="input-premium" style={{ padding: '4px', fontSize: '0.78rem', height: 'auto' }} value={field.value} onChange={e => field.set(e.target.value)} />
                            : <p style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{field.display}</p>
                          }
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem', gap: '5px' }} onClick={() => saveEdit(idx)}>
                          <Save size={11} /> Save
                        </button>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.72rem', gap: '5px' }} onClick={() => setEditingIdx(null)}>
                          <X size={11} /> Cancel
                        </button>
                      </>
                    ) : (
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.72rem', gap: '5px' }} onClick={() => startEdit(idx)}>
                        <Pencil size={11} /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Freight Simulator */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Simulator:</span>
                  <input
                    type="number"
                    placeholder="Enter kg"
                    value={simWeight[idx] || ''}
                    onChange={e => setSimWeight(prev => ({ ...prev, [idx]: e.target.value }))}
                    style={{ width: '100px', padding: '4px 8px', fontSize: '0.75rem', background: 'var(--bg-void)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff' }}
                  />
                  {wt > 0 && (
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--brand-light)' }}>
                      ≈ ₹{freight.toLocaleString('en-IN')} <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.68rem' }}>+18% GST</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Rate Card Form */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <PlusCircle size={17} style={{ color: 'var(--brand)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Add New Rate Card</h3>
        </div>
        <form onSubmit={addRateCard} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label className="label-premium">Lane Code</label>
            <select className="input-premium" value={newLane} onChange={e => setNewLane(e.target.value)}>
              {LANE_OPTIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label-premium">Article Type</label>
            <input type="text" className="input-premium" placeholder="General Cargo" value={newType} onChange={e => setNewType(e.target.value)} />
          </div>
          <div>
            <label className="label-premium">Rate (₹/kg)</label>
            <input type="number" required className="input-premium" placeholder="8.50" value={newRate} onChange={e => setNewRate(e.target.value)} />
          </div>
          <div>
            <label className="label-premium">Surcharges (₹)</label>
            <input type="number" className="input-premium" placeholder="500" value={newSurcharge} onChange={e => setNewSurcharge(e.target.value)} />
          </div>
          <div>
            <label className="label-premium">Vol. Factor</label>
            <input type="number" className="input-premium" placeholder="12" value={newVolFactor} onChange={e => setNewVolFactor(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '9px 16px', justifyContent: 'center', whiteSpace: 'nowrap' }}>
            <PlusCircle size={13} /> Add
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-component: Lorry Owners Tab
// ══════════════════════════════════════════════════════════════════════════════
function OwnersTab({ vehicleOwners, setVehicleOwners, showToast }) {
  const [ownerName, setOwnerName]   = useState('');
  const [ownerPan, setOwnerPan]     = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerBank, setOwnerBank]   = useState('');
  const [ownerAccNo, setOwnerAccNo] = useState('');
  const [ownerIfsc, setOwnerIfsc]   = useState('');
  const [ownerTerms, setOwnerTerms] = useState('70% Advance, 30% on POD');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!ownerName || !ownerPan) return;
    const newOwner = {
      id: `VOW-0${vehicleOwners.length + 3}`,
      name: ownerName, pan: ownerPan, phone: ownerPhone,
      bank: `${ownerBank} - ${ownerAccNo}`, ifsc: ownerIfsc,
      defaultHireTerms: ownerTerms, panVerified: false, bankVerified: false
    };
    setVehicleOwners(prev => [...prev, newOwner]);
    showToast(`Lorry owner "${ownerName}" registered.`);
    setOwnerName(''); setOwnerPan(''); setOwnerPhone(''); setOwnerBank(''); setOwnerAccNo(''); setOwnerIfsc('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>

      {/* Add Owner Form */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <PlusCircle size={17} style={{ color: 'var(--brand)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Register Lorry Owner</h3>
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="label-premium">Owner Name *</label>
            <input type="text" required className="input-premium" placeholder="e.g. Shergill Roadlines" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="label-premium">PAN Card *</label>
              <input type="text" required className="input-premium" placeholder="ABCDE1234F" value={ownerPan} onChange={e => setOwnerPan(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label-premium">Mobile</label>
              <input type="tel" className="input-premium" placeholder="+91-98100-00000" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-premium">Bank Name</label>
            <input type="text" className="input-premium" placeholder="State Bank of India" value={ownerBank} onChange={e => setOwnerBank(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="label-premium">Account No.</label>
              <input type="text" className="input-premium" placeholder="30291039281" value={ownerAccNo} onChange={e => setOwnerAccNo(e.target.value)} />
            </div>
            <div>
              <label className="label-premium">IFSC Code</label>
              <input type="text" className="input-premium" placeholder="SBIN0001234" value={ownerIfsc} onChange={e => setOwnerIfsc(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div>
            <label className="label-premium">Default Hire Terms</label>
            <select className="input-premium" value={ownerTerms} onChange={e => setOwnerTerms(e.target.value)}>
              <option>70% Advance, 30% on POD</option>
              <option>80% Advance, 20% on POD</option>
              <option>50% Advance, 50% on POD</option>
              <option>100% on POD</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
            <PlusCircle size={14} /> Register Owner
          </button>
        </form>
      </div>

      {/* Owner Cards */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Truck size={17} style={{ color: 'var(--accent-danger)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Attached Vehicle Owner Directory</h3>
          <span className="badge badge-brand" style={{ marginLeft: 'auto' }}>{vehicleOwners.length} owners</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {vehicleOwners.map(vo => (
            <div key={vo.id} style={{ padding: '16px', background: 'hsla(222,22%,12%,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{vo.name}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {vo.id}</p>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Attached</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                {[
                  { label: 'PAN', value: vo.pan },
                  { label: 'Bank', value: vo.bank },
                  { label: 'Hire Terms', value: vo.defaultHireTerms },
                  { label: 'IFSC', value: vo.ifsc || 'N/A' },
                ].map(row => (
                  <div key={row.label} style={{ padding: '8px 10px', background: 'var(--bg-void)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{row.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{row.value}</p>
                  </div>
                ))}
              </div>

              {/* Compliance Badges */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '10px', background: vo.panVerified ? 'var(--accent-success-glow)' : 'var(--accent-warning-glow)', color: vo.panVerified ? 'var(--accent-success)' : 'var(--accent-warning)', fontWeight: '600' }}>
                  {vo.panVerified ? <ShieldCheck size={10} /> : <AlertTriangle size={10} />} PAN {vo.panVerified ? 'Verified' : 'Pending Verification'}
                </span>
                <span style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '10px', background: vo.bankVerified ? 'var(--accent-success-glow)' : 'hsla(222,22%,14%,0.8)', color: vo.bankVerified ? 'var(--accent-success)' : 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontWeight: '500' }}>
                  <CreditCard size={10} /> Bank {vo.bankVerified ? 'Verified' : 'Not Validated'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-component: Glossary & Compliance Tab
// ══════════════════════════════════════════════════════════════════════════════
function GlossaryTab() {
  const [search, setSearch]                 = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [dbGlossary, setDbGlossary]         = useState([]);

  useEffect(() => {
    api.getGlossary()
      .then(terms => {
        if (Array.isArray(terms) && terms.length > 0) {
          setDbGlossary(terms.map(t => ({ key: t.term_id || t.termId, term: t.term, definition: t.definition, category: t.category })));
        }
      })
      .catch(err => console.warn('Failed to fetch glossary from PostgreSQL:', err));
  }, []);

  const allTerms = dbGlossary.length > 0
    ? dbGlossary
    : Object.entries(GLOSSARY).map(([key, val]) => ({ key, ...val }));

  const filtered = allTerms.filter(t => {
    const matchSearch = !search ||
      t.term?.toLowerCase().includes(search.toLowerCase()) ||
      t.definition?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  const COMPLIANCE_RULES = [
    { rule: 'GST Rate — GTA under RCM', detail: '5% (no ITC) or 12% (with ITC) on road freight charged from GTA', icon: '📋', color: 'var(--accent-success)' },
    { rule: 'E-Way Bill Threshold', detail: 'Mandatory for consignment value > ₹50,000 across inter-state / intra-state movement', icon: '📦', color: 'var(--accent-info)' },
    { rule: 'TDS — Section 194C', detail: '1% (individual/HUF) or 2% (others) on freight payments > ₹30,000 per contract / ₹1,00,000 per year', icon: '💼', color: 'var(--accent-warning)' },
    { rule: 'GST e-Invoice (IRN)', detail: 'Mandatory for B2B invoices if turnover > ₹5 Cr. IRN + QR must be generated before billing.', icon: '🧾', color: 'var(--brand)' },
    { rule: 'Driver Hours-of-Service', detail: 'MoRTH norms: Max 10 hours driving per day, mandatory 8-hour rest; 48-hour duty cycle', icon: '🚛', color: 'var(--accent-danger)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Compliance Rules */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <ShieldCheck size={17} style={{ color: 'var(--accent-success)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-success)' }}>Regulatory Compliance Reminders</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {COMPLIANCE_RULES.map(r => (
            <div key={r.rule} style={{ padding: '14px', background: 'hsla(222,22%,12%,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{r.icon}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: r.color }}>{r.rule}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{r.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Glossary */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <BookOpen size={17} style={{ color: 'var(--accent-violet)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-violet)' }}>Trade Glossary</h3>
          <span className="badge" style={{ marginLeft: 'auto', background: 'hsla(262,60%,60%,0.15)', color: 'var(--accent-violet)', border: '1px solid var(--accent-violet)', fontSize: '0.65rem' }}>{filtered.length} terms</span>
        </div>

        {/* Search + Category filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="input-premium" style={{ paddingLeft: '33px', fontSize: '0.82rem' }}
              placeholder="Search terms or definitions…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveCategory('all')} style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontWeight: '600', background: activeCategory === 'all' ? 'var(--brand)' : 'transparent', color: activeCategory === 'all' ? '#fff' : 'var(--text-secondary)' }}>
              All
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button key={key} onClick={() => setActiveCategory(key)} style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${activeCategory === key ? cat.color : 'var(--border-subtle)'}`, cursor: 'pointer', fontWeight: '600', background: activeCategory === key ? `${cat.color}20` : 'transparent', color: activeCategory === key ? cat.color : 'var(--text-secondary)' }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {filtered.map(t => {
            const catColor = CATEGORIES[t.category]?.color || 'var(--text-muted)';
            return (
              <div key={t.key} style={{ padding: '14px', background: 'hsla(222,22%,12%,0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <p style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.term}</p>
                  <span style={{ fontSize: '0.6rem', background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40`, padding: '2px 6px', borderRadius: '8px', fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
                    {CATEGORIES[t.category]?.label || t.category}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>{t.definition}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
