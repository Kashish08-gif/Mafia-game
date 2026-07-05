/**
 * ChatBox.jsx
 * In-game chat panel — message list + input form.
 * Extracted from GameMapPage.jsx's inline chat block.
 *
 * Props:
 *   messages   — array of { sender, text, color, ts? }
 *   onSend     — callback(text: string) when user submits
 *   myColor    — local player colour (used for send button accent)
 */

import { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatBox({ messages = [], onSend, myColor = '#ffd700' }) {
  const [input, setInput]   = useState('');
  const bottomRef           = useRef(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setInput('');
  };

  const handleKeyDown = (e) => {
    // Stop WASD keys from triggering character movement while typing
    e.stopPropagation();
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 300,
      }}
    >
      {/* Message list */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(10,4,18,0.88) 0%, rgba(6,2,12,0.94) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255,215,0,0.15)',
          borderRadius: 14,
          padding: '12px 14px',
          height: 220,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: '#555',
              fontSize: 12,
              textAlign: 'center',
              margin: 'auto',
              fontStyle: 'italic',
            }}
          >
            No messages yet…
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: msg.sender === 'System' ? '2px 0' : '6px 10px',
              borderRadius: 8,
              fontSize: 12,
              background:
                msg.sender === 'System'
                  ? 'transparent'
                  : 'rgba(255,255,255,0.04)',
              color: msg.sender === 'System' ? '#5ad15a' : '#e8e8e8',
              fontStyle: msg.sender === 'System' ? 'italic' : 'normal',
              border:
                msg.sender === 'System'
                  ? 'none'
                  : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {msg.sender !== 'System' && (
              <span
                style={{
                  fontWeight: 800,
                  color: msg.color || '#ffd700',
                  marginRight: 5,
                  fontSize: 11,
                }}
              >
                {msg.sender}:
              </span>
            )}
            {msg.text}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Press Enter to chat…"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(8,4,14,0.88)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255,215,0,0.2)',
            color: '#fff',
            outline: 'none',
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: `linear-gradient(135deg, ${myColor}cc, ${myColor}88)`,
            border: 'none',
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${myColor}44`,
          }}
        >
          <Send size={16} />
        </button>
      </form>

      {/* Hint */}
      <div
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 10,
          textAlign: 'center',
        }}
      >
        <kbd style={{ background: '#333', padding: '1px 4px', borderRadius: 3 }}>W</kbd>{' '}
        <kbd style={{ background: '#333', padding: '1px 4px', borderRadius: 3 }}>A</kbd>{' '}
        <kbd style={{ background: '#333', padding: '1px 4px', borderRadius: 3 }}>S</kbd>{' '}
        <kbd style={{ background: '#333', padding: '1px 4px', borderRadius: 3 }}>D</kbd>{' '}
        to move &nbsp;|&nbsp;{' '}
        <kbd style={{ background: '#333', padding: '1px 4px', borderRadius: 3 }}>RMB</kbd>{' '}
        to rotate camera
      </div>
    </div>
  );
}
