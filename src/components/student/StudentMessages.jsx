import React, { useState, useEffect } from 'react';
import { MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import { getMessagesByRoll, saveMessage } from '../../offline-storage/db';

export default function StudentMessages({ rollNumber }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [rollNumber]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await getMessagesByRoll(rollNumber);
      // Sort by newest first
      msgs.sort((a, b) => b.timestamp - a.timestamp);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setLoading(false);
  };

  const markAsRead = async (msg) => {
    if (!msg.read) {
      const updated = { ...msg, read: true };
      await saveMessage(updated);
      setMessages(messages.map(m => m.id === msg.id ? updated : m));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#e2e8f0' }}>Management Inbox</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>Important updates and opportunities from faculty.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading messages...</p>
      ) : messages.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '60px 40px', textAlign: 'center' }}>
          <MessageSquare size={32} color="#475569" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#e2e8f0' }}>Your inbox is empty</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>You have no new messages from management.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map(msg => (
            <div 
              key={msg.id} 
              onClick={() => markAsRead(msg)}
              style={{ 
                background: msg.read ? 'rgba(255,255,255,0.02)' : 'rgba(139,92,246,0.08)', 
                border: `1px solid ${msg.read ? 'rgba(255,255,255,0.08)' : 'rgba(139,92,246,0.3)'}`, 
                borderRadius: '16px', padding: '24px', cursor: msg.read ? 'default' : 'pointer', transition: 'all 0.2s' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: msg.read ? '600' : '700', color: msg.read ? '#cbd5e1' : '#c4b5fd' }}>
                  {msg.title}
                </h4>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                  <Calendar size={14} /> {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {msg.body}
              </p>
              {!msg.read && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', color: '#8b5cf6', fontSize: '12px', fontWeight: '600' }}>
                  <CheckCircle size={14} /> Click to mark as read
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
