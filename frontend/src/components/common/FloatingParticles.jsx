import React, { useEffect, useRef } from "react";

/**
 * FloatingParticles.jsx
 * High-performance 60fps canvas particle system.
 * Supports themes: "mafia", "doctor", "police", "eliminated", "villager", "dawn"
 */
export default function FloatingParticles({ theme = "mafia", density = 45, interactive = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Color palettes & particle behaviors per theme
    const palettes = {
      mafia: {
        colors: ["#ff1a2a", "#ff4455", "#b91c1c", "#ff7700", "#550010"],
        speedY: -0.6,
        speedX: 0.3,
        sizeRange: [1.5, 4.5],
        pulse: true,
        glow: "rgba(255, 30, 45, 0.4)",
        trail: true,
      },
      doctor: {
        colors: ["#10b981", "#34d399", "#059669", "#06b6d4", "#a7f3d0"],
        speedY: -0.4,
        speedX: 0.2,
        sizeRange: [1.8, 5],
        pulse: true,
        glow: "rgba(16, 185, 129, 0.35)",
        crosses: true,
      },
      police: {
        colors: ["#3b82f6", "#60a5fa", "#1d4ed8", "#ef4444", "#93c5fd"],
        speedY: 0.2,
        speedX: 0.4,
        sizeRange: [1.5, 4],
        pulse: true,
        glow: "rgba(59, 130, 246, 0.35)",
        radar: true,
      },
      eliminated: {
        colors: ["#ef4444", "#991b1b", "#7f1d1d", "#dc2626", "#f87171", "#18181b"],
        speedY: -0.7,
        speedX: 0.5,
        sizeRange: [2, 6],
        pulse: true,
        glow: "rgba(239, 68, 68, 0.5)",
        ash: true,
      },
      villager: {
        colors: ["#818cf8", "#c084fc", "#94a3b8", "#e2e8f0", "#6366f1"],
        speedY: -0.2,
        speedX: 0.1,
        sizeRange: [1, 3],
        pulse: true,
        glow: "rgba(129, 140, 248, 0.3)",
      },
      dawn: {
        colors: ["#fbbf24", "#f59e0b", "#f97316", "#fef08a", "#e11d48"],
        speedY: -0.5,
        speedX: 0.3,
        sizeRange: [2, 5],
        pulse: true,
        glow: "rgba(251, 191, 36, 0.4)",
      },
    };

    const config = palettes[theme] || palettes.mafia;
    const particles = [];
    const count = Math.min(density, Math.floor((width * height) / 22000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (config.sizeRange[1] - config.sizeRange[0]) + config.sizeRange[0],
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        vx: (Math.random() - 0.5) * 0.8 + config.speedX * (Math.random() * 0.5 + 0.5),
        vy: (Math.random() - 0.5) * 0.5 + config.speedY * (Math.random() * 0.8 + 0.6),
        alpha: Math.random() * 0.7 + 0.2,
        baseAlpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulseAngle: Math.random() * Math.PI * 2,
        isShape: Math.random() > 0.7,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
      });
    }

    let radarAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Police Radar Sweep effect
      if (config.radar) {
        radarAngle += 0.015;
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const radius = Math.min(width, height) * 0.65;

        const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
        grad.addColorStop(0, "rgba(59, 130, 246, 0.05)");
        grad.addColorStop(0.7, "rgba(29, 78, 216, 0.03)");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Radar line
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(radarAngle);
        const lineGrad = ctx.createLinearGradient(0, 0, radius, 0);
        lineGrad.addColorStop(0, "rgba(96, 165, 250, 0.4)");
        lineGrad.addColorStop(0.9, "rgba(59, 130, 246, 0.15)");
        lineGrad.addColorStop(1, "transparent");
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Render each particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulseAngle += p.pulseSpeed;
        p.rotation += p.rotationSpeed;
        p.alpha = p.baseAlpha + Math.sin(p.pulseAngle) * 0.25;

        // Wrap around bounds
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        ctx.save();
        ctx.globalAlpha = Math.max(0.05, Math.min(1, p.alpha));
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;

        if (config.crosses && p.isShape) {
          // Doctor medical cross shape
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          const w = p.size * 1.8;
          const t = p.size * 0.6;
          ctx.fillRect(-w / 2, -t / 2, w, t);
          ctx.fillRect(-t / 2, -w / 2, t, w);
        } else if (config.ash && p.isShape) {
          // Ash flake / ember shard
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5);
          ctx.lineTo(p.size, p.size);
          ctx.lineTo(-p.size, p.size);
          ctx.closePath();
          ctx.fill();
        } else {
          // Glowing Circle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, density]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
