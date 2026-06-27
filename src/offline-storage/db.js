import { supabase } from '../supabaseClient';

// Helper to handle Supabase responses
const handleResponse = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Student CRUD
export async function getAllStudents() {
  const res = await supabase.from('students').select('*');
  return handleResponse(res) || [];
}

export async function saveStudent(student) {
  // Supabase upsert (requires primary key roll_number)
  const res = await supabase.from('students').upsert(student).select();
  return handleResponse(res);
}

export async function deleteStudent(roll_number) {
  const res = await supabase.from('students').delete().eq('roll_number', roll_number);
  return handleResponse(res);
}

export async function getStudent(roll_number) {
  const res = await supabase.from('students').select('*').eq('roll_number', roll_number).single();
  // Supabase throws error if no rows returned via .single(), so catch it
  if (res.error) {
    if (res.error.code === 'PGRST116') return null; // PostgREST code for "not found"
    throw new Error(res.error.message);
  }
  return res.data;
}

export async function clearAllStudents() {
  const res = await supabase.from('students').delete().neq('roll_number', 'impossible_val');
  return handleResponse(res);
}

// Outreach CRUD
export async function getAllOutreach() {
  const res = await supabase.from('outreach').select('*');
  return handleResponse(res) || [];
}

export async function saveOutreach(outreach) {
  const res = await supabase.from('outreach').upsert(outreach).select();
  const data = handleResponse(res);
  return data && data[0] ? data[0].id : null;
}

export async function deleteOutreach(id) {
  const res = await supabase.from('outreach').delete().eq('id', id);
  return handleResponse(res);
}

export async function clearAllOutreach() {
  const res = await supabase.from('outreach').delete().neq('id', -1);
  return handleResponse(res);
}

// Groups CRUD
export async function getAllGroups() {
  const res = await supabase.from('groups').select('*');
  return handleResponse(res) || [];
}

export async function saveGroup(group) {
  const res = await supabase.from('groups').upsert(group).select();
  const data = handleResponse(res);
  return data && data[0] ? data[0].id : null;
}

export async function deleteGroup(id) {
  const res = await supabase.from('groups').delete().eq('id', id);
  return handleResponse(res);
}

export async function clearAllGroups() {
  const res = await supabase.from('groups').delete().neq('id', -1);
  return handleResponse(res);
}

// Messages CRUD (Management → Student)
export async function getAllMessages() {
  const res = await supabase.from('messages').select('*');
  return handleResponse(res) || [];
}

export async function getMessagesByRoll(roll_number) {
  const res = await supabase
    .from('messages')
    .select('*')
    .or(`roll_number.eq.${roll_number.toUpperCase()},roll_number.eq.ALL`);
  return handleResponse(res) || [];
}

export async function saveMessage(message) {
  const res = await supabase.from('messages').upsert(message).select();
  const data = handleResponse(res);
  return data && data[0] ? data[0].id : null;
}

export async function deleteMessage(id) {
  const res = await supabase.from('messages').delete().eq('id', id);
  return handleResponse(res);
}

export async function clearAllMessages() {
  const res = await supabase.from('messages').delete().neq('id', -1);
  return handleResponse(res);
}

// Templates CRUD (Management-defined profile sections)
export async function getAllTemplates() {
  const res = await supabase.from('templates').select('*');
  return handleResponse(res) || [];
}

export async function saveTemplate(template) {
  const res = await supabase.from('templates').upsert(template).select();
  const data = handleResponse(res);
  return data && data[0] ? data[0].id : null;
}

export async function deleteTemplate(id) {
  const res = await supabase.from('templates').delete().eq('id', id);
  return handleResponse(res);
}

export async function clearAllTemplates() {
  const res = await supabase.from('templates').delete().neq('id', -1);
  return handleResponse(res);
}

// Sync Queue Helpers (No-ops for online-only Supabase)
export function initDB() {
  return Promise.resolve(true); // Stub to not break initialization in App.jsx
}

export function getSyncQueue() {
  return Promise.resolve([]);
}

export function addToSyncQueue() {
  return Promise.resolve();
}

export function removeFromSyncQueue() {
  return Promise.resolve();
}

export function clearSyncQueue() {
  return Promise.resolve();
}
