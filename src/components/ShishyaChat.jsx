import React, { useState, useRef, useEffect } from 'react';
import { processShishyaQuery } from '../persona/shishya';
import { Send, Bot, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { getLLMConfig, queryLLM } from '../utils/llm';

export default function ShishyaChat({ students, outreachList = [] }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'shishya',
      text: 'Guru garu, it is my absolute honor and duty to assist you with the Student Development Cell (SDC) analytics workspace. Please query our student rosters, activity counts, or outreach summaries.',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Pre-check for strict boundary controls before sending to LLM
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
        console.warn('[Chat] LLM Query failed, falling back to local processing:', err);
        // Fallback to local rule-based engine
        try {
          const fallbackResult = processShishyaQuery(queryStr, students);
          const shishyaMessage = {
            id: Date.now() + 1,
            sender: 'shishya',
            text: `[Fallback Mode: LLM Connection Failed - ${err.message}]\n\n${fallbackResult.response}`,
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
      // Local processing
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
    <div className="tab-content">
      <div className="glass-card chat-container">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot style={{ color: 'var(--color-primary)' }} />
          Shishya AI Assistant Workspace
        </h2>
        
        {/* Chat log window */}
        <div className="chat-history">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`chat-message ${msg.sender}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {msg.sender === 'user' ? (
                  <>
                    <User size={12} />
                    <span>Guru</span>
                  </>
                ) : msg.sender === 'error' ? (
                  <>
                    <AlertTriangle size={12} style={{ color: 'var(--color-error)' }} />
                    <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>Security Pipeline</span>
                  </>
                ) : (
                  <>
                    <Bot size={12} />
                    <span>Shishya</span>
                  </>
                )}
              </div>
              <div>{msg.text}</div>
            </div>
          ))}
          {isThinking && (
            <div className="chat-message shishya" style={{ opacity: 0.7, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={14} className="spin" style={{ color: 'var(--color-primary)' }} />
              <span>Guru garu, your Shishya is contemplating...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input panel */}
        <form onSubmit={handleSend} className="chat-input-area">
          <input 
            type="text" 
            className="chat-input"
            placeholder={isThinking ? "Shishya is contemplating..." : "Query student records or outreach logs... (e.g. 'Show all students')"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
          />
          <button type="submit" className="btn btn-primary" disabled={isThinking}>
            {isThinking ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
      
      <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <strong>Guru garu, try asking me:</strong>
        <ul style={{ marginLeft: '20px', marginTop: '6px' }}>
          <li>"Show all students"</li>
          <li>"Tell me about xxJUyyyzzz details"</li>
          <li>"How many Rubik's cube events did student xxJUyyyzzz complete?"</li>
          <li>"How many outreach sessions were conducted at PUPS Manivakkam?"</li>
          <li><em>Or test strict boundary controls by asking: "Tell me about student x at VIT"</em></li>
        </ul>
      </div>
    </div>
  );
}
