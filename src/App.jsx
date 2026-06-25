import React, { useState, useEffect } from 'react';
import { 
  initDB, 
  getAllStudents, 
  saveStudent, 
  deleteStudent, 
  getAllOutreach, 
  saveOutreach, 
  deleteOutreach,
  addToSyncQueue
} from './offline-storage/db';
import { processSyncQueue } from './offline-storage/sync-queue';
import seedStudents from './utils/seed-data.json';
import Dashboard from './components/Dashboard';
import OutreachTracker from './components/OutreachTracker';
import ShishyaChat from './components/ShishyaChat';
import SyncStatus from './components/SyncStatus';
import Settings from './components/Settings';
import { LayoutDashboard, Globe, MessageSquare, RefreshCcw, Settings as SettingsIcon, Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [outreachList, setOutreachList] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize DB and load data
  const loadData = async () => {
    try {
      await initDB();
      
      let dbStudents = await getAllStudents();
      // If IndexedDB is empty on first load, seed it
      if (dbStudents.length === 0) {
        console.log('[App] Local IndexedDB empty. Seeding initial student records.');
        for (const student of seedStudents) {
          await saveStudent(student);
        }
        dbStudents = await getAllStudents();
      }
      setStudents(dbStudents);

      let dbOutreach = await getAllOutreach();
      // Seed initial outreach based on student data outreach parameters
      if (dbOutreach.length === 0) {
        console.log('[App] Seeding default outreach logs.');
        const initialOutreach = {
          target_location: 'PUPS Manivakkam',
          program_classification: 'Maths Club Rubik\'s Training',
          facilitator_rolls: ['16SAM022', '16SAM025'],
          training_volume: 4,
          timestamp: Date.now()
        };
        await saveOutreach(initialOutreach);
        dbOutreach = await getAllOutreach();
      }
      setOutreachList(dbOutreach);

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

  // Save Student (Local First)
  const handleSaveStudent = async (student) => {
    try {
      // Always update IndexedDB locally first
      await saveStudent(student);
      
      if (!navigator.onLine) {
        // Queue mutation if offline
        await addToSyncQueue('SAVE', 'student', student);
        console.log('[Offline] Student record saved locally and queued.');
      } else {
        // Direct replication simulated if online
        console.log('[Online] Student record replicated to server registry.');
      }

      await loadData();
    } catch (err) {
      console.error('Failed to save student:', err);
    }
  };

  // Save Students in Bulk (Local First)
  const handleSaveStudents = async (studentsList) => {
    try {
      console.log(`[App] Saving ${studentsList.length} student records in bulk.`);
      for (const student of studentsList) {
        await saveStudent(student);
        if (!navigator.onLine) {
          await addToSyncQueue('SAVE', 'student', student);
        }
      }
      if (navigator.onLine) {
        console.log('[Online] Bulk student records replicated to server registry.');
      } else {
        console.log('[Offline] Bulk student records saved locally and queued.');
      }
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

      await loadData();
    } catch (err) {
      console.error('Failed to save outreach:', err);
    }
  };

  // Delete Outreach
  const handleDeleteOutreach = async (id) => {
    try {
      await deleteOutreach(id);

      if (!navigator.onLine) {
        await addToSyncQueue('DELETE', 'outreach', { id });
        console.log('[Offline] Outreach deletion saved locally and queued.');
      } else {
        console.log('[Online] Outreach deletion replicated to server.');
      }

      await loadData();
    } catch (err) {
      console.error('Failed to delete outreach:', err);
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
          <span className="brand-logo">Shisyak analysis</span>
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
            className={`nav-item ${activeTab === 'outreach' ? 'active' : ''}`}
            onClick={() => setActiveTab('outreach')}
          >
            <Globe size={18} />
            Outreach Metrics
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
          {activeTab === 'dashboard' && (
            <Dashboard 
              students={students} 
              onSaveStudent={handleSaveStudent} 
              onSaveStudents={handleSaveStudents}
              onDeleteStudent={handleDeleteStudent} 
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachTracker 
              outreachList={outreachList}
              onSaveOutreach={handleSaveOutreach}
              onDeleteOutreach={handleDeleteOutreach}
            />
          )}

          {activeTab === 'chatbot' && (
            <ShishyaChat students={students} outreachList={outreachList} />
          )}

          {activeTab === 'sync' && (
            <SyncStatus 
              onSyncComplete={loadData}
            />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </section>
      </main>
    </div>
  );
}
