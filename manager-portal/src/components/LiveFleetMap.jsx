import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, Navigation, Activity, AlertTriangle, Play, Pause, RotateCcw, 
  Phone, MessageSquare, Share2, ShieldAlert, CheckCircle, Clock, 
  Layers, MapPin, Gauge, Fuel, Battery, Radio, Eye, Filter, Search,
  ChevronRight, ArrowUpRight, Zap
} from 'lucide-react';

// Standard Indian Logistics Hub & City Coordinates
const CITY_COORDINATES = {
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777],
  'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946],
  'chennai': [13.0827, 80.2707],
  'hyderabad': [17.3850, 78.4867],
  'kolkata': [22.5726, 88.3639],
  'pune': [18.5204, 73.8567],
  'ahmedabad': [23.0225, 72.5714],
  'jaipur': [26.9124, 75.7873],
  'lucknow': [26.8467, 80.9462],
  'kanpur': [26.4499, 80.3319],
  'nagpur': [21.1458, 79.0882],
  'indore': [22.7196, 75.8577],
  'bhopal': [23.2599, 77.4126],
  'patna': [25.5941, 85.1376],
  'vadodara': [22.3072, 73.1812],
  'surat': [21.1702, 72.8311],
  'ludhiana': [30.9010, 75.8573],
  'chandigarh': [30.7333, 76.7794],
  'coimbatore': [11.0168, 76.9558],
  'kochi': [9.9312, 76.2673],
  'visakhapatnam': [17.6868, 83.2185],
  'guwahati': [26.1445, 91.7362],
  'bhubaneswar': [20.2961, 85.8245],
  'raipur': [21.2514, 81.6296],
  'ranchi': [23.3441, 85.3096],
  'varanasi': [25.3176, 82.9739],
  'amritsar': [31.6340, 74.8723],
  'navi mumbai': [19.0330, 73.0297],
  'noida': [28.5355, 77.3910],
  'gurgaon': [28.4595, 77.0266],
  'gurugram': [28.4595, 77.0266],
  'faridabad': [28.4089, 77.3178],
  'ghaziabad': [28.6692, 77.4538]
};

const STATE_COORDINATES = {
  'DL': [28.6139, 77.2090],
  'HR': [28.4595, 77.0266],
  'MH': [19.0760, 72.8777],
  'KA': [12.9716, 77.5946],
  'TN': [13.0827, 80.2707],
  'TS': [17.3850, 78.4867],
  'AP': [16.5062, 80.6480],
  'GJ': [23.0225, 72.5714],
  'WB': [22.5726, 88.3639],
  'UP': [26.8467, 80.9462],
  'RJ': [26.9124, 75.7873],
  'MP': [22.7196, 75.8577],
  'PB': [30.9010, 75.8573],
  'KL': [9.9312, 76.2673],
  'BR': [25.5941, 85.1376],
  'OD': [20.2961, 85.8245],
  'OR': [20.2961, 85.8245],
  'CG': [21.2514, 81.6296],
  'JH': [23.3441, 85.3096],
  'UK': [30.3165, 78.0322],
  'UA': [30.3165, 78.0322],
  'HP': [31.1048, 77.1734],
  'AS': [26.1445, 91.7362],
  'GA': [15.2993, 74.1240]
};

function getCoordsForPlace(placeStr, fallbackCoords = [28.6139, 77.2090]) {
  if (!placeStr) return fallbackCoords;
  const clean = placeStr.toLowerCase().replace(/hub|terminal|depot|wh|warehouse|central|branch/g, '').trim();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }
  return fallbackCoords;
}

function getCoordsForRegNo(regNo) {
  if (!regNo) return [28.6139, 77.2090];
  const stateCode = regNo.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  return STATE_COORDINATES[stateCode] || [28.6139, 77.2090];
}

function generateRouteCoords(start, end, numPoints = 6) {
  if (!start || !end) return [];
  if (start[0] === end[0] && start[1] === end[1]) return [start, end];
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const curve = Math.sin(t * Math.PI) * 0.12;
    const lat = Number((start[0] + (end[0] - start[0]) * t + curve).toFixed(4));
    const lng = Number((start[1] + (end[1] - start[1]) * t - curve).toFixed(4));
    points.push([lat, lng]);
  }
  return points;
}

export default function LiveFleetMap({ trips = [], trucks = [], drivers = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const playbackTimerRef = useRef(null);

  // --- Active State & Filters ---
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, moving, idle, alert, unloading
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // --- Route Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(65); // 0 to 100%
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // --- Dynamic Fleet Vehicles from Registered Trucks, Trips, and Drivers ---
  const [fleetVehicles, setFleetVehicles] = useState([]);

  useEffect(() => {
    if (!trucks || trucks.length === 0) {
      setFleetVehicles([]);
      setSelectedTruckId(null);
      return;
    }

    const built = trucks.map((truck, idx) => {
      const reg = (truck.reg_no || truck.regNo || '').toUpperCase().trim();
      const truckId = truck.id || `TRK-${idx + 1}`;
      
      // Match active trip for this truck
      const activeTrip = trips.find(t => {
        const tripTruck = (t.truck_no || t.truckNo || '').toUpperCase().trim();
        const tripReg = (t.vehicle_no || t.vehicleNo || '').toUpperCase().trim();
        const matchesTruck = (tripTruck && tripTruck === reg) || (tripReg && tripReg === reg) || (t.truckId && String(t.truckId) === String(truck.id));
        return matchesTruck && t.status !== 'Delivered' && t.status !== 'Cancelled';
      });

      // Find driver name & phone
      let driverName = 'Unassigned';
      let driverPhone = '+91 98000 00000';
      if (activeTrip) {
        if (activeTrip.driver_name || activeTrip.driverName) {
          driverName = activeTrip.driver_name || activeTrip.driverName;
        }
        const tripDriverId = activeTrip.driver_id || activeTrip.driverId;
        const matchedDriver = drivers.find(d => 
          (tripDriverId && String(d.id) === String(tripDriverId)) ||
          (driverName && (d.name || '').toLowerCase() === driverName.toLowerCase())
        );
        if (matchedDriver) {
          driverName = matchedDriver.name || driverName;
          driverPhone = matchedDriver.phone || driverPhone;
        }
      } else {
        const matchedDriver = drivers.find(d => 
          (d.assignedTruck && d.assignedTruck.toUpperCase() === reg) ||
          (truck.driver_id && String(d.id) === String(truck.driver_id))
        );
        if (matchedDriver) {
          driverName = matchedDriver.name;
          driverPhone = matchedDriver.phone || driverPhone;
        }
      }

      const defaultDepotCoords = getCoordsForRegNo(reg);

      let origin = 'Base Depot';
      let destination = 'Available for Dispatch';
      let status = 'idle';
      let speed = 0;
      let alert = null;
      let routeCoords = [defaultDepotCoords];
      let currentCoords = defaultDepotCoords;

      if (truck.status === 'Maintenance') {
        status = 'alert';
        alert = 'Vehicle in maintenance / compliance inspection';
      } else if (activeTrip) {
        origin = activeTrip.origin || 'Origin Hub';
        destination = activeTrip.destination || 'Destination Hub';
        const startCoords = getCoordsForPlace(origin, defaultDepotCoords);
        const endCoords = getCoordsForPlace(destination, [19.0760, 72.8777]);
        routeCoords = generateRouteCoords(startCoords, endCoords, 6);
        
        if (activeTrip.status === 'InTransit') {
          status = 'moving';
          speed = 58 + ((idx * 7) % 18); // realistic cruising speed
          const currentIdx = Math.min(routeCoords.length - 1, Math.max(1, Math.floor(routeCoords.length / 2)));
          currentCoords = routeCoords[currentIdx] || startCoords;
        } else if (activeTrip.status === 'Planned') {
          status = 'idle';
          speed = 0;
          currentCoords = startCoords;
        } else {
          status = 'unloading';
          speed = 0;
          currentCoords = endCoords;
        }
      }

      return {
        id: truckId,
        regNo: reg,
        model: truck.model || `${truck.size || '32 Ft'} ${truck.body_type || truck.bodyType || 'Container'}`,
        driverName,
        driverPhone,
        tripId: activeTrip ? (activeTrip.id || activeTrip.trip_id) : 'No Active Trip',
        origin,
        destination,
        status,
        speed,
        heading: 180,
        fuelPercent: 65 + ((idx * 11) % 30),
        batteryPercent: 80 + ((idx * 5) % 18),
        temperature: null,
        fastagBalance: truck.fastag_balance || truck.fastagBalance || (2500 + ((idx * 850) % 3000)),
        currentOdo: truck.current_odo || truck.currentOdo || (45000 + idx * 12300),
        lastPing: 'Just now',
        alert,
        currentCoords,
        routeCoords
      };
    });

    setFleetVehicles(built);
    if (built.length > 0) {
      setSelectedTruckId(prev => (built.some(v => v.id === prev) ? prev : built[0].id));
    } else {
      setSelectedTruckId(null);
    }
  }, [trucks, trips, drivers]);

  const activeVehicle = fleetVehicles.find(v => v.id === selectedTruckId) || fleetVehicles[0] || null;

  // --- Real-Time Simulation Interval ---
  useEffect(() => {
    const interval = setInterval(() => {
      setFleetVehicles(prev => prev.map(v => {
        if (v.status === 'moving') {
          const speedVariance = (Math.random() * 4 - 2);
          const newSpeed = Math.max(45, Math.min(75, Math.round(v.speed + speedVariance)));
          return {
            ...v,
            speed: newSpeed,
            lastPing: 'Just now'
          };
        }
        return v;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- Route Playback Animation Logic ---
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return Math.min(100, prev + 1 * playbackSpeed);
        });
      }, 300);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // --- Leaflet Map Lifecycle & Marker Rendering ---
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!window.L) {
      console.warn('Leaflet (window.L) not loaded');
      return;
    }

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: [21.5, 78.5],
        zoom: 5,
        zoomControl: true
      });

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Draw active vehicle route polyline
    if (activeVehicle && activeVehicle.routeCoords && activeVehicle.routeCoords.length > 1) {
      const cutoffIdx = Math.floor((activeVehicle.routeCoords.length - 1) * (playbackProgress / 100));
      const completedCoords = activeVehicle.routeCoords.slice(0, cutoffIdx + 1);
      const remainingCoords = activeVehicle.routeCoords.slice(cutoffIdx);

      if (completedCoords.length > 1) {
        window.L.polyline(completedCoords, {
          color: '#10b981',
          weight: 5,
          opacity: 0.85
        }).addTo(map);
      }

      if (remainingCoords.length > 0) {
        const fullRemaining = [completedCoords[completedCoords.length - 1] || activeVehicle.routeCoords[0], ...remainingCoords];
        polylineRef.current = window.L.polyline(fullRemaining, {
          color: '#64748b',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.6
        }).addTo(map);
      }
    }

    // Add Vehicle Markers to Map
    fleetVehicles.forEach(v => {
      if (!v.currentCoords) return;
      const isSelected = v.id === selectedTruckId;
      const statusColor = 
        v.status === 'moving' ? '#10b981' : 
        v.status === 'alert' ? '#ef4444' : 
        v.status === 'idle' ? '#f59e0b' : '#3b82f6';

      const regParts = (v.regNo || 'TRK').split('-');
      const regLabel = regParts.length >= 2 ? `${regParts[0]}-${regParts[1]}` : (v.regNo || 'TRK');

      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
          ${v.status === 'moving' ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${statusColor}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
          <div style="
            width: ${isSelected ? '36px' : '30px'}; 
            height: ${isSelected ? '36px' : '30px'}; 
            border-radius: 50%; 
            background: ${statusColor}; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: #fff; 
            border: ${isSelected ? '3px solid #ffffff' : '2px solid #ffffff'}; 
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            🚚
          </div>
          <div style="
            position: absolute; 
            bottom: -18px; 
            white-space: nowrap; 
            background: rgba(15, 23, 42, 0.9); 
            color: #fff; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-size: 10px; 
            font-weight: 600; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            pointer-events: none;
          ">
            ${regLabel} • ${v.speed} km/h
          </div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-fleet-marker',
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      let markerPos = v.currentCoords;
      if (isSelected && v.routeCoords && v.routeCoords.length > 1) {
        const idx = Math.min(
          v.routeCoords.length - 1,
          Math.floor((v.routeCoords.length - 1) * (playbackProgress / 100))
        );
        markerPos = v.routeCoords[idx] || v.currentCoords;
      }

      const marker = window.L.marker(markerPos, { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedTruckId(v.id);
        map.panTo(markerPos, { animate: true, duration: 0.8 });
      });

      markersRef.current[v.id] = marker;
    });

    if (activeVehicle && activeVehicle.currentCoords) {
      map.panTo(activeVehicle.currentCoords, { animate: true });
    }

  }, [fleetVehicles, selectedTruckId, playbackProgress]);

  // --- Filtered Vehicles List ---
  const filteredVehicles = fleetVehicles.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (v.regNo || '').toLowerCase().includes(q) ||
        (v.driverName || '').toLowerCase().includes(q) ||
        (v.tripId || '').toLowerCase().includes(q) ||
        (v.origin || '').toLowerCase().includes(q) ||
        (v.destination || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'var(--bg-card, #1e293b)',
          color: 'var(--text-main, #f8fafc)',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          borderLeft: '4px solid var(--accent-success, #10b981)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <CheckCircle size={18} color="var(--accent-success, #10b981)" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header & Fleet Status Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* Total Active */}
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-primary, #3b82f6)' }}>
          <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '10px', color: '#3b82f6' }}>
            <Truck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Fleet</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fleetVehicles.length} Trucks</div>
          </div>
        </div>

        {/* Moving / In-Transit */}
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-success, #10b981)' }}>
          <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '10px', color: '#10b981' }}>
            <Navigation size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>In Transit</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fleetVehicles.filter(v => v.status === 'moving').length} Moving</div>
          </div>
        </div>

        {/* Alerts / Violations */}
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-danger, #ef4444)' }}>
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '10px', color: '#ef4444' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Alerts & Speeding</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{fleetVehicles.filter(v => v.status === 'alert').length} Exceptions</div>
          </div>
        </div>

        {/* Idle / Unloading */}
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-warning, #f59e0b)' }}>
          <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '10px', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Idle / Hub Stop</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fleetVehicles.filter(v => v.status === 'idle' || v.status === 'unloading').length} Trucks</div>
          </div>
        </div>
      </div>

      {/* Main GPS Tracking Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr 340px',
        gap: '1.25rem',
        minHeight: '620px',
        height: 'calc(100vh - 280px)'
      }}>
        {/* LEFT COLUMN: Vehicle Selector & Filters */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={16} color="var(--accent-primary)" /> Live Dispatch Radar
            </h4>
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Live GPS</span>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search truck no, driver, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem' }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'moving', label: 'Moving' },
              { id: 'idle', label: 'Idle' },
              { id: 'alert', label: 'Alert' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`btn btn-sm ${statusFilter === f.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.72rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Vehicle List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
            {filteredVehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <Truck size={36} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600 }}>No fleet vehicles found</div>
                <p style={{ fontSize: '0.72rem', marginTop: '4px' }}>
                  {trucks.length === 0 
                    ? 'Add trucks in Fleet Management to begin live telemetry tracking.'
                    : 'No vehicles match current search filter.'}
                </p>
              </div>
            ) : (
              filteredVehicles.map(v => {
                const isSelected = v.id === selectedTruckId;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedTruckId(v.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface, rgba(255,255,255,0.03))',
                      border: isSelected ? '1.5px solid var(--accent-primary, #3b82f6)' : '1px solid var(--border-color, rgba(255,255,255,0.06))',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{v.regNo}</span>
                      <span className={`badge badge-${v.status === 'moving' ? 'success' : v.status === 'alert' ? 'danger' : v.status === 'idle' ? 'warning' : 'info'}`} style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                        {v.status === 'moving' ? `${v.speed} km/h` : v.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{v.origin}</span>
                      <span>→</span>
                      <span>{v.destination}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span>👤 {v.driverName}</span>
                      <span>⏱ {v.lastPing}</span>
                    </div>
                    {v.alert && (
                      <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> {v.alert.substring(0, 32)}...
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Interactive GPS Map & Route Replay Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Leaflet Map Box */}
          <div className="card" style={{ flex: 1, padding: '4px', position: 'relative', overflow: 'hidden', minHeight: '400px' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: '6px' }} />

            {/* Floating Map Legend Overlay */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.72rem',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '2px', color: '#94a3b8' }}>LIVE MAP STATUS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Moving
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Over-speeding / Alert
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Idle / Stoppage
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span> Hub Unloading
              </div>
            </div>
          </div>

          {/* Route Playback & Breadcrumb Replay Console */}
          {activeVehicle ? (
            <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title={isPlaying ? "Pause Route Replay" : "Play Route Replay"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => { setPlaybackProgress(0); setIsPlaying(false); }}
                  title="Reset Replay"
                  style={{ padding: '6px' }}
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* Playback Slider */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span>🚩 {activeVehicle.origin}</span>
                  <span style={{ color: 'var(--accent-primary)' }}>Route Replay: {playbackProgress}%</span>
                  <span>🏁 {activeVehicle.destination}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={playbackProgress}
                  onChange={(e) => setPlaybackProgress(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #3b82f6)' }}
                />
              </div>

              {/* Speed Multiplier */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {[1, 2, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`btn btn-sm ${playbackSpeed === s ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT COLUMN: Real-Time Telemetry HUD & Dispatch Control Actions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', overflowY: 'auto' }}>
          {activeVehicle ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{activeVehicle.regNo}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeVehicle.model}</div>
                </div>
                <span className={`badge badge-${activeVehicle.status === 'moving' ? 'success' : activeVehicle.status === 'alert' ? 'danger' : 'warning'}`}>
                  {activeVehicle.status.toUpperCase()}
                </span>
              </div>

              {/* Active Trip Badge */}
              <div style={{ background: 'var(--bg-surface, rgba(255,255,255,0.03))', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Trip</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>{activeVehicle.tripId}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', marginTop: '4px' }}>
                  <span>{activeVehicle.origin}</span>
                  <span>➔</span>
                  <span>{activeVehicle.destination}</span>
                </div>
              </div>

              {/* Telemetry Gauge Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {/* Speed Gauge */}
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <Gauge size={14} color="#3b82f6" /> Current Speed
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', color: activeVehicle.speed > 75 ? '#ef4444' : 'inherit' }}>
                    {activeVehicle.speed} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>km/h</span>
                  </div>
                </div>

                {/* Fuel Level */}
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <Fuel size={14} color="#10b981" /> Fuel Level
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                    {activeVehicle.fuelPercent}%
                  </div>
                </div>

                {/* Battery Level */}
                <div style={{ background: 'var(--bg-surface, rgba(255,255,255,0.03))', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <Battery size={14} /> Battery
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                    {activeVehicle.batteryPercent}%
                  </div>
                </div>

                {/* FASTag Balance */}
                <div style={{ background: 'var(--bg-surface, rgba(255,255,255,0.03))', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <Zap size={14} color="#f59e0b" /> FASTag Toll
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: '#f59e0b' }}>
                    ₹{Number(activeVehicle.fastagBalance).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Alert Callout if present */}
              {activeVehicle.alert && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1.5px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '2px' }}>DISPATCH EXCEPTION ALERT</div>
                    {activeVehicle.alert}
                  </div>
                </div>
              )}

              {/* Assigned Driver Profile Card */}
              <div style={{ background: 'var(--bg-surface, rgba(255,255,255,0.03))', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Driver</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{activeVehicle.driverName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activeVehicle.driverPhone}</div>
                  </div>
                  <span className={`badge ${activeVehicle.driverName !== 'Unassigned' ? 'badge-success' : 'badge-ghost'}`} style={{ fontSize: '0.65rem' }}>
                    {activeVehicle.driverName !== 'Unassigned' ? 'On-Duty' : 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Dispatcher Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Dispatcher Quick Actions</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      if (!activeVehicle.driverPhone || activeVehicle.driverName === 'Unassigned') {
                        showToast('No driver phone assigned');
                        return;
                      }
                      window.open(`https://wa.me/${activeVehicle.driverPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${activeVehicle.driverName}, this is LogiSync Dispatch regarding trip ${activeVehicle.tripId}. Please confirm your current ETA.`)}`, '_blank');
                      showToast(`Opened WhatsApp chat with ${activeVehicle.driverName}`);
                    }}
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <MessageSquare size={14} color="#25D366" /> WhatsApp
                  </button>

                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      showToast(`Simulating direct voice call to ${activeVehicle.driverPhone}`);
                    }}
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Phone size={14} color="#3b82f6" /> Call Driver
                  </button>
                </div>

                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    const trackingUrl = `https://temp-aa4db.web.app/track/${activeVehicle.tripId}`;
                    navigator.clipboard?.writeText(trackingUrl);
                    showToast(`Copied Live Tracking Link for ${activeVehicle.tripId} to clipboard!`);
                  }}
                  style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Share2 size={14} /> Share Public Live Tracking Link
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--text-muted)', gap: '12px', padding: '1rem' }}>
              <Truck size={48} style={{ opacity: 0.3 }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>No Fleet Vehicles</div>
              <p style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                {trucks.length === 0
                  ? 'No trucks are registered in the fleet yet. Add new trucks in Fleet Management to monitor live GPS telemetry.'
                  : 'Select a truck from the left radar panel to inspect live telemetry and route tracking.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
