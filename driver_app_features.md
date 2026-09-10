# Driver App: Features & Capabilities Document

This document outlines the **Primary** and **Secondary** features of the Driver Application, highlighting how each capability supports a driver's day-to-day workflow.

---

## 1. Primary Features (Core Driver Workflows)

These features constitute the essential delivery operations, from authentication to concluding the journey.

### 🔐 1.1 Driver Authentication (OTP Login)
*   **OTP Verification**: Simple phone number entry with secure OTP verification (configured to `123456` for the demo).
*   **Automatic Profile Binding**: Upon successful login, the app fetches the driver's details and automatically loads their currently assigned active trip.

### 🗺️ 1.2 Trip Cockpit & Journey Workflow
*   **Odometer Start Validation**: Requires the driver to type the starting odometer reading and capture/upload a photo of the vehicle dashboard before starting the trip.
*   **Active Journey Progress**: Real-time progress bar tracking total distance covered (e.g., *1,140 km covered / 1,420 km*).
*   **Odometer End Validation**: At the end of the trip, the driver enters the final odometer value (validated to ensure it is higher than the starting value) and uploads a closing dashboard photo.

### 📋 1.3 Pre/Post-Delivery Checklist & ePOD (Electronic Proof of Delivery)
To ensure compliance, the driver is guided through a sequential 4-step checklist:
1.  **Vehicle Inspection**: Self-certification of vehicle roadworthiness.
2.  **Client Signature (ePOD)**: Captures the receiver’s name and drawing signature directly on the screen's canvas.
3.  **Upload Waybill Photo**: Snaps and uploads physical consignment notes/waybills.
4.  **Cargo Verification**: Final confirmation of cargo status at the delivery destination.

### 💸 1.4 Expense Logging with AI OCR
*   **Multi-Category Logging**: Log expenses for *Fuel*, *Toll*, *Batta (driver allowance)*, and *Misc*.
*   **Document OCR Extraction**: Uses Gemini AI (backend) and browser-side Tesseract.js as a fallback to scan receipts. It automatically parses:
    *   Merchant / Fuel station name
    *   Total transaction amount
    *   Expense category
*   **AI Compliance Guardrails**: Automatically highlights risks (e.g., amount exceeding limits or mismatched invoice details) to minimize approval delays.

---

## 2. Secondary Features (Behind-the-Scenes & Developer Utilities)

These features run in the background to handle bad network connectivity or simulate live operation.

### 📶 2.1 Offline "Shadow Zone" Mode & Auto-Sync
*   **Local SQLite Buffer**: When the driver enters a low-signal area (manually triggerable via "Shadow Zone" switch), all actions—such as starting a trip, logging expenses, or submitting signatures—are queued in an in-memory SQLite buffer.
*   **Automatic Syncing**: As soon as the network connection is restored, a background worker automatically sends the buffered transactions to the backend database.

### 🔋 2.2 On-Duty & GPS Telemetry Management
*   **Privacy & Battery Toggle**: An "On-Duty" toggle that controls active GPS telemetry. When switched "Off-Duty", active tracking is disabled to respect driver privacy and save phone battery.
*   **Simulated Pings**: During transit, the app pings simulated location coordinates (NH-44 Highway), speed, heading, and battery levels to the dispatcher dashboard.

### 🔍 2.3 Simulated Owner/Manager Approvals
*   **Mock Verification Board**: Simulates the dispatcher's viewpoint directly inside the app, showing pending approvals for:
    *   Odometer start/end readings
    *   Expense claims (including flagged risks or fraud checks)
    *   ePOD signatures
*   Allows the developer/tester to approve or reject items to simulate workflow responses.

### 🛠️ 2.4 Developer & Simulation Console
*   **Live SQL Telemetry Logs**: Displays actual location points and device telemetry data being generated.
*   **Simulator Panel**: Controls to toggle vehicle movement, battery drain, network status, and sqlite buffer inspection.
*   **Interactive Image Lightbox**: Includes pinch, zoom-in, zoom-out, and reset tools to inspect receipt and ePOD photo quality.
