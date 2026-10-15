import React, { useState } from 'react';
import { RBAC, ROLE_INFO } from './data/users';
import { api } from './services/api';
import { useEffect } from 'react';

// Import Screens
import LoginPage from './screens/LoginPage';
import Dashboard from './screens/Dashboard';
import Booking from './screens/Booking';
import HubManifest from './screens/HubManifest';
import DigitalLedger from './screens/DigitalLedger';
import BillingSettlement from './screens/BillingSettlement';
import WarehouseOps from './screens/WarehouseOps';
import FleetManagement from './screens/FleetManagement';
import Masters from './screens/Masters';
import SettingsScreen from './screens/Settings';

import {
  LayoutDashboard,
  FilePlus,
  Layers,
  Warehouse,
  Truck,
  Settings,
  Sliders,
  Compass,
  Briefcase,
  DollarSign,
  Package,
  Bell,
  LogOut,
  ShieldCheck,
  Smartphone,
  Info,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';

// ── Error Boundary ──────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', margin: '20px', background: 'var(--accent-danger-glow)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ color: 'var(--accent-danger)', marginBottom: '10px' }}>Component Error</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {this.state.error?.stack || this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Sidebar navigation sections ─────────────────────────────
const MENU_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard', label: 'Owner Cockpit',    icon: LayoutDashboard },
      { id: 'booking',   label: 'Unified Booking',  icon: FilePlus },
      { id: 'manifest',  label: 'Hub & Manifest',   icon: Layers },
      { id: 'warehouse', label: 'Warehouse Ops',    icon: Warehouse },
      { id: 'fleet',     label: 'Fleet Management', icon: Truck },
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'ledger',     label: 'Digital Ledger', icon: Briefcase },
      { id: 'settlement', label: 'Settlements',    icon: DollarSign },
    ]
  },
  {
    label: 'Portal',
    items: [
      { id: 'masters', label: 'Masters Config', icon: Sliders },
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Account Settings', icon: Settings },
    ]
  }
];

// ── Main App ────────────────────────────────────────────────
export default function App() {
  // ── Auth & Theme state ──
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme]             = useState(localStorage.getItem('temp-theme') || 'dark');

  // ── Data state ──
  const [lrs, setLrs]               = useState([]);
  const [trips, setTrips]           = useState([]);
  const [manifests, setManifests]   = useState([]);
  const [rates, setRates]           = useState([]);
  const [trucks, setTrucks]         = useState([]);
  const [drivers, setDrivers]       = useState([]);
  const [branches, setBranches]     = useState([]);
  const [parties, setParties]       = useState([]);
  const [vehicleOwners, setVehicleOwners] = useState([]);

  // ── Notification State ──
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Booking', message: 'LR-2026-004 generated for Reliance Retail — ₹45,000', time: '10 mins ago', type: 'info', read: false },
    { id: 2, title: 'Trip Dispatched', message: 'MH-12-Q-4567 left Delhi Hub for Mumbai Warehouse', time: '1 hr ago', type: 'success', read: false },
    { id: 3, title: 'Settlement Completed', message: 'Fuel advance of ₹15,000 paid to driver Rajesh Kumar', time: '3 hrs ago', type: 'success', read: true },
    { id: 4, title: 'Pending POD', message: 'Lorry Receipt LR-2026-002 has been delivered. Physical POD pending.', time: '1 day ago', type: 'warning', read: true },
  ]);

  const markAllNotifsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markNotifAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotif = (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ── Responsive Mobile Menu State ──
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowNotifDropdown(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    api.getLRs().then(setLrs).catch(err => console.error('Failed to load LRs:', err));
    api.getTrucks().then(setTrucks).catch(err => console.error('Failed to load Trucks:', err));
    api.getDrivers().then(setDrivers).catch(err => console.error('Failed to load Drivers:', err));
    api.getBranches().then(setBranches).catch(err => console.error('Failed to load Branches:', err));
    api.getParties().then(setParties).catch(err => console.error('Failed to load Parties:', err));
    api.getVehicleOwners().then(setVehicleOwners).catch(err => console.error('Failed to load Vehicle Owners:', err));
    api.getTrips().then(setTrips).catch(err => console.error('Failed to load Trips:', err));
    api.getManifests().then(setManifests).catch(err => console.error('Failed to load Manifests:', err));
    api.getRates().then(setRates).catch(err => console.error('Failed to load Rates:', err));

    // Load saved theme mode (Dark vs Light)
    const savedTheme = localStorage.getItem('temp-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }

    // Load saved accent color from localStorage
    const savedAccent = localStorage.getItem('temp-accent');
    if (savedAccent) {
      const accentsMap = {
        'sky-blue': { color: 'hsl(200, 95%, 55%)', deep: 'hsl(210, 90%, 46%)', light: 'hsl(195, 95%, 68%)', glow: 'hsla(200, 95%, 55%, 0.14)' },
        'ocean-cobalt': { color: 'hsl(218, 92%, 58%)', deep: 'hsl(220, 90%, 48%)', light: 'hsl(215, 90%, 68%)', glow: 'hsla(218, 92%, 58%, 0.14)' },
        'cyan-teal': { color: 'hsl(185, 90%, 50%)', deep: 'hsl(188, 85%, 40%)', light: 'hsl(180, 90%, 65%)', glow: 'hsla(185, 90%, 50%, 0.14)' },
        emerald: { color: 'hsl(152, 72%, 48%)', deep: 'hsl(152, 80%, 40%)', light: 'hsl(152, 65%, 58%)', glow: 'hsla(152, 72%, 48%, 0.14)' },
        // Fallbacks
        saffron: { color: 'hsl(200, 95%, 55%)', deep: 'hsl(210, 90%, 46%)', light: 'hsl(195, 95%, 68%)', glow: 'hsla(200, 95%, 55%, 0.14)' },
        cobalt: { color: 'hsl(218, 92%, 58%)', deep: 'hsl(220, 90%, 48%)', light: 'hsl(215, 90%, 68%)', glow: 'hsla(218, 92%, 58%, 0.14)' }
      };
      const selected = accentsMap[savedAccent];
      if (selected) {
        const root = document.documentElement;
        root.style.setProperty('--brand', selected.color);
        root.style.setProperty('--brand-deep', selected.deep);
        root.style.setProperty('--brand-light', selected.light);
        root.style.setProperty('--brand-glow', selected.glow);
        root.style.setProperty('--border-glow', `${selected.color}60`);
      }
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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.bell-btn-container')) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // ── Tab state — default to first allowed tab for user's role ──
  const getDefaultTab = (user) => {
    const allowed = RBAC[user.role];
    if (!allowed) return 'dashboard';        // Admin — start at cockpit
    if (allowed.includes('client') && allowed.length === 1) return 'client'; // Client-only
    return allowed[0];
  };

  const [currentTab, setCurrentTab] = useState('dashboard');

  // ── Auth handlers ──
  const handleLogin = (user) => {
    if (user.role !== 'Hub / Operations' && user.role !== 'Owner / Admin') {
      alert('Access Denied: This portal is restricted to Hub & Operations staff.');
      return;
    }
    setCurrentUser(user);
    setCurrentTab(getDefaultTab(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  // ── RBAC tab visibility ──
  const isTabVisible = (tabId) => {
    if (!currentUser) return false;
    if (tabId === 'settings') return true; // Settings is always visible for everyone
    const allowed = RBAC[currentUser.role];
    return allowed === null || (allowed && allowed.includes(tabId));
  };

  // ── Show login if not authenticated ──
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const roleInfo = ROLE_INFO[currentUser.role] || {};

  // ── Screen renderer ──
  const renderScreen = () => {
    switch (currentTab) {
      case 'dashboard':   return <Dashboard trips={trips} lrs={lrs} manifests={manifests} userRole={currentUser.role} activeBranch={currentUser.branch} branches={branches} setBranches={setBranches} onNavigate={setCurrentTab} />;
      case 'booking':     return <Booking lrs={lrs} setLrs={setLrs} trips={trips} setTrips={setTrips} parties={parties} rateCards={rates} trucks={trucks} drivers={drivers} />;
      case 'manifest':    return <HubManifest lrs={lrs} setLrs={setLrs} manifests={manifests} setManifests={setManifests} trucks={trucks} drivers={drivers} currentUser={currentUser} branches={branches} parties={parties} />;
      case 'ledger':      return <DigitalLedger trips={trips} setTrips={setTrips} lrs={lrs} setLrs={setLrs} manifests={manifests} branches={branches} />;
      case 'settlement':  return <ErrorBoundary><BillingSettlement lrs={lrs} setLrs={setLrs} trips={trips} setTrips={setTrips} vehicleOwners={vehicleOwners} trucks={trucks} parties={parties} /></ErrorBoundary>;
      case 'warehouse':   return <WarehouseOps lrs={lrs} setLrs={setLrs} branches={branches} onNavigate={setCurrentTab} />;
      case 'fleet':       return <FleetManagement trucks={trucks} setTrucks={setTrucks} drivers={drivers} setDrivers={setDrivers} />;
      case 'masters':     return <Masters branches={branches} setBranches={setBranches} parties={parties} setParties={setParties} rateCards={rates} vehicleOwners={vehicleOwners} setVehicleOwners={setVehicleOwners} lrs={lrs} />;
      case 'settings':    return <SettingsScreen currentUser={currentUser} onUserUpdate={(updated) => setCurrentUser(updated)} />;
      default:            return <Dashboard trips={trips} lrs={lrs} manifests={manifests} userRole={currentUser.role} activeBranch={currentUser.branch} branches={branches} setBranches={setBranches} onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="app-grid">

      {/* Mobile Backdrop Overlay */}
      <div 
        className={`sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>

        {/* Brand */}
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-logo">
              <Package size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="sidebar-brand-name">TEMP</div>
              <div className="sidebar-brand-tagline">Unified Fleet Ops</div>
            </div>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Navigation Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation — only show tabs the user can access */}
        <nav className="sidebar-nav">
          {MENU_SECTIONS.map(section => {
            const visibleItems = section.items.filter(item => isTabVisible(item.id));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="sidebar-section-label">{section.label}</div>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const active = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`sidebar-item ${active ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <span className="nav-icon">
                        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-avatar">
            {currentUser.avatar}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '0.68rem', color: roleInfo.color || 'var(--text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: roleInfo.color || 'var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
              {currentUser.role}
            </div>
          </div>
          {/* Logout */}
          <button
            title="Sign out"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
              transition: 'var(--t-fast)',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-danger-glow)'; e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.borderColor = 'hsla(4,86%,62%,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* Top Header */}
        <header className="topbar">

          {/* Left: Mobile menu toggle + Active workspace indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>

            <div className="topbar-badge">
              <span className="topbar-badge-text">{currentUser.branchLabel} — {currentUser.branch}</span>
              <span className="topbar-badge-short">{currentUser.branch}</span>
            </div>
          </div>

          {/* Right: User info & controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

            {/* Role badge */}
            <div className="topbar-role-badge" style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '5px 12px',
              background: roleInfo.bg || 'var(--bg-elevated)',
              border: `1px solid ${roleInfo.color || 'var(--border-subtle)'}30`,
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.75rem', fontWeight: '600',
              color: roleInfo.color || 'var(--text-secondary)',
            }}>
              <ShieldCheck size={13} />
              <span>{currentUser.role}</span>
            </div>

            <div className="topbar-divider" style={{ width: '1px', height: '26px', background: 'var(--border-subtle)' }} />

            {/* User pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: '700', color: '#fff',
                boxShadow: '0 0 0 2px hsla(205, 90%, 55%,0.25)',
                flexShrink: 0,
              }}>
                {currentUser.avatar}
              </div>
              <div className="topbar-user-text" style={{ lineHeight: '1.25' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{currentUser.branch} Branch</div>
              </div>
            </div>

            <div className="topbar-divider" style={{ width: '1px', height: '26px', background: 'var(--border-subtle)' }} />

            {/* Theme Toggle Button (Light/Dark Mode) */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light (White) Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Color Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} style={{ color: 'var(--brand-light)' }} />
                  <span className="theme-toggle-text" style={{ fontSize: '0.78rem', fontWeight: '600' }}>Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} style={{ color: 'var(--accent-info)' }} />
                  <span className="theme-toggle-text" style={{ fontSize: '0.78rem', fontWeight: '600' }}>Dark</span>
                </>
              )}
            </button>

            {/* Bell Alerts */}
            <div className="bell-btn-container" style={{ position: 'relative' }}>
              <button 
                className="btn-ghost" 
                style={{ padding: '6px 10px', position: 'relative', display: 'flex', alignItems: 'center' }}
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                title="System Notifications"
              >
                <Bell size={16} />
                {notifications.some(n => !n.read) && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      top: '5px', 
                      right: '5px', 
                      width: '6px', 
                      height: '6px', 
                      background: 'var(--accent-danger)', 
                      borderRadius: '50%', 
                      boxShadow: '0 0 5px var(--accent-danger)',
                      animation: 'pulse-dot 2s ease infinite'
                    }} 
                  />
                )}
              </button>

              {/* Notifications Dropdown (Popover) */}
              {showNotifDropdown && (
                <div 
                  className="glass-panel notif-dropdown" 
                  style={{
                    position: 'absolute',
                    top: '36px',
                    right: '0',
                    width: '320px',
                    zIndex: 999,
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>System Notifications</span>
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={markAllNotifsAsRead}
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: 'var(--brand-light)', 
                          fontSize: '0.7rem', 
                          fontWeight: '600', 
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          transition: 'var(--t-fast)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        No system notifications.
                      </div>
                    ) : (
                      notifications.map(n => {
                        const IconComponent = n.type === 'success' ? CheckCircle : n.type === 'warning' ? AlertTriangle : Info;
                        const iconColor = n.type === 'success' ? 'var(--accent-success)' : n.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-info)';
                        
                        return (
                          <div 
                            key={n.id}
                            onClick={() => markNotifAsRead(n.id)}
                            style={{
                              display: 'flex',
                              gap: '10px',
                              padding: '10px',
                              borderRadius: 'var(--radius-sm)',
                              background: n.read ? 'transparent' : 'var(--bg-elevated)',
                              border: `1px solid ${n.read ? 'transparent' : 'var(--border-subtle)'}`,
                              cursor: 'pointer',
                              transition: 'var(--t-fast)',
                              opacity: n.read ? 0.6 : 1,
                              position: 'relative'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'var(--bg-float)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = n.read ? 'transparent' : 'var(--bg-elevated)';
                            }}
                          >
                            <span style={{ color: iconColor, marginTop: '2px', flexShrink: 0 }}>
                              <IconComponent size={14} />
                            </span>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.76rem', fontWeight: n.read ? '600' : '700', color: 'var(--text-primary)' }}>
                                  {n.title}
                                </span>
                                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{n.time}</span>
                              </div>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineBreak: 'anywhere', lineHeight: '1.3' }}>
                                {n.message}
                              </p>
                            </div>

                            <button 
                              onClick={(e) => deleteNotif(e, n.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                alignSelf: 'flex-start',
                                marginTop: '-2px',
                                marginRight: '-4px',
                                borderRadius: 'var(--radius-xs)'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.background = 'var(--accent-danger-glow)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                              title="Dismiss"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button className="btn-ghost" style={{ padding: '6px 10px', color: 'var(--text-muted)' }} onClick={handleLogout} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Screen */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderScreen()}
        </div>

      </main>
    </div>
  );
}
