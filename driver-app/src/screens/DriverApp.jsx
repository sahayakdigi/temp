import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  Smartphone, Wifi, WifiOff, Battery, Camera, Compass, Sparkles, 
  UploadCloud, User, Database, Power, AlertCircle, Bell,
  Home, Truck, PenTool, Package, ShieldAlert, XCircle, ShieldCheck,
  Sun, Moon
} from 'lucide-react';

export default function DriverApp({ trips = [], setTrips, lrs = [], setLrs, drivers = [] }) {
  // ── SYSTEM SIMULATOR STATE ────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(88);
  const [isMoving, setIsMoving] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [sqliteBuffer, setSqliteBuffer] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  const [telemetryOpen, setTelemetryOpen] = useState(true); // Default open for developer visibility
  const [dbOpen, setDbOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  // ── THEME STATE ──
  const [theme, setTheme] = useState(localStorage.getItem('temp-theme') || 'dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('temp-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('temp-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  };

  // ── ACCORDION EXPANSION STATE FOR DEVS ──────────────────────────────────────
  const [expandedLogs, setExpandedLogs] = useState({});
  const [expandedActions, setExpandedActions] = useState({});
  const toggleRawLog = (id) => setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleRawAction = (id) => setExpandedActions(prev => ({ ...prev, [id]: !prev[id] }));
  const [hasSigned, setHasSigned] = useState(false);

  // ── APP SCREEN FLOW STATE ─────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState('login'); // login, tripDetail, odoStart, odoEnd, epod, waybill, cargo, expense
  const [activeTab, setActiveTab] = useState('trip'); // home, trip, notifications, profile
  const [activeDriver, setActiveDriver] = useState(null);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ── WORKFLOW TRANSACTIONS STATE ───────────────────────────────────────────
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [odoValue, setOdoValue] = useState('');
  const [odoPhoto, setOdoPhoto] = useState(null);
  const [epodLr, setEpodLr] = useState(null);
  const [epodSignerName, setEpodSignerName] = useState('');
  const [epodPhoto, setEpodPhoto] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [cargoVerified, setCargoVerified] = useState(false);

  // ── EXPENSE OCR STATE ─────────────────────────────────────────────────────
  const [expenseType, setExpenseType] = useState('fuel');
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrFileName, setOcrFileName] = useState('');
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = useRef(null);

  // Canvas ref for ePOD signature drawing
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // ── OWNER APPROVAL STATES ─────────────────────────────────────────────────
  const [approvals, setApprovals] = useState(() => {
    const saved = localStorage.getItem('temp_approvals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return [
      {
        id: 'APP-101',
        type: 'expense',
        title: 'Fuel Receipt - IOCL Highway Oasis',
        driverName: 'Rajesh Kumar',
        tripId: 'TRP-2026-001',
        amount: 22000,
        merchant: 'Indian Oil Corporation Ltd',
        photoUrl: '/bill_ocr.jpg',
        status: 'approved',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'APP-102',
        type: 'odoStart',
        title: 'Odometer Start Reading',
        driverName: 'Rajesh Kumar',
        tripId: 'TRP-2026-001',
        odoValue: 125430,
        photoUrl: '/odo_start_sample.jpg',
        status: 'approved',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
      }
    ];
  });

  const [activePendingApproval, setActivePendingApproval] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  useEffect(() => {
    localStorage.setItem('temp_approvals', JSON.stringify(approvals));
  }, [approvals]);

  useEffect(() => {
    if (activePendingApproval && activePendingApproval.status === 'rejected') {
      setCurrentScreen('rejection');
    }
  }, [activePendingApproval]);

  // ── SIMULATED LIVE GPS TRACKING & BATTERY DEPLETION ──────────────────────
  const [heading, setHeading] = useState(185);
  const [simulatedKmProgress, setSimulatedKmProgress] = useState(1140); // Matches mockup: 1,140 km covered / 1,420 km (80%)

  // Helper to push to buffer
  const queueToSqlite = (type, payload) => {
    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    setSqliteBuffer((prev) => [...prev, newRecord]);
  };

  // Helper to resolve readable buffer action
  const getReadableBufferAction = (action) => {
    const { type, payload } = action;
    if (type === 'START_TRIP') return `Trip journey started (Odo: ${payload.odoStart.toLocaleString()} km)`;
    if (type === 'ADD_EXPENSE') return `Logged ${payload.expense.type} expense of ₹${payload.expense.amount.toLocaleString()}`;
    if (type === 'SUBMIT_EPOD') return `ePOD signature submitted for LR ${payload.lrNo}`;
    if (type === 'END_TRIP') return `Trip journey completed (Odo: ${payload.odoEnd.toLocaleString()} km)`;
    return `Buffered transaction: ${type}`;
  };

  const getHumanReadableLocation = (locationStr, speedVal, stationary) => {
    if (stationary) return "Parked at Bengaluru Warehouse Hub";
    const match = locationStr.match(/POINT\(([\d.]+)\s+([\d.]+)\)/);
    if (match) {
      const lat = parseFloat(match[2]);
      if (lat > 12.975) return "Passing NH-44 Toll Plaza (Northbound)";
      if (lat < 12.968) return "NH-44 Highway (heading towards Hosur)";
      return "Leaving Bengaluru city limits";
    }
    return "On route (NH-44 Highway)";
  };

  // Generate telemetry logs periodically
  useEffect(() => {
    let interval = null;
    if (isOnDuty && selectedTrip && selectedTrip.status === 'InTransit') {
      const pingInterval = isMoving ? 5000 : 15000;
      interval = setInterval(() => {
        let currentSpeed = 0;
        if (isMoving) {
          currentSpeed = Math.floor(55 + Math.random() * 15);
          setHeading((prev) => (prev + (Math.random() > 0.5 ? 2 : -2) + 360) % 360);
          setBatteryLevel((prev) => Math.max(5, prev - 0.5));
          setSimulatedKmProgress(prev => Math.min(prev + 1.2, 1420));
        } else {
          setBatteryLevel((prev) => Math.max(5, prev - 0.05));
        }

        const newLog = {
          id: Date.now(),
          driver_id: activeDriver?.id || 'DRV-01',
          trip_id: selectedTrip?.id,
          location: `POINT(${(77.5946 + (Math.random() - 0.5) * 0.01).toFixed(4)} ${(12.9716 + (Math.random() - 0.5) * 0.01).toFixed(4)})`,
          speed_kmh: currentSpeed,
          heading_degrees: isMoving ? heading : 0,
          battery_level: Math.round(batteryLevel),
          recorded_at: new Date().toISOString(),
          stationary: !isMoving
        };

        setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 19)]);

        if (!isOnline) {
          queueToSqlite('GPS_PING', newLog);
        }
      }, pingInterval);
    }
    return () => clearInterval(interval);
  }, [isOnDuty, selectedTrip, isMoving, isOnline, batteryLevel, activeDriver, heading]);

  // Offline Auto-Sync Worker
  useEffect(() => {
    if (isOnline && sqliteBuffer.length > 0 && !syncing) {
      const startSyncTimer = setTimeout(() => {
        setSyncing(true);
        
        const syncActionTimer = setTimeout(() => {
          const newApprovalsFromSync = sqliteBuffer.map(action => {
            const { type, payload } = action;
            if (type === 'START_TRIP') {
              return {
                id: `APP-START-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: 'odoStart',
                title: 'Odometer Start Photo (Synced)',
                driverName: activeDriver?.name || 'Rajesh Kumar',
                tripId: payload.tripId,
                odoValue: payload.odoStart,
                photoUrl: '/odo_start_sample.jpg',
                status: 'pending',
                timestamp: new Date().toISOString(),
                payload: {
                  odoStart: payload.odoStart,
                  startDate: new Date().toISOString().split('T')[0]
                }
              };
            }
            if (type === 'ADD_EXPENSE') {
              return {
                id: `APP-EXP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: 'expense',
                title: `Expense: ${payload.expense.type.toUpperCase()} - ₹${payload.expense.amount} (Synced)`,
                driverName: activeDriver?.name || 'Rajesh Kumar',
                tripId: payload.tripId,
                expenseType: payload.expense.type,
                amount: payload.expense.amount,
                merchant: payload.expense.merchant,
                photoUrl: '/bill_ocr.jpg',
                status: 'pending',
                timestamp: new Date().toISOString(),
                payload: {
                  expense: payload.expense
                }
              };
            }
            if (type === 'SUBMIT_EPOD') {
              return {
                id: `APP-EPOD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: 'epod',
                title: `ePOD Signature & Photo (Synced)`,
                driverName: activeDriver?.name || 'Rajesh Kumar',
                tripId: selectedTrip?.id || 'TRP-2026-001',
                lrNo: payload.lrNo,
                receiverName: payload.receiverName,
                signatureImg: payload.podUrl,
                photoUrl: '/pod_sample.jpg',
                status: 'pending',
                timestamp: new Date().toISOString(),
                payload: {
                  lrNo: payload.lrNo,
                  podUrl: payload.podUrl,
                  receiverName: payload.receiverName
                }
              };
            }
            if (type === 'UPLOAD_WAYBILL') {
              return {
                id: `APP-WAYBILL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: 'waybill',
                title: 'Waybill Document Upload (Synced)',
                driverName: activeDriver?.name || 'Rajesh Kumar',
                tripId: payload.tripId,
                photoUrl: '/pod_sample.jpg',
                status: 'pending',
                timestamp: new Date().toISOString(),
                payload: {
                  waybillUploaded: true
                }
              };
            }
            if (type === 'END_TRIP') {
              return {
                id: `APP-END-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: 'odoEnd',
                title: 'Odometer End Photo (Synced)',
                driverName: activeDriver?.name || 'Rajesh Kumar',
                tripId: payload.tripId,
                odoValue: payload.odoEnd,
                photoUrl: '/odo_end_sample.jpg',
                status: 'pending',
                timestamp: new Date().toISOString(),
                payload: {
                  odoEnd: payload.odoEnd
                }
              };
            }
            return null;
          }).filter(Boolean);

          setApprovals(prev => [...newApprovalsFromSync, ...prev]);
          setSqliteBuffer([]);
          setSyncing(false);
        }, 2500);
        
        return () => clearTimeout(syncActionTimer);
      }, 0);

      return () => clearTimeout(startSyncTimer);
    }
  }, [isOnline, sqliteBuffer, syncing, activeDriver, selectedTrip]);

  // ── HANDLERS ─────────────────────────────────────────────────────────────
  const handleRequestOtp = (e) => {
    e.preventDefault();
    setAuthError('');
    setOtpLoading(true);

    const foundDriver = drivers.find(
      (d) => d.phone === loginPhone.replace(/\D/g, '')
    ) || drivers[0];

    setTimeout(() => {
      setOtpLoading(false);
      setOtpSent(true);
      setActiveDriver(foundDriver);
      setLoginOtp('123456');
    }, 1200);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setAuthError('');
    if (loginOtp !== '123456') {
      setAuthError('Incorrect OTP. Enter 123456 for demo.');
      return;
    }
    const driverTrip = trips.find(t => t.driverId === activeDriver?.id || t.driverName?.includes(activeDriver?.name)) || trips[0];
    setSelectedTrip(driverTrip);
    setCurrentScreen('tripDetail');
    setActiveTab('trip');
  };

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // dark ink
    ctx.beginPath();
    
    const pos = getCanvasPos(e);
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleStartTripSubmit = (e) => {
    e.preventDefault();
    const odoNum = parseInt(odoValue);
    if (isNaN(odoNum)) {
      alert('Please enter a valid odometer reading.');
      return;
    }

    const payload = {
      tripId: selectedTrip.id,
      odoStart: odoNum,
      photo: odoPhoto
    };

    if (isOnline) {
      const newApproval = {
        id: `APP-START-${Date.now()}`,
        type: 'odoStart',
        title: 'Odometer Start Photo',
        driverName: activeDriver?.name || 'Rajesh Kumar',
        tripId: selectedTrip.id,
        odoValue: odoNum,
        photoUrl: '/odo_start_sample.jpg',
        status: 'pending',
        timestamp: new Date().toISOString(),
        payload: {
          odoStart: odoNum,
          startDate: new Date().toISOString().split('T')[0]
        }
      };
      setApprovals(prev => [newApproval, ...prev]);
      setActivePendingApproval(newApproval);
      setCurrentScreen('waitingApproval');
    } else {
      queueToSqlite('START_TRIP', payload);
      setSelectedTrip({ ...selectedTrip, status: 'InTransit', odoStart: odoNum });
      setCurrentScreen('tripDetail');
    }

    setOdoValue('');
    setOdoPhoto(null);
  };

  const handleEndTripSubmit = (e) => {
    e.preventDefault();
    const odoNum = parseInt(odoValue);
    if (isNaN(odoNum) || odoNum <= (selectedTrip.odoStart || 0)) {
      alert(`Ending odometer must be greater than start odometer (${selectedTrip.odoStart || 0}).`);
      return;
    }

    const payload = {
      tripId: selectedTrip.id,
      odoEnd: odoNum,
      photo: odoPhoto
    };

    if (isOnline) {
      const newApproval = {
        id: `APP-END-${Date.now()}`,
        type: 'odoEnd',
        title: 'Odometer End Photo',
        driverName: activeDriver?.name || 'Rajesh Kumar',
        tripId: selectedTrip.id,
        odoValue: odoNum,
        photoUrl: '/odo_end_sample.jpg',
        status: 'pending',
        timestamp: new Date().toISOString(),
        payload: {
          odoEnd: odoNum
        }
      };
      setApprovals(prev => [newApproval, ...prev]);
      setActivePendingApproval(newApproval);
      setCurrentScreen('waitingApproval');
    } else {
      queueToSqlite('END_TRIP', payload);
      setSelectedTrip({ ...selectedTrip, status: 'Delivered', odoEnd: odoNum });
      setCurrentScreen('tripDetail');
    }

    setOdoValue('');
    setOdoPhoto(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOcrFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOcrFile(reader.result);
        triggerAutoOcr(file.name, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  useEffect(() => {
    if (useWebcam) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'environment' } })
        .then(stream => {
          setWebcamStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
          alert("Could not access camera. Please allow permission or fall back to file upload.");
          setUseWebcam(false);
        });
    } else {
      stopWebcam();
    }
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useWebcam]);

  const runMockOcrFallback = (fileName) => {
    setTimeout(() => {
      let mockAmt = 0;
      let mockMerchant = '';
      let detectedType = expenseType;

      if (fileName) {
        const lowerName = fileName.toLowerCase();
        if (lowerName.includes('fuel') || lowerName.includes('petrol') || lowerName.includes('diesel') || lowerName.includes('iocl') || lowerName.includes('bpcl') || lowerName.includes('hp') || lowerName.includes('shell')) {
          detectedType = 'fuel';
        } else if (lowerName.includes('toll') || lowerName.includes(' plaza') || lowerName.includes('fastag') || lowerName.includes('nh')) {
          detectedType = 'toll';
        } else if (lowerName.includes('food') || lowerName.includes('hotel') || lowerName.includes('dhaba') || lowerName.includes('restaurant') || lowerName.includes('meals') || lowerName.includes('cafe') || lowerName.includes('batta')) {
          detectedType = 'batta';
        } else if (lowerName.includes('repair') || lowerName.includes('spare') || lowerName.includes('tyre') || lowerName.includes('mechanic') || lowerName.includes('misc') || lowerName.includes('elect') || lowerName.includes('bill')) {
          detectedType = 'misc';
        }
      }

      if (detectedType === 'fuel') {
        mockAmt = 18500;
        mockMerchant = 'Indian Oil Corporation Ltd - Highway Oasis NH-44';
      } else if (detectedType === 'toll') {
        mockAmt = 350;
        mockMerchant = 'L&T Tollway Plaza, Karur';
      } else if (detectedType === 'batta') {
        mockAmt = 1200;
        mockMerchant = 'Dhaba Stop & Hotel Highway';
      } else {
        mockAmt = 850;
        mockMerchant = 'State Electricity Utility Board';
      }

      // Try to parse amount from filename if available
      if (fileName) {
        const amtMatch = fileName.match(/(\d+)/);
        if (amtMatch) {
          mockAmt = parseInt(amtMatch[1]);
        }
      }

      setExpenseType(detectedType);
      setOcrResult({
        amount: mockAmt,
        merchant: mockMerchant,
        detectedType: detectedType,
        isFraudRisk: false,
        fraudReason: ''
      });
      setOcrScanning(false);
    }, 2000);
  };

  const parseOcrText = (text, typeCategory) => {
    const lower = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    
    let detectedType = typeCategory || 'misc';
    let merchant = 'Unknown Merchant';
    let amount = 0;

    // 1. Detect Merchant Name
    if (lower.includes('indianoil') || lower.includes('indian oil')) {
      merchant = 'IndianOil (Metro Fuel Point)';
      detectedType = 'fuel';
    } else if (lower.includes('electricity') || lower.includes('bescom') || lower.includes('utility')) {
      merchant = 'State Electricity Board';
      detectedType = 'misc';
    } else if (lower.includes('toll') || lower.includes('plaza')) {
      merchant = 'NHAI Toll Plaza';
      detectedType = 'toll';
    } else if (lower.includes('dhaba') || lower.includes('hotel') || lower.includes('restaurant')) {
      merchant = 'Highway Dhaba';
      detectedType = 'batta';
    } else if (lines.length > 0) {
      merchant = lines[0]; // Fallback to first line
    }

    // 2. Extract Amount (look for Sale or Total or Amount due)
    const amountKeywords = ['sale', 'total', 'amount', 'due', 'net', 'pay'];
    for (const line of lines) {
      const lineLow = line.toLowerCase();
      if (amountKeywords.some(kw => lineLow.includes(kw)) && !lineLow.includes('rate')) {
        // Match numbers like 3000.00, 3633.70, etc.
        const numMatch = lineLow.match(/(?:sale|total|amount|due|rs\.?|₹)?\s*:?\s*(?:rs\.?|₹)?\s*([0-9]{3,6}(?:\.[0-9]{2})?)/i);
        if (numMatch) {
          const val = parseFloat(numMatch[1]);
          if (!isNaN(val) && val >= 50) {
            amount = Math.round(val);
            break;
          }
        }
      }
    }

    // Fallback search: extract all large numbers that look like prices
    if (!amount) {
      const allNumbers = [];
      const numRegex = /\b\d{3,6}(?:\.\d{2})?\b/g;
      let match;
      while ((match = numRegex.exec(text)) !== null) {
        const val = parseFloat(match[0]);
        if (!isNaN(val) && val >= 100 && val <= 100000) {
          allNumbers.push(val);
        }
      }
      if (allNumbers.length > 0) {
        amount = Math.round(Math.max(...allNumbers));
      }
    }

    return { detectedType, merchant, amount };
  };

  const triggerAutoOcr = (fileName, fileData) => {
    setOcrScanning(true);
    setOcrResult(null);

    // Call backend photo analysis API
    api.analyzePhoto(fileData, expenseType)
      .then(result => {
        console.log('Backend Analysis Result:', result);
        
        // If Gemini API key is missing or invalid on the backend, run local browser-side OCR
        if (result.offlineMock && window.Tesseract) {
          console.log('Gemini API is offline or missing key. Running local Tesseract.js browser OCR...');
          window.Tesseract.recognize(fileData, 'eng')
            .then(({ data: { text } }) => {
              console.log('Local Tesseract OCR raw output:', text);
              const parsed = parseOcrText(text, expenseType);
              
              setOcrResult({
                amount: parsed.amount || 850,
                merchant: parsed.merchant || 'Unknown Merchant',
                detectedType: parsed.detectedType,
                ocrText: text,
                legibilityScore: 85,
                confidenceScore: 80,
                warnings: ['Processed locally in browser (Offline OCRFallback)'],
                isFraudRisk: false,
                fraudReason: ''
              });
              setOcrScanning(false);
            })
            .catch(err => {
              console.error('Local Tesseract OCR failed:', err);
              applyOcrResult(result);
            });
          return;
        }

        applyOcrResult(result);
      })
      .catch(err => {
        console.error('API analysis failed, trying browser-side Tesseract.js:', err);
        if (window.Tesseract) {
          window.Tesseract.recognize(fileData, 'eng')
            .then(({ data: { text } }) => {
              const parsed = parseOcrText(text, expenseType);
              setOcrResult({
                amount: parsed.amount || 850,
                merchant: parsed.merchant || 'Unknown Merchant',
                detectedType: parsed.detectedType,
                ocrText: text,
                legibilityScore: 80,
                confidenceScore: 75,
                warnings: ['Processed locally in browser (Offline OCRFallback)'],
                isFraudRisk: false,
                fraudReason: ''
              });
              setOcrScanning(false);
            })
            .catch(() => {
              runMockOcrFallback(fileName);
            });
        } else {
          runMockOcrFallback(fileName);
        }
      });
  };

  const applyOcrResult = (result) => {
    const { ocrText, legibilityScore, confidenceScore, extractedFields, warnings } = result;
    const detectedType = (extractedFields?.expenseType || 'misc').toLowerCase();
    
    setExpenseType(detectedType);
    setOcrResult({
      amount: extractedFields?.amount || 850,
      merchant: extractedFields?.merchant || 'Unknown Merchant',
      detectedType: detectedType,
      ocrText: ocrText || 'No raw text extracted.',
      legibilityScore: legibilityScore || 100,
      confidenceScore: confidenceScore || 100,
      warnings: warnings || [],
      isFraudRisk: (extractedFields?.amount > 50000 || (warnings && warnings.length > 0)),
      fraudReason: extractedFields?.amount > 50000 ? 'Amount exceeds normal limits (>50,000)' : (warnings?.[0] || '')
    });
    setOcrScanning(false);
  };

  const captureWebcam = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setOcrFile(dataUrl);
      const fakeName = 'captured_webcam_bill.jpg';
      setOcrFileName(fakeName);
      setUseWebcam(false);
      triggerAutoOcr(fakeName, dataUrl);
    }
  };

  const handleOcrSnap = () => {
    if (ocrFile) {
      triggerAutoOcr(ocrFileName, ocrFile);
    }
  };

  const handleSaveExpense = () => {
    if (!ocrResult) return;

    const newExpense = {
      id: `EXP-${Date.now()}`,
      type: ocrResult.detectedType,
      amount: ocrResult.amount,
      source: 'ocr',
      verified: false,
      date: new Date().toISOString().split('T')[0],
      merchant: ocrResult.merchant,
      image_url: ocrFile || '/bill_ocr.jpg'
    };

    const payload = {
      tripId: selectedTrip.id,
      expense: newExpense
    };

    if (isOnline) {
      const newApproval = {
        id: `APP-EXP-${Date.now()}`,
        type: 'expense',
        title: `Expense: ${ocrResult.detectedType.toUpperCase()} - ₹${ocrResult.amount}`,
        driverName: activeDriver?.name || 'Rajesh Kumar',
        tripId: selectedTrip.id,
        expenseType: ocrResult.detectedType,
        amount: ocrResult.amount,
        merchant: ocrResult.merchant,
        photoUrl: ocrFile || '/bill_ocr.jpg',
        status: 'pending',
        timestamp: new Date().toISOString(),
        // AI Extracted Details
        ocrText: ocrResult.ocrText,
        legibilityScore: ocrResult.legibilityScore,
        confidenceScore: ocrResult.confidenceScore,
        warnings: ocrResult.warnings,
        isFraudRisk: ocrResult.isFraudRisk,
        fraudReason: ocrResult.fraudReason,
        payload: {
          expense: newExpense
        }
      };
      setApprovals(prev => [newApproval, ...prev]);
      setActivePendingApproval(newApproval);
      setCurrentScreen('waitingApproval');
    } else {
      queueToSqlite('ADD_EXPENSE', payload);
      setSelectedTrip({
        ...selectedTrip,
        expenses: [...(selectedTrip.expenses || []), newExpense]
      });
      setCurrentScreen('tripDetail');
    }

    setOcrResult(null);
    setOcrFile(null);
    setOcrFileName('');
  };

  const handleEpodSubmit = (e) => {
    e.preventDefault();
    if (!epodSignerName.trim()) {
      alert("Please enter the receiver's name.");
      return;
    }
    if (!hasSigned) {
      alert("Please draw signature on the glass.");
      return;
    }

    let signatureImg = '/pod_sample.jpg';
    if (canvasRef.current) {
      try {
        signatureImg = canvasRef.current.toDataURL('image/png');
      } catch (err) {
        console.warn('Canvas toDataURL error:', err);
      }
    }

    const targetLrNo = epodLr?.lrNo || 'LR-2026-014';
    const payload = {
      lrNo: targetLrNo,
      podUrl: signatureImg,
      receiverName: epodSignerName,
      signature: 'SIGNED_GLASS'
    };

    if (isOnline) {
      const newApproval = {
        id: `APP-EPOD-${Date.now()}`,
        type: 'epod',
        title: `ePOD Signature & Photo`,
        driverName: activeDriver?.name || 'Rajesh Kumar',
        tripId: selectedTrip.id,
        lrNo: targetLrNo,
        receiverName: epodSignerName,
        signatureImg: signatureImg,
        photoUrl: '/pod_sample.jpg',
        status: 'pending',
        timestamp: new Date().toISOString(),
        payload: {
          lrNo: targetLrNo,
          podUrl: signatureImg,
          receiverName: epodSignerName
        }
      };
      setApprovals(prev => [newApproval, ...prev]);
      setActivePendingApproval(newApproval);
      setCurrentScreen('waitingApproval');
    } else {
      queueToSqlite('SUBMIT_EPOD', payload);
      setLrs(prev => prev.map(l => l.lrNo === targetLrNo ? {
        ...l,
        status: 'Delivered',
        physicalPodReceived: true,
        podUrl: signatureImg
      } : l));
      setCurrentScreen('tripDetail');
    }

    setEpodLr(null);
    setEpodSignerName('');
  };

  const handleWaybillUpload = (e) => {
    e.preventDefault();
    setIsCompressing(true);

    // Call Gemini photo analysis on the uploaded waybill photo
    api.analyzePhoto('/pod_sample.jpg', 'waybill')
      .then(result => {
        setIsCompressing(false);
        const { ocrText, legibilityScore, confidenceScore, extractedFields, warnings } = result;
        
        // Detect if LR matches the trip (e.g. check if LR is linked to selectedTrip)
        const tripLr = lrs.find(l => l.tripId === selectedTrip.id || l.lrNo === extractedFields?.lrNumber);
        const lrMismatched = !tripLr;
        const finalWarnings = [...(warnings || [])];
        if (lrMismatched) {
          finalWarnings.push(`LR Mismatch: Extracted ${extractedFields?.lrNumber || 'Unknown'} but expected trip LR.`);
        }

        if (isOnline) {
          const newApproval = {
            id: `APP-WAYBILL-${Date.now()}`,
            type: 'waybill',
            title: 'Waybill Document Upload (AI Audited)',
            driverName: activeDriver?.name || 'Rajesh Kumar',
            tripId: selectedTrip.id,
            photoUrl: '/pod_sample.jpg',
            status: 'pending',
            timestamp: new Date().toISOString(),
            // AI Extracted Details
            ocrText,
            legibilityScore,
            confidenceScore,
            extractedFields,
            warnings: finalWarnings,
            isFraudRisk: lrMismatched,
            fraudReason: lrMismatched ? 'Uploaded Waybill LR number does not match current trip!' : '',
            payload: {
              waybillUploaded: true,
              lrNumber: extractedFields?.lrNumber,
              consignor: extractedFields?.consignor,
              consignee: extractedFields?.consignee
            }
          };
          setApprovals(prev => [newApproval, ...prev]);
          setActivePendingApproval(newApproval);
          setCurrentScreen('waitingApproval');
        } else {
          queueToSqlite('UPLOAD_WAYBILL', { 
            tripId: selectedTrip.id,
            aiExtracted: extractedFields
          });
          setEpodPhoto(true);
          setCurrentScreen('tripDetail');
        }
      })
      .catch(err => {
        console.error('Gemini Waybill analysis failed:', err);
        setIsCompressing(false);
        // Fallback standard behavior
        if (isOnline) {
          const newApproval = {
            id: `APP-WAYBILL-${Date.now()}`,
            type: 'waybill',
            title: 'Waybill Document Upload',
            driverName: activeDriver?.name || 'Rajesh Kumar',
            tripId: selectedTrip.id,
            photoUrl: '/pod_sample.jpg',
            status: 'pending',
            timestamp: new Date().toISOString(),
            payload: { waybillUploaded: true }
          };
          setApprovals(prev => [newApproval, ...prev]);
          setActivePendingApproval(newApproval);
          setCurrentScreen('waitingApproval');
        } else {
          queueToSqlite('UPLOAD_WAYBILL', { tripId: selectedTrip.id });
          setEpodPhoto(true);
          setCurrentScreen('tripDetail');
        }
      });
  };

  const handleCargoVerification = () => {
    setCargoVerified(true);
    setCurrentScreen('tripDetail');
  };

  const handleApproveRequest = (request) => {
    // 1. Mark request as approved
    setApprovals(prev => prev.map(a => a.id === request.id ? { ...a, status: 'approved' } : a));
    
    // 2. Apply payload changes to React state & simulated DB
    const { type, payload, tripId } = request;
    if (type === 'odoStart') {
      api.updateTrip(tripId, { status: 'InTransit', odoStart: payload.odoStart, startDate: payload.startDate })
        .then(saved => {
          setTrips(trips => trips.map(t => t.id === tripId ? saved : t));
          if (selectedTrip && selectedTrip.id === tripId) {
            setSelectedTrip(saved);
          }
        })
        .catch(err => console.error("OdoStart save error:", err));
    } else if (type === 'odoEnd') {
      api.updateTrip(tripId, { status: 'Delivered', odoEnd: payload.odoEnd })
        .then(saved => {
          setTrips(trips => trips.map(t => t.id === tripId ? saved : t));
          if (selectedTrip && selectedTrip.id === tripId) {
            setSelectedTrip(saved);
          }
        })
        .catch(err => console.error("OdoEnd save error:", err));
    } else if (type === 'expense') {
      api.createTripExpense(tripId, { ...payload.expense, verified: true })
        .then(savedExp => {
          setTrips(trips => trips.map(t => {
            if (t.id === tripId) {
              return { ...t, expenses: [...(t.expenses || []), savedExp] };
            }
            return t;
          }));
          if (selectedTrip && selectedTrip.id === tripId) {
            setSelectedTrip(prev => ({
              ...prev,
              expenses: [...(prev.expenses || []), savedExp]
            }));
          }
        })
        .catch(err => console.error("Expense save error:", err));
    } else if (type === 'epod') {
      api.updateLR(payload.lrNo, {
        status: 'Delivered',
        physicalPodReceived: true,
        podUrl: payload.podUrl
      }).then(() => {
        setLrs(prev => prev.map(l => l.lrNo === payload.lrNo ? {
          ...l,
          status: 'Delivered',
          physicalPodReceived: true,
          podUrl: payload.podUrl
        } : l));
      }).catch(err => console.error("ePOD save error:", err));
    } else if (type === 'waybill') {
      setEpodPhoto(true);
    }

    // 3. Clear from active blocking request if it matches
    if (activePendingApproval && activePendingApproval.id === request.id) {
      setActivePendingApproval(null);
      setCurrentScreen('tripDetail');
    }
  };

  const handleRejectRequest = (request, reason) => {
    if (!reason || !reason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    // 1. Mark request as rejected
    setApprovals(prev => prev.map(a => a.id === request.id ? { ...a, status: 'rejected', rejectionReason: reason } : a));
    
    // 2. If it's the blocking request, update its status so the phone displays rejection state
    if (activePendingApproval && activePendingApproval.id === request.id) {
      setActivePendingApproval({
        ...activePendingApproval,
        status: 'rejected',
        rejectionReason: reason
      });
    }
  };

  const getLrStatusInApp = (lrNo) => {
    const isQueued = sqliteBuffer.some(
      (a) => a.type === 'SUBMIT_EPOD' && a.payload.lrNo === lrNo
    );
    if (isQueued) return 'Delivered';
    const actualLr = lrs.find((l) => l.lrNo === lrNo);
    return actualLr ? actualLr.status : 'Booked';
  };

  // Interpolated position for truck on SVG route path
  const getTruckPos = (km) => {
    const pct = Math.min(km / 1420, 1);
    if (pct <= 0.25) {
      const t = pct / 0.25;
      // Delhi (170, 30) to Jaipur (120, 70)
      return { x: 170 + t * (120 - 170), y: 30 + t * (70 - 30) };
    } else if (pct <= 0.7) {
      const t = (pct - 0.25) / 0.45;
      // Jaipur (120, 70) to Vadodara (105, 125)
      return { x: 120 + t * (105 - 120), y: 70 + t * (125 - 70) };
    } else {
      const t = (pct - 0.7) / 0.3;
      // Vadodara (105, 125) to Mumbai (100, 175)
      return { x: 105 + t * (100 - 105), y: 125 + t * (175 - 125) };
    }
  };

  // Load active trip details variables
  const isTripDelivered = selectedTrip?.status === 'Delivered';

  // Checklist verification states
  const hasInspectionDone = !!selectedTrip?.odoStart;
  const activeLrObj = selectedTrip ? lrs.find(l => l.lrNo === selectedTrip.lorryReceiptNo || !l.manifestId) : null;
  const isEpodDone = activeLrObj ? getLrStatusInApp(activeLrObj.lrNo) === 'Delivered' : false;
  const hasWaybillUploaded = !!epodPhoto || isEpodDone;
  const hasCargoVerified = cargoVerified || isEpodDone;
  const isChecklistComplete = hasInspectionDone && hasSigned && hasWaybillUploaded && hasCargoVerified;

  return (
    <div className="screen-container">
      {/* ── HEADER TITLE ── */}
      <div className="screen-header">
        <div>
          <h2>Screen 6 — Driver App Simulator</h2>
          <p className="text-secondary" style={{ marginTop: '4px' }}>
            Experience the offline-first field workflow. Toggle connectivity and monitor SQL synchronization in real-time.
          </p>
        </div>

        {/* ── SIMULATED TELEMETRY TOGGLES ── */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light (White) Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Color Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} style={{ color: 'var(--brand-light)' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>Light</span>
              </>
            ) : (
              <>
                <Moon size={14} style={{ color: 'var(--accent-info)' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>Dark</span>
              </>
            )}
          </button>
          <button 
            className={`btn ${telemetryOpen ? 'btn-brand' : 'btn-secondary'}`}
            onClick={() => setTelemetryOpen(!telemetryOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Compass size={16} />
            PostGIS Logs ({telemetryLogs.length})
          </button>
          <button 
            className={`btn ${dbOpen ? 'btn-brand' : 'btn-secondary'}`}
            onClick={() => setDbOpen(!dbOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Database size={16} />
            SQLite Buffer ({sqliteBuffer.length})
          </button>
        </div>
      </div>

      <div className="driver-simulator-layout">
        
        {/* ── LEFT PANEL: OWNER APPROVAL HUB & METRICS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 👑 OWNER APPROVAL HUB */}
          <div className="card" style={{ borderColor: 'var(--brand)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-light)' }}>
                <ShieldCheck size={18} />
                Owner Approval Console
              </h3>
              <span className="badge badge-brand" style={{ background: 'var(--brand-glow)', color: 'var(--brand-light)' }}>
                {approvals.filter(a => a.status === 'pending').length} Pending
              </span>
            </div>

            {/* List of Approvals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {approvals.filter(a => a.status === 'pending').length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--panel-deep)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', fontSize: '0.82rem' }}>
                  ✨ All clear! No pending driver submissions.
                </div>
              ) : (
                approvals.filter(a => a.status === 'pending').map((request) => {
                  return (
                    <div key={request.id} style={{
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'var(--t-base)'
                    }}>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>{request.title}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            Driver: {request.driverName} | Trip: {request.tripId}
                          </span>
                        </div>
                        <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>Pending</span>
                      </div>

                      {/* AI Audit Status Banner */}
                      {(request.confidenceScore || request.isFraudRisk || request.warnings?.length > 0) && (
                        <div style={{
                          background: request.isFraudRisk ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                          border: `1px solid ${request.isFraudRisk ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '0.7rem',
                          color: request.isFraudRisk ? 'var(--accent-danger)' : 'var(--accent-success)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={12} style={{ color: request.isFraudRisk ? '#ef4444' : '#10b981' }} />
                              GEMINI AI AUDIT
                            </span>
                            <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>
                              Confidence: {request.confidenceScore || 90}%
                            </span>
                          </div>
                          {request.isFraudRisk && (
                            <div style={{ fontWeight: '700', color: '#f87171', marginTop: '2px' }}>
                              ⚠️ Alert: {request.fraudReason || 'Discrepancy detected in values!'}
                            </div>
                          )}
                          {request.warnings && request.warnings.map((w, idx) => (
                            <div key={idx} style={{ opacity: 0.9, fontSize: '0.65rem' }}>• {w}</div>
                          ))}
                        </div>
                      )}

                      {/* Dynamic Graphic Preview */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          {request.type === 'odoStart' || request.type === 'odoEnd' ? (
                            <div style={{
                              background: 'var(--bg-void)',
                              borderRadius: '8px',
                              border: '1px solid rgba(0, 240, 255, 0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '8px',
                              height: '90px'
                            }}>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Odometer reading</span>
                              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--brand)', letterSpacing: '1px', fontFamily: 'monospace', margin: '4px 0' }}>
                                {request.odoValue?.toLocaleString()} km
                              </span>
                              <div style={{ width: '60px', height: '2px', background: 'linear-gradient(90deg, transparent, var(--brand), transparent)' }} />
                            </div>
                          ) : request.type === 'expense' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <div style={{
                                background: 'var(--bg-card)',
                                borderRadius: '8px',
                                padding: '10px',
                                color: 'var(--text-primary)',
                                fontFamily: 'monospace',
                                fontSize: '0.68rem',
                                borderLeft: '4px solid #f59e0b',
                                border: '1px solid var(--border-subtle)',
                                boxShadow: 'var(--shadow-sm)'
                              }}>
                                <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '4px', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>RECEIPT DETAILS</strong>
                                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{request.merchant || 'IOCL Service Station'}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                  <span>TYPE:</span>
                                  <strong style={{ color: 'var(--text-primary)' }}>{request.expenseType?.toUpperCase()}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', fontSize: '0.78rem' }}>
                                  <strong>TOTAL:</strong>
                                  <strong style={{ color: '#d97706' }}>₹{request.amount?.toLocaleString()}</strong>
                                </div>
                              </div>
                              
                              {request.photoUrl && (
                                <div 
                                  onClick={() => {
                                    setLightboxImage(request.photoUrl);
                                    setLightboxZoom(1);
                                  }}
                                  style={{
                                    height: '110px',
                                    background: 'var(--bg-void)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'zoom-in'
                                  }}
                                  title="Click to zoom receipt"
                                >
                                  <img src={request.photoUrl} alt="Uploaded Bill" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>
                              )}
                            </div>
                          ) : request.type === 'epod' ? (
                            <div style={{
                              background: 'var(--bg-void)',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              height: '95px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Signer:</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{request.receiverName}</strong>
                              </div>
                              <div style={{ background: '#ffffff', borderRadius: '4px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {request.signatureImg ? (
                                  <img src={request.signatureImg} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                ) : (
                                  <span style={{ color: '#64748b', fontSize: '0.65rem', fontStyle: 'italic' }}>No Signature</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Waybill
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              {request.extractedFields ? (
                                <div style={{
                                  background: 'var(--bg-void)',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  color: 'var(--text-secondary)',
                                  fontSize: '0.68rem',
                                  borderLeft: '4px solid var(--brand)',
                                  border: '1px solid var(--border-subtle)'
                                }}>
                                  <div style={{ borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <strong style={{ color: 'var(--brand)' }}>WAYBILL DETECTED</strong>
                                    <span>LR: <strong>{request.extractedFields.lrNumber || 'Unknown'}</strong></span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div>Consignor: <strong style={{ color: 'var(--text-primary)' }}>{request.extractedFields.consignor || 'N/A'}</strong></div>
                                    <div>Consignee: <strong style={{ color: 'var(--text-primary)' }}>{request.extractedFields.consignee || 'N/A'}</strong></div>
                                    <div>Dest: <strong style={{ color: 'var(--text-primary)' }}>{request.extractedFields.destination || 'N/A'}</strong></div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  height: '90px',
                                  background: 'var(--bg-elevated)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-subtle)',
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{ position: 'absolute', top: '5px', left: '5px', width: '20px', height: '25px', border: '1px solid var(--border-subtle)', borderRadius: '2px' }} />
                                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '18px', height: '18px', borderRadius: '50%', border: '1.5px dashed #f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', fontSize: '0.45rem', transform: 'rotate(-15deg)', fontWeight: 'bold' }}>STAMP</div>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>📄 WAYBILL_FILE.WebP</span>
                                </div>
                              )}
                              {request.photoUrl && (
                                <div 
                                  onClick={() => {
                                    setLightboxImage(request.photoUrl);
                                    setLightboxZoom(1);
                                  }}
                                  style={{
                                    height: '80px',
                                    background: 'var(--bg-void)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(0, 240, 255, 0.2)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'zoom-in'
                                  }}
                                  title="Click to zoom waybill"
                                >
                                  <img src={request.photoUrl} alt="Waybill Photo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick Presets & Reason Form on rejection toggle */}
                        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Rejection Reason:</span>
                          <input
                            type="text"
                            placeholder="e.g. Blurry photo"
                            value={rejectionReasons[request.id] || ''}
                            onChange={(e) => setRejectionReasons({ ...rejectionReasons, [request.id]: e.target.value })}
                            style={{ padding: '6px 8px', background: 'var(--bg-void)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.72rem' }}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {['Blurry', 'Wrong Value', 'Invalid Doc'].map(preset => (
                              <button
                                key={preset}
                                onClick={() => setRejectionReasons({ ...rejectionReasons, [request.id]: preset })}
                                style={{ padding: '2px 4px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '0.58rem', cursor: 'pointer' }}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleRejectRequest(request, rejectionReasons[request.id] || 'Re-upload required')}
                          className="btn btn-sm btn-danger"
                          style={{ flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: '0.75rem', fontWeight: '800' }}
                        >
                          ✕ Reject
                        </button>
                        <button
                          onClick={() => handleApproveRequest(request)}
                          className="btn btn-sm btn-success"
                          style={{ flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: '0.75rem', fontWeight: '800' }}
                        >
                          ✓ Approve
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Historical list section */}
            {approvals.filter(a => a.status !== 'pending').length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '14px', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '8px' }}>
                  Verification History
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                  {approvals.filter(a => a.status !== 'pending').map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', padding: '6px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px', fontWeight: '600' }}>{a.title}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{a.driverName}</span>
                        <span style={{
                          color: a.status === 'approved' ? 'var(--accent-success)' : 'var(--accent-danger)',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          fontSize: '0.62rem'
                        }}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIMULATOR CONTROLS COLLAPSIBLE */}
          <div className="card" style={{ padding: '14px 20px' }}>
            <div 
              onClick={() => setControlsOpen(!controlsOpen)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
                <Power size={16} className="text-brand" />
                Simulator Environment Overrides
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{controlsOpen ? '▼' : '►'}</span>
            </div>
            
            {controlsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                {/* Online/Offline Shadow-Zone Switch */}
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>Network Connection</span>
                    <span style={{ fontSize: '0.68rem', color: isOnline ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{isOnline ? 'Online (Direct Sync)' : 'Offline (Shadow Zone)'}</span>
                  </div>
                  <button 
                    onClick={() => setIsOnline(!isOnline)} 
                    className={`btn btn-sm ${isOnline ? 'btn-success' : 'btn-danger'}`}
                    style={{ minWidth: '70px', padding: '6px 12px', fontSize: '0.72rem' }}
                  >
                    {isOnline ? 'Offline' : 'Online'}
                  </button>
                </div>

                {/* Duty Toggle (On-Duty / Off-Duty) */}
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>Driver Duty Status</span>
                    <span style={{ fontSize: '0.68rem', color: isOnDuty ? 'var(--brand)' : 'var(--text-secondary)' }}>{isOnDuty ? 'On-Duty' : 'Off-Duty (Resting)'}</span>
                  </div>
                  <button 
                    onClick={() => setIsOnDuty(!isOnDuty)} 
                    className={`btn btn-sm ${isOnDuty ? 'btn-brand' : 'btn-secondary'}`}
                    style={{ minWidth: '70px', padding: '6px 12px', fontSize: '0.72rem' }}
                  >
                    {isOnDuty ? 'Rest' : 'Active'}
                  </button>
                </div>

                {/* Motion State Toggle */}
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>Truck Motion State</span>
                    <span style={{ fontSize: '0.68rem', color: isMoving ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>{isMoving ? 'Moving (~65 km/h)' : 'Stationary'}</span>
                  </div>
                  <button 
                    disabled={!isOnDuty || (selectedTrip && selectedTrip.status !== 'InTransit')}
                    onClick={() => setIsMoving(!isMoving)} 
                    className="btn btn-sm btn-secondary"
                    style={{ minWidth: '70px', padding: '6px 12px', fontSize: '0.72rem' }}
                  >
                    {isMoving ? 'Stop' : 'Drive'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TELEMETRY FEED ACCORDION */}
          <div className="card" style={{ padding: '14px 20px', borderColor: 'var(--accent-cyan)' }}>
            <div 
              onClick={() => setTelemetryOpen(!telemetryOpen)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', margin: 0 }}>
                <Compass size={16} />
                Live Location Telemetry Feed ({telemetryLogs.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{telemetryOpen ? '▼' : '►'}</span>
            </div>
            
            {telemetryOpen && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '4px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {telemetryLogs.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      Waiting for driver login, On-Duty status, and Trip "In Transit"...
                    </div>
                  ) : (
                    telemetryLogs.map((log) => (
                      <div key={log.id} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ 
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: log.stationary ? 'var(--text-secondary)' : 'var(--accent-success)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: log.stationary ? 'var(--text-secondary)' : 'var(--accent-success)', display: 'inline-block' }} />
                            {log.stationary ? 'Stationary' : 'Moving'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {new Date(log.recorded_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                          {getHumanReadableLocation(log.location, log.speed_kmh, log.stationary)}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <span>Speed: <strong style={{ color: 'var(--accent-cyan)' }}>{log.speed_kmh} km/h</strong></span>
                          <span>Battery: <strong style={{ color: 'var(--brand)' }}>🔋 {log.battery_level}%</strong></span>
                          <span style={{ marginLeft: 'auto', cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent-violet)' }} onClick={() => toggleRawLog(log.id)}>
                            {expandedLogs[log.id] ? 'Hide Coordinates' : 'Inspect Coordinates'}
                          </span>
                        </div>
                        {expandedLogs[log.id] && (
                          <div style={{ marginTop: '4px', padding: '6px', background: 'var(--bg-void)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            GIS: {log.location}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SQLITE QUEUE ACCORDION */}
          <div className="card" style={{ padding: '14px 20px', borderColor: 'var(--accent-violet)' }}>
            <div 
              onClick={() => setDbOpen(!dbOpen)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-violet)', margin: 0 }}>
                <Database size={16} />
                SQLite Offline Queue ({sqliteBuffer.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dbOpen ? '▼' : '►'}</span>
            </div>
            
            {dbOpen && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                  {sqliteBuffer.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      SQLite queue is empty. (Buffered changes auto-sync when online).
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sqliteBuffer.map((action) => {
                        const readableDesc = getReadableBufferAction(action);
                        const isExpanded = expandedActions[action.id];
                        return (
                          <div key={action.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', background: 'var(--bg-card)', borderLeft: '3px solid var(--accent-violet)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{readableDesc}</span>
                              <span className="badge" style={{ background: 'var(--accent-warning-glow)', color: 'var(--accent-warning)', fontSize: '0.6rem', padding: '1px 4px' }}>
                                Buffered
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              <span>Queued: {new Date(action.timestamp).toLocaleTimeString()}</span>
                              <span style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent-violet)' }} onClick={() => toggleRawAction(action.id)}>
                                {isExpanded ? 'Hide Raw' : 'Inspect Raw'}
                              </span>
                            </div>
                            {isExpanded && (
                              <pre style={{ margin: '4px 0 0 0', padding: '6px', background: 'var(--bg-void)', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid var(--border-color)' }}>
                                {JSON.stringify(action.payload, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BLUEPRINT GUIDELINES METRICS */}
          <div className="card">
            <h3 style={{ marginBottom: '12px', fontSize: '0.95rem' }}>Logistics Blueprint Architecture Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <h4 style={{ color: 'var(--brand)', fontSize: '0.82rem', marginBottom: '4px' }}>On-Device Battery Strategy</h4>
                <p className="text-secondary" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                  Standard location APIs poll continuously. Production apps deploy adaptive distance filtering combined with Motion Detection APIs to sleep GPS.
                </p>
              </div>
              <div>
                <h4 style={{ color: 'var(--brand)', fontSize: '0.82rem', marginBottom: '4px' }}>ePOD WebP Compression</h4>
                <p className="text-secondary" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                  Raw photos exhaust bandwidth. We compress delivery documents directly on-device to WebP (converting ~4.2 MB to ~185 KB) before pushing to S3.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT PANEL: SMARTPHONE SIMULATOR FRAME ── */}
        <div style={{ position: 'relative' }}>
          
          {/* PHONE SHELL CONTAINER */}
          <div className="driver-phone-shell">
            
            {/* SCREEN NOTCH */}
            <div className="driver-notch" style={{
              width: '130px',
              height: '24px',
              background: 'var(--bg-card)',
              borderRadius: '0 0 16px 16px',
              position: 'absolute',
              top: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: '99',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ width: '36px', height: '4px', background: 'var(--border-default)', borderRadius: '2px', marginRight: '8px' }} />
              <div style={{ width: '6px', height: '6px', background: 'var(--bg-void)', borderRadius: '50%' }} />
            </div>

            {/* STATUS BAR */}
            <div style={{
              height: '38px',
              padding: '0 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.72rem',
              color: 'var(--text-primary)',
              fontWeight: '700',
              zIndex: '98',
              marginTop: '4px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)'
            }}>
              <span>14:38</span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: isOnDuty ? 'var(--accent-success-glow)' : 'var(--bg-elevated)', color: isOnDuty ? 'var(--accent-success)' : 'var(--text-muted)', fontWeight: '800', border: '1px solid var(--border-subtle)' }}>
                  {isOnDuty ? 'DUTY' : 'REST'}
                </span>
                {isOnline ? (
                  <Wifi size={12} style={{ color: 'var(--accent-success)' }} />
                ) : (
                  <WifiOff size={12} style={{ color: 'var(--accent-danger)' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Battery size={14} style={{ transform: 'rotate(-90deg)', color: 'var(--text-primary)' }} />
                  <span>{Math.round(batteryLevel)}%</span>
                </div>
              </div>
            </div>

            {/* MAIN APP CONTAINER */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', background: 'var(--bg-primary)' }}>
              
              {/* OFFLINE INDICATOR BANNER */}
              {!isOnline && (
                <div style={{ background: 'var(--accent-danger)', color: '#fff', fontSize: '0.7rem', textAlign: 'center', padding: '5px 0', fontWeight: 'bold', letterSpacing: '0.5px', zIndex: 10 }}>
                  OFFLINE MODE (SAVING LOCALLY)
                </div>
              )}

              {/* SYNCING LOADER OVERLAY */}
              {syncing && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-void)', opacity: 0.95, zIndex: 95, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                  <div className="spinner-loader" style={{ width: '36px', height: '36px', borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Syncing Data...</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Syncing SQLite buffered transactions</span>
                </div>
              )}

              {/* OWNER APPROVAL WORKFLOW SCREENS */}
              {currentScreen === 'waitingApproval' && (
                <div style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  gap: '24px',
                  textAlign: 'center',
                  background: 'var(--bg-void)',
                  zIndex: 90
                }}>
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'var(--brand-glow)',
                    border: '2px solid var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 25px var(--brand-glow)',
                    animation: 'pulse 1.8s infinite'
                  }}>
                    <ShieldAlert size={36} style={{ color: 'var(--brand)' }} />
                  </div>
                  
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>Waiting for Owner Review</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', padding: '0 10px' }}>
                      Your submission has been securely uploaded and queued for validation. The owner has been notified.
                    </p>
                  </div>

                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{activePendingApproval?.title}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ref ID:</span>
                      <span style={{ color: 'var(--brand)', fontFamily: 'monospace' }}>{activePendingApproval?.id.split('-').slice(0, 2).join('-')}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand)', fontSize: '0.78rem', fontWeight: 'bold' }}>
                    <div className="spinner-loader" style={{ width: '14px', height: '14px', borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                    Awaiting verification...
                  </div>
                </div>
              )}

              {currentScreen === 'rejection' && (
                <div style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  gap: '20px',
                  textAlign: 'center',
                  background: 'var(--bg-void)',
                  zIndex: 90
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--accent-danger-glow)',
                    border: '2px solid var(--accent-danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px var(--accent-danger-glow)'
                  }}>
                    <XCircle size={32} style={{ color: 'var(--accent-danger)' }} />
                  </div>
                  
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '8px' }}>Submission Rejected</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      The fleet owner has rejected your submission. Please check the reason below and resubmit.
                    </p>
                  </div>

                  <div style={{
                    background: 'var(--accent-danger-glow)',
                    border: '1px solid var(--accent-danger)',
                    borderRadius: '12px',
                    padding: '14px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    textAlign: 'left'
                  }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-danger)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REJECTION REASON</span>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '600', margin: 0 }}>
                      "{activePendingApproval?.rejectionReason || 'Invalid document format'}"
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      const type = activePendingApproval?.type;
                      setActivePendingApproval(null);
                      if (type === 'odoStart') {
                        setCurrentScreen('odoStart');
                      } else if (type === 'odoEnd') {
                        setCurrentScreen('odoEnd');
                      } else if (type === 'expense') {
                        setCurrentScreen('expense');
                      } else if (type === 'epod') {
                        setCurrentScreen('epod');
                      } else if (type === 'waybill') {
                        setCurrentScreen('waybill');
                      } else {
                        setCurrentScreen('tripDetail');
                      }
                    }}
                    className="btn btn-danger"
                    style={{ 
                      width: '100%', 
                      padding: '12px 0', 
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Retake & Resubmit
                  </button>
                </div>
              )}

              {/* 1. LOGIN SCREEN */}
              {currentScreen === 'login' && (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'var(--brand-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', border: '1px solid var(--border-glow)' }}>
                      <Smartphone size={26} style={{ color: 'var(--brand)' }} />
                    </div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '1.35rem', fontWeight: '800', letterSpacing: '0.5px' }}>LogiSync Mobile</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Driver On-Duty App
                    </p>
                  </div>

                  {/* One-Tap Auto Login */}
                  <div style={{ 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-warning)', letterSpacing: '1px' }}>
                      ⚡ QUICK DEMO TESTING
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        const demoDriver = drivers.find(d => d.phone === '9876543210') || drivers[0] || { id: 'DRV-01', name: 'Rajesh Kumar', phone: '9876543210' };
                        setActiveDriver(demoDriver);
                        const driverTrip = trips.find(t => t.driverId === demoDriver.id || t.driverName?.includes(demoDriver.name)) || trips[0];
                        setSelectedTrip(driverTrip);
                        setCurrentScreen('tripDetail');
                        setActiveTab('trip');
                      }}
                      className="btn btn-brand"
                      style={{ 
                        width: '100%', 
                        padding: '12px 0', 
                        fontSize: '0.85rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Sparkles size={14} />
                      One-Tap Login (Rajesh)
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>OR ENTER OTP</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  </div>

                  <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Mobile Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 9876543210" 
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        disabled={otpSent}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-void)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}
                      />
                    </div>

                    {otpSent && (
                      <div className="animate-slide-down">
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Enter 6-Digit OTP</label>
                        <input 
                          type="password" 
                          placeholder="Autofill: 123456" 
                          value={loginOtp}
                          onChange={(e) => setLoginOtp(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-void)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '700', textAlign: 'center', letterSpacing: '4px' }}
                        />
                      </div>
                    )}

                    {authError && (
                      <div style={{ color: 'var(--accent-danger)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                        <AlertCircle size={12} />
                        {authError}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="btn btn-brand" 
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        fontSize: '0.85rem', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <div className="spinner-loader" style={{ width: '14px', height: '14px', borderColor: 'currentColor', borderTopColor: 'transparent' }} />
                      ) : otpSent ? (
                        'Verify & Login'
                      ) : (
                        'Request OTP Code'
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* 2. SUB-SCREENS INTERACTION */}
              {currentScreen !== 'login' && currentScreen !== 'tripDetail' && (
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Odometer Start Input */}
                  {currentScreen === 'odoStart' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentScreen('tripDetail')} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          ◀ Back
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Vehicle Inspection Start</span>
                      </div>

                      <form onSubmit={handleStartTripSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Odometer Value (km)</label>
                          <input 
                            type="number"
                            placeholder="e.g. 125430"
                            value={odoValue}
                            onChange={(e) => setOdoValue(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-void)', border: '1px solid var(--brand)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '800', textAlign: 'center', letterSpacing: '2px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Odometer Photo</label>
                          {odoPhoto ? (
                            <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--accent-success)', overflow: 'hidden' }}>
                              <div style={{ height: '90px', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.5rem' }}>📸</span>
                              </div>
                              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-success-glow)', fontSize: '0.72rem' }}>
                                <span style={{ color: 'var(--accent-success)', fontWeight: '800' }}>✓ Photo Captured</span>
                                <button type="button" onClick={() => setOdoPhoto(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.72rem', fontWeight: '800' }}>Retake</button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setOdoPhoto(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '14px 0', fontSize: '0.8rem', fontWeight: '800', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', cursor: 'pointer' }}>
                              <Camera size={14} style={{ color: 'var(--brand)' }} /> Take Odometer Picture
                            </button>
                          )}
                        </div>

                        <button type="submit" className="btn btn-brand" style={{ width: '100%', fontSize: '0.85rem', padding: '12px 0', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' }}>
                          Complete Inspection
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Odometer End Input */}
                  {currentScreen === 'odoEnd' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentScreen('tripDetail')} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}>
                          ◀ Back
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>End Journey (Odo)</span>
                      </div>

                      <form onSubmit={handleEndTripSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Ending Odometer Reading (km)</label>
                          <input 
                            type="number"
                            placeholder={`Must exceed ${selectedTrip?.odoStart || 125430}`}
                            value={odoValue}
                            onChange={(e) => setOdoValue(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-void)', border: '1px solid var(--accent-danger)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '800', textAlign: 'center', letterSpacing: '2px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Closing Odometer Photo</label>
                          {odoPhoto ? (
                            <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--accent-danger)', overflow: 'hidden' }}>
                              <div style={{ height: '90px', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.5rem' }}>📸</span>
                              </div>
                              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-danger-glow)', fontSize: '0.72rem' }}>
                                <span style={{ color: 'var(--accent-danger)', fontWeight: '800' }}>✓ Closing Photo Captured</span>
                                <button type="button" onClick={() => setOdoPhoto(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.72rem', fontWeight: '800' }}>Retake</button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setOdoPhoto(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '14px 0', fontSize: '0.8rem', fontWeight: '800', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', cursor: 'pointer' }}>
                              <Camera size={14} style={{ color: 'var(--accent-danger)' }} /> Capture End Odo Picture
                            </button>
                          )}
                        </div>

                        <button type="submit" className="btn btn-danger" style={{ width: '100%', fontSize: '0.85rem', padding: '12px 0', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' }}>
                          Close Trip Ledger
                        </button>
                      </form>
                    </div>
                  )}

                  {/* ePOD Receiver Signature Canvas */}
                  {currentScreen === 'epod' && epodLr && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentScreen('tripDetail')} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}>
                          ◀ Back
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>ePOD Submission</span>
                      </div>

                      <form onSubmit={handleEpodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LR Number:</span>
                          <strong style={{ color: 'var(--brand)', display: 'block', fontSize: '0.85rem', fontWeight: '800' }}>{epodLr.lrNo}</strong>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Receiver Full Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. S. Sharma" 
                            value={epodSignerName}
                            onChange={(e) => setEpodSignerName(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', background: 'var(--bg-void)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Sign on Glass</label>
                            <button type="button" onClick={clearSignature} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline' }}>
                              Clear
                            </button>
                          </div>
                          <div style={{ position: 'relative', height: '110px' }}>
                            <canvas 
                              ref={canvasRef}
                              width="290"
                              height="110"
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={stopDrawing}
                              style={{ background: '#ffffff', border: '1px solid var(--border-default)', borderRadius: '8px', width: '100%', height: '110px', cursor: 'crosshair', touchAction: 'none' }}
                            />
                            {!hasSigned && (
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', fontWeight: '600' }}>
                                Sign Here
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          className="btn btn-brand" 
                          style={{ 
                            width: '100%', 
                            fontSize: '0.85rem', 
                            padding: '12px 0', 
                            fontWeight: '800',
                            borderRadius: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          Confirm & Save Signature
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Waybill Photo Capture */}
                  {currentScreen === 'waybill' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentScreen('tripDetail')} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}>
                          ◀ Back
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Upload Waybill Photo</span>
                      </div>

                      <form onSubmit={handleWaybillUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--brand)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                          <Camera size={36} style={{ color: 'var(--brand)', marginBottom: '10px' }} />
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '600' }}>Waybill dial viewfinder</p>
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>Fit the signed page inside limits</p>
                        </div>

                        {isCompressing ? (
                          <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--brand)', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                              Compacting WebP Document...
                            </span>
                            <div style={{ width: '100%', height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: '80%', height: '100%', background: 'var(--brand)', animation: 'pulse 1.2s infinite' }} />
                            </div>
                          </div>
                        ) : (
                          <button 
                            type="submit" 
                            className="btn btn-brand" 
                            style={{ 
                              width: '100%', 
                              fontSize: '0.85rem', 
                              padding: '12px 0', 
                              fontWeight: '800',
                              borderRadius: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            Capture & Compress Waybill
                          </button>
                        )}
                      </form>
                    </div>
                  )}

                  {/* Cargo Verification */}
                  {currentScreen === 'cargo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentScreen('tripDetail')} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}>
                          ◀ Back
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Cargo Verification</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Verify the package conditions before completing receipt handover.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                          {[
                            'Consignment count matches (150 articles)',
                            'Packaging verified intact & dry',
                            'Container lock seal check complete',
                            'Delivery labels match receiver bill'
                          ].map((checkItem, index) => (
                            <label key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--brand)' }} />
                              <span>{checkItem}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={handleCargoVerification}
                        className="btn btn-brand" 
                        style={{ 
                          width: '100%', 
                          fontSize: '0.85rem', 
                          padding: '12px 0', 
                          fontWeight: '800',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        Verify Cargo Checks
                      </button>
                    </div>
                  )}

                  {/* OCR Expense Capture */}
                  {currentScreen === 'expense' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentScreen('tripDetail')} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}>
                          ◀ Back
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Expense Logger</span>
                      </div>

                      {!ocrResult && !ocrScanning && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Expense Category</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                { id: 'fuel', label: '⛽ Fuel', desc: 'Diesel / Gas' },
                                { id: 'toll', label: '🛣️ Toll', desc: 'FASTag / Plaza' },
                                { id: 'batta', label: '🍲 Meals', desc: 'Driver Batta' },
                                { id: 'misc', label: '🛠️ Misc', desc: 'Repair / Other' }
                              ].map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setExpenseType(item.id)}
                                  style={{
                                    padding: '10px 8px',
                                    background: expenseType === item.id ? 'var(--brand)' : 'var(--bg-elevated)',
                                    border: '1px solid',
                                    borderColor: expenseType === item.id ? 'var(--brand)' : 'var(--border-subtle)',
                                    borderRadius: '10px',
                                    color: expenseType === item.id ? '#ffffff' : 'var(--text-primary)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <strong style={{ fontSize: '0.85rem', fontWeight: '800' }}>{item.label}</strong>
                                  <span style={{ fontSize: '0.65rem', color: expenseType === item.id ? '#ffffff' : 'var(--text-muted)' }}>{item.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Receipt Scanner</label>
                            <div style={{ 
                              position: 'relative', 
                              background: 'var(--bg-void)', 
                              borderRadius: '12px', 
                              border: '1px solid var(--border-subtle)', 
                              overflow: 'hidden', 
                              padding: (ocrFile || useWebcam) ? '0' : '20px 10px', 
                              textAlign: 'center',
                              height: '150px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer'
                            }}>
                              {useWebcam ? (
                                <video 
                                  ref={videoRef} 
                                  autoPlay 
                                  playsInline 
                                  muted
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              ) : ocrFile ? (
                                <img src={ocrFile} alt="Receipt Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <>
                                  <Camera size={24} style={{ color: 'var(--brand)', marginBottom: '8px' }} />
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-primary)', display: 'block', fontWeight: '700' }}>Place receipt in viewfinder</span>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Click to select/snap receipt image</span>
                                </>
                              )}
                              {!useWebcam && !ocrFile && (
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  capture="environment" 
                                  onChange={handleFileChange}
                                  style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    opacity: 0, cursor: 'pointer', width: '100%', height: '100%'
                                  }}
                                />
                              )}
                            </div>

                            {useWebcam ? (
                              <button 
                                type="button" 
                                onClick={captureWebcam}
                                className="btn btn-success"
                                style={{ 
                                  width: '100%', 
                                  marginTop: '10px', 
                                  padding: '12px 0', 
                                  fontSize: '0.85rem', 
                                  fontWeight: '800', 
                                  borderRadius: '10px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '6px', 
                                  cursor: 'pointer' 
                                }}
                              >
                                <Camera size={14} /> Capture Photo
                              </button>
                            ) : (
                              <button 
                                type="button" 
                                onClick={handleOcrSnap}
                                disabled={!ocrFile}
                                className="btn btn-brand"
                                style={{ 
                                  width: '100%', 
                                  marginTop: '10px', 
                                  padding: '12px 0', 
                                  fontSize: '0.85rem', 
                                  fontWeight: '800', 
                                  borderRadius: '10px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '6px', 
                                  cursor: 'pointer',
                                  opacity: ocrFile ? 1 : 0.6
                                }}
                              >
                                <UploadCloud size={14} /> Snap Receipt & Auto OCR
                              </button>
                            )}

                            {!ocrFile && (
                              <button
                                type="button"
                                onClick={() => setUseWebcam(!useWebcam)}
                                className="btn"
                                style={{
                                  width: '100%',
                                  marginTop: '8px',
                                  padding: '8px 0',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  color: 'var(--brand)',
                                  background: 'transparent',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '8px',
                                  cursor: 'pointer'
                                }}
                              >
                                {useWebcam ? '✕ Cancel Webcam (Use File Manager)' : '📸 Switch to Live Laptop Webcam'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {ocrScanning && (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--brand)', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'var(--brand)',
                            boxShadow: '0 0 8px var(--brand)',
                            animation: 'scan-laser 2s infinite linear',
                            top: '50%'
                          }} />
                          <div className="spinner-loader" style={{ width: '28px', height: '28px', borderColor: 'var(--brand)', borderTopColor: 'transparent', marginBottom: '12px' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Running AI OCR Scanner...</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Extracting cost metrics...</span>
                        </div>
                      )}

                      {ocrResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '12px', border: '1px solid var(--accent-success)' }}>
                            <span style={{ background: 'var(--accent-success-glow)', color: 'var(--accent-success)', display: 'inline-block', fontSize: '0.68rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', border: '1px solid currentColor', marginBottom: '8px' }}>
                              ✓ OCR Extraction Completed
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Merchant Name:</span>
                                <input 
                                  type="text" 
                                  value={ocrResult.merchant} 
                                  onChange={e => setOcrResult({ ...ocrResult, merchant: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'var(--bg-void)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                  }}
                                />
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Extracted Amount (₹):</span>
                                <input 
                                  type="number" 
                                  value={ocrResult.amount} 
                                  onChange={e => setOcrResult({ ...ocrResult, amount: Number(e.target.value) })}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'var(--bg-void)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '6px',
                                    color: 'var(--brand)',
                                    fontSize: '0.85rem',
                                    fontWeight: '800'
                                  }}
                                />
                                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                  {[350, 1200, 3600, 18500].map(amt => (
                                    <button
                                      key={amt}
                                      type="button"
                                      onClick={() => setOcrResult({ ...ocrResult, amount: amt })}
                                      style={{
                                        padding: '2px 6px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '4px',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.62rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ₹{amt.toLocaleString('en-IN')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setOcrResult(null); setOcrFile(null); setOcrFileName(''); }} className="btn" style={{ flex: 1, fontSize: '0.8rem', padding: '10px 0', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>Retake</button>
                            <button onClick={handleSaveExpense} className="btn btn-brand" style={{ flex: 1, fontSize: '0.8rem', padding: '10px 0', fontWeight: '800', borderRadius: '8px', cursor: 'pointer' }}>Save Receipt</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* 3. CORE APP INTERFACE WITH TAB ROUTING */}
              {currentScreen === 'tripDetail' && (
                <>
                  {/* TAB 1: HOME (Trip assigned lists) */}
                  {activeTab === 'home' && (
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>
                          Driver Dashboard
                        </span>
                      </div>

                      {selectedTrip ? (
                        <div 
                          onClick={() => setActiveTab('trip')}
                          style={{ 
                            background: 'var(--bg-elevated)', 
                            padding: '16px', 
                            borderRadius: '16px', 
                            border: '1.5px solid #00f0ff', 
                            boxShadow: '0 0 10px rgba(0, 240, 255, 0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f59e0b' }}>
                              {selectedTrip.id}
                            </span>
                            <span style={{ 
                              background: selectedTrip.status === 'InTransit' ? 'rgba(6, 182, 212, 0.15)' : selectedTrip.status === 'Delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: selectedTrip.status === 'InTransit' ? '#00f0ff' : selectedTrip.status === 'Delivered' ? '#10b981' : '#f59e0b',
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid currentColor'
                            }}>
                              {selectedTrip.status === 'InTransit' ? 'IN TRANSIT' : selectedTrip.status.toUpperCase()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem', fontWeight: '800' }}>
                              <span style={{ color: 'var(--text-primary)' }}>{selectedTrip.origin}</span>
                              <span style={{ color: 'var(--brand)' }}>➔</span>
                              <span style={{ color: 'var(--text-primary)' }}>{selectedTrip.destination}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total route: 1,420 km</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '0.75rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Vehicle: </span>
                              <strong style={{ color: 'var(--text-primary)' }}>{selectedTrip.truckNo}</strong>
                            </div>
                            <div style={{ textAlign: 'right', color: 'var(--brand)', fontWeight: '800' }}>
                              Inspect Trip ➔
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '30px', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          No active trips assigned.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: TRUCK/JOURNEY (THE PRINCIPAL UI MOCKUP VIEW) */}
                  {activeTab === 'trip' && selectedTrip && (() => {
                    // Computed distances and progresspct matching mockup
                    const totalTripKm = 1420;
                    const dynamicCoveredKm = Math.min(Math.round(simulatedKmProgress), totalTripKm);
                    const dynamicProgressPct = Math.min(Math.round((simulatedKmProgress / totalTripKm) * 100), 100);
                    
                    const dynamicRemainingDistance = Math.max(totalTripKm - dynamicCoveredKm, 0);
                    const dynamicRemainingHours = dynamicRemainingDistance / 62; // average speed
                    const remH = Math.floor(dynamicRemainingHours);
                    const remM = Math.round((dynamicRemainingHours % 1) * 60);

                    // Truck dynamic marker coords along SVG line path
                    const markerCoords = getTruckPos(simulatedKmProgress);

                    return (
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        {/* Driver Profile Header Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ position: 'relative' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '800', border: '1px solid var(--border-subtle)' }}>
                                {activeDriver?.name?.split(' ').map(n=>n[0]).join('') || 'JD'}
                              </div>
                              <span style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-success)', border: '2px solid var(--bg-card)' }} />
                            </div>
                            <div>
                              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: '800', margin: 0 }}>{activeDriver?.name || 'John Doe'}</h4>
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', fontWeight: '700' }}>Active</span>
                            </div>
                          </div>
                          
                          <div style={{ position: 'relative' }}>
                            <Bell size={18} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setActiveTab('notifications')} />
                            {sqliteBuffer.length > 0 && (
                              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-warning)' }} />
                            )}
                          </div>
                        </div>

                        {/* Gold-colored active trip route description */}
                        <div>
                          <span style={{ color: 'var(--accent-warning)', fontSize: '0.95rem', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            ACTIVE TRIP: <span style={{ color: 'var(--text-primary)' }}>{selectedTrip.origin} ➔ {selectedTrip.destination}</span>
                          </span>
                        </div>

                        {/* Glowing Map Card */}
                        <div style={{ 
                          background: 'var(--bg-elevated)', 
                          borderRadius: '18px', 
                          border: '1.5px solid var(--brand)', 
                          boxShadow: '0 0 12px var(--brand-glow)',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '700' }}>
                            <span style={{ color: 'var(--text-muted)' }}>TRIP ID: {selectedTrip.id}</span>
                            <span style={{ color: 'var(--accent-warning)' }}>STATUS: {selectedTrip.status === 'InTransit' ? 'IN TRANSIT' : selectedTrip.status.toUpperCase()}</span>
                          </div>

                          {/* Map Graphics */}
                          <svg width="100%" height="190" viewBox="0 0 280 190" style={{ background: 'var(--bg-void)', display: 'block' }}>
                            {/* Grid helper dots */}
                            <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                              <circle cx="2" cy="2" r="0.8" fill="var(--border-subtle)" />
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#dotGrid)" />

                            {/* Background map boundaries mock */}
                            <path d="M 230,10 L 260,35 Q 240,90 220,105 L 180,95 Q 160,110 150,135 Z" fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 3" />
                            <text x="240" y="55" fill="var(--text-muted)" fontSize="9" fontWeight="bold" letterSpacing="1" opacity="0.6">Nepal</text>
                            <text x="140" y="110" fill="var(--text-muted)" fontSize="18" fontWeight="bold" letterSpacing="3" opacity="0.4">India</text>

                            {/* Glowing Neon Cyan Route Line */}
                            <path 
                              d="M 170,30 Q 140,55 120,70 T 105,125 T 100,175" 
                              fill="none" 
                              stroke="var(--brand-glow)" 
                              strokeWidth="7" 
                              strokeLinecap="round"
                            />
                            <path 
                              d="M 170,30 Q 140,55 120,70 T 105,125 T 100,175" 
                              fill="none" 
                              stroke="var(--brand)" 
                              strokeWidth="3.5" 
                              strokeLinecap="round"
                              style={{ filter: 'drop-shadow(0px 0px 5px var(--brand))' }}
                            />

                            {/* Waypoint markers */}
                            <circle cx="170" cy="30" r="4.5" fill="#f59e0b" stroke="var(--bg-void)" strokeWidth="1.5" />
                            <text x="180" y="34" fill="var(--text-primary)" fontSize="9.5" fontWeight="bold">Delhi</text>

                            <circle cx="120" cy="70" r="3.5" fill="var(--text-muted)" />
                            <text x="80" y="74" fill="var(--text-muted)" fontSize="8" fontWeight="600">Jaipur</text>

                            <circle cx="105" cy="125" r="3.5" fill="var(--text-muted)" />
                            <text x="50" y="129" fill="var(--text-muted)" fontSize="8" fontWeight="600">Vadodara</text>

                            <circle cx="100" cy="175" r="4.5" fill="#10b981" stroke="var(--bg-void)" strokeWidth="1.5" />
                            <text x="54" y="179" fill="var(--text-primary)" fontSize="9.5" fontWeight="bold">Mumbai</text>

                            {/* Moving truck icon indicator */}
                            {selectedTrip.status === 'InTransit' && (
                              <g transform={`translate(${markerCoords.x - 10}, ${markerCoords.y - 10})`} style={{ filter: 'drop-shadow(0px 0px 6px #ff9f0a)' }}>
                                <circle cx="10" cy="10" r="10" fill="#ff9f0a" />
                                {/* Small truck shape inside indicator */}
                                <path d="M5 7h7v3.5H5zm7 1.5h3L16 11H12z" fill="#070b14" />
                                <circle cx="7" cy="12" r="1" fill="#070b14" />
                                <circle cx="12.5" cy="12" r="1" fill="#070b14" />
                              </g>
                            )}
                          </svg>

                          {/* Translucent ETA banner overlay at bottom */}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', padding: '6px 12px', fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: '700', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                            ETA: {isTripDelivered ? 'Arrived at Destination' : `19 Oct, 09:30 AM (Remaining: ${remH}h ${remM}m)`}
                          </div>
                        </div>

                        {/* GPS Progress Card */}
                        <div style={{ 
                          background: 'var(--bg-elevated)', 
                          borderRadius: '18px', 
                          border: '1.5px solid var(--brand)', 
                          boxShadow: '0 0 12px var(--brand-glow)',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: '800' }}>
                            <span style={{ color: 'var(--text-primary)' }}>Delhi <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '500' }}>(DEP: 17 Oct, 22:15)</span></span>
                            <span style={{ color: 'var(--brand)', fontSize: '0.75rem' }}>➔</span>
                            <span style={{ color: 'var(--text-primary)' }}>Mumbai <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '500' }}>(DEST)</span></span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>GPS progress</span>
                            <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${dynamicProgressPct}%`, height: '100%', background: 'var(--brand)', boxShadow: '0 0 8px var(--brand)', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }} />
                            </div>
                          </div>

                          <div style={{ fontSize: '0.7rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                            {dynamicCoveredKm.toLocaleString()} km covered / {totalTripKm.toLocaleString()} km ({dynamicProgressPct}%) | Next Stop: Vadodara (210 km)
                          </div>
                        </div>

                        {/* ePOD CHECKLIST PANEL */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                            ePOD CHECKLIST
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            
                            {/* Item 1: Vehicle Inspection (Start Odo) */}
                            <div 
                              onClick={() => {
                                if (!hasInspectionDone) setCurrentScreen('odoStart');
                              }}
                              style={{ 
                                background: 'var(--bg-elevated)', 
                                padding: '12px', 
                                borderRadius: '14px', 
                                border: '1px solid var(--border-subtle)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                cursor: hasInspectionDone ? 'default' : 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Completed Checkmark Icon or empty box */}
                                {hasInspectionDone ? (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'var(--accent-success-glow)', border: '1.5px solid var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)', fontSize: '0.72rem', fontWeight: 'bold' }}>✓</div>
                                ) : (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: '1.5px solid var(--border-default)' }} />
                                )}
                                <div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: hasInspectionDone ? 'var(--accent-success)' : 'var(--text-primary)', display: 'block' }}>
                                    1. Vehicle Inspection {hasInspectionDone && '(Completed)'}
                                  </span>
                                </div>
                              </div>
                              <Truck size={15} style={{ color: hasInspectionDone ? 'var(--accent-success)' : 'var(--text-muted)' }} />
                            </div>

                            {/* Item 2: Client Signature (ePOD) */}
                            <div 
                              onClick={() => {
                                if (!hasInspectionDone) {
                                  alert("Please complete Vehicle Inspection first!");
                                  return;
                                }
                                if (!hasSigned) {
                                  setEpodLr(activeLrObj);
                                  setCurrentScreen('epod');
                                }
                              }}
                              style={{ 
                                background: 'var(--bg-elevated)', 
                                padding: '12px', 
                                borderRadius: '14px', 
                                border: '1px solid var(--border-subtle)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                cursor: hasSigned ? 'default' : 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {hasSigned ? (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'var(--accent-success-glow)', border: '1.5px solid var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)', fontSize: '0.72rem', fontWeight: 'bold' }}>✓</div>
                                ) : (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: '1.5px solid var(--border-default)' }} />
                                )}
                                <div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: hasSigned ? 'var(--accent-success)' : 'var(--text-primary)', display: 'block' }}>
                                    2. Client Signature (Delhi) {hasSigned && '(Completed)'}
                                  </span>
                                </div>
                              </div>
                              <PenTool size={15} style={{ color: hasSigned ? 'var(--accent-success)' : 'var(--text-muted)' }} />
                            </div>

                            {/* Item 3: Upload Waybill Photo */}
                            <div 
                              onClick={() => {
                                if (!hasSigned) {
                                  alert("Please complete Client Signature first!");
                                  return;
                                }
                                if (!hasWaybillUploaded) setCurrentScreen('waybill');
                              }}
                              style={{ 
                                background: 'var(--bg-elevated)', 
                                padding: '12px', 
                                borderRadius: '14px', 
                                border: '1px solid var(--border-subtle)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                cursor: hasWaybillUploaded ? 'default' : 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {hasWaybillUploaded ? (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'var(--accent-success-glow)', border: '1.5px solid var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)', fontSize: '0.72rem', fontWeight: 'bold' }}>✓</div>
                                ) : (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: '1.5px solid var(--border-default)' }} />
                                )}
                                <div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: hasWaybillUploaded ? 'var(--accent-success)' : 'var(--text-primary)', display: 'block' }}>
                                    3. Upload Waybill Photo {hasWaybillUploaded && '(Completed)'}
                                  </span>
                                </div>
                              </div>
                              <Camera size={15} style={{ color: hasWaybillUploaded ? 'var(--accent-success)' : 'var(--text-muted)' }} />
                            </div>

                            {/* Item 4: Cargo Verification */}
                            <div 
                              onClick={() => {
                                if (!hasWaybillUploaded) {
                                  alert("Please complete Waybill Photo upload first!");
                                  return;
                                }
                                if (!hasCargoVerified) setCurrentScreen('cargo');
                              }}
                              style={{ 
                                background: 'var(--bg-elevated)', 
                                padding: '12px', 
                                borderRadius: '14px', 
                                border: '1px solid var(--border-subtle)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                cursor: hasCargoVerified ? 'default' : 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {hasCargoVerified ? (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'var(--accent-success-glow)', border: '1.5px solid var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)', fontSize: '0.72rem', fontWeight: 'bold' }}>✓</div>
                                ) : (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: '1.5px solid var(--border-default)' }} />
                                )}
                                <div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: hasCargoVerified ? 'var(--accent-success)' : 'var(--text-primary)', display: 'block' }}>
                                    4. Cargo Verification (MUM) {hasCargoVerified && '(Completed)'}
                                  </span>
                                </div>
                              </div>
                              <Package size={15} style={{ color: hasCargoVerified ? 'var(--accent-success)' : 'var(--text-muted)' }} />
                            </div>

                          </div>
                        </div>

                        {/* End Trip LEDGER when checklist is complete */}
                        {isChecklistComplete && !isTripDelivered && (
                          <button
                            onClick={() => setCurrentScreen('odoEnd')}
                            className="btn btn-danger animate-pulse"
                            style={{
                              width: '100%',
                              padding: '12px 0',
                              fontSize: '0.85rem',
                              fontWeight: '800',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              marginTop: '2px'
                            }}
                          >
                            🏁 COMPLETE JOURNEY (End Odometer)
                          </button>
                        )}

                        {/* Saffron/Gold action button */}
                        <button 
                          onClick={() => setCurrentScreen('expense')}
                          className="btn btn-warning"
                          style={{
                            width: '100%',
                            padding: '14px 0',
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '4px'
                          }}
                        >
                          <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>+</span> LOG EXPENSE (Fuel/Toll)
                        </button>

                      </div>
                    );
                  })()}

                  {/* TAB 3: NOTIFICATIONS (Telemetry Timelines / sqlite buffers logs) */}
                  {activeTab === 'notifications' && (
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        System Notifications
                      </span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '420px' }}>
                        {sqliteBuffer.map(item => (
                          <div key={item.id} style={{ background: 'var(--accent-warning-glow)', padding: '10px', borderRadius: '10px', border: '1px solid var(--accent-warning)', fontSize: '0.72rem' }}>
                            <strong style={{ color: 'var(--accent-warning)', display: 'block', marginBottom: '2px' }}>PENDING OFFLINE TRANSACTION</strong>
                            <span style={{ color: 'var(--text-primary)' }}>{getReadableBufferAction(item)}</span>
                          </div>
                        ))}
                        
                        <div style={{ background: 'var(--accent-success-glow)', padding: '10px', borderRadius: '10px', border: '1px solid var(--accent-success)', fontSize: '0.72rem' }}>
                          <strong style={{ color: 'var(--accent-success)', display: 'block', marginBottom: '2px' }}>GPS PING SYNCED</strong>
                          <span style={{ color: 'var(--text-primary)' }}>Odometer tracker ping successfully uploaded.</span>
                        </div>

                        <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.72rem' }}>
                          <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>TRIP ASSIGNED</strong>
                          <span style={{ color: 'var(--text-primary)' }}>Trip ID {selectedTrip?.id} has been added to your cockpit.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: PROFILE (Duty status toggle & profile info) */}
                  {activeTab === 'profile' && (
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Driver Profile
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--brand)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 'bold' }}>
                          {activeDriver?.name?.split(' ').map(n=>n[0]).join('') || 'JD'}
                        </div>
                        <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '800', margin: 0 }}>{activeDriver?.name || 'John Doe'}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {activeDriver?.id || 'DRV-01'}</span>
                      </div>

                      {/* Duty switches inside profiles tab */}
                      <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '700' }}>Active Duty GPS Tracking</span>
                        <button 
                          onClick={() => setIsOnDuty(!isOnDuty)} 
                          className="btn" 
                          style={{ 
                            fontSize: '0.72rem', 
                            padding: '4px 10px', 
                            fontWeight: '800', 
                            background: isOnDuty ? 'var(--accent-success)' : 'var(--accent-danger)', 
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer' 
                          }}
                        >
                          {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                        </button>
                      </div>

                      {/* Offline controls toggle inside profile tab */}
                      <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '700' }}>Signal Connection Mode</span>
                        <button 
                          onClick={() => setIsOnline(!isOnline)} 
                          className="btn" 
                          style={{ 
                            fontSize: '0.72rem', 
                            padding: '4px 10px', 
                            fontWeight: '800', 
                            background: isOnline ? 'var(--accent-success)' : 'var(--accent-warning)', 
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer' 
                          }}
                        >
                          {isOnline ? 'ONLINE' : 'SHADOW ZONE'}
                        </button>
                      </div>

                      <button 
                        onClick={() => {
                          setActiveDriver(null);
                          setOtpSent(false);
                          setLoginPhone('');
                          setCurrentScreen('login');
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '12px 0', 
                          background: 'var(--accent-danger-glow)', 
                          color: 'var(--accent-danger)', 
                          border: '1px solid var(--accent-danger)', 
                          borderRadius: '12px', 
                          fontWeight: '800', 
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          marginTop: '10px'
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}

                  {/* BOTTOM NAVIGATION TAB BAR */}
                  <div style={{
                    height: '56px',
                    background: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    paddingBottom: '4px',
                    zIndex: 90
                  }}>
                    {/* Home Tab Link */}
                    <button 
                      onClick={() => setActiveTab('home')}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: activeTab === 'home' ? 'var(--brand)' : 'var(--text-muted)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '2px', 
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <Home size={18} />
                      {activeTab === 'home' && (
                        <div style={{ position: 'absolute', bottom: '-8px', width: '20px', height: '2.5px', background: 'var(--brand)', borderRadius: '1.5px' }} />
                      )}
                    </button>

                    {/* Active Trip Tab Link */}
                    <button 
                      onClick={() => setActiveTab('trip')}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: activeTab === 'trip' ? 'var(--brand)' : 'var(--text-muted)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '2px', 
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <Truck size={18} />
                      {activeTab === 'trip' && (
                        <div style={{ position: 'absolute', bottom: '-8px', width: '20px', height: '2.5px', background: 'var(--brand)', borderRadius: '1.5px' }} />
                      )}
                    </button>

                    {/* Notifications / Live Logs Tab Link */}
                    <button 
                      onClick={() => setActiveTab('notifications')}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: activeTab === 'notifications' ? 'var(--brand)' : 'var(--text-muted)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '2px', 
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <Bell size={18} />
                      {activeTab === 'notifications' && (
                        <div style={{ position: 'absolute', bottom: '-8px', width: '20px', height: '2.5px', background: 'var(--brand)', borderRadius: '1.5px' }} />
                      )}
                    </button>

                    {/* Profile Tab Link */}
                    <button 
                      onClick={() => setActiveTab('profile')}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: activeTab === 'profile' ? 'var(--brand)' : 'var(--text-muted)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '2px', 
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <User size={18} />
                      {activeTab === 'profile' && (
                        <div style={{ position: 'absolute', bottom: '-8px', width: '20px', height: '2.5px', background: 'var(--brand)', borderRadius: '1.5px' }} />
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* HOME INDICATOR OVERLAY */}
              <div style={{
                height: '14px',
                background: 'var(--bg-void)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: '99',
                paddingBottom: '2px'
              }}>
                <div 
                  onClick={() => {
                    if (currentScreen !== 'login') {
                      setCurrentScreen('tripDetail');
                      setActiveTab('trip');
                    }
                  }}
                  style={{ width: '100px', height: '4px', background: '#2c374e', borderRadius: '2px', cursor: 'pointer' }} 
                />
              </div>

            </div>

          </div>

        </div>

      </div>
      {/* Lightbox Modal overlay for zooming / inspecting receipt images */}
      {lightboxImage && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 11, 20, 0.95)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '6px 16px',
            zIndex: 10000
          }}>
            <button
              onClick={() => setLightboxZoom(prev => Math.min(5, prev + 0.25))}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', padding: '0 8px' }}
              title="Zoom In"
            >
              ＋
            </button>
            <button
              onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', padding: '0 8px' }}
              title="Zoom Out"
            >
              －
            </button>
            <button
              onClick={() => setLightboxZoom(1)}
              style={{ background: 'transparent', border: 'none', color: '#00f0ff', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', padding: '0 8px' }}
            >
              Reset
            </button>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 0' }} />
            <button
              onClick={() => setLightboxImage(null)}
              style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', padding: '0 8px' }}
            >
              Close
            </button>
          </div>

          {/* Zoomable Image Container */}
          <div style={{
            flex: 1,
            width: '100%',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'grab'
          }}>
            <img
              src={lightboxImage}
              alt="Receipt Preview Zoomed"
              style={{
                maxHeight: '90%',
                maxWidth: '90%',
                objectFit: 'contain',
                transform: `scale(${lightboxZoom})`,
                transition: 'transform 0.15s ease-out',
                transformOrigin: 'center center'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
