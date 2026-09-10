import pool from './db.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// ── Users to seed ────────────────────────────────────────────
const USERS = [
  {
    name: 'Arjun Mehta',
    email: 'admin@temp.in',
    password: 'admin123',
    role: 'Owner / Admin',
    branch: 'HO',
    branch_label: 'Head Office',
    avatar: 'AM',
    designation: 'Managing Director',
    phone: '+91-98100-00001',
  },
  {
    name: 'Priya Sharma',
    email: 'delhi.mgr@temp.in',
    password: 'pass123',
    role: 'Branch Manager',
    branch: 'DEL',
    branch_label: 'Delhi Branch',
    avatar: 'PS',
    designation: 'Branch Manager – Delhi',
    phone: '+91-98100-00002',
  },
  {
    name: 'Ravi Booking',
    email: 'booking@temp.in',
    password: 'pass123',
    role: 'Booking Agent',
    branch: 'DEL',
    branch_label: 'Delhi Branch',
    avatar: 'RB',
    designation: 'Senior Booking Agent',
    phone: '+91-98100-00003',
  },
  {
    name: 'Karan Hub',
    email: 'hub@temp.in',
    password: 'pass123',
    role: 'Hub / Operations',
    branch: 'BLR',
    branch_label: 'Bangalore Hub',
    avatar: 'KH',
    designation: 'Hub Supervisor',
    phone: '+91-98100-00004',
  },
  {
    name: 'Sunita Accounts',
    email: 'accounts@temp.in',
    password: 'pass123',
    role: 'Accountant',
    branch: 'HO',
    branch_label: 'Head Office',
    avatar: 'SA',
    designation: 'Senior Accountant',
    phone: '+91-98100-00005',
  },
  {
    name: 'Reliance Retail',
    email: 'client@relianceretail.in',
    password: 'client123',
    role: 'Client',
    branch: 'HO',
    branch_label: 'Client Portal',
    avatar: 'RR',
    designation: 'Client – Consignor',
    phone: '+91-22-3300-0000',
  },
];

async function seedUsers() {
  try {
    // Create the users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL,
        branch        TEXT NOT NULL DEFAULT 'HO',
        branch_label  TEXT NOT NULL DEFAULT 'Head Office',
        avatar        TEXT,
        designation   TEXT,
        phone         TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ users table ready');

    // Upsert each user (update password if exists so re-running is safe)
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, branch, branch_label, avatar, designation, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO UPDATE
           SET name          = EXCLUDED.name,
               password_hash = EXCLUDED.password_hash,
               role          = EXCLUDED.role,
               branch        = EXCLUDED.branch,
               branch_label  = EXCLUDED.branch_label,
               avatar        = EXCLUDED.avatar,
               designation   = EXCLUDED.designation,
               phone         = EXCLUDED.phone`,
        [u.name, u.email, hash, u.role, u.branch, u.branch_label, u.avatar, u.designation, u.phone]
      );
      console.log(`  ✓ Upserted: ${u.email} (${u.role})`);
    }

    console.log('\n🌱 Users seeded successfully!');
    console.log('\nCredentials:');
    USERS.forEach(u => console.log(`  ${u.role.padEnd(22)} ${u.email.padEnd(32)} password: ${u.password}`));

  } catch (err) {
    console.error('❌ Error seeding users:', err.message);
  } finally {
    pool.end();
  }
}

seedUsers();
