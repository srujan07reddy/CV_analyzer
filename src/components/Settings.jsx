import React, { useState, useEffect } from 'react';
import { getLLMConfig, saveLLMConfig, queryLLM, callGemini } from '../utils/llm';
import { ShieldCheck, ShieldAlert, Cpu, Play, RefreshCw, Key, HelpCircle, UserCheck, Users, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const [config, setConfig] = useState({
    apiKey: '',
    enabled: false
  });

  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testResult, setTestResult] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Auth Update State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authUpdateStatus, setAuthUpdateStatus] = useState(''); // '', 'loading', 'success', 'error'
  const [authUpdateMessage, setAuthUpdateMessage] = useState('');

  // Management Members State
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberForm, setMemberForm] = useState({ id: '', name: '', email: '', role: 'Coordinator', contact_info: '' });
  const [isEditingMember, setIsEditingMember] = useState(false);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('management_members')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch management members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      alert('Guru garu, name and email are required.');
      return;
    }
    try {
      if (memberForm.id) {
        const { error } = await supabase
          .from('management_members')
          .update({
            name: memberForm.name.trim(),
            email: memberForm.email.trim(),
            role: memberForm.role,
            contact_info: memberForm.contact_info.trim()
          })
          .eq('id', memberForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('management_members')
          .insert({
            name: memberForm.name.trim(),
            email: memberForm.email.trim(),
            role: memberForm.role,
            contact_info: memberForm.contact_info.trim()
          });
        if (error) throw error;
      }
      setMemberForm({ id: '', name: '', email: '', role: 'Coordinator', contact_info: '' });
      setIsEditingMember(false);
      fetchMembers();
    } catch (err) {
      alert(`Error saving member: ${err.message}`);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Guru garu, are you sure you want to remove this management member?')) return;
    try {
      const { error } = await supabase
        .from('management_members')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchMembers();
    } catch (err) {
      alert(`Error deleting member: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleUpdateAuth = async (e) => {
    e.preventDefault();
    if (!newEmail && !newPassword) {
      setAuthUpdateStatus('error');
      setAuthUpdateMessage('Please enter a new email or new password.');
      return;
    }
    setAuthUpdateStatus('loading');
    try {
      const updates = {};
      if (newEmail) updates.email = newEmail;
      if (newPassword) updates.password = newPassword;
      
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      setAuthUpdateStatus('success');
      setAuthUpdateMessage('Credentials updated successfully!');
      setNewEmail('');
      setNewPassword('');
    } catch (err) {
      setAuthUpdateStatus('error');
      setAuthUpdateMessage(err.message);
    }
  };

  // Load config on mount
  useEffect(() => {
    const loaded = getLLMConfig();
    setConfig({
      apiKey: loaded.apiKey,
      enabled: loaded.enabled
    });
  }, []);

  const handleChange = (field, value) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    saveLLMConfig(updated);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestResult('');

    try {
      const currentConfig = getLLMConfig();
      // Call Gemini directly with the typed API Key, bypassing config.enabled check
      const response = await callGemini(
        config.apiKey,
        currentConfig.endpoint,
        currentConfig.model,
        currentConfig.systemPrompt,
        'Diagnose system connectivity. Respond with "Connection successful, Guru!" if you can see this message.'
      );
      setTestStatus('success');
      setTestResult(response);
    } catch (err) {
      setTestStatus('error');
      setTestResult(err.message || 'Unknown connection error occurred.');
    }
  };

  return (
    <div className="tab-content">
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu style={{ color: 'var(--color-primary)' }} />
          Gemini AI Integration Settings
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Guru garu, configure your Gemini API key below. This connects Shishya to Google's reasoning engines to run advanced student analytics reports and natural language chat interfaces.
        </p>

        {/* Enabled Checkbox Switch */}
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label htmlFor="enable-ai-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input 
              id="enable-ai-checkbox"
              name="enable-ai-checkbox"
              type="checkbox" 
              checked={config.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontWeight: '600', fontSize: '15px' }}>Enable Gemini AI Capabilities</span>
          </label>
        </div>

        {config.enabled && (
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
            
            {/* API Key */}
            <div className="form-group">
              <label htmlFor="gemini-api-key" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gemini API Key</span>
                <span 
                  style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '12px' }}
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? 'Hide Key' : 'Reveal Key'}
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="gemini-api-key"
                  name="gemini-api-key"
                  type={showKey ? 'text' : 'password'} 
                  className="form-control" 
                  placeholder="AIzaSy..."
                  value={config.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <Key size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Integration Tips */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)', marginBottom: '8px' }}>
                <HelpCircle size={14} /> Integration Instructions
              </strong>
              <ul style={{ marginLeft: '16px', listStyleType: 'disc', color: 'var(--text-secondary)' }}>
                <li>Get a Gemini API Key from Google AI Studio.</li>
                <li>API calls are performed client-side safely from your browser.</li>
              </ul>
            </div>

            {/* Test Connection Panel */}
            <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '600' }}>Handshake Diagnostics</span>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  {testStatus === 'testing' ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Testing...
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Run Handshake Test
                    </>
                  )}
                </button>
              </div>

              {testStatus === 'success' && (
                <div style={{ display: 'flex', gap: '8px', color: 'var(--color-success)', background: 'rgba(16,185,129,0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Connection successful:</strong> {testResult}
                  </div>
                </div>
              )}

              {testStatus === 'error' && (
                <div style={{ display: 'flex', gap: '8px', color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Handshake failed:</strong>
                    <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '12px' }}>{testResult}</div>
                  </div>
                </div>
              )}

              {testStatus === 'idle' && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                  Ready to test connection with Gemini API.
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Account Security Settings */}
      <div className="glass-card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserCheck style={{ color: 'var(--color-primary)' }} />
          Admin Account Security
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Update your management login credentials. Leave a field blank if you do not wish to change it.
        </p>

        <form onSubmit={handleUpdateAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="new-admin-email" className="form-label">New Email Address</label>
            <input 
              id="new-admin-email"
              name="new-admin-email"
              type="email" 
              className="form-control" 
              placeholder="new_admin@jeppiaar.edu.in"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-admin-password" className="form-label">New Password</label>
            <input 
              id="new-admin-password"
              name="new-admin-password"
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          {authUpdateStatus === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', background: 'rgba(16,185,129,0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <ShieldCheck size={16} />
              {authUpdateMessage}
            </div>
          )}

          {authUpdateStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <ShieldAlert size={16} />
              {authUpdateMessage}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={authUpdateStatus === 'loading'}
            style={{ width: 'fit-content' }}
          >
            {authUpdateStatus === 'loading' ? 'Updating...' : 'Update Credentials'}
          </button>
        </form>
      </div>

      {/* Management Members Roster */}
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users style={{ color: 'var(--color-primary)' }} />
          Management Members Directory
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Add or edit authorized administrators, heads, and coordinators who have administrative access to the platform.
        </p>

        {/* Member Form */}
        <form onSubmit={handleSaveMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
          <div className="form-group">
            <label htmlFor="member-name" className="form-label">Full Name</label>
            <input 
              id="member-name"
              name="member-name"
              type="text" 
              className="form-control" 
              placeholder="e.g. Dr. Kishore" 
              value={memberForm.name} 
              onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} 
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="member-email" className="form-label">Email Address</label>
            <input 
              id="member-email"
              name="member-email"
              type="email" 
              className="form-control" 
              placeholder="e.g. kishore@jeppiaar.edu.in" 
              value={memberForm.email} 
              onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} 
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="member-role" className="form-label">Role</label>
            <select 
              id="member-role"
              name="member-role"
              className="form-control" 
              value={memberForm.role} 
              onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
            >
              <option value="Administrator">Administrator</option>
              <option value="Department Head">Department Head</option>
              <option value="Coordinator">Coordinator</option>
              <option value="Facilitator Lead">Facilitator Lead</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="member-contact" className="form-label">Contact number</label>
            <input 
              id="member-contact"
              name="member-contact"
              type="text" 
              className="form-control" 
              placeholder="e.g. 9876543210" 
              value={memberForm.contact_info} 
              onChange={e => setMemberForm({ ...memberForm, contact_info: e.target.value })} 
            />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
            {isEditingMember && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setMemberForm({ id: '', name: '', email: '', role: 'Coordinator', contact_info: '' });
                  setIsEditingMember(false);
                }}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary">
              {isEditingMember ? 'Update Member' : 'Add New Member'}
            </button>
          </div>
        </form>

        {/* Member Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>Name</th>
                <th style={{ padding: '10px 8px' }}>Email</th>
                <th style={{ padding: '10px 8px' }}>Role</th>
                <th style={{ padding: '10px 8px' }}>Contact</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '600' }}>{member.name}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{member.email}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: member.role === 'Administrator' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                      color: member.role === 'Administrator' ? 'var(--color-error)' : 'var(--color-primary)',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{member.contact_info || 'N/A'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => {
                        setMemberForm({ id: member.id, name: member.name, email: member.email, role: member.role, contact_info: member.contact_info || '' });
                        setIsEditingMember(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center' }}
                      title="Edit Member"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(member.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center' }}
                      title="Delete Member"
                      disabled={member.email === 'admin@jeppiaar.edu.in'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loadingMembers ? 'Loading directory...' : 'No management members registered.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
