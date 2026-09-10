import React, { useState, useEffect } from 'react';
import { User, Shield, Sliders, Bell, Cpu, Save, Lock, CheckCircle, AlertTriangle, Monitor, Globe, MessageSquare, Building, Upload } from 'lucide-react';
import { api } from '../services/api';
import { auth } from '../firebase';
import { updateEmail, updatePassword } from 'firebase/auth';

const ACCENTS = [
  { id: 'saffron', label: 'Saffron Orange (Default)', color: 'hsl(35, 95%, 55%)', deep: 'hsl(28, 92%, 48%)', light: 'hsl(40, 95%, 62%)', glow: 'hsla(35, 95%, 55%, 0.1)' },
  { id: 'emerald', label: 'Emerald Green', color: 'hsl(152, 72%, 48%)', deep: 'hsl(152, 80%, 40%)', light: 'hsl(152, 65%, 58%)', glow: 'hsla(152, 72%, 48%, 0.1)' },
  { id: 'cobalt', label: 'Cobalt Blue', color: 'hsl(220, 95%, 60%)', deep: 'hsl(220, 90%, 50%)', light: 'hsl(220, 85%, 68%)', glow: 'hsla(220, 95%, 60%, 0.1)' }
];

export default function Settings({ currentUser, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('company');
  
  // Tenant Settings Form State
  const [tenantSettings, setTenantSettings] = useState({
    company_name: '',
    brand_name: '',
    gstin: '',
    pan: '',
    registered_address: '',
    primary_contact_name: '',
    primary_phone: '',
    support_email: '',
    website: '',
    logo_url: ''
  });

  useEffect(() => {
    const fetchTenantSettings = async () => {
      try {
        const data = await api.getTenantSettings();
        if (data) {
          setTenantSettings({
            company_name: data.company_name || '',
            brand_name: data.brand_name || '',
            gstin: data.gstin || '',
            pan: data.pan || '',
            registered_address: data.registered_address || '',
            primary_contact_name: data.primary_contact_name || '',
            primary_phone: data.primary_phone || '',
            support_email: data.support_email || '',
            website: data.website || '',
            logo_url: data.logo_url || ''
          });
        }
      } catch (err) {
        console.error('Failed to fetch tenant settings:', err);
      }
    };
    fetchTenantSettings();
  }, []);

  const handleTenantSettingsSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.updateTenantSettings(tenantSettings);
      if (res) {
        setSuccessMsg('Company profile details updated successfully.');
      } else {
        setErrorMsg('Failed to update company settings.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while saving company profile.');
    } finally {
      setLoading(false);
    }
  };

  // Profile Form state
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  
  // Security Form state
  const [email, setEmail] = useState(currentUser?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preference states (stored in LocalStorage)
  const [accent, setAccent] = useState(localStorage.getItem('temp-accent') || 'saffron');
  const [units, setUnits] = useState(localStorage.getItem('temp-units') || 'metric');
  const [timezone, setTimezone] = useState(localStorage.getItem('temp-timezone') || 'IST');
  
  // Notification states
  const [notifyManifest, setNotifyManifest] = useState(localStorage.getItem('temp-notif-manifest') !== 'false');
  const [notifyLedger, setNotifyLedger] = useState(localStorage.getItem('temp-notif-ledger') !== 'false');
  const [notifyOtp, setNotifyOtp] = useState(localStorage.getItem('temp-notif-otp') !== 'false');

  // Status message states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Session Time Tracker
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    // Increment session timer every second
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Feedback & Support states
  const [feedbackType, setFeedbackType] = useState('Feature Request');
  const [feedbackPriority, setFeedbackPriority] = useState('Medium');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (activeTab === 'feedback' && currentUser?.id) {
      loadFeedback();
    }
  }, [activeTab, currentUser?.id]);

  const loadFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const data = await api.getFeedback(currentUser.id);
      setFeedbackList(data || []);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      setErrorMsg('Please fill in both subject and message.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await api.submitFeedback({
        userId: currentUser.id,
        userName: currentUser.name,
        type: feedbackType,
        priority: feedbackPriority,
        subject: feedbackSubject.trim(),
        message: feedbackMessage.trim()
      });
      setSuccessMsg('Thank you! Your feedback has been submitted successfully.');
      setFeedbackSubject('');
      setFeedbackMessage('');
      loadFeedback(); // Refresh list
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  const formatSessionTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Set Theme Accents dynamically in browser
  const applyAccent = (accentId) => {
    const selected = ACCENTS.find(a => a.id === accentId) || ACCENTS[0];
    const root = document.documentElement;
    root.style.setProperty('--brand', selected.color);
    root.style.setProperty('--brand-deep', selected.deep);
    root.style.setProperty('--brand-light', selected.light);
    root.style.setProperty('--brand-glow', selected.glow);
    root.style.setProperty('--border-glow', `${selected.color}60`);
    
    localStorage.setItem('temp-accent', accentId);
    setAccent(accentId);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.updateSettings({
        userId: currentUser.id,
        name,
        phone
      });

      if (res && res.user) {
        onUserUpdate(res.user);
        setSuccessMsg('Profile details updated successfully.');
      } else {
        setErrorMsg('Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setLoading(true);

    try {
      // 1. Synchronize changes to Firebase Authentication
      const fbUser = auth.currentUser;
      if (fbUser) {
        if (email && email.toLowerCase().trim() !== fbUser.email?.toLowerCase()) {
          await updateEmail(fbUser, email.toLowerCase().trim());
        }
        if (newPassword) {
          await updatePassword(fbUser, newPassword);
        }
      }

      // 2. Update PostgreSQL database profile
      const payload = {
        userId: currentUser.id,
        email
      };

      if (newPassword) {
        payload.oldPassword = oldPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.updateSettings(payload);

      if (res && res.user) {
        onUserUpdate(res.user);
        setSuccessMsg('Security credentials updated successfully.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg('Failed to update security credentials.');
      }
    } catch (err) {
      console.error('Security Update Error:', err);
      let errMsg = err.message || 'Error occurred while updating security.';
      if (err.code === 'auth/requires-recent-login') {
        errMsg = 'This operation is sensitive and requires recent authentication. Please log out and log in again before retrying.';
      }
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = () => {
    localStorage.setItem('temp-units', units);
    localStorage.setItem('temp-timezone', timezone);
    localStorage.setItem('temp-notif-manifest', notifyManifest);
    localStorage.setItem('temp-notif-ledger', notifyLedger);
    localStorage.setItem('temp-notif-otp', notifyOtp);

    setSuccessMsg('System preferences and defaults updated successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Account Settings
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Manage your personal credentials, customize the theme accent, and configure display preferences.
        </p>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px 16px', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px 16px', fontSize: '0.875rem' }}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Navigation Tabs (Vertical Sidebar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button 
            onClick={() => { setActiveTab('company'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: activeTab === 'company' ? 'var(--brand-glow)' : 'transparent',
              border: '1px solid ' + (activeTab === 'company' ? 'var(--brand)' : 'transparent'),
              color: activeTab === 'company' ? 'var(--brand-light)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === 'company' ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--t-fast)'
            }}
          >
            <Building size={16} /> Company Profile
          </button>

          <button 
            onClick={() => { setActiveTab('profile'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: activeTab === 'profile' ? 'var(--brand-glow)' : 'transparent',
              border: '1px solid ' + (activeTab === 'profile' ? 'var(--brand)' : 'transparent'),
              color: activeTab === 'profile' ? 'var(--brand-light)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === 'profile' ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--t-fast)'
            }}
          >
            <User size={16} /> Personal Profile
          </button>
          
          <button 
            onClick={() => { setActiveTab('security'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: activeTab === 'security' ? 'var(--brand-glow)' : 'transparent',
              border: '1px solid ' + (activeTab === 'security' ? 'var(--brand)' : 'transparent'),
              color: activeTab === 'security' ? 'var(--brand-light)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === 'security' ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--t-fast)'
            }}
          >
            <Shield size={16} /> Security Credentials
          </button>

          <button 
            onClick={() => { setActiveTab('preferences'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: activeTab === 'preferences' ? 'var(--brand-glow)' : 'transparent',
              border: '1px solid ' + (activeTab === 'preferences' ? 'var(--brand)' : 'transparent'),
              color: activeTab === 'preferences' ? 'var(--brand-light)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === 'preferences' ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--t-fast)'
            }}
          >
            <Sliders size={16} /> System Preferences
          </button>

          <button 
            onClick={() => { setActiveTab('feedback'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: activeTab === 'feedback' ? 'var(--brand-glow)' : 'transparent',
              border: '1px solid ' + (activeTab === 'feedback' ? 'var(--brand)' : 'transparent'),
              color: activeTab === 'feedback' ? 'var(--brand-light)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', fontWeight: activeTab === 'feedback' ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--t-fast)'
            }}
          >
            <MessageSquare size={16} /> Feedback & Support
          </button>
        </div>

        {/* Tab Contents */}
        <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
          
          {/* Company Profile (Multi-tenant settings) */}
          {activeTab === 'company' && (
            <form onSubmit={handleTenantSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>Company Identity</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>This information will appear on invoices, LRs, and client communications.</p>
              </div>

              {/* Logo Upload Reference Area */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '20px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: 'var(--text-muted)'
                }}>
                  <Upload size={20} style={{ marginBottom: '4px' }} />
                  <span style={{ fontSize: '0.65rem' }}>Logo</span>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {tenantSettings.brand_name || 'Upload Logo'}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Upload a square PNG or JPG (min 200×200px)
                  </p>
                  <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px' }}>
                    <Upload size={12} /> Upload Logo
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="label-premium">Company Name *</label>
                  <input
                    type="text"
                    required
                    className="input-premium"
                    value={tenantSettings.company_name}
                    onChange={e => setTenantSettings({ ...tenantSettings, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-premium">Brand / Trade Name</label>
                  <input
                    type="text"
                    className="input-premium"
                    value={tenantSettings.brand_name}
                    onChange={e => setTenantSettings({ ...tenantSettings, brand_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="label-premium">GSTIN *</label>
                  <input
                    type="text"
                    required
                    className="input-premium"
                    value={tenantSettings.gstin}
                    onChange={e => setTenantSettings({ ...tenantSettings, gstin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-premium">PAN</label>
                  <input
                    type="text"
                    className="input-premium"
                    value={tenantSettings.pan}
                    onChange={e => setTenantSettings({ ...tenantSettings, pan: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label-premium">Registered Address</label>
                <textarea
                  rows={3}
                  className="input-premium"
                  style={{ resize: 'vertical', fontFamily: 'inherit', padding: '10px 12px' }}
                  value={tenantSettings.registered_address}
                  onChange={e => setTenantSettings({ ...tenantSettings, registered_address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="label-premium">Primary Contact Name</label>
                  <input
                    type="text"
                    className="input-premium"
                    value={tenantSettings.primary_contact_name}
                    onChange={e => setTenantSettings({ ...tenantSettings, primary_contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-premium">Primary Phone</label>
                  <input
                    type="text"
                    className="input-premium"
                    value={tenantSettings.primary_phone}
                    onChange={e => setTenantSettings({ ...tenantSettings, primary_phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="label-premium">Support Email</label>
                  <input
                    type="email"
                    className="input-premium"
                    value={tenantSettings.support_email}
                    onChange={e => setTenantSettings({ ...tenantSettings, support_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-premium">Website</label>
                  <input
                    type="text"
                    className="input-premium"
                    value={tenantSettings.website}
                    onChange={e => setTenantSettings({ ...tenantSettings, website: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ gap: '8px' }}>
                  <Save size={15} /> {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          {/* 1. PERSONAL PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>Personal Profile</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Update your name and primary contact number.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="label-premium">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="input-premium" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="label-premium">Phone Number</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="+91 XXXXX XXXXX" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <label className="label-premium" style={{ opacity: 0.6 }}>Assigned Role</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--brand-light)' }}>{currentUser?.role}</div>
                </div>
                <div>
                  <label className="label-premium" style={{ opacity: 0.6 }}>Base Branch</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{currentUser?.branchLabel} ({currentUser?.branch})</div>
                </div>
                <div>
                  <label className="label-premium" style={{ opacity: 0.6 }}>Designation</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{currentUser?.designation || 'Staff'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ gap: '8px' }}>
                  <Save size={15} /> {loading ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          )}

          {/* 2. SECURITY CREDENTIALS */}
          {activeTab === 'security' && (
            <form onSubmit={handleSecuritySave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>Security & Credentials</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Modify your login email and set a new password.</p>
              </div>

              <div>
                <label className="label-premium">Login Email Address</label>
                <input 
                  type="email" 
                  required 
                  className="input-premium" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingDoc: '20px', margin: '10px 0 0' }} />

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px' }}>Update Password (Optional)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="label-premium">Current Password</label>
                    <input 
                      type="password" 
                      className="input-premium" 
                      placeholder="Enter current password to authorize changes"
                      value={oldPassword} 
                      onChange={e => setOldPassword(e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label className="label-premium">New Password</label>
                      <input 
                        type="password" 
                        className="input-premium" 
                        placeholder="Min 6 characters"
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="label-premium">Confirm New Password</label>
                      <input 
                        type="password" 
                        className="input-premium" 
                        placeholder="Re-enter new password"
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ gap: '8px' }}>
                  <Lock size={15} /> {loading ? 'Updating...' : 'Update Credentials'}
                </button>
              </div>
            </form>
          )}

          {/* 3. SYSTEM PREFERENCES */}
          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>System Preferences</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Customize theme palettes, units, and system notifications.</p>
              </div>

              {/* Accent Color Customization */}
              <div>
                <label className="label-premium">Theme Accent Color</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '8px' }}>
                  {ACCENTS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => applyAccent(item.id)}
                      style={{
                        padding: '14px',
                        background: 'var(--bg-primary)',
                        border: `1px solid ${accent === item.id ? item.color : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        transition: 'var(--t-fast)',
                        boxShadow: accent === item.id ? `0 0 10px ${item.color}25` : 'none'
                      }}
                    >
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: item.color, border: '2px solid rgba(255,255,255,0.1)' }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: accent === item.id ? '600' : '500', color: accent === item.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {item.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Localisation & Metric Systems */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <div>
                  <label className="label-premium">Unit System</label>
                  <select className="input-premium" value={units} onChange={e => setUnits(e.target.value)}>
                    <option value="metric">Metric (Kilometers, Kilograms)</option>
                    <option value="imperial">Imperial (Miles, Pounds)</option>
                  </select>
                </div>
                <div>
                  <label className="label-premium">Timezone Alignment</label>
                  <select className="input-premium" value={timezone} onChange={e => setTimezone(e.target.value)}>
                    <option value="IST">IST (India Standard Time - GMT+5:30)</option>
                    <option value="UTC">UTC (Coordinated Universal Time - GMT+0)</option>
                  </select>
                </div>
              </div>

              {/* Notification Preferences */}
              <div style={{ marginTop: '10px' }}>
                <label className="label-premium" style={{ marginBottom: '12px' }}>System Alert Subscriptions</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyManifest} onChange={e => setNotifyManifest(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                    Get manifest dispatch alerts & hub arrival notifications
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyLedger} onChange={e => setNotifyLedger(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                    Subscribe to billing settlements and payment status updates
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyOtp} onChange={e => setNotifyOtp(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                    Prompt notifications for driver OTP verification requests
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                <button onClick={handlePreferencesSave} className="btn-primary" style={{ gap: '8px' }}>
                  <Save size={15} /> Save Preference Config
                </button>
              </div>
            </div>
          )}

          {/* 4. FEEDBACK & SUPPORT */}
          {activeTab === 'feedback' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>Feedback & Support</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Help us improve! Send us your ideas, feature requests, or report issues directly.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '32px', alignItems: 'flex-start' }}>
                {/* Submission Form */}
                <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label className="label-premium">Feedback Category</label>
                    <select 
                      className="input-premium" 
                      value={feedbackType} 
                      onChange={e => setFeedbackType(e.target.value)}
                    >
                      <option value="Feature Request">💡 Feature Request</option>
                      <option value="Bug Report">🐛 Bug / Issue Report</option>
                      <option value="General Support">📞 General Support</option>
                      <option value="Other">❓ Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-premium">Priority / Urgency</label>
                    <select 
                      className="input-premium" 
                      value={feedbackPriority} 
                      onChange={e => setFeedbackPriority(e.target.value)}
                    >
                      <option value="Low">🟢 Low</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="High">🔴 High</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-premium">Subject</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Add quick search for vehicle registration numbers" 
                      className="input-premium"
                      value={feedbackSubject}
                      onChange={e => setFeedbackSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label-premium">Message / Description</label>
                    <textarea 
                      required
                      rows={5}
                      placeholder="Explain in detail what you want or describe the issue..." 
                      className="input-premium"
                      style={{ resize: 'vertical', fontFamily: 'inherit', padding: '10px 12px' }}
                      value={feedbackMessage}
                      onChange={e => setFeedbackMessage(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ gap: '8px', width: '100%', justifyContent: 'center' }}>
                      <MessageSquare size={15} /> {loading ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                </form>

                {/* History List */}
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '32px', minHeight: '300px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>My Support Tickets & Requests</span>
                    <span className="badge-muted" style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: 'var(--radius-pill)' }}>
                      {feedbackList.length}
                    </span>
                  </h4>

                  {loadingFeedback ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Loading feedback history...
                    </div>
                  ) : feedbackList.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                        No feedback submitted yet. Your requests and issues will appear here.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
                      {feedbackList.map((fb) => {
                        // Badge classes mapping
                        const categoryBadges = {
                          'Feature Request': 'badge-brand',
                          'Bug Report': 'badge-danger',
                          'General Support': 'badge-blue',
                          'Other': 'badge-muted'
                        };
                        const priorityBadges = {
                          'High': 'badge-warning',
                          'Medium': 'badge-cyan',
                          'Low': 'badge-muted'
                        };
                        const statusBadges = {
                          'Submitted': 'badge-blue',
                          'Under Review': 'badge-warning',
                          'Planned': 'badge-violet',
                          'Completed': 'badge-success'
                        };

                        const formattedDate = fb.createdAt
                          ? new Date(fb.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recent';

                        return (
                          <div 
                            key={fb.id} 
                            style={{ 
                              background: 'var(--bg-primary)', 
                              border: '1px solid var(--border-subtle)', 
                              borderRadius: 'var(--radius-md)', 
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                {fb.subject}
                              </span>
                              <span className={statusBadges[fb.status] || 'badge-blue'} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                {fb.status}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                              {fb.message}
                            </p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                              <span className={categoryBadges[fb.type] || 'badge-muted'} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                {fb.type}
                              </span>
                              <span className={priorityBadges[fb.priority] || 'badge-muted'} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                {fb.priority}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Dynamic Telemetry Info Box */}
      <div className="glass-panel" style={{ marginTop: '32px', padding: '20px 24px', borderRadius: 'var(--radius-lg)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Cpu size={20} style={{ color: 'var(--brand-light)' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>System Session</div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>{formatSessionTime(sessionTime)}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Monitor size={18} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Browser Platform</div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>Chrome Engine</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={18} style={{ color: 'var(--accent-info)' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Terminal IP</div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>103.45.210.12</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={18} style={{ color: 'var(--accent-success)' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Geolocation Node</div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>New Delhi, India</div>
          </div>
        </div>
      </div>

    </div>
  );
}
