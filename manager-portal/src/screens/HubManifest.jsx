import React, { useState } from 'react';
import { Layers, Truck, CheckCircle, ShieldAlert, Sparkles, ArrowRight, Printer, X, FileText, Check, Navigation, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function HubManifest({ lrs, setLrs, manifests, setManifests, trucks, drivers, currentUser, branches }) {
  // --- Hub Context State ---
  const initialHub = currentUser?.branch || 'DEL';
  const [currentHub, setCurrentHub] = useState(initialHub);

  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'incoming', 'dispatched'

  // --- Builder States ---
  const [selectedLrs, setSelectedLrs] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState(trucks[1]?.regNo || '');
  const [selectedDriver, setSelectedDriver] = useState(drivers[1]?.id || '');
  const [destinationFilter, setDestinationFilter] = useState('All');
  const [successMsg, setSuccessMsg] = useState('');

  // --- Runsheet Modal State ---
  const [previewManifest, setPreviewManifest] = useState(null);

  // Auto-select defaults
  React.useEffect(() => {
    if (!selectedTruck && trucks.length > 0) {
      setSelectedTruck(trucks[0]?.regNo || '');
    }
  }, [trucks, selectedTruck]);

  React.useEffect(() => {
    if (!selectedDriver && drivers.length > 0) {
      setSelectedDriver(drivers[0]?.id || '');
    }
  }, [drivers, selectedDriver]);

  // Reset selected LRs when changing hub or filter
  React.useEffect(() => {
    setSelectedLrs([]);
  }, [currentHub, destinationFilter]);

  // --- Helpers for Hub names ---
  const getHubId = (name) => {
    if (!name) return 'DEL';
    const lower = name.toLowerCase();
    if (lower === 'del' || lower.includes('delhi')) return 'DEL';
    if (lower === 'bom' || lower.includes('mumbai')) return 'BOM';
    if (lower === 'blr' || lower.includes('bangalore')) return 'BLR';
    return name.toUpperCase();
  };

  const getHubName = (id) => {
    if (!id) return '';
    const upper = id.toUpperCase();
    if (upper === 'DEL') return 'Delhi';
    if (upper === 'BOM') return 'Mumbai';
    if (upper === 'BLR') return 'Bangalore';
    return id;
  };

  const getManifestDest = (m) => m.destHub || (m.lane ? m.lane.split(/[-➔→]/)[1]?.trim() : '');
  const getManifestOrigin = (m) => m.originHub || (m.lane ? m.lane.split(/[-➔→]/)[0]?.trim() : '');

  // --- Utility for updating LRs (persistence + state) ---
  const updateMultipleLrs = async (lrNos, updates) => {
    setLrs(prev => prev.map(l => lrNos.includes(l.lrNo || l.lr_no) ? { ...l, ...updates } : l));
    for (const lrNo of lrNos) {
      try {
        await api.updateLR(lrNo, updates);
      } catch (err) {
        console.error(`Failed to update LR ${lrNo}:`, err);
      }
    }
  };

  // --- Hub Stock Calculations ---
  // Any LR booked from anywhere (warehouse, friend's place, client site) ready for consolidation
  const localStock = lrs.filter(l => {
    if (l.manifestId || l.status === 'Delivered' || l.status === 'Billed' || l.status === 'Dispatched') return false;
    
    if (currentHub === 'ALL') return true;

    const loc = (l.currentLocation || l.bookingBranch || l.booking_branch || '').toUpperCase();
    const origHub = getHubId(l.origin);
    const branchHub = getHubId(l.bookingBranch || l.booking_branch);

    return loc === currentHub || origHub === currentHub || branchHub === currentHub || loc === '' || loc === 'DEL';
  });

  const filteredLrs = localStock.filter(l => {
    if (destinationFilter === 'All') return true;
    const destHub = getHubId(l.destination);
    return destHub === destinationFilter || l.destination?.toUpperCase().includes(destinationFilter);
  });

  // Incoming manifests destined for currentHub and not yet closed/offloaded
  const incomingManifests = manifests.filter(m => {
    const dest = getHubId(getManifestDest(m));
    if (currentHub === 'ALL') return m.status !== 'Closed' && m.status !== 'Offloaded';
    return dest === currentHub && m.status !== 'Closed' && m.status !== 'Offloaded';
  });

  // Dispatched from current hub
  const localDispatched = manifests.filter(m => {
    if (currentHub === 'ALL') return true;
    const orig = getHubId(getManifestOrigin(m));
    return orig === currentHub || !orig;
  });

  // Toggle LR selection
  const toggleLr = (lrNo) => setSelectedLrs(prev => prev.includes(lrNo) ? prev.filter(id => id !== lrNo) : [...prev, lrNo]);

  const getLrCft = (lr) => {
    if (!lr) return 0;
    if (lr.totalCft !== undefined && lr.totalCft !== null && Number(lr.totalCft) > 0) return Number(lr.totalCft);
    if (lr.total_cft !== undefined && lr.total_cft !== null && Number(lr.total_cft) > 0) return Number(lr.total_cft);
    const articles = Number(lr.articles || 0);
    const cftBox = Number(lr.cftPerBox || lr.cft_per_box || 5);
    return articles * cftBox;
  };

  // Handle Manifest Building (FR-4.2)
  const handleCreateManifest = (e) => {
    e.preventDefault();
    if (!selectedLrs.length) { alert('Select at least one LR.'); return; }

    const lrsData = lrs.filter(l => selectedLrs.includes(l.lrNo || l.lr_no));
    
    // Auto-detect destination corridor if destinationFilter is 'All'
    let targetDest = destinationFilter;
    if (targetDest === 'All' && lrsData.length > 0) {
      targetDest = getHubId(lrsData[0]?.destination) || 'BOM';
    }
    if (targetDest === 'All') targetDest = 'BOM';

    const id = `MNF-2026-0${manifests.length + 1}`;
    const driverObj = drivers.find(d => d.id === selectedDriver);
    const totalWt   = lrsData.reduce((s, l) => s + Number(l.chargeWt || l.charge_wt || 0), 0);
    const totalFrt  = lrsData.reduce((s, l) => s + Number(l.freightAmt || l.freight_amt || 0), 0);
    const totalCft  = lrsData.reduce((s, l) => s + getLrCft(l), 0);

    const effectiveOrigin = currentHub === 'ALL' ? 'DEL' : currentHub;

    const newManifest = {
      id,
      originHub: effectiveOrigin,
      destHub: targetDest,
      lane: `${getHubName(effectiveOrigin)} ➔ ${getHubName(targetDest)}`,
      vehicleNo: selectedTruck,
      driverName: driverObj?.name || 'Unknown',
      driverPhone: driverObj?.phone || '9876543210',
      status: 'Dispatched',
      date: new Date().toISOString().split('T')[0],
      lrCount: selectedLrs.length,
      totalWeight: totalWt,
      totalFreight: totalFrt,
      totalCft,
      lrNos: [...selectedLrs]
    };

    api.createManifest(newManifest)
      .then(saved => {
        setManifests(prev => [saved, ...prev]);
        updateMultipleLrs(selectedLrs, { manifestId: id, status: 'Manifested' });
        setSuccessMsg(`✓ Manifest ${id} created and dispatched! Loaded ${selectedLrs.length} consignments (${totalWt.toLocaleString()} kg · ${totalCft} CFT) into truck ${selectedTruck}.`);
        setSelectedLrs([]);
        setTimeout(() => setSuccessMsg(''), 6000);
      })
      .catch(err => alert(`Failed to build manifest: ${err.message}`));
  };

  // --- Manifest Actions (FR-4.4 / FR-4.1) ---
  const handleUpdateStatus = (manifestId, nextStatus) => {
    api.updateManifest(manifestId, { status: nextStatus })
      .then(saved => {
        setManifests(prev => prev.map(m => m.id === manifestId ? saved : m));
        setSuccessMsg(`Manifest ${manifestId} updated to status: ${nextStatus}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch(err => alert(`Failed to update manifest status: ${err.message}`));
  };

  const handleOffload = async (manifest) => {
    const manifestLrs = lrs.filter(l => manifest.lrNos?.includes(l.lrNo) || l.manifestId === manifest.id);
    
    // Update manifest status
    try {
      const saved = await api.updateManifest(manifest.id, { status: 'Closed' });
      setManifests(prev => prev.map(m => m.id === manifest.id ? saved : m));
    } catch (err) {
      console.error(`Failed to update manifest status on offload:`, err);
    }

    // Process each LR
    for (const lr of manifestLrs) {
      const isFinalDest = getHubId(lr.destination) === currentHub;
      const updates = {
        manifestId: null,
        currentLocation: currentHub,
        status: isFinalDest ? 'AtHub' : 'Crossing' // If final, AtHub for local delivery. If not, Crossing (transshipment)
      };
      
      // Local state and API update
      setLrs(prev => prev.map(l => l.lrNo === lr.lrNo ? { ...l, ...updates } : l));
      try {
        await api.updateLR(lr.lrNo, updates);
      } catch (err) {
        console.error(`Failed to update LR ${lr.lrNo} on offload:`, err);
      }
    }

    setSuccessMsg(`Offloaded Manifest ${manifest.id}! ${manifestLrs.length} LRs received in ${getHubName(currentHub)} stock (transshipments routed).`);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // --- Running Totals for Selected Cargo ---
  const selectedData    = lrs.filter(l => selectedLrs.includes(l.lrNo || l.lr_no));
  const currentWt       = selectedData.reduce((s, l) => s + Number(l.chargeWt || l.charge_wt || 0), 0);
  const currentFrt      = selectedData.reduce((s, l) => s + Number(l.freightAmt || l.freight_amt || 0), 0);
  const currentBoxes    = selectedData.reduce((s, l) => s + Number(l.articles || 0), 0);
  const currentCft      = selectedData.reduce((s, l) => s + (Number(l.articles || 0) * 5), 0); // 5 CFT per box

  const activeTruckObj  = trucks.find(t => t.regNo === selectedTruck);
  const truckLimit      = activeTruckObj?.capacityKg || 20000;
  const truckMaxBoxes   = activeTruckObj?.maxBoxes || 180;
  const truckCft        = activeTruckObj?.cft || 900;
  const truckBodyType   = activeTruckObj?.bodyType || 'Container';
  const truckSize       = activeTruckObj?.size || '19 Ft';

  // Extract numeric truck feet length (e.g. "14 Ft" -> 14, "24 Ft" -> 24, "32 Ft MX" -> 32)
  const truckFeetNum    = parseInt(truckSize.match(/\d+/)?.[0] || Math.round(truckCft / 50) || '19', 10);
  const occupiedFeet    = Number(((currentCft / (truckCft || 1)) * truckFeetNum).toFixed(1));

  const utilPct         = Math.round((currentWt / truckLimit) * 100);
  const boxUtilPct      = Math.round((currentBoxes / truckMaxBoxes) * 100);
  const cftUtilPct      = Math.round((currentCft / truckCft) * 100);
  
  const remainingSpacePct = Math.max(0, 100 - boxUtilPct);
  const remainingBoxes  = Math.max(0, truckMaxBoxes - currentBoxes);

  const isOverloaded    = utilPct > 100 || boxUtilPct > 100 || cftUtilPct > 100;

  // Group selected LRs by origin warehouse
  const originLoads = {};
  selectedData.forEach(lr => {
    const origin = lr.origin || lr.bookingBranch || 'Unknown';
    originLoads[origin] = (originLoads[origin] || 0) + lr.articles;
  });

  const originSegments = Object.entries(originLoads).map(([name, boxes]) => {
    const pct = (boxes / truckMaxBoxes) * 100;
    return { name, boxes, pct };
  });

  const ORIGIN_COLORS = [
    'hsl(210, 90%, 62%)',  // Blue/Cyan
    'hsl(152, 72%, 48%)',  // Green/Emerald
    'hsl(35, 95%, 55%)',   // Saffron/Orange
    'hsl(262, 75%, 68%)',  // Violet
    'hsl(188, 80%, 58%)',  // Cyan
    'hsl(328, 80%, 55%)'   // Pink
  ];

  const getOriginColor = (name, index) => {
    const lower = name.toLowerCase();
    if (lower.includes('del') || lower.includes('delhi')) return 'var(--accent-info)';
    if (lower.includes('bom') || lower.includes('mumbai')) return 'var(--accent-success)';
    if (lower.includes('blr') || lower.includes('bangalore')) return 'var(--brand)';
    return ORIGIN_COLORS[index % ORIGIN_COLORS.length];
  };

  const loadedAtDifferentWarehouses = Object.keys(originLoads).length > 1;

  // Render SVG Truck Load Visualization
  const renderTruckSVG = () => {
    const cargoWidth = 260; // width of the cargo container inside the SVG
    const startX = 20;      // start X coordinates of the cargo container
    const yVal = 20;        // y coordinate of cargo container
    const hVal = 60;        // height of cargo container

    let currentX = startX;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '16px 0' }}>
        <svg width="100%" height="130" viewBox="0 0 400 130" style={{ maxWidth: '380px', overflow: 'visible' }}>
          <defs>
            <linearGradient id="metallicGloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.15" />
              <stop offset="50%" stopColor="white" stopOpacity="0.0" />
              <stop offset="100%" stopColor="black" stopOpacity="0.25" />
            </linearGradient>
            
            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--border-default)" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Rear Wheels */}
          <circle cx="70" cy="98" r="14" fill="#0d1117" stroke="var(--border-strong)" strokeWidth="2.5" />
          <circle cx="70" cy="98" r="5" fill="var(--text-muted)" />
          <circle cx="100" cy="98" r="14" fill="#0d1117" stroke="var(--border-strong)" strokeWidth="2.5" />
          <circle cx="100" cy="98" r="5" fill="var(--text-muted)" />

          <circle cx="210" cy="98" r="14" fill="#0d1117" stroke="var(--border-strong)" strokeWidth="2.5" />
          <circle cx="210" cy="98" r="5" fill="var(--text-muted)" />
          <circle cx="240" cy="98" r="14" fill="#0d1117" stroke="var(--border-strong)" strokeWidth="2.5" />
          <circle cx="240" cy="98" r="5" fill="var(--text-muted)" />

          {/* Front Wheel */}
          <circle cx="340" cy="98" r="14" fill="#0d1117" stroke="var(--border-strong)" strokeWidth="2.5" />
          <circle cx="340" cy="98" r="5" fill="var(--text-muted)" />

          {/* Chassis */}
          <rect x="50" y="88" width="310" height="6" fill="#1f2937" rx="3" />

          {/* Cargo Container Background */}
          <rect x={startX} y={yVal} width={cargoWidth} height={hVal} 
            fill="url(#diagonalHatch)" 
            stroke={isOverloaded ? 'var(--accent-danger)' : 'var(--border-default)'} 
            strokeWidth="2.5" 
            strokeDasharray={isOverloaded ? 'none' : '4 3'} 
            rx="5"
          />

          {/* Cargo segments */}
          {originSegments.map((seg, idx) => {
            const segWidth = (seg.pct / 100) * cargoWidth;
            const renderWidth = Math.min(segWidth, startX + cargoWidth - currentX);
            if (renderWidth <= 0) return null;
            
            const fillCol = getOriginColor(seg.name, idx);
            const xCoord = currentX;
            currentX += renderWidth;
            
            return (
              <g key={seg.name}>
                <rect x={xCoord} y={yVal} width={renderWidth} height={hVal} 
                  fill={fillCol} 
                  stroke="var(--bg-void)" 
                  strokeWidth="1.5"
                  rx="3" 
                />
                <rect x={xCoord} y={yVal} width={renderWidth} height={hVal} fill="url(#metallicGloss)" rx="3" />
                {renderWidth > 32 && (
                  <text x={xCoord + renderWidth / 2} y={yVal + hVal / 2 + 4} 
                    fill="var(--text-inverse)" 
                    fontSize="10" 
                    fontWeight="800" 
                    fontFamily="var(--font-display)"
                    textAnchor="middle"
                  >
                    {seg.name.substring(0, 3).toUpperCase()}
                  </text>
                )}
              </g>
            );
          })}

          {/* Truck Cab */}
          <path d="M 280 88 L 365 88 L 365 65 L 350 45 L 305 45 L 305 32 L 280 32 Z" 
            fill="hsla(222, 15%, 20%, 0.85)" 
            stroke="var(--border-strong)" 
            strokeWidth="2.5" 
          />
          <path d="M 325 48 L 347 48 L 358 63 L 325 63 Z" fill="var(--bg-void)" stroke="var(--border-strong)" strokeWidth="1.5" />
          <path d="M 325 48 L 347 48 L 358 63 L 325 63 Z" fill="var(--accent-cyan)" fillOpacity="0.18" />

          <rect x="290" y="48" width="30" height="18" fill="var(--bg-void)" stroke="var(--border-subtle)" rx="2" />
          <rect x="290" y="48" width="30" height="18" fill="var(--accent-cyan)" fillOpacity="0.1" rx="2" />

          <rect x="355" y="78" width="12" height="10" fill="#374151" rx="2" />
          <circle cx="361" cy="83" r="3" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }} />
        </svg>

        {/* Legend */}
        {selectedData.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', width: '100%' }}>
            {originSegments.map((seg, idx) => (
              <div key={seg.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: getOriginColor(seg.name, idx) }} />
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{seg.name}:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{seg.boxes} boxes ({Math.round(seg.pct)}%)</span>
              </div>
            ))}
            {remainingSpacePct > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', border: '1.5px dashed var(--border-default)', background: 'transparent' }} />
                <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Remaining Space:</span>
                <span style={{ color: 'var(--accent-success)', fontWeight: '700' }}>{remainingBoxes} boxes ({remainingSpacePct}%)</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ padding: '28px' }}>
      
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2 className="page-title">Hub Consolidation & Manifest Builder</h2>
          <p className="page-subtitle">Consolidate loose cargo · Manage transshipments · Settle incoming vehicles</p>
        </div>
        
        {/* Hub Context Selector */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Current Operations Node:</span>
          <select 
            value={currentHub} 
            onChange={(e) => setCurrentHub(e.target.value)} 
            className="input-premium"
            style={{ width: '190px', padding: '6px 12px', fontSize: '0.85rem' }}
          >
            {branches.filter(b => b.id !== 'HO').map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
            ))}
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '24px' }}>
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {/* OPERATIONAL NAVIGATION TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: '24px', gap: '8px' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`toggle-btn ${activeTab === 'pending' ? 'active' : ''}`}
          style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: activeTab === 'pending' ? '2px solid var(--brand)' : 'none', borderRadius: '0' }}
        >
          <Layers size={15} />
          Pending Outbound Stock ({localStock.length})
        </button>
        <button 
          onClick={() => setActiveTab('incoming')}
          className={`toggle-btn ${activeTab === 'incoming' ? 'active' : ''}`}
          style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: activeTab === 'incoming' ? '2px solid var(--brand)' : 'none', borderRadius: '0' }}
        >
          <ArrowDownToLine size={15} />
          Incoming Vehicles ({incomingManifests.length})
        </button>
        <button 
          onClick={() => setActiveTab('dispatched')}
          className={`toggle-btn ${activeTab === 'dispatched' ? 'active' : ''}`}
          style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: activeTab === 'dispatched' ? '2px solid var(--brand)' : 'none', borderRadius: '0' }}
        >
          <Navigation size={15} />
          Dispatched from Hub ({localDispatched.length})
        </button>
      </div>

      {/* TAB 1: PENDING OUTBOUND STOCK & MANIFEST BUILDER */}
      {activeTab === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Panel: Hub Stock Register */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div className="section-header">
              <h3 className="section-title">
                <Layers size={16} style={{ color: 'var(--brand)' }} />
                Pending Outbound Cargo Stock ({filteredLrs.length} LRs)
              </h3>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  className={`toggle-btn ${destinationFilter === 'All' ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                  onClick={() => setDestinationFilter('All')}
                >
                  All Destinations
                </button>
                {['DEL', 'BOM', 'BLR'].filter(id => id !== currentHub).map(id => (
                  <button key={id}
                    className={`toggle-btn ${destinationFilter === id ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    onClick={() => setDestinationFilter(id)}
                  >
                    To {getHubName(id)}
                  </button>
                ))}
              </div>
            </div>

            {filteredLrs.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <Layers size={36} style={{ opacity: 0.25, color: 'var(--brand)', marginBottom: '10px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>No pending cargo matching this filter at {getHubName(currentHub)} Hub.</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Book new cargo or wait for incoming transshipments to arrive.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredLrs.map(lr => {
                  const sel = selectedLrs.includes(lr.lrNo);
                  return (
                    <div key={lr.lrNo} onClick={() => toggleLr(lr.lrNo)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${sel ? 'hsla(35, 95%, 55%, 0.5)' : 'var(--border-subtle)'}`,
                        background: sel ? 'hsla(35, 95%, 55%, 0.08)' : 'hsla(222, 22%, 12%, 0.5)',
                        cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'var(--t-base)',
                      }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: sel ? 'var(--brand-light)' : 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>{lr.lrNo}</span>
                          <span className={`badge ${lr.freightTerms === 'To-Pay' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.62rem' }}>{lr.freightTerms}</span>
                          {lr.status === 'Crossing' && (
                            <span className="badge badge-brand animate-pulse" style={{ fontSize: '0.62rem', background: 'var(--accent-violet-glow)', color: 'var(--accent-violet)', border: '1px solid var(--accent-violet)' }}>Transshipment</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {lr.consignor} <ArrowRight size={10} style={{ verticalAlign: 'middle' }} /> {lr.consignee}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Dest: {lr.destination} · Mark: {lr.privateMark}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: '700', fontSize: '0.9rem', fontFamily: 'var(--font-display)' }}>{lr.chargeWt?.toLocaleString()} kg</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lr.articles} Pkgs ({getLrCft(lr)} CFT · {lr.boxSizeType || 'Std'})</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Manifest Builder */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div className="section-header" style={{ marginBottom: '18px' }}>
              <h3 className="section-title">
                <Truck size={16} style={{ color: 'var(--brand)' }} />
                Line-Haul Manifest Builder
              </h3>
            </div>

            <form onSubmit={handleCreateManifest} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Selected LRs chip pool */}
              <div>
                <label className="label-premium">Selected Cargo LRs ({selectedLrs.length})</label>
                <div style={{ padding: '12px', background: 'hsla(222, 24%, 10%, 0.6)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', minHeight: '56px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start' }}>
                  {selectedLrs.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', alignSelf: 'center' }}>← Select LRs from the left stock panel…</span>
                  ) : selectedLrs.map(lrNo => (
                    <span key={lrNo} className="badge badge-brand"
                      style={{ cursor: 'pointer', padding: '5px 10px', fontSize: '0.72rem' }}
                      onClick={() => toggleLr(lrNo)}>
                      {lrNo} ×
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="label-premium">Line-Haul Truck</label>
                  <select className="input-premium" value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)}>
                    {trucks.map(t => <option key={t.regNo} value={t.regNo}>{t.regNo} ({t.capacityKg?.toLocaleString()} kg · {t.cft || 900} CFT)</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-premium">Assign Driver</label>
                  <select className="input-premium" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Destination Warning when filter is set to "All" */}
              {destinationFilter === 'All' && selectedLrs.length > 0 && (
                <div className="alert alert-warning" style={{ padding: '10px 14px', fontSize: '0.8rem' }}>
                  <ShieldAlert size={15} />
                  <span>Choose a specific corridor filter (e.g. <strong>To Mumbai</strong>) to set the truck route.</span>
                </div>
              )}

              {/* Capacity Gauge Panel */}
              <div style={{ background: 'hsla(222, 24%, 10%, 0.7)', padding: '16px', borderRadius: 'var(--radius-md)', border: `1px solid ${isOverloaded ? 'hsla(4, 86%, 58%, 0.3)' : 'var(--border-subtle)'}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--brand-light)', fontWeight: '600' }}>
                    {truckBodyType} · {truckSize}
                  </span>
                  {loadedAtDifferentWarehouses && (
                    <span className="badge badge-brand animate-pulse" style={{ fontSize: '0.65rem', padding: '3px 8px', letterSpacing: '0.03em' }}>
                      Multi-Warehouse Consolidated
                    </span>
                  )}
                </div>
                
                <div className="divider" style={{ margin: '0' }} />

                {/* Weight Utilization */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cargo Weight Capacity</span>
                  <span style={{ fontWeight: '700', fontFamily: 'var(--font-display)' }}>{currentWt.toLocaleString()} kg / {truckLimit.toLocaleString()} kg</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(utilPct, 100)}%`,
                    background: utilPct > 100 ? 'var(--accent-danger)' : undefined,
                    boxShadow: utilPct > 100 ? 'var(--shadow-danger)' : undefined,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Weight Loading</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: utilPct > 100 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {utilPct}%{utilPct > 100 ? ' ⚠ Overloaded' : ' loaded'}
                  </span>
                </div>

                <div className="divider" style={{ margin: '2px 0' }} />

                {/* Volumetric (Feet Length & CFT) Utilization (FR-4.3) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Truck Deck Space (Feet)</span>
                  <span style={{ fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                    {occupiedFeet} Ft / {truckFeetNum} Ft <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '500' }}>({currentCft.toLocaleString()} / {truckCft.toLocaleString()} CFT)</span>
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(cftUtilPct, 100)}%`,
                    background: cftUtilPct > 100 ? 'var(--accent-danger)' : 'linear-gradient(90deg, var(--accent-info), var(--accent-cyan))',
                    boxShadow: cftUtilPct > 100 ? 'var(--shadow-danger)' : undefined,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Volume Loading (Feet)</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: cftUtilPct > 100 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {cftUtilPct}%{cftUtilPct > 100 ? ` ⚠ Cube Out (${(occupiedFeet - truckFeetNum).toFixed(1)} Ft over truck length)` : ' length filled'}
                  </span>
                </div>

                <div className="divider" style={{ margin: '2px 0' }} />

                {/* Box/Count Utilization */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Luggage Article Counts</span>
                  <span style={{ fontWeight: '700', fontFamily: 'var(--font-display)' }}>{currentBoxes} / {truckMaxBoxes} Boxes</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(boxUtilPct, 100)}%`,
                    background: boxUtilPct > 100 ? 'var(--accent-danger)' : 'linear-gradient(90deg, var(--brand), var(--brand-light))',
                    boxShadow: boxUtilPct > 100 ? 'var(--shadow-danger)' : undefined,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Space Remaining</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: boxUtilPct > 100 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {boxUtilPct > 100 ? 'Space Full' : `${remainingSpacePct}% (${remainingBoxes} boxes left)`}
                  </span>
                </div>

                {/* SVG Visual Truck Loader */}
                {renderTruckSVG()}

                {isOverloaded && (
                  <div className="alert alert-danger" style={{ padding: '8px 12px', marginTop: '4px' }}>
                    <ShieldAlert size={14} /> 
                    {utilPct > 100 ? 'Weight limit exceeded!' : cftUtilPct > 100 ? `Truck length cubed out (${occupiedFeet} Ft / ${truckFeetNum} Ft occupied)!` : 'Box count limit exceeded!'}
                  </div>
                )}

                <div className="divider" style={{ margin: '0' }} />

                {/* PTL Consignor / Consignee Consolidation Summary */}
                {selectedData.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', background: 'hsla(210, 90%, 55%, 0.1)', padding: '7px 12px', borderRadius: '6px', border: '1px solid hsla(210, 90%, 55%, 0.25)' }}>
                    <span style={{ color: 'var(--accent-info)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={13} /> PTL Multi-Client Load
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                      {new Set(selectedData.map(l => l.consignor)).size} Consignors · {new Set(selectedData.map(l => l.consignee)).size} Consignees
                    </span>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Consolidated Manifest Freight</span>
                  <span style={{ fontWeight: '700', color: 'var(--accent-success)', fontFamily: 'var(--font-display)' }}>₹{currentFrt.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={selectedLrs.length === 0}
                style={{ justifyContent: 'center', padding: '13px', fontSize: '0.9rem', opacity: selectedLrs.length === 0 ? 0.5 : 1, cursor: selectedLrs.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                <Sparkles size={17} />
                Build & Dispatch Manifest (WhatsApp Alerts)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: INCOMING VEHICLES (IN-TRANSIT EN ROUTE TO CURRENT HUB) */}
      {activeTab === 'incoming' && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>
            <ArrowDownToLine size={16} style={{ color: 'var(--brand)' }} /> Inbound Vehicles Scheduled to Arrive at {getHubName(currentHub)} Hub
          </h3>

          {incomingManifests.length === 0 ? (
            <div className="empty-state" style={{ padding: '50px' }}>
              <Truck size={42} style={{ opacity: 0.25, color: 'var(--brand)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No incoming line-haul trucks scheduled to arrive at this hub.</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Dispatch trucks from other nodes to see them here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {incomingManifests.map(m => {
                const isArrived = m.status === 'Arrived';
                const isTransit = m.status === 'InTransit';
                return (
                  <div key={m.id} className="glass-panel" style={{ padding: '16px', background: 'hsla(222, 22%, 12%, 0.65)', border: isArrived ? '1px solid var(--accent-success)' : '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span 
                        onClick={() => setPreviewManifest(m)}
                        style={{ fontWeight: '700', color: 'var(--brand-light)', fontFamily: 'var(--font-display)', cursor: 'pointer', borderBottom: '1px dashed var(--brand)' }}
                      >
                        {m.id}
                      </span>
                      <span className={`badge ${isArrived ? 'badge-success' : 'badge-brand'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        {m.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      <p><strong>Route:</strong> {m.lane}</p>
                      <p style={{ marginTop: '2px' }}><strong>Vehicle:</strong> {m.vehicleNo}</p>
                      <p style={{ marginTop: '2px' }}><strong>Driver:</strong> {m.driverName} ({m.driverPhone})</p>
                      <p style={{ marginTop: '2px' }}><strong>Consignment:</strong> {m.lrCount} LRs ({m.totalWeight?.toLocaleString()} kg)</p>
                    </div>

                    <div className="divider" style={{ margin: '4px 0' }} />

                    {/* Operational Action workflow triggers */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {m.status === 'Dispatched' && (
                        <button 
                          onClick={() => handleUpdateStatus(m.id, 'InTransit')}
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.78rem', flex: 1, justifyContent: 'center' }}
                        >
                          <Navigation size={13} /> Set In-Transit
                        </button>
                      )}
                      {(m.status === 'Dispatched' || isTransit) && (
                        <button 
                          onClick={() => handleUpdateStatus(m.id, 'Arrived')}
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.78rem', flex: 1, justifyContent: 'center', background: 'var(--accent-success-glow)', color: 'var(--accent-success)', border: '1px solid var(--accent-success)' }}
                        >
                          <Check size={13} /> Mark Arrived
                        </button>
                      )}
                      {isArrived && (
                        <button 
                          onClick={() => handleOffload(m)}
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.78rem', flex: 1, justifyContent: 'center', background: 'linear-gradient(90deg, var(--brand-deep), var(--brand))' }}
                        >
                          <ArrowDownToLine size={13} /> Offload & Settle Cargo
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setPreviewManifest(m)}
                        className="toggle-btn" 
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        <Printer size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISPATCHED / LOGS FOR THE CURRENT HUB */}
      {activeTab === 'dispatched' && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>
            <Navigation size={16} style={{ color: 'var(--brand)' }} /> Manifest Dispatch Registry for {getHubName(currentHub)} Hub
          </h3>

          {localDispatched.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Layers size={36} style={{ opacity: 0.25, color: 'var(--brand)', marginBottom: '10px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No manifests built or dispatched from this location yet.</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Build manifests in the Outbound Stock tab.</p>
            </div>
          ) : (
            <table className="table-premium">
              <thead>
                <tr>
                  {['Manifest ID', 'Lane Route', 'Vehicle Reg No', 'Driver Info', 'Cargo LRs', 'Total Weight', 'Est. Volume', 'Status', 'Print / View'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {localDispatched.map(m => {
                  const trkObj = trucks.find(t => t.regNo === m.vehicleNo);
                  const wtUtil = trkObj ? Math.round((m.totalWeight / trkObj.capacityKg) * 100) : 0;
                  return (
                    <tr key={m.id}>
                      <td 
                        style={{ fontWeight: '700', color: 'var(--brand-light)', fontFamily: 'var(--font-display)', cursor: 'pointer' }}
                        onClick={() => setPreviewManifest(m)}
                      >
                        {m.id}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.lane}</td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600' }}>{m.vehicleNo}</div>
                          {trkObj && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {trkObj.bodyType} · {wtUtil}% wt loaded
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{m.driverName}</td>
                      <td><span className="badge badge-muted">{m.lrCount} LRs</span></td>
                      <td style={{ fontFamily: 'var(--font-display)' }}>{m.totalWeight?.toLocaleString()} kg</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{m.totalCft || (m.lrCount * 150)} CFT</td>
                      <td>
                        <span className={`badge ${m.status === 'Closed' ? 'badge-muted' : m.status === 'Arrived' ? 'badge-success' : 'badge-brand'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => setPreviewManifest(m)}
                          className="btn-primary" 
                          style={{ padding: '4px 10px', fontSize: '0.72rem', gap: '4px', background: 'hsla(222, 25%, 35%, 0.2)', border: '1px solid var(--border-default)' }}
                        >
                          <Printer size={12} /> Runsheet
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- PRINT RUNSHEET POP-UP MODAL (FR-4.5) --- */}
      {previewManifest && (
        <div 
          onClick={() => setPreviewManifest(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="animate-scale-up" 
            style={{
              width: '100%', maxWidth: '880px', maxHeight: '90vh',
              background: '#ffffff', color: '#111827',
              borderRadius: '16px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              overflow: 'hidden', position: 'relative'
            }}
          >
            {/* Sticky Header with Close & Print */}
            <div className="no-print" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              position: 'sticky', top: 0, zIndex: 10
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: '#2563eb' }} /> Runsheet Preview & Dispatch Manifest
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="btn-primary" 
                  style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '7px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                >
                  <Printer size={15} /> Print Runsheet
                </button>
                <button 
                  type="button"
                  onClick={() => setPreviewManifest(null)}
                  style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '7px 16px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                >
                  <X size={16} /> Close Preview
                </button>
              </div>
            </div>

            {/* Scrollable Printable Content Area */}
            <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
              <div id="manifest-printable-area" style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'monospace' }}>
                {/* Runsheet Title */}
                <div style={{ borderBottom: '3px double #111827', paddingBottom: '12px', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>LogiSync Consolidation Runsheet</h2>
                  <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '3px' }}>Line-Haul Consolidated Cargo Manifest & Transshipment Gatepass</p>
                </div>

                {/* Manifest Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '0.85rem', background: '#f9fafb', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div>
                    <p><strong>Manifest ID:</strong> {previewManifest.id}</p>
                    <p style={{ marginTop: '4px' }}><strong>Date:</strong> {previewManifest.date}</p>
                    <p style={{ marginTop: '4px' }}><strong>Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: '700', color: '#2563eb' }}>{previewManifest.status}</span></p>
                  </div>
                  <div>
                    <p><strong>Origin Hub:</strong> {getHubName(getManifestOrigin(previewManifest))} ({getManifestOrigin(previewManifest)})</p>
                    <p style={{ marginTop: '4px' }}><strong>Destination:</strong> {getHubName(getManifestDest(previewManifest))} ({getManifestDest(previewManifest)})</p>
                    <p style={{ marginTop: '4px' }}><strong>Corridor:</strong> {previewManifest.lane}</p>
                  </div>
                  <div>
                    <p><strong>Vehicle:</strong> {previewManifest.vehicleNo}</p>
                    <p style={{ marginTop: '4px' }}><strong>Driver Name:</strong> {previewManifest.driverName}</p>
                    <p style={{ marginTop: '4px' }}><strong>Driver Phone:</strong> {previewManifest.driverPhone}</p>
                  </div>
                </div>

                {/* Loaded Consignments Table */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: '800', marginBottom: '8px', borderBottom: '1px solid #111827' }}>Consolidated Lorry Receipts (LR List)</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #111827' }}>
                        <th style={{ padding: '6px 4px' }}>LR No</th>
                        <th style={{ padding: '6px 4px' }}>Consignor</th>
                        <th style={{ padding: '6px 4px' }}>Consignee</th>
                        <th style={{ padding: '6px 4px' }}>Dest</th>
                        <th style={{ padding: '6px 4px' }}>Pkgs</th>
                        <th style={{ padding: '6px 4px' }}>Wt (kg)</th>
                        <th style={{ padding: '6px 4px' }}>Private Mark</th>
                        <th style={{ padding: '6px 4px' }}>Terms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lrs.filter(l => previewManifest.lrNos?.includes(l.lrNo || l.lr_no) || l.manifestId === previewManifest.id).map(lr => (
                        <tr key={lr.lrNo || lr.lr_no} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px 4px', fontWeight: '700' }}>{lr.lrNo || lr.lr_no}</td>
                          <td style={{ padding: '8px 4px' }}>{lr.consignor?.substring(0, 18)}</td>
                          <td style={{ padding: '8px 4px' }}>{lr.consignee?.substring(0, 18)}</td>
                          <td style={{ padding: '8px 4px' }}>{lr.destination}</td>
                          <td style={{ padding: '8px 4px' }}>{lr.articles}</td>
                          <td style={{ padding: '8px 4px' }}>{(lr.chargeWt || lr.charge_wt)?.toLocaleString()}</td>
                          <td style={{ padding: '8px 4px' }}><code>{lr.privateMark || lr.private_mark || 'N/A'}</code></td>
                          <td style={{ padding: '8px 4px' }}>{lr.freightTerms || lr.freight_terms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cargo Totals Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', borderTop: '2px solid #111827', paddingTop: '10px', fontSize: '0.85rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#4b5563', fontSize: '0.75rem' }}>Total LRs</p>
                    <p style={{ fontSize: '1.15rem', fontWeight: '800' }}>{previewManifest.lrCount}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#4b5563', fontSize: '0.75rem' }}>Total Articles</p>
                    <p style={{ fontSize: '1.15rem', fontWeight: '800' }}>
                      {lrs.filter(l => previewManifest.lrNos?.includes(l.lrNo || l.lr_no) || l.manifestId === previewManifest.id).reduce((s, l) => s + (l.articles || 0), 0)} boxes
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#4b5563', fontSize: '0.75rem' }}>Total Weight</p>
                    <p style={{ fontSize: '1.15rem', fontWeight: '800' }}>{previewManifest.totalWeight?.toLocaleString()} kg</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#4b5563', fontSize: '0.75rem' }}>Consolidated Revenue</p>
                    <p style={{ fontSize: '1.15rem', fontWeight: '800', color: '#059669' }}>₹{previewManifest.totalFreight?.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div style={{ height: '25px' }} />

                {/* Print layout signature lines */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', fontSize: '0.85rem', marginTop: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #111827', width: '80%', margin: '0 auto', paddingTop: '5px' }}>
                      <strong>Driver Signature</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #111827', width: '80%', margin: '0 auto', paddingTop: '5px' }}>
                      <strong>Dispatch Supervisor</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #111827', width: '80%', margin: '0 auto', paddingTop: '5px' }}>
                      <strong>Security Gate Officer</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with secondary close button */}
            <div className="no-print" style={{ padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => setPreviewManifest(null)}
                style={{ background: '#334155', color: '#ffffff', border: 'none', padding: '6px 18px', fontSize: '0.85rem', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Print stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #manifest-printable-area, #manifest-printable-area * {
            visibility: visible;
          }
          #manifest-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

    </div>
  );
}
