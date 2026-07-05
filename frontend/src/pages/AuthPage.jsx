import { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  signIn as apiSignIn,
  signUp as apiSignUp,
} from "../services/authService.js";
import { useNavigate } from "react-router-dom";
import AudioManager from "../services/audio";
/* ─────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Special+Elite&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; }

    input::placeholder { color: rgba(160, 80, 80, 0.45); font-family: 'Special Elite', monospace; letter-spacing: 0.06em; }
    input:focus { outline: none; }

    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-text-fill-color: #ddc8c8 !important;
      -webkit-box-shadow: 0 0 0px 9999px #0a0000 inset !important;
      box-shadow: 0 0 0px 9999px #0a0000 inset !important;
      background-color: #0a0000 !important;
      caret-color: #ff2222;
      transition: background-color 99999s ease-in-out 0s;
    }

    @keyframes lampSwing {
      0%,100% { transform: rotate(-3.5deg); }
      50%      { transform: rotate(3.5deg);  }
    }
    @keyframes breathe {
      0%,100% { opacity: 0.75; }
      50%      { opacity: 1;    }
    }
    @keyframes titlePulse {
      0%,100% {
        text-shadow:
          0 0 12px rgba(255,10,10,0.9),
          0 0 30px rgba(210,0,0,0.65),
          0 0 60px rgba(160,0,0,0.45);
      }
      50% {
        text-shadow:
          0 0 20px rgba(255,30,30,1),
          0 0 50px rgba(230,0,0,0.8),
          0 0 90px rgba(180,0,0,0.6),
          0 0 130px rgba(100,0,0,0.3);
      }
    }
    @keyframes flicker {
      0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; }
      20%,22%,24%                       { opacity: 0.18; }
      55%                               { opacity: 0.35; }
    }
    @keyframes dripGrow {
      0%   { transform: scaleY(0); opacity: 0; }
      30%  { opacity: 1; }
      100% { transform: scaleY(1); opacity: 1; }
    }
    @keyframes sheenSlide {
      0%   { left: -80%; }
      100% { left: 180%; }
    }

    .lamp-anim      { animation: lampSwing 5.5s ease-in-out infinite; transform-origin: 50% 0; }
    .bulb-flicker   { animation: flicker 9s linear infinite; }
    .breathe        { animation: breathe 6.5s ease-in-out infinite; }
    .title-pulse    { animation: titlePulse 3s ease-in-out infinite; }
  `}</style>
);

/* ─────────────────────────────────────────────────────
   LAMP SVG (exactly like reference)
───────────────────────────────────────────────────── */
const Lamp = ({ flicker }) => (
  <svg
    width="180"
    height="210"
    viewBox="0 0 180 210"
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: "visible" }}
  >
    <defs>
      <linearGradient id="shadeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a3a3a" />
        <stop offset="50%" stopColor="#1e1e1e" />
        <stop offset="100%" stopColor="#0f0f0f" />
      </linearGradient>
      <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#444" />
        <stop offset="100%" stopColor="#1a1a1a" />
      </linearGradient>
      <radialGradient id="bulbGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff9e0" />
        <stop offset="25%" stopColor="#ffe566" />
        <stop offset="60%" stopColor="#cc8800" />
        <stop offset="100%" stopColor="#7a3800" />
      </radialGradient>
      <radialGradient id="coneGrad" cx="50%" cy="0%" r="100%" fx="50%" fy="0%">
        <stop offset="0%" stopColor="rgba(255,210,100,0.20)" />
        <stop offset="40%" stopColor="rgba(255,170,50,0.08)" />
        <stop offset="100%" stopColor="rgba(255,110,0,0)" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Cord */}
    <rect x="88" y="0" width="4" height="58" rx="2" fill="#1c1c1c" />
    {/* Cap */}
    <rect x="68" y="55" width="44" height="10" rx="4" fill="url(#capGrad)" />
    <rect x="66" y="64" width="48" height="5" rx="2" fill="#111" />
    {/* Shade body */}
    <polygon points="48,70 132,70 112,138 68,138" fill="url(#shadeGrad)" />
    {/* Shade seam lines */}
    <line x1="68" y1="138" x2="48" y2="70" stroke="#0d0d0d" strokeWidth="1.5" />
    <line
      x1="112"
      y1="138"
      x2="132"
      y2="70"
      stroke="#0d0d0d"
      strokeWidth="1.5"
    />
    <line
      x1="68"
      y1="138"
      x2="112"
      y2="138"
      stroke="#1a1a1a"
      strokeWidth="1.8"
    />
    <line x1="48" y1="70" x2="132" y2="70" stroke="#444" strokeWidth="1" />
    {/* Small rivets */}
    <circle cx="60" cy="80" r="2.5" fill="#222" />
    <circle cx="120" cy="80" r="2.5" fill="#222" />

    {/* Light cone */}
    <motion.polygon
      points="68,138 112,138 175,480 5,480"
      fill="url(#coneGrad)"
      animate={{ opacity: flicker ? [0.1, 0.35, 0.08] : [0.55, 0.75, 0.58] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Bulb halo */}
    <motion.circle
      cx="90"
      cy="142"
      r="18"
      fill="none"
      stroke="rgba(255,220,100,0.12)"
      strokeWidth="12"
      animate={{ scale: flicker ? [0.65, 1.1, 0.55] : [0.9, 1.22, 0.95] }}
      transition={{ duration: 2.2, repeat: Infinity }}
      style={{ transformOrigin: "90px 142px" }}
    />

    {/* Bulb */}
    <motion.circle
      cx="90"
      cy="142"
      r="10"
      fill="url(#bulbGrad)"
      filter="url(#glow)"
      className={flicker ? "bulb-flicker" : ""}
      animate={{
        filter: flicker
          ? ["drop-shadow(0 0 3px #ffcc44)", "drop-shadow(0 0 1px #ff9900)"]
          : [
              "drop-shadow(0 0 10px #ffee66)",
              "drop-shadow(0 0 24px #ffcc44)",
              "drop-shadow(0 0 10px #ffee66)",
            ],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    {/* Bright spot */}
    <motion.circle
      cx="87"
      cy="138"
      r="3.5"
      fill="rgba(255,255,255,0.8)"
      animate={{ opacity: flicker ? [0.3, 0.7, 0.2] : [0.65, 1, 0.7] }}
      transition={{ duration: 1.8, repeat: Infinity }}
    />
  </svg>
);

/* ─────────────────────────────────────────────────────
   SHIELD / SKULL DIVIDER (matches reference)
───────────────────────────────────────────────────── */
const ShieldDivider = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      width: "100%",
      margin: "8px 0 14px",
    }}
  >
    <div
      style={{
        flex: 1,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(180,10,10,0.7))",
      }}
    />
    <motion.div
      animate={{
        filter: [
          "drop-shadow(0 0 3px #aa0000)",
          "drop-shadow(0 0 9px #ff2222)",
          "drop-shadow(0 0 3px #aa0000)",
        ],
      }}
      transition={{ duration: 2.5, repeat: Infinity }}
      style={{
        margin: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield */}
        <path
          d="M50 8 L88 22 V52 C88 74 50 92 50 92 C50 92 12 74 12 52 V22 Z"
          fill="rgba(6,0,0,0.95)"
          stroke="#bb0000"
          strokeWidth="3.5"
        />
        {/* Inner shield line */}
        <path
          d="M50 16 L80 28 V50 C80 68 50 83 50 83 C50 83 20 68 20 50 V28 Z"
          fill="none"
          stroke="#7a0000"
          strokeWidth="1.5"
        />
        {/* Skull face */}
        <ellipse
          cx="50"
          cy="48"
          rx="18"
          ry="17"
          fill="#cc1111"
          opacity="0.12"
        />
        <circle cx="43" cy="46" r="6" fill="#0c0000" />
        <circle cx="57" cy="46" r="6" fill="#0c0000" />
        <rect
          x="43"
          y="58"
          width="14"
          height="12"
          rx="2"
          fill="rgba(6,0,0,0.95)"
          stroke="#bb0000"
          strokeWidth="1.5"
        />
        <line
          x1="47"
          y1="58"
          x2="47"
          y2="70"
          stroke="#bb0000"
          strokeWidth="1.2"
        />
        <line
          x1="50"
          y1="58"
          x2="50"
          y2="70"
          stroke="#bb0000"
          strokeWidth="1.2"
        />
        <line
          x1="53"
          y1="58"
          x2="53"
          y2="70"
          stroke="#bb0000"
          strokeWidth="1.2"
        />
      </svg>
    </motion.div>
    <div
      style={{
        flex: 1,
        height: 1,
        background: "linear-gradient(270deg, transparent, rgba(180,10,10,0.7))",
      }}
    />
  </div>
);

/* ─────────────────────────────────────────────────────
   INPUT FIELD (matches reference style)
───────────────────────────────────────────────────── */
const Field = ({
  icon: Icon,
  placeholder,
  type = "text",
  value,
  onChange,
  rightSlot,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      {/* Left icon */}
      <div
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: focused ? "#cc2222" : "#7a2222",
          transition: "color 0.2s",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Icon size={15} />
      </div>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "13px 44px 13px 42px",
          background: focused ? "rgba(16,2,2,0.92)" : "rgba(8,0,0,0.78)",
          border: `1px solid ${focused ? "rgba(200,20,20,0.75)" : "rgba(120,10,10,0.45)"}`,
          borderRadius: 3,
          color: "#ddc8c8",
          fontSize: 13,
          letterSpacing: "0.05em",
          fontFamily: "'Special Elite', monospace",
          boxShadow: focused
            ? "0 0 14px rgba(220,0,0,0.22), inset 0 0 8px rgba(80,0,0,0.1)"
            : "none",
          transition: "border-color 0.22s, box-shadow 0.22s, background 0.22s",
        }}
      />

      {/* Right slot */}
      {rightSlot && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {rightSlot}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   SIGN IN BUTTON (red outlined — matches reference exactly)
───────────────────────────────────────────────────── */
const SignInBtn = ({ children, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <motion.button
      id="sign-in-btn"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.988 }}
      style={{
        width: "100%",
        padding: "14px 0",
        marginTop: 8,
        background: hov ? "rgba(30,2,2,0.95)" : "rgba(10,0,0,0.88)",
        border: "2px solid #dd1515",
        borderRadius: 3,
        color: "#f2f2f2",
        fontSize: 12,
        letterSpacing: "0.42em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: "'Special Elite', monospace",
        fontWeight: 700,
        boxShadow: hov
          ? "0 0 28px rgba(255,0,0,0.65), 0 0 55px rgba(180,0,0,0.25), inset 0 0 12px rgba(200,0,0,0.18)"
          : "0 0 12px rgba(200,0,0,0.38), inset 0 0 6px rgba(120,0,0,0.12)",
        textShadow: "0 0 8px rgba(255,100,100,0.45)",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.28s ease",
      }}
    >
      {/* Sheen on hover */}
      <AnimatePresence>
        {hov && (
          <motion.div
            key="sheen"
            initial={{ left: "-80%" }}
            animate={{ left: "180%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              width: "50%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.11), transparent)",
              transform: "skewX(-22deg)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  );
};

/* ─────────────────────────────────────────────────────
   CREATE ACCOUNT BUTTON (dark secondary — matches reference)
───────────────────────────────────────────────────── */
const CreateAccountBtn = ({ children, onClick }) => (
  <motion.button
    id="create-account-btn"
    onClick={onClick}
    whileHover={{
      scale: 1.01,
      borderColor: "rgba(180,20,20,0.65)",
      color: "#cc8888",
    }}
    whileTap={{ scale: 0.99 }}
    style={{
      width: "100%",
      padding: "13px 0",
      background: "rgba(8,0,0,0.72)",
      border: "1px solid rgba(100,8,8,0.45)",
      borderRadius: 3,
      color: "#7a4444",
      fontSize: 11,
      letterSpacing: "0.35em",
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "'Special Elite', monospace",
      transition: "all 0.25s",
    }}
  >
    {children}
  </motion.button>
);

/* ─────────────────────────────────────────────────────
   AUTH PAGE
───────────────────────────────────────────────────── */
export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  /* Random lamp flicker */
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.08) {
        setFlicker(true);
        setTimeout(() => setFlicker(false), 50 + Math.random() * 130);
      }
    }, 2400);
    return () => clearInterval(t);
  }, []);

  /* Stop background wind loop when mounting AuthPage */
  useEffect(() => {
    if (AudioManager.initialized) {
      AudioManager.stopAudioLoops();
    }
  }, []);

  const resetForm = () =>
    setForm({ email: "", username: "", password: "", confirm: "" });

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await apiSignIn(form.email, form.password);
        const token = res.data.token;

        // Clear ALL stale user data from any previous session before saving new credentials
        localStorage.removeItem("username");
        localStorage.removeItem("mafia_username");
        localStorage.removeItem("mafia_avatar");
        localStorage.removeItem("userId");

        localStorage.setItem("token", token);

        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload && payload._id) {
            localStorage.setItem("userId", payload._id);
          }
        } catch (e) {
          console.error("Failed to decode token", e);
        }

        navigate("/dashboard");
      } else {
        await apiSignUp(form.username, form.email, form.password, form.confirm);
        alert("Account created! Please sign in.");
        setMode("login");
        resetForm();
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlobalStyles />

      {/* ── BACKGROUND ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage: `url("/images/mafia_auth_bg.png")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#000",
        }}
      />

      {/* ── FILM GRAIN ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          opacity: 0.5,
        }}
      />

      {/* ── VIGNETTE ── */}
      <div
        className="breathe"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 4,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 88% 88% at 50% 50%, transparent 32%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      {/* ── LAMP (swinging) ── */}
      <div
        style={{
          position: "fixed",
          top: -8,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 6,
          pointerEvents: "none",
        }}
      >
        <div className="lamp-anim">
          <Lamp flicker={flicker} />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 20px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "100%",
            maxWidth: 398,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* ── TITLE BLOCK ── */}
          <div
            style={{
              textAlign: "center",
              userSelect: "none",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {/* WELCOME */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{
                fontFamily: "'Creepster', cursive",
                fontSize: 28,
                color: "#990e0e",
                letterSpacing: "0.18em",
                margin: 0,
                textShadow:
                  "0 0 10px rgba(200,0,0,0.5), 0 0 22px rgba(150,0,0,0.3)",
              }}
            >
              WELCOME
            </motion.p>

            {/* TO THE */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.8 }}
              style={{
                fontFamily: "'Creepster', cursive",
                fontSize: 16,
                color: "#6e0a0a",
                letterSpacing: "0.12em",
                margin: "2px 0",
                textShadow: "0 0 8px rgba(180,0,0,0.35)",
              }}
            >
              TO THE
            </motion.p>

            {/* FAMILY */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.5,
                duration: 1,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{
                fontFamily: "'Creepster', cursive",
                fontSize: 68,
                color: "#ee0404",
                letterSpacing: "0.06em",
                margin: 0,
                lineHeight: 0.88,
              }}
            >
              FAMILY
            </motion.h1>
          </div>

          {/* ── TAGLINE ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.9 }}
            style={{
              fontFamily: "'Special Elite', monospace",
              fontSize: 11,
              color: "#9a9a9a",
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              margin: "8px 0 0",
            }}
          >
            TRUST{" "}
            <motion.span
              animate={{ color: ["#cc1111", "#ff3333", "#cc1111"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ textShadow: "0 0 6px rgba(220,0,0,0.45)" }}
            >
              NO ONE.
            </motion.span>
          </motion.p>

          {/* ── SHIELD DIVIDER ── */}
          <ShieldDivider />

          {/* ════════════════════════════════════
              FORM  (no visible card box — floats
              directly on the dark background,
              matching the reference exactly)
          ════════════════════════════════════ */}
          <div style={{ width: "100%" }}>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              >
                {/* Username — register only */}
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.32 }}
                  >
                    <Field
                      icon={User}
                      placeholder="Username"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                    />
                  </motion.div>
                )}

                {/* Email / Username */}
                <Field
                  icon={User}
                  placeholder="Email or Username"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                {/* Password */}
                <Field
                  icon={Lock}
                  placeholder="Password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#7a2222",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        opacity: 0.8,
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = 0.8)
                      }
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />

                {/* Confirm Password — register only */}
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.32 }}
                  >
                    <Field
                      icon={Lock}
                      placeholder="Confirm Password"
                      type={showConf ? "text" : "password"}
                      value={form.confirm}
                      onChange={(e) =>
                        setForm({ ...form, confirm: e.target.value })
                      }
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowConf((v) => !v)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#7a2222",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            opacity: 0.8,
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.opacity = 1)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.opacity = 0.8)
                          }
                        >
                          {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      }
                    />
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {error && (
              <p
                style={{
                  color: "#ff4444",
                  fontSize: 12,
                  fontFamily: "'Special Elite', monospace",
                  letterSpacing: "0.05em",
                  margin: "0 0 8px",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <SignInBtn onClick={handleSubmit}>
              {loading
                ? "PLEASE WAIT..."
                : mode === "login"
                  ? "SIGN IN"
                  : "CREATE ACCOUNT"}
            </SignInBtn>

            {/* OR separator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                margin: "14px 0 10px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(140, 10, 10, 0.45))",
                }}
              />
              <span
                style={{
                  padding: "0 12px",
                  fontSize: 10,
                  color: "rgba(140, 20, 20, 0.8)",
                  fontFamily: "'Special Elite', monospace",
                  letterSpacing: "0.22em",
                  fontWeight: "bold",
                  textShadow: "0 0 4px rgba(100, 0, 0, 0.5)",
                }}
              >
                OR
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    "linear-gradient(270deg, transparent, rgba(140, 10, 10, 0.45))",
                }}
              />
            </div>

            {/* Secondary — switch mode */}
            <CreateAccountBtn
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setShowPass(false);
                setShowConf(false);
                resetForm();
              }}
            >
              {mode === "login"
                ? "CREATE ACCOUNT"
                : "ALREADY A MEMBER?  SIGN IN"}
            </CreateAccountBtn>
          </div>
        </motion.div>
      </div>
    </>
  );
}
