import pool from './db.js';

async function runMigration() {
  console.log('⏰ Starting database migrations...');
  try {
    // 1. Alter trucks table
    console.log('Altering trucks table...');
    await pool.query(`
      ALTER TABLE trucks 
      ADD COLUMN IF NOT EXISTS expiry_fc DATE,
      ADD COLUMN IF NOT EXISTS expiry_puc DATE,
      ADD COLUMN IF NOT EXISTS expiry_road_tax DATE,
      ADD COLUMN IF NOT EXISTS chassis_no VARCHAR,
      ADD COLUMN IF NOT EXISTS engine_no VARCHAR,
      ADD COLUMN IF NOT EXISTS fastag_id VARCHAR,
      ADD COLUMN IF NOT EXISTS fastag_balance NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gps_imei VARCHAR,
      ADD COLUMN IF NOT EXISTS current_odo INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fuel_efficiency NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS year_manufacture INTEGER DEFAULT 2020,
      ADD COLUMN IF NOT EXISTS fc_doc_url VARCHAR,
      ADD COLUMN IF NOT EXISTS puc_doc_url VARCHAR,
      ADD COLUMN IF NOT EXISTS road_tax_doc_url VARCHAR;
    `);

    // 2. Alter drivers table
    console.log('Altering drivers table...');
    await pool.query(`
      ALTER TABLE drivers 
      ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR,
      ADD COLUMN IF NOT EXISTS emergency_name VARCHAR,
      ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR,
      ADD COLUMN IF NOT EXISTS blood_group VARCHAR,
      ADD COLUMN IF NOT EXISTS bgv_status VARCHAR DEFAULT 'Pending',
      ADD COLUMN IF NOT EXISTS bank_acc_no VARCHAR,
      ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR,
      ADD COLUMN IF NOT EXISTS upi_id VARCHAR,
      ADD COLUMN IF NOT EXISTS pan_no VARCHAR,
      ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS preferred_routes VARCHAR,
      ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0,
      ADD COLUMN IF NOT EXISTS aadhaar_doc_url VARCHAR,
      ADD COLUMN IF NOT EXISTS pan_doc_url VARCHAR,
      ADD COLUMN IF NOT EXISTS licence_doc_url VARCHAR;
    `);

    console.log('🎉 Migrations successfully completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
