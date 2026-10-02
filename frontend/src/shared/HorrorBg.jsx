import { useMemo, useEffect, useRef } from 'react';

/* ── Rain drops ─────────────────────────────────────── */
const RAIN = Array.from({ length: 60 }, (_, i) => ({
  left:   (i * 137.508) % 100,
  dur:    0.6 + ((i * 53) % 80) / 100,
  delay:  ((i * 91)  % 220) / 100,
  h:      55 + ((i * 31) % 70),
  op:     0.15 + ((i * 17) % 30) / 100,
  w:      i % 5 === 0 ? 1.8 : 1,
}));

/* ── Embers (floating ash particles) ─────────────────── */
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  left:  10 + (i * 73.1) % 80,
  size:  2 + (i % 3),
  dur:   3 + ((i * 41) % 50) / 10,
  delay: ((i * 67) % 300) / 100,
  color: i % 3 === 0 ? '#ff4400' : i % 3 === 1 ? '#ff7700' : '#ffaa00',
}));

export default function HorrorBg() {
  const canvasRef = useRef(null);

  /* Film grain via canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let frame = 0;

    const draw = () => {
      frame++;
      const W = canvas.width  = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      if (!W || !H || W <= 0 || H <= 0) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const img = ctx.createImageData(W, H);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() * 28) | 0;
        data[i]   = n;
        data[i+1] = n;
        data[i+2] = n;
        data[i+3] = 28; // very subtle alpha
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>

      {/* ── BASE: Deep void gradient ─────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 120% 80% at 50% 0%, #130820 0%, #07030f 50%, #020107 100%)
        `,
      }} />

      {/* ── BLOOD MOON (top right) ───────────────────────── */}
      <div style={{
        position: 'absolute', top: -60, right: 80,
        width: 220, height: 220,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #4a1010 0%, #220608 40%, #0e0306 100%)',
        boxShadow: '0 0 60px rgba(140,10,10,0.35), 0 0 120px rgba(100,5,5,0.2), 0 0 200px rgba(70,0,5,0.12)',
        filter: 'blur(1px)',
      }} />
      {/* Moon glow halo */}
      <div style={{
        position: 'absolute', top: -100, right: 30,
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,10,10,0.18) 0%, transparent 70%)',
      }} />
      {/* Moon craters */}
      {[
        {x:'62%',y:'28%',s:18,o:0.18},
        {x:'75%',y:'44%',s:10,o:0.13},
        {x:'55%',y:'50%',s:7,o:0.10},
      ].map((c,i)=>(
        <div key={i} style={{
          position:'absolute', top:c.y, right: i===0?'9%':i===1?'5%':'11%',
          width:c.s, height:c.s, borderRadius:'50%',
          background:`rgba(5,1,8,${c.o})`,
          boxShadow:`inset 1px 1px 3px rgba(0,0,0,0.5)`,
        }}/>
      ))}

      {/* ── DISTANT CITY SILHOUETTE (horizon) ────────────── */}
      <svg
        viewBox="0 0 1440 280"
        preserveAspectRatio="none"
        style={{ position:'absolute', bottom:'25%', left:0, width:'100%', height:'auto', opacity:0.55 }}
      >
        {/* Far buildings */}
        {[
          [0,200,60,180],[55,210,45,200],[95,190,80,190],[170,215,35,215],[200,195,55,195],
          [250,205,65,205],[310,188,40,188],[345,200,90,200],[430,180,50,180],[475,195,70,195],
          [540,210,35,210],[570,200,80,200],[645,185,45,185],[685,205,60,205],[740,195,100,195],
          [835,210,40,210],[870,190,75,190],[940,205,50,205],[985,195,65,195],[1045,215,35,215],
          [1075,200,90,200],[1160,185,50,185],[1205,205,70,205],[1270,195,80,195],[1345,210,50,210],
          [1390,188,55,188],
        ].map(([x,h,w,y],i)=>(
          <rect key={i} x={x} y={280-h} width={w} height={h}
            fill={i%4===0?'#0a0612':i%4===1?'#080410':'#06030e'}
          />
        ))}
        {/* Window lights — random amber/blue flickers */}
        {Array.from({length:80},(_,i)=>({
          x: 5 + (i*53.7)%1430,
          y: 280 - 20 - ((i*37)%170),
          c: i%5===0?'rgba(255,200,80,0.7)':i%5===1?'rgba(80,120,255,0.5)':i%5===2?'rgba(255,80,60,0.4)':'rgba(200,160,80,0.35)',
          s: 3+i%3,
        })).map((w,i)=>(
          <rect key={i} x={w.x} y={w.y} width={w.s} height={w.s+1} fill={w.c} rx={1}/>
        ))}
      </svg>

      {/* ── GROUND FOG LAYERS ───────────────────────────── */}
      <div style={{
        position:'absolute', bottom:0, left:'-10%', right:'-10%', height:'35%',
        background:'linear-gradient(to top, rgba(6,2,12,0.95) 0%, rgba(15,5,20,0.7) 30%, rgba(20,8,25,0.3) 60%, transparent 100%)',
        animation:'fog-drift 18s ease-in-out infinite',
        filter:'blur(6px)',
      }}/>
      <div style={{
        position:'absolute', bottom:0, left:'-15%', right:'-15%', height:'22%',
        background:'linear-gradient(to top, rgba(8,3,14,0.98) 0%, rgba(18,6,24,0.6) 50%, transparent 100%)',
        animation:'fog-drift 26s ease-in-out infinite reverse',
        filter:'blur(12px)',
      }}/>

      {/* ── FOREGROUND DARK TREES (silhouettes) ─────────── */}
      <svg viewBox="0 0 1440 400" preserveAspectRatio="none"
        style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'38%', opacity:0.9 }}>
        {/* Left tree cluster */}
        <ellipse cx={60}  cy={200} rx={55} ry={200} fill="#030108"/>
        <ellipse cx={100} cy={180} rx={45} ry={180} fill="#040109"/>
        <ellipse cx={30}  cy={220} rx={35} ry={180} fill="#02010a"/>
        <rect x={50}  y={180} width={16} height={220} fill="#020108" rx={4}/>
        <rect x={88}  y={160} width={12} height={240} fill="#020108" rx={3}/>
        {/* Bare branches */}
        <line x1={60} y1={220} x2={25}  y2={170} stroke="#02010a" strokeWidth={6} strokeLinecap="round"/>
        <line x1={60} y1={260} x2={100} y2={200} stroke="#02010a" strokeWidth={5} strokeLinecap="round"/>
        <line x1={60} y1={300} x2={20}  y2={265} stroke="#02010a" strokeWidth={4} strokeLinecap="round"/>
        <line x1={88} y1={240} x2={120} y2={190} stroke="#02010a" strokeWidth={4} strokeLinecap="round"/>

        {/* Right tree cluster */}
        <ellipse cx={1380} cy={200} rx={60} ry={200} fill="#030108"/>
        <ellipse cx={1340} cy={180} rx={50} ry={185} fill="#040109"/>
        <ellipse cx={1410} cy={225} rx={40} ry={175} fill="#02010a"/>
        <rect x={1372} y={175} width={16} height={225} fill="#020108" rx={4}/>
        <rect x={1335} y={160} width={12} height={240} fill="#020108" rx={3}/>
        <line x1={1380} y1={220} x2={1415} y2={170} stroke="#02010a" strokeWidth={6} strokeLinecap="round"/>
        <line x1={1380} y1={260} x2={1340} y2={200} stroke="#02010a" strokeWidth={5} strokeLinecap="round"/>
        <line x1={1380} y1={300} x2={1418} y2={260} stroke="#02010a" strokeWidth={4} strokeLinecap="round"/>
        <line x1={1335} y1={245} x2={1305} y2={195} stroke="#02010a" strokeWidth={4} strokeLinecap="round"/>

        {/* Mid left smaller trees */}
        <ellipse cx={200} cy={300} rx={30} ry={130} fill="#030108" opacity={0.9}/>
        <rect x={194} y={280} width={10} height={120} fill="#020108" rx={3}/>
        <ellipse cx={260} cy={310} rx={25} ry={100} fill="#040109" opacity={0.85}/>

        {/* Mid right smaller trees */}
        <ellipse cx={1240} cy={300} rx={30} ry={130} fill="#030108" opacity={0.9}/>
        <rect x={1234} y={280} width={10} height={120} fill="#020108" rx={3}/>
        <ellipse cx={1180} cy={310} rx={25} ry={100} fill="#040109" opacity={0.85}/>
      </svg>

      {/* ── VIGNETTE CORNERS ────────────────────────────── */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(2,1,7,0.75) 100%)',
      }}/>

      {/* ── RED ATMOSPHERIC TINT ────────────────────────── */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 60% at 50% 80%, rgba(100,5,10,0.22) 0%, transparent 70%)',
      }}/>

      {/* ── FALLING RAIN ────────────────────────────────── */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        {RAIN.map((r,i)=>(
          <span key={i} className="raindrop" style={{
            left:`${r.left}%`,
            width: r.w,
            height: r.h,
            opacity: r.op,
            background:'linear-gradient(to bottom,transparent,rgba(170,190,230,0.6),rgba(150,180,220,0.15))',
            animationDuration:`${r.dur}s`,
            animationDelay:`${r.delay}s`,
          }}/>
        ))}
      </div>

      {/* ── EMBERS / FLOATING ASH ───────────────────────── */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        {EMBERS.map((e,i)=>(
          <div key={i} className="ember" style={{
            left:`${e.left}%`,
            bottom:'5%',
            width: e.size,
            height: e.size,
            background: e.color,
            boxShadow:`0 0 ${e.size*2}px ${e.color}`,
            animationDuration:`${e.dur}s`,
            animationDelay:`${e.delay}s`,
            opacity: 0,
          }}/>
        ))}
      </div>

      {/* ── FILM GRAIN CANVAS ───────────────────────────── */}
      <canvas ref={canvasRef} style={{
        position:'absolute', inset:0, width:'100%', height:'100%',
        pointerEvents:'none', mixBlendMode:'overlay', opacity:0.35,
      }}/>

      {/* ── TOP DARKNESS FADE ───────────────────────────── */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:120,
        background:'linear-gradient(to bottom, rgba(2,1,7,0.85) 0%, transparent 100%)',
        pointerEvents:'none',
      }}/>

      {/* ── BOTTOM DARKNESS ─────────────────────────────── */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:100,
        background:'linear-gradient(to top, rgba(2,1,7,0.98) 0%, transparent 100%)',
        pointerEvents:'none',
      }}/>
    </div>
  );
}
