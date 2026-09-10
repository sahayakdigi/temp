import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { onRequest } from 'firebase-functions/v2/https';
import branchesRouter from './routes/branches.js';
import vehicleOwnersRouter from './routes/vehicleOwners.js';
import trucksRouter from './routes/trucks.js';
import driversRouter from './routes/drivers.js';
import partiesRouter from './routes/parties.js';
import lrsRouter from './routes/lrs.js';
import authRouter from './routes/auth.js';
import feedbackRouter from './routes/feedback.js';
import ratesRouter from './routes/rates.js';
import manifestsRouter from './routes/manifests.js';
import tripsRouter from './routes/trips.js';
import warehouseRouter from './routes/warehouse.js';
import glossaryRouter from './routes/glossary.js';
import tenantSettingsRouter from './routes/tenantSettings.js';
import clientAuthRouter from './routes/clientAuth.js';
import aiRouter from './routes/ai.js';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/branches', branchesRouter);
app.use('/api/vehicle-owners', vehicleOwnersRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/parties', partiesRouter);
app.use('/api/lrs', lrsRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth', clientAuthRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/manifests', manifestsRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/glossary', glossaryRouter);
app.use('/api/tenant-settings', tenantSettingsRouter);
app.use('/api/ai', aiRouter);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

if (!process.env.FUNCTION_TARGET) {
  app.listen(PORT, () => {
    console.log(`🚀 Temp backend API running on http://localhost:${PORT}`);
  });
}

export const api = onRequest({ cors: true }, app);
