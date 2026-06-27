import React, { useState, useEffect } from 'react';
import { Send, Trash2, Users, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { saveMessage, getAllMessages, deleteMessage } from '../offline-storage/db';

export default function MessagesManager({ students }) {
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({
    targetType: 'all', // 'all' | 'specific' | 'dept'
    targetValue: '',
    title: '',
    body: ''
  });
  const [status, setStatus] = useState('');
  
  // Stats
  const departments = [...new Set(students.map(s => s.department).filter(Boolean))];

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const msgs = await getAllMessages();
      msgs.sort((a, b) => b.timestamp - a.timestamp);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      return setStatus('error: Please fill all fields.');
    }

    try {
      let targetRolls = [];
      
      if (form.targetType === 'all') {
        targetRolls = ['ALL'];
      } else if (form.targetType === 'specific') {
        if (!form.targetValue.trim()) return setStatus('error: Please enter a roll number.');
        const exists = students.some(s => s.roll_number.toUpperCase() === form.targetValue.toUpperCase().trim());
        if (!exists) return setStatus('error: Roll number not found in database.');
        targetRolls = [form.targetValue.toUpperCase().trim()];
      } else if (form.targetType === 'dept') {
        if (!form.targetValue) return setStatus('error: Please select a department.');
        targetRolls = students.filter(s => s.department === form.targetValue).map(s => s.roll_number);
        if (targetRolls.length === 0) return setStatus('error: No students in this department.');
      }

      let sentCount = 0;
      for (const roll of targetRolls) {
        const msg = {
          roll_number: roll,
          title: form.title,
          body: form.body,
          timestamp: Date.now(),
          read: false
        };
        await saveMessage(msg);
        sentCount++;
      }

      setStatus(`success: Message sent to ${sentCount} recipient(s).`);
      setForm({ ...form, title: '', body: '' });
      loadMessages();
      
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error: Failed to send message.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this message? It will be removed from student inboxes as well.')) {
      await deleteMessage(id);
      loadMessages();
    }
  };

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Send style={{ color: 'var(--color-primary)' }} />
          Student Messaging System
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Compose Panel */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#e2e8f0' }}>Compose Message</h3>
          
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Target Audience</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select 
                  value={form.targetType} 
                  onChange={e => setForm({...form, targetType: e.target.value, targetValue: ''})}
                  style={{ ...inputStyle, width: '150px' }}
                >
                  <option value="all">All Students</option>
                  <option value="specific">Specific Roll No.</option>
                  <option value="dept">By Department</option>
                </select>

                {form.targetType === 'specific' && (
                  <input 
                    type="text" 
                    placeholder="Enter Roll Number" 
                    value={form.targetValue} 
                    onChange={e => setForm({...form, targetValue: e.target.value})} 
                    style={{ ...inputStyle, flex: 1 }} 
                  />
                )}

                {form.targetType === 'dept' && (
                  <select 
                    value={form.targetValue} 
                    onChange={e => setForm({...form, targetValue: e.target.value})}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Subject / Title</label>
              <input 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})} 
                style={inputStyle} 
                placeholder="e.g. Upcoming Internship Opportunity" 
              />
            </div>

            <div>
              <label style={labelStyle}>Message Body</label>
              <textarea 
                value={form.body} 
                onChange={e => setForm({...form, body: e.target.value})} 
                style={{ ...inputStyle, minHeight: '160px', resize: 'vertical' }} 
                placeholder="Type your message here..." 
              />
            </div>

            {status && (
              <div style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: status.startsWith('error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: status.startsWith('error') ? '#fca5a5' : '#6ee7b7' }}>
                {status.startsWith('error') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                {status.split(': ')[1]}
              </div>
            )}

            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              <Send size={16} /> Send Message
            </button>
          </form>
        </div>

        {/* Sent Messages History */}
        <div className="glass-card">
          <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Message History</span>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '10px' }}>
              {messages.length} Total
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            {messages.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '40px 0' }}>No messages sent yet.</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                  <button onClick={() => handleDelete(msg.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }} title="Delete Message">
                    <Trash2 size={16} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                      To: {msg.roll_number}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#e2e8f0' }}>{msg.title}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {msg.body}
                  </p>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: msg.read ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {msg.read ? <><CheckCircle size={12} /> Read by student</> : 'Unread'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
