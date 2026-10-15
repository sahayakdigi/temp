import React, { useState } from 'react';
import { Layers, Truck, CheckCircle, ShieldAlert, Sparkles, ArrowRight, Printer, X, FileText, Check, Navigation, ArrowDownToLine, RefreshCw, MessageSquare, Send, Copy, ExternalLink, CheckCheck, Users } from 'lucide-react';
import { api } from '../services/api';

export default function HubManifest({ lrs, setLrs, manifests, setManifests, trucks, drivers, currentUser, branches, parties }) {
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

  // Hired / Ad-hoc truck states (ephemeral for this manifest)
  const [truckSourceType, setTruckSourceType]   = useState('fleet'); // 'fleet' or 'hired'
  const [hiredTruckNo, setHiredTruckNo]         = useState('');
  const [hiredTruckPreset, setHiredTruckPreset] = useState('19Ft');
  const [driverSourceType, setDriverSourceType] = useState('fleet'); // 'fleet' or 'custom'
  const [customDriverName, setCustomDriverName] = useState('');
  const [customDriverPhone, setCustomDriverPhone] = useState('');

  const HIRED_PRESETS = {
    '14Ft': { name: '14 Ft Open/Closed (4T · 500 CFT)', capacityKg: 4000, cft: 500, maxBoxes: 90, bodyType: 'Open Body', size: '14 Ft' },
    '19Ft': { name: '19 Ft Container (10T · 900 CFT)', capacityKg: 10000, cft: 900, maxBoxes: 180, bodyType: 'Container', size: '19 Ft' },
    '24Ft': { name: '24 Ft Container (15T · 1400 CFT)', capacityKg: 15000, cft: 1400, maxBoxes: 280, bodyType: 'Container', size: '24 Ft' },
    '32Ft': { name: '32 Ft Multi-Axle (20T · 1900 CFT)', capacityKg: 20000, cft: 1900, maxBoxes: 380, bodyType: 'Container', size: '32 Ft MX' }
  };

  // --- Runsheet Modal State ---
  const [previewManifest, setPreviewManifest] = useState(null);

  // --- WhatsApp Automated Alerts Modal State ---
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

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
    if (l.manifestId || l.manifest_id || l.status === 'Delivered' || l.status === 'Billed' || l.status === 'Dispatched') return false;
    
    if (currentHub === 'ALL') return true;

    const loc = (l.currentLocation || l.current_location || l.bookingBranch || l.booking_branch || '').toUpperCase();
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

  // --- Phone formatter & WhatsApp Generators ---
  const formatPhoneForWhatsapp = (partyNameOrObj, fallbackPhone = '9876543210') => {
    let raw = '';
    if (typeof partyNameOrObj === 'object' && partyNameOrObj !== null) {
      raw = partyNameOrObj.phone || partyNameOrObj.whatsappNo || partyNameOrObj.contactPhone || fallbackPhone;
    } else {
      const partyObj = (parties || []).find(p => p.name === partyNameOrObj || p.id === partyNameOrObj);
      raw = partyObj?.phone || partyObj?.whatsappNo || partyObj?.contactPhone || fallbackPhone;
    }
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return `91${digits.slice(-10)}`;
    return `91${fallbackPhone}`;
  };

  const handleCopyText = (key, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const openWhatsappAlerts = (m) => {
    if (!m) return;
    const rawLrNos = m.lrNos || (typeof m.lr_nos === 'string' ? m.lr_nos.split(',').map(s => s.trim()) : m.lr_nos) || [];
    const manifestLrs = lrs.filter(l => rawLrNos.includes(l.lrNo || l.lr_no) || l.manifestId === m.id || l.manifest_id === m.id);
    const driverPhoneRaw = m.driverPhone || m.driver_phone || (drivers.find(d => d.name === (m.driverName || m.driver_name))?.phone) || '9876543210';
    const driverPhone = formatPhoneForWhatsapp(null, driverPhoneRaw);
    const vehicle = m.vehicleNo || m.vehicle_no || 'Truck';
    const driverName = m.driverName || m.driver_name || 'Driver';
    const origin = getHubName(getManifestOrigin(m)) || m.originHub || m.origin_hub || 'DEL';
    const destination = getHubName(getManifestDest(m)) || m.destHub || m.dest_hub || 'BOM';
    const totalWeight = Number(m.totalWeight || m.total_weight || 0);

    const driverMsg = `🚚 *LOGISYNC TRIP ASSIGNMENT*\nHello ${driverName},\nYou are assigned to Line-Haul Trip *#${m.id}*.\n\n🚛 *Vehicle:* ${vehicle}\n🛣 *Route:* ${m.lane || `${origin} ➔ ${destination}`}\n📦 *Total Cargo:* ${manifestLrs.length} Consignments (${totalWeight.toLocaleString()} kg)\n📅 *Date:* ${m.date || new Date().toISOString().split('T')[0]}\n\n📲 *Driver Trip Portal:* https://logisync.app/driver\nPlease inspect cargo, verify seals, and start trip.`;

    const lrAlerts = manifestLrs.map(lr => {
      const lrId = lr.lrNo || lr.lr_no;
      const cPhone = formatPhoneForWhatsapp(lr.consignor, '7799654708');
      const dPhone = formatPhoneForWhatsapp(lr.consignee, '9876543210');
      const wt = Number(lr.chargeWt || lr.charge_wt || 0);
      const pkgs = lr.articles || 1;
      const terms = lr.freightTerms || lr.freight_terms || 'To-Pay';
      const lrDest = lr.destination || destination;

      const consignorMsg = `📦 *DISPATCH ALERT — LOGISYNC*\nHello ${lr.consignor || 'Valued Shipper'},\nYour consignment *#${lrId}* has been loaded onto Line-Haul vehicle and DISPATCHED! 🚚\n\n🚛 *Vehicle:* ${vehicle}\n👨‍✈️ *Driver:* ${driverName} (${driverPhoneRaw})\n🛣 *Route:* ${lr.origin || origin} ➔ ${lrDest}\n📦 *Packages:* ${pkgs} Pkgs (${wt.toLocaleString()} kg)\n📄 *Manifest:* #${m.id}\n\n🔍 *Live Tracking:* https://logisync.app/track/${lrId}`;

      const consigneeMsg = `🚚 *SHIPMENT EN ROUTE — LOGISYNC*\nHello ${lr.consignee || 'Valued Consignee'},\nShipment *#${lrId}* from *${lr.consignor}* has been dispatched on Line-Haul manifest #${m.id}! 🚚\n\n🚛 *Vehicle:* ${vehicle}\n👨‍✈️ *Driver Contact:* ${driverPhoneRaw}\n📍 *Destination Hub:* ${lrDest}\n💰 *Terms:* ${terms}\n\n🔍 *Track Shipment:* https://logisync.app/track/${lrId}`;

      return {
        lrId,
        consignor: lr.consignor || 'Shipper',
        consignorPhone: cPhone,
        consignorMsg,
        consignee: lr.consignee || 'Receiver',
        consigneePhone: dPhone,
        consigneeMsg,
        articles: pkgs,
        weight: wt,
        destination: lrDest,
        terms
      };
    });

    setWhatsappModalData({
      manifest: m,
      vehicle,
      driverName,
      driverPhone,
      driverPhoneRaw,
      driverMsg,
      origin,
      destination,
      lrCount: manifestLrs.length,
      totalWeight,
      lrAlerts
    });
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

    let nextNum = manifests.length + 1;
    let id = `MNF-2026-${String(nextNum).padStart(3, '0')}`;
    while (manifests.some(m => m.id === id)) {
      nextNum++;
      id = `MNF-2026-${String(nextNum).padStart(3, '0')}`;
    }

    if (truckSourceType === 'hired' && !hiredTruckNo.trim()) {
      alert('Please enter the hired truck vehicle number before dispatching.');
      return;
    }

    const effTruckNo = (truckSourceType === 'hired' ? hiredTruckNo.trim().toUpperCase() : selectedTruck) || trucks[0]?.regNo || 'MH-12-Q-4567';
    const driverObj = drivers.find(d => d.id === selectedDriver);
    const effDriverName = driverSourceType === 'custom' ? (customDriverName.trim() || 'Hired Driver') : (driverObj?.name || 'Unknown');
    const effDriverPhone = driverSourceType === 'custom' ? (customDriverPhone.trim() || '9876543210') : (driverObj?.phone || '9876543210');

    const totalWt   = lrsData.reduce((s, l) => s + Number(l.chargeWt || l.charge_wt || 0), 0);
    const totalFrt  = lrsData.reduce((s, l) => s + Number(l.freightAmt || l.freight_amt || 0), 0);
    const totalCft  = lrsData.reduce((s, l) => s + getLrCft(l), 0);

    const effectiveOrigin = currentHub === 'ALL' ? 'DEL' : currentHub;

    const newManifest = {
      id,
      originHub: effectiveOrigin,
      destHub: targetDest,
      lane: `${getHubName(effectiveOrigin)} ➔ ${getHubName(targetDest)}`,
      vehicleNo: effTruckNo,
      driverName: effDriverName,
      driverPhone: effDriverPhone,
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
        const resultManifest = saved || newManifest;
        setManifests(prev => [resultManifest, ...prev]);
        updateMultipleLrs(selectedLrs, { manifestId: id, status: 'Manifested', vehicleNo: effTruckNo });
        setSuccessMsg(`✓ Manifest ${id} created and dispatched! Loaded ${selectedLrs.length} consignments (${totalWt.toLocaleString()} kg · ${totalCft} CFT) into truck ${effTruckNo}.`);
        setSelectedLrs([]);
        openWhatsappAlerts(resultManifest);
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
    const manifestLrs = lrs.filter(l => manifest.lrNos?.includes(l.lrNo || l.lr_no) || l.manifestId === manifest.id || l.manifest_id === manifest.id);
    
    // Update manifest status
    try {
      const saved = await api.updateManifest(manifest.id, { status: 'Closed' });
      setManifests(prev => prev.map(m => m.id === manifest.id ? saved : m));
    } catch (err) {
      console.error(`Failed to update manifest status on offload:`, err);
    }

    // Process each LR
    for (const lr of manifestLrs) {
      const lrId = lr.lrNo || lr.lr_no;
      const isFinalDest = getHubId(lr.destination) === currentHub;
      const updates = {
        manifestId: null,
        currentLocation: currentHub,
        status: isFinalDest ? 'AtHub' : 'Crossing' // If final, AtHub for local delivery. If not, Crossing (transshipment)
      };
      
      // Local state and API update
      setLrs(prev => prev.map(l => (l.lrNo || l.lr_no) === lrId ? { ...l, ...updates } : l));
      try {
        await api.updateLR(lrId, updates);
      } catch (err) {
        console.error(`Failed to update LR ${lrId} on offload:`, err);
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

  const effTruckNo = (truckSourceType === 'hired' ? hiredTruckNo.trim().toUpperCase() : selectedTruck) || trucks[0]?.regNo || 'MH-12-Q-4567';

  const activeTruckObj = truckSourceType === 'hired'
    ? {
        regNo: effTruckNo || 'Ad-Hoc Truck',
        ownership: 'Hired / Market',
        ...(HIRED_PRESETS[hiredTruckPreset] || HIRED_PRESETS['19Ft'])
      }
    : (trucks.find(t => (t.regNo || t.reg_no) === selectedTruck) || trucks[0]);

  const truckLimit      = activeTruckObj?.capacityKg || activeTruckObj?.capacity_kg || 20000;
  const truckMaxBoxes   = activeTruckObj?.maxBoxes || activeTruckObj?.max_boxes || 180;
  const truckCft        = activeTruckObj?.cft || 900;
  const truckBodyType   = activeTruckObj?.bodyType || activeTruckObj?.body_type || 'Container';
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
    const origin = lr.origin || lr.bookingBranch || lr.booking_branch || 'Unknown';
    originLoads[origin] = (originLoads[origin] || 0) + Number(lr.articles || 0);
  });

  const originSegments = Object.entries(originLoads).map(([name, boxes]) => {
    const pct = (boxes / truckMaxBoxes) * 100;
    return { name, boxes, pct };
  });

  const ORIGIN_COLORS = [
    'hsl(205, 95%, 60%)',  // Sky Blue
    'hsl(152, 72%, 48%)',  // Emerald Green
    'hsl(218, 92%, 58%)',  // Ocean Cobalt
    'hsl(240, 75%, 68%)',  // Indigo Violet
    'hsl(188, 85%, 52%)',  // Electric Cyan
    'hsl(198, 95%, 45%)'   // Deep Sky Blue
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
    <div className="animate-fade-in responsive-page-pad">
      
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
      <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--border-default)', marginBottom: '24px', gap: '8px' }}>
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
        <div className="responsive-grid-split">
          
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
                  const lrId = lr.lrNo || lr.lr_no;
                  const sel = selectedLrs.includes(lrId);
                  return (
                    <div key={lrId} onClick={() => toggleLr(lrId)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${sel ? 'hsla(205, 90%, 55%, 0.5)' : 'var(--border-subtle)'}`,
                        background: sel ? 'hsla(205, 90%, 55%, 0.08)' : 'hsla(222, 22%, 12%, 0.5)',
                        cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'var(--t-base)',
                      }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: sel ? 'var(--brand-light)' : 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>{lrId}</span>
                          <span className={`badge ${lr.freightTerms === 'To-Pay' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.62rem' }}>{lr.freightTerms}</span>
                          {lr.status === 'Crossing' && (
                            <span className="badge badge-brand animate-pulse" style={{ fontSize: '0.62rem', background: 'var(--accent-violet-glow)', color: 'var(--accent-violet)', border: '1px solid var(--accent-violet)' }}>Transshipment</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {lr.consignor} <ArrowRight size={10} style={{ verticalAlign: 'middle' }} /> {lr.consignee}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Dest: {lr.destination} · Mark: {lr.privateMark || lr.private_mark}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: '700', fontSize: '0.9rem', fontFamily: 'var(--font-display)' }}>{(Number(lr.chargeWt || lr.charge_wt || 0)).toLocaleString()} kg</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lr.articles} Pkgs ({getLrCft(lr)} CFT · {lr.boxSizeType || lr.box_size_type || 'Std'})</p>
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
                <div style={{ padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', minHeight: '56px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="label-premium" style={{ marginBottom: 0 }}>Line-Haul Truck</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`toggle-btn ${truckSourceType === 'fleet' ? 'active' : ''}`}
                        style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                        onClick={() => setTruckSourceType('fleet')}
                      >
                        Fleet
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${truckSourceType === 'hired' ? 'active' : ''}`}
                        style={{ padding: '2px 8px', fontSize: '0.68rem', borderColor: truckSourceType === 'hired' ? 'var(--brand)' : undefined }}
                        onClick={() => setTruckSourceType('hired')}
                      >
                        + Hired / New Truck
                      </button>
                    </div>
                  </div>

                  {truckSourceType === 'fleet' ? (
                    <select className="input-premium" value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)}>
                      {trucks.map(t => <option key={t.regNo || t.reg_no} value={t.regNo || t.reg_no}>{(t.regNo || t.reg_no)} ({(Number(t.capacityKg || t.capacity_kg || 0)).toLocaleString()} kg · {t.cft || 900} CFT)</option>)}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input
                        type="text"
                        className="input-premium"
                        placeholder="Vehicle No (e.g. DL-01-AB-9988)"
                        value={hiredTruckNo}
                        onChange={e => setHiredTruckNo(e.target.value.toUpperCase())}
                        style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: '700' }}
                        required={truckSourceType === 'hired'}
                      />
                      <select
                        className="input-premium"
                        style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                        value={hiredTruckPreset}
                        onChange={e => setHiredTruckPreset(e.target.value)}
                      >
                        {Object.entries(HIRED_PRESETS).map(([key, val]) => (
                          <option key={key} value={key}>{val.name}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        ⚡ Ad-hoc line-haul truck (not saved to permanent fleet master)
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="label-premium" style={{ marginBottom: 0 }}>Assign Driver</label>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', color: 'var(--brand-light)', fontSize: '0.68rem', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setDriverSourceType(prev => prev === 'fleet' ? 'custom' : 'fleet')}
                    >
                      {driverSourceType === 'fleet' ? '+ Hired Driver' : 'Pick Fleet Driver'}
                    </button>
                  </div>
                  {driverSourceType === 'fleet' ? (
                    <select className="input-premium" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input
                        type="text"
                        className="input-premium"
                        placeholder="Driver Name"
                        value={customDriverName}
                        onChange={e => setCustomDriverName(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                      <input
                        type="tel"
                        className="input-premium"
                        placeholder="Mobile (10 digits)"
                        value={customDriverPhone}
                        onChange={e => setCustomDriverPhone(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                  )}
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
              <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: `1px solid ${isOverloaded ? 'hsla(4, 86%, 58%, 0.3)' : 'var(--border-subtle)'}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
              {incomingManifests.map(m => {
                const isArrived = m.status === 'Arrived';
                const isTransit = m.status === 'InTransit';
                return (
                  <div key={m.id} className="glass-panel" style={{ padding: '16px', background: 'var(--bg-elevated)', border: isArrived ? '1px solid var(--accent-success)' : '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        onClick={() => openWhatsappAlerts(m)}
                        className="toggle-btn" 
                        title="WhatsApp Dispatch Alerts"
                        style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#25D366' }}
                      >
                        <MessageSquare size={13} />
                      </button>
                      
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
            <div className="table-responsive">
              <table className="table-premium">
              <thead>
                <tr>
                  {['Manifest ID', 'Lane Route', 'Vehicle Reg No', 'Driver Info', 'Cargo LRs', 'Total Weight', 'Est. Volume', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}
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
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => openWhatsappAlerts(m)}
                            className="btn-primary" 
                            style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px', background: 'hsla(142, 70%, 45%, 0.15)', color: '#25D366', border: '1px solid hsla(142, 70%, 45%, 0.3)' }}
                          >
                            <MessageSquare size={12} /> WhatsApp
                          </button>
                          <button 
                            onClick={() => setPreviewManifest(m)}
                            className="btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                          >
                            <Printer size={12} /> Runsheet
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: '10px'
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: '#2563eb' }} /> Runsheet Preview & Dispatch Manifest
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => openWhatsappAlerts(previewManifest)}
                  className="btn-primary" 
                  style={{ background: '#25D366', color: '#fff', border: 'none', padding: '7px 14px', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                >
                  <MessageSquare size={14} /> WhatsApp Alerts
                </button>
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="btn-primary" 
                  style={{ background: 'var(--brand)', color: 'var(--text-inverse)', border: 'none', padding: '7px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
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
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
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

      {/* WHATSAPP AUTOMATED DISPATCH ALERTS MODAL */}
      {whatsappModalData && (
        <div className="modal-backdrop" onClick={() => setWhatsappModalData(null)}>
          <div 
            className="glass-panel modal-card animate-scale-up" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '840px', width: '95%', maxHeight: '90vh', padding: '24px', position: 'relative', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#25D366', color: '#fff', padding: '10px', borderRadius: '50%', display: 'flex', boxShadow: '0 0 15px rgba(37, 211, 102, 0.4)' }}>
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    WhatsApp Automated Dispatch Alerts
                    <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>Active Manifest</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Line-Haul Manifest <strong>#{whatsappModalData.manifest.id}</strong> · {whatsappModalData.origin} ➔ {whatsappModalData.destination}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setWhatsappModalData(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Manifest Overview Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', marginBottom: '18px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Vehicle:</span>
                <p style={{ fontWeight: '700' }}>{whatsappModalData.vehicle}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Driver:</span>
                <p style={{ fontWeight: '700' }}>{whatsappModalData.driverName} ({whatsappModalData.driverPhoneRaw})</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Total Cargo:</span>
                <p style={{ fontWeight: '700' }}>{whatsappModalData.lrCount} LRs ({whatsappModalData.totalWeight.toLocaleString()} kg)</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Route Corridor:</span>
                <p style={{ fontWeight: '700', color: 'var(--brand-light)' }}>{whatsappModalData.origin} ➔ {whatsappModalData.destination}</p>
              </div>
            </div>

            {/* Broadcast All Alerts Quick Trigger */}
            <div style={{ background: 'hsla(142, 70%, 45%, 0.1)', border: '1px solid hsla(142, 70%, 45%, 0.3)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#25D366', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} /> Broadcast Dispatch Alerts
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Click below to send instant WhatsApp tracking updates to Driver and all Consignors & Consignees.
                </p>
              </div>
              <button 
                type="button"
                className="btn-primary"
                onClick={() => {
                  window.open(`https://api.whatsapp.com/send?phone=${whatsappModalData.driverPhone}&text=${encodeURIComponent(whatsappModalData.driverMsg)}`, '_blank');
                  if (whatsappModalData.lrAlerts && whatsappModalData.lrAlerts.length > 0) {
                    setTimeout(() => {
                      window.open(`https://api.whatsapp.com/send?phone=${whatsappModalData.lrAlerts[0].consignorPhone}&text=${encodeURIComponent(whatsappModalData.lrAlerts[0].consignorMsg)}`, '_blank');
                    }, 400);
                  }
                }}
                style={{ background: '#25D366', color: '#fff', fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={14} /> Send WhatsApp to Driver & Shippers
              </button>
            </div>

            {/* 1. Driver WhatsApp Notification Card */}
            <div style={{ marginBottom: '22px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={15} style={{ color: 'var(--brand)' }} /> 1. Line-Haul Driver Assignment Alert
              </h4>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>{whatsappModalData.driverName}</span>
                    <span className="badge badge-brand" style={{ fontSize: '0.65rem' }}>Assigned Driver</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>+{whatsappModalData.driverPhone}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button"
                      onClick={() => handleCopyText('driver', whatsappModalData.driverMsg)}
                      className="btn-ghost"
                      style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedKey === 'driver' ? <CheckCheck size={13} color="#25D366" /> : <Copy size={13} />}
                      {copiedKey === 'driver' ? 'Copied!' : 'Copy Text'}
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?phone=${whatsappModalData.driverPhone}&text=${encodeURIComponent(whatsappModalData.driverMsg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ background: '#25D366', color: '#fff', textDecoration: 'none', padding: '5px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={13} /> Send to Driver
                    </a>
                  </div>
                </div>
                <pre style={{ fontSize: '0.74rem', background: 'var(--bg-void)', padding: '10px 12px', borderRadius: '6px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {whatsappModalData.driverMsg}
                </pre>
              </div>
            </div>

            {/* 2. Consignment Party Alerts (Consignors & Consignees) */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} style={{ color: 'var(--brand)' }} /> 2. Consignment Party Alerts ({whatsappModalData.lrAlerts.length} LRs)
              </h4>

              {whatsappModalData.lrAlerts.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No individual LRs attached to this manifest.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {whatsappModalData.lrAlerts.map(lr => (
                    <div key={lr.lrId} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                      {/* LR Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--brand-light)', fontSize: '0.92rem' }}>{lr.lrId}</span>
                          <span className={`badge ${lr.terms === 'To-Pay' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.62rem' }}>{lr.terms}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lr.articles} Pkgs · {lr.weight.toLocaleString()} kg · Dest: {lr.destination}</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {/* Consignor Alert */}
                        <div style={{ background: 'hsla(142, 70%, 45%, 0.05)', border: '1px solid hsla(142, 70%, 45%, 0.2)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#25D366' }}>Consignor (Shipper)</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{lr.consignorPhone}</span>
                            </div>
                            <p style={{ fontWeight: '700', fontSize: '0.82rem', marginBottom: '6px' }}>{lr.consignor}</p>
                            <pre style={{ fontSize: '0.7rem', background: 'var(--bg-void)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', maxHeight: '110px', overflowY: 'auto' }}>
                              {lr.consignorMsg}
                            </pre>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                            <button 
                              type="button"
                              onClick={() => handleCopyText(`c-${lr.lrId}`, lr.consignorMsg)}
                              className="btn-ghost"
                              style={{ padding: '5px 8px', fontSize: '0.72rem', flex: 1, justifyContent: 'center' }}
                            >
                              {copiedKey === `c-${lr.lrId}` ? <CheckCheck size={12} color="#25D366" /> : <Copy size={12} />}
                              {copiedKey === `c-${lr.lrId}` ? 'Copied' : 'Copy'}
                            </button>
                            <a
                              href={`https://api.whatsapp.com/send?phone=${lr.consignorPhone}&text=${encodeURIComponent(lr.consignorMsg)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary"
                              style={{ background: '#25D366', color: '#fff', textDecoration: 'none', padding: '5px 10px', fontSize: '0.72rem', flex: 1.5, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Send size={12} /> WhatsApp Consignor
                            </a>
                          </div>
                        </div>

                        {/* Consignee Alert */}
                        <div style={{ background: 'hsla(142, 70%, 45%, 0.05)', border: '1px solid hsla(142, 70%, 45%, 0.2)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#25D366' }}>Consignee (Receiver)</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{lr.consigneePhone}</span>
                            </div>
                            <p style={{ fontWeight: '700', fontSize: '0.82rem', marginBottom: '6px' }}>{lr.consignee}</p>
                            <pre style={{ fontSize: '0.7rem', background: 'var(--bg-void)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', maxHeight: '110px', overflowY: 'auto' }}>
                              {lr.consigneeMsg}
                            </pre>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                            <button 
                              type="button"
                              onClick={() => handleCopyText(`d-${lr.lrId}`, lr.consigneeMsg)}
                              className="btn-ghost"
                              style={{ padding: '5px 8px', fontSize: '0.72rem', flex: 1, justifyContent: 'center' }}
                            >
                              {copiedKey === `d-${lr.lrId}` ? <CheckCheck size={12} color="#25D366" /> : <Copy size={12} />}
                              {copiedKey === `d-${lr.lrId}` ? 'Copied' : 'Copy'}
                            </button>
                            <a
                              href={`https://api.whatsapp.com/send?phone=${lr.consigneePhone}&text=${encodeURIComponent(lr.consigneeMsg)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary"
                              style={{ background: '#25D366', color: '#fff', textDecoration: 'none', padding: '5px 10px', fontSize: '0.72rem', flex: 1.5, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Send size={12} /> WhatsApp Consignee
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <button 
                type="button"
                className="btn-ghost"
                onClick={() => setWhatsappModalData(null)}
                style={{ padding: '8px 20px', fontSize: '0.84rem' }}
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
