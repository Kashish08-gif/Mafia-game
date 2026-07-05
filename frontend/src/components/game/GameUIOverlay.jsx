import React, { useState, useEffect, useRef } from 'react';
import { Send, Users } from 'lucide-react';

export default function GameUIOverlay({ messages, onSendMessage, room }) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
    }}>
      {/* Top Header */}
      <div style={{
        padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)', padding: '10px 20px', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          color: 'white', pointerEvents: 'auto'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#ff4455' }}>{room?.roomName || 'City Map'}</h2>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Map: {room?.map || 'city'}</span>
            <span>•</span>
            <span>State: {room?.gameState || 'WAITING'}</span>
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.6)', padding: '10px 16px', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          color: 'white', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Users size={16} />
          <span style={{ fontWeight: 'bold' }}>{room?.users?.length || 1} / {room?.totalPlayers || '?'}</span>
        </div>
      </div>

      {/* Bottom Chat Section */}
      <div style={{
        padding: '20px', display: 'flex', flexDirection: 'column', width: '350px', gap: '10px'
      }}>
        {/* Chat Messages */}
        <div style={{
          background: 'rgba(0,0,0,0.5)', height: '250px', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
          pointerEvents: 'auto'
        }}>
          {messages.length === 0 && (
             <div style={{ color: '#888', fontSize: '12px', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
               No messages yet. Say hello!
             </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              background: msg.sender === 'System' ? 'transparent' : 'rgba(255,255,255,0.05)',
              padding: msg.sender === 'System' ? '4px 0' : '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: msg.sender === 'System' ? '#5ad15a' : 'white',
              fontStyle: msg.sender === 'System' ? 'italic' : 'normal'
            }}>
              {msg.sender !== 'System' && (
                <span style={{ fontWeight: 'bold', color: '#ff4455', marginRight: '6px' }}>{msg.sender}:</span>
              )}
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex', gap: '8px', pointerEvents: 'auto'
        }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Press Enter to chat..."
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', outline: 'none', backdropFilter: 'blur(10px)'
            }}
          />
          <button type="submit" style={{
            padding: '12px', borderRadius: '12px', background: '#ff4455', border: 'none',
            color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Send size={18} />
          </button>
        </form>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textAlign: 'center', pointerEvents: 'none' }}>
          Use <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '4px' }}>W</kbd> <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '4px' }}>A</kbd> <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '4px' }}>S</kbd> <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '4px' }}>D</kbd> to move around.
        </div>
      </div>
    </div>
  );
}
