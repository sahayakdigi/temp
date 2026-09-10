import React, { useState, useEffect } from 'react';
import { Layers, FileText, CheckCircle, Barcode, Grid, Plus, ArrowRightLeft, AlertTriangle, Box, ShieldAlert, Printer, X, Eye } from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_BINS = {
  'A-01': { occupied: false, lr: '', count: 0, maxCapacity: 150, description: 'Electronics Section', weight: 0 },
  'A-02': { occupied: false, lr: '', count: 0, maxCapacity: 100, description: 'Fragile Shelving', weight: 0 },
  'B-01': { occupied: false, lr: '', count: 0, maxCapacity: 200, description: 'Heavy Metal Row', weight: 0 },
  'B-02': { occupied: false, lr: '', count: 0, maxCapacity: 150, description: 'High Volume Bin', weight: 0 },
  'C-01': { occupied: false, lr: '', count: 0, maxCapacity: 120, description: 'General Cargo Shelf', weight: 0 },
  'C-02': { occupied: false, lr: '', count: 0, maxCapacity: 120, description: 'Perishables Zone', weight: 0 },
};

const getStoredBins = () => {
  const saved = localStorage.getItem('temp_warehouse_bins');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return DEFAULT_BINS;
};

const getStoredDiscrepancies = () => {
  const saved = localStorage.getItem('temp_warehouse_discrepancies');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
};

export default function WarehouseOps({ lrs, setLrs }) {
  const pendingLrs = lrs.filter(l => l.status === 'Booked' || l.status === 'Crossing');

  // --- Active Tab ---
  const [activeSubTab, setActiveSubTab] = useState('inbound'); // 'inbound' vs 'discrepancy'

  // --- Form & Inbound States ---
  const [selectedLrNo, setSelectedLrNo] = useState(pendingLrs[0]?.lrNo || pendingLrs[0]?.lr_no || '');
  const [receivedQty, setReceivedQty]   = useState(pendingLrs[0]?.articles || 0);
  const [damageQty, setDamageQty]       = useState(0);
  const [selectedBin, setSelectedBin]   = useState('A-02');
  const [generatedTags, setGeneratedTags] = useState([]);
  const [successMsg, setSuccessMsg]     = useState('');

  // --- Visual Rack Inspector Drawer & Bin Transfer States ---
  const [inspectedBinId, setInspectedBinId] = useState(null);
  const [transferTargetBin, setTransferTargetBin] = useState('');

  // --- Barcode Scanner Simulator States ---
  const [scannedTagInput, setScannedTagInput] = useState('');
  const [scannedTagResult, setScannedTagResult] = useState(null);
  const [showScannerError, setShowScannerError] = useState(false);

  // --- Manual Add Bin Modal State ---
  const [showAddBinModal, setShowAddBinModal] = useState(false);
  const [newBinId, setNewBinId]               = useState('');
  const [newBinDesc, setNewBinDesc]           = useState('');
  const [newBinCapacity, setNewBinCapacity]   = useState(150);

  // --- Bins Storage & Live Sync with LRs ---
  const [storedBins, setStoredBins] = useState(getStoredBins);
  const [discrepancies, setDiscrepancies] = useState(getStoredDiscrepancies);

  // Load custom bins & discrepancies from PostgreSQL API / storage on mount
  useEffect(() => {
    api.getWarehouseBins().then(fetched => {
      if (fetched && Array.isArray(fetched) && fetched.length > 0) {
        const binMap = { ...DEFAULT_BINS };
        fetched.forEach(b => {
          binMap[b.id] = {
            occupied: false,
            lr: '',
            count: 0,
            maxCapacity: Number(b.max_capacity || b.maxCapacity || 150),
            description: b.description || 'Custom Storage Bin',
            weight: 0
          };
        });
        setStoredBins(binMap);
      } else if (fetched && typeof fetched === 'object' && Object.keys(fetched).length > 0) {
        setStoredBins(prev => ({ ...DEFAULT_BINS, ...fetched }));
      }
    }).catch(err => console.error('Failed to load warehouse bins from API:', err));

    api.getDiscrepancies().then(fetched => {
      if (fetched && Array.isArray(fetched)) {
        setDiscrepancies(fetched);
      }
    }).catch(err => console.error('Failed to load discrepancies from API:', err));
  }, []);

  // --- Multi-Bin Split Putaway States ---
  const [isSplitMode, setIsSplitMode]         = useState(false);
  const [splitAllocations, setSplitAllocations] = useState([]);

  // Compute live bins state dynamically deriving occupancy & stored cargo from LRs
  const bins = React.useMemo(() => {
    const liveBins = {};
    Object.keys(storedBins).forEach(id => {
      liveBins[id] = {
        ...storedBins[id],
        occupied: false,
        lr: '',
        count: 0,
        weight: 0
      };
    });

    lrs.forEach(lr => {
      const binVal = lr.warehouseBin || lr.warehouse_bin;
      if (!binVal) return;

      let splitList = [];
      if (typeof binVal === 'string' && binVal.startsWith('[')) {
        try { splitList = JSON.parse(binVal); } catch(e) {}
      } else if (Array.isArray(binVal)) {
        splitList = binVal;
      }

      if (splitList.length > 0) {
        splitList.forEach(item => {
          const bId = item.bin;
          const bCount = Number(item.count || 0);
          if (bId && liveBins[bId]) {
            const lrArticles = Number(lr.articles || 1);
            const ratio = bCount / lrArticles;
            const approxWt = Math.round(Number(lr.chargeWt || lr.charge_wt || lr.actualWt || 0) * ratio);
            
            const existingLr = liveBins[bId].lr;
            const lrLabel = `${lr.lrNo || lr.lr_no} (${bCount} pkgs)`;
            liveBins[bId] = {
              ...liveBins[bId],
              occupied: true,
              lr: existingLr ? `${existingLr}, ${lrLabel}` : lrLabel,
              count: liveBins[bId].count + bCount,
              weight: liveBins[bId].weight + approxWt
            };
          }
        });
      } else if (liveBins[binVal]) {
        const existingLr = liveBins[binVal].lr;
        const lrLabel = lr.lrNo || lr.lr_no;
        liveBins[binVal] = {
          ...liveBins[binVal],
          occupied: true,
          lr: existingLr ? `${existingLr}, ${lrLabel}` : lrLabel,
          count: liveBins[binVal].count + Number(lr.articles || 0),
          weight: liveBins[binVal].weight + Number(lr.chargeWt || lr.charge_wt || lr.actualWt || 0)
        };
      }
    });

    return liveBins;
  }, [lrs, storedBins]);

  const activeLrObj = lrs.find(l => (l.lrNo || l.lr_no) === selectedLrNo);

  // Helper to auto-distribute packages across available bins
  const handleAutoSplitLoad = () => {
    const reqQty = Number(receivedQty) || 0;
    if (reqQty <= 0) {
      alert('Please enter a valid received quantity greater than 0 first.');
      return;
    }

    let remainingToPlace = reqQty;
    const newAllocations = [];

    const binEntries = Object.entries(bins);
    for (const [binId, binObj] of binEntries) {
      if (remainingToPlace <= 0) break;
      const space = binObj.maxCapacity - binObj.count;
      if (space > 0) {
        const placeCount = Math.min(space, remainingToPlace);
        newAllocations.push({ bin: binId, count: placeCount });
        remainingToPlace -= placeCount;
      }
    }

    if (remainingToPlace > 0) {
      alert(`⚠ Notice: Total space across all available warehouse bins is ${reqQty - remainingToPlace} pkgs. You still need space for ${remainingToPlace} pkgs.\n\nYou can click "+ Add Custom Bin" to create a new storage bin!`);
    }

    if (newAllocations.length > 0) {
      setIsSplitMode(true);
      setSplitAllocations(newAllocations);
    }
  };

  // Auto sync pending consignment selection when LRs change or load
  useEffect(() => {
    if (pendingLrs.length > 0) {
      const isCurrentValid = pendingLrs.some(l => (l.lrNo || l.lr_no) === selectedLrNo);
      if (!selectedLrNo || !isCurrentValid) {
        const first = pendingLrs[0];
        const firstNo = first.lrNo || first.lr_no;
        setSelectedLrNo(firstNo);
        setReceivedQty(first.articles || 0);
      }
    } else if (selectedLrNo) {
      setSelectedLrNo('');
      setReceivedQty(0);
    }
  }, [lrs, selectedLrNo]);

  // Auto-allocate a bin with sufficient capacity whenever selected LR or received quantity changes
  useEffect(() => {
    if (isSplitMode) return;
    const reqQty = Number(receivedQty) || 0;
    if (reqQty > 0) {
      const currentBin = bins[selectedBin];
      const remaining = currentBin ? currentBin.maxCapacity - currentBin.count : 0;
      if (remaining < reqQty) {
        const suitableBin = Object.keys(bins).find(b => {
          const item = bins[b];
          return (item.maxCapacity - item.count) >= reqQty;
        });
        if (suitableBin) {
          setSelectedBin(suitableBin);
        }
      }
    }
  }, [selectedLrNo, receivedQty, bins, selectedBin, isSplitMode]);

  // Manual Add Bin Handler
  const handleAddBin = (e) => {
    e.preventDefault();
    const cleanId = newBinId.trim().toUpperCase();
    if (!cleanId) {
      alert('Please enter a Bin Identifier (e.g. D-01).');
      return;
    }
    if (storedBins[cleanId]) {
      alert(`Bin "${cleanId}" already exists! Please enter a unique Bin ID.`);
      return;
    }
    const cap = Number(newBinCapacity);
    if (isNaN(cap) || cap <= 0) {
      alert('Please enter a valid max package capacity greater than 0.');
      return;
    }

    const payload = {
      id: cleanId,
      description: newBinDesc.trim() || 'Custom Storage Rack',
      max_capacity: cap
    };

    api.createWarehouseBin(payload)
      .then(() => {
        setStoredBins(prev => {
          const updated = {
            ...prev,
            [cleanId]: {
              occupied: false,
              lr: '',
              count: 0,
              maxCapacity: cap,
              description: payload.description,
              weight: 0
            }
          };
          localStorage.setItem('temp_warehouse_bins', JSON.stringify(updated));
          return updated;
        });
        setSelectedBin(cleanId);
        setSuccessMsg(`✓ New Warehouse Bin "${cleanId}" created and persisted to database!`);
        setShowAddBinModal(false);
        setNewBinId('');
        setNewBinDesc('');
        setNewBinCapacity(150);
        setTimeout(() => setSuccessMsg(''), 5000);
      })
      .catch(err => alert(`Failed to create warehouse bin: ${err.message}`));
  };

  // --- Settle Inbound (GRN) ---
  const handleInbound = (e) => {
    e.preventDefault();
    if (!selectedLrNo) {
      alert('Please select a consignment from the dropdown.');
      return;
    }
    if (!activeLrObj) {
      alert('Selected consignment details could not be found.');
      return;
    }

    const reqQty = Number(receivedQty);
    if (isNaN(reqQty) || reqQty <= 0) {
      alert('Please enter a valid received quantity greater than 0.');
      return;
    }

    // --- MULTI-BIN SPLIT ALLOCATION MODE ---
    if (isSplitMode) {
      const validAllocations = splitAllocations.filter(a => a.bin && Number(a.count) > 0);
      const totalAllocated = validAllocations.reduce((s, a) => s + Number(a.count), 0);

      if (totalAllocated !== reqQty) {
        alert(`❌ Split Allocation Error: Total allocated packages (${totalAllocated} pkgs) does not match total received articles (${reqQty} pkgs).\n\nPlease adjust package counts across your selected bins so they total ${reqQty} pkgs, or click "Auto-Split Load".`);
        return;
      }

      // Check capacity for each bin row
      for (const item of validAllocations) {
        const bObj = bins[item.bin];
        if (!bObj) {
          alert(`Bin "${item.bin}" does not exist.`);
          return;
        }
        const avail = bObj.maxCapacity - bObj.count;
        if (Number(item.count) > avail) {
          alert(`❌ Capacity Error: Bin ${item.bin} only has ${avail} available space, but you assigned ${item.count} pkgs to it.`);
          return;
        }
      }

      const binAllocJson = JSON.stringify(validAllocations);
      const binSummaryStr = validAllocations.map(a => `${a.bin} (${a.count} pkgs)`).join(', ');

      // Barcode tags per bin allocation
      const tags = [];
      let tagIdx = 1;
      validAllocations.forEach(alloc => {
        for (let i = 0; i < Number(alloc.count); i++) {
          tags.push({
            id: `TAG-${selectedLrNo}-${tagIdx}`,
            lrNo: selectedLrNo,
            articleNo: tagIdx,
            privateMark: activeLrObj?.privateMark || activeLrObj?.private_mark || 'N/A',
            bin: alloc.bin,
          });
          tagIdx++;
        }
      });
      setGeneratedTags(tags);

      // Record discrepancy if received quantity is short or damaged
      const bookedArticles = activeLrObj.articles || 0;
      const shortage = bookedArticles - reqQty;
      if (shortage > 0 || Number(damageQty) > 0) {
        const newDisc = {
          id: `DISC-2026-0${discrepancies.length + 1}`,
          lrNo: selectedLrNo,
          reportedAt: activeLrObj.bookingBranch || activeLrObj.booking_branch || 'DEL',
          bookedQty: bookedArticles,
          receivedQty: reqQty,
          damageQty: Number(damageQty),
          status: 'Logged',
          remarks: `Shortage: ${shortage > 0 ? shortage : 0} pkgs. Damaged: ${damageQty} pkgs. Multi-bin putaway allocated: ${binSummaryStr}.`
        };
        api.createDiscrepancy(newDisc).then(saved => {
          setDiscrepancies(prev => [saved || newDisc, ...prev]);
        }).catch(() => {});
      }

      api.updateLR(selectedLrNo, { status: 'AtHub', warehouse_bin: binAllocJson })
        .then(() => {
          setLrs(prevLrs => prevLrs.map(l => (l.lrNo || l.lr_no) === selectedLrNo ? { ...l, status: 'AtHub', warehouseBin: binAllocJson } : l));
          setSuccessMsg(`✓ Multi-Bin GRN Settle Complete! ${reqQty} pkgs split across ${binSummaryStr} for ${selectedLrNo}.`);

          const remainingPending = pendingLrs.filter(l => (l.lrNo || l.lr_no) !== selectedLrNo);
          if (remainingPending.length > 0) {
            const nextLr = remainingPending[0];
            const nextNo = nextLr.lrNo || nextLr.lr_no;
            setSelectedLrNo(nextNo);
            setReceivedQty(nextLr.articles || 0);
          } else {
            setSelectedLrNo('');
            setReceivedQty(0);
          }
          setDamageQty(0);
          setIsSplitMode(false);
          setSplitAllocations([]);
          setTimeout(() => setSuccessMsg(''), 6000);
        })
        .catch(err => alert(`Failed to update consignment status: ${err.message}`));
      return;
    }

    // --- SINGLE BIN MODE ---
    const binObj = bins[selectedBin];
    if (!binObj) {
      alert('Selected putaway bin does not exist.');
      return;
    }

    const remainingCapacity = binObj.maxCapacity - binObj.count;

    // Capacity Rules Check (FR-5.1)
    if (reqQty > remainingCapacity) {
      const recommendedBin = Object.keys(bins).find(b => {
        const item = bins[b];
        return (item.maxCapacity - item.count) >= reqQty;
      });

      if (recommendedBin) {
        setSelectedBin(recommendedBin);
        alert(`⚠ Putaway Bin ${selectedBin} only has space for ${remainingCapacity} pkgs.\n\nAutomated System has switched your putaway location to Bin ${recommendedBin} (Space available: ${bins[recommendedBin].maxCapacity - bins[recommendedBin].count} pkgs).\n\nPlease click "Settle GRN & Allocate Putaway" again to confirm, or click "Auto-Split Load Across Bins".`);
      } else {
        // Offer auto-split when no single bin fits
        const confirmSplit = window.confirm(`❌ Single Bin Space Limit Exceeded!\nNo single warehouse bin has ${reqQty} available pkgs at once (Bin ${selectedBin} space: ${remainingCapacity} pkgs).\n\nWould you like the system to AUTO-SPLIT these ${reqQty} packages across multiple available bins?`);
        if (confirmSplit) {
          handleAutoSplitLoad();
        }
      }
      return;
    }

    // Generate article barcode tags (FR-5.3)
    const tags = Array.from({ length: reqQty }, (_, i) => ({
      id: `TAG-${selectedLrNo}-${i + 1}`,
      lrNo: selectedLrNo,
      articleNo: i + 1,
      privateMark: activeLrObj?.privateMark || activeLrObj?.private_mark || 'N/A',
      bin: selectedBin,
    }));

    setGeneratedTags(tags);

    // Record discrepancy if received quantity is short or damaged (FR-5.5)
    const bookedArticles = activeLrObj.articles || 0;
    const shortage = bookedArticles - reqQty;
    if (shortage > 0 || Number(damageQty) > 0) {
      const newDisc = {
        id: `DISC-2026-0${discrepancies.length + 1}`,
        lrNo: selectedLrNo,
        reportedAt: activeLrObj.bookingBranch || activeLrObj.booking_branch || 'DEL',
        bookedQty: bookedArticles,
        receivedQty: reqQty,
        damageQty: Number(damageQty),
        status: 'Logged',
        remarks: `Shortage: ${shortage > 0 ? shortage : 0} packages. Damaged: ${damageQty} packages. Putaway allocated to Bin ${selectedBin}.`
      };
      api.createDiscrepancy(newDisc)
        .then(saved => {
          setDiscrepancies(prev => {
            const updated = [saved || newDisc, ...prev];
            localStorage.setItem('temp_warehouse_discrepancies', JSON.stringify(updated));
            return updated;
          });
        })
        .catch(() => {
          setDiscrepancies(prev => {
            const updated = [newDisc, ...prev];
            localStorage.setItem('temp_warehouse_discrepancies', JSON.stringify(updated));
            return updated;
          });
        });
    }

    // Update LR Status in API & Global state
    api.updateLR(selectedLrNo, { status: 'AtHub', warehouse_bin: selectedBin })
      .then(() => {
        setLrs(prevLrs => prevLrs.map(l => (l.lrNo || l.lr_no) === selectedLrNo ? { ...l, status: 'AtHub', warehouseBin: selectedBin } : l));
        setSuccessMsg(`GRN Settle Complete! ${reqQty} barcode tags queued for ${selectedLrNo}. Allocated to Bin ${selectedBin}.`);

        // Advance to next pending LR
        const remainingPending = pendingLrs.filter(l => (l.lrNo || l.lr_no) !== selectedLrNo);
        if (remainingPending.length > 0) {
          const nextLr = remainingPending[0];
          const nextNo = nextLr.lrNo || nextLr.lr_no;
          setSelectedLrNo(nextNo);
          setReceivedQty(nextLr.articles || 0);
        } else {
          setSelectedLrNo('');
          setReceivedQty(0);
        }
        setDamageQty(0);

        setTimeout(() => setSuccessMsg(''), 6000);
      })
      .catch(err => alert(`Failed to update consignment status: ${err.message}`));
  };

  // --- Bin Transfer Settle ---
  const handleBinTransfer = (e) => {
    e.preventDefault();
    if (!inspectedBinId || !transferTargetBin) return;

    const sourceBinObj = bins[inspectedBinId];
    const targetBinObj = bins[transferTargetBin];
    const transferQty = sourceBinObj.count;

    const targetRemaining = targetBinObj.maxCapacity - targetBinObj.count;
    if (transferQty > targetRemaining) {
      alert(`❌ Transfer Error: Target Bin ${transferTargetBin} only has space for ${targetRemaining} packages.`);
      return;
    }

    // Update LR reference
    const associatedLr = sourceBinObj.lr;
    api.updateLR(associatedLr, { warehouse_bin: transferTargetBin })
      .then(() => {
        setLrs(prevLrs => prevLrs.map(l => (l.lrNo || l.lr_no) === associatedLr ? { ...l, warehouseBin: transferTargetBin } : l));
        setSuccessMsg(`Bin transfer complete! Moved cargo from ${inspectedBinId} to ${transferTargetBin}.`);
        setInspectedBinId(null);
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch(err => alert(`Failed to register bin transfer: ${err.message}`));
  };

  // --- Drag & Drop Bin Transfer ---
  const handleDragTransfer = (sourceId, targetId) => {
    const sourceBinObj = bins[sourceId];
    const targetBinObj = bins[targetId];
    if (!sourceBinObj || !targetBinObj) return;

    const transferQty = sourceBinObj.count;
    const targetRemaining = targetBinObj.maxCapacity - targetBinObj.count;

    if (transferQty > targetRemaining) {
      alert(`❌ Transfer Error: Target Bin ${targetId} only has space for ${targetRemaining} packages.`);
      return;
    }

    const associatedLr = sourceBinObj.lr;
    api.updateLR(associatedLr, { warehouse_bin: targetId })
      .then(() => {
        setLrs(prevLrs => prevLrs.map(l => (l.lrNo || l.lr_no) === associatedLr ? { ...l, warehouseBin: targetId } : l));
        setSuccessMsg(`Drag-and-drop transfer complete! Moved cargo from ${sourceId} to ${targetId}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch(err => alert(`Failed to register bin transfer: ${err.message}`));
  };

  // --- Barcode Scanner lookup simulator (FR-5.3) ---
  const handleScanLookup = (e) => {
    e.preventDefault();
    if (!scannedTagInput) return;

    // Format expected: TAG-LR-2026-002-1 or LR-2026-002
    const cleanInput = scannedTagInput.trim().toUpperCase();
    let targetLr = '';
    let articleNo = 'ALL';

    if (cleanInput.startsWith('TAG-')) {
      const lastHyphenIndex = cleanInput.lastIndexOf('-');
      if (lastHyphenIndex > 4) {
        targetLr = cleanInput.substring(4, lastHyphenIndex);
        articleNo = cleanInput.substring(lastHyphenIndex + 1);
      } else {
        targetLr = cleanInput;
      }
    } else {
      targetLr = cleanInput;
    }

    const matchedLr = lrs.find(l => (l.lrNo || l.lr_no || '').toUpperCase() === targetLr);
    if (matchedLr) {
      // Find current bin of this LR
      const matchedBin = Object.keys(bins).find(k => bins[k].lr === (matchedLr.lrNo || matchedLr.lr_no));
      setScannedTagResult({
        tag: cleanInput,
        lr: matchedLr,
        bin: matchedBin || matchedLr.warehouseBin || matchedLr.warehouse_bin || 'Not Putaway Yet (Pending)',
        articleNo: articleNo
      });
      setShowScannerError(false);
    } else {
      setScannedTagResult(null);
      setShowScannerError(true);
    }
  };

  const totalOccupied = Object.values(bins).filter(b => b.occupied).length;
  const totalBins     = Object.keys(bins).length;
  const occupancyPct  = Math.round((totalOccupied / totalBins) * 100);

  return (
    <div className="animate-fade-in" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Warehouse & Material Tagging</h2>
          <p className="page-subtitle">Record GRN inbounds · Allocate bin-rack capacities · Manage bin transfers</p>
        </div>
        
        {/* Occupancy circular gauge */}
        <div className="glass-panel" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px', borderLeft: '3px solid var(--brand)' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Rack Occupancy</p>
            <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--brand-light)', fontFamily: 'var(--font-display)', marginTop: '1px' }}>
              {totalOccupied}/{totalBins} bins
            </p>
          </div>
          <div style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0 }}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r="12" fill="none" stroke="var(--border-default)" strokeWidth="3" />
              <circle cx="15" cy="15" r="12" fill="none"
                stroke="var(--brand)"
                strokeWidth="3"
                strokeDasharray={`${occupancyPct} ${100 - occupancyPct}`}
                strokeDashoffset="25"
                strokeLinecap="round"
                transform="rotate(-90 15 15)"
                style={{ transition: 'all 0.5s ease' }}
              />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: '800', color: 'var(--brand-light)' }}>
              {occupancyPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
          {generatedTags.length > 0 && (
            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html>
                    <head><title>Thermal Tags print queue</title></head>
                    <body style="font-family:monospace; margin:20px; text-align:center;">
                      <h2>LogiSync Thermal Tags</h2>
                      ${generatedTags.map(tag => `
                        <div style="border:2px solid #000; width:220px; padding:15px; margin:10px auto; text-align:left;">
                          <h3>LOGISYNC BARCODE</h3>
                          <hr/>
                          <p><b>LR No:</b> ${tag.lrNo}</p>
                          <p><b>Article:</b> ${tag.articleNo}</p>
                          <p><b>Private Mark:</b> ${tag.privateMark}</p>
                          <p><b>Bin Loc:</b> ${tag.bin}</p>
                          <div style="height:30px; background:repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 5px);"></div>
                          <p style="font-size:0.8em; text-align:center; margin-top:5px;">${tag.id}</p>
                        </div>
                      `).join('')}
                      <script>window.print();</script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="badge badge-success" 
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}
            >
              <Printer size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Print All tags
            </button>
          )}
        </div>
      )}

      {/* Sub-Tab Navigation Toggle */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', gap: '20px', paddingBottom: '2px' }}>
        <button 
          onClick={() => setActiveSubTab('inbound')}
          style={{ 
            background: 'none', border: 'none', 
            padding: '8px 16px', fontSize: '0.9rem', fontWeight: '700', 
            color: activeSubTab === 'inbound' ? 'var(--brand)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'inbound' ? '2px solid var(--brand)' : 'none',
            cursor: 'pointer'
          }}
        >
          Inbound GRN & Putaway
        </button>
        <button 
          onClick={() => setActiveSubTab('discrepancy')}
          style={{ 
            background: 'none', border: 'none', 
            padding: '8px 16px', fontSize: '0.9rem', fontWeight: '700', 
            color: activeSubTab === 'discrepancy' ? 'var(--accent-warning)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'discrepancy' ? '2px solid var(--accent-warning)' : 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <AlertTriangle size={14} /> Shortage & Damage Ledger ({discrepancies.length})
        </button>
      </div>

      {activeSubTab === 'inbound' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.7fr', gap: '24px', alignItems: 'start' }}>

          {/* Left Panel: Goods Inbound Form */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <FileText size={17} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Goods Receipt (GRN) Inbound</h3>
            </div>

            <form onSubmit={handleInbound} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label-premium">Select LR for Inbound</label>
                <select className="input-premium" value={selectedLrNo} onChange={e => {
                  setSelectedLrNo(e.target.value);
                  const lr = lrs.find(l => (l.lrNo || l.lr_no) === e.target.value);
                  if (lr) setReceivedQty(lr.articles);
                }}>
                  <option value="">-- Select Consignment --</option>
                  {pendingLrs.map(lr => {
                    const num = lr.lrNo || lr.lr_no;
                    return <option key={num} value={num}>{num} ({lr.consignor} — {lr.articles} pkgs)</option>;
                  })}
                </select>
              </div>

              {activeLrObj && (
                <div style={{ padding: '12px 14px', background: 'var(--brand-glow-lg)', border: '1px solid hsla(35,95%,55%,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem' }}>
                  <p><strong>Private Mark:</strong> {activeLrObj.privateMark || activeLrObj.private_mark || 'N/A'}</p>
                  <p style={{ marginTop: '3px' }}><strong>Commodity:</strong> {activeLrObj.saidToContain || activeLrObj.said_to_contain || 'Electronic Goods'}</p>
                  <p style={{ marginTop: '3px' }}><strong>Booked Qty:</strong> {activeLrObj.articles} Articles ({activeLrObj.chargeWt || activeLrObj.charge_wt} kg)</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="label-premium">Received Articles</label>
                  <input type="number" className="input-premium" value={receivedQty} onChange={e => setReceivedQty(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium">Damaged / Broken Qty</label>
                  <input type="number" className="input-premium" value={damageQty} onChange={e => setDamageQty(e.target.value)} />
                </div>
              </div>

              {/* Putaway Allocation Mode Selection */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '-4px' }}>
                <label className="label-premium" style={{ margin: 0 }}>Putaway Allocation Location</label>
                <button 
                  type="button" 
                  onClick={() => {
                    if (!isSplitMode && splitAllocations.length === 0) {
                      handleAutoSplitLoad();
                    } else {
                      setIsSplitMode(!isSplitMode);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}
                >
                  {isSplitMode ? '← Switch to Single Bin Mode' : '⚡ Split Load Across Bins'}
                </button>
              </div>

              {!isSplitMode ? (
                /* SINGLE BIN SELECTION */
                <div>
                  <select className="input-premium" value={selectedBin} onChange={e => setSelectedBin(e.target.value)}>
                    {Object.entries(bins).map(([binId, bin]) => {
                      const remaining = bin.maxCapacity - bin.count;
                      const reqQty = Number(receivedQty) || 0;
                      const fits = reqQty > 0 ? remaining >= reqQty : remaining > 0;
                      let tag = '';
                      if (remaining <= 0) {
                        tag = ' [FULL]';
                      } else if (reqQty > 0) {
                        tag = fits ? ' ✓ Fits' : ' ⚠ Over-Capacity';
                      }
                      return (
                        <option key={binId} value={binId} disabled={remaining <= 0}>
                          {binId} — {bin.description} ({bin.count}/{bin.maxCapacity} pkgs · {remaining} available){tag}
                        </option>
                      );
                    })}
                  </select>
                  {selectedBin && bins[selectedBin] && (
                    <div style={{ marginTop: '8px', fontSize: '0.78rem' }}>
                      {(() => {
                        const remaining = bins[selectedBin].maxCapacity - bins[selectedBin].count;
                        const reqQty = Number(receivedQty) || 0;
                        if (!selectedLrNo || reqQty <= 0) {
                          return <span style={{ color: 'var(--text-muted)' }}>ℹ Select a consignment to verify putaway bin placement.</span>;
                        }
                        if (remaining >= reqQty) {
                          return (
                            <span style={{ color: 'var(--accent-success)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <CheckCircle size={14} /> Bin {selectedBin} has sufficient space ({remaining} available for {reqQty} pkgs)
                            </span>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <span style={{ color: 'var(--accent-warning)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <AlertTriangle size={14} /> Bin {selectedBin} space ({remaining} available) is less than {reqQty} pkgs!
                            </span>
                            <button 
                              type="button" 
                              onClick={handleAutoSplitLoad} 
                              className="btn-primary" 
                              style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                            >
                              <Layers size={14} /> ⚡ Auto-Split {reqQty} Packages Across Available Bins
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                /* MULTI-BIN SPLIT ALLOCATION MATRIX */
                <div style={{ background: 'hsla(222, 24%, 10%, 0.6)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--brand)' }}>
                      <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Multi-Bin Load Splitter Matrix
                    </span>
                    <button 
                      type="button" 
                      onClick={handleAutoSplitLoad}
                      className="toggle-btn" 
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    >
                      ⚡ Auto-Fill Split
                    </button>
                  </div>

                  {splitAllocations.map((alloc, idx) => {
                    const binObj = bins[alloc.bin];
                    const avail = binObj ? binObj.maxCapacity - binObj.count : 0;
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 30px', gap: '8px', alignItems: 'center' }}>
                        <select 
                          className="input-premium" 
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          value={alloc.bin} 
                          onChange={e => {
                            const updated = [...splitAllocations];
                            updated[idx].bin = e.target.value;
                            setSplitAllocations(updated);
                          }}
                        >
                          {Object.entries(bins).map(([binId, b]) => {
                            const space = b.maxCapacity - b.count;
                            return (
                              <option key={binId} value={binId} disabled={space <= 0 && alloc.bin !== binId}>
                                {binId} ({space} available)
                              </option>
                            );
                          })}
                        </select>

                        <input 
                          type="number" 
                          className="input-premium" 
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          placeholder="Pkgs count" 
                          min="1" 
                          max={avail || 999}
                          value={alloc.count} 
                          onChange={e => {
                            const updated = [...splitAllocations];
                            updated[idx].count = e.target.value;
                            setSplitAllocations(updated);
                          }}
                        />

                        <button 
                          type="button" 
                          onClick={() => {
                            setSplitAllocations(splitAllocations.filter((_, i) => i !== idx));
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        const unusedBin = Object.keys(bins).find(b => !splitAllocations.some(a => a.bin === b) && (bins[b].maxCapacity - bins[b].count) > 0) || 'A-01';
                        setSplitAllocations([...splitAllocations, { bin: unusedBin, count: 0 }]);
                      }}
                      className="toggle-btn"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={13} /> Add Bin Row
                    </button>

                    {(() => {
                      const totalAllocated = splitAllocations.reduce((s, a) => s + Number(a.count || 0), 0);
                      const reqQty = Number(receivedQty) || 0;
                      const isMatched = totalAllocated === reqQty && reqQty > 0;
                      return (
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: isMatched ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                          Allocated: {totalAllocated} / {reqQty} pkgs {isMatched ? '✓' : `(${reqQty - totalAllocated} remaining)`}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '4px' }}>
                <Plus size={17} />
                {isSplitMode ? 'Settle GRN & Allocate Multi-Bin Putaway' : 'Settle GRN & Allocate Putaway'}
              </button>
            </form>
          </div>

          {/* Right Panel: Visual Rack Grid + Barcode Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Handheld Barcode Scanner Simulator */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Barcode size={16} style={{ color: 'var(--brand)' }} />
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>Handheld Barcode Scanner Simulator</h4>
              </div>

              <form onSubmit={handleScanLookup} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="input-premium" 
                  placeholder="Enter Tag ID e.g. TAG-LR-2026-002-1 or LR No..." 
                  value={scannedTagInput} 
                  onChange={e => setScannedTagInput(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>Scan</button>
              </form>

              {showScannerError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent-danger)', marginTop: '8px' }}>
                  <ShieldAlert size={14} />
                  <span>Barcode tag does not match any registered active cargo.</span>
                </div>
              )}

              {scannedTagResult && (
                <div className="alert alert-info" style={{ marginTop: '12px', background: 'hsla(200, 95%, 45%, 0.1)', border: '1px solid hsla(200,95%,45%,0.2)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                    <strong>Scanned: {scannedTagResult.tag}</strong>
                    <span className="badge badge-brand">{scannedTagResult.lr.status}</span>
                  </div>
                  <div>
                    <p><strong>Cargo Ref:</strong> {scannedTagResult.lr.lrNo || scannedTagResult.lr.lr_no}</p>
                    <p style={{ marginTop: '2px' }}><strong>Commodity:</strong> {scannedTagResult.lr.saidToContain || scannedTagResult.lr.said_to_contain || 'Electronic Goods'}</p>
                    <p style={{ marginTop: '2px' }}><strong>Assigned Rack Bin:</strong> <span style={{ color: 'var(--brand-light)', fontWeight: '700' }}>{scannedTagResult.bin}</span></p>
                  </div>
                  <button 
                    onClick={() => {
                      setInspectedBinId(scannedTagResult.bin);
                      setScannedTagResult(null);
                      setScannedTagInput('');
                    }}
                    className="badge badge-brand" 
                    style={{ alignSelf: 'flex-start', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Eye size={12} /> Inspect Bin Location
                  </button>
                </div>
              )}
            </div>

            {/* Visual Grid */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <Grid size={17} style={{ color: 'var(--brand)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Visual Warehouse Rack Grid</h3>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-muted">{totalOccupied} / {totalBins} occupied</span>
                  <button 
                    type="button"
                    onClick={() => setShowAddBinModal(true)}
                    className="btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={13} /> Add Custom Bin
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {Object.entries(bins).map(([binId, bin]) => {
                  const utilPct = Math.round((bin.count / bin.maxCapacity) * 100);
                  
                  return (
                    <div 
                      key={binId} 
                      onClick={() => setInspectedBinId(binId)}
                      draggable={bin.occupied}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", binId);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const sourceId = e.dataTransfer.getData("text/plain");
                        if (sourceId && sourceId !== binId) {
                          handleDragTransfer(sourceId, binId);
                        }
                      }}
                      style={{
                        height: '120px',
                        border: bin.occupied ? '1px solid hsla(35, 95%, 55%, 0.35)' : '1.5px dashed var(--border-subtle)',
                        background: bin.occupied ? 'hsla(35, 95%, 55%, 0.05)' : 'hsla(222, 22%, 12%, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        gap: '6px', cursor: bin.occupied ? 'grab' : 'pointer',
                        transition: 'var(--t-base)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      className="hover-card"
                    >
                      {bin.occupied && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: utilPct > 80 ? 'var(--accent-danger)' : 'var(--brand-light)' }} />
                      )}
                      <span style={{ fontSize: '1.2rem', fontWeight: '800', color: bin.occupied ? 'var(--brand-light)' : 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{binId}</span>
                      
                      {bin.occupied ? (
                        <div style={{ textAlign: 'center' }}>
                          <span className="badge badge-brand" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>{bin.lr}</span>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{bin.count}/{bin.maxCapacity} Pkgs</p>
                          <div style={{ width: '60px', height: '3px', background: 'var(--bg-void)', borderRadius: '2px', margin: '4px auto 0', overflow: 'hidden' }}>
                            <div style={{ width: `${utilPct}%`, height: '100%', background: 'var(--accent-success)' }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Empty (0/{bin.maxCapacity})</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generated Barcode Tags queue visualizer */}
            {generatedTags.length > 0 && (
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Barcode size={17} style={{ color: 'var(--brand)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Barcode Print Queue (Thermal Tags)</h3>
                  <span className="badge badge-success" style={{ marginLeft: 'auto' }}>{generatedTags.length} Tags Ready</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {generatedTags.slice(0, 4).map(tag => (
                    <div key={tag.id} style={{
                      minWidth: '145px', background: '#fff', color: '#111',
                      padding: '12px', borderRadius: '6px',
                      display: 'flex', flexDirection: 'column', gap: '5px',
                      fontFamily: 'monospace', fontSize: '0.68rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    }}>
                      <div style={{ borderBottom: '2px solid #111', paddingBottom: '4px', fontWeight: '800', textAlign: 'center', fontSize: '0.75rem', letterSpacing: '0.05em' }}>LOGISYNC</div>
                      <p><strong>LR No:</strong> {tag.lrNo}</p>
                      <p><strong>Article:</strong> {tag.articleNo}/{generatedTags.length}</p>
                      <p><strong>Mark:</strong> {tag.privateMark}</p>
                      <p><strong>Bin Loc:</strong> {tag.bin}</p>
                      <div style={{ height: '22px', background: 'repeating-linear-gradient(90deg, #111, #111 2px, #fff 2px, #fff 5px)', marginTop: '4px', borderRadius: '1px' }} />
                      <div style={{ textAlign: 'center', fontSize: '0.58rem', marginTop: '1px', color: '#555' }}>{tag.id}</div>
                    </div>
                  ))}
                  {generatedTags.length > 4 && (
                    <div style={{ minWidth: '95px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', background: 'hsla(222, 22%, 12%, 0.4)', borderRadius: '6px', border: '1px dashed var(--border-subtle)' }}>
                      +{generatedTags.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Discrepancy, Shortage, & Damage Ledger Panel */
        <div className="glass-panel animate-fade-in" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <ShieldAlert size={18} style={{ color: 'var(--accent-warning)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Inbound Shortages & Damage Registry</h3>
            <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>{discrepancies.length} Issues Logged</span>
          </div>

          <table className="table-premium">
            <thead>
              <tr>
                <th>Discrepancy Ref</th>
                <th>LR Ref</th>
                <th>Reporting Branch</th>
                <th>Booked Qty</th>
                <th>Received Qty</th>
                <th>Shortage</th>
                <th>Damage Count</th>
                <th>Status</th>
                <th>Inbound Remarks</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.map(d => {
                const shortage = d.bookedQty - d.receivedQty;
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: '700', color: 'var(--brand-light)' }}>{d.id}</td>
                    <td style={{ fontWeight: '600' }}>{d.lrNo}</td>
                    <td>{d.reportedAt}</td>
                    <td>{d.bookedQty} pkgs</td>
                    <td>{d.receivedQty} pkgs</td>
                    <td style={{ color: shortage > 0 ? 'var(--accent-warning)' : 'inherit', fontWeight: shortage > 0 ? '700' : 'normal' }}>
                      {shortage > 0 ? `− ${shortage} pkgs` : '0'}
                    </td>
                    <td style={{ color: d.damageQty > 0 ? 'var(--accent-danger)' : 'inherit', fontWeight: d.damageQty > 0 ? '700' : 'normal' }}>
                      {d.damageQty > 0 ? `⚠ ${d.damageQty} pkgs` : '0'}
                    </td>
                    <td>
                      <span className={`badge ${d.status === 'Logged' ? 'badge-brand' : 'badge-warning'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.remarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- BIN INSPECTOR & CARGO TRANSFER DIALOG --- */}
      {inspectedBinId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <div className="glass-panel animate-scale-up" style={{
            width: '100%', maxWidth: '480px',
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            padding: '24px', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', gap: '18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={18} style={{ color: 'var(--brand)' }} /> Inspect Bin: {inspectedBinId}
              </h3>
              <button 
                onClick={() => setInspectedBinId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Bin info */}
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Bin Classification:</strong> {bins[inspectedBinId].description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'hsla(222, 22%, 12%, 0.4)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Occupied Capacity</span>
                  <p style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{bins[inspectedBinId].count} / {bins[inspectedBinId].maxCapacity} pkgs</p>
                </div>
                <div style={{ background: 'hsla(222, 22%, 12%, 0.4)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Estimated Weight</span>
                  <p style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{bins[inspectedBinId].weight} kg</p>
                </div>
              </div>
            </div>

            {/* Cargo specifics */}
            {bins[inspectedBinId].occupied ? (
              <div style={{ background: 'var(--brand-glow-lg)', border: '1px solid hsla(35,95%,55%,0.15)', padding: '14px', borderRadius: '8px', fontSize: '0.82rem' }}>
                <h4 style={{ fontWeight: '700', borderBottom: '1px dashed rgba(255,255,255,0.15)', paddingBottom: '4px', marginBottom: '8px' }}>Active Cargo Details</h4>
                <p><strong>LR Number:</strong> {bins[inspectedBinId].lr}</p>
                {(() => {
                  const cellLr = lrs.find(l => (l.lrNo || l.lr_no) === bins[inspectedBinId].lr);
                  return cellLr ? (
                    <>
                      <p style={{ marginTop: '4px' }}><strong>Shipper:</strong> {cellLr.consignor}</p>
                      <p style={{ marginTop: '4px' }}><strong>Consignee:</strong> {cellLr.consignee}</p>
                      <p style={{ marginTop: '4px' }}><strong>Destination:</strong> {cellLr.destination}</p>
                      <p style={{ marginTop: '4px' }}><strong>Goods Mark:</strong> {cellLr.privateMark || cellLr.private_mark || 'N/A'}</p>
                    </>
                  ) : null;
                })()}

                {/* Bin transfer action form (FR-5.2) */}
                <form onSubmit={handleBinTransfer} style={{ marginTop: '16px', borderTop: '1px solid hsla(35,95%,55%,0.2)', paddingTop: '14px' }}>
                  <label className="label-premium" style={{ fontSize: '0.76rem', color: 'var(--brand-light)' }}>
                    <ArrowRightLeft size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Transfer Cargo to Empty Bin
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <select 
                      className="input-premium" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={transferTargetBin} 
                      onChange={e => setTransferTargetBin(e.target.value)}
                    >
                      <option value="">-- Choose Target Bin --</option>
                      {Object.keys(bins).filter(b => b !== inspectedBinId && !bins[b].occupied).map(b => (
                        <option key={b} value={b}>{b} — {bins[b].description} ({bins[b].maxCapacity} max)</option>
                      ))}
                    </select>
                    <button 
                      type="submit" 
                      disabled={!transferTargetBin}
                      className="btn-primary" 
                      style={{ padding: '0 14px', fontSize: '0.8rem' }}
                    >
                      Move
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>This bin location has no stored cargo. Space is available for putaway.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setInspectedBinId(null)}
                className="toggle-btn" 
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MANUAL ADD WAREHOUSE BIN MODAL --- */}
      {showAddBinModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <div className="glass-panel animate-scale-up" style={{
            width: '100%', maxWidth: '440px',
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            padding: '24px', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', gap: '18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={18} style={{ color: 'var(--brand)' }} /> Create Custom Warehouse Bin
              </h3>
              <button 
                onClick={() => setShowAddBinModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label-premium">Bin Identifier / Code</label>
                <input 
                  type="text" 
                  required 
                  className="input-premium" 
                  placeholder="e.g. D-01, RACK-05, SHELF-12" 
                  value={newBinId} 
                  onChange={e => setNewBinId(e.target.value)} 
                />
              </div>

              <div>
                <label className="label-premium">Bin Category / Location Description</label>
                <input 
                  type="text" 
                  className="input-premium" 
                  placeholder="e.g. Heavy Metal Row, Cold Storage Bay" 
                  value={newBinDesc} 
                  onChange={e => setNewBinDesc(e.target.value)} 
                />
              </div>

              <div>
                <label className="label-premium">Max Package Capacity</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  className="input-premium" 
                  placeholder="150" 
                  value={newBinCapacity} 
                  onChange={e => setNewBinCapacity(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddBinModal(false)} 
                  className="toggle-btn" 
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                  <Plus size={15} /> Save Bin Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
