import React, { useState } from 'react';
import { 
  X, DollarSign, CheckCircle, AlertTriangle, ShieldCheck, FileText, 
  Truck, User, Calendar, MapPin, Receipt, Percent, ArrowRight, 
  Printer, Check, AlertCircle, Eye, ChevronRight
} from 'lucide-react';

export default function TripSettlementModal({ trip, onClose, onConfirmSettlement }) {
  if (!trip) return null;

  // Mock initial trip advances & expenses if not explicitly set
  const initialAdvance = trip.advanceAmt || 20000;
  const initialFuelCard = trip.fuelCardAmt || 5000;
  const totalAdvanceGiven = initialAdvance + initialFuelCard;

  // OCR Claim Line items with AI analysis
  const [expenseClaims, setExpenseClaims] = useState(trip.expenses || [
    {
      id: 'EXP-101',
      category: 'fuel',
      title: 'Fuel - IOCL Highway Plaza',
      merchant: 'Indian Oil Corporation',
      claimedAmount: 18500,
      approvedAmount: 18500,
      approved: true,
      hasReceipt: true,
      receiptUrl: '/bill_ocr.jpg',
      aiFlag: null
    },
    {
      id: 'EXP-102',
      category: 'toll',
      title: 'FASTag & State Border Entry Toll',
      merchant: 'NHAI Highway Toll',
      claimedAmount: 2400,
      approvedAmount: 2400,
      approved: true,
      hasReceipt: true,
      receiptUrl: '/bill_ocr.jpg',
      aiFlag: null
    },
    {
      id: 'EXP-103',
      category: 'batta',
      title: 'Driver Food & Night Batta (3 Days)',
      merchant: 'Driver Allowance',
      claimedAmount: 1800,
      approvedAmount: 1800,
      approved: true,
      hasReceipt: false,
      receiptUrl: null,
      aiFlag: null
    },
    {
      id: 'EXP-104',
      category: 'misc',
      title: 'En-route Tyre Puncture Repair',
      merchant: 'Kisan Tyre Works',
      claimedAmount: 850,
      approvedAmount: 850,
      approved: true,
      hasReceipt: true,
      receiptUrl: '/bill_ocr.jpg',
      aiFlag: 'No GSTIN on invoice (Approved as verified breakdown)'
    }
  ]);

  // Shortage, Damage & Late Deductions
  const [shortageDeduction, setShortageDeduction] = useState(0);
  const [lateDeduction, setLateDeduction] = useState(0);
  const [otherPenalty, setOtherPenalty] = useState(0);
  const [deductionNotes, setDeductionNotes] = useState('');

  // Statutory TDS Sec 194C
  const [applyTds, setApplyTds] = useState(trip.vehicleType === 'Market' || trip.vehicleType === 'Hired');
  const [tdsRate, setTdsRate] = useState(1); // 1% Individual / 2% Company

  // Receipt Preview Lightbox
  const [previewImage, setPreviewImage] = useState(null);

  // Settlement Mode / Tab
  const [activeStep, setActiveStep] = useState(1); // 1: Audit Expenses, 2: Deductions & TDS, 3: Final Voucher & Post
  const [settledSuccess, setSettledSuccess] = useState(false);

  // Toggle claim approval
  const toggleApproval = (id) => {
    setExpenseClaims(prev => prev.map(c => {
      if (c.id === id) {
        const nextState = !c.approved;
        return { ...c, approved: nextState, approvedAmount: nextState ? c.claimedAmount : 0 };
      }
      return c;
    }));
  };

  const updateApprovedAmount = (id, val) => {
    const num = parseFloat(val) || 0;
    setExpenseClaims(prev => prev.map(c => c.id === id ? { ...c, approvedAmount: num } : c));
  };

  // Calculations
  const totalApprovedExpenses = expenseClaims.reduce((sum, c) => sum + (c.approved ? c.approvedAmount : 0), 0);
  const totalDeductions = (parseFloat(shortageDeduction) || 0) + (parseFloat(lateDeduction) || 0) + (parseFloat(otherPenalty) || 0);
  
  const tripFreight = trip.totalFreight || 65000;
  const tdsAmount = applyTds ? Math.round((tripFreight * tdsRate) / 100) : 0;

  // Final Net Calculation:
  // For Driver: Advance Given - Approved Expenses - Deductions
  // If positive -> Driver must return money to company
  // If negative -> Company must pay reimbursement to driver
  const netBalance = totalAdvanceGiven - totalApprovedExpenses - totalDeductions;

  const handleConfirm = () => {
    const settlementData = {
      tripId: trip.id,
      truckNo: trip.truckNo,
      driverName: trip.driverName,
      totalAdvanceGiven,
      totalApprovedExpenses,
      totalDeductions,
      tdsAmount,
      netBalance,
      settlementDate: new Date().toISOString().split('T')[0],
      status: 'Settled'
    };

    onConfirmSettlement?.(settlementData);
    setSettledSuccess(true);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9990,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '860px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', color: 'var(--accent-success)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Trip Advance & Expense Settlement</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Trip: <strong style={{ color: 'var(--text-main)' }}>{trip.id}</strong> • Truck: <strong style={{ color: 'var(--text-main)' }}>{trip.truckNo}</strong> • Driver: <strong style={{ color: 'var(--text-main)' }}>{trip.driverName}</strong>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Wizard Step Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          {[
            { step: 1, title: '1. OCR Expense Audit' },
            { step: 2, title: '2. Deductions & TDS' },
            { step: 3, title: '3. Final Statement & Posting' }
          ].map(s => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`btn btn-sm ${activeStep === s.step ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.82rem', fontWeight: 700 }}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* STEP 1: OCR Expense Audit */}
          {activeStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Advance Summary Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CASH ADVANCE ISSUED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>₹{initialAdvance.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>FUEL CARD / FASTAG LOAD</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>₹{initialFuelCard.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL TRIP ADVANCE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{totalAdvanceGiven.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Expense Claim Table */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Driver Expense Claims & OCR Bills</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expenseClaims.length} Claims submitted via Driver App</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {expenseClaims.map(claim => (
                    <div
                      key={claim.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        background: claim.approved ? 'var(--bg-surface, rgba(255,255,255,0.02))' : 'rgba(239, 68, 68, 0.05)',
                        border: claim.approved ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={claim.approved}
                          onChange={() => toggleApproval(claim.id)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent-success)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{claim.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Merchant: {claim.merchant}</div>
                          {claim.aiFlag && (
                            <div style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <AlertTriangle size={12} /> {claim.aiFlag}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {claim.hasReceipt && (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setPreviewImage(claim.receiptUrl)}
                            style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={14} /> Receipt
                          </button>
                        )}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Claimed: ₹{claim.claimedAmount.toLocaleString('en-IN')}</div>
                          <input
                            type="number"
                            className="form-control"
                            disabled={!claim.approved}
                            value={claim.approvedAmount}
                            onChange={(e) => updateApprovedAmount(claim.id, e.target.value)}
                            style={{ width: '100px', fontSize: '0.85rem', padding: '4px 8px', textAlign: 'right', fontWeight: 700 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Approved Banner */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Approved OCR Expenses:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-success)' }}>₹{totalApprovedExpenses.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* STEP 2: Deductions & TDS */}
          {activeStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-surface, rgba(255,255,255,0.02))' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Cargo Shortage & Transit Penalties</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cargo Shortage / Damage (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={shortageDeduction}
                      onChange={(e) => setShortageDeduction(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Late Delivery Penalty (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={lateDeduction}
                      onChange={(e) => setLateDeduction(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Detour / Unapproved Misc (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={otherPenalty}
                      onChange={(e) => setOtherPenalty(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Settlement Remarks / Deduction Justification</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Driver reported 2 cartons punctured in transit; deduction agreed with consignor."
                    value={deductionNotes}
                    onChange={(e) => setDeductionNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Statutory TDS Section */}
              <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-surface, rgba(255,255,255,0.02))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="var(--accent-info)" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Statutory TDS under Section 194C</h4>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={applyTds}
                      onChange={(e) => setApplyTds(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    Apply TDS on Freight
                  </label>
                </div>

                {applyTds && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TDS Rate</label>
                      <select
                        className="form-control"
                        value={tdsRate}
                        onChange={(e) => setTdsRate(parseFloat(e.target.value))}
                      >
                        <option value="1">1% - Individual / HUF Transporter</option>
                        <option value="2">2% - Company / Corporate Fleet Owner</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Calculated TDS Amount</label>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-info)', marginTop: '4px' }}>
                        ₹{tdsAmount.toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>(on ₹{tripFreight.toLocaleString('en-IN')} Freight)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Final Statement & Posting */}
          {activeStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Settlement Summary Slip */}
              <div style={{
                background: 'var(--bg-surface, #0f172a)',
                border: '1.5px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '1px' }}>LOGISYNC TRIP SETTLEMENT VOUCHER</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>VOUCHER NO: VCH-{trip.id}-SETTLE • DATE: {new Date().toLocaleDateString('en-IN')}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TRIP DETAILS</div>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>{trip.id} ({trip.origin} ➔ {trip.destination})</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Truck: {trip.truckNo} • Driver: {trip.driverName}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SETTLEMENT SUMMARY</div>
                    <div style={{ fontSize: '0.85rem' }}>Total Advance Given: <strong>₹{totalAdvanceGiven.toLocaleString('en-IN')}</strong></div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-success)' }}>Approved Expenses: <strong>- ₹{totalApprovedExpenses.toLocaleString('en-IN')}</strong></div>
                    {totalDeductions > 0 && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--accent-danger)' }}>Penalties/Deductions: <strong>- ₹{totalDeductions.toLocaleString('en-IN')}</strong></div>
                    )}
                  </div>
                </div>

                {/* Final Net Outcome Banner */}
                <div style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  background: netBalance >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                  border: netBalance >= 0 ? '1.5px solid #10b981' : '1.5px solid #3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: netBalance >= 0 ? '#10b981' : '#3b82f6', textTransform: 'uppercase' }}>
                      {netBalance >= 0 ? '💰 Driver Advance Return to Company' : '💳 Reimbursement Payable to Driver'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {netBalance >= 0 ? 'Driver spent less than advance given. Refund due into Cash/Bank.' : 'Driver spent excess en-route. Company will disburse via UPI/Bank transfer.'}
                    </div>
                  </div>

                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: netBalance >= 0 ? '#10b981' : '#3b82f6' }}>
                    ₹{Math.abs(netBalance).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {settledSuccess && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#10b981',
                  fontWeight: 700
                }}>
                  <CheckCircle size={20} />
                  <span>Trip {trip.id} has been settled and posted to the Digital Ledger!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Receipt Image Preview Modal */}
        {previewImage && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div style={{ position: 'relative', maxWidth: '500px', width: '100%', background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setPreviewImage(null)}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Scanned Bill Preview</h4>
              <img src={previewImage} alt="Receipt" style={{ width: '100%', borderRadius: '8px', maxHeight: '60vh', objectFit: 'contain' }} />
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
          <div>
            {activeStep > 1 && (
              <button className="btn btn-ghost" onClick={() => setActiveStep(prev => prev - 1)}>
                Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>

            {activeStep < 3 ? (
              <button className="btn btn-primary" onClick={() => setActiveStep(prev => prev + 1)}>
                Proceed <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleConfirm} disabled={settledSuccess} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', borderColor: '#10b981' }}>
                <Check size={16} /> Confirm & Post to Ledger
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
