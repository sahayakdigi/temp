import pool from './db.js';

async function migrate() {
  try {
    console.log('Running broker fields migration...');
    await pool.query(`
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS pan VARCHAR(50);
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 5.0;
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS broker_type VARCHAR(50) DEFAULT 'Booking Agent';
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS parent_broker_id VARCHAR(50);
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS sub_split_pct NUMERIC DEFAULT 30;
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS tds_section VARCHAR(50) DEFAULT '194C (2%)';
      ALTER TABLE parties ADD COLUMN IF NOT EXISTS tds_rate NUMERIC DEFAULT 2.0;

      ALTER TABLE lrs ADD COLUMN IF NOT EXISTS broker_id VARCHAR(50);
      ALTER TABLE lrs ADD COLUMN IF NOT EXISTS broker_name VARCHAR(100);
      ALTER TABLE lrs ADD COLUMN IF NOT EXISTS broker_commission NUMERIC DEFAULT 0;
      ALTER TABLE lrs ADD COLUMN IF NOT EXISTS broker_commission_type VARCHAR(20) DEFAULT 'percent';
      ALTER TABLE lrs ADD COLUMN IF NOT EXISTS broker_commission_rate NUMERIC DEFAULT 0;
    `);

    // Insert sample initial brokers if they don't exist
    const brokerCheck = await pool.query("SELECT COUNT(*) FROM parties WHERE type = 'broker'");
    if (parseInt(brokerCheck.rows[0].count) === 0) {
      console.log('Seeding initial brokers...');
      await pool.query(`
        INSERT INTO parties (id, name, type, phone, pan, gstin, commission_rate, broker_type, tds_section, tds_rate, address)
        VALUES ('BRK-01', 'National Booking Agency', 'broker', '9810012345', 'AAABN1234K', '27AAABN1234K1Z5', 5.0, 'Booking Agent', '194C (2%)', 2.0, 'Transport Nagar, Delhi')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO parties (id, name, type, phone, pan, gstin, commission_rate, broker_type, parent_broker_id, sub_split_pct, tds_section, tds_rate, address)
        VALUES ('BRK-02', 'Mumbai Local Broker', 'broker', '9820054321', 'AABBM5678L', '27AABBM5678L1Z8', 5.0, 'Commission Agent', 'BRK-01', 30.0, '194C (2%)', 2.0, 'Vashi APMC Market, Navi Mumbai')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    console.log('Broker fields migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
