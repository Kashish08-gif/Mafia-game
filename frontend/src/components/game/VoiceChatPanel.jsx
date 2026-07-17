/**
 * VoiceChatPanel.jsx
 * ─────────────────────────────────────────────────────────────────
 * Premium voice communication UI panel for the Discussion phase.
 *
 * Shows:
 *  - Each player's avatar with a speaking-glow animation
 *  - YOUR microphone toggle (push-to-talk or toggle)
 *  - Speaker/volume mute toggle
 *  - Mic permission prompt if not granted
 *  - Connection status for each peer
 */

import { Mic, MicOff, Volume2, VolumeX, Radio } from 'lucide-react';

const VOICE_KEYFRAMES = `
  @keyframes voice-speak-glow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(68, 204, 136, 0),
                  0 0 0 3px rgba(68, 204, 136, 0.15);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(68, 204, 136, 0),
                  0 0 0 3px rgba(68, 204, 136, 0.65);
    }
  }
  @keyframes voice-mic-pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.12); }
  }
  @keyframes voice-wave {
    0%, 100% { height: 4px; }
    25%       { height: 12px; }
    50%       { height: 20px; }
    75%       { height: 8px; }
  }
  @keyframes voice-connecting {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 1; }
  }
`;

/** Animated sound wave bars — shown when someone is speaking */
function SoundWave({ color = '#44cc88', size = 'sm' }) {
  const h = size === 'sm' ? 14 : 20;
  const bars = [0, 1, 2, 3];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        height: h,
      }}
    >
      {bars.map((i) => (
        <span
          key={i}
          style={{
            width: size === 'sm' ? 2 : 3,
            background: color,
            borderRadius: 2,
            display: 'block',
            animation: `voice-wave 0.8s ease-in-out ${i * 0.12}s infinite`,
            height: 4,
          }}
        />
      ))}
    </span>
  );
}

/** Single player voice card */
function VoicePlayerCard({ player, isMe, isSpeaking, isConnected, micMuted }) {
  const playerColor = player.color || '#ffd700';
  const speaking    = isSpeaking && (!isMe || !micMuted);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 8px',
        borderRadius: 14,
        background: speaking
          ? 'linear-gradient(160deg, rgba(68, 204, 136, 0.12), rgba(0,0,0,0.4))'
          : 'rgba(255,255,255,0.03)',
        border: speaking
          ? '1.5px solid rgba(68, 204, 136, 0.5)'
          : '1.5px solid rgba(255,255,255,0.07)',
        transition: 'all 0.25s ease',
        minWidth: 64,
        maxWidth: 80,
        position: 'relative',
      }}
    >
      {/* Avatar circle */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${playerColor}cc, ${playerColor}44)`,
          border: `2.5px solid ${speaking ? '#44cc88' : playerColor + '66'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          fontWeight: 900,
          color: '#fff',
          boxShadow: speaking
            ? `0 0 0 3px rgba(68, 204, 136, 0.4), 0 0 12px rgba(68, 204, 136, 0.3)`
            : `0 0 8px ${playerColor}33`,
          animation: speaking ? 'voice-speak-glow 0.6s ease-in-out infinite' : 'none',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        {player.username?.[0]?.toUpperCase() || '?'}
      </div>

      {/* Player name */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: speaking ? '#44cc88' : 'rgba(255,255,255,0.65)',
          letterSpacing: '0.04em',
          textAlign: 'center',
          maxWidth: 70,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}
      >
        {isMe ? 'YOU' : (player.username || 'Player')}
      </div>

      {/* Speaking indicator */}
      <div style={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {speaking ? (
          <SoundWave color="#44cc88" size="sm" />
        ) : isMe && micMuted ? (
          <MicOff size={10} color="#ff4455" style={{ opacity: 0.8 }} />
        ) : isConnected || isMe ? (
          <span style={{ fontSize: 8, color: '#555', fontWeight: 700 }}>SILENT</span>
        ) : (
          <span
            style={{
              fontSize: 8,
              color: '#666',
              fontWeight: 700,
              animation: 'voice-connecting 1.5s ease infinite',
            }}
          >
            •••
          </span>
        )}
      </div>
    </div>
  );
}

export default function VoiceChatPanel({
  players = [],
  myId,
  micMuted,
  toggleMic,
  speakerMuted,
  toggleSpeaker,
  micGranted,
  activeSpeakers = new Set(),
  peersReady = new Set(),
}) {
  return (
    <>
      <style>{VOICE_KEYFRAMES}</style>

      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255, 215, 0, 0.12)',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.5), rgba(10,5,20,0.6))',
          flexShrink: 0,
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 10,
              fontWeight: 800,
              color: '#ffd700',
              letterSpacing: '0.1em',
            }}
          >
            <Radio size={12} color="#ffd700" />
            VOICE CHANNEL
            {micGranted && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#44cc88',
                  boxShadow: '0 0 6px #44cc88',
                  display: 'inline-block',
                  animation: 'voice-speak-glow 2s ease infinite',
                }}
              />
            )}
          </div>

          {/* Mic + Speaker controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Speaker toggle */}
            <button
              onClick={toggleSpeaker}
              title={speakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: `1.5px solid ${speakerMuted ? 'rgba(255,68,85,0.6)' : 'rgba(255,255,255,0.15)'}`,
                background: speakerMuted
                  ? 'rgba(255, 68, 85, 0.15)'
                  : 'rgba(255,255,255,0.05)',
                color: speakerMuted ? '#ff4455' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {speakerMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Mic toggle */}
            <button
              onClick={toggleMic}
              disabled={!micGranted}
              title={
                !micGranted
                  ? 'Microphone access not granted'
                  : micMuted
                  ? 'Unmute Microphone'
                  : 'Mute Microphone'
              }
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: micMuted
                  ? '2px solid rgba(255, 68, 85, 0.7)'
                  : micGranted
                  ? '2px solid rgba(68, 204, 136, 0.6)'
                  : '2px solid rgba(255,255,255,0.12)',
                background: micMuted
                  ? 'linear-gradient(135deg, rgba(255,68,85,0.25), rgba(180,10,25,0.2))'
                  : micGranted
                  ? 'linear-gradient(135deg, rgba(68,204,136,0.25), rgba(20,100,60,0.2))'
                  : 'rgba(255,255,255,0.04)',
                color: micMuted ? '#ff4455' : micGranted ? '#44cc88' : '#555',
                cursor: micGranted ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: micGranted && !micMuted
                  ? '0 0 12px rgba(68, 204, 136, 0.3)'
                  : micMuted
                  ? '0 0 8px rgba(255, 68, 85, 0.2)'
                  : 'none',
                transition: 'all 0.2s ease',
                animation: micGranted && !micMuted ? 'voice-mic-pulse 2.5s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={(e) => {
                if (micGranted) e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
        </div>

        {/* Mic permission warning */}
        {!micGranted && (
          <div
            style={{
              background: 'rgba(255, 170, 51, 0.12)',
              border: '1px solid rgba(255, 170, 51, 0.4)',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 10,
              color: '#ffaa33',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Mic size={12} />
            Waiting for microphone permission... Allow it in your browser to speak.
          </div>
        )}

        {/* Muted indicator */}
        {micMuted && micGranted && (
          <div
            style={{
              background: 'rgba(255, 68, 85, 0.1)',
              border: '1px solid rgba(255, 68, 85, 0.35)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 10,
              color: '#ff7788',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <MicOff size={12} />
            Your mic is muted — others cannot hear you
          </div>
        )}

        {/* Player voice cards row */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          {players.map((player) => {
            const isMe        = player.id === myId;
            const isSpeaking  = activeSpeakers.has(isMe ? myId : player.id);
            const isConnected = isMe || peersReady.has(player.id);

            return (
              <VoicePlayerCard
                key={player.id}
                player={player}
                isMe={isMe}
                isSpeaking={isSpeaking}
                isConnected={isConnected}
                micMuted={isMe ? micMuted : false}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
