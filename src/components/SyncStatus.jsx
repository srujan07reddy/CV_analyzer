import React, { useState, useEffect } from 'react';
import { getSyncQueue, clearSyncQueue } from '../offline-storage/db';
import { processSyncQueue, subscribeToSync } from '../offline-storage/sync-queue';
import { RefreshCw, Wifi, WifiOff, Trash2 } from 'lucide-react';

export default function SyncStatus({ onSyncComplete }) {
  const [queue, setQueue] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncingState, setSyncingState] = useState('idle'); // idle, syncing, error

  const updateQueue = async () => {
    try {
      const q = await getSyncQueue();
      setQueue(q);
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  };

  useEffect(() => {
    updateQueue();
    
    // Subscribe to background sync process updates
    const unsubscribe = subscribeToSync(({ status, details }) => {
      setSyncingState(status);
      const timestamp = new Date().toLocaleTimeString();
      setSyncLogs(prev => [`[${timestamp}] [STATUS: ${status.toUpperCase()}] ${details}`, ...prev]);
      
      // Update queue view on change
      updateQueue();

      // Trigger parents list refresh if sync completed successfully
      if (status === 'synced' && onSyncComplete) {
        onSyncComplete();
      }
    });

    const handleNetworkChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [onSyncComplete]);

  const handleManualSync = async () => {
    const timestamp = new Date().toLocaleTimeString();
    setSyncLogs(prev => [`[${timestamp}] Initiating manual database handshake...`, ...prev]);
    await processSyncQueue();
    await updateQueue();
  };

  const handleClearQueue = async () => {
    if (window.confirm('Guru garu, are you sure you wish to clear all pending local mutations from the sync queue?')) {
      await clearSyncQueue();
      await updateQueue();
      const timestamp = new Date().toLocaleTimeString();
      setSyncLogs(prev => [`[${timestamp}] Sync queue cleared by administrator.`, ...prev]);
    }
  };

  return (
    <div className="tab-content">
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isOnline ? <Wifi size={24} style={{ color: 'var(--color-success)' }} /> : <WifiOff size={24} style={{ color: 'var(--color-error)' }} />}
          Reconciliation & Database Sync Dashboard
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Connection Status</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: isOnline ? 'var(--color-success)' : 'var(--color-error)' }}>
              {isOnline ? 'Online (Connected)' : 'Offline (Disconnected)'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pending Queue Items</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{queue.length} mutations</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleManualSync} disabled={!isOnline || syncingState === 'syncing'}>
              <RefreshCw size={16} className={syncingState === 'syncing' ? 'spin' : ''} />
              Replay Queue
            </button>
            <button className="btn btn-secondary" onClick={handleClearQueue} disabled={queue.length === 0}>
              <Trash2 size={16} />
              Clear Queue
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Queue Items */}
        <div className="glass-card">
          <h3 className="card-title">Pending Local Operations</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {queue.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '10px', 
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}
              >
                <div>
                  <span style={{ 
                    background: item.action === 'SAVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    color: item.action === 'SAVE' ? 'var(--color-success)' : 'var(--color-error)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginRight: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {item.action}
                  </span>
                  <strong>{item.entityType.toUpperCase()}</strong>: {item.data.name || item.data.target_location || item.data.roll_number || item.data.id}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            
            {queue.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                No pending operations. Database is fully in sync.
              </div>
            )}
          </div>
        </div>

        {/* Sync logs */}
        <div className="glass-card">
          <h3 className="card-title">Synchronization Logs</h3>
          <div className="sync-log-card">
            {syncLogs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '6px' }}>{log}</div>
            ))}
            {syncLogs.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Logs will stream here upon database handshake...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
