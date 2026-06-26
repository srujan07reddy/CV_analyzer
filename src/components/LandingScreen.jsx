import React, { useState } from 'react';
import { BookOpen, Shield, GraduationCap, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getStudent } from '../offline-storage/db';

export default function LandingScreen({ onManagementLogin, onStudentLogin }) {
  const [mode, setMode] = useState(null); // null | 'management' | 'student'
  const [rollNumber, setRollNumber] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!rollNumber.trim()) return setError('Please enter your Roll Number.');
    if (!dob.trim()) return setError('Please enter your Date of Birth.');
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dobRegex.test(dob)) return setError('Date of Birth must be in DD-MM-YYYY format.');

    setLoading(true);
    try {
      const student = await getStudent(rollNumber.toUpperCase().trim());
      if (!student) {
        setError('Roll number not found. Please contact your management office.');
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
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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

      {/* Portal Cards or Login Form */}
      {mode === null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', width: '100%', maxWidth: '680px' }}>
          {/* Management Card */}
          <button onClick={() => { setMode('management'); setError(''); }} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '20px',
            padding: '36px 28px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease',
            color: '#e2e8f0'
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.7)'; e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid rgba(139,92,246,0.3)' }}>
              <Shield size={26} color="#8b5cf6" />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#c4b5fd' }}>Management Portal</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>Faculty & admin access to manage student records, send messages, and analyze CVs.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6', fontSize: '13px', fontWeight: '600' }}>
              Enter Portal <ArrowRight size={14} />
            </div>
          </button>

          {/* Student Card */}
          <button onClick={() => { setMode('student'); setError(''); }} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(6,182,212,0.3)',
            borderRadius: '20px',
            padding: '36px 28px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s ease',
            color: '#e2e8f0'
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.7)'; e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(6,182,212,0.1))', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid rgba(6,182,212,0.3)' }}>
              <GraduationCap size={26} color="#06b6d4" />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#67e8f9' }}>Student Portal</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>View your profile, build or upload your resume, and receive messages from management.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontSize: '13px', fontWeight: '600' }}>
              Student Login <ArrowRight size={14} />
            </div>
          </button>
        </div>
      )}

      {/* Management — just a confirm button */}
      {mode === 'management' && (
        <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '36px' }}>
          <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#8b5cf6" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#c4b5fd' }}>Management Access</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Faculty & admin portal</p>
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
            You are about to enter the Management Portal. This area is for faculty and administrators only.
          </p>
          <button onClick={onManagementLogin} style={{
            width: '100%', padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.3px'
          }}>
            Continue to Management Portal
          </button>
        </div>
      )}

      {/* Student Login Form */}
      {mode === 'student' && (
        <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '20px', padding: '36px' }}>
          <button onClick={() => { setMode(null); setError(''); setRollNumber(''); setDob(''); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(6,182,212,0.1))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={20} color="#06b6d4" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#67e8f9' }}>Student Login</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Enter your credentials below</p>
            </div>
          </div>

          <form onSubmit={handleStudentLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Roll Number
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                placeholder="e.g. 22JUCS001"
                style={{
                  width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '1px'
                }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569' }}>Format: aaJUbbbccc (e.g. 22JUCS001)</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Date of Birth
              </label>
              <input
                type="text"
                value={dob}
                onChange={e => setDob(e.target.value)}
                placeholder="DD-MM-YYYY"
                maxLength={10}
                style={{
                  width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '1px'
                }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569' }}>Format: DD-MM-YYYY (e.g. 15-08-2003)</p>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px' }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '13px' }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', background: loading ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.3px', marginTop: '4px'
            }}>
              {loading ? 'Verifying...' : 'Login to Student Portal'}
            </button>
          </form>
        </div>
      )}

      <p style={{ marginTop: '40px', color: '#1e293b', fontSize: '12px' }}>
        Jeppiaar Shikshak © {new Date().getFullYear()}
      </p>
    </div>
  );
}
