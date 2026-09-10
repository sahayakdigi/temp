import { useState } from 'react';
import { 
  Truck, Users, PlusCircle, CheckCircle, Activity, Wrench, AlertTriangle, 
  Ban, Check, X, Edit, Paperclip, Eye, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { api } from '../services/api';

export default function FleetManagement({ trucks, setTrucks, drivers, setDrivers }) {
  const [activeSubTab, setActiveSubTab] = useState('trucks'); // 'trucks' | 'drivers' | 'maintenance'

  const STANDARD_TRUCK_SIZES = {
    '19 Feet': { capacityKg: 7000, cft: 900, maxBoxes: 180, model: 'Tata LPT 1916' },
    'Tata Ace (8 Ft)': { capacityKg: 1000, cft: 150, maxBoxes: 30, model: 'Tata Ace' },
    'Pickup Dost (9 Ft)': { capacityKg: 1500, cft: 250, maxBoxes: 50, model: 'Leyland Dost' },
    '14 Feet': { capacityKg: 4000, cft: 500, maxBoxes: 100, model: 'Eicher Pro 2049' },
    '17 Feet': { capacityKg: 5000, cft: 700, maxBoxes: 140, model: 'Eicher Pro 2059' },
    '24 Feet': { capacityKg: 12000, cft: 1200, maxBoxes: 240, model: 'Tata LPT 2418' },
    '32 Feet SX': { capacityKg: 15000, cft: 1800, maxBoxes: 360, model: 'Leyland 3220 SX' },
    '32 Feet MX': { capacityKg: 20000, cft: 2200, maxBoxes: 440, model: 'Tata LPT 3118 MX' },
    'Custom': { capacityKg: 20000, cft: 900, maxBoxes: 180, model: '' }
  };

  // --- Add Vehicle Form States ---
  const [regNo, setRegNo]           = useState('');
  const [model, setModel]           = useState('Tata LPT 1916');
  const [capacityKg, setCapacityKg] = useState(7000);
  const [ownership, setOwnership]   = useState('own');
  const [expiryRC, setExpiryRC]     = useState('2028-12-10');
  const [expiryIns, setExpiryIns]   = useState('2026-12-10');
  const [permit, setPermit]         = useState('National');
  const [bodyType, setBodyType]     = useState('Container');
  const [size, setSize]             = useState('19 Feet');
  const [cft, setCft]               = useState(900);
  const [maxBoxes, setMaxBoxes]     = useState(180);

  // --- New Vehicle compliance & telemetry fields ---
  const [expiryFC, setExpiryFC] = useState('2027-05-18');
  const [expiryPUC, setExpiryPUC] = useState('2026-11-18');
  const [expiryRoadTax, setExpiryRoadTax] = useState('2027-10-18');
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [fastagId, setFastagId] = useState('');
  const [fastagBalance, setFastagBalance] = useState(2500);
  const [gpsImei, setGpsImei] = useState('');
  const [currentOdo, setCurrentOdo] = useState(94200);
  const [fuelEfficiency, setFuelEfficiency] = useState(4.2);
  const [yearManufacture, setYearManufacture] = useState(2022);

  // Mock File Storage States (Stores simulated AWS S3 file urls)
  const [fcDocUrl, setFcDocUrl] = useState('');
  const [pucDocUrl, setPucDocUrl] = useState('');
  const [roadTaxDocUrl, setRoadTaxDocUrl] = useState('');

  // --- Add Driver Form States ---
  const [driverName, setDriverName] = useState('');
  const [licenceNo, setLicenceNo]   = useState('');
  const [phone, setPhone]           = useState('');
  const [licenceExp, setLicenceExp] = useState('2029-05-12');

  // --- New Driver KYC, Financial, and Ops fields ---
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [bgvStatus, setBgvStatus] = useState('Completed');
  const [bankAccNo, setBankAccNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [panNo, setPanNo] = useState('');
  const [experienceYears, setExperienceYears] = useState(6);
  const [preferredRoutes, setPreferredRoutes] = useState('Delhi, Mumbai');
  const [rating, setRating] = useState(4.8);

  const [aadhaarDocUrl, setAadhaarDocUrl] = useState('');
  const [panDocUrl, setPanDocUrl] = useState('');
  const [licenceDocUrl, setLicenceDocUrl] = useState('');

  // Form Collapsible Section Toggles
  const [truckComplianceOpen, setTruckComplianceOpen] = useState(false);
  const [truckTelemetryOpen, setTruckTelemetryOpen] = useState(false);
  const [driverKycOpen, setDriverKycOpen] = useState(false);
  const [driverFinOpen, setDriverFinOpen] = useState(false);
  const [driverOpsOpen, setDriverOpsOpen] = useState(false);

  // Document Viewer Overlay Modal
  const [activeViewerDoc, setActiveViewerDoc] = useState(null);

  // --- Add Maintenance Log States ---
  const [maintVehicle, setMaintVehicle] = useState(trucks[0]?.regNo || '');
  const [maintDate, setMaintDate]       = useState(new Date().toISOString().split('T')[0]);
  const [maintWorkDone, setMaintWorkDone] = useState('');
  const [maintCost, setMaintCost]       = useState(5000);
  const [maintOdo, setMaintOdo]         = useState(105000);

  const [successMsg, setSuccessMsg] = useState('');

  // --- Edit Expiry & Compliance Modal States ---
  const [editingTruck, setEditingTruck] = useState(null);
  const [editRcExpiry, setEditRcExpiry] = useState('');
  const [editInsExpiry, setEditInsExpiry] = useState('');
  const [editFcExpiry, setEditFcExpiry] = useState('');
  const [editPucExpiry, setEditPucExpiry] = useState('');
  const [editRoadTaxExpiry, setEditRoadTaxExpiry] = useState('');
  const [editFastagId, setEditFastagId] = useState('');
  const [editFastagBalance, setEditFastagBalance] = useState('');
  const [editGpsImei, setEditGpsImei] = useState('');
  const [editCurrentOdo, setEditCurrentOdo] = useState('');
  const [editFuelEfficiency, setEditFuelEfficiency] = useState('');
  const [editFcDocUrl, setEditFcDocUrl] = useState('');
  const [editPucDocUrl, setEditPucDocUrl] = useState('');
  const [editRoadTaxDocUrl, setEditRoadTaxDocUrl] = useState('');

  const [editingDriver, setEditingDriver] = useState(null);
  const [editLicenceExpiry, setEditLicenceExpiry] = useState('');
  const [editBgvStatus, setEditBgvStatus] = useState('');
  const [editPreferredRoutes, setEditPreferredRoutes] = useState('');
  const [editBankAccNo, setEditBankAccNo] = useState('');
  const [editBankIfsc, setEditBankIfsc] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [editAadhaarDocUrl, setEditAadhaarDocUrl] = useState('');
  const [editPanDocUrl, setEditPanDocUrl] = useState('');
  const [editLicenceDocUrl, setEditLicenceDocUrl] = useState('');

  const handleSaveTruckExpiries = (e) => {
    e.preventDefault();
    if (!editingTruck) return;
    
    const updates = {
      expiry_rc: editRcExpiry,
      expiry_ins: editInsExpiry,
      expiry_fc: editFcExpiry,
      expiry_puc: editPucExpiry,
      expiry_road_tax: editRoadTaxExpiry,
      fastag_id: editFastagId,
      fastag_balance: Number(editFastagBalance) || 0,
      gps_imei: editGpsImei,
      current_odo: Number(editCurrentOdo) || 0,
      fuel_efficiency: Number(editFuelEfficiency) || 0,
      fc_doc_url: editFcDocUrl,
      puc_doc_url: editPucDocUrl,
      road_tax_doc_url: editRoadTaxDocUrl
    };

    api.updateTruck(editingTruck.regNo, updates)
      .then(saved => {
        setTrucks(trucks.map(t => t.regNo === editingTruck.regNo ? saved : t));
        setSuccessMsg(`Compliance parameters updated for truck ${editingTruck.regNo}.`);
        setEditingTruck(null);
      })
      .catch(err => alert(`Failed: ${err.message}`));
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSaveDriverExpiry = (e) => {
    e.preventDefault();
    if (!editingDriver) return;

    const updates = {
      licence_exp: editLicenceExpiry,
      bgv_status: editBgvStatus,
      preferred_routes: editPreferredRoutes,
      bank_acc_no: editBankAccNo,
      bank_ifsc: editBankIfsc,
      upi_id: editUpiId,
      aadhaar_doc_url: editAadhaarDocUrl,
      pan_doc_url: editPanDocUrl,
      licence_doc_url: editLicenceDocUrl
    };

    api.updateDriver(editingDriver.id, updates)
      .then(saved => {
        setDrivers(drivers.map(d => d.id === editingDriver.id ? saved : d));
        setSuccessMsg(`Compliance and routing parameters updated for driver ${editingDriver.name}.`);
        setEditingDriver(null);
      })
      .catch(err => alert(`Failed: ${err.message}`));
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // --- Maintenance Logs Database State (FR-6.4) ---
  const [maintenanceLogs, setMaintenanceLogs] = useState([
    { id: 'MNT-2026-001', regNo: 'MH-12-Q-4567', serviceDate: '2026-05-15', workDone: 'Routine engine service & air filter replacement', cost: 6800, odoReading: 104500, status: 'Completed' },
    { id: 'MNT-2026-002', regNo: 'DL-01-A-1234', serviceDate: '2026-06-02', workDone: 'Front brake pads & disc skimming', cost: 12500, odoReading: 82100, status: 'Completed' }
  ]);

  // --- Date Compliance Audit Helper (FR-6.1 / FR-6.2) ---
  const checkCompliance = (expiryDateStr) => {
    if (!expiryDateStr) return { status: 'Valid', color: 'badge-success', label: 'Valid' };
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'Expired', color: 'badge-danger', label: 'Expired' };
    } else if (diffDays <= 60) {
      return { status: 'Warning', color: 'badge-warning', label: `Expiring (${diffDays}d)` };
    } else {
      return { status: 'Valid', color: 'badge-success', label: 'Valid' };
    }
  };

  const handleSizeChange = (selectedSize) => {
    setSize(selectedSize);
    const defaults = STANDARD_TRUCK_SIZES[selectedSize];
    if (defaults && selectedSize !== 'Custom') {
      setCapacityKg(defaults.capacityKg);
      setCft(defaults.cft);
      setMaxBoxes(defaults.maxBoxes);
      if (defaults.model) setModel(defaults.model);
    }
  };

  // Simulated File Upload handler
  const handleSimulatedFileUpload = (e, setDocUrl) => {
    const file = e.target.files[0];
    if (!file) return;
    // Set a simulated URL path
    setDocUrl(`https://temp-logistics-docs.s3.amazonaws.com/uploads/${file.name}`);
  };

  // --- Add Truck ---
  const handleAddTruck = (e) => {
    e.preventDefault();
    if (!regNo) return;
    
    const payload = {
      reg_no: regNo.toUpperCase().trim(),
      model,
      capacity_kg: Number(capacityKg),
      ownership,
      owner_id: null,
      status: 'Available',
      expiry_rc: expiryRC,
      expiry_ins: expiryIns,
      permit,
      body_type: bodyType,
      size,
      cft: Number(cft),
      max_boxes: Number(maxBoxes),
      // New Compliance & Telemetry fields
      expiry_fc: expiryFC,
      expiry_puc: expiryPUC,
      expiry_road_tax: expiryRoadTax,
      chassis_no: chassisNo,
      engine_no: engineNo,
      fastag_id: fastagId,
      fastag_balance: Number(fastagBalance) || 0,
      gps_imei: gpsImei,
      current_odo: Number(currentOdo) || 0,
      fuel_efficiency: Number(fuelEfficiency) || 0,
      year_manufacture: Number(yearManufacture) || 2022,
      fc_doc_url: fcDocUrl,
      puc_doc_url: pucDocUrl,
      road_tax_doc_url: roadTaxDocUrl
    };

    api.createTruck(payload)
      .then(saved => {
        setTrucks([saved, ...trucks]);
        setSuccessMsg(`Vehicle ${regNo.toUpperCase()} registered to fleet database.`);
        setRegNo('');
        setChassisNo('');
        setEngineNo('');
        setFastagId('');
        setGpsImei('');
        setFcDocUrl('');
        setPucDocUrl('');
        setRoadTaxDocUrl('');
      })
      .catch(err => alert(`Failed: ${err.message}`));
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // --- Add Driver ---
  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!driverName || !licenceNo || !phone) return;
    
    const payload = {
      name: driverName.trim(),
      licence_no: licenceNo.toUpperCase().trim(),
      phone: phone.trim(),
      status: 'Active',
      otp_status: 'Verified',
      licence_exp: licenceExp,
      // New fields
      aadhaar_no: aadhaarNo,
      emergency_name: emergencyName,
      emergency_phone: emergencyPhone,
      blood_group: bloodGroup,
      bgv_status: bgvStatus,
      bank_acc_no: bankAccNo,
      bank_ifsc: bankIfsc,
      upi_id: upiId,
      pan_no: panNo,
      experience_years: Number(experienceYears) || 0,
      preferred_routes: preferredRoutes,
      rating: Number(rating) || 5.0,
      aadhaar_doc_url: aadhaarDocUrl,
      pan_doc_url: panDocUrl,
      licence_doc_url: licenceDocUrl
    };

    api.createDriver(payload)
      .then(saved => {
        setDrivers([saved, ...drivers]);
        setSuccessMsg(`Driver ${driverName} registered successfully.`);
        setDriverName(''); setLicenceNo(''); setPhone('');
        setAadhaarNo(''); setEmergencyName(''); setEmergencyPhone('');
        setBankAccNo(''); setBankIfsc(''); setUpiId(''); setPanNo('');
        setAadhaarDocUrl(''); setPanDocUrl(''); setLicenceDocUrl('');
      })
      .catch(err => alert(`Failed: ${err.message}`));
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // --- Add Maintenance Log (FR-6.4) ---
  const handleAddMaintenance = (e) => {
    e.preventDefault();
    if (!maintVehicle || !maintWorkDone) return;

    const newLog = {
      id: `MNT-2026-0${maintenanceLogs.length + 1}`,
      regNo: maintVehicle,
      serviceDate: maintDate,
      workDone: maintWorkDone,
      cost: Number(maintCost),
      odoReading: Number(maintOdo),
      status: 'Completed'
    };

    setMaintenanceLogs([newLog, ...maintenanceLogs]);
    setTrucks(trucks.map(t => t.regNo === maintVehicle ? { ...t, status: 'Maintenance' } : t));
    
    setSuccessMsg(`Service event logged! Vehicle ${maintVehicle} flagged under Maintenance status.`);
    setMaintWorkDone('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // --- Deactivation & Suspension controls (FR-6.5) ---
  const toggleTruckStatus = (regNo, currentStatus) => {
    const nextStatus = currentStatus === 'Available' ? 'Suspended' : 'Available';
    api.updateTruck(regNo, { status: nextStatus })
      .then(saved => {
        setTrucks(trucks.map(t => t.regNo === regNo ? saved : t));
        setSuccessMsg(`Vehicle ${regNo} status updated to ${nextStatus}.`);
      })
      .catch(err => alert(`Failed: ${err.message}`));
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const toggleDriverStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Blacklisted' : 'Active';
    api.updateDriver(id, { status: nextStatus })
      .then(saved => {
        setDrivers(drivers.map(d => d.id === id ? saved : d));
        setSuccessMsg(`Driver ${id} status updated to ${nextStatus}.`);
      })
      .catch(err => alert(`Failed: ${err.message}`));
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const stats = [
    { label: 'Total Trucks',    value: trucks.length,                                           color: 'var(--brand)' },
    { label: 'Available Fleet', value: trucks.filter(t => t.status === 'Available').length,      color: 'var(--accent-success)' },
    { label: 'Maintenance / Out', value: trucks.filter(t => t.status !== 'Available').length,     color: 'var(--accent-danger)' },
    { label: 'Active Drivers',   value: drivers.filter(d => d.status === 'Active').length,        color: 'var(--accent-info)' },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '28px' }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Fleet & Driver Registry</h2>
          <p className="page-subtitle">Track truck inspections · Audit compliance expiry · Log vehicle maintenance services</p>
        </div>
        <div className="toggle-container">
          <button className={`toggle-btn ${activeSubTab === 'trucks' ? 'active' : ''}`} onClick={() => setActiveSubTab('trucks')}>
            <Truck size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
            Trucks ({trucks.length})
          </button>
          <button className={`toggle-btn ${activeSubTab === 'drivers' ? 'active' : ''}`} onClick={() => setActiveSubTab('drivers')}>
            <Users size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
            Drivers ({drivers.length})
          </button>
          <button className={`toggle-btn ${activeSubTab === 'maintenance' ? 'active' : ''}`} onClick={() => setActiveSubTab('maintenance')}>
            <Wrench size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
            Maintenance Logs
          </button>
        </div>
      </div>

      {/* Stats Cards Dashboard Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {stats.map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '4px', height: '40px', borderRadius: '4px', background: s.color, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: s.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance Warning Banner (FR-6.2) */}
      {(() => {
        const expiredTrucks = trucks.filter(t => 
          checkCompliance(t.expiryRC).status === 'Expired' || 
          checkCompliance(t.expiryIns).status === 'Expired' ||
          (t.expiryFC && checkCompliance(t.expiryFC).status === 'Expired') ||
          (t.expiryPUC && checkCompliance(t.expiryPUC).status === 'Expired')
        );
        const expiredDrivers = drivers.filter(d => checkCompliance(d.licenceExp).status === 'Expired');
        const totalComplianceIssues = expiredTrucks.length + expiredDrivers.length;

        return totalComplianceIssues > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '4px solid var(--accent-danger)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--accent-danger)' }} />
            <span style={{ fontSize: '0.84rem' }}>
              <strong>Compliance Alert:</strong> {totalComplianceIssues} assets have expired or warning-level transport documentation. Check the listings below and update immediately.
            </span>
          </div>
        );
      })()}

      {/* Success Banner */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {/* SUB TAB: TRUCKS */}
      {activeSubTab === 'trucks' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Add Truck Form */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <PlusCircle size={17} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Add New Truck</h3>
            </div>
            <form onSubmit={handleAddTruck} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Basic Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="label-premium">Registration Number</label>
                  <input type="text" required placeholder="e.g. MH-12-Q-4567" className="input-premium" value={regNo} onChange={e => setRegNo(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-premium">Body Type</label>
                    <select className="input-premium" value={bodyType} onChange={e => setBodyType(e.target.value)}>
                      <option value="Container">Container (Closed Box)</option>
                      <option value="Open Body">Open Body</option>
                      <option value="Tarpaulin">Tarpaulin / Half Body</option>
                      <option value="Flatbed">Flatbed</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-premium">Size Class</label>
                    <select className="input-premium" value={size} onChange={e => handleSizeChange(e.target.value)}>
                      {Object.keys(STANDARD_TRUCK_SIZES).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-premium">Model Type</label>
                    <input type="text" required placeholder="e.g. Tata LPT 3118" className="input-premium" value={model} onChange={e => setModel(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-premium">Capacity (kg)</label>
                    <input type="number" className="input-premium" value={capacityKg} onChange={e => setCapacityKg(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-premium">Volumetric Cap (CFT)</label>
                    <input type="number" className="input-premium" value={cft} onChange={e => setCft(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-premium">Max Boxes</label>
                    <input type="number" className="input-premium" value={maxBoxes} onChange={e => setMaxBoxes(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-premium">Ownership</label>
                    <select className="input-premium" value={ownership} onChange={e => setOwnership(e.target.value)}>
                      <option value="own">Own Fleet</option>
                      <option value="attached">Attached Lorry</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-premium">Permit Type</label>
                    <select className="input-premium" value={permit} onChange={e => setPermit(e.target.value)}>
                      <option value="National">National Permit</option>
                      <option value="State">State Permit</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-premium">RC Expiry Date</label>
                    <input type="date" className="input-premium" value={expiryRC} onChange={e => setExpiryRC(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-premium">Insurance Expiry Date</label>
                    <input type="date" className="input-premium" value={expiryIns} onChange={e => setExpiryIns(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Collapsible: Legal & Document uploads */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', marginTop: '4px' }}>
                <button 
                  type="button"
                  onClick={() => setTruckComplianceOpen(!truckComplianceOpen)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} className="text-brand" /> Legal Documents & Certificates</span>
                  {truckComplianceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {truckComplianceOpen && (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">Chassis Number</label>
                        <input type="text" placeholder="Chassis No" className="input-premium" value={chassisNo} onChange={e => setChassisNo(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-premium">Engine Number</label>
                        <input type="text" placeholder="Engine No" className="input-premium" value={engineNo} onChange={e => setEngineNo(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">FC Expiry Date</label>
                        <input type="date" className="input-premium" value={expiryFC} onChange={e => setExpiryFC(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-premium">PUC Expiry Date</label>
                        <input type="date" className="input-premium" value={expiryPUC} onChange={e => setExpiryPUC(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label-premium">Road Tax Validity</label>
                      <input type="date" className="input-premium" value={expiryRoadTax} onChange={e => setExpiryRoadTax(e.target.value)} />
                    </div>
                    {/* Simulated Document Uploads */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Simulate Document Attachments</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="label-premium" style={{ fontSize: '0.65rem' }}>FC Certificate</label>
                          <input type="file" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} onChange={e => handleSimulatedFileUpload(e, setFcDocUrl)} />
                        </div>
                        <div>
                          <label className="label-premium" style={{ fontSize: '0.65rem' }}>PUC Document</label>
                          <input type="file" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} onChange={e => handleSimulatedFileUpload(e, setPucDocUrl)} />
                        </div>
                      </div>
                      <div>
                        <label className="label-premium" style={{ fontSize: '0.65rem' }}>Road Tax Receipt</label>
                        <input type="file" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} onChange={e => handleSimulatedFileUpload(e, setRoadTaxDocUrl)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible: Telemetry & Performance */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                <button 
                  type="button"
                  onClick={() => setTruckTelemetryOpen(!truckTelemetryOpen)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} className="text-brand" /> Telemetry & Operations</span>
                  {truckTelemetryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {truckTelemetryOpen && (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">FASTag ID</label>
                        <input type="text" placeholder="FTG-9842" className="input-premium" value={fastagId} onChange={e => setFastagId(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-premium">Wallet Balance (₹)</label>
                        <input type="number" className="input-premium" value={fastagBalance} onChange={e => setFastagBalance(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label-premium">GPS Device IMEI</label>
                      <input type="text" placeholder="IMEI-35849..." className="input-premium" value={gpsImei} onChange={e => setGpsImei(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">Current Odo (km)</label>
                        <input type="number" className="input-premium" value={currentOdo} onChange={e => setCurrentOdo(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-premium">Mileage (km/L)</label>
                        <input type="number" step="0.1" className="input-premium" value={fuelEfficiency} onChange={e => setFuelEfficiency(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label-premium">Year of Manufacture</label>
                      <input type="number" className="input-premium" value={yearManufacture} onChange={e => setYearManufacture(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px' }}>
                Add Vehicle to Fleet
              </button>
            </form>
          </div>

          {/* Trucks Directory Table */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Activity size={17} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Active Fleet Status</h3>
              <span className="badge badge-brand" style={{ marginLeft: 'auto' }}>{trucks.length} vehicles</span>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', marginBottom: '6px' }}>
              <table className="table-premium">
                <thead>
                  <tr>
                    {['Reg Number', 'Model / Size', 'Chassis / Engine', 'FASTag / GPS', 'RC / Ins / FC / PUC', 'Doc Uploads', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {trucks.map(truck => {
                    const rcCompliance = checkCompliance(truck.expiryRC);
                    const insCompliance = checkCompliance(truck.expiryIns);
                    const fcCompliance = checkCompliance(truck.expiryFC);
                    const pucCompliance = checkCompliance(truck.expiryPUC);
                    
                    return (
                      <tr key={truck.regNo}>
                        <td style={{ fontWeight: '700', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>{truck.regNo}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{truck.model}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{truck.bodyType || 'Container'} · {truck.size || '19 Ft'}</div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>
                          <div>C: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{truck.chassisNo || 'N/A'}</span></div>
                          <div>E: <span style={{ color: 'var(--text-muted)' }}>{truck.engineNo || 'N/A'}</span></div>
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>
                          <div>Toll: <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>₹{truck.fastagBalance !== undefined ? truck.fastagBalance.toLocaleString() : '0'}</span></div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>IMEI: {truck.gpsImei || 'N/A'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>RC:</span>
                              <span className={`badge ${rcCompliance.color}`} style={{ padding: '0px 4px', fontSize: '0.6rem' }}>{rcCompliance.label}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Ins:</span>
                              <span className={`badge ${insCompliance.color}`} style={{ padding: '0px 4px', fontSize: '0.6rem' }}>{insCompliance.label}</span>
                            </span>
                            {truck.expiryFC && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>FC:</span>
                                <span className={`badge ${fcCompliance.color}`} style={{ padding: '0px 4px', fontSize: '0.6rem' }}>{fcCompliance.label}</span>
                              </span>
                            )}
                            {truck.expiryPUC && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>PUC:</span>
                                <span className={`badge ${pucCompliance.color}`} style={{ padding: '0px 4px', fontSize: '0.6rem' }}>{pucCompliance.label}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {/* Clipped certificate preview trigger icons */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {truck.fcDocUrl ? (
                              <button 
                                type="button" 
                                title="View Fitness Document"
                                onClick={() => setActiveViewerDoc({ title: 'Fitness Certificate', fileName: truck.fcDocUrl.split('/').pop(), url: truck.fcDocUrl })}
                                style={{ background: 'none', border: 'none', color: 'var(--brand-light)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Paperclip size={14} />
                              </button>
                            ) : null}
                            {truck.pucDocUrl ? (
                              <button 
                                type="button" 
                                title="View PUC Document"
                                onClick={() => setActiveViewerDoc({ title: 'PUC Certificate', fileName: truck.pucDocUrl.split('/').pop(), url: truck.pucDocUrl })}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Paperclip size={14} />
                              </button>
                            ) : null}
                            {!truck.fcDocUrl && !truck.pucDocUrl && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>No Docs</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            truck.status === 'Available' ? 'badge-success' : 
                            truck.status === 'Maintenance' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {truck.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button 
                              type="button"
                              title="Update Compliance details"
                              onClick={() => {
                                setEditingTruck(truck);
                                setEditRcExpiry(truck.expiryRC || '2028-12-10');
                                setEditInsExpiry(truck.expiryIns || '2026-12-10');
                                setEditFcExpiry(truck.expiryFC || '2027-05-18');
                                setEditPucExpiry(truck.expiryPUC || '2026-11-18');
                                setEditRoadTaxExpiry(truck.expiryRoadTax || '2027-10-18');
                                setEditFastagId(truck.fastagId || '');
                                setEditFastagBalance(truck.fastagBalance !== undefined ? truck.fastagBalance : 0);
                                setEditGpsImei(truck.gpsImei || '');
                                setEditCurrentOdo(truck.currentOdo || 0);
                                setEditFuelEfficiency(truck.fuelEfficiency || 0);
                                setEditFcDocUrl(truck.fcDocUrl || '');
                                setEditPucDocUrl(truck.pucDocUrl || '');
                                setEditRoadTaxDocUrl(truck.roadTaxDocUrl || '');
                              }}
                              className="btn-ghost"
                              style={{ padding: '4px 6px', fontSize: '0.7rem', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center', background: 'hsla(35, 95%, 55%, 0.1)', border: '1px solid hsla(35, 95%, 55%, 0.2)', borderRadius: '4px' }}
                            >
                              <Edit size={11} style={{ color: 'var(--brand)' }} /> Edit Info
                            </button>
                            {truck.status !== 'InTransit' && (
                              <button 
                                onClick={() => toggleTruckStatus(truck.regNo, truck.status)}
                                className="toggle-btn"
                                style={{ padding: '3.5px 10px', fontSize: '0.68rem', gap: '3px', borderColor: truck.status === 'Available' ? 'var(--accent-danger)' : 'var(--accent-success)', width: '100%', justifyContent: 'center' }}
                              >
                                {truck.status === 'Available' ? (
                                  <>
                                    <Ban size={10} style={{ color: 'var(--accent-danger)' }} /> Suspend
                                  </>
                                ) : (
                                  <>
                                    <Check size={10} style={{ color: 'var(--accent-success)' }} /> Release
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: DRIVERS */}
      {activeSubTab === 'drivers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Add Driver Form */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <PlusCircle size={17} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Register Driver</h3>
            </div>
            <form onSubmit={handleAddDriver} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label-premium">Driver Full Name</label>
                <input type="text" required placeholder="e.g. Gurmukh Singh" className="input-premium" value={driverName} onChange={e => setDriverName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label-premium">Phone Number</label>
                  <input type="text" required placeholder="9876543210" className="input-premium" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium">Licence Expiry</label>
                  <input type="date" className="input-premium" value={licenceExp} onChange={e => setLicenceExp(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-premium">Driving Licence No</label>
                <input type="text" required placeholder="e.g. DL-0720230045" className="input-premium" value={licenceNo} onChange={e => setLicenceNo(e.target.value)} />
              </div>

              {/* Collapsible Section: KYC & Personal details */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                <button 
                  type="button"
                  onClick={() => setDriverKycOpen(!driverKycOpen)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} className="text-brand" /> Personal KYC & Emergency Details</span>
                  {driverKycOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {driverKycOpen && (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">Aadhaar Card No</label>
                        <input type="text" placeholder="12-digit number" className="input-premium" value={aadhaarNo} onChange={e => setAadhaarNo(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-premium">PAN Card Number</label>
                        <input type="text" placeholder="ABCDE1234F" className="input-premium" value={panNo} onChange={e => setPanNo(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">Emergency Contact Name</label>
                        <input type="text" placeholder="Spouse/Parent Name" className="input-premium" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-premium">Emergency Phone</label>
                        <input type="text" placeholder="Emergency Mobile" className="input-premium" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">Blood Group</label>
                        <select className="input-premium" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-premium">Police BGV Status</label>
                        <select className="input-premium" value={bgvStatus} onChange={e => setBgvStatus(e.target.value)}>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Failed">Failed / Flagged</option>
                        </select>
                      </div>
                    </div>
                    {/* Simulated Document Attachments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Attach KYC Certificates</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="label-premium" style={{ fontSize: '0.65rem' }}>Aadhaar Copy</label>
                          <input type="file" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} onChange={e => handleSimulatedFileUpload(e, setAadhaarDocUrl)} />
                        </div>
                        <div>
                          <label className="label-premium" style={{ fontSize: '0.65rem' }}>PAN Copy</label>
                          <input type="file" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} onChange={e => handleSimulatedFileUpload(e, setPanDocUrl)} />
                        </div>
                      </div>
                      <div>
                        <label className="label-premium" style={{ fontSize: '0.65rem' }}>Driving License Copy</label>
                        <input type="file" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} onChange={e => handleSimulatedFileUpload(e, setLicenceDocUrl)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Section: Financial details */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                <button 
                  type="button"
                  onClick={() => setDriverFinOpen(!driverFinOpen)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Wrench size={14} className="text-brand" /> Bank Account & Payouts</span>
                  {driverFinOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {driverFinOpen && (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <label className="label-premium">Bank Account Number</label>
                      <input type="text" placeholder="Account No" className="input-premium" value={bankAccNo} onChange={e => setBankAccNo(e.target.value)} />
                    </div>
                    <div>
                      <label className="label-premium">Bank IFSC Code</label>
                      <input type="text" placeholder="IFSC Code" className="input-premium" value={bankIfsc} onChange={e => setBankIfsc(e.target.value)} />
                    </div>
                    <div>
                      <label className="label-premium">UPI ID / Phone Wallet ID</label>
                      <input type="text" placeholder="drivername@ybl" className="input-premium" value={upiId} onChange={e => setUpiId(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Section: Operations & Experience details */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                <button 
                  type="button"
                  onClick={() => setDriverOpsOpen(!driverOpsOpen)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} className="text-brand" /> Experience & Preferences</span>
                  {driverOpsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {driverOpsOpen && (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="label-premium">Experience (Years)</label>
                        <input type="number" className="input-premium" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-premium">Default Rating</label>
                        <input type="number" step="0.1" max="5" className="input-premium" value={rating} onChange={e => setRating(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label-premium">Preferred Routes / Lanes</label>
                      <input type="text" placeholder="e.g. Delhi, Mumbai, Vadodara" className="input-premium" value={preferredRoutes} onChange={e => setPreferredRoutes(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px' }}>
                Register Driver
              </button>
            </form>
          </div>

          {/* Drivers Table Directory */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Users size={17} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Driver Directory</h3>
              <span className="badge badge-brand" style={{ marginLeft: 'auto' }}>{drivers.length} drivers</span>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', marginBottom: '6px' }}>
              <table className="table-premium">
                <thead>
                  <tr>
                    {['Driver ID', 'Name', 'Compliance & BGV', 'Emergency Info', 'Aadhaar / PAN', 'Documents', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => {
                    const licenceCompliance = checkCompliance(d.licenceExp);
                    
                    return (
                      <tr key={d.id}>
                        <td style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-display)' }}>{d.id}</td>
                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          <div>
                            <div>{d.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>UPI: {d.upiId || 'N/A'}</div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem' }}>
                            <div>Licence Expiry: <span className={`badge ${licenceCompliance.color}`} style={{ padding: '0px 4px', fontSize: '0.62rem' }}>{licenceCompliance.label}</span></div>
                            <div>BGV Status: <span className={`badge ${d.bgvStatus === 'Completed' ? 'badge-success' : d.bgvStatus === 'Failed' ? 'badge-danger' : 'badge-warning'}`} style={{ padding: '0px 4px', fontSize: '0.62rem' }}>{d.bgvStatus || 'Pending'}</span></div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>
                          {d.emergencyName ? (
                            <>
                              <div>{d.emergencyName} ({d.bloodGroup || 'O+'})</div>
                              <div style={{ color: 'var(--text-muted)' }}>{d.emergencyPhone}</div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>
                          <div>Aadhaar: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{d.aadhaarNo || 'N/A'}</span></div>
                          <div>PAN: <span style={{ color: 'var(--text-muted)' }}>{d.panNo || 'N/A'}</span></div>
                        </td>
                        <td>
                          {/* File indicators */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {d.aadhaarDocUrl ? (
                              <button 
                                type="button" 
                                title="View Aadhaar Copy"
                                onClick={() => setActiveViewerDoc({ title: 'Aadhaar Card Copy', fileName: d.aadhaarDocUrl.split('/').pop(), url: d.aadhaarDocUrl })}
                                style={{ background: 'none', border: 'none', color: 'var(--brand-light)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Paperclip size={14} />
                              </button>
                            ) : null}
                            {d.licenceDocUrl ? (
                              <button 
                                type="button" 
                                title="View Driving License"
                                onClick={() => setActiveViewerDoc({ title: 'Driving License Copy', fileName: d.licenceDocUrl.split('/').pop(), url: d.licenceDocUrl })}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Paperclip size={14} />
                              </button>
                            ) : null}
                            {!d.aadhaarDocUrl && !d.licenceDocUrl && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>No Docs</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${d.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button 
                              type="button"
                              title="Update Licence and compliance details"
                              onClick={() => {
                                setEditingDriver(d);
                                setEditLicenceExpiry(d.licenceExp || '2029-05-12');
                                setEditBgvStatus(d.bgvStatus || 'Pending');
                                setEditPreferredRoutes(d.preferredRoutes || '');
                                setEditBankAccNo(d.bankAccNo || '');
                                setEditBankIfsc(d.bankIfsc || '');
                                setEditUpiId(d.upiId || '');
                                setEditAadhaarDocUrl(d.aadhaarDocUrl || '');
                                setEditPanDocUrl(d.panDocUrl || '');
                                setEditLicenceDocUrl(d.licenceDocUrl || '');
                              }}
                              className="btn-ghost"
                              style={{ padding: '4px 6px', fontSize: '0.7rem', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center', background: 'hsla(35, 95%, 55%, 0.1)', border: '1px solid hsla(35, 95%, 55%, 0.2)', borderRadius: '4px' }}
                            >
                              <Edit size={11} style={{ color: 'var(--brand)' }} /> Edit Info
                            </button>
                            <button 
                              onClick={() => toggleDriverStatus(d.id, d.status)}
                              className="toggle-btn"
                              style={{ padding: '3.5px 10px', fontSize: '0.68rem', gap: '3px', borderColor: d.status === 'Active' ? 'var(--accent-danger)' : 'var(--accent-success)', width: '100%', justifyContent: 'center' }}
                            >
                              {d.status === 'Active' ? (
                                <>
                                  <Ban size={10} style={{ color: 'var(--accent-danger)' }} /> Blacklist
                                </>
                              ) : (
                                <>
                                  <Check size={10} style={{ color: 'var(--accent-success)' }} /> Activate
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: MAINTENANCE LOGS */}
      {activeSubTab === 'maintenance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Log Maintenance Form */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <PlusCircle size={17} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Log Maintenance Service</h3>
            </div>
            <form onSubmit={handleAddMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label-premium">Select Vehicle</label>
                <select className="input-premium" value={maintVehicle} onChange={e => setMaintVehicle(e.target.value)}>
                  {trucks.map(t => <option key={t.regNo} value={t.regNo}>{t.regNo} ({t.model})</option>)}
                </select>
              </div>
              <div>
                <label className="label-premium">Service/Repair Date</label>
                <input type="date" className="input-premium" value={maintDate} onChange={e => setMaintDate(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Details of Service Work Done</label>
                <textarea 
                  required 
                  placeholder="e.g. Replacements of engine oils, front brake shoes, wheel alignment..." 
                  className="input-premium" 
                  style={{ height: '70px', padding: '10px', fontSize: '0.85rem' }}
                  value={maintWorkDone} 
                  onChange={e => setMaintWorkDone(e.target.value)} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label-premium">Total Cost (₹)</label>
                  <input type="number" className="input-premium" value={maintCost} onChange={e => setMaintCost(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium">Odometer Reading (km)</label>
                  <input type="number" className="input-premium" value={maintOdo} onChange={e => setMaintOdo(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px' }}>
                Register Maintenance Event
              </button>
            </form>
          </div>

          {/* Maintenance Ledger List */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Wrench size={17} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Historical Servicing Ledger</h3>
              <span className="badge badge-brand" style={{ marginLeft: 'auto' }}>{maintenanceLogs.length} Records</span>
            </div>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="table-premium">
                <thead>
                  <tr>
                    {['Service ID', 'Vehicle No', 'Service Date', 'Service Details', 'Cost (₹)', 'Odometer', 'Status'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {maintenanceLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-display)' }}>{log.id}</td>
                      <td style={{ fontWeight: '700', color: 'var(--brand-light)' }}>{log.regNo}</td>
                      <td>{log.serviceDate}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {log.workDone}
                      </td>
                      <td style={{ fontWeight: '600', fontFamily: 'var(--font-display)' }}>₹{log.cost?.toLocaleString('en-IN')}</td>
                      <td style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem' }}>{log.odoReading?.toLocaleString()} km</td>
                      <td><span className="badge badge-success">{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE TRUCK EXPIRED COMPLIANCE DATES MODAL */}
      {editingTruck && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <form onSubmit={handleSaveTruckExpiries} className="glass-panel animate-scale-up" style={{
            width: '100%', maxWidth: '480px',
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            padding: '24px', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', gap: '14px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', color: 'var(--text-primary)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} style={{ color: 'var(--brand)' }} /> Update Fleet Info: {editingTruck.regNo}
              </h3>
              <button 
                type="button"
                onClick={() => setEditingTruck(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">RC Expiry Date</label>
                <input type="date" required className="input-premium" value={editRcExpiry} onChange={e => setEditRcExpiry(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Insurance Expiry Date</label>
                <input type="date" required className="input-premium" value={editInsExpiry} onChange={e => setEditInsExpiry(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">FC Expiry Date</label>
                <input type="date" className="input-premium" value={editFcExpiry} onChange={e => setEditFcExpiry(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">PUC Expiry Date</label>
                <input type="date" className="input-premium" value={editPucExpiry} onChange={e => setEditPucExpiry(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label-premium">Road Tax Validity</label>
              <input type="date" className="input-premium" value={editRoadTaxExpiry} onChange={e => setEditRoadTaxExpiry(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">FASTag Wallet ID</label>
                <input type="text" className="input-premium" value={editFastagId} onChange={e => setEditFastagId(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">FASTag Balance (₹)</label>
                <input type="number" className="input-premium" value={editFastagBalance} onChange={e => setEditFastagBalance(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">GPS IMEI ID</label>
                <input type="text" className="input-premium" value={editGpsImei} onChange={e => setEditGpsImei(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Odometer Reading (km)</label>
                <input type="number" className="input-premium" value={editCurrentOdo} onChange={e => setEditCurrentOdo(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">Fuel Efficiency (km/L)</label>
                <input type="number" step="0.1" className="input-premium" value={editFuelEfficiency} onChange={e => setEditFuelEfficiency(e.target.value)} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Replace PUC File</span>
                <input type="file" style={{ fontSize: '0.7rem' }} onChange={e => handleSimulatedFileUpload(e, setEditPucDocUrl)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button 
                type="button" 
                onClick={() => setEditingTruck(null)}
                className="toggle-btn" 
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UPDATE DRIVER LICENCE EXPIRES MODAL */}
      {editingDriver && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <form onSubmit={handleSaveDriverExpiry} className="glass-panel animate-scale-up" style={{
            width: '100%', maxWidth: '480px',
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            padding: '24px', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', gap: '14px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', color: 'var(--text-primary)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--brand)' }} /> Update Driver Info: {editingDriver.name}
              </h3>
              <button 
                type="button"
                onClick={() => setEditingDriver(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">Licence Expiry Date</label>
                <input type="date" required className="input-premium" value={editLicenceExpiry} onChange={e => setEditLicenceExpiry(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Police BGV Status</label>
                <select className="input-premium" value={editBgvStatus} onChange={e => setEditBgvStatus(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed / Flagged</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label-premium">Preferred Routes</label>
              <input type="text" className="input-premium" value={editPreferredRoutes} onChange={e => setEditPreferredRoutes(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label-premium">Bank Account No</label>
                <input type="text" className="input-premium" value={editBankAccNo} onChange={e => setEditBankAccNo(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Bank IFSC Code</label>
                <input type="text" className="input-premium" value={editBankIfsc} onChange={e => setEditBankIfsc(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label-premium">UPI ID</label>
              <input type="text" className="input-premium" value={editUpiId} onChange={e => setEditUpiId(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Replace Aadhaar Copy</span>
                <input type="file" style={{ fontSize: '0.7rem' }} onChange={e => handleSimulatedFileUpload(e, setEditAadhaarDocUrl)} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Replace Licence Copy</span>
                <input type="file" style={{ fontSize: '0.7rem' }} onChange={e => handleSimulatedFileUpload(e, setEditLicenceDocUrl)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button 
                type="button" 
                onClick={() => setEditingDriver(null)}
                className="toggle-btn" 
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {activeViewerDoc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(5, 7, 12, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <div className="glass-panel animate-scale-up" style={{
            width: '100%', maxWidth: '520px',
            background: '#0a101d', border: '1.5px solid var(--brand)',
            padding: '24px', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 25px 50px rgba(0,240,255,0.15)', color: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-light)' }}>
                <Eye size={18} /> secure doc preview
              </h3>
              <button 
                type="button"
                onClick={() => setActiveViewerDoc(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ 
              background: '#070b14', 
              borderRadius: '12px', 
              padding: '30px 20px', 
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              {/* Mock Certificate Seal Graphic */}
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', 
                background: 'rgba(245, 158, 11, 0.1)', border: '2px solid #f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f59e0b', fontSize: '1.8rem', fontWeight: 'bold'
              }}>
                印
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff' }}>{activeViewerDoc.title}</h4>
                <span className="badge badge-success" style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.65rem' }}>
                  ✓ verified compliance doc
                </span>
              </div>
              <div style={{ 
                width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)',
                margin: '8px 0' 
              }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                Storage Endpoint: {activeViewerDoc.url}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setActiveViewerDoc(null)}
                className="toggle-btn" 
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Close Viewer
              </button>
              <button 
                type="button" 
                onClick={() => alert(`Simulating file download of: ${activeViewerDoc.fileName}`)}
                className="btn-primary" 
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Download Document
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
