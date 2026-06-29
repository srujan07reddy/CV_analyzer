import { supabase } from '../supabaseClient';
import { getYearFromRoll } from '../utils/importer';

// Helper to handle Supabase responses
const handleResponse = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Map Vite frontend student structure to Supabase DB structure
export function mapStudentToDB(student) {
  if (!student) return null;
  const dbStudent = {};
  
  // Direct mappings for valid columns only
  if (student.roll_number) dbStudent.roll_number = student.roll_number;
  if (student.name) dbStudent.name = student.name;
  if (student.email) dbStudent.email = student.email;
  if (student.department) dbStudent.department = student.department;
  if (student.dob) dbStudent.dob = student.dob;
  if (student.address) dbStudent.address = student.address;
  if (student.objective) dbStudent.objective = student.objective;
  if (student.education) dbStudent.education = student.education;
  if (student.portfolio) dbStudent.portfolio = student.portfolio;
  if (student.github_link) dbStudent.github_link = student.github_link;
  if (student.linkedin_link) dbStudent.linkedin_link = student.linkedin_link;

  // Map top_skills (string) to skills (text[])
  if ('top_skills' in student) {
    dbStudent.skills = student.top_skills 
      ? String(student.top_skills).split(',').map(s => s.trim()).filter(Boolean) 
      : [];
  } else if ('skills' in student) {
    dbStudent.skills = Array.isArray(student.skills) ? student.skills : [String(student.skills)];
  }
  
  // Map projects (string) to projects (jsonb array of objects)
  if ('projects' in student) {
    if (typeof student.projects === 'string') {
      dbStudent.projects = student.projects 
        ? student.projects.split(',').map(p => ({ title: p.trim(), description: '', git_link: '' })).filter(p => p.title)
        : [];
    } else if (Array.isArray(student.projects)) {
      dbStudent.projects = student.projects;
    } else if (student.projects) {
      dbStudent.projects = [student.projects];
    } else {
      dbStudent.projects = [];
    }
  }
  
  // Map phone (string) or whatsapp (string) to whatsapp (string)
  if (student.phone) {
    dbStudent.whatsapp = student.phone;
  } else if (student.whatsapp) {
    dbStudent.whatsapp = student.whatsapp;
  }

  // Derive batch if missing, based on roll number
  if (student.batch) {
    dbStudent.batch = student.batch;
  } else if (dbStudent.roll_number) {
    const yr = getYearFromRoll(dbStudent.roll_number);
    dbStudent.batch = yr && yr !== 'Unknown' ? yr : '2026';
  }

  // Make sure we update updated_at
  dbStudent.updated_at = new Date().toISOString();

  return dbStudent;
}

// Map Supabase DB student structure to Vite frontend structure
export function mapStudentFromDB(dbStudent) {
  if (!dbStudent) return null;
  const student = { ...dbStudent };
  
  // Map skills (text[]) to top_skills (string)
  if ('skills' in student) {
    student.top_skills = Array.isArray(student.skills) 
      ? student.skills.join(', ') 
      : (student.skills || '');
  } else {
    student.top_skills = '';
  }
  
  // Map projects (jsonb array of objects) to projects (string)
  if ('projects' in student) {
    if (Array.isArray(student.projects)) {
      student.projects = student.projects
        .filter(Boolean)
        .map(p => (typeof p === 'object' ? (p.title || p.name || '') : String(p)))
        .filter(Boolean)
        .join(', ');
    } else if (typeof student.projects !== 'string') {
      student.projects = '';
    }
  } else {
    student.projects = '';
  }
  
  // Map whatsapp (string) to phone (string)
  if ('whatsapp' in student) {
    student.phone = student.whatsapp;
  } else {
    student.phone = '';
  }
  
  return student;
}

// Local Cache Helpers
const getLocal = (key) => {
  try {
    const raw = localStorage.getItem(`sdc_cache_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const setLocal = (key, data) => {
  try {
    localStorage.setItem(`sdc_cache_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to set local cache for ${key}:`, e);
  }
};

// Student CRUD
export async function getAllStudents() {
  if (navigator.onLine) {
    try {
      const res = await supabase.from('students').select('*');
      const rawData = handleResponse(res) || [];
      const data = rawData.map(mapStudentFromDB);
      setLocal('students', data);
      return data;
    } catch (err) {
      console.warn('[Offline Fallback] Failed to fetch students from Supabase, loading from cache:', err);
    }
  }
  const cached = getLocal('students') || [];
  return cached.map(mapStudentFromDB);
}

export async function saveStudent(student) {
  // Update local cache first (stored in frontend format)
  const cache = getLocal('students') || [];
  const idx = cache.findIndex(s => s.roll_number === student.roll_number);
  if (idx > -1) {
    cache[idx] = { ...cache[idx], ...student };
  } else {
    cache.push(student);
  }
  setLocal('students', cache);

  if (navigator.onLine) {
    try {
      const dbStudent = mapStudentToDB(student);
      const res = await supabase.from('students').upsert(dbStudent).select();
      const rawSaved = handleResponse(res);
      return rawSaved ? rawSaved.map(mapStudentFromDB) : [student];
    } catch (err) {
      console.error('[Supabase Upsert Error] Failed to upsert student to Supabase:', err);
      throw err;
    }
  } else {
    await addToSyncQueue('SAVE', 'student', student);
    return [student];
  }
}

export async function saveStudentsBulk(studentsList) {
  if (!studentsList || studentsList.length === 0) return [];

  // Update local cache first
  const cache = getLocal('students') || [];
  studentsList.forEach(student => {
    const idx = cache.findIndex(s => s.roll_number === student.roll_number);
    if (idx > -1) {
      cache[idx] = { ...cache[idx], ...student };
    } else {
      cache.push(student);
    }
  });
  setLocal('students', cache);

  if (navigator.onLine) {
    try {
      const dbStudents = studentsList.map(mapStudentToDB);
      const res = await supabase.from('students').upsert(dbStudents).select();
      const rawSaved = handleResponse(res);
      return rawSaved ? rawSaved.map(mapStudentFromDB) : studentsList;
    } catch (err) {
      console.error('[Supabase Bulk Upsert Error] Failed to upsert students in bulk to Supabase:', err);
      throw err;
    }
  } else {
    for (const student of studentsList) {
      await addToSyncQueue('SAVE', 'student', student);
    }
    return studentsList;
  }
}

export async function deleteStudent(roll_number) {
  const cache = getLocal('students') || [];
  const filtered = cache.filter(s => s.roll_number !== roll_number);
  setLocal('students', filtered);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('students').delete().eq('roll_number', roll_number);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Queue] Failed to delete student from Supabase, queuing deletion:', err);
      await addToSyncQueue('DELETE', 'student', { roll_number });
      return null;
    }
  } else {
    await addToSyncQueue('DELETE', 'student', { roll_number });
    return null;
  }
}

export async function getStudent(roll_number) {
  if (navigator.onLine) {
    try {
      const res = await supabase.from('students').select('*').eq('roll_number', roll_number).single();
      if (res.error) {
        if (res.error.code === 'PGRST116') return null; // PostgREST code for "not found"
        throw new Error(res.error.message);
      }
      const mapped = mapStudentFromDB(res.data);
      const cache = getLocal('students') || [];
      const idx = cache.findIndex(s => s.roll_number === roll_number);
      if (idx > -1) {
        cache[idx] = mapped;
      } else {
        cache.push(mapped);
      }
      setLocal('students', cache);
      return mapped;
    } catch (err) {
      console.warn('[Offline Fallback] Failed to fetch student from Supabase, loading from cache:', err);
    }
  }
  const cache = getLocal('students') || [];
  return cache.find(s => s.roll_number === roll_number) || null;
}

export async function clearAllStudents() {
  setLocal('students', []);
  if (navigator.onLine) {
    try {
      const res = await supabase.from('students').delete().neq('roll_number', 'impossible_val');
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Fallback] Failed to delete all students from Supabase.', err);
    }
  }
  return [];
}

// Outreach CRUD
export async function getAllOutreach() {
  if (navigator.onLine) {
    try {
      const res = await supabase.from('outreach').select('*');
      const data = handleResponse(res) || [];
      setLocal('outreach', data);
      return data;
    } catch (err) {
      console.warn('[Offline Fallback] Failed to fetch outreach from Supabase, loading from cache:', err);
    }
  }
  return getLocal('outreach') || [];
}

export async function saveOutreach(outreach) {
  // Update local cache first
  const cache = getLocal('outreach') || [];
  let tempId = outreach.id;
  if (!tempId) {
    tempId = 'temp_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }
  const toSave = { ...outreach, id: tempId };
  
  const idx = cache.findIndex(o => o.id === tempId);
  if (idx > -1) {
    cache[idx] = toSave;
  } else {
    cache.push(toSave);
  }
  setLocal('outreach', cache);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('outreach').upsert(outreach).select();
      const data = handleResponse(res);
      const saved = data && data[0] ? data[0] : null;
      if (saved) {
        // replace temp item with real saved one
        const updatedCache = getLocal('outreach') || [];
        const tIdx = updatedCache.findIndex(o => o.id === tempId);
        if (tIdx > -1) {
          updatedCache[tIdx] = saved;
        } else {
          updatedCache.push(saved);
        }
        setLocal('outreach', updatedCache);
        return saved.id;
      }
      return tempId;
    } catch (err) {
      console.warn('[Offline Queue] Failed to upsert outreach to Supabase, queuing mutation:', err);
      await addToSyncQueue('SAVE', 'outreach', toSave);
      return tempId;
    }
  } else {
    await addToSyncQueue('SAVE', 'outreach', toSave);
    return tempId;
  }
}

export async function deleteOutreach(id) {
  const cache = getLocal('outreach') || [];
  const filtered = cache.filter(o => o.id !== id);
  setLocal('outreach', filtered);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('outreach').delete().eq('id', id);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Queue] Failed to delete outreach from Supabase, queuing deletion:', err);
      await addToSyncQueue('DELETE', 'outreach', { id });
      return null;
    }
  } else {
    await addToSyncQueue('DELETE', 'outreach', { id });
    return null;
  }
}

export async function clearAllOutreach() {
  setLocal('outreach', []);
  if (navigator.onLine) {
    try {
      const res = await supabase.from('outreach').delete().neq('id', -1);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Fallback] Failed to clear outreach from Supabase.', err);
    }
  }
  return [];
}

// Groups CRUD
export async function getAllGroups() {
  if (navigator.onLine) {
    try {
      const res = await supabase.from('groups').select('*');
      const data = handleResponse(res) || [];
      setLocal('groups', data);
      return data;
    } catch (err) {
      console.warn('[Offline Fallback] Failed to fetch groups from Supabase, loading from cache:', err);
    }
  }
  return getLocal('groups') || [];
}

export async function saveGroup(group) {
  const cache = getLocal('groups') || [];
  let tempId = group.id;
  if (!tempId) {
    tempId = 'temp_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }
  const toSave = { ...group, id: tempId };

  const idx = cache.findIndex(g => g.id === tempId);
  if (idx > -1) {
    cache[idx] = toSave;
  } else {
    cache.push(toSave);
  }
  setLocal('groups', cache);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('groups').upsert(group).select();
      const data = handleResponse(res);
      const saved = data && data[0] ? data[0] : null;
      if (saved) {
        const updatedCache = getLocal('groups') || [];
        const tIdx = updatedCache.findIndex(g => g.id === tempId);
        if (tIdx > -1) {
          updatedCache[tIdx] = saved;
        } else {
          updatedCache.push(saved);
        }
        setLocal('groups', updatedCache);
        return saved.id;
      }
      return tempId;
    } catch (err) {
      console.warn('[Offline Queue] Failed to upsert group to Supabase, queuing mutation:', err);
      await addToSyncQueue('SAVE', 'group', toSave);
      return tempId;
    }
  } else {
    await addToSyncQueue('SAVE', 'group', toSave);
    return tempId;
  }
}

export async function deleteGroup(id) {
  const cache = getLocal('groups') || [];
  const filtered = cache.filter(g => g.id !== id);
  setLocal('groups', filtered);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('groups').delete().eq('id', id);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Queue] Failed to delete group from Supabase, queuing deletion:', err);
      await addToSyncQueue('DELETE', 'group', { id });
      return null;
    }
  } else {
    await addToSyncQueue('DELETE', 'group', { id });
    return null;
  }
}

export async function clearAllGroups() {
  setLocal('groups', []);
  if (navigator.onLine) {
    try {
      const res = await supabase.from('groups').delete().neq('id', -1);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Fallback] Failed to clear groups from Supabase.', err);
    }
  }
  return [];
}

// Messages CRUD (Management → Student)
export async function getAllMessages() {
  if (navigator.onLine) {
    try {
      const res = await supabase.from('messages').select('*');
      const data = handleResponse(res) || [];
      setLocal('messages', data);
      return data;
    } catch (err) {
      console.warn('[Offline Fallback] Failed to fetch messages from Supabase, loading from cache:', err);
    }
  }
  return getLocal('messages') || [];
}

export async function getMessagesByRoll(roll_number) {
  const all = await getAllMessages();
  const upperRoll = roll_number.toUpperCase();
  return all.filter(m => m.roll_number === upperRoll || m.roll_number === 'ALL');
}

export async function saveMessage(message) {
  const cache = getLocal('messages') || [];
  let tempId = message.id;
  if (!tempId) {
    tempId = 'temp_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }
  const toSave = { ...message, id: tempId };

  const idx = cache.findIndex(m => m.id === tempId);
  if (idx > -1) {
    cache[idx] = toSave;
  } else {
    cache.push(toSave);
  }
  setLocal('messages', cache);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('messages').upsert(message).select();
      const data = handleResponse(res);
      const saved = data && data[0] ? data[0] : null;
      if (saved) {
        const updatedCache = getLocal('messages') || [];
        const tIdx = updatedCache.findIndex(m => m.id === tempId);
        if (tIdx > -1) {
          updatedCache[tIdx] = saved;
        } else {
          updatedCache.push(saved);
        }
        setLocal('messages', updatedCache);
        return saved.id;
      }
      return tempId;
    } catch (err) {
      console.warn('[Offline Queue] Failed to upsert message to Supabase, queuing mutation:', err);
      await addToSyncQueue('SAVE', 'message', toSave);
      return tempId;
    }
  } else {
    await addToSyncQueue('SAVE', 'message', toSave);
    return tempId;
  }
}

export async function deleteMessage(id) {
  const cache = getLocal('messages') || [];
  const filtered = cache.filter(m => m.id !== id);
  setLocal('messages', filtered);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('messages').delete().eq('id', id);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Queue] Failed to delete message from Supabase, queuing deletion:', err);
      await addToSyncQueue('DELETE', 'message', { id });
      return null;
    }
  } else {
    await addToSyncQueue('DELETE', 'message', { id });
    return null;
  }
}

export async function clearAllMessages() {
  setLocal('messages', []);
  if (navigator.onLine) {
    try {
      const res = await supabase.from('messages').delete().neq('id', -1);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Fallback] Failed to clear messages from Supabase.', err);
    }
  }
  return [];
}

// Templates CRUD (Management-defined profile sections)
export async function getAllTemplates() {
  if (navigator.onLine) {
    try {
      const res = await supabase.from('templates').select('*');
      const data = handleResponse(res) || [];
      setLocal('templates', data);
      return data;
    } catch (err) {
      console.warn('[Offline Fallback] Failed to fetch templates from Supabase, loading from cache:', err);
    }
  }
  return getLocal('templates') || [];
}

export async function saveTemplate(template) {
  const cache = getLocal('templates') || [];
  let tempId = template.id;
  if (!tempId) {
    tempId = 'temp_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }
  const toSave = { ...template, id: tempId };

  const idx = cache.findIndex(t => t.id === tempId);
  if (idx > -1) {
    cache[idx] = toSave;
  } else {
    cache.push(toSave);
  }
  setLocal('templates', cache);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('templates').upsert(template).select();
      const data = handleResponse(res);
      const saved = data && data[0] ? data[0] : null;
      if (saved) {
        const updatedCache = getLocal('templates') || [];
        const tIdx = updatedCache.findIndex(t => t.id === tempId);
        if (tIdx > -1) {
          updatedCache[tIdx] = saved;
        } else {
          updatedCache.push(saved);
        }
        setLocal('templates', updatedCache);
        return saved.id;
      }
      return tempId;
    } catch (err) {
      console.warn('[Offline Queue] Failed to upsert template to Supabase, queuing mutation:', err);
      await addToSyncQueue('SAVE', 'template', toSave);
      return tempId;
    }
  } else {
    await addToSyncQueue('SAVE', 'template', toSave);
    return tempId;
  }
}

export async function deleteTemplate(id) {
  const cache = getLocal('templates') || [];
  const filtered = cache.filter(t => t.id !== id);
  setLocal('templates', filtered);

  if (navigator.onLine) {
    try {
      const res = await supabase.from('templates').delete().eq('id', id);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Queue] Failed to delete template from Supabase, queuing deletion:', err);
      await addToSyncQueue('DELETE', 'template', { id });
      return null;
    }
  } else {
    await addToSyncQueue('DELETE', 'template', { id });
    return null;
  }
}

export async function clearAllTemplates() {
  setLocal('templates', []);
  if (navigator.onLine) {
    try {
      const res = await supabase.from('templates').delete().neq('id', -1);
      return handleResponse(res);
    } catch (err) {
      console.warn('[Offline Fallback] Failed to clear templates from Supabase.', err);
    }
  }
  return [];
}

// Sync Queue Helpers
const QUEUE_KEY = 'sdc_sync_queue';

export function initDB() {
  return Promise.resolve(true);
}

export function getSyncQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return Promise.resolve(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return Promise.resolve([]);
  }
}

export async function addToSyncQueue(action, entityType, data) {
  const queue = await getSyncQueue();
  
  // Clean off temporary string IDs if it's a new SAVE operation to let Supabase autogenerate them
  let cleanedData = { ...data };
  if (action === 'SAVE' && typeof cleanedData.id === 'string' && cleanedData.id.startsWith('temp_')) {
    delete cleanedData.id;
  }

  const newItem = {
    id: Math.random().toString(36).substr(2, 9) + Date.now(),
    action, // 'SAVE' | 'DELETE'
    entityType, // 'student' | 'outreach' | 'group' | 'message' | 'template'
    data: cleanedData,
    timestamp: Date.now()
  };
  queue.push(newItem);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return Promise.resolve();
}

export async function removeFromSyncQueue(id) {
  const queue = await getSyncQueue();
  const filtered = queue.filter(item => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  return Promise.resolve();
}

export function clearSyncQueue() {
  localStorage.removeItem(QUEUE_KEY);
  return Promise.resolve();
}
