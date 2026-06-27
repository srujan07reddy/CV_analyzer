import React, { useState } from 'react';
import { UploadCloud, FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResumeBuilder({ student }) {
  const [activeTab, setActiveTab] = useState('build'); // 'build' | 'upload'
  
  // Upload State
  const [file, setFile] = useState(null);
  
  // Build State
  const [resumeData, setResumeData] = useState({
    name: student.name || '',
    email: student.email || '',
    phone: '',
    address: '',
    education: '',
    cgpa: '',
    skills: student.top_skills || '',
    projects: student.projects || '',
    achievements: ''
  });

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      // In a real app, this would upload to a server
      // For now we just simulate success locally
    }
  };

  const handleDownloadHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
  h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
  h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; }
  .contact-info { display: flex; gap: 20px; color: #7f8c8d; margin-bottom: 30px; font-size: 14px; }
  .section { margin-bottom: 30px; }
  .tag-container { display: flex; flex-wrap: wrap; gap: 10px; }
  .tag { background: #e0f2fe; color: #0284c7; padding: 5px 12px; border-radius: 15px; font-size: 14px; font-weight: bold; }
  .project-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 15px; }
  p { margin: 0 0 10px 0; }
</style>
</head>
<body>
  <h1>${resumeData.name}</h1>
  <div class="contact-info">
    ${resumeData.email ? `<span>Email: ${resumeData.email}</span>` : ''}
    ${resumeData.phone ? `<span>Phone: ${resumeData.phone}</span>` : ''}
    ${resumeData.address ? `<span>Address: ${resumeData.address}</span>` : ''}
  </div>

  <div class="section">
    <h2>Education</h2>
    <p><strong>Institution/Degree:</strong> ${resumeData.education}</p>
    <p><strong>CGPA/Grade:</strong> ${resumeData.cgpa}</p>
  </div>

  <div class="section">
    <h2>Skills</h2>
    <div class="tag-container">
      ${resumeData.skills.split(',').map(s => s.trim()).filter(s => s).map(s => `<span class="tag">${s}</span>`).join('')}
    </div>
  </div>

  <div class="section">
    <h2>Projects</h2>
    <div class="project-box">
      <p style="white-space: pre-wrap;">${resumeData.projects}</p>
    </div>
  </div>

  ${resumeData.achievements ? `
  <div class="section">
    <h2>Achievements & Certifications</h2>
    <p style="white-space: pre-wrap;">${resumeData.achievements}</p>
  </div>
  ` : ''}
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.roll_number}_Resume.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#e2e8f0' }}>Resume Center</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>Build a standard format resume or upload your own.</p>
        </div>
      </div>

      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '6px', marginBottom: '32px', maxWidth: '400px' }}>
        <button 
          onClick={() => setActiveTab('build')} 
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', background: activeTab === 'build' ? 'rgba(6,182,212,0.15)' : 'transparent', color: activeTab === 'build' ? '#67e8f9' : '#64748b' }}
        >
          <FileText size={16} /> Build Resume
        </button>
        <button 
          onClick={() => setActiveTab('upload')} 
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', background: activeTab === 'upload' ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeTab === 'upload' ? '#c4b5fd' : '#64748b' }}
        >
          <UploadCloud size={16} /> Upload Custom
        </button>
      </div>

      {activeTab === 'upload' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(139,92,246,0.4)', borderRadius: '16px', padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(139,92,246,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <UploadCloud size={32} color="#8b5cf6" />
          </div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#e2e8f0' }}>Upload your Resume PDF</h3>
          <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>Store your custom formatted resume for management to review.</p>
          
          <input type="file" id="resume-upload" accept=".pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
          <label htmlFor="resume-upload" style={{ display: 'inline-block', padding: '12px 24px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Select File
          </label>

          {file && (
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#34d399', fontSize: '14px', fontWeight: '500' }}>
              <CheckCircle size={18} /> {file.name} uploaded successfully.
            </div>
          )}
        </div>
      )}

      {activeTab === 'build' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '30px' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#67e8f9', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: '12px' }}>Personal Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div><label style={labelStyle}>Full Name</label><input value={resumeData.name} onChange={e => setResumeData({...resumeData, name: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Email Address</label><input value={resumeData.email} onChange={e => setResumeData({...resumeData, email: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Phone Number</label><input value={resumeData.phone} onChange={e => setResumeData({...resumeData, phone: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Address / City</label><input value={resumeData.address} onChange={e => setResumeData({...resumeData, address: e.target.value})} style={inputStyle} /></div>
            </div>

            <h3 style={{ margin: '32px 0 24px 0', fontSize: '18px', color: '#67e8f9', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: '12px' }}>Education</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div><label style={labelStyle}>Degree & Institution</label><input value={resumeData.education} onChange={e => setResumeData({...resumeData, education: e.target.value})} style={inputStyle} placeholder="e.g. B.Tech Computer Science, Jeppiaar..." /></div>
              <div><label style={labelStyle}>CGPA / Grade</label><input value={resumeData.cgpa} onChange={e => setResumeData({...resumeData, cgpa: e.target.value})} style={inputStyle} /></div>
            </div>

            <h3 style={{ margin: '32px 0 24px 0', fontSize: '18px', color: '#67e8f9', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: '12px' }}>Skills & Projects</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={labelStyle}>Skills (Comma Separated)</label><input value={resumeData.skills} onChange={e => setResumeData({...resumeData, skills: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Key Projects</label><textarea value={resumeData.projects} onChange={e => setResumeData({...resumeData, projects: e.target.value})} style={{...inputStyle, minHeight: '100px'}} /></div>
              <div><label style={labelStyle}>Achievements / Certifications</label><textarea value={resumeData.achievements} onChange={e => setResumeData({...resumeData, achievements: e.target.value})} style={{...inputStyle, minHeight: '80px'}} /></div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleDownloadHTML} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                <Download size={18} /> Download HTML Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
