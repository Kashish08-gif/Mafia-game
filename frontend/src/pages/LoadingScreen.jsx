import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/loading.css";

const BACKEND_BASE = "http://localhost:5000/api";

export default function LoadingScreen() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isGameStartedReady, setIsGameStartedReady] = useState(false);

  // Navigate only after BOTH backend confirms game start AND loading animation finishes
  useEffect(() => {
    if (progress === 100 && isGameStartedReady) {
      // Add a tiny extra delay so players can see 100% complete state
      const delayNav = setTimeout(() => {
        navigate(`/role-reveal/${roomId || ""}`);
      }, 500);
      return () => clearTimeout(delayNav);
    }
  }, [progress, isGameStartedReady, navigate, roomId]);

  useEffect(() => {
    // Animation timers — purely cosmetic
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1200),
      setTimeout(() => setStep(3), 2000),
      setTimeout(() => setStep(4), 2800),
    ];

    const values = [0, 12, 24, 36, 58, 73, 91, 100];
    let i = 0;
    const interval = setInterval(() => {
      if (i < values.length) { setProgress(values[i]); i++; }
      else clearInterval(interval);
    }, 300);

    // Poll the backend until gameStarted is confirmed
    let cancelled = false;
    const MAX_WAIT_MS = 15000; // 15s hard timeout
    const POLL_INTERVAL_MS = 800;
    const startedAt = Date.now();

    const pollGameStarted = async () => {
      while (!cancelled) {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${BACKEND_BASE}/room/rooms/${roomId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data?.room?.gameStarted) {
            if (!cancelled) setIsGameStartedReady(true);
            return;
          }
        } catch (_) { /* network hiccup — keep polling */ }

        // Hard timeout fallback
        if (Date.now() - startedAt >= MAX_WAIT_MS) {
          if (!cancelled) setIsGameStartedReady(true);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    };

    pollGameStarted();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [roomId]);

  return (
    <div className="loading-screen">

      <div className="fog"></div>

      <div className="rain"></div>

      <div className="particles"></div>

      <motion.div
        className="lightning"
        animate={{ opacity: [0, 0.9, 0] }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatDelay: 2.5
        }}
      />

      <AnimatePresence>
        {step === 1 && (
          <motion.div
            className="eye-container"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <svg className="eye-svg" viewBox="0 0 100 60" width="120" height="72">
              <defs>
                <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M10 30 Q50 5 90 30 Q50 55 10 30 Z"
                fill="rgba(255, 32, 32, 0.05)"
                stroke="#ff2020"
                strokeWidth="2.5"
                filter="url(#eyeGlow)"
                className="eye-lid"
              />
              <circle
                cx="50"
                cy="30"
                r="14"
                fill="none"
                stroke="#ff2020"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                filter="url(#eyeGlow)"
                className="eye-iris-ring"
                style={{ transformOrigin: '50px 30px' }}
              />
              <circle
                cx="50"
                cy="30"
                r="7"
                fill="#ff2020"
                filter="url(#eyeGlow)"
                className="eye-pupil-glow"
                style={{ transformOrigin: '50px 30px' }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>

        {step >= 2 && (
          <motion.img
            src="/images/logo.png"
            className="logo"
            initial={{
              scale: 0,
              rotate: -15,
              opacity: 0
            }}
            animate={{
              scale: [0, 1.15, 1],
              rotate: [-15, 0],
              opacity: 1
            }}
            transition={{ duration: 0.8 }}
          />
        )}

      </AnimatePresence>

      <AnimatePresence>

        {step >= 3 && (
          <motion.div
            className="title"
            initial={{
              opacity: 0,
              y: 40
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
          >
            <h1>CONTRACT</h1>

            <h2>ACCEPTED</h2>

            <p>Preparing Operation...</p>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>

        {step >= 4 && (
          <motion.div
            className="hud"
            initial={{
              opacity: 0,
              y: 40
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
          >
            <div className="progress">

              <div
                className="fill"
                style={{
                  width: `${progress}%`
                }}
              ></div>

            </div>

            <div className="percent">

              {progress}%

            </div>

            <div className="task">
              {progress >= 20 ? "✔" : "○"} Loading Environment
            </div>

            <div className="task">
              {progress >= 40 ? "✔" : "○"} Assigning Roles
            </div>

            <div className="task">
              {progress >= 70 ? "✔" : "○"} Connecting Players
            </div>

            <div className="task">
              {progress >= 90 ? "✔" : "○"} Syncing Match
            </div>

            <div className="task">
              {progress === 100 ? "✔" : "○"} Finalizing Session
            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}