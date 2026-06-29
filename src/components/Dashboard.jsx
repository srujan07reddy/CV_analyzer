import React, { useState, useEffect } from 'react';
import { Award, BookOpen, Heart, Users, ShieldAlert, UploadCloud, FileSpreadsheet, FileJson, Check, AlertCircle, Sparkles, BrainCircuit, X, RefreshCw, Bot, Send, MessageSquare } from 'lucide-react';
import { parseAndValidateCSV, parseAndValidateJSON, parseAndValidateXLSX, generateCSVSampleTemplate, getDeptFromRoll, getYearFromRoll } from '../utils/importer';
import { getLLMConfig, queryLLM } from '../utils/llm';
import { isValidDob, isValidRollNumber } from '../utils/studentPortal';
import { saveMessage } from '../offline-storage/db';
import { saveTemplate, getAllTemplates } from '../offline-storage/db';

export default function Dashboard({ students, onSaveStudent, onSaveStudents, onDeleteStudent, onClearAllStudents }) {
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

  // Stage Navigation
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);

  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [selectedYearFilter, setSelectedYearFilter] = useState('All');

  // Contextual Student Chat State (Stage 3)
  const [studentChatMessages, setStudentChatMessages] = useState([]);
  const [studentChatInput, setStudentChatInput] = useState('');
  const [studentChatThinking, setStudentChatThinking] = useState(false);

  useEffect(() => {
    if (selectedStudentRoll) {
      const student = students.find(s => s.roll_number === selectedStudentRoll);
      if (student) {
        setStudentChatMessages([
          {
            id: 1,
            sender: 'shishya',
            text: `Guru garu, I am ready to discuss the performance and outreach records of facilitator **${student.name}** (${student.roll_number}). Ask me any queries about their development metrics.`,
            timestamp: Date.now()
          }
        ]);
        setStudentChatInput('');
        setStudentChatThinking(false);
      }
    }
  }, [selectedStudentRoll, students]);

  const handleStudentChatSend = async (e) => {
    e.preventDefault();
    if (!studentChatInput.trim() || studentChatThinking) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: studentChatInput,
      timestamp: Date.now()
    };

    setStudentChatMessages(prev => [...prev, userMessage]);
    const queryStr = studentChatInput;
    setStudentChatInput('');

    // Fidelity boundary check
    const queryLower = queryStr.toLowerCase();
    const suspectedEntities = ['ramesh', 'suresh', 'anna university', 'pups tambaram', 'iit', 'vit', 'srm'];
    for (const entity of suspectedEntities) {
      if (queryLower.includes(entity)) {
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'error',
          text: `[FIDELITY BREACH] Fidelity Protocol Violation: Reference to unauthorized external entity '${entity}' is strictly prohibited under local isolation constraints.`,
          timestamp: Date.now()
        };
        setStudentChatMessages(prev => [...prev, errorMessage]);
        return;
      }
    }

    const currentStudent = students.find(s => s.roll_number === selectedStudentRoll);
    if (!currentStudent) return;

    const config = getLLMConfig();
    if (config.enabled && config.apiKey) {
      setStudentChatThinking(true);
      try {
        const result = await queryLLM(queryStr, [currentStudent], []);
        const shishyaMessage = {
          id: Date.now() + 1,
          sender: 'shishya',
          text: result,
          timestamp: Date.now()
        };
        setStudentChatMessages(prev => [...prev, shishyaMessage]);
      } catch (err) {
        console.warn('[StudentChat] LLM failed:', err);
        try {
          const fallbackResult = processShishyaQuery(queryStr, [currentStudent]);
          const shishyaMessage = {
            id: Date.now() + 1,
            sender: 'shishya',
            text: `[Fallback Mode]\n\n${fallbackResult.response}`,
            timestamp: Date.now()
          };
          setStudentChatMessages(prev => [...prev, shishyaMessage]);
        } catch (localErr) {
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'error',
            text: `[FIDELITY BREACH] ${localErr.message}`,
            timestamp: Date.now()
          };
          setStudentChatMessages(prev => [...prev, errorMessage]);
        }
      } finally {
        setStudentChatThinking(false);
      }
    } else {
      try {
        const result = processShishyaQuery(queryStr, [currentStudent]);
        const shishyaMessage = {
          id: Date.now() + 1,
          sender: 'shishya',
          text: result.response,
          timestamp: Date.now()
        };
        setStudentChatMessages(prev => [...prev, shishyaMessage]);
      } catch (err) {
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'error',
          text: `[FIDELITY BREACH] ${err.message}`,
          timestamp: Date.now()
        };
        setStudentChatMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const handleExportCSV = () => {
    if (!students || students.length === 0) return;
    
    // Extract headers
    const headersSet = new Set(['name', 'roll_number', 'department', 'dob', 'gender', 'contact_number', 'email', 'top_skills', 'projects']);
    students.forEach(s => {
      Object.keys(s).forEach(k => headersSet.add(k));
    });
    const headers = Array.from(headersSet);
    
    const csvContent = [
      headers.join(','),
      ...students.map(s => {
        return headers.map(header => {
          const val = s[header] !== undefined && s[header] !== null ? s[header] : '';
          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          const escaped = strVal.replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SDC_Student_Roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form State
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [topSkills, setTopSkills] = useState('');
  const [projects, setProjects] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [templateSavedMsg, setTemplateSavedMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const templates = await getAllTemplates();
        if (templates && templates.length > 0) {
          const latest = templates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
          setTemplateText((latest.sections || []).join('\n'));
        }
      } catch (e) {
        console.warn('Failed to load templates', e);
      }
    };
    load();
  }, []);

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

    // Check file size (max 2MB) to prevent browser lockups
    if (file.size > 2 * 1024 * 1024) {
      setImportStatus('idle');
      setImportErrors(['File is too large. Please upload files under 2MB.']);
      return;
    }

    const nameParts = file.name.split('.');
    const fileType = nameParts.length > 1 ? nameParts.pop().toLowerCase() : '';

    if (fileType === 'pdf') {
      setImportStatus('idle');
      setImportErrors(['You selected a PDF file. The Bulk Import tool only supports CSV, Excel (XLSX/XLS), JSON, or plain text student rosters. If you want to analyze a resume PDF, please use the CV Analyzer section instead.']);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      let result;
      if (fileType === 'xlsx' || fileType === 'xls') {
        const buffer = e.target.result;
        result = parseAndValidateXLSX(buffer);
      } else {
        const text = e.target.result;
        if (fileType === 'json') {
          result = parseAndValidateJSON(text);
        } else {
          result = parseAndValidateCSV(text);
        }
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

    if (fileType === 'xlsx' || fileType === 'xls') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
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
    const standardHeaders = [
      'roll_number',
      'name',
      'department',
      'top_skills',
      'projects'
    ];
    
    const customHeaders = new Set();
    const standardSet = new Set(standardHeaders);
    
    students.forEach(student => {
      Object.keys(student).forEach(key => {
        if (!standardSet.has(key) && key !== 'metrics') {
          customHeaders.add(key);
        }
      });
    });
    
    const headers = [...standardHeaders, ...customHeaders];
    const headerRow = headers.join(',');
    
    // Generate a sample row
    const sampleRow = headers.map(header => {
      if (header === 'roll_number') return 'xxJUyyyzzz';
      if (header === 'name') return 'x';
      if (header === 'department') return 'y';
      if (header === 'top_skills') return 'Python, SQL';
      if (header === 'projects') return 'AI Chatbot';
      return '';
    }).join(',');
    
    const csvContent = `${headerRow}\n${sampleRow}`;
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
        `Guru garu, I have loaded our active roster of ${students.length} student facilitators. Please analyze their technology skills and key projects. Summarize:
1. Technical capabilities and skills distribution.
2. Promising student projects and their applications.
3. Suggested areas of study or technical encouragement.

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

  // Extract all unique years present in the raw students list
  const availableYears = React.useMemo(() => {
    const years = new Set();
    students.forEach(s => {
      const yr = getYearFromRoll(s.roll_number);
      if (yr && yr !== 'Unknown') {
        years.add(yr);
      }
    });
    return Array.from(years).sort();
  }, [students]);

  // Filter students based on year filter
  const yearFilteredStudents = React.useMemo(() => {
    if (selectedYearFilter === 'All') return students;
    return students.filter(s => getYearFromRoll(s.roll_number) === selectedYearFilter);
  }, [students, selectedYearFilter]);

  // Compute overall stats based on filtered list
  const totalStudents = yearFilteredStudents.length;
  
  const calculatedStudents = yearFilteredStudents;

  // Batch stats computed from all students to show entire cohort distribution
  const batchStats = React.useMemo(() => {
    const batches = {};
    students.forEach(s => {
      const yr = getYearFromRoll(s.roll_number);
      batches[yr] = (batches[yr] || 0) + 1;
    });
    return Object.entries(batches)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [students]);

  // Skill frequency stats computed from calculatedStudents
  const skillStats = React.useMemo(() => {
    const counts = {};
    calculatedStudents.forEach(s => {
      const skillsStr = s.top_skills || s.skills || '';
      skillsStr.split(',').forEach(sk => {
        const clean = sk.trim();
        if (clean) {
          const lower = clean.toLowerCase();
          const existingKey = Object.keys(counts).find(k => k.toLowerCase() === lower);
          if (existingKey) {
            counts[existingKey]++;
          } else {
            counts[clean] = 1;
          }
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [calculatedStudents]);

  const allKeys = new Set();
  yearFilteredStudents.forEach(s => {
    Object.keys(s).forEach(k => {
      if (k !== 'roll_number' && k !== 'name' && k !== 'department') {
        allKeys.add(k);
      }
    });
  });

  const hasStandardActivities = false;

  const uniqueDepts = new Set(yearFilteredStudents.map(s => s.department).filter(Boolean)).size;

  // Filter students by selected department and search query
  const filteredStudents = calculatedStudents.filter(s => {
    if (selectedDepartment && (s.department || 'No Department') !== selectedDepartment) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const rollMatch = (s.roll_number || '').toLowerCase().includes(q);
      return nameMatch || rollMatch;
    }
    return true;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '');
      case 'roll-asc':
        return (a.roll_number || '').localeCompare(b.roll_number || '');
      case 'roll-desc':
        return (b.roll_number || '').localeCompare(a.roll_number || '');
      default:
        return 0;
    }
  });

  // Group sortedStudents by year for Stage 2 list
  const studentsByYear = React.useMemo(() => {
    const groups = {};
    sortedStudents.forEach(s => {
      const yr = getYearFromRoll(s.roll_number);
      if (!groups[yr]) {
        groups[yr] = [];
      }
      groups[yr].push(s);
    });
    return groups;
  }, [sortedStudents]);

  // Group students by department to compute department stats
  const departmentStats = React.useMemo(() => {
    const groups = {};
    calculatedStudents.forEach(s => {
      const dept = s.department || 'No Department';
      if (!groups[dept]) {
        groups[dept] = {
          name: dept,
          count: 0,
          students: []
        };
      }
      groups[dept].count++;
      groups[dept].students.push(s);
    });

    return Object.values(groups);
  }, [calculatedStudents]);

  const totalCount = calculatedStudents.length;
  // Doughnut chart slices
  const doughnutColors = [
    'var(--color-primary)',
    'var(--color-secondary)',
    'var(--color-success)',
    '#EAB308',
    '#EF4444',
    '#EC4899',
    '#3B82F6',
    '#14B8A6'
  ];

  let currentOffset = 0;
  const doughnutSegments = departmentStats.map((dept, index) => {
    const percentage = totalCount > 0 ? dept.count / totalCount : 0;
    const strokeDash = percentage * 314.159;
    const offset = currentOffset;
    currentOffset -= strokeDash;
    return {
      name: dept.name,
      count: dept.count,
      percent: Math.round(percentage * 100),
      strokeDasharray: `${strokeDash} 314.159`,
      strokeDashoffset: offset,
      color: doughnutColors[index % doughnutColors.length]
    };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Format validation
    const upperRoll = rollNumber.toUpperCase().trim();
    if (!upperRoll) {
      setErrorMsg('Guru garu, student ID/roll number cannot be empty.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Guru garu, student name cannot be empty.');
      return;
    }

    if (!isValidRollNumber(upperRoll)) {
      setErrorMsg('Roll number must follow the format aaJUbbbccc (example: 22JUCS001).');
      return;
    }

    if (!isValidDob(dob)) {
      setErrorMsg('Date of birth must be in DD-MM-YYYY format.');
      return;
    }

    // Prepare student object
    const derivedDept = getDeptFromRoll(upperRoll);
    const newStudent = {
      roll_number: upperRoll,
      name: name.trim(),
      email: email.trim(),
      dob: dob.trim(),
      department: derivedDept || department,
      top_skills: topSkills.trim(),
      projects: projects.trim()
    };

    try {
      await onSaveStudent(newStudent);

      if (messageTitle.trim() || messageBody.trim()) {
        await saveMessage({
          roll_number: upperRoll,
          title: messageTitle.trim() || 'Message from management',
          body: messageBody.trim() || 'A new message has been shared for you.',
          timestamp: Date.now(),
          read: false
        });
      }
      
      // Reset Form
      setRollNumber('');
      setName('');
      setEmail('');
      setDob('');
      setTopSkills('');
      setProjects('');
      setMessageTitle('');
      setMessageBody('');
      setShowAddForm(false);
    } catch (err) {
      setErrorMsg(`Failed to register student: ${err.message}`);
    }
  };

  const handleSaveTemplate = async () => {
    const sections = templateText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (sections.length === 0) {
      setTemplateSavedMsg('Please enter at least one section name.');
      return;
    }
    await saveTemplate({ name: 'default', sections, timestamp: Date.now() });
    setTemplateSavedMsg('Template saved');
    setTimeout(() => setTemplateSavedMsg(''), 2500);
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  };

  if (students.length === 0) {
    return (
      <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '28px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>
            Initialize Dashboard Data
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6' }}>
            Guru garu, without student manifests no dashboard analytics can be calculated. Please upload your student database (CSV/JSON) or register a student manually to begin.
          </p>
        </div>

        <div className="glass-card" style={{ width: '100%', maxWidth: '650px', padding: '32px', boxShadow: '0 0 40px rgba(6,182,212,0.1)' }}>
          {showAddForm ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Register First Student</h3>
                <button className="btn btn-secondary" onClick={() => setShowAddForm(false)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Back to Upload
                </button>
              </div>
              {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input type="text" className="form-control" placeholder="e.g. 22JUCS001" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" placeholder="e.g. Name (x)" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-control" placeholder="student@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="text" className="form-control" placeholder="DD-MM-YYYY" value={dob} onChange={(e) => setDob(e.target.value)} />
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
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Optional Management Message</label>
                  <input type="text" className="form-control" placeholder="Message title" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Message Details</label>
                  <textarea className="form-control" placeholder="Share opportunities or instructions" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} style={{ minHeight: '90px', resize: 'vertical' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Register Student & Initialize</button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`dropzone ${dragActive ? 'drag-active' : ''}`}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragActive ? 'rgba(6, 182, 212, 0.04)' : 'rgba(255,255,255,0.01)',
                  borderColor: dragActive ? 'var(--color-primary)' : 'var(--border-color)',
                  transition: 'all 0.2s ease',
                  marginBottom: '24px'
                }}
                onClick={() => document.getElementById('bulk-file-input-empty').click()}
              >
                <input 
                  type="file" 
                  id="bulk-file-input-empty" 
                  accept=".csv,.json,.txt,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <UploadCloud size={48} style={{ color: 'var(--color-primary)', filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))' }} />
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    Drag and drop CSV/JSON/Excel file here, or <span style={{ color: 'var(--color-primary)' }}>browse</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Supports standard SDC headers, Excel spreadsheets, JSON arrays, or plain text records. Max 2MB.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={handleDownloadTemplate} style={{ fontSize: '13px' }}>
                  Download Sample CSV
                </button>

                {importStatus === 'parsed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: '500' }}>
                      Parsed {parsedData.length} records
                    </span>
                    <button className="btn btn-primary" onClick={handleExecuteImport} style={{ padding: '8px 16px', fontSize: '13px' }}>
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0 8px 0', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
                <span style={{ position: 'relative', background: 'var(--bg-primary)', padding: '0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>OR</span>
              </div>

              <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setShowAddForm(true)}>
                Register First Student Manually
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '22px', margin: 0 }}>Student Data</h2>
          {availableYears.length > 0 && (
            <select
              value={selectedYearFilter}
              onChange={(e) => {
                setSelectedYearFilter(e.target.value);
                setSelectedStudentRoll(null); // Reset detail view
                setSelectedDepartment(null); // Reset dept view to show overall charts
              }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All" style={{ background: '#090d16' }}>All Batches</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr} style={{ background: '#090d16' }}>Batch of {yr}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ width: '100%', marginTop: '12px' }}>
          <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Profile Template (Management)</h4>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Enter one section name per line (e.g. Skills, Projects, Education). Students will see these sections in their profile editor.</p>
            <textarea value={templateText} onChange={(e) => setTemplateText(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => { setTemplateText(''); setTemplateSavedMsg(''); }}>Clear</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate}>Save Template</button>
            </div>
            {templateSavedMsg && (<div style={{ marginTop: '8px', color: 'var(--color-success)' }}>{templateSavedMsg}</div>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {students.length > 0 && (
            <button 
              className="btn" 
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--color-error)', 
                border: '1px solid rgba(239, 68, 68, 0.2)' 
              }}
              onClick={() => {
                if (window.confirm('Guru garu, are you absolutely sure you want to delete all student manifests from this device?')) {
                  onClearAllStudents();
                }
              }}
            >
              Clear All Manifests
            </button>
          )}
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
          {students.length > 0 && (
            <button 
              className="btn" 
              style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: 'var(--color-success)', 
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={handleExportCSV}
            >
              <FileSpreadsheet size={16} />
              Export CSV
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => { setShowImportForm(!showImportForm); setShowAddForm(false); }}>
            {showImportForm ? 'Close Mass Upload' : 'Mass Upload Data (CSV/JSON/XLSX/TXT)'}
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
            Mass Upload Student Data
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Upload CSV, Excel (XLSX/XLS), JSON, or TXT files to register new student facilitators or bulk update existing activity metrics. 
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
              accept=".csv,.json,.txt,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={36} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                Drag and drop CSV, Excel, JSON, or TXT data here, or <span style={{ color: 'var(--color-primary)' }}>browse</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Supports standard SDC CSV headers, Excel spreadsheets, JSON arrays, or plain text records. Max 2MB.
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
              <input type="text" className="form-control" placeholder="e.g. 22JUCS001" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-control" placeholder="e.g. Name (x)" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-control" placeholder="student@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="text" className="form-control" placeholder="DD-MM-YYYY" value={dob} onChange={(e) => setDob(e.target.value)} />
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
              <label className="form-label">Top Skills</label>
              <input type="text" className="form-control" placeholder="e.g. Python, SQL, React" value={topSkills} onChange={(e) => setTopSkills(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Key Projects</label>
              <input type="text" className="form-control" placeholder="e.g. AI Chatbot, Portfolio Site" value={projects} onChange={(e) => setProjects(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Optional Management Message</label>
              <input type="text" className="form-control" placeholder="Message title" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Message Details</label>
              <textarea className="form-control" placeholder="Share opportunities or instructions" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} style={{ minHeight: '90px', resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Manifest Record</button>
            </div>
          </form>
        </div>
      )}

      {/* Stage Views */}
      {!selectedDepartment ? (
        /* STAGE 1: DEPARTMENTS GRID & CHARTS */
        <div>
          {/* SVG Charts Block */}
          {students.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              {/* Doughnut Chart */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Student Distribution Share</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ width: '140px', height: '140px', flexShrink: 0 }}>
                    <svg width="140" height="140" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                      {doughnutSegments.map((seg, idx) => (
                        <circle 
                          key={idx}
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="12"
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          transform="rotate(-90 60 60)"
                          style={{ transition: 'stroke-width 0.2s ease', cursor: 'pointer' }}
                        />
                      ))}
                      <g transform="translate(60, 62)">
                        <text textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700">
                          {totalCount}
                        </text>
                        <text textAnchor="middle" fill="var(--text-muted)" fontSize="6" dy="10" textTransform="uppercase" letterSpacing="1">
                          Facilitators
                        </text>
                      </g>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, minWidth: '160px' }}>
                    {doughnutSegments.map((seg, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>{seg.name}</span>
                        <span style={{ fontWeight: '600', marginLeft: '8px', color: 'var(--text-primary)' }}>{seg.count} ({seg.percent}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>



              {/* Batch Distribution Card */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Admission Cohort Batches</h4>
                {batchStats.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No batch data available</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {batchStats.map((batch) => {
                      const maxCount = Math.max(...batchStats.map(b => b.count));
                      const percent = maxCount > 0 ? (batch.count / maxCount) * 100 : 0;
                      return (
                        <div key={batch.year} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '80px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Batch {batch.year}</span>
                          <div style={{ flexGrow: 1, height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-primary) 100%)', borderRadius: '4px' }}></div>
                          </div>
                          <span style={{ width: '30px', fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', textAlign: 'right' }}>{batch.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Skill Frequency Card */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Trending SDC Skills</h4>
                {skillStats.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No skills configured</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {skillStats.map((skill) => {
                      const maxCount = Math.max(...skillStats.map(s => s.count));
                      const percent = maxCount > 0 ? (skill.count / maxCount) * 100 : 0;
                      return (
                        <div key={skill.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '90px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={skill.name}>{skill.name}</span>
                          <div style={{ flexGrow: 1, height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)', borderRadius: '4px' }}></div>
                          </div>
                          <span style={{ width: '30px', fontSize: '12px', fontWeight: '700', color: '#06b6d4', textAlign: 'right' }}>{skill.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Department Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {departmentStats.length === 0 ? (
              <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Guru garu, there are no student manifests registered yet. Please upload a CSV file or add a student manually above.
              </div>
            ) : (
              departmentStats.map((dept) => (
                <div 
                  key={dept.name} 
                  className="glass-card dept-card"
                  style={{
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                  onClick={() => {
                    setSelectedDepartment(dept.name);
                    setSelectedStudentRoll(null);
                    setSearchQuery('');
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', fontWeight: '600' }}>{dept.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Facilitators</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-primary)' }}>{dept.count}</span>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Overall Student Roster Table */}
          {students.length > 0 && (
            <div className="glass-card" style={{ marginTop: '32px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                  Overall Student Roster ({students.length} Facilitators)
                </h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Search name or roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      minWidth: '200px'
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 8px', fontWeight: '600' }}>Roll Number</th>
                      <th style={{ padding: '12px 8px', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '12px 8px', fontWeight: '600' }}>Department</th>
                      <th style={{ padding: '12px 8px', fontWeight: '600' }}>Skills</th>
                      <th style={{ padding: '12px 8px', fontWeight: '600' }}>Projects</th>
                      <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const searchFiltered = students.filter(s => {
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase().trim();
                          return (s.name || '').toLowerCase().includes(q) || (s.roll_number || '').toLowerCase().includes(q);
                        }
                        return true;
                      });

                      if (searchFiltered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" style={{ padding: '24px 8px', color: 'var(--text-muted)', textAlign: 'center' }}>
                              No facilitators matched the search query.
                            </td>
                          </tr>
                        );
                      }

                      // Group by batch year
                      const grouped = {};
                      searchFiltered.forEach(s => {
                        const yr = getYearFromRoll(s.roll_number);
                        if (!grouped[yr]) grouped[yr] = [];
                        grouped[yr].push(s);
                      });

                      return Object.keys(grouped).sort().map(year => (
                        <React.Fragment key={year}>
                          <tr>
                            <td colSpan="6" style={{
                              padding: '10px 8px',
                              fontWeight: '700',
                              color: 'var(--color-secondary)',
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
                              background: 'rgba(139, 92, 246, 0.02)'
                            }}>
                              Batch of {year} ({grouped[year].length} Facilitators)
                            </td>
                          </tr>
                          {grouped[year].map(student => (
                            <tr 
                              key={student.roll_number} 
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease', cursor: 'pointer' }}
                              className="table-row-hover"
                              onClick={() => setSelectedStudentRoll(student.roll_number)}
                            >
                              <td style={{ padding: '12px 8px', fontWeight: '600', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                                {student.roll_number}
                              </td>
                              <td style={{ padding: '12px 8px', fontWeight: '500' }}>{student.name}</td>
                              <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{student.department}</td>
                              <td style={{ padding: '12px 8px' }}>{student.top_skills || student.skills || ''}</td>
                              <td style={{ padding: '12px 8px' }}>{student.projects || ''}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '4px 10px', fontSize: '12px' }}
                                    onClick={() => setSelectedStudentRoll(student.roll_number)}
                                  >
                                    View Profile
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                    onClick={() => {
                                      if (window.confirm(`Guru garu, are you sure you want to delete ${student.name}'s record?`)) {
                                        onDeleteStudent(student.roll_number);
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : !selectedStudentRoll ? (
        /* STAGE 2: ROSTER STUDENT LIST */
        <div className="glass-card" style={{ padding: '24px' }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <button 
                onClick={() => { setSelectedDepartment(null); setSelectedStudentRoll(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
              >
                &larr; Back to Departments
              </button>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', color: 'var(--text-primary)' }}>
                {selectedDepartment} Facilitators
              </h3>
            </div>
            {/* Search & Sort Panel */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Search name or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '180px'
                }}
              />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="name-asc" style={{ background: '#090d16' }}>Name (A-Z)</option>
                <option value="name-desc" style={{ background: '#090d16' }}>Name (Z-A)</option>
                <option value="roll-asc" style={{ background: '#090d16' }}>Roll Number (Asc)</option>
                <option value="roll-desc" style={{ background: '#090d16' }}>Roll Number (Desc)</option>
              </select>
            </div>
          </div>

          {/* Student Roster Table */}
          {sortedStudents.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              No facilitators matched the search query.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>Roll Number</th>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>Skills</th>
                    <th style={{ padding: '12px 8px', fontWeight: '600' }}>Projects</th>
                    <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(studentsByYear).sort().map(year => (
                    <React.Fragment key={year}>
                      <tr>
                        <td colSpan="7" style={{
                          padding: '12px 8px',
                          fontWeight: '700',
                          color: 'var(--color-secondary)',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
                          background: 'rgba(139, 92, 246, 0.03)'
                        }}>
                          Batch of {year} ({studentsByYear[year].length} Facilitators)
                        </td>
                      </tr>
                      {studentsByYear[year].map((student) => {
                        return (
                          <tr 
                            key={student.roll_number} 
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease', cursor: 'pointer' }}
                            className="table-row-hover"
                            onClick={() => setSelectedStudentRoll(student.roll_number)}
                          >
                            <td style={{ padding: '14px 8px', fontWeight: '600', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{student.roll_number}</td>
                            <td style={{ padding: '14px 8px', fontWeight: '500' }}>{student.name}</td>
                            <td style={{ padding: '14px 8px' }}>{student.top_skills || student.skills || ''}</td>
                            <td style={{ padding: '14px 8px' }}>{student.projects || ''}</td>
                            <td style={{ padding: '14px 8px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => setSelectedStudentRoll(student.roll_number)}
                                >
                                  View Profile
                                </button>
                                <button 
                                  className="btn" 
                                  style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                  onClick={() => {
                                    if (window.confirm(`Guru garu, are you sure you want to delete ${student.name}'s record?`)) {
                                      onDeleteStudent(student.roll_number);
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* STAGE 3: SELECTED STUDENT DETAILED DASHBOARD & CHAT AGENT */
        (() => {
          const student = calculatedStudents.find(s => s.roll_number === selectedStudentRoll);
          if (!student) {
            setSelectedStudentRoll(null);
            return null;
          }

          const studentHasStandard = false;
          const presentKeys = Object.keys(student).filter(k => 
            k !== 'roll_number' && k !== 'name' && k !== 'department' && k !== 'metrics'
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <button 
                  onClick={() => setSelectedStudentRoll(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
                >
                  &larr; Back to {selectedDepartment} List
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                {/* Left Side: Student Details & Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Detailed Student Roster Card */}
                  <div className="student-card" style={{ margin: 0, width: '100%', display: 'block' }}>
                    <div className="student-header">
                      <div>
                        <h3 className="student-name" style={{ fontSize: '20px' }}>{student.name}</h3>
                        <span className="student-roll" style={{ fontSize: '13px' }}>{student.roll_number}</span>
                      </div>
                      {studentHasStandard && (
                        <div className="score-badge score-high" style={{ fontSize: '16px', padding: '6px 12px' }}>
                          {studentActivitySum} Total Activities
                        </div>
                      )}
                    </div>
                    <span className="student-dept" style={{ fontSize: '12px', display: 'inline-block', marginBottom: '16px' }}>{student.department || 'No Department'}</span>

                    {/* Standardized and Custom fields list */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {presentKeys.map(k => {
                        const labels = {
                          top_skills: 'Top Skills',
                          projects: 'Key Projects'
                        };
                        const label = labels[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const value = student[k];
                        
                        const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
                        const isLongValue = isUrl || (typeof value === 'string' && (value.length > 20 || value.includes(',') || value.includes('/')));
                        
                        if (isLongValue) {
                          return (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>{label}</span>
                              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: '1.4' }}>
                                {isUrl ? (
                                  <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                                    {value}
                                  </a>
                                ) : value}
                              </span>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={k} className="metric-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{value}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px' }}
                        onClick={() => {
                          if (window.confirm(`Guru garu, are you sure you want to delete ${student.name}'s record?`)) {
                            onDeleteStudent(student.roll_number);
                            setSelectedStudentRoll(null);
                          }
                        }}
                      >
                        Delete Record
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right Side: Charts & Discussion Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Contextual Chat Agent */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', height: '320px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bot size={16} />
                      Discuss {student.name}'s Analytics
                    </h4>
                    
                    {/* Discussion log */}
                    <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', fontSize: '12px' }}>
                      {studentChatMessages.map(msg => (
                        <div 
                          key={msg.id}
                          style={{
                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '90%',
                            background: msg.sender === 'user' ? 'rgba(6, 182, 212, 0.15)' : msg.sender === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            border: msg.sender === 'user' ? '1px solid rgba(6, 182, 212, 0.2)' : msg.sender === 'error' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            color: msg.sender === 'error' ? 'var(--color-error)' : 'var(--text-primary)',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', fontSize: '9px', color: 'var(--text-muted)' }}>
                            {msg.sender === 'user' ? <span>Guru</span> : msg.sender === 'error' ? <span style={{ color: 'var(--color-error)' }}>Security</span> : <span>Shishya</span>}
                          </div>
                          <div>{msg.text}</div>
                        </div>
                      ))}
                      {studentChatThinking && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                          <RefreshCw size={10} className="spin" style={{ color: 'var(--color-primary)' }} />
                          <span>Guru garu, I am contemplating...</span>
                        </div>
                      )}
                    </div>

                    {/* Chat Form */}
                    <form onSubmit={handleStudentChatSend} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Ask about their metrics..."
                        value={studentChatInput}
                        onChange={(e) => setStudentChatInput(e.target.value)}
                        disabled={studentChatThinking}
                        style={{
                          flexGrow: 1,
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontSize: '12px'
                        }}
                      />
                      <button 
                        type="submit" 
                        disabled={studentChatThinking || !studentChatInput.trim()}
                        style={{
                          background: 'var(--color-primary)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: (studentChatThinking || !studentChatInput.trim()) ? 0.5 : 1
                        }}
                      >
                        <Send size={12} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
