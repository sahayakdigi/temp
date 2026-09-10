import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const router = express.Router();

// Route to analyze uploaded photos using Gemini API
router.post('/analyze-photo', async (req, res) => {
  const { image, contextType } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Extract pure base64 and mime type if it includes data URL prefix
  let mimeType = 'image/jpeg';
  let base64Data = image;

  if (image.startsWith('data:')) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_REAL_KEY_HERE' || apiKey === 'your_actual_gemini_api_key_here') {
    console.warn('⚠️ GEMINI_API_KEY is not defined or is placeholder. Returning offlineMock: true.');
    return res.json({
      offlineMock: true,
      ...getMockExtraction(contextType, base64Data)
    });
  }

  try {
    const prompt = `You are a logistics document processor. Analyze this image (which is a driver-uploaded document/photo) and extract its contents. 
Provide a structured JSON output with the following schema:
{
  "documentType": "receipt" | "odo" | "waybill" | "license_plate" | "unknown",
  "ocrText": "raw text extracted from the document",
  "legibilityScore": 0 to 100,
  "confidenceScore": 0 to 100,
  "extractedFields": {
    // If receipt/expense:
    "amount": 1250, // numeric value
    "merchant": "IOCL Service Station",
    "date": "YYYY-MM-DD",
    "expenseType": "Fuel" | "Toll" | "Maintenance" | "Parking" | "Other",
    
    // If odometer:
    "odometerValue": 124500, // numeric value
    
    // If license plate:
    "vehicleNumber": "DL1GC1234",
    
    // If waybill/LR/POD:
    "lrNumber": "LR-9081",
    "consignor": "Consignor Name",
    "consignee": "Consignee Name",
    "destination": "City Name"
  },
  "warnings": ["Warning 1", "Warning 2"] // e.g. "Blury text", "Amount field smudged", etc.
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const extractedData = JSON.parse(responseText);
    return res.json(extractedData);
  } catch (err) {
    console.error('Error in Gemini analysis route:', err);
    // If Gemini fails, fallback to mock to prevent breaking the flow
    return res.json({
      offlineMock: true,
      ...getMockExtraction(contextType, base64Data)
    });
  }
});

// Resilient fallback logic when API key is missing or fails
function getMockExtraction(contextType, base64Data) {
  // If the base64 string matches a known mock sample or based on contextType
  const dateStr = new Date().toISOString().split('T')[0];
  const typeNormalized = (contextType || 'expense').toLowerCase();

  if (typeNormalized === 'fuel') {
    return {
      documentType: 'receipt',
      ocrText: 'INDIAN OIL\nMETRO FUEL POINT\nRATE: Rs.103.82\nSale: Rs.3633.70\nVolume: 35.00L\nDATE: ' + dateStr,
      legibilityScore: 96,
      confidenceScore: 98,
      extractedFields: {
        amount: 3633.70,
        merchant: 'IndianOil (Metro Fuel Point)',
        date: dateStr,
        expenseType: 'Fuel',
        vehicleNumber: 'Not Entered'
      },
      warnings: []
    };
  } else if (typeNormalized === 'misc') {
    return {
      documentType: 'receipt',
      ocrText: 'STATE ELECTRICITY BOARD\nUTILITY BILL\nBILL DATE: ' + dateStr + '\nCONSUMPTION: 420 UNITS\nTOTAL AMOUNT DUE: Rs.4850.00\nSTATUS: UNPAID',
      legibilityScore: 94,
      confidenceScore: 95,
      extractedFields: {
        amount: 4850,
        merchant: 'State Electricity Board',
        date: dateStr,
        expenseType: 'Maintenance',
        vehicleNumber: ''
      },
      warnings: []
    };
  } else if (typeNormalized === 'toll') {
    return {
      documentType: 'receipt',
      ocrText: 'NHAI TOLL PLAZA\nFASTAG TRANSACTION\nPLAZA: L&T Tollway Plaza, Karur\nAMOUNT: Rs.350.00\nDATE: ' + dateStr,
      legibilityScore: 95,
      confidenceScore: 98,
      extractedFields: {
        amount: 350,
        merchant: 'L&T Tollway Plaza, Karur',
        date: dateStr,
        expenseType: 'Toll',
        vehicleNumber: ''
      },
      warnings: []
    };
  } else if (typeNormalized === 'batta') {
    return {
      documentType: 'receipt',
      ocrText: 'HIGHWAY DHABA & RESTAURANT\nFOOD INVOICE\nITEMS: Standard Meals x 4\nTOTAL AMOUNT: Rs.1200.00\nDATE: ' + dateStr,
      legibilityScore: 90,
      confidenceScore: 92,
      extractedFields: {
        amount: 1200,
        merchant: 'Highway Dhaba & Restaurant',
        date: dateStr,
        expenseType: 'Food',
        vehicleNumber: ''
      },
      warnings: []
    };
  } else if (typeNormalized === 'expense') {
    // Legacy fallback
    return {
      documentType: 'receipt',
      ocrText: 'INDIAN OIL CORP LTD\nFUEL INVOICE\nDATE: ' + dateStr + '\nQTY: 15.5L\nRATE: 96.50\nTOTAL: 1500.00\nVEHICLE: MH04GP4321\nTHANK YOU',
      legibilityScore: 92,
      confidenceScore: 95,
      extractedFields: {
        amount: 1500,
        merchant: 'Indian Oil Corp Ltd',
        date: dateStr,
        expenseType: 'Fuel',
        vehicleNumber: 'MH04GP4321'
      },
      warnings: []
    };
  } else if (contextType === 'waybill') {
    return {
      documentType: 'waybill',
      ocrText: 'CONSIGNMENT NOTE / WAYBILL\nLR NO: LR-1082\nCONSIGNOR: RELIANCE RETAIL LTD\nCONSIGNEE: SPAR HYPERMARKETS\nFROM: MUMBAI\nTO: BANGALORE\nITEMS: 45 BOXES ELECTRONICS\nSIGNATURE RECEIVED',
      legibilityScore: 88,
      confidenceScore: 90,
      extractedFields: {
        lrNumber: 'LR-1082',
        consignor: 'Reliance Retail Ltd',
        consignee: 'Spar Hypermarkets',
        destination: 'Bangalore'
      },
      warnings: []
    };
  } else if (contextType === 'odometer') {
    return {
      documentType: 'odo',
      ocrText: 'ODOMETER READING\nCURRENT KM: 87430 KM\nENGINE STATUS: OK',
      legibilityScore: 95,
      confidenceScore: 98,
      extractedFields: {
        odometerValue: 87430
      },
      warnings: []
    };
  } else {
    // Generic fallback
    return {
      documentType: 'unknown',
      ocrText: 'RAW DOCUMENT TEXT - AI EXTRACTED SUCCESSFULLY',
      legibilityScore: 80,
      confidenceScore: 85,
      extractedFields: {},
      warnings: ['Document type could not be classified automatically']
    };
  }
}

export default router;
