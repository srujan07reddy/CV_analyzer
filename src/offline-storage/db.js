// SDC Analytics Platform - Local IndexedDB Manager
const DB_NAME = 'SDC_Analytics_DB';
const DB_VERSION = 2;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('[DB] Database failed to open:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('[DB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('[DB] Running database upgrade/initialization...');

      // Store 1: Student Manifests
      if (!db.objectStoreNames.contains('students')) {
        db.createObjectStore('students', { keyPath: 'roll_number' });
        console.log('[DB] Created object store: students');
      }

      // Store 2: Outreach Metrics
      if (!db.objectStoreNames.contains('outreach')) {
        db.createObjectStore('outreach', { keyPath: 'id', autoIncrement: true });
        console.log('[DB] Created object store: outreach');
      }

      // Store 3: Priority Background Sync Queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        console.log('[DB] Created object store: sync_queue');
      }

      // Store 4: Groups Management
      if (!db.objectStoreNames.contains('groups')) {
        db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
        console.log('[DB] Created object store: groups');
      }
    };
  });
}

// Helper generic database transaction executor
function runTransaction(storeName, mode, callback) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      let request;
      try {
        request = callback(store);
      } catch (err) {
        reject(err);
        return;
      }

      transaction.oncomplete = () => {
        resolve(request ? request.result : null);
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

// Student CRUD
export function getAllStudents() {
  return runTransaction('students', 'readonly', (store) => store.getAll());
}

export function saveStudent(student) {
  return runTransaction('students', 'readwrite', (store) => store.put(student));
}

export function deleteStudent(roll_number) {
  return runTransaction('students', 'readwrite', (store) => store.delete(roll_number));
}

export function getStudent(roll_number) {
  return runTransaction('students', 'readonly', (store) => store.get(roll_number));
}

export function clearAllStudents() {
  return runTransaction('students', 'readwrite', (store) => store.clear());
}

// Outreach CRUD
export function getAllOutreach() {
  return runTransaction('outreach', 'readonly', (store) => store.getAll());
}

export function saveOutreach(outreach) {
  return runTransaction('outreach', 'readwrite', (store) => store.put(outreach));
}

export function deleteOutreach(id) {
  return runTransaction('outreach', 'readwrite', (store) => store.delete(id));
}

export function clearAllOutreach() {
  return runTransaction('outreach', 'readwrite', (store) => store.clear());
}

// Groups CRUD
export function getAllGroups() {
  return runTransaction('groups', 'readonly', (store) => store.getAll());
}

export function saveGroup(group) {
  return runTransaction('groups', 'readwrite', (store) => store.put(group));
}

export function deleteGroup(id) {
  return runTransaction('groups', 'readwrite', (store) => store.delete(id));
}

export function clearAllGroups() {
  return runTransaction('groups', 'readwrite', (store) => store.clear());
}

// Sync Queue Helpers
export function getSyncQueue() {
  return runTransaction('sync_queue', 'readonly', (store) => store.getAll());
}

export function addToSyncQueue(action, entityType, data) {
  const queueItem = {
    action, // 'SAVE' or 'DELETE'
    entityType, // 'student' or 'outreach'
    data,
    timestamp: Date.now()
  };
  return runTransaction('sync_queue', 'readwrite', (store) => store.add(queueItem));
}

export function removeFromSyncQueue(id) {
  return runTransaction('sync_queue', 'readwrite', (store) => store.delete(id));
}

export function clearSyncQueue() {
  return runTransaction('sync_queue', 'readwrite', (store) => {
    return store.clear();
  });
}
