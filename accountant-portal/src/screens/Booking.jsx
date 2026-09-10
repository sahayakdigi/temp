import React, { useState, useEffect } from 'react';
import { FileText, Calculator, Truck, Layers, FileSignature, CheckCircle, ArrowRight, Info, Plus, Trash2, Printer, X, ShieldCheck, MessageSquare, Send } from 'lucide-react';
import GlossaryTooltip from '../components/GlossaryTooltip';
import { GLOSSARY } from '../components/glossaryData';
import { api } from '../services/api';
import RouteWeatherPanel from '../components/RouteWeatherPanel';

export default function Booking({ lrs, setLrs, trips, setTrips, parties, rateCards, trucks, drivers }) {
  const getBookingBranchCode = (city) => {
    const code = (city || '').substring(0, 3).toUpperCase() === 'MUM' ? 'BOM' : (city || '').substring(0, 3).toUpperCase();
    return ['DEL', 'BOM', 'BLR'].includes(code) ? code : 'DEL';
  };
  const [isFTL, setIsFTL] = useState(false);

  // --- Form Input States ---
  const [consignor, setConsignor]       = useState(parties[0]?.name || '');
  const [consignee, setConsignee]       = useState(parties[3]?.name || '');
  const [origin, setOrigin]             = useState('Delhi');
  const [destination, setDestination]   = useState('Mumbai');
  const [articles, setArticles]         = useState(100);
  const [actualWt, setActualWt]         = useState(2000);
  const [chargeWt, setChargeWt]         = useState(2200);
  const [saidToContain, setSaidToContain] = useState('Electronic Goods');
  const [privateMark, setPrivateMark]   = useState('LG-DEL-BOM-12');
  const [freightTerms, setFreightTerms] = useState('TBB');
  const [ewayBill, setEwayBill]         = useState('');
  const [declaredVal, setDeclaredVal]   = useState(500000);
  const [freightAmt, setFreightAmt]     = useState(0);
  const [rateOverridden, setRateOverridden] = useState(false);
  
  // --- Indian GST GTA States (FR-15.2) ---
  const [gstBillingMode, setGstBillingMode] = useState('RCM'); // 'RCM' (5%) vs 'Forward' (12%)

  // --- Risk Basis & Insurance States (FR-15.6) ---
  const [riskBasis, setRiskBasis] = useState('Owner'); // 'Owner' vs 'Carrier'
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [insurancePolicyNo, setInsurancePolicyNo] = useState('');
  const [insuranceDate, setInsuranceDate] = useState('');

  // --- FTL Specific States ---
  const [contractRate, setContractRate]   = useState(60000);
  const [selectedTruck, setSelectedTruck] = useState(trucks[0]?.regNo || '');
  const [selectedDriver, setSelectedDriver] = useState(drivers[0]?.id || '');

  // --- Box Size & Volumetric CFT States ---
  const [boxSizeType, setBoxSizeType]   = useState('Medium'); // 'Small', 'Medium', 'Large', 'Custom'
  const [cftPerBox, setCftPerBox]       = useState(5);
  const [dimLen, setDimLen]             = useState(2);
  const [dimWidth, setDimWidth]         = useState(1.5);
  const [dimHeight, setDimHeight]       = useState(1.6);
  const [dimUnit, setDimUnit]           = useState('Feet'); // 'Feet' vs 'Inches'

  const handleBoxTypeChange = (type) => {
    setBoxSizeType(type);
    if (type === 'Small') {
      setCftPerBox(2);
    } else if (type === 'Medium') {
      setCftPerBox(5);
    } else if (type === 'Large') {
      setCftPerBox(12);
    } else if (type === 'Custom') {
      calculateCustomCft(dimLen, dimWidth, dimHeight, dimUnit);
    }
  };

  const calculateCustomCft = (l, w, h, unit) => {
    const L = Number(l || 0);
    const W = Number(w || 0);
    const H = Number(h || 0);
    if (L <= 0 || W <= 0 || H <= 0) return;
    
    let cft = L * W * H;
    if (unit === 'Inches') {
      cft = cft / 1728;
    }
    setCftPerBox(Number(cft.toFixed(2)));
  };

  // --- Multi-LR Booking Queue Cart (FR-3.6) ---
  const [draftQueue, setDraftQueue] = useState([]);
  
  // --- Preview, WhatsApp & Toast Notifications ---
  const [successMsg, setSuccessMsg]         = useState('');
  const [previewBilty, setPreviewBilty]     = useState(null);
  const [whatsappModalData, setWhatsappModalData] = useState(null);

  // Lookups
  const consignorObj = parties.find(p => p.name === consignor);
  const consigneeObj = parties.find(p => p.name === consignee);

  const formatPhoneForWhatsapp = (partyObj, fallbackPhone = '7799654708') => {
    const raw = partyObj?.phone || partyObj?.whatsappNo || partyObj?.contactPhone || fallbackPhone;
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return `91${digits.slice(-10)}`;
    return `91${fallbackPhone}`;
  };

  // --- GST Calculation Helper ---
  const getGstTaxDetails = (amount) => {
    const amt = Number(amount || 0);
    const gstRate = gstBillingMode === 'RCM' ? 0.05 : 0.12;
    const totalGst = amt * gstRate;
    
    // Determine if interstate based on city name matching
    const isInterstate = (origin || '').trim().toLowerCase() !== (destination || '').trim().toLowerCase();
    
    if (isInterstate) {
      return { cgst: 0, sgst: 0, igst: totalGst, rateLabel: gstBillingMode === 'RCM' ? 'IGST (5% RCM)' : 'IGST (12% Forward)' };
    } else {
      const halfGst = totalGst / 2;
      return { 
        cgst: halfGst, 
        sgst: halfGst, 
        igst: 0, 
        rateLabel: gstBillingMode === 'RCM' ? 'CGST (2.5%) + SGST (2.5%)' : 'CGST (6%) + SGST (6%)' 
      };
    }
  };

  const gstDetails = getGstTaxDetails(isFTL ? contractRate : freightAmt);

  // Auto-Rate calculation effect
  useEffect(() => {
    if (isFTL) return;
    const originShort = (origin || '').substring(0, 3).toUpperCase();
    const destShort = (destination || '').substring(0, 3).toUpperCase();
    const key = `${originShort}-${destShort}`;
    const rateCard = rateCards.find(r => r.lane === key) || { rate: 8.0, surcharges: 500 };
    if (!rateOverridden) {
      setFreightAmt(chargeWt * rateCard.rate + (rateCard.surcharges || 0));
    }
  }, [origin, destination, chargeWt, isFTL, rateOverridden, rateCards]);

  // --- Add LR to Queue ---
  const handleAddToQueue = (e) => {
    e.preventDefault();
    if (!consignorObj?.id || !consigneeObj?.id) {
      alert('Error: Consignor or Consignee not found in Parties master.');
      return;
    }

    const draftLr = {
      id: `DRAFT-${Date.now()}-${draftQueue.length + 1}`,
      lr_no: `LR-2026-0${lrs.length + draftQueue.length + 1}`,
      booking_branch: getBookingBranchCode(origin),
      consignor: consignor,
      consignee: consignee,
      consignor_id: consignorObj.id,
      consignee_id: consigneeObj.id,
      origin,
      destination,
      articles: Number(articles),
      actual_wt: Number(actualWt),
      charge_wt: Number(chargeWt),
      private_mark: privateMark,
      said_to_contain: saidToContain,
      freight_terms: freightTerms,
      eway_bill: ewayBill,
      value: Number(declaredVal),
      freight_amt: Number(freightAmt),
      cgst: gstDetails.cgst,
      sgst: gstDetails.sgst,
      igst: gstDetails.igst,
      gstBillingMode,
      riskBasis,
      insuranceCompany: riskBasis === 'Carrier' ? insuranceCompany : '',
      insurancePolicyNo: riskBasis === 'Carrier' ? insurancePolicyNo : '',
      insuranceDate: riskBasis === 'Carrier' ? insuranceDate : '',
      cft_per_box: Number(cftPerBox),
      total_cft: Number(articles || 0) * Number(cftPerBox || 5),
      box_size_type: boxSizeType,
      status: 'Booked',
      date: new Date().toISOString().split('T')[0],
      manifest_id: null,
      physical_pod_received: false,
    };

    setDraftQueue([...draftQueue, draftLr]);
    setSuccessMsg(`LR ${draftLr.lr_no} added to bulk booking queue.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // --- Remove from Queue ---
  const handleRemoveFromQueue = (id) => {
    setDraftQueue(draftQueue.filter(item => item.id !== id));
  };

  // --- Settle Bookings (Bulk or Single) ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!consignorObj?.id || !consigneeObj?.id) {
      alert('Error: Consignor or Consignee not found in Parties master.');
      return;
    }

    const base = {
      lr_no: `LR-2026-0${lrs.length + 1}`,
      booking_branch: getBookingBranchCode(origin),
      consignor_id: consignorObj.id, 
      consignee_id: consigneeObj.id,
      consignor,
      consignee,
      origin, 
      destination,
      articles: Number(articles), 
      actual_wt: Number(actualWt), 
      charge_wt: Number(chargeWt),
      cft_per_box: Number(cftPerBox),
      total_cft: Number(articles || 0) * Number(cftPerBox || 5),
      box_size_type: boxSizeType,
      private_mark: privateMark, 
      said_to_contain: saidToContain,
      freight_terms: freightTerms, 
      eway_bill: ewayBill, 
      value: Number(declaredVal),
      cgst: gstDetails.cgst,
      sgst: gstDetails.sgst,
      igst: gstDetails.igst,
      gstBillingMode,
      riskBasis,
      insuranceCompany: riskBasis === 'Carrier' ? insuranceCompany : '',
      insurancePolicyNo: riskBasis === 'Carrier' ? insurancePolicyNo : '',
      insuranceDate: riskBasis === 'Carrier' ? insuranceDate : '',
      status: 'Booked', 
      date: new Date().toISOString().split('T')[0],
      manifest_id: null, 
      physical_pod_received: false,
    };

    if (isFTL) {
      const newTripId = `TRP-2026-0${trips.length + 1}`;
      const driverObj = drivers.find(d => d.id === selectedDriver);
      
      const payload = { 
        ...base, 
        freight_amt: Number(contractRate)
      };

      api.createLR(payload)
        .then(saved => {
          setLrs([saved, ...lrs]);
          
          const newTripData = { 
            id: newTripId, 
            origin, 
            destination, 
            contractRate: Number(contractRate), 
            truckNo: selectedTruck, 
            driverId: selectedDriver, 
            driverName: driverObj?.name || 'Unknown', 
            odoStart: 100000, 
            status: 'Started', 
            startDate: base.date, 
            expenses: [], 
            driverAdvance: 10000, 
            lorryReceiptNo: base.lr_no 
          };

          const cPhone = formatPhoneForWhatsapp(consignorObj, '7799654708');
          const dPhone = formatPhoneForWhatsapp(consigneeObj, '9876543210');

          api.createTrip(newTripData)
            .then(savedTrip => {
              setTrips([savedTrip, ...trips]);
              setSuccessMsg(`FTL Dispatch Trip ${newTripId} & LR ${base.lr_no} generated successfully.`);
              setPreviewBilty(saved);
              setWhatsappModalData({
                id: base.lr_no,
                tripId: newTripId,
                isFTL: true,
                consignor,
                consignee,
                consignorPhone: cPhone,
                consigneePhone: dPhone,
                origin,
                destination,
                vehicleNo: selectedTruck,
                driverName: driverObj?.name || 'Driver',
                driverPhone: driverObj?.phone || '9876543210',
                articles: Number(articles),
                chargeWt: Number(chargeWt),
                freightTerms
              });
            })
            .catch(err => alert(`LR created but Trip dispatch failed: ${err.message}`));
        })
        .catch(err => alert(`Failed to dispatch FTL: ${err.message}`));
    } else {
      const payload = { 
        ...base, 
        freight_amt: Number(freightAmt)
      };

      const cPhone = formatPhoneForWhatsapp(consignorObj, '7799654708');
      const dPhone = formatPhoneForWhatsapp(consigneeObj, '9876543210');

      api.createLR(payload)
        .then(saved => { 
          setLrs([saved, ...lrs]); 
          setSuccessMsg(`LR ${base.lr_no} generated successfully.`); 
          setPreviewBilty(saved);
          setWhatsappModalData({
            id: base.lr_no,
            isFTL: false,
            consignor,
            consignee,
            consignorPhone: cPhone,
            consigneePhone: dPhone,
            origin,
            destination,
            vehicleNo: 'Consolidated Line-Haul',
            driverName: 'Assigned at Hub',
            driverPhone: '9876543210',
            articles: Number(articles),
            chargeWt: Number(chargeWt),
            freightTerms
          });
        })
        .catch(err => alert(`Failed to generate LR: ${err.message}`));
    }

    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // --- Bulk Settle Draft Queue LRs ---
  const handleBulkSubmit = async () => {
    if (draftQueue.length === 0) return;

    let savedCount = 0;
    const savedLrsList = [];

    for (const item of draftQueue) {
      const { id, ...payload } = item;
      try {
        const saved = await api.createLR(payload);
        savedLrsList.push(saved);
        savedCount++;
      } catch (err) {
        console.error(`Failed to create LR ${payload.lr_no}:`, err);
      }
    }

    setLrs([...savedLrsList, ...lrs]);
    setSuccessMsg(`Successfully booked ${savedCount} consignments in bulk!`);
    setDraftQueue([]);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const laneCode = `${(origin || '').substring(0, 3).toUpperCase()}-${(destination || '').substring(0, 3).toUpperCase()}`;

  return (
    <div className="animate-fade-in" style={{ padding: '28px' }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Unified Booking Engine</h2>
          <p className="page-subtitle">Dispatch FTL trips or book PTL consignments with automatic rating & GST tax compliance</p>
        </div>
        <div className="toggle-container">
          <button className={`toggle-btn ${!isFTL ? 'active' : ''}`} onClick={() => { setIsFTL(false); setRateOverridden(false); }}>
            <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
            PTL
          </button>
          <button className={`toggle-btn ${isFTL ? 'active' : ''}`} onClick={() => setIsFTL(true)}>
            <Truck size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
            FTL
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
          {lrs.length > 0 && (
            <button 
              onClick={() => setPreviewBilty(lrs[0])}
              className="badge badge-success animate-pulse" 
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}
            >
              <Printer size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Print / View Bilty
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr', gap: '24px', alignItems: 'start' }}>

        {/* Main Form */}
        <form className="glass-panel" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '22px' }} onSubmit={handleSubmit}>

          {/* Form Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            {isFTL
              ? <div style={{ background: 'var(--brand-glow)', padding: '8px', borderRadius: '8px' }}><Truck size={20} color="var(--brand)" /></div>
              : <div style={{ background: 'var(--accent-info-glow)', padding: '8px', borderRadius: '8px' }}><Layers size={20} color="var(--accent-info)" /></div>
            }
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>
                {isFTL
                  ? <GlossaryTooltip term="FTL" glossary={GLOSSARY}>FTL Trip & Dispatch Contract</GlossaryTooltip>
                  : <GlossaryTooltip term="LR"  glossary={GLOSSARY}>PTL Consignment Details (Bilty / LR)</GlossaryTooltip>
                }
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                {isFTL ? 'Full truck placement with trip tracking' : 'Part load — consolidated via manifest'}
              </p>
            </div>
          </div>

          {/* Parties Selection & GSTIN Visualizer (FR-15.5) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label-premium">Consignor (Client)</label>
              <select className="input-premium" value={consignor} onChange={e => setConsignor(e.target.value)}>
                {parties.filter(p => p.type === 'client').map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              {consignorObj && (
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> Valid GSTIN: <strong>{consignorObj.gstin}</strong>
                </div>
              )}
            </div>
            <div>
              <label className="label-premium">Consignee</label>
              <select className="input-premium" value={consignee} onChange={e => setConsignee(e.target.value)}>
                {parties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              {consigneeObj && (
                <div style={{ fontSize: '0.7rem', color: consigneeObj.gstin ? 'var(--accent-success)' : 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {consigneeObj.gstin ? (
                    <>
                      <ShieldCheck size={12} /> Valid GSTIN: <strong>{consigneeObj.gstin}</strong>
                    </>
                  ) : (
                    <span>Unregistered / Local Consignee</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!isFTL && (
            <div style={{ fontSize: '0.78rem', background: 'hsla(210, 90%, 55%, 0.08)', border: '1px solid hsla(210, 90%, 55%, 0.22)', padding: '8px 12px', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📦 <strong>PTL Multi-Client Mode:</strong> Book individual LRs with distinct Consignor & Consignee.</span>
              <span style={{ color: 'var(--accent-info)', fontWeight: '600', fontSize: '0.72rem', background: 'hsla(210, 90%, 55%, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Consolidated at Hub Manifest</span>
            </div>
          )}

          {/* Route Cities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'end' }}>
            <div>
              <label className="label-premium">Origin City</label>
              <input 
                type="text" 
                className="input-premium" 
                value={origin} 
                onChange={e => setOrigin(e.target.value)} 
                list="origin-suggestions"
                placeholder="Type or select origin..."
              />
              <datalist id="origin-suggestions">
                <option value="Delhi" />
                <option value="Mumbai" />
                <option value="Bangalore" />
                <option value="Kolkata" />
                <option value="Chennai" />
                <option value="Pune" />
                <option value="Hyderabad" />
                <option value="Goa" />
              </datalist>
            </div>
            <div style={{ paddingBottom: '10px', color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
              <ArrowRight size={18} />
            </div>
            <div>
              <label className="label-premium">Destination City</label>
              <input 
                type="text" 
                className="input-premium" 
                value={destination} 
                onChange={e => setDestination(e.target.value)} 
                list="destination-suggestions"
                placeholder="Type or select destination..."
              />
              <datalist id="destination-suggestions">
                <option value="Mumbai" />
                <option value="Delhi" />
                <option value="Bangalore" />
                <option value="Kolkata" />
                <option value="Chennai" />
                <option value="Pune" />
                <option value="Hyderabad" />
                <option value="Goa" />
              </datalist>
            </div>
          </div>

          {/* Mode-specific fields */}
          {!isFTL ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <label className="label-premium"><GlossaryTooltip term="ARTICLES" glossary={GLOSSARY}>No. of Articles</GlossaryTooltip></label>
                  <input type="number" className="input-premium" value={articles} onChange={e => setArticles(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium">Actual Wt (kg)</label>
                  <input type="number" className="input-premium" value={actualWt} onChange={e => { setActualWt(e.target.value); setChargeWt(e.target.value); }} />
                </div>
                <div>
                  <label className="label-premium"><GlossaryTooltip term="CHARGEABLE_WEIGHT" glossary={GLOSSARY}>Charged Wt (kg)</GlossaryTooltip></label>
                  <input type="number" className="input-premium" value={chargeWt} onChange={e => setChargeWt(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="label-premium">Said to Contain</label>
                  <input type="text" className="input-premium" value={saidToContain} onChange={e => setSaidToContain(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium"><GlossaryTooltip term="PRIVATE_MARK" glossary={GLOSSARY}>Private Mark / Stencil</GlossaryTooltip></label>
                  <input type="text" className="input-premium" value={privateMark} onChange={e => setPrivateMark(e.target.value)} />
                </div>
              </div>

              {/* Estimated Box Size & Volumetric CFT Selection */}
              <div style={{ background: 'hsla(222, 22%, 12%, 0.4)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="label-premium" style={{ marginBottom: 0 }}>Estimated Box Size / Cargo Dimensions (CFT)</label>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                    Total Cargo Volumetric Space: {(Number(articles || 0) * Number(cftPerBox || 0)).toLocaleString()} CFT
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <button 
                    type="button" 
                    className={`toggle-btn ${boxSizeType === 'Small' ? 'active' : ''}`}
                    style={{ padding: '8px 10px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                    onClick={() => handleBoxTypeChange('Small')}
                  >
                    <span>📦 Small Carton</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>2 CFT / Box</span>
                  </button>

                  <button 
                    type="button" 
                    className={`toggle-btn ${boxSizeType === 'Medium' ? 'active' : ''}`}
                    style={{ padding: '8px 10px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                    onClick={() => handleBoxTypeChange('Medium')}
                  >
                    <span>📦 Medium Box</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>5 CFT / Box (Std)</span>
                  </button>

                  <button 
                    type="button" 
                    className={`toggle-btn ${boxSizeType === 'Large' ? 'active' : ''}`}
                    style={{ padding: '8px 10px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                    onClick={() => handleBoxTypeChange('Large')}
                  >
                    <span>📦 Large Crate</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>12 CFT / Box</span>
                  </button>

                  <button 
                    type="button" 
                    className={`toggle-btn ${boxSizeType === 'Custom' ? 'active' : ''}`}
                    style={{ padding: '8px 10px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                    onClick={() => handleBoxTypeChange('Custom')}
                  >
                    <span>📐 Custom Dimensions</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{cftPerBox} CFT / Box</span>
                  </button>
                </div>

                {boxSizeType === 'Custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginTop: '6px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.72rem' }}>Length ({dimUnit})</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="input-premium" 
                        style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                        value={dimLen} 
                        onChange={e => {
                          setDimLen(e.target.value);
                          calculateCustomCft(e.target.value, dimWidth, dimHeight, dimUnit);
                        }} 
                      />
                    </div>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.72rem' }}>Width ({dimUnit})</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="input-premium" 
                        style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                        value={dimWidth} 
                        onChange={e => {
                          setDimWidth(e.target.value);
                          calculateCustomCft(dimLen, e.target.value, dimHeight, dimUnit);
                        }} 
                      />
                    </div>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.72rem' }}>Height ({dimUnit})</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="input-premium" 
                        style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                        value={dimHeight} 
                        onChange={e => {
                          setDimHeight(e.target.value);
                          calculateCustomCft(dimLen, dimWidth, e.target.value, dimUnit);
                        }} 
                      />
                    </div>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.72rem' }}>Unit</label>
                      <select 
                        className="input-premium" 
                        style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                        value={dimUnit} 
                        onChange={e => {
                          setDimUnit(e.target.value);
                          calculateCustomCft(dimLen, dimWidth, dimHeight, e.target.value);
                        }}
                      >
                        <option value="Feet">Feet (ft)</option>
                        <option value="Inches">Inches (in)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
              <div>
                <label className="label-premium">Cargo Description</label>
                <input type="text" className="input-premium" placeholder="e.g. Steel Coils, Industrial Equipment" value={saidToContain} onChange={e => setSaidToContain(e.target.value)} />
              </div>
              <div>
                <label className="label-premium">Placement Type</label>
                <select className="input-premium" value={articles} onChange={e => setArticles(e.target.value)}>
                  <option value="1">Full Placement (Single)</option>
                </select>
              </div>
            </div>
          )}

          {/* Freight & GST Settings (FR-15.2) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <label className="label-premium"><GlossaryTooltip term="FREIGHT_TERMS" glossary={GLOSSARY}>Freight Terms</GlossaryTooltip></label>
              <select className="input-premium" value={freightTerms} onChange={e => setFreightTerms(e.target.value)}>
                <option value="TBB">TBB — Monthly Credit</option>
                <option value="To-Pay">To-Pay — Collect on Delivery</option>
                <option value="Paid">Paid — Prepaid</option>
              </select>
            </div>
            <div>
              <label className="label-premium">GST Billing Mode</label>
              <select className="input-premium" value={gstBillingMode} onChange={e => setGstBillingMode(e.target.value)}>
                <option value="RCM">RCM (Reverse Charge - 5%)</option>
                <option value="Forward">Forward Charge (12% GST)</option>
              </select>
            </div>
            <div>
              <label className="label-premium">E-Way Bill No.</label>
              <input type="text" className="input-premium" placeholder="12-digit number" value={ewayBill} onChange={e => setEwayBill(e.target.value)} />
            </div>
          </div>

          {/* Risk Basis & Insurance Capture (FR-15.6) */}
          <div style={{ padding: '16px', background: 'hsla(222, 22%, 12%, 0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-premium" style={{ marginBottom: 0 }}>Goods Risk & Insurance Terms</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  className={`toggle-btn ${riskBasis === 'Owner' ? 'active' : ''}`}
                  style={{ padding: '3px 10px', fontSize: '0.7rem' }}
                  onClick={() => setRiskBasis('Owner')}
                >
                  Owner's Risk (OR)
                </button>
                <button 
                  type="button"
                  className={`toggle-btn ${riskBasis === 'Carrier' ? 'active' : ''}`}
                  style={{ padding: '3px 10px', fontSize: '0.7rem' }}
                  onClick={() => setRiskBasis('Carrier')}
                >
                  Carrier's Risk (CR)
                </button>
              </div>
            </div>

            {riskBasis === 'Carrier' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '4px' }}>
                <div>
                  <label className="label-premium" style={{ fontSize: '0.7rem' }}>Insurance Company</label>
                  <input type="text" className="input-premium" style={{ padding: '6px 10px', fontSize: '0.8rem' }} placeholder="e.g. National Ins." value={insuranceCompany} onChange={e => setInsuranceCompany(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium" style={{ fontSize: '0.7rem' }}>Policy Number</label>
                  <input type="text" className="input-premium" style={{ padding: '6px 10px', fontSize: '0.8rem' }} placeholder="e.g. POL-99281" value={insurancePolicyNo} onChange={e => setInsurancePolicyNo(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium" style={{ fontSize: '0.7rem' }}>Policy Date</label>
                  <input type="date" className="input-premium" style={{ padding: '5px 10px', fontSize: '0.8rem' }} value={insuranceDate} onChange={e => setInsuranceDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* FTL Vehicle Sourcing */}
          {isFTL && (
            <div style={{ padding: '18px', background: 'var(--brand-glow-lg)', borderRadius: 'var(--radius-md)', border: '1px solid hsla(35, 95%, 55%, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--brand-light)', display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '700' }}>
                <Truck size={16} /> Vehicle Sourcing & Dispatch
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="label-premium">Assign Truck</label>
                  <select className="input-premium" value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)}>
                    {trucks.map(t => <option key={t.regNo} value={t.regNo}>{t.regNo} ({t.ownership})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-premium">Assign Driver</label>
                  <select className="input-premium" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="label-premium">Agreed Contract Rate (₹)</label>
                  <input type="number" className="input-premium" value={contractRate} onChange={e => setContractRate(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium">Declared Consignment Value (₹)</label>
                  <input type="number" className="input-premium" value={declaredVal} onChange={e => setDeclaredVal(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Operational buttons: Book vs Queue (FR-3.6) */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1.5, justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}>
              <FileSignature size={18} />
              {isFTL ? 'Confirm FTL Dispatch & Save' : 'Generate Lorry Receipt (Bilty / LR)'}
            </button>
            
            {!isFTL && (
              <button 
                type="button" 
                onClick={handleAddToQueue}
                className="toggle-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '0.95rem', gap: '6px', border: '1px solid var(--border-default)' }}
              >
                <Plus size={18} />
                Add to Cart Queue
              </button>
            )}
          </div>
        </form>

        {/* Right Sidebar: Rating Engine & Bulk Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Auto-Rating Engine (FR-15.1 / FR-15.2) */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <h3 className="section-title">
                <Calculator size={16} style={{ color: 'var(--brand)' }} />
                Compliance Rating Engine
              </h3>
            </div>

            {!isFTL ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Lane Code Route', value: laneCode },
                  { label: 'Chargeable Weight', value: `${chargeWt} kg` },
                  { label: 'Subtotal Rate / kg', value: '₹ 8.50' },
                  { label: 'Volumetric Surcharges', value: '₹ 500' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-display)' }}>{r.value}</span>
                  </div>
                ))}
                <div className="divider" />
                
                {/* GST Tax details visualization */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-void)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GST Billing basis:</span>
                    <span style={{ fontWeight: '600' }}>{gstBillingMode === 'RCM' ? 'Reverse Charge (RCM)' : 'Forward Charge'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax Structure:</span>
                    <span style={{ fontWeight: '600', color: 'var(--brand-light)' }}>{gstDetails.rateLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
                    <span>Calculated GST:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      ₹{(gstDetails.cgst + gstDetails.sgst + gstDetails.igst).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="divider" />
                
                <div>
                  <label className="label-premium">Override Freight Amount (₹)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input-premium" value={freightAmt}
                      onChange={e => { setFreightAmt(e.target.value); setRateOverridden(true); }} />
                    {rateOverridden && (
                      <button type="button" className="btn-ghost" style={{ flexShrink: 0, padding: '8px 12px' }}
                        onClick={() => setRateOverridden(false)}>Reset</button>
                    )}
                  </div>
                  {rateOverridden && <p style={{ fontSize: '0.72rem', color: 'var(--accent-warning)', marginTop: '4px' }}>⚠ Override flagged in audit logs</p>}
                </div>
                <div style={{ background: 'var(--brand-glow)', border: '1px solid hsla(35,95%,55%,0.2)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Net Freight + Tax</span>
                  <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
                    ₹{Math.round(Number(freightAmt) + gstDetails.cgst + gstDetails.sgst + gstDetails.igst).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  FTL pricing runs on trip-centric contracts. Agreed directly with client per vehicle placement.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-void)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GST Type:</span>
                    <span style={{ fontWeight: '600' }}>{gstDetails.rateLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax Surcharge:</span>
                    <span style={{ fontWeight: '700' }}>₹{(gstDetails.cgst + gstDetails.sgst + gstDetails.igst).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div style={{ background: 'var(--brand-glow)', border: '1px solid hsla(35,95%,55%,0.2)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Total FTL Invoice</span>
                  <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
                    ₹{Math.round(Number(contractRate) + gstDetails.cgst + gstDetails.sgst + gstDetails.igst).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Booking Queue Cart Panel (FR-3.6) */}
          {draftQueue.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} style={{ color: 'var(--brand)' }} /> Booking Cart ({draftQueue.length})
                </h4>
                <span className="badge badge-brand">{draftQueue.length} Pending LRs</span>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--accent-info)', marginBottom: '12px', fontWeight: '500' }}>
                Multi-Client Queue: {new Set(draftQueue.map(i => i.consignor)).size} Consignors · {new Set(draftQueue.map(i => i.consignee)).size} Consignees
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '220px', marginBottom: '14px', paddingRight: '2px' }}>
                {draftQueue.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'hsla(222, 22%, 12%, 0.5)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--brand-light)' }}>{item.lr_no}</div>
                      <div style={{ color: 'var(--text-primary)', marginTop: '2px', fontWeight: '500' }}>
                        {item.consignor?.substring(0, 16)} <ArrowRight size={10} style={{ verticalAlign: 'middle' }} /> {item.consignee?.substring(0, 16)}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                        {item.origin} ➔ {item.destination} · {item.articles} pkgs ({item.charge_wt} kg)
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveFromQueue(item.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button"
                onClick={handleBulkSubmit}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
              >
                <ShieldCheck size={15} /> Book Queue LRs in Bulk
              </button>
            </div>
          )}

          {/* Route Weather Advisory */}
          <RouteWeatherPanel origin={origin} destination={destination} />

          {/* GST Notes */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Info size={15} style={{ color: 'var(--brand)' }} />
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>GST Compliance Notes</h4>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                <><GlossaryTooltip term="GTA" glossary={GLOSSARY}>GTA / RCM</GlossaryTooltip>: Forward charge (12%) vs Reverse Charge (5%) defaults apply.</>,
                <>Values &gt; ₹50,000 require a valid <GlossaryTooltip term="EINVOICE" glossary={GLOSSARY}>e-Way Bill / IRN</GlossaryTooltip>.</>,
                <><GlossaryTooltip term="TDS" glossary={GLOSSARY}>TDS (194C)</GlossaryTooltip> auto-tracked on receipts above ₹30,000.</>,
              ].map((note, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <span style={{ color: 'var(--brand)', flexShrink: 0, marginTop: '2px' }}>›</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* --- PRINT BILTY (LR) PDF PREVIEW MODAL (FR-3.5) --- */}
      {previewBilty && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <div className="glass-panel animate-scale-up" style={{
            width: '100%', maxWidth: '780px', maxHeight: '92vh',
            background: '#ffffff', color: '#111827',
            padding: '30px', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            overflowY: 'auto'
          }}>
            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => window.print()}
                className="btn-primary" 
                style={{ background: '#111827', color: '#fff', border: '1px solid #111827', padding: '6px 14px', fontSize: '0.85rem' }}
              >
                <Printer size={15} /> Print Consignment Note (Bilty)
              </button>
              <button 
                onClick={() => setPreviewBilty(null)}
                className="toggle-btn" 
                style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                <X size={15} /> Close
              </button>
            </div>

            {/* Printable Content Block */}
            <div id="bilty-printable-area" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              
              {/* Header Box */}
              <div style={{ border: '2px solid #111827', padding: '12px', textAlign: 'center', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '5px', left: '10px', fontSize: '0.65rem', border: '1px solid #111827', padding: '2px 4px' }}>CONSIGNMENT NOTE</span>
                <span style={{ position: 'absolute', top: '5px', right: '10px', fontSize: '0.65rem', border: '1px solid #111827', padding: '2px 4px' }}>GTA REGISTRY</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>LogiSync Logistics</h2>
                <p style={{ fontSize: '0.75rem', color: '#374151', marginTop: '2px' }}>Fleet Owners & Goods Transport Contractors</p>
                <p style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '1px' }}>GSTIN Reg No: 27AAAAA1111A1Z1 (HO Mumbai)</p>
              </div>

              {/* LR metadata grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#111827', border: '1px solid #111827' }}>
                <div style={{ background: '#fff', padding: '8px' }}>
                  <p><strong>Lorry Receipt (LR) No:</strong> {previewBilty.lrNo || previewBilty.lr_no}</p>
                  <p style={{ marginTop: '4px' }}><strong>Date of Booking:</strong> {previewBilty.date}</p>
                  <p style={{ marginTop: '4px' }}><strong>Origin City:</strong> {previewBilty.origin}</p>
                </div>
                <div style={{ background: '#fff', padding: '8px' }}>
                  <p><strong>Freight terms:</strong> <span style={{ textTransform: 'uppercase', fontWeight: '700' }}>{previewBilty.freightTerms || previewBilty.freight_terms}</span></p>
                  <p style={{ marginTop: '4px' }}><strong>E-Way Bill No:</strong> {previewBilty.ewayBill || previewBilty.eway_bill || 'N/A'}</p>
                  <p style={{ marginTop: '4px' }}><strong>Destination City:</strong> {previewBilty.destination}</p>
                </div>
              </div>

              {/* Party Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#111827', border: '1px solid #111827' }}>
                <div style={{ background: '#fff', padding: '8px' }}>
                  <h4 style={{ textTransform: 'uppercase', fontWeight: '800', borderBottom: '1px solid #111827', paddingBottom: '3px', marginBottom: '5px' }}>Consignor Details</h4>
                  <p><strong>Name:</strong> {previewBilty.consignor}</p>
                  <p style={{ marginTop: '4px' }}><strong>GSTIN:</strong> {parties.find(p => p.name === previewBilty.consignor)?.gstin || 'Unregistered'}</p>
                </div>
                <div style={{ background: '#fff', padding: '8px' }}>
                  <h4 style={{ textTransform: 'uppercase', fontWeight: '800', borderBottom: '1px solid #111827', paddingBottom: '3px', marginBottom: '5px' }}>Consignee Details</h4>
                  <p><strong>Name:</strong> {previewBilty.consignee}</p>
                  <p style={{ marginTop: '4px' }}><strong>GSTIN:</strong> {parties.find(p => p.name === previewBilty.consignee)?.gstin || 'Unregistered'}</p>
                </div>
              </div>

              {/* Cargo Details Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #111827', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #111827' }}>
                    <th style={{ padding: '6px', borderRight: '1px solid #111827', textAlign: 'center' }}>No. of Articles</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #111827' }}>Said to Contain (Cargo Description)</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #111827', textAlign: 'right' }}>Actual Wt</th>
                    <th style={{ padding: '6px', borderRight: '1px solid #111827', textAlign: 'right' }}>Charged Wt</th>
                    <th style={{ padding: '6px' }}>Private Mark</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #111827', height: '60px', verticalAlign: 'top' }}>
                    <td style={{ padding: '8px', borderRight: '1px solid #111827', textAlign: 'center', fontWeight: '700' }}>{previewBilty.articles}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #111827' }}>{previewBilty.saidToContain || previewBilty.said_to_contain}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #111827', textAlign: 'right' }}>{previewBilty.actualWt || previewBilty.actual_wt} kg</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #111827', textAlign: 'right', fontWeight: '700' }}>{previewBilty.chargeWt || previewBilty.charge_wt} kg</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}><code>{previewBilty.privateMark || previewBilty.private_mark || 'N/A'}</code></td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Breakup & Insurance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'start' }}>
                {/* Insurance / Risk */}
                <div style={{ border: '1px solid #111827', padding: '10px', borderRadius: '4px' }}>
                  <h4 style={{ textTransform: 'uppercase', fontWeight: '800', marginBottom: '6px', borderBottom: '1px dashed #111827', paddingBottom: '3px' }}>Risk & Transit Insurance Notes</h4>
                  <p><strong>Risk Terms:</strong> {previewBilty.riskBasis === 'Carrier' ? "CARRIER'S RISK (CR)" : "OWNER'S RISK (OR)"}</p>
                  {previewBilty.riskBasis === 'Carrier' ? (
                    <div style={{ marginTop: '5px', fontSize: '0.72rem', color: '#374151' }}>
                      <p><strong>Ins. Company:</strong> {previewBilty.insuranceCompany}</p>
                      <p style={{ marginTop: '2px' }}><strong>Policy Number:</strong> {previewBilty.insurancePolicyNo}</p>
                      <p style={{ marginTop: '2px' }}><strong>Policy Date:</strong> {previewBilty.insuranceDate}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '4px', lineHeight: '1.3' }}>Goods are carried at Owner's Risk. The transporter is not liable for structural transit loss or damage claims except in gross carrier neglect.</p>
                  )}
                </div>

                {/* GST / Freight values */}
                <div style={{ border: '1px solid #111827', background: '#f9fafb', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Basic Freight Amount:</span>
                    <strong>₹{(previewBilty.freightAmt || previewBilty.freight_amt)?.toLocaleString('en-IN')}</strong>
                  </div>
                  
                  {previewBilty.cgst > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>CGST:</span>
                      <span>₹{previewBilty.cgst?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {previewBilty.sgst > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>SGST:</span>
                      <span>₹{previewBilty.sgst?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {previewBilty.igst > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>IGST:</span>
                      <span>₹{previewBilty.igst?.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #111827', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                    <span>Consolidated Freight Value:</span>
                    <span>₹{Math.round((previewBilty.freightAmt || previewBilty.freight_amt) + (previewBilty.cgst || 0) + (previewBilty.sgst || 0) + (previewBilty.igst || 0))?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#4b5563', textAlign: 'right', marginTop: '2px' }}>
                    GST Category: {previewBilty.gstBillingMode === 'RCM' ? 'GTA Reverse Charge (RCM)' : 'Forward Charge GST'}
                  </div>
                </div>
              </div>

              {/* Standard Transporter Terms */}
              <div style={{ fontSize: '0.62rem', color: '#4b5563', lineHeight: '1.3', borderTop: '1px solid #111827', paddingTop: '8px' }}>
                <p><strong>TERMS AND CONDITIONS OF CARRIAGE:</strong></p>
                <p style={{ marginTop: '2px' }}>1. The transporter is not responsible for transit shortages, leaks, or accidental fire damage unless caused by carrier liability.</p>
                <p>2. Demurrage and detention charges apply at ₹500 per day if delivery placement is delayed beyond 24 hours of vehicle reporting.</p>
                <p>3. Disputes, if any, are subject to Mumbai Jurisdiction courts exclusively.</p>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '24px', fontSize: '0.78rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #111827', width: '70%', margin: '0 auto', paddingTop: '4px' }}>
                    <strong>Consignor Signature</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #111827', width: '70%', margin: '0 auto', paddingTop: '4px' }}>
                    <strong>transporter / Agent Sign</strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP DISPATCH NOTIFICATION MODAL */}
      {whatsappModalData && (
        <div className="modal-backdrop">
          <div className="glass-panel modal-card" style={{ maxWidth: '640px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#25D366', color: '#fff', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', fontFamily: 'var(--font-display)' }}>WhatsApp Automated Dispatch Alerts</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Instant Notifications for {whatsappModalData.isFTL ? 'FTL Trip' : 'PTL Consignment'} <strong>#{whatsappModalData.id}</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setWhatsappModalData(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Consignor WhatsApp */}
              <div style={{ background: 'hsla(142, 70%, 45%, 0.07)', border: '1px solid hsla(142, 70%, 45%, 0.25)', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#25D366' }}>Consignor (Shipper)</span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>WhatsApp Ready</span>
                  </div>
                  <p style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px' }}>{whatsappModalData.consignor}</p>
                  
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.35)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-line', lineHeight: '1.45', fontFamily: 'monospace', border: '1px solid var(--border-subtle)' }}>
                    {`Hello ${whatsappModalData.consignor},\nYour consignment #${whatsappModalData.id} has DISPATCHED! 🚚\nVehicle: ${whatsappModalData.vehicleNo}\nDriver: ${whatsappModalData.driverName} (${whatsappModalData.driverPhone})\nRoute: ${whatsappModalData.origin} ➔ ${whatsappModalData.destination}\nPkgs: ${whatsappModalData.articles} (${whatsappModalData.chargeWt} kg)\nLive Track: https://logisync.app/track/${whatsappModalData.id}`}
                  </div>
                </div>

                <a
                  href={`https://api.whatsapp.com/send?phone=${whatsappModalData.consignorPhone || '917799654708'}&text=${encodeURIComponent(`Hello ${whatsappModalData.consignor},\nYour consignment #${whatsappModalData.id} has DISPATCHED! 🚚\nVehicle: ${whatsappModalData.vehicleNo}\nDriver: ${whatsappModalData.driverName} (${whatsappModalData.driverPhone})\nRoute: ${whatsappModalData.origin} ➔ ${whatsappModalData.destination}\nPkgs: ${whatsappModalData.articles} (${whatsappModalData.chargeWt} kg)\nLive Track: https://logisync.app/track/${whatsappModalData.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '14px', background: '#25D366', color: '#fff', justifyContent: 'center', fontSize: '0.8rem', padding: '9px', textDecoration: 'none' }}
                >
                  <Send size={14} /> Send WhatsApp (+{whatsappModalData.consignorPhone || '917799654708'})
                </a>
              </div>

              {/* Consignee WhatsApp */}
              <div style={{ background: 'hsla(142, 70%, 45%, 0.07)', border: '1px solid hsla(142, 70%, 45%, 0.25)', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#25D366' }}>Consignee (Receiver)</span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>WhatsApp Ready</span>
                  </div>
                  <p style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px' }}>{whatsappModalData.consignee}</p>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.35)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-line', lineHeight: '1.45', fontFamily: 'monospace', border: '1px solid var(--border-subtle)' }}>
                    {`Hello ${whatsappModalData.consignee},\nShipment #${whatsappModalData.id} from ${whatsappModalData.consignor} is EN ROUTE! 🚚\nVehicle: ${whatsappModalData.vehicleNo}\nDriver Contact: ${whatsappModalData.driverPhone}\nDestination: ${whatsappModalData.destination}\nTerms: ${whatsappModalData.freightTerms}\nLive Track: https://logisync.app/track/${whatsappModalData.id}`}
                  </div>
                </div>

                <a
                  href={`https://api.whatsapp.com/send?phone=${whatsappModalData.consigneePhone || '919876543210'}&text=${encodeURIComponent(`Hello ${whatsappModalData.consignee},\nShipment #${whatsappModalData.id} from ${whatsappModalData.consignor} is EN ROUTE! 🚚\nVehicle: ${whatsappModalData.vehicleNo}\nDriver Contact: ${whatsappModalData.driverPhone}\nDestination: ${whatsappModalData.destination}\nTerms: ${whatsappModalData.freightTerms}\nLive Track: https://logisync.app/track/${whatsappModalData.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '14px', background: '#25D366', color: '#fff', justifyContent: 'center', fontSize: '0.8rem', padding: '9px', textDecoration: 'none' }}
                >
                  <Send size={14} /> Send WhatsApp (+{whatsappModalData.consigneePhone || '919876543210'})
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button"
                className="btn-ghost" 
                onClick={() => setWhatsappModalData(null)}
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS print stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #bilty-printable-area, #bilty-printable-area * {
            visibility: visible;
          }
          #bilty-printable-area {
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
