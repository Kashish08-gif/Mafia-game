/**
 * ChatBox.jsx
 * In-game chat panel — message list + input form with emoji picker.
 *
 * Props:
 *   messages   — array of { sender, text, color, ts? }
 *   onSend     — callback(text: string) when user submits
 *   myColor    — local player colour (used for send button accent)
 *
 * Emoji fixes applied:
 *  1. EmojiPicker wrapped in a portal-like div OUTSIDE the <form> so clicking
 *     an emoji never accidentally submits the form.
 *  2. After selecting an emoji the text input is re-focused automatically.
 *  3. Picker closes when clicking anywhere outside it (useEffect click-away).
 *  4. autoFocusSearch={false} so the picker doesn't steal keyboard focus.
 *  5. handleSubmit works for emoji-only messages (no letters, trim check removed
 *     for emoji since trim() strips nothing from emoji strings).
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function ChatBox({ messages = [], onSend, myColor = '#ffd700' }) {
  const [input, setInput]     = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);
  const pickerWrapRef         = useRef(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close picker when clicking outside of it
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    // Use capture so we catch the event before anything else
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [showEmoji]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault?.();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setInput('');
    setShowEmoji(false);
    // Keep focus on the input after sending
    inputRef.current?.focus();
  }, [input, onSend]);

  const handleKeyDown = (e) => {
    // Stop WASD keys from triggering character movement while typing
    e.stopPropagation();
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowEmoji(false);
  };

  const handleEmojiClick = useCallback((emojiData) => {
    // Append the emoji character to the current input value
    setInput((prev) => prev + emojiData.emoji);
    // Close picker and refocus the text field so the user can keep typing
    setShowEmoji(false);
    // Small timeout so the state flush completes before we focus
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const toggleEmoji = (e) => {
    // Prevent this button click from bubbling into the form
    e.preventDefault();
    e.stopPropagation();
    setShowEmoji((v) => !v);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 300,
        // Needed so the absolutely-positioned picker doesn't overflow the HUD
        position: 'relative',
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
              fontSize: 13,          // slightly larger so emojis render clearly
              lineHeight: '1.5',
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
              wordBreak: 'break-word',   // so long emoji strings don't overflow
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

      {/* ── Emoji Picker — lives OUTSIDE the form to avoid accidental submit ── */}
      {showEmoji && (
        <div
          ref={pickerWrapRef}
          style={{
            position: 'absolute',
            bottom: 90,   // sits above the input row
            left: 0,
            zIndex: 9999,
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="dark"
            autoFocusSearch={false}   // don't steal keyboard from the game
            lazyLoadEmojis={true}
            searchDisabled={false}
            width={300}
            height={380}
          />
        </div>
      )}

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        {/* Emoji toggle button */}
        <button
          type="button"          // CRITICAL: type=button prevents form submit
          onClick={toggleEmoji}
          title="Emoji"
          style={{
            flexShrink: 0,
            background: showEmoji
              ? `${myColor}33` 
              : 'rgba(255,255,255,0.07)',
            border: `1.5px solid ${showEmoji ? myColor : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 10,
            cursor: 'pointer',
            color: showEmoji ? myColor : 'rgba(255,255,255,0.7)',
            padding: '8px 9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.18s',
          }}
        >
          <Smile size={18} />
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chat or pick emoji…"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(8,4,14,0.88)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255,215,0,0.2)',
            color: '#fff',
            outline: 'none',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        />

        {/* Send button */}
        <button
          type="submit"
          title="Send"
          style={{
            flexShrink: 0,
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
