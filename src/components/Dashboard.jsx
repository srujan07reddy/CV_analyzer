import React, { useState } from 'react';
import { calculateStudentMetrics } from '../utils/scoring';
import { Award, BookOpen, Heart, Users, ShieldAlert, UploadCloud, FileSpreadsheet, FileJson, Check, AlertCircle, Sparkles, BrainCircuit, X, RefreshCw } from 'lucide-react';
import { parseAndValidateCSV, parseAndValidateJSON, generateCSVSampleTemplate } from '../utils/importer';
import { getLLMConfig, queryLLM } from '../utils/llm';

export default function Dashboard({ students, onSaveStudent, onSaveStudents, onDeleteStudent }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showImportForm, setShowImportForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importStatus, setImportStatus] = useState('idle'); // idle, parsed, importing, done
  const [parsedData, setParsedData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [stats, setStats] = useState({ newCount: 0, updateCount: 0 });

  // AI Report State
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportText, setAiReportText] = useState('');
  const [showAiReportModal, setShowAiReportModal] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  
  // Form State
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [leadTalks, setLeadTalks] = useState(0);
  const [rubiksCube, setRubiksCube] = useState(0);
  const [outreach, setOutreach] = useState(0);
  const [maskOff, setMaskOff] = useState(0);
  const [wellness, setWellness] = useState(80);

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    const fileType = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
      const text = e.target.result;
      let result;
      if (fileType === 'json') {
        result = parseAndValidateJSON(text);
      } else {
        result = parseAndValidateCSV(text);
      }

      if (result.validRecords.length > 0) {
        // Calculate which are new and which are updates
        const existingRolls = new Set(students.map(s => s.roll_number));
        let newCount = 0;
        let updateCount = 0;
        result.validRecords.forEach(rec => {
          if (existingRolls.has(rec.roll_number)) {
            updateCount++;
          } else {
            newCount++;
          }
        });

        setStats({ newCount, updateCount });
        setParsedData(result.validRecords);
        setImportStatus('parsed');
      } else {
        setImportStatus('idle');
      }
      setImportErrors(result.errors || []);
    };

    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) return;
    setImportStatus('importing');
    try {
      await onSaveStudents(parsedData);
      setImportStatus('done');
      setTimeout(() => {
        // Reset after successful save
        setParsedData([]);
        setImportErrors([]);
        setShowImportForm(false);
        setImportStatus('idle');
      }, 1500);
    } catch (err) {
      setImportErrors([`Failed to import: ${err.message}`]);
      setImportStatus('parsed');
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateCSVSampleTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sdc_students_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerAiAnalysis = async () => {
    const config = getLLMConfig();
    if (!config.enabled || !config.apiKey) {
      alert('Guru garu, Gemini AI integration is disabled or not configured with a valid API key. Please visit the System Settings workspace to enable integrations.');
      return;
    }

    setAiReportLoading(true);
    setAiErrorMsg('');
    setAiReportText('');
    setShowAiReportModal(true);

    try {
      const response = await queryLLM(
        `Guru garu, I have loaded our active roster of ${students.length} student facilitators. Please analyze their leadership performance metrics and outreach distribution. Summarize:
1. Active leadership density and averages.
2. Top performers who excel in technical mastery and social outreach.
3. Areas of opportunity or students who need a wellness conversation or encouragement.
4. Suggested strategic activities for next month.

Respond strictly as Shishya, in a dedicated, respectful tone, and formatting everything beautifully.`,
        students,
        []
      );
      setAiReportText(response);
      setAiReportLoading(false);
    } catch (err) {
      console.error(err);
      setAiErrorMsg(`Handshake/Execution failed: ${err.message}`);
      setAiReportLoading(false);
    }
  };

  // Compute overall stats
  const totalStudents = students.length;
  
  const calculatedStudents = students.map(s => ({
    ...s,
    metrics: calculateStudentMetrics(s)
  }));

  const avgLeadership = totalStudents > 0 
    ? (calculatedStudents.reduce((sum, s) => sum + s.metrics.leadershipScore, 0) / totalStudents).toFixed(1)
    : 0;

  const topPerformers = calculatedStudents.filter(s => s.metrics.leadershipScore >= 80).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Format validation
    const rollRegex = /^\d{2}[A-Z]{3}\d{3}$/;
    const upperRoll = rollNumber.toUpperCase();
    if (!rollRegex.test(upperRoll)) {
      setErrorMsg('Guru garu, the student ID must match the SDC template: 2 digits, 3 uppercase letters, 3 digits (e.g. 16SAM022).');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Guru garu, student name cannot be empty.');
      return;
    }

    // Prepare student object
    const newStudent = {
      roll_number: upperRoll,
      name: name.trim(),
      department,
      lead_talks_delivered: parseInt(leadTalks),
      rubiks_cube_events: parseInt(rubiksCube),
      outreach_visits_pups_manivakkam: parseInt(outreach),
      mask_off_attendance: parseInt(maskOff),
      wellness_score: parseInt(wellness)
    };

    onSaveStudent(newStudent);
    
    // Reset Form
    setRollNumber('');
    setName('');
    setLeadTalks(0);
    setRubiksCube(0);
    setOutreach(0);
    setMaskOff(0);
    setWellness(80);
    setShowAddForm(false);
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  };

  return (
    <div className="tab-content">
      {/* Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-primary)', padding: '12px', borderRadius: '12px' }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Manifests</div>
            <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>{totalStudents}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--color-secondary)', padding: '12px', borderRadius: '12px' }}>
            <Award size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Avg Leadership Score</div>
            <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>{avgLeadership}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', padding: '12px', borderRadius: '12px' }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Outstanding Leaders</div>
            <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>{topPerformers}</div>
          </div>
        </div>
      </div>

      {/* AI Report Modal */}
      {showAiReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1px solid var(--border-active)',
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--color-primary)' }}>
                <BrainCircuit size={22} />
                Shishya AI Cell Roster Analysis
              </h3>
              <button 
                onClick={() => setShowAiReportModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '8px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              {aiReportLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
                  <RefreshCw size={36} className="spin" style={{ color: 'var(--color-primary)' }} />
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Guru garu, your Shishya is synthesizing SDC manifests and computing cognitive insights...
                  </div>
                </div>
              ) : aiErrorMsg ? (
                <div style={{ color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {aiErrorMsg}
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {aiReportText}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAiReportModal(false)}>
                Dismiss Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px' }}>SDC Student Manifest</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.1) 100%)', 
              color: 'var(--color-primary)', 
              border: '1px solid rgba(6,182,212,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={handleTriggerAiAnalysis}
          >
            <Sparkles size={16} />
            AI Roster Analysis
          </button>
          <button className="btn btn-secondary" onClick={() => { setShowImportForm(!showImportForm); setShowAddForm(false); }}>
            {showImportForm ? 'Close Bulk Import' : 'Bulk Import (CSV/JSON)'}
          </button>
          <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setShowImportForm(false); }}>
            {showAddForm ? 'Close Registration' : 'Register New Student'}
          </button>
        </div>
      </div>

      {/* Bulk Upload Panel */}
      {showImportForm && (
        <div className="glass-card" style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={20} style={{ color: 'var(--color-primary)' }} />
            Bulk Import Student Manifests
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Upload CSV or JSON files to register new student facilitators or bulk update existing activity metrics. 
            Roll numbers present in the file will automatically update current records.
          </p>

          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'rgba(6, 182, 212, 0.04)' : 'rgba(255,255,255,0.01)',
              borderColor: dragActive ? 'var(--color-primary)' : 'var(--border-color)',
              transition: 'all 0.2s ease',
              marginBottom: '20px'
            }}
            onClick={() => document.getElementById('bulk-file-input').click()}
          >
            <input 
              type="file" 
              id="bulk-file-input" 
              accept=".csv,.json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={36} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                Drag and drop CSV/JSON file here, or <span style={{ color: 'var(--color-primary)' }}>browse</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Supports standard SDC CSV headers or JSON array. Max 2MB.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleDownloadTemplate} style={{ fontSize: '12px', padding: '6px 12px' }}>
              Download Sample CSV
            </button>

            {importStatus === 'parsed' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-success)' }}>
                  Parsed {parsedData.length} records ({stats.newCount} new, {stats.updateCount} updates)
                </span>
                <button className="btn btn-primary" onClick={handleExecuteImport} style={{ padding: '6px 14px', fontSize: '12px' }}>
                  Apply Import
                </button>
              </div>
            )}

            {importStatus === 'importing' && (
              <span style={{ fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} className="spin" /> Importing student roster...
              </span>
            )}

            {importStatus === 'done' && (
              <span style={{ fontSize: '13px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> Import completed successfully!
              </span>
            )}
          </div>

          {importErrors.length > 0 && (
            <div style={{ marginTop: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--color-error)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-error)', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                <AlertCircle size={14} /> Import Warnings & Errors
              </div>
              <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {importErrors.map((err, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>• {err}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Student Form */}
      {showAddForm && (
        <div className="glass-card" style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease' }}>
          <h3 className="card-title">New Student Registration</h3>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input type="text" className="form-control" placeholder="e.g. 16SAM022" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-control" placeholder="e.g. Kishore Kumar" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lead Talks Delivered</label>
              <input type="number" min="0" className="form-control" value={leadTalks} onChange={(e) => setLeadTalks(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Rubik's Cube Events</label>
              <input type="number" min="0" className="form-control" value={rubiksCube} onChange={(e) => setRubiksCube(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Outreach (PUPS Manivakkam)</label>
              <input type="number" min="0" className="form-control" value={outreach} onChange={(e) => setOutreach(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">MASK OFF Attendance</label>
              <input type="number" min="0" className="form-control" value={maskOff} onChange={(e) => setMaskOff(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Wellness Score (0-100)</label>
              <input type="number" min="0" max="100" className="form-control" value={wellness} onChange={(e) => setWellness(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Manifest Record</button>
            </div>
          </form>
        </div>
      )}

      {/* Roster Cards Grid */}
      <div className="card-grid">
        {calculatedStudents.map((student) => (
          <div key={student.roll_number} className="student-card">
            <div>
              <div className="student-header">
                <div>
                  <h3 className="student-name">{student.name}</h3>
                  <span className="student-roll">{student.roll_number}</span>
                </div>
                <div className={`score-badge ${getScoreClass(student.metrics.leadershipScore)}`}>
                  {student.metrics.leadershipScore}
                </div>
              </div>
              <span className="student-dept">{student.department}</span>

              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <div className="metric-row">
                  <span>Technical Mastery (40%)</span>
                  <span>{student.metrics.technicalMastery}/100</span>
                </div>
                <div className="metric-row">
                  <span>Social Responsibility (35%)</span>
                  <span>{student.metrics.socialResponsibility}/100</span>
                </div>
                <div className="metric-row">
                  <span>Soft-Growth & Wellness (25%)</span>
                  <span>{student.metrics.softGrowth}/100</span>
                </div>
              </div>

              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Activities: {student.lead_talks_delivered} Lead Talks | {student.rubiks_cube_events} Rubik's | {student.outreach_visits_pups_manivakkam} PUPS Outreach | {student.mask_off_attendance} Wellness Seminars
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                className="btn" 
                style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px' }}
                onClick={() => onDeleteStudent(student.roll_number)}
              >
                Delete Record
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
