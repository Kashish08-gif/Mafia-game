import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api.js';

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const authToken = localStorage.getItem('token');

  useEffect(() => {
    async function fetchInviteDetails() {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/invite/details/${token}`);
        if (res.data.success) {
          setInvite(res.data.invite);
        } else {
          setError(res.data.message || 'Invitation not found');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired invitation link');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInviteDetails();
    }
  }, [token]);

  const handleAccept = async () => {
    if (!authToken) {
      localStorage.setItem('pendingInviteToken', token);
      navigate('/?redirect=invite');
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_BASE_URL}/invite/accept/${token}`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Alliance forged!');
        setTimeout(() => {
          if (res.data.roomId) {
            navigate(`/lobby/${res.data.roomId}`);
          } else {
            navigate('/dashboard');
          }
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1a080d 0%, #060205 100%)',
      padding: '24px',
      color: '#fff',
      fontFamily: 'var(--font-body, sans-serif)',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(18, 10, 18, 0.85)',
          border: '1.5px solid rgba(255, 40, 60, 0.3)',
          borderRadius: '16px',
          padding: '36px 30px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 40px rgba(255, 30, 50, 0.2)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255, 40, 60, 0.15)',
          border: '1px solid rgba(255, 40, 60, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(255, 40, 60, 0.3)',
        }}>
          <Shield size={32} color="#ff4455" />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display, serif)',
          fontSize: '24px',
          letterSpacing: '0.1em',
          color: '#fff',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          Mafia Alliance Invitation
        </h1>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.7)', padding: '20px 0' }}>
            <Clock className="animate-spin" size={18} />
            <span>Decoding secret invitation...</span>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(255, 30, 40, 0.1)',
            border: '1px solid rgba(255, 40, 60, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            width: '100%',
            color: '#ff6677',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}>
            <AlertTriangle size={24} />
            <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                marginTop: 6,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(40, 200, 90, 0.15)',
            border: '1px solid rgba(40, 200, 90, 0.4)',
            borderRadius: '10px',
            padding: '16px',
            width: '100%',
            color: '#5ad15a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}>
            <CheckCircle2 size={20} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{successMsg}</span>
          </div>
        )}

        {!loading && !error && invite && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>INVITED BY</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ fontSize: '24px' }}>{invite.sender?.avatar || '🕵️'}</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ff4455' }}>
                  {invite.sender?.username || 'Unknown Syndicate'}
                </span>
              </div>
              {invite.room && (
                <div style={{ marginTop: 8, fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                  Room: <strong>{invite.room.roomName || 'Mafia Mansion'}</strong>
                </div>
              )}
            </div>

            <button
              onClick={handleAccept}
              disabled={processing || !!successMsg}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ff2233 0%, #b80d1a 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: processing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 0 20px rgba(255, 34, 51, 0.4)',
                opacity: processing ? 0.7 : 1,
              }}
            >
              <span>{authToken ? 'Accept & Enter Syndicate' : 'Login to Accept'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
