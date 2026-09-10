import pool from './db.js';

async function migrate() {
  console.log('⏰ Creating tenant_settings table...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR UNIQUE DEFAULT 'default_tenant',
        company_name VARCHAR NOT NULL,
        brand_name VARCHAR,
        gstin VARCHAR NOT NULL,
        pan VARCHAR,
        registered_address TEXT,
        primary_contact_name VARCHAR,
        primary_phone VARCHAR,
        support_email VARCHAR,
        website VARCHAR,
        logo_url VARCHAR,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Seed default settings for Chetak Roadways matching the reference screenshot
    await pool.query(`
      INSERT INTO tenant_settings (
        tenant_id, company_name, brand_name, gstin, pan, registered_address, 
        primary_contact_name, primary_phone, support_email, website, logo_url
      ) VALUES (
        'default_tenant', 
        'Chetak Roadways Pvt Ltd', 
        'Chetak Roadways', 
        '06AAABC1234D1ZE', 
        'AAABC1234D', 
        'Plot 14, Industrial Area, Gurgaon - 122001, Haryana', 
        'Pradeep Kumar', 
        '+91 98765 43210', 
        'support@chetakroad.com', 
        'https://yourcompany.com', 
        ''
      ) ON CONFLICT (tenant_id) DO NOTHING;
    `);

    console.log('🎉 tenant_settings table migrated & seeded successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
