// SDC Analytics Platform - Local-First Sync Queue
import { 
  getSyncQueue, 
  removeFromSyncQueue
} from './db';
import { supabase } from '../supabaseClient';

// Subscribable listeners for sync events (to update frontend state)
const syncListeners = new Set();

export function subscribeToSync(listener) {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

function notifySyncStatus(status, details) {
  syncListeners.forEach(listener => listener({ status, details, timestamp: Date.now() }));
}

let isSyncing = false;

export async function processSyncQueue() {
  if (isSyncing) return;
  if (!navigator.onLine) {
    console.log('[Sync Queue] Device is offline. Postponing synchronization.');
    notifySyncStatus('offline', 'Device is offline. Queued items are saved locally.');
    return;
  }

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      console.log('[Sync Queue] No pending modifications in queue.');
      notifySyncStatus('synced', 'All local mutations synchronized.');
      return;
    }

    isSyncing = true;
    notifySyncStatus('syncing', `Synchronizing ${queue.length} pending mutations...`);

    // Sort by timestamp to ensure modifications are processed in order
    queue.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of queue) {
      try {
        console.log(`[Sync Queue] Replaying action: ${item.action} on ${item.entityType}`, item.data);
        
        let response;
        if (item.action === 'SAVE') {
          switch (item.entityType) {
            case 'student':
              response = await supabase.from('students').upsert(item.data);
              break;
            case 'outreach':
              response = await supabase.from('outreach').upsert(item.data);
              break;
            case 'group':
              response = await supabase.from('groups').upsert(item.data);
              break;
            case 'message':
              response = await supabase.from('messages').upsert(item.data);
              break;
            case 'template':
              response = await supabase.from('templates').upsert(item.data);
              break;
            default:
              console.warn('[Sync Queue] Unknown save entity:', item.entityType);
          }
        } else if (item.action === 'DELETE') {
          switch (item.entityType) {
            case 'student':
              response = await supabase.from('students').delete().eq('roll_number', item.data.roll_number);
              break;
            case 'outreach':
              response = await supabase.from('outreach').delete().eq('id', item.data.id);
              break;
            case 'group':
              response = await supabase.from('groups').delete().eq('id', item.data.id);
              break;
            case 'message':
              response = await supabase.from('messages').delete().eq('id', item.data.id);
              break;
            case 'template':
              response = await supabase.from('templates').delete().eq('id', item.data.id);
              break;
            default:
              console.warn('[Sync Queue] Unknown delete entity:', item.entityType);
          }
        }

        if (response && response.error) {
          throw new Error(response.error.message);
        }

        await removeFromSyncQueue(item.id);
      } catch (itemErr) {
        console.error(`[Sync Queue] Failed to process queue item ID ${item.id}:`, itemErr);
        notifySyncStatus('error', `Failed to sync item: ${itemErr.message}`);
        // Pause sync and retry later to prevent blocking or loss of order
        isSyncing = false;
        return;
      }
    }

    isSyncing = false;
    console.log('[Sync Queue] All items in sync queue successfully replayed.');
    notifySyncStatus('synced', 'All local mutations synchronized with live Database.');
  } catch (err) {
    isSyncing = false;
    console.error('[Sync Queue] Critical error processing sync queue:', err);
    notifySyncStatus('error', `Sync failed: ${err.message}`);
  }
}

// Automatically bind to browser network state triggers
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Connectivity restored. Initiating automatic handshake.');
    processSyncQueue();
  });
  window.addEventListener('offline', () => {
    console.log('[Network] Connectivity lost.');
    notifySyncStatus('offline', 'Network offline. Operations will be queued.');
  });
}
