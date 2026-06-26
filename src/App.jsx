import React, { useState, useEffect } from 'react';
import { 
  initDB, 
  getAllStudents, 
  saveStudent, 
  deleteStudent, 
  getStudent,
  clearAllStudents,
  getAllOutreach, 
  saveOutreach, 
  deleteOutreach,
  clearAllOutreach,
  getAllGroups,
  saveGroup,
  deleteGroup,
  clearAllGroups,
  addToSyncQueue
} from './offline-storage/db';
import { processSyncQueue } from './offline-storage/sync-queue';
import seedStudents from './utils/seed-data.json';
import Dashboard from './components/Dashboard';
import OutreachTracker from './components/OutreachTracker';
import ShishyaChat from './components/ShishyaChat';
import SyncStatus from './components/SyncStatus';
import Settings from './components/Settings';
import GroupsTracker from './components/GroupsTracker';
import FloatingChat from './components/FloatingChat';
import CVAnalyzer from './components/CVAnalyzer';
import { LayoutDashboard, Globe, MessageSquare, RefreshCcw, Settings as SettingsIcon, Wifi, WifiOff, Users, BrainCircuit } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [outreachList, setOutreachList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sync student records' outreach visits count to outreach logs table
  const syncOutreachLogs = async (studentsList) => {
    try {
      const dbOutreach = await getAllOutreach();
      const loggedVolumes = {};
      dbOutreach.forEach(o => {
        if (Array.isArray(o.facilitator_rolls)) {
          o.facilitator_rolls.forEach(roll => {
            const r = roll.toUpperCase().trim();
            loggedVolumes[r] = (loggedVolumes[r] || 0) + (parseInt(o.training_volume || 0, 10));
          });
        }
      });

      for (const student of studentsList) {
        const roll = student.roll_number.toUpperCase().trim();
        const outreachKey = Object.keys(student).find(k => {
          const clean = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
          return clean.includes('outreach') || clean.includes('visit') || clean.includes('pups');
        });
        const studentOutreach = outreachKey ? parseInt(student[outreachKey] || 0, 10) : 0;
        const logged = loggedVolumes[roll] || 0;
        if (studentOutreach > logged) {
          const diff = studentOutreach - logged;
          const newOutreach = {
            target_location: 'PUPS Manivakkam',
            program_classification: 'Rubik\'s Cube Training',
            facilitator_rolls: [roll],
            training_volume: diff,
            timestamp: Date.now()
          };
          const savedId = await saveOutreach(newOutreach);
          const outreachWithId = { ...newOutreach, id: savedId };
          if (!navigator.onLine) {
            await addToSyncQueue('SAVE', 'outreach', outreachWithId);
          }
        }
      }
    } catch (err) {
      console.error('[Sync] Error syncing outreach logs:', err);
    }
  };

  // Initialize DB and load data
  const loadData = async () => {
    try {
      await initDB();
      
      let dbStudents = await getAllStudents();
      let dbOutreach = await getAllOutreach();

      // Sync outreach logs from student list
      await syncOutreachLogs(dbStudents);

      // Fetch final datasets after sync to populate states
      const finalStudents = await getAllStudents();
      const finalOutreach = await getAllOutreach();
      const finalGroups = await getAllGroups();

      setStudents(finalStudents);
      setOutreachList(finalOutreach);
      setGroupsList(finalGroups);

    } catch (err) {
      console.error('[App] Failed to load data from IndexedDB:', err);
    }
  };

  useEffect(() => {
    loadData();

    const handleConnectionChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    // Initial background sync check
    if (navigator.onLine) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  const mergeStudentRecords = (existing, incoming) => {
    if (!existing) return incoming;
    const merged = { ...existing };
    Object.keys(incoming).forEach(key => {
      const incomingVal = incoming[key];
      const existingVal = existing[key];
      if (existingVal === undefined) {
        merged[key] = incomingVal;
      } else {
        if (typeof incomingVal === 'number' && typeof existingVal === 'number') {
          merged[key] = Math.max(existingVal, incomingVal);
        } else if (incomingVal !== '' && incomingVal !== undefined && incomingVal !== null) {
          merged[key] = incomingVal;
        }
      }
    });
    return merged;
  };

  // Save Student (Local First)
  const handleSaveStudent = async (student) => {
    try {
      const existing = await getStudent(student.roll_number);
      const merged = mergeStudentRecords(existing, student);
      await saveStudent(merged);
      
      if (!navigator.onLine) {
        // Queue mutation if offline
        await addToSyncQueue('SAVE', 'student', merged);
        console.log('[Offline] Student record saved locally and queued.');
      } else {
        // Direct replication simulated if online
        console.log('[Online] Student record replicated to server registry.');
      }

      await syncOutreachLogs([merged]);
      await loadData();
    } catch (err) {
      console.error('Failed to save student:', err);
    }
  };

  // Save Students in Bulk (Local First)
  const handleSaveStudents = async (studentsList) => {
    try {
      console.log(`[App] Saving ${studentsList.length} student records in bulk.`);
      const mergedStudents = [];
      for (const student of studentsList) {
        const existing = await getStudent(student.roll_number);
        const merged = mergeStudentRecords(existing, student);
        await saveStudent(merged);
        mergedStudents.push(merged);
        if (!navigator.onLine) {
          await addToSyncQueue('SAVE', 'student', merged);
        }
      }
      if (navigator.onLine) {
        console.log('[Online] Bulk student records replicated to server registry.');
      } else {
        console.log('[Offline] Bulk student records saved locally and queued.');
      }
      await syncOutreachLogs(mergedStudents);
      await loadData();
    } catch (err) {
      console.error('Failed to save bulk students:', err);
      throw err;
    }
  };

  // Delete Student
  const handleDeleteStudent = async (rollNumber) => {
    try {
      await deleteStudent(rollNumber);

      if (!navigator.onLine) {
        await addToSyncQueue('DELETE', 'student', { roll_number: rollNumber });
        console.log('[Offline] Student deletion saved locally and queued.');
      } else {
        console.log('[Online] Student deletion replicated to server.');
      }

      await loadData();
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  // Clear All Students and Outreach Logs
  const handleClearAllStudents = async () => {
    try {
      const currentStudents = await getAllStudents();
      for (const student of currentStudents) {
        if (!navigator.onLine) {
          await addToSyncQueue('DELETE', 'student', { roll_number: student.roll_number });
        }
      }
      
      const currentOutreach = await getAllOutreach();
      for (const outreach of currentOutreach) {
        if (!navigator.onLine && outreach.id) {
          await addToSyncQueue('DELETE', 'outreach', { id: outreach.id });
        }
      }

      await clearAllStudents();
      await clearAllOutreach();
      await clearAllGroups();
      localStorage.setItem('sdc_has_seeded', 'true');
      await loadData();
    } catch (err) {
      console.error('Failed to clear all students, outreach, and groups:', err);
    }
  };

  // Save Outreach
  const handleSaveOutreach = async (outreach) => {
    try {
      const savedId = await saveOutreach(outreach);
      const outreachWithId = { ...outreach, id: savedId };

      if (!navigator.onLine) {
        await addToSyncQueue('SAVE', 'outreach', outreachWithId);
        console.log('[Offline] Outreach log saved locally and queued.');
      } else {
        console.log('[Online] Outreach log replicated to server.');
      }

      // Update student records' outreach visits count for listed facilitators
      if (Array.isArray(outreach.facilitator_rolls)) {
        for (const roll of outreach.facilitator_rolls) {
          const student = await getStudent(roll);
          if (student) {
            const outreachKey = Object.keys(student).find(k => {
              const clean = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
              return clean.includes('outreach') || clean.includes('visit') || clean.includes('pups');
            }) || 'Outreach Visits';
            const currentVisits = parseInt(student[outreachKey] || 0, 10);
            student[outreachKey] = currentVisits + parseInt(outreach.training_volume || 0, 10);
            await saveStudent(student);
            if (!navigator.onLine) {
              await addToSyncQueue('SAVE', 'student', student);
            }
          }
        }
      }

      await loadData();
    } catch (err) {
      console.error('Failed to save outreach:', err);
    }
  };

  // Delete Outreach
  const handleDeleteOutreach = async (id) => {
    try {
      const dbOutreach = await getAllOutreach();
      const outreachToDelete = dbOutreach.find(o => o.id === id);

      await deleteOutreach(id);

      if (!navigator.onLine) {
        await addToSyncQueue('DELETE', 'outreach', { id });
        console.log('[Offline] Outreach deletion saved locally and queued.');
      } else {
        console.log('[Online] Outreach deletion replicated to server.');
      }

      // Decrement student records' outreach visits count for listed facilitators
      if (outreachToDelete && Array.isArray(outreachToDelete.facilitator_rolls)) {
        for (const roll of outreachToDelete.facilitator_rolls) {
          const student = await getStudent(roll);
          if (student) {
            const outreachKey = Object.keys(student).find(k => {
              const clean = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
              return clean.includes('outreach') || clean.includes('visit') || clean.includes('pups');
            }) || 'Outreach Visits';
            const currentVisits = parseInt(student[outreachKey] || 0, 10);
            const decVolume = parseInt(outreachToDelete.training_volume || 0, 10);
            student[outreachKey] = Math.max(0, currentVisits - decVolume);
            await saveStudent(student);
            if (!navigator.onLine) {
              await addToSyncQueue('SAVE', 'student', student);
            }
          }
        }
      }

      await loadData();
    } catch (err) {
      console.error('Failed to delete outreach:', err);
    }
  };

  // Save Group
  const handleSaveGroup = async (group) => {
    try {
      await saveGroup(group);
      await loadData();
    } catch (err) {
      console.error('Failed to save group:', err);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (id) => {
    try {
      await deleteGroup(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Decorative Glow Elements */}
      <div className="glow-effect glow-cyan"></div>
      <div className="glow-effect glow-violet"></div>

      {/* Header bar */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">Jeppiaar Shikshak CV Analyzer</span>
        </div>
        <div className={`network-badge ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'Online mode' : 'Offline mode'}
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="dashboard-grid">
        {/* Navigation Sidebar */}
        <aside className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Overview Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'cvanalyzer' ? 'active' : ''}`}
            onClick={() => setActiveTab('cvanalyzer')}
          >
            <BrainCircuit size={18} />
            CV Analyzer
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'outreach' ? 'active' : ''}`}
            onClick={() => setActiveTab('outreach')}
          >
            <Globe size={18} />
            Outreach Metrics
          </button>

          <button 
            className={`nav-item ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            <Users size={18} />
            Communities & Groups
          </button>

          <button 
            className={`nav-item ${activeTab === 'chatbot' ? 'active' : ''}`}
            onClick={() => setActiveTab('chatbot')}
          >
            <MessageSquare size={18} />
            Shishya Chatbot
          </button>

          <button 
            className={`nav-item ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            <RefreshCcw size={18} />
            Database Sync
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} />
            System Settings
          </button>
        </aside>

        {/* Dynamic Display Panel */}
        <section className="dashboard-content">
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard 
              students={students} 
              onSaveStudent={handleSaveStudent} 
              onSaveStudents={handleSaveStudents}
              onDeleteStudent={handleDeleteStudent} 
              onClearAllStudents={handleClearAllStudents}
            />
          </div>

          <div style={{ display: activeTab === 'cvanalyzer' ? 'block' : 'none' }}>
            <CVAnalyzer students={students} onSaveStudent={handleSaveStudent} />
          </div>

          <div style={{ display: activeTab === 'outreach' ? 'block' : 'none' }}>
            <OutreachTracker 
              outreachList={outreachList}
              onSaveOutreach={handleSaveOutreach}
              onDeleteOutreach={handleDeleteOutreach}
            />
          </div>

          <div style={{ display: activeTab === 'groups' ? 'block' : 'none' }}>
            <GroupsTracker 
              groupsList={groupsList}
              onSaveGroup={handleSaveGroup}
              onDeleteGroup={handleDeleteGroup}
            />
          </div>

          <div style={{ display: activeTab === 'chatbot' ? 'block' : 'none' }}>
            <ShishyaChat students={students} outreachList={outreachList} />
          </div>

          <div style={{ display: activeTab === 'sync' ? 'block' : 'none' }}>
            <SyncStatus 
              onSyncComplete={loadData}
            />
          </div>

          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
            <Settings />
          </div>
        </section>
      </main>
      {activeTab !== 'chatbot' && (
        <FloatingChat students={students} outreachList={outreachList} />
      )}
    </div>
  );
}
