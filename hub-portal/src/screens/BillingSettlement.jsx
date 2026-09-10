import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  DollarSign, 
  FileText, 
  CheckCircle, 
  ShieldCheck, 
  Truck, 
  TrendingDown, 
  Calendar, 
  Percent, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  User,
  Activity,
  CreditCard,
  X,
  History
} from 'lucide-react';
import GlossaryTooltip from '../components/GlossaryTooltip';
import { GLOSSARY } from '../components/glossaryData';

export default function BillingSettlement({ lrs = [], setLrs, trips = [], setTrips, vehicleOwners = [], trucks = [] }) {
  // --- Active Tab Filters ---
  const [selectedLrNos, setSelectedLrNos] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [activityLog, setActivityLog] = useState([
    { time: '09:14 AM', type: 'invoice', text: 'Invoice INV-2026-0112 generated for Reliance Retail — ₹45,000', color: 'var(--accent-info)' },
    { time: '08:50 AM', type: 'collect', text: 'Cash collected for LR-2026-003 (To-Pay) — ₹18,500', color: 'var(--accent-success)' },
    { time: 'Yesterday', type: 'settle', text: 'Hired lorry TRP-2026-002 settled to Shergill Roadlines — ₹28,000', color: 'var(--accent-warning)' },
  ]);
  const pushLog = (type, text, color) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setActivityLog(prev => [{ time, type, text, color }, ...prev.slice(0, 9)]);
  };
  
  // --- Agent Settlement States ---
  const [settledAgents, setSettledAgents] = useState([]);
  const [showAgentSettleModal, setShowAgentSettleModal] = useState(null); // agent name
  
  // --- Hired Lorry Deduction States (Indexed by Trip ID) ---
  const [shortageDeductions, setShortageDeductions] = useState({});
  const [lateDeductions, setLateDeductions] = useState({});
  const [miscDeductions, setMiscDeductions] = useState({});
  const [settledTrips, setSettledTrips] = useState([]);

  // --- GST and Interstate Logic ---
  const isInterState = (origin, destination) => {
    if (!origin || !destination) return true;
    const o = origin.toLowerCase().trim();
    const d = destination.toLowerCase().trim();
    if (o.includes('delhi') && d.includes('mumbai')) return true;
    if (o.includes('delhi') && d.includes('bangalore')) return true;
    if (o.includes('mumbai') && d.includes('delhi')) return true;
    if (o.includes('mumbai') && d.includes('bangalore')) return true;
    if (o.includes('bangalore') && d.includes('delhi')) return true;
    if (o.includes('bangalore') && d.includes('mumbai')) return true;
    return false;
  };

  // --- Ageing & Collection Calculations (FR-9.2) ---
  const getAgeingInfo = (lr) => {
    const lrDate = new Date(lr.date || '2026-06-15');
    const currentDate = new Date('2026-06-29'); // Current mock system date
    const diffTime = currentDate - lrDate;
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    if (lr.freightTerms === 'To-Pay') {
      if (lr.status === 'Delivered') {
        return { text: `Overdue by ${diffDays} days (Uncollected at POD)`, severity: 'danger', color: 'var(--accent-danger)' };
      }
      if (lr.status === 'Billed' || lr.status === 'Paid') {
        return { text: `Collected`, severity: 'success', color: 'var(--accent-success)' };
      }
      return { text: `Due on delivery (${lr.destination})`, severity: 'warning', color: 'var(--accent-warning)' };
    }
    
    if (lr.freightTerms === 'TBB') {
      if (lr.status === 'Billed') {
        return { text: `Invoiced - Awaiting collection`, severity: 'warning', color: 'var(--accent-warning)' };
      }
      if (lr.status === 'Paid') {
        return { text: `Invoice Settled`, severity: 'success', color: 'var(--accent-success)' };
      }
      const creditDays = 30;
      const remaining = creditDays - diffDays;
      if (remaining < 0) {
        return { text: `Overdue by ${Math.abs(remaining)} days`, severity: 'danger', color: 'var(--accent-danger)' };
      }
      return { text: `TBB Credit: Due in ${remaining} days`, severity: 'info', color: 'var(--accent-info)' };
    }
    
    return { text: `Paid (Prepaid at booking Branch)`, severity: 'success', color: 'var(--accent-success)' };
  };

  // --- Dynamic Outstanding Metric Calculations ---
  
  // Client Outstanding: sum of freightAmt of LRs that are not Billed/Paid
  const clientOutstanding = lrs
    .filter(l => l.status !== 'Billed' && l.status !== 'Paid')
    .reduce((s, l) => s + (l.freightAmt || 0), 0);

  // Hired Lorry Hire Outstanding: contractRate - driverAdvance - deductions for active trips
  const hiredOwnerOutstanding = trips
    .filter(t => t.status !== 'Closed' && t.status !== 'Settled' && !settledTrips.includes(t.id))
    .filter(t => {
      const tkObj = trucks.find(tk => tk.regNo === t.truckNo);
      return tkObj ? tkObj.ownership === 'attached' : (t.truckNo.startsWith('DL-1G') || t.truckNo.startsWith('HR-55'));
    })
    .reduce((s, t) => {
      const shortage = Number(shortageDeductions[t.id] || 0);
      const late = Number(lateDeductions[t.id] || 0);
      const misc = Number(miscDeductions[t.id] || 0);
      return s + (t.contractRate - t.driverAdvance - shortage - late - misc);
    }, 0);

  // Agent Commissions: Accrued commission (5%) on LRs that aren't settled yet
  const agentCommissions = lrs
    .filter(l => !settledAgents.includes(l.consignor)) // filter settled shippers
    .reduce((s, l) => s + (l.freightAmt * 0.05), 0);

  const netReceivable = clientOutstanding - hiredOwnerOutstanding - agentCommissions;

  // --- Actions & Handlers ---

  // 1. Consolidated Invoicing Submission (FR-9.1)
  const handleGenerateConsolidatedInvoice = () => {
    if (selectedLrNos.length === 0) return;
    
    // Update LR statuses to 'Billed'
    if (setLrs) {
      setLrs(prev => prev.map(l => selectedLrNos.includes(l.lrNo) ? { ...l, status: 'Billed' } : l));
    }
    
    const idCode = `INV-2026-0${Math.floor(Math.random() * 9000 + 1000)}`;
    const invoiceTotal = grossInvoiceTotal;
    setSuccessMsg(`Consolidated Invoice ${idCode} generated successfully! IRN Registered with GSTN. QR code printed on Bill.`);
    pushLog('invoice', `Invoice ${idCode} generated for ${selectedLrNos.length} LR(s) — ₹${Math.round(invoiceTotal).toLocaleString('en-IN')}`, 'var(--accent-info)');
    setSelectedLrNos([]);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // 2. Mark Individual To-Pay LR as Collected
  const handleMarkAsCollected = (lrNo) => {
    if (setLrs) {
      setLrs(prev => prev.map(l => l.lrNo === lrNo ? { ...l, status: 'Paid' } : l));
    }
    const amt = lrs.find(l => l.lrNo === lrNo)?.freightAmt || 0;
    setSuccessMsg(`Payment of ₹${amt.toLocaleString('en-IN')} collected and reconciled.`);
    pushLog('collect', `Cash collected for ${lrNo} (To-Pay) — ₹${amt.toLocaleString('en-IN')}`, 'var(--accent-success)');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 3. Agent Payout Processing (FR-9.3)
  const handleAgentSettle = (agentKey) => {
    const agent = showAgentSettleModal;
    setSettledAgents([...settledAgents, agentKey]);
    setShowAgentSettleModal(null);
    setSuccessMsg(`Commissions settled for ${agent?.name}. TDS (2%) deducted under Section 194C.`);
    pushLog('agent', `Agent commission settled: ${agent?.name} — ₹${Math.round((agent?.amount || 0) * 0.98).toLocaleString('en-IN')} (after TDS)`, 'var(--accent-warning)');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // 4. Hired Lorry Owner Settlement (FR-9.4)
  const handleSettleLorryHire = (tripId) => {
    api.updateTrip(tripId, { status: 'Settled' })
      .then(saved => {
        setSettledTrips([...settledTrips, tripId]);
        if (setTrips) {
          setTrips(prev => prev.map(t => t.id === tripId ? saved : t));
        }
        
        const trip = trips.find(t => t.id === tripId);
        const shortage = Number(shortageDeductions[tripId] || 0);
        const late = Number(lateDeductions[tripId] || 0);
        const misc = Number(miscDeductions[tripId] || 0);
        const netPaid = trip.contractRate - trip.driverAdvance - shortage - late - misc;
        const totalDeductions = shortage + late + misc;

        setSuccessMsg(`Lorry placement ${tripId} settled. Balance payout of ₹${netPaid.toLocaleString('en-IN')} approved to owner bank ledger.`);
        pushLog('settle', `Lorry hire ${tripId} settled — ₹${netPaid.toLocaleString('en-IN')} paid${totalDeductions > 0 ? ` (₹${totalDeductions.toLocaleString('en-IN')} deductions applied)` : ''}`, 'var(--accent-danger)');
        setTimeout(() => setSuccessMsg(''), 6000);
      })
      .catch(err => alert(`Failed to settle lorry hire on server: ${err.message}`));
  };

  // --- Dynamic Invoice Calculation Panel helper ---
  const selectedLrsData = lrs.filter(l => selectedLrNos.includes(l.lrNo));
  const subtotal = selectedLrsData.reduce((s, l) => s + (l.freightAmt || 0), 0);
  
  // Calculate interstate vs local taxes dynamically
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  selectedLrsData.forEach(lr => {
    const isInter = isInterState(lr.origin, lr.destination);
    if (isInter) {
      igst += lr.freightAmt * 0.18;
    } else {
      cgst += lr.freightAmt * 0.09;
      sgst += lr.freightAmt * 0.09;
    }
  });

  const totalGst = cgst + sgst + igst;
  const grossInvoiceTotal = subtotal + totalGst;

  // --- KPI Cards Model ---
  const summaryCards = [
    { label: 'Client Outstanding', value: `₹${clientOutstanding.toLocaleString('en-IN')}`, color: 'var(--accent-info)', bg: 'var(--accent-info-glow)' },
    { label: 'Lorry Hire Payable', value: `₹${hiredOwnerOutstanding.toLocaleString('en-IN')}`, color: 'var(--accent-danger)', bg: 'var(--accent-danger-glow)' },
    { label: 'Agent Commissions', value: `₹${agentCommissions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'var(--accent-warning)', bg: 'var(--accent-warning-glow)' },
    { label: 'Net Position', value: `₹${netReceivable.toLocaleString('en-IN')}`, color: netReceivable >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', bg: netReceivable >= 0 ? 'var(--accent-success-glow)' : 'var(--accent-danger-glow)' },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <h2 className="page-title">Commercial Invoicing & Settlements</h2>
        <p className="page-subtitle">Execute client invoicing · Reconcile agent commissions · Settle hired owner payments</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {summaryCards.map(c => (
          <div key={c.label} className="glass-panel" style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{c.label}</p>
            <p style={{ fontSize: '1.45rem', fontWeight: '800', color: c.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{c.value}</p>
            <div style={{ height: '3px', borderRadius: '2px', background: c.bg, borderTop: `1px solid ${c.color}30`, marginTop: '12px' }}>
              <div style={{ height: '100%', width: '100%', borderRadius: '2px', background: c.color, opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {/* Three Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.15fr 1.25fr', gap: '24px', alignItems: 'start' }}>

        {/* Column 1: Client Invoicing & To-Pay Collections */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <FileText size={17} style={{ color: 'var(--accent-info)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-info)' }}>Client Invoicing & Collection</h3>
          </div>

          {/* Consolidated Invoicing Panel (Conditional) */}
          {selectedLrNos.length > 0 && (
            <div style={{ 
              background: 'hsla(210, 90%, 62%, 0.08)', 
              border: '1px solid hsla(210, 90%, 62%, 0.25)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px', 
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--brand-light)' }}>
                  Consolidated Invoice Preview
                </span>
                <span className="badge badge-brand" style={{ fontSize: '0.68rem' }}>
                  {selectedLrNos.length} LRs Mapped
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal Freight:</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {cgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CGST (9%) + SGST (9%):</span>
                    <span>₹{(cgst + sgst).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {igst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>IGST (18%):</span>
                    <span>₹{igst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  <span>Gross Invoice Total:</span>
                  <span>₹{grossInvoiceTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '9px', fontSize: '0.8rem', justifyContent: 'center' }} 
                onClick={handleGenerateConsolidatedInvoice}
              >
                Generate Consolidated Invoice
              </button>
            </div>
          )}

          {/* LR List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lrs.filter(lr => lr.lrNo !== 'LR-2026-001').map(lr => {
              const isChecked = selectedLrNos.includes(lr.lrNo);
              const isBilled = lr.status === 'Billed' || lr.status === 'Paid';
              const ageing = getAgeingInfo(lr);

              return (
                <div key={lr.lrNo} style={{ 
                  padding: '14px', 
                  background: isChecked ? 'hsla(210, 90%, 62%, 0.05)' : 'hsla(222, 22%, 12%, 0.6)', 
                  border: `1px solid ${isChecked ? 'hsla(210, 90%, 62%, 0.3)' : 'var(--border-subtle)'}`, 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  gap: '12px'
                }}>
                  {/* Checkbox for Invoice selection */}
                  {!isBilled && lr.freightTerms === 'TBB' && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedLrNos(prev => 
                            prev.includes(lr.lrNo) ? prev.filter(id => id !== lr.lrNo) : [...prev, lr.lrNo]
                          );
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.875rem', fontFamily: 'var(--font-display)', color: 'var(--brand-light)' }}>
                        <GlossaryTooltip term="LR" glossary={GLOSSARY}>{lr.lrNo}</GlossaryTooltip>
                      </span>
                      <span className={`badge ${lr.freightTerms === 'To-Pay' ? 'badge-warning' : lr.freightTerms === 'Paid' ? 'badge-success' : 'badge-cyan'}`}>
                        <GlossaryTooltip term={lr.freightTerms === 'To-Pay' ? 'TO_PAY' : lr.freightTerms === 'TBB' ? 'TBB' : 'FREIGHT_TERMS'} glossary={GLOSSARY}>
                          {lr.freightTerms}
                        </GlossaryTooltip>
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <p>Client: {lr.consignor}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Route: {lr.origin} ➔ {lr.destination}</p>
                      <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>₹{lr.freightAmt?.toLocaleString('en-IN')}</p>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: ageing.color, fontWeight: '500' }}>
                        {ageing.text}
                      </span>
                      
                      {/* Action for To-Pay Collection */}
                      {!isBilled && lr.freightTerms === 'To-Pay' && lr.status === 'Delivered' && (
                        <button 
                          className="btn-primary" 
                          style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'var(--accent-success)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleMarkAsCollected(lr.lrNo)}
                        >
                          Collect Cash
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Agent Commissions & Sub-broker Splits */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <DollarSign size={17} style={{ color: 'var(--accent-warning)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-warning)' }}>Agent & Broker Splits</h3>
          </div>

          {/* Settle Commission Confirmation dialog (Conditional) */}
          {showAgentSettleModal && (
            <div style={{ 
              background: 'hsla(38, 92%, 55%, 0.08)', 
              border: '1px solid hsla(38, 92%, 55%, 0.25)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px', 
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700' }}>Payout Statement: {showAgentSettleModal.name}</span>
                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setShowAgentSettleModal(null)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Commission Accrued:</span>
                  <span>₹{showAgentSettleModal.amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Primary Broker Share (70%):</span>
                  <span>₹{Math.round(showAgentSettleModal.amount * 0.7).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sub-broker Split (30%):</span>
                  <span>₹{Math.round(showAgentSettleModal.amount * 0.3).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-danger)' }}>
                  <span>TDS Deduction (2% - 194C):</span>
                  <span>− ₹{Math.round(showAgentSettleModal.amount * 0.02).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  <span>Net Paid Payout:</span>
                  <span>₹{Math.round(showAgentSettleModal.amount * 0.98).toLocaleString()}</span>
                </div>
              </div>

              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '8px', fontSize: '0.78rem', background: 'var(--accent-warning)', border: 'none', color: '#fff', justifyContent: 'center' }}
                onClick={() => handleAgentSettle(showAgentSettleModal.shipperKey)}
              >
                Confirm Settlement Payout
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { name: 'National Booking Agency', shipperKey: 'TATA Motors Logistics', share: 0.7, note: 'Accruing' },
              { name: 'Mumbai Local Broker', shipperKey: 'Reliance Retail Ltd', share: 0.3, note: 'Settle on POD upload' },
            ].map(agent => {
              const isSettled = settledAgents.includes(agent.shipperKey);
              // Calculate agent commission: 5% of freightAmt of LRs
              const agentLrFreight = lrs.filter(l => l.consignor === agent.shipperKey).reduce((s, l) => s + l.freightAmt, 0);
              const rawCommission = agentLrFreight * 0.05;
              const primarySplit = rawCommission * 0.7;
              const subSplit = rawCommission * 0.3;

              return (
                <div key={agent.name} style={{ 
                  padding: '14px', 
                  background: 'hsla(222, 22%, 12%, 0.6)', 
                  border: `1px solid ${isSettled ? 'var(--accent-success-glow)' : 'var(--border-subtle)'}`, 
                  borderRadius: 'var(--radius-md)',
                  opacity: isSettled ? 0.6 : 1
                }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '6px' }}>{agent.name}</h4>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <div>
                      <span>Total Accrued Commission: </span>
                      <strong style={{ color: 'var(--accent-warning)' }}>
                        ₹{Math.round(rawCommission).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div style={{ paddingLeft: '8px', fontSize: '0.75rem', borderLeft: '2px solid var(--border-subtle)' }}>
                      <div>Primary Share (70%): ₹{Math.round(primarySplit).toLocaleString('en-IN')}</div>
                      <div>Sub-broker Split (30%): ₹{Math.round(subSplit).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Status: {agent.note}</div>
                  </div>

                  {isSettled ? (
                    <span style={{ color: 'var(--accent-success)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                      <ShieldCheck size={14} /> Settled (TDS filed)
                    </span>
                  ) : (
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.76rem', width: '100%', justifyContent: 'center' }}
                      onClick={() => setShowAgentSettleModal({ name: agent.name, amount: rawCommission, shipperKey: agent.shipperKey })}
                    >
                      Settle Commission
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Hired Lorry Settlements with Deduction Inputs */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Truck size={17} style={{ color: 'var(--accent-danger)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-danger)' }}>Hired Lorry Payouts</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trips.filter(t => {
              if (!t.truckNo) return false;
              const truckObj = trucks.find(tk => tk.regNo === t.truckNo);
              return truckObj ? truckObj.ownership === 'attached' : (t.truckNo.startsWith('DL-1G') || t.truckNo.startsWith('HR-55'));
            }).map(trip => {
              const isSettled = settledTrips.includes(trip.id) || trip.status === 'Settled';
              const shortage = Number(shortageDeductions[trip.id] || 0);
              const late = Number(lateDeductions[trip.id] || 0);
              const misc = Number(miscDeductions[trip.id] || 0);
              const netBalance = trip.contractRate - trip.driverAdvance - shortage - late - misc;

              return (
                <div key={trip.id} style={{ 
                  padding: '14px', 
                  background: 'hsla(222, 22%, 12%, 0.6)', 
                  border: `1px solid ${isSettled ? 'var(--accent-success-glow)' : 'var(--border-subtle)'}`, 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.875rem', fontFamily: 'var(--font-display)' }}>{trip.id}</span>
                    <span className={`badge ${isSettled ? 'badge-success' : 'badge-warning'}`}>
                      {isSettled ? 'Settled' : 'Balance Due'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <p>Owner: Shergill Roadlines</p>
                    <p>Total Hire (Agreed): ₹{trip.contractRate?.toLocaleString('en-IN')}</p>
                    <p>Advance Paid: ₹{trip.driverAdvance?.toLocaleString('en-IN')}</p>
                  </div>

                  {/* Deduction Inputs (Only visible if not settled yet) */}
                  {!isSettled ? (
                    <div style={{ 
                      background: 'var(--bg-elevated)', 
                      padding: '10px 12px', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Deductions & Penalties
                      </span>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        <div>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Shortage</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={shortageDeductions[trip.id] || ''}
                            onChange={(e) => setShortageDeductions({ ...shortageDeductions, [trip.id]: e.target.value })}
                            style={{ width: '100%', padding: '4px', fontSize: '0.72rem', background: 'var(--bg-void)', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: '#fff' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Late Del.</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={lateDeductions[trip.id] || ''}
                            onChange={(e) => setLateDeductions({ ...lateDeductions, [trip.id]: e.target.value })}
                            style={{ width: '100%', padding: '4px', fontSize: '0.72rem', background: 'var(--bg-void)', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: '#fff' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Mamool</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={miscDeductions[trip.id] || ''}
                            onChange={(e) => setMiscDeductions({ ...miscDeductions, [trip.id]: e.target.value })}
                            style={{ width: '100%', padding: '4px', fontSize: '0.72rem', background: 'var(--bg-void)', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: '#fff' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Net Payable Balance:</span>
                        <strong style={{ color: 'var(--accent-danger)' }}>₹{netBalance.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'hsla(152,72%,48%,0.06)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-success-glow)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>Deductions Applied:</span>
                        <span style={{ color: 'var(--accent-danger)' }}>
                          ₹{(shortage + late + misc).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', fontWeight: '700' }}>
                        <span>Total Paid Balance:</span>
                        <span style={{ color: 'var(--accent-success)' }}>₹{netBalance.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {!isSettled && (
                    <button 
                      className="btn-primary" 
                      style={{ justifyContent: 'center', padding: '8px', fontSize: '0.78rem', background: 'var(--accent-danger)', border: 'none', color: '#fff' }}
                      onClick={() => handleSettleLorryHire(trip.id)}
                    >
                      Settle Lorry Payout
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Settlement Activity Log */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <History size={17} style={{ color: 'var(--accent-violet)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-violet)' }}>Settlement Activity Log</h3>
          <span className="badge" style={{ marginLeft: 'auto', fontSize: '0.68rem', background: 'var(--accent-violet-glow)', color: 'var(--accent-violet)', border: '1px solid var(--accent-violet)', padding: '2px 8px', borderRadius: '20px' }}>
            Today
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {activityLog.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '10px 0', borderBottom: idx < activityLog.length - 1 ? '1px dashed var(--border-subtle)' : 'none' }}>
              {/* Timeline dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', paddingTop: '2px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                {idx < activityLog.length - 1 && (
                  <div style={{ width: '1px', height: '28px', background: 'var(--border-subtle)', marginTop: '4px' }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{entry.text}</span>
              </div>

              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '2px' }}>
                {entry.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Net Position Footer */}
      <div className="glass-panel" style={{ padding: '22px', background: 'linear-gradient(135deg, hsla(35, 95%, 55%, 0.06) 0%, hsla(222, 22%, 14%, 0.8) 100%)', borderColor: 'hsla(35, 95%, 55%, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingDown size={20} style={{ color: 'var(--brand)' }} />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>Consolidated Net Receivable Position</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Reconciled against active trips, LRs, and agent ledgers</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '40px' }}>
            {summaryCards.map(c => (
              <div key={c.label} style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</p>
                <p style={{ fontSize: '1.2rem', fontWeight: '800', color: c.color, fontFamily: 'var(--font-display)' }}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
