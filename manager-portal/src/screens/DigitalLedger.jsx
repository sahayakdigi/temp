import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Eye, 
  ShieldCheck, 
  Layers, 
  BarChart3, 
  Building2, 
  MapPin, 
  Truck, 
  FileText, 
  CheckCircle,
  Activity,
  DollarSign,
  Navigation,
  User,
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  Plus,
  X,
  ArrowLeft
} from 'lucide-react';
import GlossaryTooltip from '../components/GlossaryTooltip';
import { GLOSSARY } from '../components/glossaryData';

export default function DigitalLedger({ trips = [], setTrips, lrs = [], setLrs, manifests = [], setManifests, branches = [] }) {
  // --- Drill-down States ---
  const [selectedBranchId, setSelectedBranchId] = useState(null); // null = Company Level
  const [selectedTripId, setSelectedTripId] = useState(null);     // null = List View
  const [selectedLrNo, setSelectedLrNo] = useState(null);         // null = List View
  const [activeTab, setActiveTab] = useState('all');               // 'all', 'ftl', 'ptl'

  // --- Search & Filter States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- Inline Expense Form States ---
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpType, setNewExpType] = useState('fuel');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpSource, setNewExpSource] = useState('FASTag');
  const [newExpVerified, setNewExpVerified] = useState(true);

  // --- Notification Toast State ---
  const [toastMsg, setToastMsg] = useState('');

  // --- Trigger Toast Notification ---
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // --- Mappings & Helpers ---
  const getBranchId = (cityOrId) => {
    if (!cityOrId) return 'DEL';
    const val = cityOrId.toUpperCase().trim();
    if (val === 'DEL' || val.includes('DELHI')) return 'DEL';
    if (val === 'BOM' || val === 'MUM' || val.includes('MUMBAI')) return 'BOM';
    if (val === 'BLR' || val.includes('BANGALORE')) return 'BLR';
    if (val === 'HO' || val.includes('HEAD')) return 'HO';
    return val;
  };

  const getBranchName = (id) => {
    const b = branches.find(item => item.id.toUpperCase() === id.toUpperCase());
    return b ? b.name : id;
  };

  // --- Dynamic Expenses Generator for Manifests ---
  const getManifestExpenses = (manifest) => {
    if (manifest.expenses) return manifest.expenses;
    if (manifest.id === 'MNF-2026-001') {
      return [
        { id: 'EXP-M1', type: 'fuel', amount: 28000, source: 'FASTag', verified: true, date: '2026-06-10' },
        { id: 'EXP-M2', type: 'toll', amount: 4800, source: 'FASTag', verified: true, date: '2026-06-10' },
        { id: 'EXP-M3', type: 'batta', amount: 2000, source: 'manual', verified: true, date: '2026-06-11' },
        { id: 'EXP-M4', type: 'misc', amount: 1200, source: 'ocr', verified: false, date: '2026-06-12', image: '/bill_ocr.jpg' }
      ];
    }
    // Proportional generator for newly created manifests
    return [
      { id: `EXP-${manifest.id}-1`, type: 'fuel', amount: Math.round(manifest.totalFreight * 0.35), source: 'FASTag', verified: true, date: manifest.date },
      { id: `EXP-${manifest.id}-2`, type: 'toll', amount: Math.round(manifest.totalFreight * 0.07), source: 'FASTag', verified: true, date: manifest.date },
      { id: `EXP-${manifest.id}-3`, type: 'batta', amount: 1500, source: 'manual', verified: true, date: manifest.date },
      { id: `EXP-${manifest.id}-4`, type: 'misc', amount: 800, source: 'ocr', verified: false, date: manifest.date }
    ];
  };

  const getTripDistance = (tOrM) => {
    if (tOrM.odoEnd && tOrM.odoStart) {
      return tOrM.odoEnd - tOrM.odoStart;
    }
    // Route fallback estimates
    const lane = (tOrM.lane || `${tOrM.origin} ➔ ${tOrM.destination}`).toUpperCase();
    if (lane.includes('DEL') && lane.includes('BOM')) return 1420;
    if (lane.includes('DEL') && lane.includes('BLR')) return 2150;
    if (lane.includes('BOM') && lane.includes('BLR')) return 980;
    if (lane.includes('BOM') && lane.includes('DEL')) return 1420;
    return 850; 
  };

  // --- Unified Ledger List Builder ---
  const FTL_items = trips.map(t => {
    const rev = t.contractRate || 0;
    const exp = t.expenses?.reduce((s, x) => s + x.amount, 0) || 0;
    const branchId = getBranchId(t.origin);
    return {
      id: t.id,
      type: 'FTL',
      branchId,
      origin: t.origin,
      destination: t.destination,
      lane: `${t.origin} ➔ ${t.destination}`,
      truckNo: t.truckNo,
      driverName: t.driverName,
      status: t.status,
      date: t.startDate,
      revenue: rev,
      expenses: t.expenses || [],
      totalExpenses: exp,
      profit: rev - exp,
      distance: getTripDistance(t),
      rawTrip: t
    };
  });

  const PTL_items = manifests.map(m => {
    // Collect associated LRs
    const assignedLrs = lrs.filter(l => l.manifestId === m.id || (m.lrNos && m.lrNos.includes(l.lrNo)));
    const rev = assignedLrs.reduce((s, l) => s + (l.freightAmt || 0), 0) || m.totalFreight || 0;
    const expList = getManifestExpenses(m);
    const exp = expList.reduce((s, x) => s + x.amount, 0);
    const originCity = m.lane ? m.lane.split(/[-➔→]/)[0]?.trim() : 'Delhi';
    const destCity = m.lane ? m.lane.split(/[-➔→]/)[1]?.trim() : 'Bangalore';
    const branchId = getBranchId(m.originHub || originCity);

    return {
      id: m.id,
      type: 'PTL',
      branchId,
      origin: originCity,
      destination: destCity,
      lane: m.lane || `${originCity} ➔ ${destCity}`,
      truckNo: m.vehicleNo,
      driverName: m.driverName,
      status: m.status,
      date: m.date,
      revenue: rev,
      expenses: expList,
      totalExpenses: exp,
      profit: rev - exp,
      distance: getTripDistance(m),
      assignedLrs,
      rawManifest: m
    };
  });

  // Standalone LRs (Booked but not yet Manifested or linked to FTL trips)
  const standaloneLrs = lrs.filter(l => !l.manifestId && l.lrNo !== 'LR-2026-001'); // LR-001 is the seed FTL LR

  const unifiedLedgerItems = [...FTL_items, ...PTL_items];

  // --- Interactive Verification Handler ---
  const handleVerifyExpense = (itemId, expenseId, isPTL) => {
    if (isPTL) {
      if (setManifests) {
        setManifests(prev => prev.map(m => {
          if (m.id === itemId) {
            const currentExp = m.expenses || getManifestExpenses(m);
            return {
              ...m,
              expenses: currentExp.map(e => e.id === expenseId ? { ...e, verified: true } : e)
            };
          }
          return m;
        }));
        showToast(`Expense ${expenseId} on Manifest ${itemId} verified successfully.`);
      }
    } else {
      api.updateTripExpense(itemId, expenseId, { verified: true })
        .then(saved => {
          if (setTrips) {
            setTrips(prev => prev.map(t => {
              if (t.id === itemId) {
                return {
                  ...t,
                  expenses: (t.expenses || []).map(e => e.id === expenseId ? saved : e)
                };
              }
              return t;
            }));
            showToast(`Expense ${expenseId} on Trip ${itemId} verified successfully.`);
          }
        })
        .catch(err => alert(`Failed to verify expense on server: ${err.message}`));
    }
  };

  // --- Add Expense Submission Handler ---
  const handleAddExpenseSubmit = (e) => {
    e.preventDefault();
    if (!newExpAmount || Number(newExpAmount) <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    const newExpense = {
      id: `EXP-ADD-${Date.now()}`,
      type: newExpType,
      amount: Number(newExpAmount),
      source: newExpSource,
      verified: newExpVerified,
      date: new Date().toISOString().split('T')[0]
    };

    const isPTL = selectedItem.type === 'PTL';
    if (isPTL) {
      if (setManifests) {
        setManifests(prev => prev.map(m => {
          if (m.id === selectedTripId) {
            const currentExp = m.expenses || getManifestExpenses(m);
            return {
              ...m,
              expenses: [...currentExp, newExpense]
            };
          }
          return m;
        }));
      }
      showToast(`New ${newExpType} cost of ₹${Number(newExpAmount).toLocaleString()} added to ${selectedTripId}.`);
      setNewExpAmount('');
      setShowAddExpense(false);
    } else {
      api.createTripExpense(selectedTripId, newExpense)
        .then(savedExp => {
          if (setTrips) {
            setTrips(prev => prev.map(t => {
              if (t.id === selectedTripId) {
                return {
                  ...t,
                  expenses: [...(t.expenses || []), savedExp]
                };
              }
              return t;
            }));
          }
          showToast(`New ${newExpType} cost of ₹${Number(newExpAmount).toLocaleString()} added to ${selectedTripId}.`);
          setNewExpAmount('');
          setShowAddExpense(false);
        })
        .catch(err => alert(`Failed to add expense on server: ${err.message}`));
    }
  };

  // --- Export Ledger PDF/CSV Action ---
  const handleExportLedger = () => {
    showToast('Compiling unified ledger records... Ledger statement generated and downloaded successfully.');
  };

  // --- Financial Context Calculators ---
  
  // 1. Company Level Metrics
  const companyRevenue = unifiedLedgerItems.reduce((s, i) => s + i.revenue, 0) + standaloneLrs.reduce((s, l) => s + l.freightAmt, 0);
  const companyExpenses = unifiedLedgerItems.reduce((s, i) => s + i.totalExpenses, 0);
  const companyProfit = companyRevenue - companyExpenses;
  const companyMargin = companyRevenue > 0 ? Math.round((companyProfit / companyRevenue) * 100) : 0;

  // 1b. Company Advanced Analytics
  const totalCompanyWeight = lrs.reduce((s, l) => s + (l.chargeWt || 0), 0);
  const totalCompanyDistance = unifiedLedgerItems.reduce((s, i) => s + i.distance, 0);
  const avgProfitPerTrip = unifiedLedgerItems.length > 0 ? Math.round(companyProfit / unifiedLedgerItems.length) : 0;
  const costPerKm = totalCompanyDistance > 0 ? (companyExpenses / totalCompanyDistance) : 0;

  // 2. Selected Branch Metrics
  const branchItems = selectedBranchId 
    ? unifiedLedgerItems.filter(i => i.branchId === selectedBranchId)
    : [];
  const branchStandalone = selectedBranchId
    ? standaloneLrs.filter(l => getBranchId(l.bookingBranch) === selectedBranchId)
    : [];
  const branchRevenue = branchItems.reduce((s, i) => s + i.revenue, 0) + branchStandalone.reduce((s, l) => s + l.freightAmt, 0);
  const branchExpenses = branchItems.reduce((s, i) => s + i.totalExpenses, 0);
  const branchProfit = branchRevenue - branchExpenses;
  const branchMargin = branchRevenue > 0 ? Math.round((branchProfit / branchRevenue) * 100) : 0;

  // 3. Selected Trip/Manifest Metrics
  const selectedItem = selectedTripId 
    ? unifiedLedgerItems.find(i => i.id === selectedTripId)
    : null;
  const tripRevenue = selectedItem ? selectedItem.revenue : 0;
  const tripExpenses = selectedItem ? selectedItem.totalExpenses : 0;
  const tripProfit = selectedItem ? selectedItem.profit : 0;
  const tripMargin = selectedItem && selectedItem.revenue > 0 ? Math.round((selectedItem.profit / selectedItem.revenue) * 100) : 0;
  const tripMarginPerKm = selectedItem && selectedItem.distance > 0 ? (selectedItem.profit / selectedItem.distance) : 0;

  // Compute Expense Types for Visual Stacked Bar
  const getExpenseBreakdown = (expenses = []) => {
    const totals = { fuel: 0, toll: 0, batta: 0, misc: 0 };
    expenses.forEach(x => {
      if (totals[x.type] !== undefined) totals[x.type] += x.amount;
      else totals.misc += x.amount;
    });
    return totals;
  };

  const selectedExpTotals = selectedItem ? getExpenseBreakdown(selectedItem.expenses) : null;

  // 4. Selected LR Metrics (drill-down inside manifest/trip)
  const selectedLr = selectedLrNo ? lrs.find(l => l.lrNo === selectedLrNo) : null;
  
  // Calculate specific LR's allocated manifest costs if PTL
  const getLrMetrics = (lr) => {
    if (!lr) return { revenue: 0, expenses: 0, profit: 0, margin: 0 };
    const rev = lr.freightAmt || 0;
    
    // Find parent manifest
    if (lr.manifestId) {
      const parentM = PTL_items.find(m => m.id === lr.manifestId);
      if (parentM) {
        const totalWt = parentM.assignedLrs.reduce((s, item) => s + (item.chargeWt || 0), 0) || lr.chargeWt || 1;
        const ratio = (lr.chargeWt || 0) / totalWt;
        const exp = Math.round(parentM.totalExpenses * ratio);
        const profit = rev - exp;
        return {
          revenue: rev,
          expenses: exp,
          profit,
          margin: rev > 0 ? Math.round((profit / rev) * 100) : 0,
          ratio: Math.round(ratio * 100)
        };
      }
    }
    // FTL LR
    const parentTrip = FTL_items.find(t => t.id === selectedTripId || t.id === lr.tripId);
    if (parentTrip) {
      return {
        revenue: rev,
        expenses: parentTrip.totalExpenses,
        profit: rev - parentTrip.totalExpenses,
        margin: rev > 0 ? Math.round(((rev - parentTrip.totalExpenses) / rev) * 100) : 0,
        ratio: 100
      };
    }
    // Standalone
    return { revenue: rev, expenses: 0, profit: rev, margin: 100, ratio: 100 };
  };

  const lrMetrics = selectedLr ? getLrMetrics(selectedLr) : null;

  // --- Render Values based on active level ---
  const activeRevenue = selectedLrNo 
    ? lrMetrics.revenue 
    : selectedTripId 
      ? tripRevenue 
      : selectedBranchId 
        ? branchRevenue 
        : companyRevenue;

  const activeExpenses = selectedLrNo 
    ? lrMetrics.expenses 
    : selectedTripId 
      ? tripExpenses 
      : selectedBranchId 
        ? branchExpenses 
        : companyExpenses;

  const activeProfit = activeRevenue - activeExpenses;
  const activeMargin = activeRevenue > 0 ? Math.round((activeProfit / activeRevenue) * 100) : 0;

  // --- Lane Profitability Aggregator (FR-8.5) ---
  const laneStatsMap = {};
  unifiedLedgerItems.forEach(item => {
    const key = item.lane;
    if (!laneStatsMap[key]) {
      laneStatsMap[key] = { lane: key, revenue: 0, expenses: 0, tripsCount: 0 };
    }
    laneStatsMap[key].revenue += item.revenue;
    laneStatsMap[key].expenses += item.totalExpenses;
    laneStatsMap[key].tripsCount += 1;
  });

  const laneStats = Object.values(laneStatsMap).map(l => {
    const profit = l.revenue - l.expenses;
    return {
      ...l,
      profit,
      margin: l.revenue > 0 ? Math.round((profit / l.revenue) * 100) : 0
    };
  });

  const lossMakingLanes = laneStats.filter(l => l.margin < 0);

  // --- Search & Filter Logic on Unified Items ---
  const getFilteredItems = (items) => {
    return items.filter(item => {
      const matchQuery = 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.truckNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lane.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.driverName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
      
      return matchQuery && matchStatus;
    });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notification Alert */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          background: 'var(--accent-success-glow)',
          border: '1px solid var(--accent-success)',
          color: 'var(--text-primary)',
          padding: '14px 22px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle size={18} style={{ color: 'var(--accent-success)' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Unified Digital Ledger</h2>
          <p className="page-subtitle">Traceable net profitability rollup at LR, Trip, and Branch level</p>
        </div>
        
        {/* Actions Strip */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-primary" 
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.82rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              cursor: 'pointer',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '600',
              color: '#fff',
              background: 'var(--brand)'
            }} 
            onClick={handleExportLedger}
          >
            <Download size={14} /> Export Ledger (PDF/CSV)
          </button>
        </div>
      </div>

      {/* Breadcrumb Drill-down Control */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '0.85rem', 
        background: 'hsla(222, 22%, 12%, 0.6)', 
        padding: '12px 18px', 
        borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-inset)'
      }}>
        <span 
          style={{ 
            color: !selectedBranchId ? 'var(--brand-light)' : 'var(--text-secondary)', 
            fontWeight: !selectedBranchId ? '700' : '500', 
            cursor: 'pointer',
            transition: 'var(--t-fast)'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = !selectedBranchId ? 'var(--brand-light)' : 'var(--text-secondary)'}
          onClick={() => { setSelectedBranchId(null); setSelectedTripId(null); setSelectedLrNo(null); }}
        >
          Temp Ltd (HQ)
        </span>
        
        {selectedBranchId && (
          <>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            <span 
              style={{ 
                color: !selectedTripId ? 'var(--brand-light)' : 'var(--text-secondary)', 
                fontWeight: !selectedTripId ? '700' : '500', 
                cursor: 'pointer',
                transition: 'var(--t-fast)'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.color = !selectedTripId ? 'var(--brand-light)' : 'var(--text-secondary)'}
              onClick={() => { setSelectedTripId(null); setSelectedLrNo(null); }}
            >
              {getBranchName(selectedBranchId)}
            </span>
          </>
        )}
        
        {selectedTripId && (
          <>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            <span 
              style={{ 
                color: !selectedLrNo ? 'var(--brand-light)' : 'var(--text-secondary)', 
                fontWeight: !selectedLrNo ? '700' : '500', 
                cursor: 'pointer',
                transition: 'var(--t-fast)'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.color = !selectedLrNo ? 'var(--brand-light)' : 'var(--text-secondary)'}
              onClick={() => { setSelectedLrNo(null); }}
            >
              {selectedTripId}
            </span>
          </>
        )}

        {selectedLrNo && (
          <>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--brand-light)', fontWeight: '700' }}>
              Consignment: {selectedLrNo}
            </span>
          </>
        )}
      </div>

      {/* Back Navigation Button for easy drill-down escape */}
      {selectedBranchId && (
        <div style={{ display: 'flex' }}>
          <button 
            onClick={() => {
              if (selectedLrNo) {
                setSelectedLrNo(null);
              } else if (selectedTripId) {
                setSelectedTripId(null);
              } else {
                setSelectedBranchId(null);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'hsla(222, 22%, 12%, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--t-fast)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.color = 'var(--brand-light)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'hsla(222, 22%, 12%, 0.5)';
            }}
          >
            <ArrowLeft size={14} /> 
            {selectedLrNo 
              ? `Back to Trip ${selectedTripId}` 
              : selectedTripId 
                ? `Back to ${getBranchName(selectedBranchId)} Logs` 
                : 'Back to Company HQ Rollup'
            }
          </button>
        </div>
      )}

      {/* Dynamic Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-info)', opacity: 0.7 }} />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            {selectedLrNo ? 'LR Revenue' : selectedTripId ? 'Trip Revenue' : 'Consolidated Revenue'}
          </p>
          <p style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--accent-info)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            ₹{activeRevenue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-danger)', opacity: 0.7 }} />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            {selectedLrNo ? 'Allocated Expense' : selectedTripId ? 'Operational Cost Outgo' : 'Operational Expenses'}
          </p>
          <p style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--accent-danger)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            − ₹{activeExpenses.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: activeProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', opacity: 0.7 }} />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            Net Margin ({activeMargin}%)
          </p>
          <p style={{ 
            fontSize: '1.65rem', 
            fontWeight: '800', 
            color: activeProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', 
            fontFamily: 'var(--font-display)', 
            letterSpacing: '-0.02em' 
          }}>
            ₹{activeProfit.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Main Grid Content - Dynamically Renders depending on drilldown state */}
      
      {/* ──────────────────────────────────────────────────────── */}
      {/* LEVEL 0: COMPANY HQ VIEW                                 */}
      {/* ──────────────────────────────────────────────────────── */}
      {!selectedBranchId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Secondary KPIs strip (Advanced Analytics) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '12px 16px', background: 'hsla(222,22%,12%,0.2)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block', textTransform: 'uppercase' }}>Total Weight Moved</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(totalCompanyWeight / 1000).toFixed(1)} MT</span>
            </div>
            <div className="glass-panel" style={{ padding: '12px 16px', background: 'hsla(222,22%,12%,0.2)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block', textTransform: 'uppercase' }}>Total Run Distance</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{totalCompanyDistance.toLocaleString()} km</span>
            </div>
            <div className="glass-panel" style={{ padding: '12px 16px', background: 'hsla(222,22%,12%,0.2)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block', textTransform: 'uppercase' }}>Avg Profit / Placement</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-success)' }}>₹{avgProfitPerTrip.toLocaleString('en-IN')}</span>
            </div>
            <div className="glass-panel" style={{ padding: '12px 16px', background: 'hsla(222,22%,12%,0.2)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block', textTransform: 'uppercase' }}>Average Linehaul Cost</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-danger)' }}>₹{Math.round(costPerKm)} / km</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Left Side: Branch Rollup */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <Building2 size={18} style={{ color: 'var(--brand)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Branch Rollup Ledgers</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {branches.map(branch => {
                  const bId = branch.id;
                  const bItems = unifiedLedgerItems.filter(i => i.branchId === bId);
                  const bStandalone = standaloneLrs.filter(l => getBranchId(l.bookingBranch) === bId);
                  
                  const bRevenue = bItems.reduce((s, i) => s + i.revenue, 0) + bStandalone.reduce((s, l) => s + l.freightAmt, 0);
                  const bExpenses = bItems.reduce((s, i) => s + i.totalExpenses, 0);
                  const bProfit = bRevenue - bExpenses;
                  const bMargin = bRevenue > 0 ? Math.round((bProfit / bRevenue) * 100) : 0;

                  return (
                    <div key={bId} onClick={() => setSelectedBranchId(bId)}
                      className="glass-panel-interactive"
                      style={{
                        padding: '16px 20px',
                        background: 'hsla(222,22%,12%,0.4)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        transition: 'var(--t-base)'
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{branch.name}</span>
                        <span className={`badge ${bMargin >= 20 ? 'badge-success' : bMargin >= 0 ? 'badge-warning' : 'badge-danger'}`}>
                          {bMargin}% Margin
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        GSTIN: {branch.gstin} · Type: {branch.type}
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', fontSize: '0.82rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Revenue</span>
                          <span style={{ color: 'var(--accent-info)', fontWeight: '600' }}>₹{bRevenue.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Outgo</span>
                          <span style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>₹{bExpenses.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Net Profit</span>
                          <span style={{ color: bProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: '700' }}>
                            ₹{bProfit.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Route/Lane Profitability & Loss Flagging */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Navigation size={18} style={{ color: 'var(--brand)' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Lane Profitability Analytics</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {laneStats.map(stat => (
                    <div key={stat.lane} style={{ background: 'hsla(222,22%,12%,0.2)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} style={{ color: 'var(--brand)' }} /> {stat.lane}
                        </span>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: '700', 
                          color: stat.margin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {stat.margin < 0 && <AlertTriangle size={12} />}
                          {stat.margin}% Margin
                        </span>
                      </div>

                      {/* Simple Custom Progress Bar */}
                      <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(100, Math.max(0, stat.margin === 0 ? 0 : stat.margin < 0 ? Math.abs(stat.margin) * 2 : stat.margin))}%`,
                          background: stat.margin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                          opacity: 0.8
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>Trips/Manifests: {stat.tripsCount}</span>
                        <span>Net Profit: <strong style={{ color: stat.profit >= 0 ? 'var(--text-primary)' : 'var(--accent-danger)' }}>₹{stat.profit.toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lane Warnings Alert Block */}
              {lossMakingLanes.length > 0 && (
                <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-danger)', background: 'var(--accent-danger-glow)' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--accent-danger)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '6px' }}>
                        Critically Low/Loss-making Lanes Flagged
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        The following lanes are running below operational costs due to lack of backhauls or unoptimized routes:
                      </p>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {lossMakingLanes.map(lane => (
                          <li key={lane.lane}>
                            <strong>{lane.lane}:</strong> Net loss of ₹{Math.abs(lane.profit).toLocaleString('en-IN')} ({lane.margin}%)
                          </li>
                        ))}
                      </ul>
                      <p style={{ fontSize: '0.78rem', color: 'var(--accent-warning)', marginTop: '10px', fontWeight: '600' }}>
                        👉 Action: Check Client Portal to match bookings, or adjust contract rate metrics in Masters Config.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* LEVEL 1: BRANCH VIEW                                     */}
      {/* ──────────────────────────────────────────────────────── */}
      {selectedBranchId && !selectedTripId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Trips & Manifests in Branch */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} style={{ color: 'var(--brand)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Branch Profitability Logs</h3>
              </div>
              
              {/* Tab Filters */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                {['all', 'ftl', 'ptl'].map(tab => (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: activeTab === tab ? 'var(--brand)' : 'transparent',
                      color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search by ID, Truck, Driver, Lane..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: '0.82rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="started">Started</option>
                <option value="intransit">InTransit</option>
                <option value="dispatched">Dispatched</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {getFilteredItems(
                branchItems.filter(item => {
                  if (activeTab === 'ftl') return item.type === 'FTL';
                  if (activeTab === 'ptl') return item.type === 'PTL';
                  return true;
                })
              ).map(item => (
                <div key={item.id} onClick={() => setSelectedTripId(item.id)}
                  className="glass-panel-interactive"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'hsla(222,22%,12%,0.4)'
                  }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
                      {item.id} <span style={{ fontWeight: '500', fontSize: '0.72rem', color: 'var(--text-muted)' }}>({item.type})</span>
                    </span>
                    <span className={`badge ${item.status === 'InTransit' || item.status === 'Dispatched' ? 'badge-warning' : item.status === 'Started' ? 'badge-brand' : 'badge-success'}`}>
                      {item.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Truck: {item.truckNo} · Route: {item.lane}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '0.8rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Revenue</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>₹{item.revenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Expenses</span>
                      <span style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>₹{item.totalExpenses.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Net Profit</span>
                      <span style={{ color: item.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: '700' }}>
                        ₹{item.profit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {branchItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No trips or manifests recorded for this branch.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Branch Overview details & Loose Cargo status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Overview Card */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <Building2 size={16} style={{ color: 'var(--brand)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Branch Ledger Overview</h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>
                Summary of operations routed through <strong>{getBranchName(selectedBranchId)}</strong> branch. Includes FTL placement contracts and PTL hub manifest line-hauls.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'hsla(222,22%,12%,0.4)', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>FTL Trips Active:</span>
                  <span style={{ fontWeight: '600' }}>{branchItems.filter(i => i.type === 'FTL').length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'hsla(222,22%,12%,0.4)', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>PTL Manifests Running:</span>
                  <span style={{ fontWeight: '600' }}>{branchItems.filter(i => i.type === 'PTL').length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'hsla(222,22%,12%,0.4)', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Unmanifested LRs:</span>
                  <span style={{ fontWeight: '600', color: branchStandalone.length > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>{branchStandalone.length}</span>
                </div>
              </div>
            </div>

            {/* Standalone Loose LRs Listing */}
            {branchStandalone.length > 0 && (
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <FileText size={16} style={{ color: 'var(--accent-warning)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Loose Consignments (Unmanifested)</h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  These LRs have been booked at this branch but are not connected to a manifest or trip yet.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {branchStandalone.map(lr => (
                    <div key={lr.lrNo} onClick={() => { setSelectedLrNo(lr.lrNo); setSelectedTripId(null); }}
                      className="glass-panel-interactive"
                      style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--brand-light)' }}><GlossaryTooltip term="LR" glossary={GLOSSARY}>{lr.lrNo}</GlossaryTooltip></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lr.origin} ➔ {lr.destination}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: 'var(--accent-success)' }}>₹{lr.freightAmt?.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{lr.chargeWt} kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* LEVEL 2: TRIP / MANIFEST DETAIL VIEW                     */}
      {/* ──────────────────────────────────────────────────────── */}
      {selectedTripId && !selectedLrNo && selectedItem && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Detailed P&L statement */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>
                  {selectedItem.type === 'FTL' ? 'Trip P&L Statement' : 'Manifest P&L Statement'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Ref: {selectedItem.id} · Truck: {selectedItem.truckNo}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Profit</p>
                <p style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '800', 
                  color: selectedItem.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', 
                  fontFamily: 'var(--font-display)' 
                }}>
                  ₹{selectedItem.profit.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Trip Info Strip */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '10px', 
              background: 'hsla(222,22%,12%,0.4)', 
              padding: '12px 14px', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.8rem' 
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Driver</span>
                <span style={{ fontWeight: '600' }}><User size={10} style={{ display: 'inline', marginRight: '3px' }} />{selectedItem.driverName}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Distance</span>
                <span style={{ fontWeight: '600' }}><Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />{selectedItem.distance} km</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Profit / Km</span>
                <span style={{ fontWeight: '700', color: tripMarginPerKm >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  ₹{Math.round(tripMarginPerKm).toLocaleString('en-IN')} / km
                </span>
              </div>
            </div>

            {/* CSS-based Cost Breakdown stacked bar visualizer */}
            {selectedItem.totalExpenses > 0 && selectedExpTotals && (
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Operational Expense Allocation
                </p>
                {/* Stacked bar */}
                <div style={{ height: '14px', display: 'flex', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                  {selectedExpTotals.fuel > 0 && (
                    <div style={{ 
                      width: `${(selectedExpTotals.fuel / selectedItem.totalExpenses) * 100}%`, 
                      background: 'var(--brand)', 
                      title: 'Fuel' 
                    }} />
                  )}
                  {selectedExpTotals.toll > 0 && (
                    <div style={{ 
                      width: `${(selectedExpTotals.toll / selectedItem.totalExpenses) * 100}%`, 
                      background: 'var(--accent-cyan)', 
                      title: 'Tolls' 
                    }} />
                  )}
                  {selectedExpTotals.batta > 0 && (
                    <div style={{ 
                      width: `${(selectedExpTotals.batta / selectedItem.totalExpenses) * 100}%`, 
                      background: 'var(--accent-warning)', 
                      title: 'Driver Batta' 
                    }} />
                  )}
                  {selectedExpTotals.misc > 0 && (
                    <div style={{ 
                      width: `${(selectedExpTotals.misc / selectedItem.totalExpenses) * 100}%`, 
                      background: 'var(--accent-danger)', 
                      title: 'Misc' 
                    }} />
                  )}
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)' }} /> Fuel (₹{selectedExpTotals.fuel.toLocaleString()})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} /> Toll (₹{selectedExpTotals.toll.toLocaleString()})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-warning)' }} /> Batta (₹{selectedExpTotals.batta.toLocaleString()})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-danger)' }} /> Misc (₹{selectedExpTotals.misc.toLocaleString()})
                  </span>
                </div>
              </div>
            )}

            {/* Revenue breakdown */}
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Revenue Ledger</p>
              <div style={{ background: 'var(--accent-success-glow)', border: '1px solid hsla(152,72%,42%,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span>
                  {selectedItem.type === 'FTL' ? 'Contract Lorry Hire Freight' : 'Consolidated PTL Cargo Freight'}
                </span>
                <span style={{ color: 'var(--accent-success)', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                  + ₹{selectedItem.revenue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Expenses with interactive verification */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Expenses & Source Provenance</p>
                <button 
                  onClick={() => setShowAddExpense(!showAddExpense)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--brand-light)',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Plus size={12} /> Add Expense
                </button>
              </div>

              {/* Inline Add Expense Form */}
              {showAddExpense && (
                <form onSubmit={handleAddExpenseSubmit} style={{ 
                  background: 'hsla(222,22%,12%,0.8)', 
                  border: '1px solid var(--border-default)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px', 
                  marginBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Add Expense Entry</span>
                    <X size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAddExpense(false)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cost Type</label>
                      <select 
                        value={newExpType} 
                        onChange={(e) => setNewExpType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <option value="fuel">Fuel</option>
                        <option value="toll">Toll</option>
                        <option value="batta">Batta</option>
                        <option value="misc">Misc/Mamool</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Source Provenance</label>
                      <select 
                        value={newExpSource} 
                        onChange={(e) => setNewExpSource(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <option value="FASTag">FASTag</option>
                        <option value="ocr">OCR Scanner</option>
                        <option value="manual">Manual Cash</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Amount (₹)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 1500"
                        value={newExpAmount}
                        onChange={(e) => setNewExpAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                      <input 
                        type="checkbox" 
                        id="verifyInstant"
                        checked={newExpVerified}
                        onChange={(e) => setNewExpVerified(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="verifyInstant" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Verify Instantly</label>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    style={{
                      background: 'var(--brand)',
                      border: 'none',
                      color: '#fff',
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    Add Expense Record
                  </button>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedItem.expenses.map(exp => (
                  <div key={exp.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    background: 'hsla(222, 22%, 12%, 0.6)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-subtle)', 
                    fontSize: '0.85rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{exp.type} Cost</span>
                      
                      <span className={`badge ${exp.source === 'FASTag' ? 'badge-success' : exp.source === 'ocr' ? 'badge-warning' : 'badge-cyan'}`} style={{ fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 6px' }}>
                        {exp.source === 'FASTag' && <ShieldCheck size={9} />}
                        {exp.source === 'ocr' && <Eye size={9} />}
                        {exp.source}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-display)', fontWeight: '600' }}>
                        − ₹{exp.amount.toLocaleString('en-IN')}
                      </span>
                      
                      {exp.verified ? (
                        <span style={{ color: 'var(--accent-success)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                          <ShieldCheck size={13} /> Verified
                        </span>
                      ) : (
                        <button 
                          className="btn-primary" 
                          style={{ 
                            padding: '3px 8px', 
                            fontSize: '0.75rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '3px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            background: 'var(--brand)',
                            border: 'none',
                            color: '#fff'
                          }} 
                          onClick={() => handleVerifyExpense(selectedItem.id, exp.id, selectedItem.type === 'PTL')}
                        >
                          Verify →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {selectedItem.expenses.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No expenses reported on this trip yet.
                  </div>
                )}
              </div>
            </div>

            {/* Backhaul alert for lanes */}
            {selectedItem.profit < 0 && (
              <div className="alert alert-danger" style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Loss Alert:</strong> This trip generated negative returns. Optimize fuel drawdowns or plan immediate high-volume backhauls.
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Details on LRs mapped to this trip */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            {selectedItem.type === 'FTL' ? (
              // FTL LR list
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <FileText size={18} style={{ color: 'var(--brand)' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Connected FTL Consignment</h3>
                </div>
                
                {lrs.filter(l => l.lrNo === selectedItem.rawTrip.lorryReceiptNo || l.lrNo === 'LR-2026-001').map(lr => (
                  <div key={lr.lrNo} onClick={() => setSelectedLrNo(lr.lrNo)}
                    className="glass-panel-interactive"
                    style={{ padding: '16px', background: 'hsla(222,22%,12%,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--brand-light)' }}><GlossaryTooltip term="LR" glossary={GLOSSARY}>{lr.lrNo}</GlossaryTooltip></span>
                      <span className="badge badge-success">{lr.status}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                      <div><strong>Shipper:</strong> {lr.consignor}</div>
                      <div><strong>Consignee:</strong> {lr.consignee}</div>
                      <div><strong>Cargo:</strong> {lr.saidToContain || 'Auto spare parts'} · {lr.articles} boxes</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '10px', borderTop: '1px dashed var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Revenue (Freight):</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent-success)' }}>₹{lr.freightAmt?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // PTL LRs list with chargeable weight allocation
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Layers size={18} style={{ color: 'var(--brand)' }} />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}><GlossaryTooltip term="MANIFEST" glossary={GLOSSARY}>PTL Cost Allocations</GlossaryTooltip></h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Distributed across LRs by chargeable weight ratios.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedItem.assignedLrs.map(lr => {
                    const metrics = getLrMetrics(lr);
                    return (
                      <div key={lr.lrNo} onClick={() => setSelectedLrNo(lr.lrNo)}
                        className="glass-panel-interactive"
                        style={{ padding: '14px', background: 'hsla(222,22%,12%,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--brand-light)' }}><GlossaryTooltip term="LR" glossary={GLOSSARY}>{lr.lrNo}</GlossaryTooltip></span>
                          <span className={`badge ${metrics.profit >= 0 ? 'badge-success' : 'badge-danger'}`}>
                            {metrics.margin}% Profit
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Route: {lr.origin} ➔ {lr.destination} · <GlossaryTooltip term="CHARGEABLE_WEIGHT" glossary={GLOSSARY}>Charged Wt:</GlossaryTooltip> {lr.chargeWt} kg ({metrics.ratio}% share)
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', fontSize: '0.8rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Freight</span>
                            <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>₹{metrics.revenue.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Alloc. Cost</span>
                            <span style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>₹{metrics.expenses.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'block' }}>Profit</span>
                            <span style={{ color: metrics.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: '700' }}>
                              ₹{metrics.profit.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedItem.assignedLrs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No consignments linked to this manifest.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* LEVEL 3: LR (CONSIGNMENT) DETAIL VIEW                    */}
      {/* ──────────────────────────────────────────────────────── */}
      {selectedLrNo && selectedLr && lrMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: LR Profitability details */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Consignment Profitability</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  LR: {selectedLr.lrNo} · Date: {selectedLr.date}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Profit</p>
                <p style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '800', 
                  color: lrMetrics.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', 
                  fontFamily: 'var(--font-display)' 
                }}>
                  ₹{lrMetrics.profit.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Consignment Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ background: 'hsla(222,22%,12%,0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Consignor</span>
                <span style={{ fontWeight: '600' }}>{selectedLr.consignor}</span>
              </div>
              <div style={{ background: 'hsla(222,22%,12%,0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Consignee</span>
                <span style={{ fontWeight: '600' }}>{selectedLr.consignee}</span>
              </div>
              <div style={{ background: 'hsla(222,22%,12%,0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Origin ➔ Destination</span>
                <span style={{ fontWeight: '600' }}>{selectedLr.origin} ➔ {selectedLr.destination}</span>
              </div>
              <div style={{ background: 'hsla(222,22%,12%,0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  <GlossaryTooltip term="CHARGEABLE_WEIGHT" glossary={GLOSSARY}>Chargeable Weight</GlossaryTooltip>
                </span>
                <span style={{ fontWeight: '600' }}>{selectedLr.chargeWt} kg <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({selectedLr.actualWt} actual)</span></span>
              </div>
            </div>

            {/* Financial Rollup Breakdown */}
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Profitability Rollup
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gross Freight Revenue:</span>
                  <span style={{ fontWeight: '700', color: 'var(--accent-success)' }}>+ ₹{selectedLr.freightAmt?.toLocaleString('en-IN')}</span>
                </div>
                
                <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Allocated Cost Share:</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginLeft: '6px' }}>({lrMetrics.ratio}% weight ratio)</span>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--accent-danger)' }}>− ₹{lrMetrics.expenses.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-strong)' }}>
                  <span style={{ fontWeight: '700' }}>Net Profit Margin ({lrMetrics.margin}%):</span>
                  <span style={{ fontWeight: '800', color: lrMetrics.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    ₹{lrMetrics.profit.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Status Timeline & ePOD Document Mockup */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <FileText size={18} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Consignment Status & <GlossaryTooltip term="EPOD" glossary={GLOSSARY}>ePOD</GlossaryTooltip></h3>
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '22px', marginBottom: '24px' }}>
              {/* Vertical timeline line */}
              <div style={{ position: 'absolute', top: '8px', bottom: '8px', left: '7px', width: '2px', background: 'var(--border-subtle)' }} />

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)', boxShadow: '0 0 8px var(--brand)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block' }}>Booked</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Created on {selectedLr.date} at branch {selectedLr.bookingBranch}</span>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-20px', 
                  top: '4px', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: selectedLr.manifestId ? 'var(--brand)' : 'var(--text-muted)', 
                  boxShadow: selectedLr.manifestId ? '0 0 8px var(--brand)' : 'none' 
                }} />
                <span style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', color: selectedLr.manifestId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  Manifested
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {selectedLr.manifestId ? `Linked to Manifest ${selectedLr.manifestId}` : 'Awaiting Manifest assignments'}
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-20px', 
                  top: '4px', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: selectedLr.status === 'Delivered' ? 'var(--accent-success)' : 'var(--text-muted)', 
                  boxShadow: selectedLr.status === 'Delivered' ? '0 0 8px var(--accent-success)' : 'none' 
                }} />
                <span style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', color: selectedLr.status === 'Delivered' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  Delivered (<GlossaryTooltip term="EPOD" glossary={GLOSSARY}>ePOD Received</GlossaryTooltip>)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {selectedLr.status === 'Delivered' ? 'POD uploaded & verified successfully' : 'In transit to destination'}
                </span>
              </div>
            </div>

            {/* Document Details Block (e-way bill + ePOD Signature Mock) */}
            <div style={{ background: 'hsla(222,22%,12%,0.5)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>E-Way Bill Number</span>
                <span style={{ fontSize: '0.88rem', fontWeight: '600', fontFamily: 'monospace', color: 'var(--brand-light)' }}>
                  {selectedLr.ewayBill || '411029381029'}
                </span>
              </div>

              {selectedLr.status === 'Delivered' || selectedLr.physicalPodReceived ? (
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    ePOD Electronic Proof of Delivery
                  </span>
                  
                  {/* Signature Mock */}
                  <div style={{ 
                    border: '1px solid var(--border-subtle)', 
                    background: 'var(--bg-void)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '12px', 
                    textAlign: 'center',
                    marginBottom: '10px',
                    position: 'relative'
                  }}>
                    <span style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '0.62rem', color: 'var(--text-muted)' }}>Recipient Signature</span>
                    <span style={{ 
                      fontSize: '1.4rem', 
                      fontFamily: '"Caveat", cursive, Georgia, serif', 
                      color: 'var(--accent-info)',
                      letterSpacing: '0.05em',
                      fontStyle: 'italic',
                      lineHeight: '1.8'
                    }}>
                      Rajesh Sharma
                    </span>
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '6px' }}>
                      <CheckCircle size={10} /> Verified via Delivery OTP
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Received date: {selectedLr.date}</span>
                    <span>Status: <strong style={{ color: 'var(--accent-success)' }}>Completed</strong></span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <Clock size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', opacity: 0.5 }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Proof of Delivery (POD) Pending Dispatch End</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
