// ============================================================
//  TEMP — Mock User Credentials & Role Definitions
// ============================================================

export const USERS = [
  {
    id: 'USR-001',
    name: 'Arjun Mehta',
    email: 'admin@temp.in',
    password: 'admin123',
    role: 'Owner / Admin',
    branch: 'HO',
    branchLabel: 'Head Office',
    avatar: 'AM',
    designation: 'Managing Director',
    phone: '+91-98100-00001',
  },
  {
    id: 'USR-002',
    name: 'Priya Sharma',
    email: 'delhi.mgr@temp.in',
    password: 'pass123',
    role: 'Branch Manager',
    branch: 'DEL',
    branchLabel: 'Delhi Branch',
    avatar: 'PS',
    designation: 'Branch Manager – Delhi',
    phone: '+91-98100-00002',
  },
  {
    id: 'USR-003',
    name: 'Ravi Booking',
    email: 'booking@temp.in',
    password: 'pass123',
    role: 'Booking Agent',
    branch: 'DEL',
    branchLabel: 'Delhi Branch',
    avatar: 'RB',
    designation: 'Senior Booking Agent',
    phone: '+91-98100-00003',
  },
  {
    id: 'USR-004',
    name: 'Karan Hub',
    email: 'hub@temp.in',
    password: 'pass123',
    role: 'Hub / Operations',
    branch: 'BLR',
    branchLabel: 'Bangalore Hub',
    avatar: 'KH',
    designation: 'Hub Supervisor',
    phone: '+91-98100-00004',
  },
  {
    id: 'USR-005',
    name: 'Sunita Accounts',
    email: 'accounts@temp.in',
    password: 'pass123',
    role: 'Accountant',
    branch: 'HO',
    branchLabel: 'Head Office',
    avatar: 'SA',
    designation: 'Senior Accountant',
    phone: '+91-98100-00005',
  },
  {
    id: 'USR-006',
    name: 'Reliance Retail',
    email: 'client@relianceretail.in',
    password: 'client123',
    role: 'Client',
    branch: 'HO',
    branchLabel: 'Client Portal',
    avatar: 'RR',
    designation: 'Client – Consignor',
    phone: '+91-22-3300-0000',
  },
];

// What tabs each role can access
export const RBAC = {
  'Owner / Admin':    null, // null = full access to everything
  'Branch Manager':  ['dashboard', 'booking', 'manifest', 'warehouse', 'driver', 'ledger', 'settlement', 'fleet', 'enquiries'],
  'Booking Agent':   ['booking', 'client', 'enquiries'],
  'Hub / Operations':['manifest', 'warehouse'],
  'Accountant':      ['ledger', 'settlement', 'masters', 'fleet'],
  'Client':          ['client'],
};

// Role descriptions for display
export const ROLE_INFO = {
  'Owner / Admin':    { color: 'var(--brand-light)',    bg: 'var(--brand-glow)',          desc: 'Full system access' },
  'Branch Manager':  { color: 'var(--accent-info)',    bg: 'var(--accent-info-glow)',     desc: 'Operations & Finance' },
  'Booking Agent':   { color: 'var(--accent-success)', bg: 'var(--accent-success-glow)', desc: 'Booking & Client Portal' },
  'Hub / Operations':{ color: 'var(--accent-cyan)',    bg: 'var(--accent-cyan-glow)',     desc: 'Hub & Warehouse Ops' },
  'Accountant':      { color: 'var(--accent-violet)',  bg: 'var(--accent-violet-glow)',   desc: 'Finance & Ledger' },
  'Client':          { color: 'var(--accent-warning)', bg: 'var(--accent-warning-glow)', desc: 'Track & Trace only' },
};

export const authenticateUser = (email, password) => {
  const user = USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
  );
  return user || null;
};
