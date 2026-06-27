import React, { useState, useEffect } from 'react';
import { getLLMConfig, saveLLMConfig, queryLLM } from '../utils/llm';
import { ShieldCheck, ShieldAlert, Cpu, Play, RefreshCw, Key, HelpCircle, UserCheck } from 'lucide-react';
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

    // Sample mock student data for testing the prompt context assembly
    const mockStudents = [
      { roll_number: 'xxJUyyyzzz', name: 'x', department: 'y', top_skills: 'Python, SQL', projects: 'AI Chatbot' }
    ];
    const mockOutreach = [];

    try {
      // Test message
      const response = await queryLLM(
        'Diagnose system connectivity. Respond with "Connection successful, Guru!" if you can see this message.', 
        mockStudents, 
        mockOutreach
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input 
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
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
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
            <label className="form-label">New Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="new_admin@jeppiaar.edu.in"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input 
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
    </div>
  );
}
