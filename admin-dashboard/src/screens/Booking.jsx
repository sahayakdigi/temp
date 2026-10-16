import React, { useState, useEffect } from 'react';
import { FileText, Calculator, Truck, Layers, FileSignature, CheckCircle, ArrowRight, Info, Plus, Trash2, Printer, X, ShieldCheck, MessageSquare, Send, UserCheck, Download, Loader2, AlertTriangle, Search } from 'lucide-react';
import GlossaryTooltip from '../components/GlossaryTooltip';
import { GLOSSARY } from '../components/glossaryData';
import { api, isTruckAvailable, isDriverAvailable } from '../services/api';
import RouteWeatherPanel from '../components/RouteWeatherPanel';

export default function Booking({ lrs, setLrs, trips, setTrips, parties, rateCards, trucks, drivers, manifests = [] }) {
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

  // --- Cancel / Delete Consignment Load States ---
  const [loadToDelete, setLoadToDelete] = useState(null);
  const [isDeletingLoad, setIsDeletingLoad] = useState(false);
  const [loadSearchQuery, setLoadSearchQuery] = useState('');
  const [loadFilterType, setLoadFilterType] = useState('ALL');

  const handleConfirmDeleteLoad = async () => {
    if (!loadToDelete) return;
    setIsDeletingLoad(true);
    try {
      const lrNo = loadToDelete.lrNo;
      const tripId = loadToDelete.tripId;
      
      await api.deleteLoad({ lrNo, tripId });
      
      if (lrNo && setLrs) {
        setLrs(prev => prev.filter(l => (l.lrNo || l.lr_no) !== lrNo));
      }
      if (tripId && setTrips) {
        setTrips(prev => prev.filter(t => t.id !== tripId && t.lorryReceiptNo !== lrNo));
      } else if (lrNo && setTrips) {
        setTrips(prev => prev.filter(t => t.lorryReceiptNo !== lrNo));
      }
      
      setSuccessMsg(`Consignment ${lrNo} ${tripId ? `& Trip ${tripId}` : ''} successfully cancelled and purged from database.`);
      setLoadToDelete(null);
    } catch (err) {
      alert(`Failed to delete load: ${err.message}`);
    } finally {
      setIsDeletingLoad(false);
    }
  };

  const recentLoads = React.useMemo(() => {
    return (lrs || []).map(lr => {
      const lrNum = lr.lrNo || lr.lr_no;
      const matchingTrip = (trips || []).find(t => 
        t.lorryReceiptNo === lrNum || 
        t.id === lr.tripId || 
        (lr.vehicleNo && t.truckNo === lr.vehicleNo && t.origin === lr.origin && t.destination === lr.destination)
      );
      const isFtlLoad = !!matchingTrip || !!lr.vehicleNo;
      return {
        lr,
        trip: matchingTrip || null,
        lrNo: lrNum,
        isFtl: isFtlLoad,
        tripId: matchingTrip ? matchingTrip.id : null,
        date: lr.date || lr.start_date || (matchingTrip ? matchingTrip.startDate : 'Recent'),
        origin: lr.origin,
        destination: lr.destination,
        vehicleNo: matchingTrip?.truckNo || lr.vehicleNo || 'N/A',
        driverName: matchingTrip?.driverName || 'N/A',
        articles: lr.articles,
        chargeWt: lr.chargeWt || lr.charge_wt || lr.actualWt || 0,
        freight: matchingTrip?.contractRate || lr.freightAmt || lr.freight_amt || 0,
        status: matchingTrip ? matchingTrip.status : lr.status
      };
    });
  }, [lrs, trips]);

  const filteredLoads = React.useMemo(() => {
    return recentLoads.filter(load => {
      if (loadFilterType === 'FTL' && !load.isFtl) return false;
      if (loadFilterType === 'PTL' && load.isFtl) return false;
      if (loadSearchQuery.trim()) {
        const q = loadSearchQuery.toLowerCase();
        const matchLr = (load.lrNo || '').toLowerCase().includes(q);
        const matchTrip = (load.tripId || '').toLowerCase().includes(q);
        const matchVeh = (load.vehicleNo || '').toLowerCase().includes(q);
        const matchDriver = (load.driverName || '').toLowerCase().includes(q);
        const matchRoute = `${load.origin} ${load.destination}`.toLowerCase().includes(q);
        return matchLr || matchTrip || matchVeh || matchDriver || matchRoute;
      }
      return true;
    });
  }, [recentLoads, loadFilterType, loadSearchQuery]);

  // --- Broker & Commission States ---
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [brokerCommissionMode, setBrokerCommissionMode] = useState('percent'); // 'percent' vs 'flat'
  const [brokerCommissionVal, setBrokerCommissionVal] = useState('');

  const handleBrokerChange = (brokerId) => {
    setSelectedBrokerId(brokerId);
    if (!brokerId) {
      setBrokerCommissionVal('');
      return;
    }
    const b = parties.find(p => p.id === brokerId);
    if (b) {
      const defaultRate = b.commissionRate ?? b.commission_rate ?? 5;
      if (brokerCommissionMode === 'percent') {
        setBrokerCommissionVal(String(defaultRate));
      } else {
        const base = isFTL ? Number(contractRate || 0) : Number(freightAmt || 0);
        setBrokerCommissionVal(String(Math.round((base * Number(defaultRate)) / 100)));
      }
    }
  };

  const handleCommissionModeToggle = (mode) => {
    setBrokerCommissionMode(mode);
    const b = parties.find(p => p.id === selectedBrokerId);
    const base = isFTL ? Number(contractRate || 0) : Number(freightAmt || 0);
    const defaultRate = Number(b?.commissionRate ?? b?.commission_rate ?? 5);
    if (mode === 'percent') {
      setBrokerCommissionVal(String(defaultRate));
    } else {
      setBrokerCommissionVal(String(Math.round((base * defaultRate) / 100)));
    }
  };
  
  // --- Indian GST GTA States (FR-15.2) ---
  const [gstBillingMode, setGstBillingMode] = useState('RCM'); // 'RCM' (5%) vs 'Forward' (12%)

  // --- Risk Basis & Insurance States (FR-15.6) ---
  const [riskBasis, setRiskBasis] = useState('Owner'); // 'Owner' vs 'Carrier'
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [insurancePolicyNo, setInsurancePolicyNo] = useState('');
  const [insuranceDate, setInsuranceDate] = useState('');

  // --- FTL Specific States ---
  const [contractRate, setContractRate]   = useState(60000);
  const [selectedTruck, setSelectedTruck] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  // Hired / Ad-hoc truck states (ephemeral: attached to LR & Trip without cluttering permanent fleet masters)
  const [truckSourceType, setTruckSourceType] = useState('fleet'); // 'fleet' or 'hired'
  const [hiredTruckNo, setHiredTruckNo]       = useState('');
  const [driverSourceType, setDriverSourceType] = useState('fleet'); // 'fleet' or 'custom'
  const [customDriverName, setCustomDriverName] = useState('');
  const [customDriverPhone, setCustomDriverPhone] = useState('');

  // Auto-select first AVAILABLE truck and driver if none selected or current is invalid
  useEffect(() => {
    if (!selectedTruck || !trucks.some(t => (t.regNo || t.reg_no) === selectedTruck)) {
      const avail = trucks.find(t => isTruckAvailable(t.regNo || t.reg_no, trips, manifests, trucks).available);
      setSelectedTruck((avail?.regNo || avail?.reg_no) || trucks[0]?.regNo || trucks[0]?.reg_no || '');
    }
  }, [trucks, trips, manifests]);

  useEffect(() => {
    if (!selectedDriver || !drivers.some(d => d.id === selectedDriver)) {
      const avail = drivers.find(d => isDriverAvailable(d.id, trips, manifests, drivers).available);
      setSelectedDriver(avail?.id || drivers[0]?.id || '');
    }
  }, [drivers, trips, manifests]);

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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const element = document.getElementById('bilty-printable-area');
    if (!element) return;
    setIsDownloadingPdf(true);
    try {
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const lrName = previewBilty?.lrNo || previewBilty?.lr_no || 'Document';
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `Bilty_${lrName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await window.html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.warn('Direct PDF conversion fallback to print window:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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

  // Broker Calculations
  const selectedBroker = parties.find(p => p.id === selectedBrokerId);
  const baseFreightAmt = isFTL ? Number(contractRate || 0) : Number(freightAmt || 0);
  const commissionInputVal = Number(brokerCommissionVal || 0);
  const calculatedBrokerCommission = selectedBrokerId 
    ? (brokerCommissionMode === 'percent' 
        ? Math.round((baseFreightAmt * commissionInputVal) / 100) 
        : Math.round(commissionInputVal))
    : 0;

  // Broker TDS calculation
  const brokerTdsRate = selectedBroker 
    ? (selectedBroker.tdsSection === 'Exempt' 
        ? 0 
        : Number(selectedBroker.tdsRate ?? selectedBroker.tds_rate ?? (selectedBroker.tdsSection === '194H' ? 5 : 2))) 
    : 0;
  const brokerTdsAmt = Math.round((calculatedBrokerCommission * brokerTdsRate) / 100);
  const brokerNetPayout = calculatedBrokerCommission - brokerTdsAmt;

  // Sub-broker hierarchy split
  const isSubBrokerSelected = selectedBroker && Boolean(selectedBroker.parentBrokerId || selectedBroker.parent_broker_id);
  const parentBrokerObj = isSubBrokerSelected 
    ? parties.find(p => p.id === (selectedBroker.parentBrokerId || selectedBroker.parent_broker_id))
    : null;
  const subSplitPct = Number(selectedBroker?.subSplitPct ?? selectedBroker?.sub_split_pct ?? 30);
  const subBrokerSplitAmt = isSubBrokerSelected ? Math.round((calculatedBrokerCommission * subSplitPct) / 100) : 0;
  const primaryBrokerSplitAmt = isSubBrokerSelected ? (calculatedBrokerCommission - subBrokerSplitAmt) : calculatedBrokerCommission;

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
      broker_id: selectedBrokerId || null,
      broker_name: selectedBroker ? selectedBroker.name : null,
      broker_commission: calculatedBrokerCommission,
      broker_commission_type: brokerCommissionMode,
      broker_commission_rate: commissionInputVal,
      broker_tds_amt: brokerTdsAmt,
      broker_net_payout: brokerNetPayout,
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
    if (e && e.preventDefault) e.preventDefault();
    const activeConsignor = consignorObj || parties.find(p => p.name === consignor) || parties[0];
    const activeConsignee = consigneeObj || parties.find(p => p.name === consignee) || parties[1] || parties[0];
    if (!activeConsignor || !activeConsignee) {
      alert('Error: Consignor or Consignee not found in Parties master.');
      return;
    }

    const base = {
      lr_no: `LR-2026-0${lrs.length + 1}`,
      booking_branch: getBookingBranchCode(origin),
      consignor_id: activeConsignor.id || 'PRT-CLIENT-01', 
      consignee_id: activeConsignee.id || 'PRT-CLIENT-02',
      consignor: activeConsignor.name || consignor,
      consignee: activeConsignee.name || consignee,
      broker_id: selectedBrokerId || null,
      broker_name: selectedBroker ? selectedBroker.name : null,
      broker_commission: calculatedBrokerCommission,
      broker_commission_type: brokerCommissionMode,
      broker_commission_rate: commissionInputVal,
      broker_tds_amt: brokerTdsAmt,
      broker_net_payout: brokerNetPayout,
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

    const driverObj = (drivers || []).find(d => d.id === selectedDriver) || drivers[0];
    const effTruckNo = (truckSourceType === 'hired' ? hiredTruckNo.trim().toUpperCase() : selectedTruck) || trucks[0]?.regNo || 'MH-12-Q-4567';
    const effDriverName = driverSourceType === 'custom' ? (customDriverName.trim() || 'Hired Driver') : (driverObj?.name || 'Unknown');
    const effDriverPhone = driverSourceType === 'custom' ? (customDriverPhone.trim() || '9876543210') : (driverObj?.phone || '9876543210');

    if (isFTL) {
      if (truckSourceType === 'hired' && !hiredTruckNo.trim()) {
        alert('Please enter the hired truck vehicle number before booking.');
        return;
      }

      // ── Availability Guards: Must complete current trip first ──
      const truckCheck = isTruckAvailable(effTruckNo, trips, manifests, trucks);
      if (!truckCheck.available) {
        alert(`❌ Cannot Dispatch Consignment:\nVehicle ${effTruckNo} is NOT AVAILABLE!\n\nStatus: ${truckCheck.reason}.\n\nThe vehicle must complete and deliver its current trip before starting another trip.`);
        return;
      }

      const driverCheck = driverSourceType === 'fleet' 
        ? isDriverAvailable(selectedDriver, trips, manifests, drivers)
        : isDriverAvailable(effDriverName, trips, manifests, drivers);
      if (!driverCheck.available) {
        alert(`❌ Cannot Dispatch Consignment:\nDriver "${effDriverName}" is NOT AVAILABLE!\n\nStatus: ${driverCheck.reason}.\n\nThe driver must complete and deliver their current trip before being assigned another trip.`);
        return;
      }

      const newTripId = `TRP-2026-0${trips.length + 1}`;
      
      const payload = { 
        ...base, 
        freight_amt: Number(contractRate),
        vehicle_no: effTruckNo,
        vehicleNo: effTruckNo
      };

      api.createLR(payload)
        .then(saved => {
          setLrs([saved, ...lrs]);
          
          const newTripData = { 
            id: newTripId, 
            origin, 
            destination, 
            contractRate: Number(contractRate), 
            truckNo: effTruckNo, 
            driverId: driverSourceType === 'custom' ? 'DRV-HIRED' : (selectedDriver || 'DRV-001'), 
            driverName: effDriverName, 
            driverPhone: effDriverPhone,
            odoStart: null, 
            odoEnd: null,
            status: 'Assigned', 
            startDate: base.date, 
            expenses: [], 
            driverAdvance: 10000, 
            lorryReceiptNo: base.lr_no 
          };

          const cPhone = formatPhoneForWhatsapp(activeConsignor, '7799654708');
          const dPhone = formatPhoneForWhatsapp(activeConsignee, '9876543210');

          api.createTrip(newTripData)
            .then(savedTrip => {
              setTrips([savedTrip, ...trips]);
              setSuccessMsg(`FTL Dispatch Trip ${newTripId} & LR ${base.lr_no} with Truck ${effTruckNo} generated successfully.`);
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
                vehicleNo: effTruckNo,
                driverName: effDriverName,
                driverPhone: effDriverPhone,
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

      const cPhone = formatPhoneForWhatsapp(activeConsignor, '7799654708');
      const dPhone = formatPhoneForWhatsapp(activeConsignee, '9876543210');

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
        <form noValidate className="glass-panel" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '22px' }} onSubmit={handleSubmit}>

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

          {/* Agent / Broker Selection & Manual Commission Section */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: selectedBroker ? '1px solid hsla(38, 92%, 50%, 0.35)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  background: selectedBroker ? 'hsla(38, 92%, 50%, 0.15)' : 'var(--bg-void)',
                  color: selectedBroker ? 'var(--accent-warning)' : 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: '6px'
                }}>
                  <UserCheck size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: selectedBroker ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    Booking Agent / Broker (Optional)
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                    Assign commission agent, customize rate or manual payout, & calculate TDS
                  </p>
                </div>
              </div>

              {selectedBroker && (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  ⭐ {selectedBroker.brokerType || selectedBroker.broker_type || 'Agent'} Assigned
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedBroker ? '1.2fr 1.8fr' : '1fr', gap: '14px' }}>
              {/* Broker Selector */}
              <div>
                <label className="label-premium" style={{ fontSize: '0.74rem' }}>Select Agent / Broker</label>
                <select 
                  className="input-premium" 
                  value={selectedBrokerId} 
                  onChange={e => handleBrokerChange(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                >
                  <option value="">None / Direct Booking (No Broker)</option>
                  {parties.filter(p => p.type === 'broker').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.name} ({p.brokerType || p.broker_type || 'Broker'} · {p.commissionRate || p.commission_rate || 5}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Manual Commission Controls */}
              {selectedBroker && (
                <div style={{
                  background: 'var(--bg-void)',
                  border: '1px solid hsla(38, 92%, 50%, 0.25)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-warning)' }}>
                      Commission Calculation & Manual Override
                    </span>
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', padding: '2px', borderRadius: '4px' }}>
                      <button
                        type="button"
                        className={`toggle-btn ${brokerCommissionMode === 'percent' ? 'active' : ''}`}
                        style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        onClick={() => handleCommissionModeToggle('percent')}
                      >
                        Percent (%)
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${brokerCommissionMode === 'flat' ? 'active' : ''}`}
                        style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        onClick={() => handleCommissionModeToggle('flat')}
                      >
                        Flat (₹)
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.7rem' }}>
                        {brokerCommissionMode === 'percent' ? 'Commission Rate (%)' : 'Manual Flat Amount (₹)'}
                      </label>
                      <input 
                        type="number"
                        step={brokerCommissionMode === 'percent' ? '0.1' : '1'}
                        className="input-premium"
                        style={{ fontSize: '0.82rem', padding: '6px 10px', borderColor: 'hsla(38, 92%, 50%, 0.4)' }}
                        placeholder={brokerCommissionMode === 'percent' ? 'e.g. 5.0' : 'e.g. 1500'}
                        value={brokerCommissionVal}
                        onChange={e => setBrokerCommissionVal(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label-premium" style={{ fontSize: '0.7rem' }}>Gross Calculated Commission</label>
                      <div style={{
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        color: 'var(--accent-warning)'
                      }}>
                        ₹{calculatedBrokerCommission.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Broker Compliance / TDS breakdown */}
                  <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    paddingTop: '6px',
                    borderTop: '1px dashed var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      PAN: <strong>{selectedBroker.pan || 'N/A'}</strong> · TDS: <strong>{selectedBroker.tdsSection || selectedBroker.tds_section || '194H'} ({brokerTdsRate}%)</strong>
                    </span>
                    <span>
                      TDS Ded: <strong style={{ color: 'var(--accent-danger)' }}>-₹{brokerTdsAmt.toLocaleString('en-IN')}</strong> · Net Pay: <strong style={{ color: 'var(--accent-success)' }}>₹{brokerNetPayout.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>

                  {/* Sub-broker hierarchy split preview */}
                  {isSubBrokerSelected && (
                    <div style={{
                      fontSize: '0.7rem',
                      background: 'hsla(38, 92%, 50%, 0.08)',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)'
                    }}>
                      ⚡ <strong>Sub-broker split ({subSplitPct}%):</strong> Sub ₹{subBrokerSplitAmt.toLocaleString('en-IN')} | Primary ({100 - subSplitPct}% to {parentBrokerObj?.name || 'Primary'}): ₹{primaryBrokerSplitAmt.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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
              <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginTop: '6px', background: 'var(--bg-void)', padding: '10px', borderRadius: '6px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="label-premium">FTL Load Weight (kg)</label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--brand-light)', fontWeight: '700' }}>
                      {(Number(actualWt || 0) / 1000).toFixed(1)} MT
                    </span>
                  </div>
                  <input 
                    type="number" 
                    className="input-premium" 
                    placeholder="e.g. 15000" 
                    value={actualWt} 
                    onChange={e => {
                      setActualWt(e.target.value);
                      setChargeWt(e.target.value);
                    }} 
                  />
                </div>
                <div>
                  <label className="label-premium">Chargeable Weight (kg)</label>
                  <input 
                    type="number" 
                    className="input-premium" 
                    value={chargeWt} 
                    onChange={e => setChargeWt(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="label-premium">No. of Articles / Pkgs</label>
                  <input 
                    type="number" 
                    className="input-premium" 
                    placeholder="1 (Full Load)" 
                    value={articles} 
                    onChange={e => setArticles(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <div>
                  <label className="label-premium">Cargo Description (Said to Contain)</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="e.g. Steel Coils, Heavy Machinery, FMCG Pallets" 
                    value={saidToContain} 
                    onChange={e => setSaidToContain(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="label-premium">Private Mark / Stencil</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="e.g. FTL-DEL-MUM-01" 
                    value={privateMark} 
                    onChange={e => setPrivateMark(e.target.value)} 
                  />
                </div>
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
          <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <div style={{ padding: '18px', background: 'var(--brand-glow-lg)', borderRadius: 'var(--radius-md)', border: '1px solid hsla(205, 90%, 55%, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--brand-light)', display: 'flex', alignItems: 'center', gap: '7px', fontWeight: '700' }}>
                  <Truck size={16} /> Vehicle Sourcing & Dispatch
                </h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`toggle-btn ${truckSourceType === 'fleet' ? 'active' : ''}`}
                    style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                    onClick={() => setTruckSourceType('fleet')}
                  >
                    Registered Fleet
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${truckSourceType === 'hired' ? 'active' : ''}`}
                    style={{ padding: '3px 10px', fontSize: '0.72rem', borderColor: truckSourceType === 'hired' ? 'var(--brand)' : undefined }}
                    onClick={() => setTruckSourceType('hired')}
                  >
                    + Hired / New Truck
                  </button>
                </div>
              </div>

              {/* Live Availability Calculation & Selectors */}
              {(() => {
                const effTruckReg = truckSourceType === 'fleet' ? selectedTruck : hiredTruckNo.trim().toUpperCase();
                const effTruckCheck = isTruckAvailable(effTruckReg, trips, manifests, trucks);
                const effDriverCheck = driverSourceType === 'fleet'
                  ? isDriverAvailable(selectedDriver, trips, manifests, drivers)
                  : (customDriverName.trim() ? isDriverAvailable(customDriverName.trim(), trips, manifests, drivers) : { available: true });

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="label-premium">
                          {truckSourceType === 'fleet' ? 'Assign Fleet Truck' : 'Hired Truck Vehicle Number'}
                        </label>
                        {truckSourceType === 'fleet' ? (
                          <select className="input-premium" value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)}>
                            {trucks.map(t => {
                              const reg = t.regNo || t.reg_no;
                              const chk = isTruckAvailable(reg, trips, manifests, trucks);
                              return (
                                <option 
                                  key={reg} 
                                  value={reg}
                                  disabled={!chk.available}
                                  style={{
                                    color: chk.available ? '#10b981' : '#ef4444',
                                    fontWeight: '600'
                                  }}
                                >
                                  {chk.available ? '🟢 ' : '🔴 '}
                                  {reg} ({t.ownership || 'Fleet'} · {t.model || 'Truck'}) — {chk.available ? 'Available' : `Not Available (${chk.reason})`}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div>
                            <input
                              type="text"
                              className="input-premium"
                              placeholder="e.g. MH-12-AB-1234"
                              value={hiredTruckNo}
                              onChange={e => setHiredTruckNo(e.target.value.toUpperCase())}
                              style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: '700' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                              ⚡ Ad-hoc vehicle for this trip & bilty (not added permanently to fleet masters)
                            </span>
                          </div>
                        )}

                        {/* Live Truck Status Card */}
                        {effTruckReg && (
                          effTruckCheck.available ? (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 10px', borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#10b981', fontSize: '0.74rem', fontWeight: '700', marginTop: '6px'
                            }}>
                              <CheckCircle size={13} /> 🟢 Vehicle {effTruckReg} is Available &amp; Ready
                            </div>
                          ) : (
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: '2px',
                              padding: '7px 10px', borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.45)',
                              color: '#f87171', fontSize: '0.74rem', fontWeight: '700', marginTop: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <AlertTriangle size={13} /> 🔴 Vehicle {effTruckReg} — NOT AVAILABLE
                              </div>
                              <span style={{ fontSize: '0.68rem', fontWeight: '500', color: '#fca5a5' }}>
                                {effTruckCheck.reason}. Must complete this trip before taking another trip!
                              </span>
                            </div>
                          )
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
                            {driverSourceType === 'fleet' ? '+ Custom / Hired Driver' : 'Pick Fleet Driver'}
                          </button>
                        </div>
                        {driverSourceType === 'fleet' ? (
                          <select className="input-premium" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                            {drivers.map(d => {
                              const chk = isDriverAvailable(d.id, trips, manifests, drivers);
                              return (
                                <option 
                                  key={d.id} 
                                  value={d.id}
                                  disabled={!chk.available}
                                  style={{
                                    color: chk.available ? '#10b981' : '#ef4444',
                                    fontWeight: '600'
                                  }}
                                >
                                  {chk.available ? '🟢 ' : '🔴 '}
                                  {d.name} ({d.phone || 'No phone'}) — {chk.available ? 'Available' : `Not Available (${chk.reason})`}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
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

                        {/* Live Driver Status Card */}
                        {(driverSourceType === 'fleet' ? selectedDriver : customDriverName.trim()) && (
                          effDriverCheck.available ? (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 10px', borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#10b981', fontSize: '0.74rem', fontWeight: '700', marginTop: '6px'
                            }}>
                              <CheckCircle size={13} /> 🟢 Driver {driverSourceType === 'fleet' ? (drivers.find(d => d.id === selectedDriver)?.name || 'Driver') : customDriverName} is Available
                            </div>
                          ) : (
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: '2px',
                              padding: '7px 10px', borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.45)',
                              color: '#f87171', fontSize: '0.74rem', fontWeight: '700', marginTop: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <AlertTriangle size={13} /> 🔴 Driver {driverSourceType === 'fleet' ? (drivers.find(d => d.id === selectedDriver)?.name || 'Driver') : customDriverName} — NOT AVAILABLE
                              </div>
                              <span style={{ fontSize: '0.68rem', fontWeight: '500', color: '#fca5a5' }}>
                                {effDriverCheck.reason}. Must complete this trip before another trip can be assigned!
                              </span>
                            </div>
                          )
                        )}
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
                  </>
                );
              })()}
            </div>
          )}

          {/* Availability warning banner if user attempts FTL dispatch with busy resources */}
          {isFTL && (() => {
            const effTruckReg = truckSourceType === 'fleet' ? selectedTruck : hiredTruckNo.trim().toUpperCase();
            const effTruckCheck = isTruckAvailable(effTruckReg, trips, manifests, trucks);
            const effDriverCheck = driverSourceType === 'fleet'
              ? isDriverAvailable(selectedDriver, trips, manifests, drivers)
              : (customDriverName.trim() ? isDriverAvailable(customDriverName.trim(), trips, manifests, drivers) : { available: true });

            if (!effTruckCheck.available || !effDriverCheck.available) {
              return (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, color: '#ef4444' }} />
                  <div>
                    <strong>Cannot Dispatch:</strong>{' '}
                    {!effTruckCheck.available && `Vehicle ${effTruckReg} is busy (${effTruckCheck.reason}). `}
                    {!effDriverCheck.available && `Driver is busy (${effDriverCheck.reason}). `}
                    <span>Complete and deliver the active trip first before creating a new trip!</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

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
                <div style={{ background: 'var(--brand-glow)', border: '1px solid hsla(205, 90%, 55%,0.2)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Net Freight + Tax</span>
                  <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
                    ₹{Math.round(Number(freightAmt) + gstDetails.cgst + gstDetails.sgst + gstDetails.igst).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Broker Commission Strip in Rating Engine */}
                {selectedBroker && calculatedBrokerCommission > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '0.82rem',
                    background: 'hsla(38, 92%, 50%, 0.08)',
                    border: '1px dashed hsla(38, 92%, 50%, 0.35)',
                    padding: '8px 10px',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-warning)', fontWeight: '600' }}>
                      <span>Broker Comm. ({selectedBroker.name.substring(0, 15)}):</span>
                      <span>₹{calculatedBrokerCommission.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>TDS ({brokerTdsRate}%): -₹{brokerTdsAmt.toLocaleString('en-IN')}</span>
                      <span>Net Payout: ₹{brokerNetPayout.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
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
                <div style={{ background: 'var(--brand-glow)', border: '1px solid hsla(205, 90%, 55%,0.2)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Total FTL Invoice</span>
                  <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--brand-light)', fontFamily: 'var(--font-display)' }}>
                    ₹{Math.round(Number(contractRate) + gstDetails.cgst + gstDetails.sgst + gstDetails.igst).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Broker Commission Strip in FTL Rating Engine */}
                {selectedBroker && calculatedBrokerCommission > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '0.82rem',
                    background: 'hsla(38, 92%, 50%, 0.08)',
                    border: '1px dashed hsla(38, 92%, 50%, 0.35)',
                    padding: '8px 10px',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-warning)', fontWeight: '600' }}>
                      <span>Broker Comm. ({selectedBroker.name.substring(0, 15)}):</span>
                      <span>₹{calculatedBrokerCommission.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>TDS ({brokerTdsRate}%): -₹{brokerTdsAmt.toLocaleString('en-IN')}</span>
                      <span>Net Payout: ₹{brokerNetPayout.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
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
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--brand-light)' }}>{item.lr_no}</div>
                      <div style={{ color: 'var(--text-primary)', marginTop: '2px', fontWeight: '500' }}>
                        {item.consignor?.substring(0, 16)} <ArrowRight size={10} style={{ verticalAlign: 'middle' }} /> {item.consignee?.substring(0, 16)}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                        {item.origin} ➔ {item.destination} · {item.articles} pkgs ({item.charge_wt} kg)
                      </div>
                      {item.broker_name && (
                        <div style={{ color: 'var(--accent-warning)', fontSize: '0.7rem', marginTop: '2px' }}>
                          Broker: {item.broker_name} · Comm: ₹{item.broker_commission} ({item.broker_commission_type === 'flat' ? 'Flat' : `${item.broker_commission_rate}%`})
                        </div>
                      )}
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

      {/* ── MANAGE RECENT CONSIGNMENTS & CANCEL/DELETE LOADS SECTION ── */}
      <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.12)', border: '1px solid var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={18} style={{ color: 'var(--brand)' }} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Recent Consignments &amp; Dispatched Loads</h3>
              <span className="badge badge-brand" style={{ fontSize: '0.7rem' }}>{filteredLoads.length} Loads</span>
            </div>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px', marginBottom: 0 }}>
              Review recently booked consignments, print bilties, or cancel &amp; permanently purge accidental or duplicate bookings.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search LR, Trip, Truck, Driver..."
                value={loadSearchQuery}
                onChange={(e) => setLoadSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  fontSize: '0.8rem',
                  background: 'var(--bg-void)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-void)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'ALL', label: 'All Loads' },
                { id: 'FTL', label: 'FTL Dispatch' },
                { id: 'PTL', label: 'PTL Staging' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLoadFilterType(tab.id)}
                  style={{
                    background: loadFilterType === tab.id ? 'var(--brand)' : 'transparent',
                    color: loadFilterType === tab.id ? '#070b14' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '0.75rem',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredLoads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-void)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
            <Layers size={36} style={{ color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.5 }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>No Consignments Found</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No bookings match the search criteria or filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>LR / Bilty #</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Type / Trip</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Route</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Vehicle &amp; Driver</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Qty / Weight</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Freight</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoads.map((load, idx) => (
                  <tr 
                    key={load.lrNo || idx}
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{load.lrNo}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{load.date}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {load.isFtl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="badge badge-brand" style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>FTL</span>
                          {load.tripId && <span style={{ fontSize: '0.72rem', color: 'var(--accent-warning)', fontFamily: 'monospace' }}>{load.tripId}</span>}
                        </div>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>PTL Staging</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        <span>{load.origin}</span>
                        <span style={{ color: 'var(--brand)' }}>➔</span>
                        <span>{load.destination}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{load.vehicleNo}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{load.driverName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {load.articles} pkgs • {Number(load.chargeWt).toLocaleString('en-IN')} kg
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: 'var(--accent-success)' }}>₹{Number(load.freight).toLocaleString('en-IN')}</strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        background: load.status === 'InTransit' ? 'rgba(0, 240, 255, 0.15)' : load.status === 'Delivered' ? 'rgba(16, 185, 129, 0.15)' : load.status === 'Assigned' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        color: load.status === 'InTransit' ? '#00f0ff' : load.status === 'Delivered' ? '#10b981' : load.status === 'Assigned' ? '#f59e0b' : 'var(--text-secondary)',
                        border: '1px solid currentColor'
                      }}>
                        {load.status || 'Booked'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewBilty(load.lr)}
                          title="View / Print Bilty"
                          style={{
                            background: 'var(--bg-void)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          <FileText size={13} style={{ color: 'var(--brand)' }} /> Bilty
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoadToDelete(load)}
                          title="Cancel and permanently delete load"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                        >
                          <Trash2 size={13} /> Cancel Load
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DELETE LOAD CONFIRMATION MODAL ── */}
      {loadToDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', position: 'relative', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 20px 50px rgba(239, 68, 68, 0.25)', borderRadius: '16px', background: 'var(--bg-elevated)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Cancel &amp; Delete Consignment?</h3>
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700' }}>PERMANENT PURGE FROM DATABASE</span>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
              You are about to cancel this booking and completely delete its records. This will remove:
            </p>

            <div style={{ background: 'var(--bg-void)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lorry Receipt (LR):</span>
                <strong style={{ color: 'var(--text-primary)' }}>{loadToDelete.lrNo}</strong>
              </div>
              {loadToDelete.tripId && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Trip:</span>
                  <strong style={{ color: 'var(--accent-warning)', fontFamily: 'monospace' }}>{loadToDelete.tripId}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Route:</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{loadToDelete.origin} ➔ {loadToDelete.destination}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle &amp; Driver:</span>
                <span style={{ color: 'var(--text-primary)' }}>{loadToDelete.vehicleNo} • {loadToDelete.driverName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Freight Value:</span>
                <strong style={{ color: 'var(--accent-success)' }}>₹{Number(loadToDelete.freight).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', color: '#f87171', marginBottom: '20px', lineHeight: '1.4' }}>
              ⚠️ <strong>Warning:</strong> This load will be purged from the central database, driver cockpit schedules, and accounting ledger. This operation cannot be reversed.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setLoadToDelete(null)}
                disabled={isDeletingLoad}
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Keep Consignment
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLoad}
                disabled={isDeletingLoad}
                className="btn-danger"
                style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isDeletingLoad ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Purging Data...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Yes, Cancel &amp; Delete Load
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINT BILTY (LR) PDF PREVIEW MODAL (FR-3.5) --- */}
      {previewBilty && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '12px'
        }}>
          <div className="glass-panel animate-scale-up bilty-modal-content" style={{
            width: '100%', maxWidth: '780px', maxHeight: '92vh',
            background: '#ffffff', color: '#111827',
            padding: '24px', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            overflowY: 'auto'
          }}>
            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="btn-primary" 
                style={{ background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8', padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isDownloadingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {isDownloadingPdf ? 'Generating PDF...' : 'Download as PDF'}
              </button>
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
                  <p style={{ marginTop: '4px' }}>
                    <strong>Vehicle / Truck No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '800', background: '#f3f4f6', padding: '1px 6px', borderRadius: '3px' }}>
                      {previewBilty.vehicleNo || previewBilty.vehicle_no || (trips.find(t => t.lorryReceiptNo === (previewBilty.lrNo || previewBilty.lr_no))?.truckNo) || 'Pending Allocation'}
                    </span>
                  </p>
                </div>
                <div style={{ background: '#fff', padding: '8px' }}>
                  <p><strong>Freight terms:</strong> <span style={{ textTransform: 'uppercase', fontWeight: '700' }}>{previewBilty.freightTerms || previewBilty.freight_terms}</span></p>
                  <p style={{ marginTop: '4px' }}><strong>E-Way Bill No:</strong> {previewBilty.ewayBill || previewBilty.eway_bill || 'N/A'}</p>
                  <p style={{ marginTop: '4px' }}><strong>Destination City:</strong> {previewBilty.destination}</p>
                  <p style={{ marginTop: '4px' }}><strong>Service Mode:</strong> <span style={{ fontWeight: '700' }}>{previewBilty.vehicleNo || isFTL ? 'FTL (Direct Truckload)' : 'PTL (Consolidated Hub)'}</span></p>
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

              {/* Agent / Broker details row */}
              {(previewBilty.broker_name || previewBilty.brokerName) && (
                <div style={{ border: '1px solid #111827', background: '#fffbeb', padding: '6px 10px', fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><strong>Booking Agent / Broker:</strong> {previewBilty.broker_name || previewBilty.brokerName}</span>
                  <span><strong>Commission:</strong> ₹{Number(previewBilty.broker_commission ?? previewBilty.brokerCommission ?? 0).toLocaleString('en-IN')} ({(previewBilty.broker_commission_type || previewBilty.brokerCommissionType) === 'flat' ? 'Flat' : `${previewBilty.broker_commission_rate ?? previewBilty.brokerCommissionRate ?? 5}%`})</span>
                </div>
              )}

              {/* Cargo Details Table */}
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #111827', fontSize: '0.78rem', minWidth: '550px' }}>
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
              </div>

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
                    <strong>{(previewBilty.broker_name || previewBilty.brokerName) ? `Agent (${previewBilty.broker_name || previewBilty.brokerName}) / Transporter` : 'Transporter / Agent Sign'}</strong>
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
                  
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-void)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-line', lineHeight: '1.45', fontFamily: 'monospace', border: '1px solid var(--border-subtle)' }}>
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

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-void)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-line', lineHeight: '1.45', fontFamily: 'monospace', border: '1px solid var(--border-subtle)' }}>
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
