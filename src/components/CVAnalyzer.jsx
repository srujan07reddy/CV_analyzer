import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, BrainCircuit, AlertCircle, FileSpreadsheet, Sparkles, X, RefreshCw } from 'lucide-react';
import { getLLMConfig, parseResumeWithAI } from '../utils/llm';
import { getDeptFromRoll } from '../utils/importer';

export default function CVAnalyzer({ students = [], onSaveStudent }) {
  const [activeSubTab, setActiveSubTab] = useState('single'); // 'single' | 'bulk'
  const [cvText, setCvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [defaultRollNumber, setDefaultRollNumber] = useState('');

  const getRollFromFilename = (filename) => {
    if (!filename) return '';
    const match = filename.match(/\b(\d{2}JU[A-Z]{2,4}\d{3,4})\b/i);
    return match ? match[1].toUpperCase() : '';
  };

  // Bulk Mode States
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState(new Set());

  // Parsed Output State
  const [parsedStudent, setParsedStudent] = useState(null);
  const [executiveAssessment, setExecutiveAssessment] = useState('');

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

  const addBulkFiles = (filesList) => {
    const newItems = filesList.map(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      const isValid = ['txt', 'pdf', 'docx'].includes(extension);
      const rollHint = getRollFromFilename(file.name);
      return {
        id: Math.random().toString(36).substr(2, 9) + Date.now(),
        file: file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        status: isValid ? 'Ready' : 'Invalid Format',
        error: isValid ? '' : 'Unsupported file format (TXT, PDF, DOCX only)',
        rollHint: rollHint,
        parsedStudent: null,
        comparison: null
      };
    });
    setBulkFiles(prev => [...prev, ...newItems]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (activeSubTab === 'bulk') {
        addBulkFiles(Array.from(e.dataTransfer.files));
      } else {
        processFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (activeSubTab === 'bulk') {
        addBulkFiles(Array.from(e.target.files));
      } else {
        processFile(e.target.files[0]);
      }
    }
  };

  // Load PDF.js from CDN dynamically
  const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error('Failed to load PDF parsing library.'));
      document.head.appendChild(script);
    });
  };

  // Load Mammoth from CDN dynamically
  const loadMammoth = () => {
    return new Promise((resolve, reject) => {
      if (window.mammoth) {
        resolve(window.mammoth);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = () => resolve(window.mammoth);
      script.onerror = () => reject(new Error('Failed to load DOCX parsing library.'));
      document.head.appendChild(script);
    });
  };

  const extractTextFromFile = async (file) => {
    const fileType = file.name.split('.').pop().toLowerCase();
    if (fileType === 'txt') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result || '');
        reader.onerror = () => reject(new Error('Failed to read plain text file.'));
        reader.readAsText(file);
      });
    } else if (fileType === 'pdf') {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        text += strings.join(' ') + '\n';
      }
      if (!text.trim()) {
        throw new Error('Extracted text is empty. The PDF might contain scanned images rather than selectable text.');
      }
      return text;
    } else if (fileType === 'docx') {
      const mammoth = await loadMammoth();
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      if (!result.value.trim()) {
        throw new Error('Extracted text is empty.');
      }
      return result.value;
    } else {
      throw new Error('Unsupported file format. Please upload .txt, .pdf, or .docx files.');
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const rollHint = getRollFromFilename(file.name);
      setDefaultRollNumber(rollHint);
      const text = await extractTextFromFile(file);
      setCvText(text);
      setLoading(false);
    } catch (err) {
      setErrorMsg(`Guru garu, error parsing file: ${err.message}`);
      setLoading(false);
    }
  };

  // Rule-based fallback parser
  const runLocalHeuristicsParser = (text, rollHint = '') => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // 1. Extract Name (guess from top lines by checking segments and common delimiters)
    let extractedName = 'Candidate';
    if (lines.length > 0) {
      const firstLine = lines[0];
      const segments = firstLine.split(/[-—|•,\/]/);
      const firstSegment = segments[0].trim();
      const cleanSegment = firstSegment
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/(?:linkedin|github|portfolio|resume|cv)/gi, '')
        .replace(/[^a-zA-Z\s.]/g, '')
        .trim();
      const words = cleanSegment.split(/\s+/).filter(w => w.length > 1);
      if (words.length >= 2 && words.length <= 4) {
        extractedName = words.join(' ');
      } else {
        // Fallback to checking first 3 lines
        for (let i = 0; i < Math.min(3, lines.length); i++) {
          const line = lines[i];
          const cleanLine = line
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
            .replace(/https?:\/\/\S+/gi, '')
            .replace(/(?:linkedin|github|portfolio|resume|cv)/gi, '')
            .replace(/[^a-zA-Z\s.]/g, '')
            .trim();
          const lineWords = cleanLine.split(/\s+/).filter(w => w.length > 1);
          if (lineWords.length >= 2 && lineWords.length <= 4) {
            extractedName = lineWords.join(' ');
            break;
          }
        }
      }
    }

    // 2. Extract Roll Number (Standard or xxJUyyyzzz)
    let rollNumber = rollHint;
    if (!rollNumber) {
      const rollRegex = /\b(\d{2}JU[A-Z]{2,4}\d{3,4})\b/i;
      const rollMatch = text.match(rollRegex);
      rollNumber = rollMatch ? rollMatch[1].toUpperCase() : 'xxJUyyyzzz';
    }

    // 3. Extract Department
    let department = 'y';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('computer science') || lowerText.includes('cse') || lowerText.includes('software')) {
      department = 'Computer Science';
    } else if (lowerText.includes('information technology') || lowerText.includes('it engineering') || lowerText.includes('system admin')) {
      department = 'Information Technology';
    } else if (lowerText.includes('electronics') || lowerText.includes('ece') || lowerText.includes('telecommunication')) {
      department = 'Electronics & Communication';
    } else if (lowerText.includes('mechanical') || lowerText.includes('mech') || lowerText.includes('cad')) {
      department = 'Mechanical Engineering';
    } else {
      const derived = getDeptFromRoll(rollNumber);
      if (derived) {
        department = derived;
      }
    }

    // 4. Extract Activity Counts
    const parseCount = (regex, text) => {
      const match = text.match(regex);
      return match ? parseInt(match[1], 10) : 0;
    };

    // 5. Extract Custom Skills
    const skillKeywords = ['React', 'Node', 'Python', 'Java', 'Javascript', 'C++', 'SQL', 'Git', 'HTML', 'CSS', 'Cloud', 'Docker', 'Figma'];
    const foundSkills = skillKeywords.filter(skill => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundaryEnd = /\w$/.test(skill) ? '\\b' : '(?!\\w)';
      const regex = new RegExp(`\\b${escaped}${boundaryEnd}`, 'i');
      return regex.test(text);
    });

    // 6. Extract Projects Heuristic
    let projectsList = [];
    const projectKeywords = ['projects', 'key projects', 'academic projects', 'personal projects', 'technical projects', 'mini projects', 'major project'];
    let startIndex = -1;
    let matchKeyword = '';
    
    for (const kw of projectKeywords) {
      const idx = lowerText.indexOf(kw);
      if (idx !== -1 && (startIndex === -1 || idx < startIndex)) {
        const before = idx === 0 ? '\n' : text[idx - 1];
        if (before === '\n' || before === '\r' || before === ' ' || before === '\t') {
          startIndex = idx + kw.length;
          matchKeyword = kw;
        }
      }
    }
    
    if (startIndex !== -1) {
      const remainingText = text.slice(startIndex);
      const projLines = remainingText.split('\n');
      const stopKeywords = ['skills', 'technical skills', 'education', 'experience', 'work experience', 'certifications', 'achievements', 'co-curricular', 'extracurricular', 'languages', 'hobbies', 'declarations', 'declaration'];
      
      for (let i = 0; i < projLines.length; i++) {
        const line = projLines[i].trim();
        if (!line) continue;
        
        const lowerLine = line.toLowerCase();
        const isHeader = stopKeywords.some(kw => 
          lowerLine === kw || 
          lowerLine === kw + ':' || 
          (lowerLine.length < 30 && (lowerLine.startsWith(kw) || lowerLine.endsWith(kw)) && (line === line.toUpperCase() || line.includes(':')))
        );
        if (isHeader) break;
        if (projectsList.length >= 5 || i > 15) break;
        
        const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+[\.\)]/.test(line);
        if (isBullet) {
          const cleanLine = line.replace(/^[-•\*\d\.\)\s]+/, '').trim();
          if (cleanLine.length > 5 && cleanLine.length < 100 && /^[A-Z]/.test(cleanLine)) {
            const descIndex = cleanLine.search(/(?:\s+-\s+|\s+:\s+|\s+using\s+|\s+developed\s+|\s+built\s+)/i);
            const projName = descIndex !== -1 ? cleanLine.slice(0, descIndex).trim() : cleanLine;
            if (projName && projName.length > 3 && projName.length < 60 && !projectsList.includes(projName)) {
              projectsList.push(projName);
            }
          }
        } else if (line.length > 5 && line.length < 60 && /^[A-Z]/.test(line) && !line.includes(':')) {
          if (!projectsList.includes(line)) {
            projectsList.push(line);
          }
        }
      }
    }
    const projects = projectsList.join(', ') || 'Cybersecurity Vulnerability Assessment, Full-Stack App Development';

    return {
      student: {
        roll_number: rollNumber,
        name: extractedName,
        department,
        top_skills: foundSkills.join(', ') || 'General Facilitation',
        projects,
        experience_summary: lines.slice(0, 10).join(' ').slice(0, 120) + '...',
        raw_resume_text: text,
        ai_structured_data: {
          roll_number: rollNumber,
          name: extractedName,
          department,
          top_skills: foundSkills.join(', '),
          projects
        }
      },
      assessment: `### Local Heuristic Assessment (Fallback Mode)\n\n**Candidate Profile:**\n- Extracted Name: **${extractedName}**\n- Roll Number: **${rollNumber}**\n- Target Department: **${department}**\n\n*Note: Gemini AI settings are disabled or offline. Running localized regex heuristics rules to extract manifest metadata.*`
    };
  };

  const handleAnalyze = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setParsedStudent(null);
    setExecutiveAssessment('');

    if (!cvText.trim()) {
      setErrorMsg('Guru garu, please paste CV text or drop a text file first.');
      return;
    }

    setLoading(true);

    try {
      const parsed = await parseResumeWithAI(cvText, defaultRollNumber);

      setParsedStudent({
        roll_number: parsed.roll_number || defaultRollNumber || 'xxJUyyyzzz',
        name: parsed.name || 'x',
        department: parsed.department || 'Computer Science',
        top_skills: parsed.top_skills || 'General Facilitation',
        technical_skills: parsed.technical_skills || '',
        projects: parsed.projects || '',
        experience_summary: parsed.experience_summary || '',
        raw_resume_text: cvText,
        ai_structured_data: parsed
      });

      setExecutiveAssessment(parsed.executive_assessment || 'No summary assessment generated.');
    } catch (err) {
      console.warn('AI Parsing failed, falling back to local heuristics:', err);
      const fallback = runLocalHeuristicsParser(cvText, defaultRollNumber);
      setParsedStudent(fallback.student);
      setExecutiveAssessment(fallback.assessment + `\n\n*(AI API Handshake failed: ${err.message})*`);
    } finally {
      setLoading(false);
    }
  };

  const parseCVTextDirect = async (text, rollHint = '') => {
    try {
      const parsed = await parseResumeWithAI(text, rollHint);

      return {
        student: {
          roll_number: parsed.roll_number || rollHint || 'xxJUyyyzzz',
          name: parsed.name || 'x',
          department: parsed.department || 'Computer Science',
          top_skills: parsed.top_skills || 'General Facilitation',
          technical_skills: parsed.technical_skills || '',
          projects: parsed.projects || '',
          experience_summary: parsed.experience_summary || '',
          raw_resume_text: text,
          ai_structured_data: parsed
        },
        assessment: parsed.executive_assessment || 'No summary assessment generated.'
      };
    } catch (err) {
      console.warn('AI Parsing failed, falling back to local heuristics:', err);
      const fallback = runLocalHeuristicsParser(text, rollHint);
      return {
        student: fallback.student,
        assessment: fallback.assessment + `\n\n*(AI API Handshake failed: ${err.message})*`
      };
    }
  };

  const computeComparison = (parsedStudent) => {
    const existing = students.find(s => s.roll_number?.toUpperCase().trim() === parsedStudent.roll_number?.toUpperCase().trim());
    if (!existing) {
      return { status: 'new', details: ['Create new student identity'] };
    }
    
    const details = [];
    
    // Compare skills
    const existingSkills = existing.top_skills || existing.skills || '';
    const newSkills = parsedStudent.top_skills || '';
    const hasNewSkills = newSkills && newSkills.split(',').some(s => !existingSkills.toLowerCase().includes(s.trim().toLowerCase()));
    if (hasNewSkills) {
      details.push('New skills detected');
    }

    if (details.length === 0) {
      return { status: 'current', details: ['Profile is up-to-date'] };
    }
    return { status: 'update', details };
  };

  const handleAnalyzeBulk = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (bulkFiles.length === 0) {
      setErrorMsg('Guru garu, please select or drop some files first.');
      return;
    }

    setBulkAnalyzing(true);
    const updatedFiles = [...bulkFiles];

    for (let i = 0; i < updatedFiles.length; i++) {
      const item = updatedFiles[i];
      if (item.status === 'Invalid Format' || item.status === 'Analyzed') {
        continue;
      }

      // Update status to Reading
      item.status = 'Reading';
      setBulkFiles([...updatedFiles]);

      try {
        const text = await extractTextFromFile(item.file);
        
        // Update status to Analyzing
        item.status = 'Analyzing';
        setBulkFiles([...updatedFiles]);

        const result = await parseCVTextDirect(text, item.rollHint);
        item.parsedStudent = result.student;
        item.assessment = result.assessment;
        item.comparison = computeComparison(result.student);
        item.status = 'Analyzed';
        
        // Select it by default for import if it is new or has updates
        if (item.comparison.status === 'new' || item.comparison.status === 'update') {
          setSelectedBulkIds(prev => {
            const next = new Set(prev);
            next.add(item.id);
            return next;
          });
        }
      } catch (err) {
        item.status = 'Error';
        item.error = err.message;
      }

      setBulkFiles([...updatedFiles]);
      // Small cooling delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setBulkAnalyzing(false);
    setSuccessMsg('Guru garu, bulk analysis process has finished.');
  };

  const handleImportSelectedBulk = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const selectedItems = bulkFiles.filter(item => selectedBulkIds.has(item.id) && item.status === 'Analyzed' && item.parsedStudent);
    
    if (selectedItems.length === 0) {
      setErrorMsg('Guru garu, no valid analyzed profiles are selected.');
      return;
    }

    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (const item of selectedItems) {
      try {
        await onSaveStudent(item.parsedStudent);
        if (item.comparison.status === 'new') {
          imported++;
        } else {
          updated++;
        }
        
        // Mark it as current after import
        item.comparison = { status: 'current', details: ['Profile is up-to-date'] };
        
        // Remove from selection
        setSelectedBulkIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } catch (err) {
        console.error(err);
        failed++;
      }
    }

    // Refresh bulk files list
    setBulkFiles([...bulkFiles]);
    setSuccessMsg(`Import complete: ${imported} new identities created, ${updated} profiles updated successfully.${failed > 0 ? ` (${failed} failed)` : ''}`);
  };

  const handleToggleSelectAllBulk = () => {
    const analyzedFiles = bulkFiles.filter(f => f.status === 'Analyzed');
    if (selectedBulkIds.size === analyzedFiles.length && analyzedFiles.length > 0) {
      setSelectedBulkIds(new Set());
    } else {
      const allAnalyzedIds = analyzedFiles.map(f => f.id);
      setSelectedBulkIds(new Set(allAnalyzedIds));
    }
  };

  const handleToggleSelectBulk = (id) => {
    setSelectedBulkIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveBulkFile = (id) => {
    setBulkFiles(prev => prev.filter(f => f.id !== id));
    setSelectedBulkIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearBulk = () => {
    setBulkFiles([]);
    setSelectedBulkIds(new Set());
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleImportRecord = () => {
    if (!parsedStudent) return;
    try {
      onSaveStudent(parsedStudent);
      setSuccessMsg(`Guru garu, student facilitator ${parsedStudent.name} (${parsedStudent.roll_number}) has been registered and merged successfully into the registry.`);
      setParsedStudent(null);
      setExecutiveAssessment('');
      setCvText('');
    } catch (err) {
      setErrorMsg(`Failed to save record: ${err.message}`);
    }
  };

  return (
    <div className="tab-content" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainCircuit style={{ color: 'var(--color-primary)' }} />
            Jeppiaar Shikshak CV Analyzer
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Guru garu, analyze candidate CV profiles to extract SDC facilitation manifests and generate executive reports.
          </p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0px', marginBottom: '24px' }}>
        <button 
          onClick={() => { setActiveSubTab('single'); setErrorMsg(''); setSuccessMsg(''); }} 
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'single' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'single' ? '2px solid var(--color-primary)' : 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Single Profile
        </button>
        <button 
          onClick={() => { setActiveSubTab('bulk'); setErrorMsg(''); setSuccessMsg(''); }} 
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'bulk' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'bulk' ? '2px solid var(--color-primary)' : 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Bulk Profiles (Parallel Analyzer)
        </button>
      </div>

      {activeSubTab === 'single' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Left Column: Input Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>CV Input</h3>
              
              {/* File Dropzone */}
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`dropzone ${dragActive ? 'drag-active' : ''}`}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragActive ? 'rgba(6, 182, 212, 0.04)' : 'rgba(255,255,255,0.01)',
                  borderColor: dragActive ? 'var(--color-primary)' : 'var(--border-color)',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => document.getElementById('cv-file-input').click()}
              >
                <input 
                  type="file" 
                  id="cv-file-input" 
                  accept=".txt,.pdf,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <UploadCloud size={32} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Drop CV (.txt, .pdf, .docx) here, or browse</span>
                </div>
              </div>

              {defaultRollNumber && (
                <div style={{ fontSize: '12px', color: 'var(--color-secondary)', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: '6px', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Extracted Roll Hint: <strong>{defaultRollNumber}</strong></span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDefaultRollNumber(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Paste CV Text Contents</label>
                <textarea 
                  className="form-control" 
                  rows="12"
                  placeholder="Paste candidate experience details, roll number, department, activities..." 
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'sans-serif', fontSize: '13px', lineHeight: '1.5' }}
                />
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', color: 'var(--color-success)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} />
                  {successMsg}
                </div>
              )}

              <button 
                className="btn btn-primary" 
                onClick={handleAnalyze} 
                disabled={loading || !cvText.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '40px' }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    Analyzing CV manifest...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Analyze Profile CV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Output Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {parsedStudent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
                {/* Parsed Record Manifest */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>Extracted Roster Manifest</h3>
                    <span className="score-badge score-high" style={{ fontSize: '11px', padding: '4px 8px' }}>
                      Parsed Registry Log
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="parsed-name" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Full Name</label>
                      <input 
                        id="parsed-name"
                        name="parsed-name"
                        type="text" 
                        value={parsedStudent.name} 
                        onChange={(e) => setParsedStudent(prev => ({ ...prev, name: e.target.value }))}
                        style={{ fontSize: '13px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', width: '100%', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="parsed-roll" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Roll Number</label>
                      <input 
                        id="parsed-roll"
                        name="parsed-roll"
                        type="text" 
                        value={parsedStudent.roll_number} 
                        onChange={(e) => setParsedStudent(prev => ({ ...prev, roll_number: e.target.value.toUpperCase() }))}
                        style={{ fontSize: '13px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.02)', color: 'var(--color-primary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', width: '100%', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="parsed-dept" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Department</label>
                      <select 
                        id="parsed-dept"
                        name="parsed-dept"
                        value={parsedStudent.department} 
                        onChange={(e) => setParsedStudent(prev => ({ ...prev, department: e.target.value }))}
                        style={{ fontSize: '13px', background: '#0f172a', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', width: '100%', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Computer Science">Computer Science</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics & Communication">Electronics & Communication</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="parsed-skills" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Top Extracted Skills</label>
                      <input 
                        id="parsed-skills"
                        name="parsed-skills"
                        type="text" 
                        value={parsedStudent.top_skills} 
                        onChange={(e) => setParsedStudent(prev => ({ ...prev, top_skills: e.target.value }))}
                        style={{ fontSize: '13px', background: 'rgba(255,255,255,0.02)', color: 'var(--color-primary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', width: '100%', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="parsed-tech-skills" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Technical Skills</label>
                      <input 
                        id="parsed-tech-skills"
                        name="parsed-tech-skills"
                        type="text" 
                        value={parsedStudent.technical_skills || ''} 
                        onChange={(e) => setParsedStudent(prev => ({ ...prev, technical_skills: e.target.value }))}
                        style={{ fontSize: '13px', background: 'rgba(255,255,255,0.02)', color: '#a78bfa', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', width: '100%', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="parsed-projects" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Projects</label>
                      <input 
                        id="parsed-projects"
                        name="parsed-projects"
                        type="text" 
                        value={parsedStudent.projects || ''} 
                        onChange={(e) => setParsedStudent(prev => ({ ...prev, projects: e.target.value }))}
                        placeholder="e.g. VPN security architecture, AI agent development"
                        style={{ fontSize: '13px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px', width: '100%', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flexGrow: 1 }} 
                      onClick={() => { setParsedStudent(null); setExecutiveAssessment(''); }}
                    >
                      Clear Analysis
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} 
                      onClick={handleImportRecord}
                    >
                      <FileSpreadsheet size={16} />
                      Import Student Record
                    </button>
                  </div>
                </div>

                {/* AI Assessment Report */}
                <div className="glass-card" style={{ padding: '20px', maxHeight: '350px', overflowY: 'auto' }}>
                  <h3 className="card-title" style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Executive Evaluation Report</h3>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }} className="markdown-body">
                    {executiveAssessment.split('\n').map((line, idx) => {
                      if (line.startsWith('###')) {
                        return <h4 key={idx} style={{ color: 'var(--color-primary)', margin: '14px 0 8px 0' }}>{line.replace('###', '')}</h4>;
                      }
                      if (line.startsWith('**') || line.startsWith('-')) {
                        return (
                          <div key={idx} style={{ margin: '4px 0', paddingLeft: line.startsWith('-') ? '12px' : 0 }}>
                            {line.startsWith('-') ? '• ' : ''}
                            <strong>{line.replace(/[\*-]/g, '').split(':')[0]}</strong>: 
                            {line.split(':')[1] || ''}
                          </div>
                        );
                      }
                      return <p key={idx} style={{ margin: '8px 0' }}>{line}</p>;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>Awaiting CV Analysis</h3>
                <p style={{ fontSize: '13px', margin: 0, maxWidth: '280px' }}>
                  Guru garu, paste resume text or drop a file on the left and click 'Analyze Profile CV' to display the parsed results.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bulk Dropzone */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`dropzone ${dragActive ? 'drag-active' : ''}`}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                padding: '36px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragActive ? 'rgba(6, 182, 212, 0.04)' : 'rgba(255,255,255,0.01)',
                borderColor: dragActive ? 'var(--color-primary)' : 'var(--border-color)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('cv-bulk-file-input').click()}
            >
              <input 
                type="file" 
                id="cv-bulk-file-input" 
                accept=".txt,.pdf,.docx"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={40} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Drop Multiple CVs (.txt, .pdf, .docx) here, or browse</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Files will be loaded for parallel/sequential analysis</span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', color: 'var(--color-success)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} />
                {successMsg}
              </div>
            )}

            {bulkFiles.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Total Loaded Files: <strong>{bulkFiles.length}</strong> | Selected: <strong>{selectedBulkIds.size}</strong>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={handleClearBulk} disabled={bulkAnalyzing}>
                    Clear Files
                  </button>
                  <button className="btn btn-primary" onClick={handleAnalyzeBulk} disabled={bulkAnalyzing || bulkFiles.filter(f => f.status === 'Ready' || f.status === 'Error').length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {bulkAnalyzing ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                    Analyze All CVs
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleImportSelectedBulk} 
                    disabled={bulkAnalyzing || selectedBulkIds.size === 0}
                    style={{ background: 'linear-gradient(135deg, var(--color-success) 0%, #059669 100%)', color: '#fff', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileSpreadsheet size={14} />
                    Process Selected Imports ({selectedBulkIds.size})
                  </button>
                </div>
              </div>
            )}
          </div>

          {bulkFiles.length > 0 && (
            <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 8px', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={bulkFiles.filter(f => f.status === 'Analyzed').length > 0 && selectedBulkIds.size === bulkFiles.filter(f => f.status === 'Analyzed').length}
                        onChange={handleToggleSelectAllBulk}
                        disabled={bulkFiles.filter(f => f.status === 'Analyzed').length === 0}
                      />
                    </th>
                    <th style={{ padding: '12px 8px' }}>File Name</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Candidate Details</th>
                    <th style={{ padding: '12px 8px' }}>Comparison / Parallel Deltas</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkFiles.map(item => {
                    const isSelected = selectedBulkIds.has(item.id);
                    const isAnalyzed = item.status === 'Analyzed';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: isSelected ? 'rgba(6, 182, 212, 0.02)' : 'transparent' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <input 
                            type="checkbox" 
                            disabled={!isAnalyzed}
                            checked={isSelected}
                            onChange={() => handleToggleSelectBulk(item.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: '500' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.size}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {item.status === 'Ready' && <span className="score-badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>Ready</span>}
                          {item.status === 'Reading' && <span className="score-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Reading...</span>}
                          {item.status === 'Analyzing' && <span className="score-badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-primary)' }}>Analyzing...</span>}
                          {item.status === 'Analyzed' && <span className="score-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>Analyzed</span>}
                          {item.status === 'Error' && <span className="score-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }} title={item.error}>Error</span>}
                          {item.status === 'Invalid Format' && <span className="score-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>Invalid Format</span>}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {item.parsedStudent ? (
                            <div>
                              <div style={{ fontWeight: '600' }}>{item.parsedStudent.name}</div>
                              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{item.parsedStudent.roll_number}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.parsedStudent.department}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting parsing</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {item.comparison ? (
                            <div>
                              {item.comparison.status === 'new' && (
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                  New Identity
                                </span>
                              )}
                              {item.comparison.status === 'update' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 'bold', width: 'fit-content' }}>
                                    Update Available
                                  </span>
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {item.comparison.details.join(', ')}
                                  </div>
                                </div>
                              )}
                              {item.comparison.status === 'current' && (
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', fontWeight: 'bold' }}>
                                  Up-to-Date
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            onClick={() => handleRemoveBulkFile(item.id)}
                            disabled={bulkAnalyzing}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
