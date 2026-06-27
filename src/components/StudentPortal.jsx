import React, { useState } from 'react';
import { User, FileText, MessageSquare, LogOut, BookOpen } from 'lucide-react';
import StudentProfile from './student/StudentProfile';
import ResumeBuilder from './student/ResumeBuilder';
import StudentMessages from './student/StudentMessages';

export default function StudentPortal({ student, onLogout, onStudentUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');

  if (!student) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0e1a', color: '#e2e8f0' }}>
        Loading student profile...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Student Portal
          </h1>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            onClick={() => setActiveTab('profile')} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeTab === 'profile' ? 'rgba(6,182,212,0.1)' : 'transparent', color: activeTab === 'profile' ? '#67e8f9' : '#94a3b8', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', textAlign: 'left' }}
          >
            <User size={18} /> My Profile
          </button>
          
          <button 
            onClick={() => setActiveTab('resume')} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeTab === 'resume' ? 'rgba(6,182,212,0.1)' : 'transparent', color: activeTab === 'resume' ? '#67e8f9' : '#94a3b8', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', textAlign: 'left' }}
          >
            <FileText size={18} /> Resume Builder
          </button>
          
          <button 
            onClick={() => setActiveTab('messages')} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: activeTab === 'messages' ? 'rgba(6,182,212,0.1)' : 'transparent', color: activeTab === 'messages' ? '#67e8f9' : '#94a3b8', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', textAlign: 'left' }}
          >
            <MessageSquare size={18} /> Messages
          </button>
        </nav>

        <button 
          onClick={onLogout} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {activeTab === 'profile' && <StudentProfile student={student} onStudentUpdate={onStudentUpdate} />}
          {activeTab === 'resume' && <ResumeBuilder student={student} />}
          {activeTab === 'messages' && <StudentMessages rollNumber={student.roll_number} />}
        </div>
      </main>
    </div>
  );
}
