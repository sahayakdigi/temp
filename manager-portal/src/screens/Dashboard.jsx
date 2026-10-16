import React, { useState, useEffect, useRef } from 'react';
import { Truck, FileText, TrendingUp, Wallet, AlertTriangle, MapPin, Clock, ArrowUpRight, Plus, X, ShieldAlert, Layers, CheckCircle, BarChart3, Radio } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ trips, lrs, manifests, userRole, activeBranch, branches, setBranches, onNavigate, trucks = [], drivers = [] }) {
  // --- Dashboard Branch/Hub Selection Context ---
  const [selectedBranch, setSelectedBranch] = useState('All');

  // --- Transaction List Tab Filter ---
  const [transactionFilter, setTransactionFilter] = useState('all'); // 'all', 'ftl', 'ptl'

  // --- Add Hub Modal State ---
  const [showAddHubModal, setShowAddHubModal] = useState(false);
  const [newHubName, setNewHubName] = useState('');
  const [newHubId, setNewHubId] = useState('');
  const [newHubGstin, setNewHubGstin] = useState('');
  const [newHubAddress, setNewHubAddress] = useState('');
  const [newHubType, setNewHubType] = useState('hub');

  // --- Map Click State ---
  const [clickedMapNode, setClickedMapNode] = useState(null);
  
  // --- Notifications/Messages ---
  const [successMsg, setSuccessMsg] = useState('');

  // --- Leaflet Map Refs & Geocoding Resolver Hook ---
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [resolvedCoords, setResolvedCoords] = useState({});

  const baseCoords = {
    DEL: [28.6139, 77.2090], // Delhi
    BOM: [19.0760, 72.8777], // Mumbai
    BLR: [12.9716, 77.5946], // Bangalore
    CHE: [13.0827, 80.2707], // Chennai
    MAA: [13.0827, 80.2707], // Chennai
    HYD: [17.3850, 78.4867], // Hyderabad
    KOL: [22.5726, 88.3639], // Kolkata
    CCU: [22.5726, 88.3639], // Kolkata
    HAR: [29.0588, 76.0856], // Haryana
    AMD: [23.0225, 72.5714], // Ahmedabad
    PNQ: [18.5204, 73.8567], // Pune
    IXC: [30.7333, 76.7794]  // Chandigarh
  };

  const getCoordinates = (cityOrCode) => {
    if (!cityOrCode) return [20.5937, 78.9629];
    const code = cityOrCode.toUpperCase();
    if (baseCoords[code]) return baseCoords[code];
    
    const key = cityOrCode.toLowerCase().trim();
    if (resolvedCoords[key]) return resolvedCoords[key];
    if (resolvedCoords[code.toLowerCase()]) return resolvedCoords[code.toLowerCase()];
    
    const subCode = code.substring(0, 3);
    if (baseCoords[subCode]) return baseCoords[subCode];
    
    return [20.5937, 78.9629]; // Default center of India
  };

  // --- Dynamic Geocoder Effect ---
  useEffect(() => {
    const citiesToGeocode = new Set();
    
    branches.forEach(b => {
      const code = b.id.toUpperCase();
      if (!baseCoords[code]) {
        citiesToGeocode.add(b.name);
      }
    });

    trips.forEach(t => {
      if (t.status === 'Closed' || t.status === 'Settled') return;
      const oCode = getHubIdFromCityName(t.origin).toUpperCase();
      const dCode = getHubIdFromCityName(t.destination).toUpperCase();
      if (!baseCoords[oCode]) citiesToGeocode.add(t.origin);
      if (!baseCoords[dCode]) citiesToGeocode.add(t.destination);
    });

    const uniqueCities = Array.from(citiesToGeocode);
    if (uniqueCities.length === 0) return;

    const cache = JSON.parse(localStorage.getItem('temp_geocoded_coords') || '{}');
    const newResolved = { ...cache };
    let needsUpdate = false;

    const geocodeAll = async () => {
      for (const city of uniqueCities) {
        const key = city.toLowerCase().trim();
        if (newResolved[key]) continue;

        try {
          // Throttle requests slightly (600ms) to respect Nominatim policy
          await new Promise(r => setTimeout(r, 600));
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
          const data = await res.json();
          if (data && data[0]) {
            newResolved[key] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            needsUpdate = true;
          }
        } catch (err) {
          console.error(`Failed to geocode "${city}":`, err);
        }
      }

      if (needsUpdate) {
        localStorage.setItem('temp_geocoded_coords', JSON.stringify(newResolved));
        setResolvedCoords(newResolved);
      } else if (Object.keys(resolvedCoords).length === 0 && Object.keys(newResolved).length > 0) {
        setResolvedCoords(newResolved);
      }
    };

    geocodeAll();
  }, [trips, branches]);

  // --- Map Update Effect ---
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: [21.5, 76.5],
        zoom: 4,
        zoomControl: false,
        attributionControl: false
      });

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 10,
        minZoom: 3
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old elements
    markersRef.current.forEach(item => item.remove());
    markersRef.current = [];

    // Dynamically compile hubs from active branches and active trip cities
    const registeredHubs = branches.map(b => b.id.toUpperCase());
    const extraHubs = new Set();
    trips.forEach(t => {
      if (t.status === 'Closed' || t.status === 'Settled') return;
      const o = getHubIdFromCityName(t.origin).toUpperCase();
      const d = getHubIdFromCityName(t.destination).toUpperCase();
      if (!registeredHubs.includes(o)) extraHubs.add(o);
      if (!registeredHubs.includes(d)) extraHubs.add(d);
    });

    const hubData = [
      ...branches.map(b => {
        const code = b.id.toUpperCase();
        return {
          id: code,
          name: b.name.toUpperCase(),
          latlng: getCoordinates(b.name)
        };
      }),
      ...Array.from(extraHubs).map(code => {
        const matchedTrip = trips.find(t => {
          const o = getHubIdFromCityName(t.origin).toUpperCase();
          const d = getHubIdFromCityName(t.destination).toUpperCase();
          return o === code || d === code;
        });
        const name = matchedTrip 
          ? (getHubIdFromCityName(matchedTrip.origin).toUpperCase() === code ? matchedTrip.origin : matchedTrip.destination)
          : code;
        return {
          id: code,
          name: `${name.toUpperCase()} HUB / OPERATIONAL NODE`,
          latlng: getCoordinates(name)
        };
      })
    ];

    hubData.forEach(hub => {
      const active = selectedBranch === 'All' || selectedBranch === hub.id;
      const hubLrs = lrs.filter(l => {
        const loc = (l.currentLocation || l.bookingBranch || 'DEL').toUpperCase();
        return loc === hub.id;
      });
      const stockCount = hubLrs.length;
      const stockWeight = hubLrs.reduce((s, l) => s + (l.chargeWt || 0), 0);

      const pulseHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="
            width: 14px; 
            height: 14px; 
            border-radius: 50%; 
            background: ${active ? 'var(--brand)' : 'var(--text-muted)'}; 
            box-shadow: ${active ? '0 0 12px var(--brand)' : 'none'}; 
            border: 2px solid var(--bg-void);
            transform: scale(${active ? '1.2' : '0.9'});
            transition: all 0.2s;
          "></div>
          <span style="
            font-size: 0.65rem; 
            color: ${active ? 'var(--brand-light)' : 'var(--text-muted)'}; 
            font-weight: 800; 
            letter-spacing: 0.05em; 
            background: rgba(5,7,12,0.85); 
            padding: 2px 5px; 
            border-radius: 3px;
            margin-top: 3px;
            white-space: nowrap;
            border: 1px solid ${active ? 'var(--border-glow)' : 'transparent'};
          ">${hub.id}</span>
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: pulseHtml,
        className: 'custom-hub-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = window.L.marker(hub.latlng, { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          handleMapNodeClick(hub.id, hub.name);
        });

      marker.bindTooltip(`
        <div style="background: var(--bg-elevated); color: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle); font-size: 0.75rem;">
          <strong>${hub.name}</strong><br/>
          Stock: ${stockCount} LRs (${stockWeight.toLocaleString()} kg)
        </div>
      `, { direction: 'top', offset: [0, -10], opacity: 0.9 });

      markersRef.current.push(marker);
    });

    trips.forEach(trip => {
      if (trip.status === 'Closed' || trip.status === 'Settled') return;

      const startLatLng = getCoordinates(trip.origin);
      const endLatLng = getCoordinates(trip.destination);

      const routeLine = window.L.polyline([startLatLng, endLatLng], {
        color: 'var(--brand)',
        weight: 1.5,
        opacity: 0.35,
        dashArray: '5, 5'
      }).addTo(map);

      markersRef.current.push(routeLine);

      const lat = startLatLng[0] + (endLatLng[0] - startLatLng[0]) * 0.5;
      const lng = startLatLng[1] + (endLatLng[1] - startLatLng[1]) * 0.5;

      const isDelayed = trip.status === 'Delayed';
      const markerColor = isDelayed ? 'var(--accent-warning)' : 'var(--accent-success)';

      const truckHtml = `
        <div style="
          background: ${markerColor}; 
          border-radius: 50%; 
          width: 22px; 
          height: 22px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          box-shadow: 0 0 10px ${markerColor};
          border: 2px solid var(--bg-void);
          cursor: pointer;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
      `;

      const truckIcon = window.L.divIcon({
        html: truckHtml,
        className: 'custom-truck-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const truckMarker = window.L.marker([lat, lng], { icon: truckIcon })
        .addTo(map);

      truckMarker.bindTooltip(`
        <div style="background: var(--bg-elevated); color: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-subtle); font-size: 0.75rem;">
          <strong>Vehicle: ${trip.truckNo}</strong><br/>
          Status: <span style="color: ${isDelayed ? 'var(--accent-warning)' : 'var(--accent-success)'}">${trip.status}</span><br/>
          Driver: ${trip.driverName}<br/>
          Route: ${trip.origin} ➔ ${trip.destination}
        </div>
      `, { direction: 'top', offset: [0, -10], opacity: 0.95 });

      markersRef.current.push(truckMarker);
    });
  }, [trips, lrs, selectedBranch, resolvedCoords]);

  // --- Mappings ---
  const getBranchName = (id) => {
    const b = branches.find(item => item.id.toUpperCase() === id.toUpperCase());
    return b ? b.name : id;
  };

  const getHubIdFromCityName = (city) => {
    if (!city) return 'DEL';
    const lower = city.toLowerCase();
    if (lower.includes('delhi') || lower === 'del') return 'DEL';
    if (lower.includes('mumbai') || lower === 'bom') return 'BOM';
    if (lower.includes('bangalore') || lower === 'blr') return 'BLR';
    return city.toUpperCase().substring(0, 3);
  };

  // --- Filter Records by Selected Branch ---
  const filteredTrips = trips.filter(t => {
    if (selectedBranch === 'All') return true;
    const originId = getHubIdFromCityName(t.origin);
    const destId = getHubIdFromCityName(t.destination);
    return originId === selectedBranch || destId === selectedBranch;
  });

  const filteredLrs = lrs.filter(l => {
    if (selectedBranch === 'All') return true;
    const loc = (l.currentLocation || l.bookingBranch || 'DEL').toUpperCase();
    const dest = getHubIdFromCityName(l.destination).toUpperCase();
    return loc === selectedBranch.toUpperCase() || dest === selectedBranch.toUpperCase();
  });

  const filteredManifests = manifests.filter(m => {
    if (selectedBranch === 'All') return true;
    const getDest = (item) => item.destHub || (item.lane ? item.lane.split(/[-➔→]/)[1]?.trim() : '');
    const getOrig = (item) => item.originHub || (item.lane ? item.lane.split(/[-➔→]/)[0]?.trim() : '');
    return getOrig(m) === selectedBranch || getDest(m) === selectedBranch;
  });

  // --- Financial & Operational Metrics (Filtered context) ---
  const totalRev = filteredTrips.reduce((s, t) => s + (t.contractRate || 0), 0) + filteredLrs.reduce((s, l) => s + (l.freightAmt || 0), 0);
  
  // Expenses breakdowns
  let fuelExp = 0;
  let tollExp = 0;
  let driverExp = 0;
  let miscExp = 0;

  filteredTrips.forEach(t => {
    t.expenses?.forEach(x => {
      if (x.type === 'fuel') fuelExp += x.amount;
      else if (x.type === 'toll') tollExp += x.amount;
      else if (x.type === 'batta') driverExp += x.amount;
      else miscExp += x.amount;
    });
  });

  const totalExp = fuelExp + tollExp + driverExp + miscExp;
  const mtdNetProfit = totalRev - totalExp;
  const marginPct = totalRev > 0 ? Math.round((mtdNetProfit / totalRev) * 100) : 0;

  const activeFTLCount = filteredTrips.filter(t => t.status === 'InTransit' || t.status === 'Started').length;
  const openLRsCount = filteredLrs.filter(l => l.status === 'Booked' || l.status === 'AtHub' || l.status === 'Crossing').length;
  
  const toPayCollection = filteredLrs.filter(l => l.freightTerms === 'To-Pay' && l.status !== 'Billed' && l.status !== 'Delivered')
                                     .reduce((s, l) => s + (l.freightAmt || 0), 0);

  // --- Dynamic Action Center Feed (FR-12.1) ---
  const actionItems = [];
  
  // 1. Dynamic Expiry alerts (real registered trucks & drivers compliance)
  const today = new Date();
  
  (trucks || []).forEach(truck => {
    const reg = truck.reg_no || truck.regNo || 'Truck';
    const checkExpiry = (dateStr, type) => {
      if (!dateStr) return;
      const expDate = new Date(dateStr);
      if (isNaN(expDate.getTime())) return;
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        actionItems.push({
          type: `${type} Expiry`,
          entity: `Lorry ${reg}`,
          desc: diffDays < 0 ? `${type} expired ${Math.abs(diffDays)} days ago!` : `${type} expires in ${diffDays} days!`,
          severity: diffDays <= 7 ? 'danger' : 'warning'
        });
      }
    };
    checkExpiry(truck.expiry_fc || truck.expiryFC, 'Fitness Certificate');
    checkExpiry(truck.expiry_ins || truck.expiryIns, 'Insurance');
    checkExpiry(truck.expiry_rc || truck.expiryRC, 'RC');
    checkExpiry(truck.expiry_np || truck.expiryNP, 'Permit');
  });

  (drivers || []).forEach(driver => {
    const licExp = driver.licence_exp || driver.licenceExp;
    if (licExp) {
      const expDate = new Date(licExp);
      if (!isNaN(expDate.getTime())) {
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          actionItems.push({
            type: 'Licence Expiry',
            entity: `Driver ${driver.name || 'Driver'}`,
            desc: diffDays < 0 ? `Driving licence expired ${Math.abs(diffDays)} days ago!` : `Driving licence expires in ${diffDays} days!`,
            severity: diffDays <= 7 ? 'danger' : 'warning'
          });
        }
      }
    }
  });

  // 2. Unassigned cargo connections
  const unassignedLrs = filteredLrs.filter(l => !l.manifestId && (l.status === 'Booked' || l.status === 'Crossing'));
  if (unassignedLrs.length > 0) {
    const totalPendingWeight = unassignedLrs.reduce((s, l) => s + (l.chargeWt || 0), 0);
    actionItems.push({
      type: 'Loose Cargo connection',
      entity: `${unassignedLrs.length} LRs Pending`,
      desc: `${totalPendingWeight.toLocaleString()} kg cargo waiting at hubs for manifest connection.`,
      severity: 'warning'
    });
  }

  // 3. Pending Cash Advances
  const unreconciledTrips = filteredTrips.filter(t => t.driverAdvance > 0 && t.status === 'InTransit');
  unreconciledTrips.forEach(t => {
    actionItems.push({
      type: 'Advance Settle',
      entity: `Trip ${t.id}`,
      desc: `₹${t.driverAdvance?.toLocaleString()} advance pending reconciliation against fuel/toll bills.`,
      severity: 'info'
    });
  });

  // 4. Overdue To-Pay collections
  const overdueCollectionAmt = filteredLrs.filter(l => l.freightTerms === 'To-Pay' && l.status === 'Delivered')
                                          .reduce((s, l) => s + (l.freightAmt || 0), 0);
  if (overdueCollectionAmt > 0) {
    actionItems.push({
      type: 'Collection Settle',
      entity: 'To-Pay Overdue',
      desc: `₹${overdueCollectionAmt.toLocaleString()} pending collection at delivery points.`,
      severity: 'warning'
    });
  }

  // --- Hub Add Action handler ---
  const handleAddHub = (e) => {
    e.preventDefault();
    if (!newHubName || !newHubId || !newHubGstin) {
      alert('Please fill in Name, ID Code, and GSTIN.');
      return;
    }

    const payload = {
      id: newHubId.toUpperCase().trim(),
      name: newHubName.trim(),
      gstin: newHubGstin.trim(),
      address: newHubAddress.trim(),
      type: newHubType
    };

    api.createBranch(payload)
      .then(saved => {
        setBranches([...branches, saved]);
        setSuccessMsg(`New operational node "${saved.name} (${saved.id})" registered successfully!`);
        setShowAddHubModal(false);
        setNewHubName('');
        setNewHubId('');
        setNewHubGstin('');
        setNewHubAddress('');
        setTimeout(() => setSuccessMsg(''), 5000);
      })
      .catch(err => alert(`Failed to add node: ${err.message}`));
  };

  // --- Telemetry Map Node Clicks ---
  const handleMapNodeClick = (cityId, name) => {
    // Calculate stock at this node
    const nodeStock = lrs.filter(l => {
      const loc = (l.currentLocation || l.bookingBranch || 'DEL').toUpperCase();
      return loc === cityId.toUpperCase() && !l.manifestId && l.status !== 'Delivered' && l.status !== 'Billed';
    });

    const totalNodeWeight = nodeStock.reduce((s, l) => s + (l.chargeWt || 0), 0);
    const totalNodeBoxes = nodeStock.reduce((s, l) => s + (l.articles || 0), 0);

    // Active outbound manifests from this node
    const nodeOutbound = manifests.filter(m => {
      const getOrig = m.originHub || (m.lane ? m.lane.split(/[-➔→]/)[0]?.trim() : '');
      return getOrig === cityId && m.status !== 'Closed';
    });

    setClickedMapNode({
      id: cityId,
      name,
      stockCount: nodeStock.length,
      stockWeight: totalNodeWeight,
      stockBoxes: totalNodeBoxes,
      outboundCount: nodeOutbound.length,
    });
  };

  // --- Detailed FTL and PTL Operating Metrics ---
  const ftlTrips = filteredTrips;
  const ptlLrs = filteredLrs.filter(l => l.lrNo !== 'LR-2026-001' && l.bookingBranch !== 'FTL'); // FTL LR is LR-001

  // FTL totals
  const ftlRev = ftlTrips.reduce((s, t) => s + (t.contractRate || 0), 0);
  const ftlExp = ftlTrips.reduce((s, t) => s + (t.expenses?.reduce((e, x) => e + x.amount, 0) || 0), 0);
  const ftlProfit = ftlRev - ftlExp;
  const ftlMargin = ftlRev > 0 ? Math.round((ftlProfit / ftlRev) * 100) : 0;
  const ftlActive = ftlTrips.filter(t => t.status === 'InTransit' || t.status === 'Started').length;

  // PTL totals
  const ptlRev = ptlLrs.reduce((s, l) => s + (l.freightAmt || 0), 0);
  // Estimate PTL operating costs as allocated manifest expenses
  const manifestCost = filteredManifests.reduce((s, m) => {
    // Match vehicle fuel/toll expenses if we want, or mock. Let's allocate 30% of total revenue as cost
    return s + (m.totalWeight * 2.5); // ₹2.5 per kg consolidated cargo line-haul expense
  }, 0);
  const ptlProfit = ptlRev - manifestCost;
  const ptlMargin = ptlRev > 0 ? Math.round((ptlProfit / ptlRev) * 100) : 0;
  const ptlPackages = ptlLrs.reduce((s, l) => s + (l.articles || 0), 0);
  const ptlWeight = ptlLrs.reduce((s, l) => s + (l.chargeWt || 0), 0);

  // --- Transactions filter ---
  const finalRecentTransactions = [
    ...trips.map(t => ({ id: t.id, type: 'FTL', client: 'Lorry Hire Placement', route: `${t.origin} ➔ ${t.destination}`, qty: '1 placement', freight: t.contractRate, status: t.status, date: t.startDate || 'N/A' })),
    ...lrs.map(l => ({ id: l.lrNo, ...l, type: 'PTL', client: l.consignor, route: `${l.origin} ➔ ${l.destination}`, qty: `${l.articles} boxes (${l.chargeWt} kg)`, freight: l.freightAmt, status: l.status, date: l.date }))
  ].filter(item => {
    if (transactionFilter === 'ftl') return item.type === 'FTL';
    if (transactionFilter === 'ptl') return item.type === 'PTL';
    return true;
  }).slice(0, 8); // Top 8 transactions

  return (
    <>
      <div className="animate-fade-in dashboard-container">
      
      {/* COCKPIT HEADER WITH FILTERS */}
      <div className="page-header" style={{ marginBottom: '0' }}>
        <div>
          <h2 className="page-title">Operations Cockpit</h2>
          <p className="page-subtitle">Real-time branch telemetry · Multi-node rollup metrics · Action Center</p>
        </div>
        
        <div className="cockpit-header-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Branch Context Dropdown (FR-12.2) */}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Active Node Context:</span>
          <select 
            value={selectedBranch} 
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setClickedMapNode(null);
            }} 
            className="input-premium"
            style={{ width: '200px', padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <option value="All">All Nodes (HO Rollup)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
            ))}
          </select>

          {/* Add Hub Trigger */}
          <button 
            onClick={() => setShowAddHubModal(true)} 
            className="btn-primary" 
            style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '5px' }}
          >
            <Plus size={14} /> Add Node
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {/* KPI TILE METRICS */}
      <div className="stagger-children dashboard-kpi-grid">
        {[
          { label: 'Active Trips (FTL)', value: `${activeFTLCount}`, unit: 'running', icon: <Truck size={22} />, color: 'var(--brand)', bg: 'var(--brand-glow)', accent: 'var(--brand)', tab: 'fleet' },
          { label: 'Open LRs (PTL)', value: `${openLRsCount}`, unit: 'loose cargo', icon: <FileText size={22} />, color: 'var(--accent-info)', bg: 'var(--accent-info-glow)', accent: 'var(--accent-info)', tab: 'manifest' },
          { label: 'MTD Net Margin', value: `₹${mtdNetProfit.toLocaleString('en-IN')}`, unit: `${marginPct}% ratio`, icon: <TrendingUp size={22} />, color: 'var(--accent-success)', bg: 'var(--accent-success-glow)', accent: 'var(--accent-success)', tab: 'ledger' },
          { label: 'To-Pay Collections', value: `₹${toPayCollection.toLocaleString('en-IN')}`, unit: 'uncollected', icon: <Wallet size={22} />, color: 'var(--accent-warning)', bg: 'var(--accent-warning-glow)', accent: 'var(--accent-warning)', tab: 'settlement' },
          { label: 'Alert Actions', value: `${actionItems.length}`, unit: 'critical alerts', icon: <AlertTriangle size={22} />, color: 'var(--accent-danger)', bg: 'var(--accent-danger-glow)', accent: 'var(--accent-danger)', tab: 'alerts' }
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="kpi-card animate-fade-in"
            onClick={() => {
              if (kpi.tab === 'alerts') {
                document.getElementById('action-center-panel')?.scrollIntoView({ behavior: 'smooth' });
              } else if (onNavigate) {
                onNavigate(kpi.tab);
              }
            }}
            style={{
              '--card-accent': kpi.accent,
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = `0 10px 20px ${kpi.accent}15`;
              e.currentTarget.style.borderColor = kpi.accent;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '';
            }}
          >
            <div className="kpi-icon-wrap" style={{ background: kpi.bg }}>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <div>
              <p className="kpi-label">{kpi.label}</p>
              <p className="kpi-value" style={{ color: kpi.color }}>
                {kpi.value}
                <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '4px' }}>{kpi.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* MID ROW: INTERACTIVE MAP + ACTION CENTER */}
      <div className="dashboard-mid-grid">
        
        {/* Clickable Telemetry Map */}
        <div className="glass-panel" style={{ padding: '22px', position: 'relative' }}>
          <div className="section-header">
            <h3 className="section-title">
              <MapPin size={18} className="title-icon" style={{ color: 'var(--brand)' }} />
              Interactive Telemetry & Node Map
            </h3>
            {onNavigate ? (
              <button
                onClick={() => {
                  localStorage.setItem('temp_fleet_subtab', 'telemetry');
                  onNavigate('fleet');
                }}
                className="btn btn-sm btn-primary"
                style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Radio size={13} /> Open Live GPS Fleet Radar ➔
              </button>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--accent-success)' }}>
                <span className="status-dot active" />
                Click nodes for real-time stock
              </span>
            )}
          </div>

          <div 
            ref={mapContainerRef}
            onClick={() => {
              localStorage.setItem('temp_fleet_subtab', 'telemetry');
              if (onNavigate) onNavigate('fleet');
            }}
            style={{
              height: '340px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--bg-void)',
              zIndex: 1,
              cursor: 'pointer'
            }}
            title="Click to open Live GPS Telemetry & Radar in Fleet Management"
          >
            {/* Floating Quick Hint Banner */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 900,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(6px)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.72rem',
              color: '#38bdf8',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'none'
            }}>
              <Radio size={12} color="#38bdf8" /> Click map to open Live Fleet GPS Radar ➔
            </div>

            {/* Map Node Tooltip / Detail Overlay */}
            {clickedMapNode && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="glass-panel animate-scale-up" 
                style={{
                  position: 'absolute', bottom: '15px', left: '15px', right: '15px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--brand)',
                  borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
                  boxShadow: 'var(--shadow-lg)', zIndex: 1000
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--brand-light)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} /> {clickedMapNode.name} HUB OVERVIEW
                  </h4>
                  <button onClick={() => setClickedMapNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={15} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '0.82rem' }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '6px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loose Stock</p>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{clickedMapNode.stockCount} LRs</p>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '6px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Pending Weight</p>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{clickedMapNode.stockWeight?.toLocaleString()} kg</p>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '6px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Outbound Active</p>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand)', marginTop: '2px' }}>{clickedMapNode.outboundCount} manifests</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Center Alerts Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Action Center Block (FR-12.1) */}
          <div id="action-center-panel" className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div className="section-header" style={{ marginBottom: '0' }}>
              <h3 className="section-title">
                <Clock size={18} style={{ color: 'var(--accent-warning)' }} />
                Operations Action Center
              </h3>
              <span className="badge badge-warning">{actionItems.length} Urgent</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '280px', paddingRight: '4px' }}>
              {actionItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 10px', fontSize: '0.84rem' }}>
                  <CheckCircle size={32} style={{ color: 'var(--accent-success)', opacity: 0.3, marginBottom: '8px', display: 'inline-block' }} />
                  <p>All operations clear! No pending alerts.</p>
                </div>
              ) : actionItems.map((item, idx) => {
                let targetTab = null;
                if (item.type.includes('Expiry')) targetTab = 'fleet';
                else if (item.type.includes('Cargo')) targetTab = 'manifest';
                else if (item.type.includes('Advance')) targetTab = 'settlement';
                else if (item.type.includes('Collection')) targetTab = 'settlement';

                return (
                  <div
                    key={idx}
                    className={`alert alert-${item.severity || 'info'}`}
                    onClick={() => {
                      if (targetTab && onNavigate) {
                        onNavigate(targetTab);
                      }
                    }}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      border: '1px solid var(--border-subtle)',
                      cursor: targetTab ? 'pointer' : 'default',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      if (targetTab) {
                        e.currentTarget.style.transform = 'translateX(3px)';
                        e.currentTarget.style.borderColor = 'var(--brand)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (targetTab) {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.borderColor = '';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: item.severity === 'danger' ? 'var(--accent-danger)' : 'var(--brand-light)' }}>
                        {item.type}
                      </span>
                      <span className={`badge badge-${item.severity}`} style={{ fontSize: '0.58rem' }}>{item.entity}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* THREE-COLUMN P&L GAUGE BAR & COST RATIOS (FR-12.1) */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <h3 className="section-title">
            <BarChart3 size={18} style={{ color: 'var(--brand)' }} />
            Consolidated Financial Ratios (P&L Breakdown)
          </h3>
          <span style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--accent-success)' }}>
            Net Margin: {marginPct}%
          </span>
        </div>

        {/* Cost ratio progress segments */}
        {totalRev > 0 ? (
          (() => {
            const marginPctVal = Math.round((mtdNetProfit / totalRev) * 100);
            const expPctVal = 100 - marginPctVal;

            const fuelPctVal = totalExp > 0 ? Math.round((fuelExp / totalExp) * 100) : 0;
            const tollPctVal = totalExp > 0 ? Math.round((tollExp / totalExp) * 100) : 0;
            const driverPctVal = totalExp > 0 ? Math.round((driverExp / totalExp) * 100) : 0;
            const miscPctVal = totalExp > 0 ? 100 - (fuelPctVal + tollPctVal + driverPctVal) : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Bar 1: Net Margin vs Total Expenses */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    <span>Profit Margin Ratio</span>
                    <span>Net Margin: <strong>{marginPctVal}%</strong> · Costs: <strong>{expPctVal}%</strong></span>
                  </div>
                  <div style={{ height: '26px', background: 'var(--bg-void)', borderRadius: '6px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-subtle)' }}>
                    {marginPctVal > 0 && (
                      <div style={{ 
                        width: `${marginPctVal}%`, 
                        background: 'linear-gradient(90deg, var(--accent-success), #10b981)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: '#fff', fontSize: '0.78rem', fontWeight: '800',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        minWidth: 0, padding: '0 8px'
                      }}>
                        Net Margin: {marginPctVal}% (₹{mtdNetProfit.toLocaleString('en-IN')})
                      </div>
                    )}
                    {expPctVal > 0 && (
                      <div style={{ 
                        width: `${expPctVal}%`, 
                        background: 'linear-gradient(90deg, #ef4444, var(--accent-danger))', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: '#fff', fontSize: '0.78rem', fontWeight: '800',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        minWidth: 0, padding: '0 8px'
                      }}>
                        Costs: {expPctVal}% (₹{totalExp.toLocaleString('en-IN')})
                      </div>
                    )}
                  </div>
                </div>

                {/* Bar 2: Cost Breakdown (Only shown if there are expenses) */}
                {totalExp > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                      <span>Operating Expense Distribution</span>
                      <span>Total Costs: <strong>₹{totalExp.toLocaleString('en-IN')}</strong></span>
                    </div>
                    {/* Visual Pill Progress Bar */}
                    <div style={{ height: '14px', background: 'var(--bg-void)', borderRadius: '9999px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-inset)' }}>
                      {fuelExp > 0 && (
                        <div style={{ width: `${fuelPctVal}%`, background: 'var(--brand)', borderRight: '2px solid var(--bg-card)', transition: 'var(--t-base)' }} />
                      )}
                      {tollExp > 0 && (
                        <div style={{ width: `${tollPctVal}%`, background: 'var(--accent-warning)', borderRight: '2px solid var(--bg-card)', transition: 'var(--t-base)' }} />
                      )}
                      {driverExp > 0 && (
                        <div style={{ width: `${driverPctVal}%`, background: 'var(--accent-info)', borderRight: '2px solid var(--bg-card)', transition: 'var(--t-base)' }} />
                      )}
                      {miscExp > 0 && (
                        <div style={{ width: `${miscPctVal}%`, background: 'var(--accent-violet)', transition: 'var(--t-base)' }} />
                      )}
                    </div>
                    {/* Inline Legend Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '10px', fontSize: '0.78rem' }}>
                      {fuelExp > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)' }} />
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Fuel Expenses:</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{fuelPctVal}% (₹{fuelExp.toLocaleString('en-IN')})</span>
                        </div>
                      )}
                      {tollExp > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-warning)' }} />
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Tolls (FASTag):</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{tollPctVal}% (₹{tollExp.toLocaleString('en-IN')})</span>
                        </div>
                      )}
                      {driverExp > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-info)' }} />
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Driver Advance:</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{driverPctVal}% (₹{driverExp.toLocaleString('en-IN')})</span>
                        </div>
                      )}
                      {miscExp > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-violet)' }} />
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Misc/Claims:</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{miscPctVal}% (₹{miscExp.toLocaleString('en-IN')})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Legend ledger cards */}
                <div className="dashboard-ledger-grid">
                  {[
                    { label: 'Revenue (Invoiced)', val: totalRev, color: 'var(--text-primary)' },
                    { label: 'Fuel Expenses', val: fuelExp, color: 'var(--brand)' },
                    { label: 'Tolls (FASTag)', val: tollExp, color: 'var(--accent-warning)' },
                    { label: 'Driver Batta/Cash', val: driverExp, color: 'var(--accent-info)' },
                    { label: 'Net Profit Margin', val: mtdNetProfit, color: 'var(--accent-success)' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '6px', borderLeft: `3px solid ${item.color}` }}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.label}</p>
                      <p style={{ fontSize: '0.98rem', fontWeight: '800', marginTop: '2px', fontFamily: 'var(--font-display)' }}>₹{item.val?.toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No commercial logs in this branch context to calculate financial ratios.</p>
        )}
      </div>

      {/* DETAILED FTL VS PTL STATISTICS (User Comment: "tell everything about both FTL and PTL") */}
      <div className="dashboard-split-grid">
        
        {/* FTL Performance Cockpit */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Truck size={17} style={{ color: 'var(--brand)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800' }}>Full Truck Load (FTL) Operations</h3>
          </div>
          
          <div className="dashboard-mini-grid">
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FTL Dispatches</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--brand-light)', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                {ftlTrips.length} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '400' }}>trips</span>
              </p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active In-Transit</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--brand-light)', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                {ftlActive} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '400' }}>running</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>FTL Gross Revenue</span>
              <span style={{ fontWeight: '700' }}>₹{ftlRev.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Trip Expenditures</span>
              <span style={{ fontWeight: '700', color: 'var(--accent-danger)' }}>− ₹{ftlExp.toLocaleString('en-IN')}</span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
              <span>FTL Settle Profit</span>
              <span style={{ color: 'var(--accent-success)' }}>₹{ftlProfit.toLocaleString('en-IN')} ({ftlMargin}%)</span>
            </div>
          </div>
        </div>

        {/* PTL Performance Cockpit */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Layers size={17} style={{ color: 'var(--accent-info)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800' }}>Part Truck Load (PTL) Consignments</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PTL Lorry Receipts (LRs)</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-cyan)', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                {ptlLrs.length} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '400' }}>items</span>
              </p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tonnage & Article Count</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-cyan)', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                {ptlPackages} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '400' }}>bxs ({ptlWeight?.toLocaleString()} kg)</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>PTL Booked Revenue</span>
              <span style={{ fontWeight: '700' }}>₹{ptlRev.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Allocated Line-Haul Cost</span>
              <span style={{ fontWeight: '700', color: 'var(--accent-danger)' }}>− ₹{manifestCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
              <span>Allocated Net Margin</span>
              <span style={{ color: 'var(--accent-success)' }}>₹{ptlProfit.toLocaleString('en-IN')} ({ptlMargin}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* RECENT TRANSACTIONS & BOOKINGS LIST */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div className="section-header">
          <h3 className="section-title">
            <FileText size={16} style={{ color: 'var(--brand)' }} />
            Recent Consolidated Registry
          </h3>
          
          {/* Tabs for Transaction List */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'all', label: 'All Transactions' },
              { id: 'ftl', label: 'FTL Trips Only' },
              { id: 'ptl', label: 'PTL Consignments' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setTransactionFilter(tab.id)}
                className={`toggle-btn ${transactionFilter === tab.id ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                {['LR / Trip Ref', 'Client / Party', 'Route Lane', 'Category', 'Hauled Qty / Weight', 'Total Value (₹)', 'Status', 'Date'].map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {finalRecentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px' }}>
                    No recent transaction entries found for this branch context.
                  </td>
                </tr>
              ) : finalRecentTransactions.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '700', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
                    {item.lrNo || item.id}
                  </td>
                  <td>{item.consignor || item.client}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {item.route}
                  </td>
                  <td>
                    <span className={`badge ${item.type === 'FTL' ? 'badge-brand' : 'badge-cyan'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-display)' }}>{item.qty}</td>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>₹{item.freight?.toLocaleString('en-IN')}</td>
                  <td>
                            <span className={`badge ${
                      item.status === 'Delivered' || item.status === 'Closed' ? 'badge-success' :
                      item.status === 'Booked' || item.status === 'Started' ? 'badge-cyan' :
                      item.status === 'AtHub' || item.status === 'InTransit' ? 'badge-brand' : 'badge-warning'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* --- ADD NEW HUB MODAL --- */}
      {showAddHubModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <form 
            onSubmit={handleAddHub}
            className="glass-panel animate-scale-up" 
            style={{
              width: '100%', maxWidth: '480px',
              padding: '26px', borderRadius: '16px',
              display: 'flex', flexDirection: 'column', gap: '18px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--brand-light)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={17} /> Register New Hub / Node
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddHubModal(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="label-premium">Node / Branch Name</label>
              <input 
                type="text" 
                className="input-premium" 
                required
                placeholder="e.g. Kolkata Hub, Chennai Branch"
                value={newHubName}
                onChange={e => setNewHubName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
              <div>
                <label className="label-premium">ID Code (Unique)</label>
                <input 
                  type="text" 
                  className="input-premium" 
                  required
                  placeholder="e.g. CCU, MAA"
                  value={newHubId}
                  onChange={e => setNewHubId(e.target.value)}
                />
              </div>
              <div>
                <label className="label-premium">Node Type</label>
                <select 
                  className="input-premium"
                  value={newHubType}
                  onChange={e => setNewHubType(e.target.value)}
                >
                  <option value="hub">Hub Node</option>
                  <option value="branch">Branch Office</option>
                  <option value="warehouse">Warehouse Storage</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label-premium">GSTIN (15-digit)</label>
              <input 
                type="text" 
                className="input-premium" 
                required
                placeholder="e.g. 19AAAAA1111A1Z1"
                value={newHubGstin}
                onChange={e => setNewHubGstin(e.target.value)}
              />
            </div>

            <div>
              <label className="label-premium">Node Physical Address</label>
              <textarea 
                className="input-premium" 
                rows="2"
                placeholder="Enter postal warehouse/office address..."
                style={{ resize: 'none' }}
                value={newHubAddress}
                onChange={e => setNewHubAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ flex: 1, justifyContent: 'center', padding: '11px' }}
              >
                Create Node
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddHubModal(false)}
                className="toggle-btn" 
                style={{ flex: 1, justifyContent: 'center', padding: '11px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
