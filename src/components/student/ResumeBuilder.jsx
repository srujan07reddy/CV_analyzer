import React, { useState, useMemo } from 'react';
import { UploadCloud, FileText, Download, CheckCircle, Eye, RefreshCw } from 'lucide-react';

export default function ResumeBuilder({ student }) {
  const [activeTab, setActiveTab] = useState('build'); // 'build' | 'upload'
  const [theme, setTheme] = useState('glass'); // 'glass' | 'terminal' | 'pearl'
  const [file, setFile] = useState(null);
  
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
    }
  };

  // HTML templates based on selected theme
  const generatedHTML = useMemo(() => {
    const skillsArray = resumeData.skills.split(',').map(s => s.trim()).filter(Boolean);
    const projectsArray = resumeData.projects.split('\n').filter(Boolean);

    if (theme === 'terminal') {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${resumeData.name} - Terminal Resume</title>
  <style>
    body {
      background-color: #0d1117;
      color: #39ff14;
      font-family: 'Courier New', Courier, monospace;
      padding: 30px;
      line-height: 1.5;
    }
    .terminal {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #1f242c;
      background: #090d13;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,255,0,0.05);
    }
    .header { border-bottom: 2px dashed #39ff14; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; color: #fff; margin: 0; }
    .prompt { color: #8b5cf6; }
    .command { color: #06b6d4; font-weight: bold; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 18px; text-transform: uppercase; color: #fff; border-bottom: 1px solid #1f242c; padding-bottom: 4px; margin-bottom: 12px; }
    .tag { display: inline-block; background: #132d15; border: 1px solid #39ff14; color: #39ff14; padding: 4px 10px; border-radius: 4px; margin: 0 6px 6px 0; font-size: 12px; }
    .project { background: rgba(255,255,255,0.01); border-left: 3px solid #39ff14; padding: 10px 15px; margin-bottom: 10px; }
    a { color: #00ffff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="header">
      <span class="prompt">guest@jeppiaar:~#</span> <span class="command">cat info.json</span>
      <div class="title">${resumeData.name}</div>
      <div>[Email]: ${resumeData.email || 'N/A'} | [Phone]: ${resumeData.phone || 'N/A'}</div>
      <div>[Address]: ${resumeData.address || 'N/A'}</div>
    </div>

    <div class="section">
      <span class="prompt">guest@jeppiaar:~#</span> <span class="command">sysctl get education</span>
      <div class="section-title">Education System Status</div>
      <div><strong>Degree:</strong> ${resumeData.education || 'N/A'}</div>
      <div><strong>CGPA:</strong> ${resumeData.cgpa || 'N/A'}</div>
    </div>

    <div class="section">
      <span class="prompt">guest@jeppiaar:~#</span> <span class="command">ls /bin/skills</span>
      <div class="section-title">Extracted Skills Binary Directory</div>
      <div style="margin-top: 10px;">
        ${skillsArray.length > 0 ? skillsArray.map(s => `<span class="tag">${s}</span>`).join('') : 'No skills listed.'}
      </div>
    </div>

    <div class="section">
      <span class="prompt">guest@jeppiaar:~#</span> <span class="command">docker ps --projects</span>
      <div class="section-title">Active Engineering Projects</div>
      <div style="margin-top: 10px;">
        ${projectsArray.length > 0 ? projectsArray.map(p => `
          <div class="project">
            <span style="color: #fff;">&gt; ${p}</span>
          </div>
        `).join('') : 'No projects listed.'}
      </div>
    </div>

    ${resumeData.achievements ? `
    <div class="section">
      <span class="prompt">guest@jeppiaar:~#</span> <span class="command">grep -r "achievements"</span>
      <div class="section-title">Achievements & Certifications</div>
      <pre style="color: #cbd5e1; white-space: pre-wrap; font-family: inherit;">${resumeData.achievements}</pre>
    </div>
    ` : ''}
  </div>
</body>
</html>
      `;
    }

    if (theme === 'pearl') {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${resumeData.name} - Professional Pearl Resume</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: #faf9f6;
      color: #333333;
      font-family: 'Montserrat', sans-serif;
      padding: 50px 30px;
      line-height: 1.7;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 50px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      border-top: 4px solid #c2a278;
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      color: #1a1a1a;
      margin: 0 0 10px 0;
      letter-spacing: 0.5px;
    }
    .subtitle {
      font-family: 'Montserrat', sans-serif;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 2px;
      color: #c2a278;
      margin-bottom: 24px;
      font-weight: 600;
    }
    .contact-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 13px;
      color: #666;
      border-bottom: 1px solid #eaeaea;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 35px;
    }
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
      border-bottom: 1px solid #c2a278;
      padding-bottom: 6px;
      margin-bottom: 16px;
      text-transform: capitalize;
    }
    .skill-tag {
      display: inline-block;
      border: 1px solid #c2a278;
      color: #8c6d43;
      background: rgba(194, 162, 120, 0.05);
      padding: 6px 14px;
      border-radius: 2px;
      margin: 0 8px 8px 0;
      font-size: 12px;
      font-weight: 500;
    }
    .project-item {
      margin-bottom: 16px;
      padding-left: 12px;
      border-left: 2px solid #eaeaea;
    }
    .project-text {
      color: #4a4a4a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${resumeData.name}</h1>
    <div class="subtitle">E-Portfolio & Facilitation Manifest</div>
    
    <div class="contact-bar">
      ${resumeData.email ? `<div><strong>Email:</strong> ${resumeData.email}</div>` : ''}
      ${resumeData.phone ? `<div><strong>Phone:</strong> ${resumeData.phone}</div>` : ''}
      ${resumeData.address ? `<div><strong>Location:</strong> ${resumeData.address}</div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Education</div>
      <div style="font-size: 14px;">
        <p style="margin: 0;"><strong>${resumeData.education || 'Current Degree Program'}</strong></p>
        ${resumeData.cgpa ? `<p style="margin: 4px 0 0 0; color: #666;">CGPA: ${resumeData.cgpa}</p>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Technical Expertise</div>
      <div style="margin-top: 10px;">
        ${skillsArray.length > 0 ? skillsArray.map(s => `<span class="skill-tag">${s}</span>`).join('') : '—'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Selected Projects</div>
      <div>
        ${projectsArray.length > 0 ? projectsArray.map(p => `
          <div class="project-item">
            <div class="project-text">${p}</div>
          </div>
        `).join('') : '—'}
      </div>
    </div>

    ${resumeData.achievements ? `
    <div class="section">
      <div class="section-title">Honors & Certifications</div>
      <div style="font-size: 14px; color: #4a4a4a; white-space: pre-wrap;">${resumeData.achievements}</div>
    </div>
    ` : ''}
  </div>
</body>
</html>
      `;
    }

    // Default Glassmorphic theme
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${resumeData.name} - Dynamic Portfolio</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #090f1d 0%, #060913 100%);
      color: #e2e8f0;
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      padding: 50px 20px;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(16px);
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 30px 60px rgba(0,0,0,0.4);
    }
    header {
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding-bottom: 24px;
      margin-bottom: 30px;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 8px 0;
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .meta { display: flex; flex-wrap: wrap; gap: 15px; color: #94a3b8; font-size: 14px; }
    .section { margin-bottom: 32px; }
    h2 { font-size: 20px; color: #06b6d4; margin: 0 0 16px 0; border-bottom: 1px solid rgba(6,182,212,0.15); padding-bottom: 6px; }
    .badge-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge { background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.2); color: #67e8f9; padding: 6px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; }
    .card { background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; padding: 20px; margin-bottom: 12px; }
    p { margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <header>
      <h1>${resumeData.name}</h1>
      <div class="meta">
        ${resumeData.email ? `<span>● ${resumeData.email}</span>` : ''}
        ${resumeData.phone ? `<span>● ${resumeData.phone}</span>` : ''}
        ${resumeData.address ? `<span>● ${resumeData.address}</span>` : ''}
      </div>
    </header>

    <div class="section">
      <h2>Education</h2>
      <div class="card">
        <p style="font-weight: 600; font-size: 16px; color: #fff;">${resumeData.education || 'Jeppiaar University student'}</p>
        ${resumeData.cgpa ? `<p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">CGPA Score: ${resumeData.cgpa}</p>` : ''}
      </div>
    </div>

    <div class="section">
      <h2>Skills Profile</h2>
      <div class="badge-container">
        ${skillsArray.length > 0 ? skillsArray.map(s => `<span class="badge">${s}</span>`).join('') : '<span style="color: #64748b;">No skills configured</span>'}
      </div>
    </div>

    <div class="section">
      <h2>Core Engineering Projects</h2>
      <div>
        ${projectsArray.length > 0 ? projectsArray.map(p => `
          <div class="card">
            <p style="color: #e2e8f0; font-size: 14px; font-weight: 500;">${p}</p>
          </div>
        `).join('') : '<p style="color: #64748b;">No projects listed</p>'}
      </div>
    </div>

    ${resumeData.achievements ? `
    <div class="section">
      <h2>Honors & Professional Development</h2>
      <div class="card" style="font-size: 14px; color: #cbd5e1; white-space: pre-wrap;">${resumeData.achievements}</div>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  }, [resumeData, theme]);

  const handleDownloadHTML = () => {
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.roll_number || 'student'}_Portfolio_${theme}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#e2e8f0' }}>Dynamic Portfolio Hub</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>Design premium responsive HTML portfolios and live preview your styling.</p>
        </div>
      </div>

      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '6px', marginBottom: '32px', maxWidth: '400px' }}>
        <button 
          onClick={() => setActiveTab('build')} 
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', background: activeTab === 'build' ? 'rgba(6,182,212,0.15)' : 'transparent', color: activeTab === 'build' ? '#67e8f9' : '#64748b' }}
        >
          <FileText size={16} /> Portfolio Builder
        </button>
        <button 
          onClick={() => setActiveTab('upload')} 
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', background: activeTab === 'upload' ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeTab === 'upload' ? '#c4b5fd' : '#64748b' }}
        >
          <UploadCloud size={16} /> Upload Custom PDF
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
          {/* Form inputs */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#67e8f9', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Personal Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Full Name</label><input value={resumeData.name} onChange={e => setResumeData({...resumeData, name: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Email Address</label><input value={resumeData.email} onChange={e => setResumeData({...resumeData, email: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Phone Number</label><input value={resumeData.phone} onChange={e => setResumeData({...resumeData, phone: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Location / City</label><input value={resumeData.address} onChange={e => setResumeData({...resumeData, address: e.target.value})} style={inputStyle} /></div>
            </div>

            <h3 style={{ margin: '24px 0 20px 0', fontSize: '16px', color: '#67e8f9', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: '8px' }}>Education</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Degree & Institution</label><input value={resumeData.education} onChange={e => setResumeData({...resumeData, education: e.target.value})} style={inputStyle} placeholder="e.g. B.Tech CSE, Jeppiaar..." /></div>
              <div><label style={labelStyle}>CGPA / Grade</label><input value={resumeData.cgpa} onChange={e => setResumeData({...resumeData, cgpa: e.target.value})} style={inputStyle} /></div>
            </div>

            <h3 style={{ margin: '24px 0 20px 0', fontSize: '16px', color: '#67e8f9', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: '8px' }}>Experience & Skills</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={labelStyle}>Skills (Comma Separated)</label><input value={resumeData.skills} onChange={e => setResumeData({...resumeData, skills: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Projects (One per line)</label><textarea value={resumeData.projects} onChange={e => setResumeData({...resumeData, projects: e.target.value})} style={{...inputStyle, minHeight: '80px', fontFamily: 'inherit'}} /></div>
              <div><label style={labelStyle}>Certifications / Honors</label><textarea value={resumeData.achievements} onChange={e => setResumeData({...resumeData, achievements: e.target.value})} style={{...inputStyle, minHeight: '60px', fontFamily: 'inherit'}} /></div>
            </div>
          </div>

          {/* Theme preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>THEME:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['glass', 'terminal', 'pearl'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '6px 14px',
                        border: '1px solid',
                        borderColor: theme === t ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                        background: theme === t ? 'rgba(6,182,212,0.15)' : 'transparent',
                        color: theme === t ? '#67e8f9' : '#94a3b8',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleDownloadHTML} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '8px 16px', 
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: '#fff', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  cursor: 'pointer' 
                }}
              >
                <Download size={14} /> Export HTML
              </button>
            </div>

            {/* Iframe Preview */}
            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', height: '65vh', background: '#0d1117', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Eye size={14} color="#64748b" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Responsive Theme View</span>
              </div>
              <iframe
                title="Portfolio Live Preview"
                srcDoc={generatedHTML}
                style={{ width: '100%', height: 'calc(100% - 37px)', border: 'none', background: theme === 'pearl' ? '#faf9f6' : '#090f1d' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
