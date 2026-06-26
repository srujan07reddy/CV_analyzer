import React, { useEffect, useMemo, useState } from 'react';
import { User, Mail, Hash, Building2, Code, FolderGit2, Edit3, Save, X, UploadCloud, FileText, MessageSquare, Download, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getMessagesByRoll, saveStudent, getAllTemplates } from '../../offline-storage/db';
import { buildResumeText, isValidRollNumber } from '../../utils/studentPortal';
import { extractTextFromPdfItems } from '../../utils/pdf-parser';
import { extractSections } from '../../utils/resume-parser';

export default function StudentProfile({ student, onStudentUpdate, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    top_skills: student.top_skills || '',
    projects: student.projects || '',
    email: student.email || '',
    phone: student.phone || '',
    address: student.address || '',
    objective: student.objective || '',
    education: student.education || '',
    portfolio: student.portfolio || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [messages, setMessages] = useState([]);
  const [resumeText, setResumeText] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      const result = await getMessagesByRoll(student.roll_number);
      setMessages(result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    };
    loadMessages();
  }, [student.roll_number]);

  useEffect(() => {
    setResumeText(buildResumeText(student, form));
  }, [student, form]);

  // Load management template sections (pick the latest template if any)
  const [templateSections, setTemplateSections] = useState([]);
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const templates = await getAllTemplates();
        if (templates && templates.length > 0) {
          const latest = templates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
          setTemplateSections(Array.isArray(latest.sections) ? latest.sections : []);
        }
      } catch (e) {
        console.warn('Failed to load templates', e);
      }
    };
    loadTemplate();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updated = { ...student, ...form };
    await saveStudent(updated);
    onStudentUpdate(updated);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const extension = (file.name.split('.').pop() || '').toLowerCase();
      let content = '';

      if (['csv', 'txt', 'tsv', 'json'].includes(extension)) {
        content = await file.text();
      } else if (['xlsx', 'xls'].includes(extension)) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        content = workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          return XLSX.utils.sheet_to_txt(sheet, { blankrows: false, raw: true });
        }).join('\n\n');
      } else if (extension === 'pdf') {
        // Parse PDF using pdfjs-dist to extract text content
        try {
          const pdfData = await file.arrayBuffer();
          const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
          // Point workerSrc to CDN fallback; pdfjs.version exists in the package
          try {
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
          } catch (e) {
            // ignore if setting worker fails in some environments
          }
          const loadingTask = pdfjs.getDocument({ data: pdfData });
          const pdf = await loadingTask.promise;
          let pagesText = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
              const contentStream = await page.getTextContent();
                const structured = extractTextFromPdfItems(contentStream.items);
                // fallback to naive join if extractor produced nothing
                const pageText = structured && structured.length > 0 ? structured : contentStream.items.map(item => item.str).join(' ');
                pagesText.push(pageText);
          }
          content = pagesText.join('\n\n');
        } catch (pdfErr) {
          console.warn('[StudentPortal] PDF parsing failed:', pdfErr);
          // fallback to raw binary decode
          try {
            const buffer = await file.arrayBuffer();
            content = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          } catch (dErr) {
            content = '';
          }
        }
      } else {
        try {
          content = await file.text();
        } catch {
          const buffer = await file.arrayBuffer();
          content = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        }
      }

      const preview = (content || '').trim() || `Uploaded ${file.name}. The file was accepted, but no readable text could be extracted.`;
      // Fill resume preview and attempt to extract structured sections
      setResumeText(preview);
      try {
        const parsed = extractSections(preview, templateSections);
        // map parsed sections into form fields if they exist
        setForm(prev => ({
          ...prev,
          objective: prev.objective || parsed['objective'] || parsed['summary'] || prev.objective,
          education: prev.education || parsed['education'] || prev.education,
          top_skills: prev.top_skills || (parsed['skills_list'] ? parsed['skills_list'].join(', ') : prev.top_skills),
          projects: prev.projects || (parsed['projects_list'] ? parsed['projects_list'].join('\n') : prev.projects)
        }));
      } catch (e) {
        console.warn('[StudentPortal] resume parsing failed', e);
      }
    } catch (error) {
      console.error('[StudentPortal] Resume upload failed:', error);
      setResumeText(buildResumeText(student, { ...form, objective: `Unable to read ${file.name}. Please try a text-based document or spreadsheet file.` }));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadResume = () => {
    const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(student.roll_number || 'student').toLowerCase()}-resume.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasValidRoll = useMemo(() => isValidRollNumber(student.roll_number), [student.roll_number]);

  const fieldStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  };

  const labelStyle = { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' };
  const valueStyle = { fontSize: '15px', color: '#e2e8f0', fontWeight: '500', lineHeight: '1.5' };
  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
            {(student.name || 'S')[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#e2e8f0' }}>{student.name}</h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{student.roll_number}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => { setEditing(!editing); setSaved(false); }} style={{
            display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: editing ? 'rgba(239,68,68,0.1)' : 'rgba(6,182,212,0.1)', border: `1px solid ${editing ? 'rgba(239,68,68,0.3)' : 'rgba(6,182,212,0.3)'}`, borderRadius: '10px', color: editing ? '#fca5a5' : '#06b6d4', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>
            {editing ? <><X size={14} /> Cancel</> : <><Edit3 size={14} /> Edit Profile</>}
          </button>
          <button onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#e2e8f0', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {saved && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#6ee7b7', fontSize: '13px', fontWeight: '600' }}>
          ✓ Profile updated successfully!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
        <div style={fieldStyle}>
          <User size={18} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={labelStyle}>Full Name</p>
            <p style={valueStyle}>{student.name || '—'}</p>
          </div>
        </div>
        <div style={fieldStyle}>
          <Hash size={18} color="#06b6d4" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={labelStyle}>Roll Number</p>
            <p style={{ ...valueStyle, fontFamily: 'monospace' }}>{student.roll_number}</p>
          </div>
        </div>
        <div style={fieldStyle}>
          <Building2 size={18} color="#a78bfa" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={labelStyle}>Department</p>
            <p style={valueStyle}>{student.department || '—'}</p>
          </div>
        </div>
        <div style={fieldStyle}>
          <Mail size={18} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={labelStyle}>Email Address</p>
            {editing ? (
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="your@email.com" />
            ) : (
              <p style={valueStyle}>{student.email || '—'}</p>
            )}
          </div>
        </div>
        <div style={fieldStyle}>
          <User size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={labelStyle}>Phone</p>
            {editing ? (
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} placeholder="Phone number" />
            ) : (
              <p style={valueStyle}>{student.phone || '—'}</p>
            )}
          </div>
        </div>
        <div style={fieldStyle}>
          <Building2 size={18} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={labelStyle}>Address</p>
            {editing ? (
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inputStyle} placeholder="Current address" />
            ) : (
              <p style={valueStyle}>{student.address || '—'}</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={fieldStyle}>
          <Code size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={labelStyle}>Top Skills</p>
            {editing ? (
              <input value={form.top_skills} onChange={e => setForm(f => ({ ...f, top_skills: e.target.value }))} style={inputStyle} placeholder="e.g. Python, React, SQL, Java" />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {(student.top_skills || '').split(',').filter(s => s.trim()).map((s, i) => (
                  <span key={i} style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px', color: '#fbbf24', fontSize: '12px', fontWeight: '600' }}>{s.trim()}</span>
                ))}
                {!(student.top_skills) && <span style={{ color: '#475569', fontSize: '14px' }}>No skills added yet</span>}
              </div>
            )}
          </div>
        </div>

          <div style={fieldStyle}>
            <FolderGit2 size={18} color="#06b6d4" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={labelStyle}>Key Projects</p>
              {editing ? (
                <textarea value={form.projects} onChange={e => setForm(f => ({ ...f, projects: e.target.value }))} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="e.g. AI Chatbot, Smart Attendance System (one per line)" />
              ) : (
                <div>
                  {((student.projects || '').toString().split(/\n|;|,|\u2022/).map(p => p.trim()).filter(Boolean)).length === 0 ? (
                    <p style={{ ...valueStyle }}>No projects listed yet</p>
                  ) : (
                    <ul style={{ margin: '6px 0 0 16px', color: '#e2e8f0' }}>
                      {((student.projects || '').toString().split(/\n|;|,|\u2022/).map(p => p.trim()).filter(Boolean)).map((p, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={fieldStyle}>
            <FileText size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={labelStyle}>Career Objective</p>
              {editing ? (
                <textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Tell management about your goals" />
              ) : (
                <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{student.objective || 'No objective added yet'}</p>
              )}
            </div>
          </div>

          <div style={fieldStyle}>
            <Building2 size={18} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={labelStyle}>Education</p>
              {editing ? (
                <textarea value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="Your education details" />
              ) : (
                <p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{student.education || 'No education details yet'}</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={fieldStyle}>
            <UploadCloud size={18} color="#06b6d4" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={labelStyle}>Resume / CV Upload</p>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(6,182,212,0.1)', color: '#67e8f9', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '6px' }}>
                <UploadCloud size={14} /> {uploading ? 'Reading file...' : 'Upload file'}
                <input type="file" accept=".txt,.pdf,.doc,.docx,.csv,.tsv,.json,.xls,.xlsx" onChange={handleResumeUpload} style={{ display: 'none' }} />
              </label>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>Upload a resume, document, PDF, CSV, or Excel sheet. Text-based content will be previewed here.</p>
            </div>
          </div>

          <div style={fieldStyle}>
            <Download size={18} color="#a78bfa" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={labelStyle}>Download Resume</p>
              <button onClick={handleDownloadResume} style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', color: '#ddd6fe', fontWeight: '600', cursor: 'pointer' }}>
                Download Resume Text
              </button>
            </div>
          </div>

          <div style={fieldStyle}>
            <MessageSquare size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={labelStyle}>Management Messages</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {messages.length === 0 ? (
                  <span style={{ color: '#64748b', fontSize: '13px' }}>No messages yet.</span>
                ) : messages.map(msg => (
                  <div key={msg.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontWeight: '700', color: '#fbbf24', fontSize: '13px' }}>{msg.title || 'Message from management'}</div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>{msg.body || msg.message || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px', padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#64748b', marginBottom: '8px' }}>Generated Resume Preview</p>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{resumeText || 'Your resume preview will appear here.'}</pre>
      </div>

      {editing && (
        <button onClick={handleSave} disabled={saving} style={{
          marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 28px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer'
        }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
    </div>
  );
}
