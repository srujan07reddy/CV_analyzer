import React, { useState, useRef, useEffect } from 'react';
import { processShishyaQuery } from '../persona/shishya';
import { Send, Bot, User, AlertTriangle, RefreshCw, MessageSquare, X } from 'lucide-react';
import { getLLMConfig, queryLLM } from '../utils/llm';

export default function FloatingChat({ students, outreachList = [] }) {
  const email = localStorage.getItem('sdc_logged_in_email') || 'global';
  const getCacheKey = () => `sdc_floating_chat_history_${email}`;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'shishya',
      text: 'Guru garu, I am here to assist you. Ask me anything about our student rosters, departments, or outreach logs.',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync messages from cache when email shifts
  useEffect(() => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        setMessages(JSON.parse(cached));
      } else {
        setMessages([
          {
            id: 1,
            sender: 'shishya',
            text: 'Guru garu, I am here to assist you. Ask me anything about our student rosters, departments, or outreach logs.',
            timestamp: Date.now()
          }
        ]);
      }
    } catch (e) {
      console.warn('Failed to parse cached chat history:', e);
    }
  }, [email]);

  // Persist messages to cache on change
  useEffect(() => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to cache chat history:', e);
    }
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, email]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    const queryStr = input;
    setInput('');

    // Fidelity boundary controls
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
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }
    }

    const config = getLLMConfig();
    if (config.enabled && config.apiKey) {
      setIsThinking(true);
      try {
        const result = await queryLLM(queryStr, students, outreachList);
        const shishyaMessage = {
          id: Date.now() + 1,
          sender: 'shishya',
          text: result,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, shishyaMessage]);
      } catch (err) {
        console.warn('[FloatingChat] LLM Query failed, falling back:', err);
        try {
          const fallbackResult = processShishyaQuery(queryStr, students);
          const shishyaMessage = {
            id: Date.now() + 1,
            sender: 'shishya',
            text: `[Fallback Mode]\n\n${fallbackResult.response}`,
            timestamp: Date.now()
          };
          setMessages((prev) => [...prev, shishyaMessage]);
        } catch (localErr) {
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'error',
            text: `[FIDELITY BREACH] ${localErr.message}`,
            timestamp: Date.now()
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setIsThinking(false);
      }
    } else {
      try {
        const result = processShishyaQuery(queryStr, students);
        const shishyaMessage = {
          id: Date.now() + 1,
          sender: 'shishya',
          text: result.response,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, shishyaMessage]);
      } catch (err) {
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'error',
          text: `[FIDELITY BREACH] ${err.message}`,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {/* Expandable Chat Panel */}
      {isOpen && (
        <div 
          className="glass-card" 
          style={{
            width: '380px',
            height: '480px',
            maxHeight: '75vh',
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '16px',
            border: '1px solid var(--border-active)',
            boxShadow: '0 8px 32px rgba(5, 7, 12, 0.5), 0 0 15px rgba(6, 182, 212, 0.15)',
            animation: 'fadeIn 0.25s ease',
            padding: '16px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} />
              Discuss with Shishya
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Conversation Log */}
          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', fontSize: '13px' }}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`chat-message ${msg.sender}`}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'rgba(6, 182, 212, 0.15)' : msg.sender === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: msg.sender === 'user' ? '1px solid rgba(6, 182, 212, 0.25)' : msg.sender === 'error' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  color: msg.sender === 'error' ? 'var(--color-error)' : 'var(--text-primary)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {msg.sender === 'user' ? (
                    <>
                      <User size={10} />
                      <span>Guru</span>
                    </>
                  ) : msg.sender === 'error' ? (
                    <>
                      <AlertTriangle size={10} style={{ color: 'var(--color-error)' }} />
                      <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>Security Pipeline</span>
                    </>
                  ) : (
                    <>
                      <Bot size={10} />
                      <span>Shishya</span>
                    </>
                  )}
                </div>
                <div>{msg.text}</div>
              </div>
            ))}
            {isThinking && (
              <div style={{ alignSelf: 'flex-start', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={12} className="spin" style={{ color: 'var(--color-primary)' }} />
                <span>Guru garu, I am contemplating...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form 
            onSubmit={handleSend} 
            style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}
          >
            <input 
              type="text" 
              placeholder={isThinking ? "Contemplating..." : "Ask Shishya..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isThinking}
              style={{
                flexGrow: 1,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
            <button 
              type="submit" 
              disabled={isThinking || !input.trim()}
              style={{
                background: 'var(--color-primary)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (isThinking || !input.trim()) ? 0.5 : 1
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          outline: 'none'
        }}
        className="floating-chat-btn"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </div>
  );
}
