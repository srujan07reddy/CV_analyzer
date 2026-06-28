import React, { useState } from 'react';
import { BookOpen, Shield, GraduationCap, AlertCircle, Key, User, Eye, EyeOff } from 'lucide-react';
import { getStudent } from '../offline-storage/db';
import { supabase } from '../supabaseClient';

export default function LandingScreen({ onManagementLogin, onStudentLogin }) {
  const [role, setRole] = useState('student'); // 'student' | 'management'
  
  // Student Auth State
  const [rollNumber, setRollNumber] = useState('');
  const [dob, setDob] = useState('');
  
  // Management Auth State
  const [adminUser, setAdminUser] = useState(''); // Will now be email
  const [adminPass, setAdminPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (role === 'management') {
      if (!adminUser.trim() || !adminPass.trim()) {
        return setError('Please enter both email and password.');
      }
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: adminUser.trim(),
          password: adminPass
        });
        
        if (error) throw error;
        
        if (data?.session) {
          localStorage.setItem('sdc_admin_local_session', 'true');
          localStorage.setItem('sdc_logged_in_email', data.session.user.email);
          onManagementLogin();
        } else {
          setError('Invalid management credentials.');
        }
      } catch (err) {
        // Fallback to local admin credentials if Supabase auth fails (e.g. rate limit, offline, pepper mismatch)
        const fallbackEmail = localStorage.getItem('sdc_admin_fallback_email') || 'admin@jeppiaar.edu.in';
        const fallbackPassword = localStorage.getItem('sdc_admin_fallback_password') || 'AdminPassword123';
        if (adminUser.trim() === fallbackEmail && adminPass === fallbackPassword) {
          console.log('[Auth Fallback] Authenticated via local credentials.');
          localStorage.setItem('sdc_admin_local_session', 'true');
          localStorage.setItem('sdc_logged_in_email', fallbackEmail);
          onManagementLogin();
        } else {
          const msg = typeof err === 'string' ? err : (err && err.message) ? err.message : 'Login failed. Please try again.';
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Student Login Logic
    if (!rollNumber.trim()) return setError('Please enter your Roll Number.');
    if (!dob.trim()) return setError('Please enter your Date of Birth.');
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dobRegex.test(dob)) return setError('Date of Birth must be in DD-MM-YYYY format.');

    setLoading(true);
    try {
      const student = await getStudent(rollNumber.toUpperCase().trim());
      if (!student) {
        setError('Roll number not found. Please contact management.');
        setLoading(false);
        return;
      }
      if (!student.dob) {
        setError('Your account does not have a Date of Birth set. Contact management.');
        setLoading(false);
        return;
      }
      if (student.dob.trim() !== dob.trim()) {
        setError('Incorrect Date of Birth. Please try again.');
        setLoading(false);
        return;
      }
      onStudentLogin(student);
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1526 50%, #0a0e1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={26} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Jeppiaar Shikshak
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Student Development & Analytics Platform</p>
      </div>

      {/* Unified Login Card */}
      <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '36px', zIndex: 10, backdropFilter: 'blur(10px)' }}>
        
        {/* Role Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '6px', marginBottom: '32px' }}>
          <button 
            type="button"
            onClick={() => { setRole('student'); setError(''); }} 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease',
              background: role === 'student' ? 'rgba(6,182,212,0.15)' : 'transparent',
              color: role === 'student' ? '#67e8f9' : '#64748b',
            }}
          >
            <GraduationCap size={16} /> Student
          </button>
          <button 
            type="button"
            onClick={() => { setRole('management'); setError(''); }} 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease',
              background: role === 'management' ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: role === 'management' ? '#c4b5fd' : '#64748b',
            }}
          >
            <Shield size={16} /> Management
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {role === 'student' ? (
            <>
              <div>
                <label htmlFor="student-roll-number" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Roll Number
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="student-roll-number"
                    name="student-roll-number"
                    type="text"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    placeholder="e.g. 22JUCS001"
                    style={{ width: '100%', padding: '14px 14px 14px 42px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '12px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569' }}>Format: aaJUbbbccc</p>
              </div>

              <div>
                <label htmlFor="student-dob" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Date of Birth
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="student-dob"
                    name="student-dob"
                    type="text"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    maxLength={10}
                    style={{ width: '100%', padding: '14px 14px 14px 42px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '12px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569' }}>Format: DD-MM-YYYY</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="management-email" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="management-email"
                    name="management-email"
                    type="text"
                    value={adminUser}
                    onChange={e => setAdminUser(e.target.value)}
                    placeholder="admin@jeppiaar.edu.in"
                    style={{ width: '100%', padding: '14px 14px 14px 42px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="management-password" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="management-password"
                    name="management-password"
                    type={showPassword ? 'text' : 'password'}
                    value={adminPass}
                    onChange={e => setAdminPass(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '14px 46px 14px 42px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: showPassword ? 'sans-serif' : 'monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: '#64748b'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px' }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, color: '#fca5a5', fontSize: '13px' }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', 
            background: loading ? 'rgba(255,255,255,0.1)' : (role === 'student' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'), 
            border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.3px', marginTop: '8px',
            transition: 'background 0.3s ease'
          }}>
            {loading ? 'Authenticating...' : `Login as ${role === 'student' ? 'Student' : 'Management'}`}
          </button>
        </form>
      </div>

      <p style={{ marginTop: '40px', color: '#1e293b', fontSize: '12px', zIndex: 10 }}>
        Jeppiaar Shikshak © {new Date().getFullYear()}
      </p>
    </div>
  );
}
