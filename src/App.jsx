import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const DATA_URL =
  "https://raw.githubusercontent.com/sosthenis/megasena-data/main/megasena.json";

// ═══════════════════════════════════════════════════
// CHROME & CARBON PALETTE
// ═══════════════════════════════════════════════════
const C = {
  bg:           "#07070A",
  panel:        "rgba(13,13,16,0.96)",
  border:       "rgba(212,175,55,0.22)",
  gold:         "#D4AF37",
  goldLight:    "#F5C518",
  goldBright:   "#FFD700",
  goldDark:     "#9A7C20",
  chrome:       "#C8C8CC",
  chromeLight:  "#ECECF0",
  chromeDark:   "#78787E",
  steel:        "#2A2A2E",
  steelLight:   "#3A3A3F",
  red:          "#FF453A",
  green:        "#32D74B",
  textPrimary:  "#F0F0F4",
  textSecondary:"#98989F",
  textMuted:    "#52525A",
};

// Carbon fiber weave via CSS
const CARBON_BG = `
  repeating-linear-gradient(
    45deg,
    rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px,
    transparent 1px, transparent 5px
  ),
  repeating-linear-gradient(
    -45deg,
    rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px,
    transparent 1px, transparent 5px
  ),
  rgba(13,13,16,0.98)
`;

const GOLD_GRADIENT  = `linear-gradient(135deg, #9A7C20 0%, #D4AF37 30%, #F5C518 55%, #D4AF37 75%, #8A6C10 100%)`;
const MAGIC_GOLD     = `linear-gradient(180deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)`;
const CHROME_GRADIENT = `linear-gradient(180deg, #E8E8EC 0%, #B8B8C0 35%, #888890 65%, #C8C8D0 100%)`;
const METAL_BORDER   = `1px solid rgba(212,175,55,0.22)`;

const carbonCard = {
  background: CARBON_BG,
  border: METAL_BORDER,
  borderRadius: 16,
  backdropFilter: "blur(20px)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.07),
    inset 0 -1px 0 rgba(0,0,0,0.7),
    0 8px 40px rgba(0,0,0,0.7),
    0 0 0 1px rgba(0,0,0,0.5),
    0 0 30px rgba(212,175,55,0.04)
  `,
};

// ═══════════════════════════════════════════════════
// COMPUTE ENGINE (unchanged)
// ═══════════════════════════════════════════════════
function computeAll(raw) {
  const entries = Object.entries(raw);
  const totalConcursos = entries.length;
  const allDezenas = [];
  const draws = [];
  for (const [, nums] of entries) {
    const sorted = nums.map(Number).sort((a, b) => a - b);
    draws.push(sorted);
    allDezenas.push(...sorted);
  }
  const freq = new Array(60).fill(0);
  for (const d of allDezenas) freq[d - 1]++;
  const alpha = new Array(60).fill(1);
  const posterior = freq.map((f, i) => f + alpha[i]);
  const postSum = posterior.reduce((a, b) => a + b, 0);
  const prob = posterior.map((p) => p / postSum);
  const expected = allDezenas.length / 60;
  const desvio = freq.map((f) => f - expected);
  const cooc = Array.from({ length: 60 }, () => new Array(60).fill(0));
  for (const draw of draws) {
    for (let i = 0; i < draw.length; i++) {
      for (let j = i + 1; j < draw.length; j++) {
        cooc[draw[i] - 1][draw[j] - 1]++;
        cooc[draw[j] - 1][draw[i] - 1]++;
      }
    }
  }
  return { totalConcursos, freq, prob, desvio, cooc, draws };
}

function generateGames(n, start, end, prob) {
  const available = [];
  const probs = [];
  for (let i = start; i <= end; i++) { available.push(i); probs.push(prob[i - 1]); }
  if (available.length < 6) return [];
  const pSum = probs.reduce((a, b) => a + b, 0);
  const normalized = probs.map((p) => p / pSum);
  const games = new Set();
  let attempts = 0;
  while (games.size < n && attempts < n * 100) {
    const chosen = [];
    const tempProbs = [...normalized];
    const tempAvail = [...available];
    for (let k = 0; k < 6; k++) {
      const pS = tempProbs.reduce((a, b) => a + b, 0);
      const r = Math.random() * pS;
      let cumul = 0;
      for (let j = 0; j < tempAvail.length; j++) {
        cumul += tempProbs[j];
        if (r <= cumul) {
          chosen.push(tempAvail[j]);
          tempAvail.splice(j, 1);
          tempProbs.splice(j, 1);
          break;
        }
      }
    }
    chosen.sort((a, b) => a - b);
    games.add(chosen.join(","));
    attempts++;
  }
  return [...games].map((g) => g.split(",").map(Number));
}

// ═══════════════════════════════════════════════════
// MONEY RAIN COMPONENT
// ═══════════════════════════════════════════════════
const MoneyRain = () => {
  const [bills, setBills] = useState([]);
  useEffect(() => {
    const newBills = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 3 + Math.random() * 5,
      size: 15 + Math.random() * 30,
      rotation: Math.random() * 360,
    }));
    setBills(newBills);
    const timer = setTimeout(() => setBills([]), 12000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {bills.map(b => (
        <div key={b.id} style={{
          position: "absolute",
          top: -60,
          left: `${b.left}%`,
          fontSize: b.size,
          animation: `moneyFall ${b.duration}s linear ${b.delay}s forwards`,
          opacity: 0,
        }}>
          💵
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// INTRO SEQUENCE COMPONENT (ADVANCED CYBERPUNK)
// ═══════════════════════════════════════════════════

const INTRO_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&display=swap');
  
  #intro-root { background:#000; overflow:hidden; width:100vw; height:100vh; font-family:'Share Tech Mono',monospace; position:fixed; inset:0; z-index:10000; }
  #intro-root canvas { position:fixed; top:0; left:0; z-index:0; }

  /* ── GATE ── */
  #gate {
    position:fixed; inset:0; z-index:100;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    background:#000008; cursor:pointer;
    transition:opacity 0.4s ease;
  }
  #gate-icon { font-size:48px; animation:gpulse 1.4s ease-in-out infinite; margin-bottom:14px; }
  #gate-title {
    font-family:'Bebas Neue',sans-serif;
    font-size:clamp(40px,8vw,90px);
    color:#00ff88; letter-spacing:8px;
    text-shadow:0 0 20px #00ff88,0 0 60px rgba(0,255,136,0.4);
    animation:gglitch 4s infinite;
  }
  #gate-sub {
    margin-top:14px; font-size:11px; letter-spacing:5px;
    color:rgba(0,255,136,0.45); text-transform:uppercase;
    animation:blink 1s step-end infinite;
  }
  @keyframes gpulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
  @keyframes gglitch {
    0%,88%,100%{transform:translate(0);filter:none}
    89%{transform:translate(-4px,1px);filter:hue-rotate(90deg)}
    91%{transform:translate(4px,-1px);filter:hue-rotate(-60deg)}
    93%{transform:translate(-2px,2px);filter:none}
  }

  /* ── COUNTDOWN OVERLAY ── */
  #cd-overlay {
    position:fixed; inset:0; z-index:50;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    pointer-events:none; opacity:0; transition:opacity 0.3s;
  }
  #cd-overlay.show { opacity:1; }

  #cd-num {
    font-family:'Bebas Neue',sans-serif;
    font-size:clamp(180px,32vw,380px);
    color:transparent;
    background:linear-gradient(180deg,rgba(0,255,136,0.22) 0%,rgba(0,255,136,0.04) 100%);
    -webkit-background-clip:text; background-clip:text;
    line-height:1; letter-spacing:-6px;
    filter:drop-shadow(0 0 40px rgba(0,255,136,0.15));
    user-select:none;
  }
  #cd-num.pop  { animation:cdPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  #cd-num.zap  { animation:cdZap 0.25s ease forwards; }
  @keyframes cdPop {
    0%  { transform:scale(0.5) skewX(-8deg); opacity:0.1; filter:drop-shadow(0 0 80px rgba(0,255,136,0.5)) blur(4px); }
    60% { transform:scale(1.1) skewX(2deg);  opacity:1;   filter:drop-shadow(0 0 60px rgba(0,255,136,0.4)) blur(0); }
    100%{ transform:scale(1)   skewX(0);     opacity:1;   filter:drop-shadow(0 0 30px rgba(0,255,136,0.2)); }
  }
  @keyframes cdZap {
    0%  { opacity:1; transform:scale(1)    skewX(0);    filter:drop-shadow(0 0 80px #00ff88) brightness(2); }
    50% { opacity:0.4; transform:scale(1.3) skewX(-12deg); filter:drop-shadow(0 0 120px #ff0055) brightness(3); }
    100%{ opacity:0;   transform:scale(1.6) skewX(0);    filter:none; }
  }

  #cd-bar-wrap {
    width:clamp(200px,35vw,360px); height:3px;
    background:rgba(0,255,136,0.1); border-radius:2px; margin-top:14px; overflow:hidden;
  }
  #cd-bar {
    height:100%; width:100%;
    background:linear-gradient(90deg,#00ff88,#00ccff);
    box-shadow:0 0 12px #00ff88;
    transform-origin:left;
    transform:scaleX(1);
    transition:transform 0.9s linear;
  }

  #cd-label {
    margin-top:16px; font-size:11px; letter-spacing:6px;
    color:rgba(0,255,136,0.45); text-transform:uppercase;
  }

  /* ── MAIN UI ── */
  .intro-ui {
    position:fixed; top:50%; left:50%;
    transform:translate(-50%,-50%);
    z-index:20; text-align:center;
    opacity:0; pointer-events:none;
    transition:opacity 0.5s ease;
  }
  .intro-ui.visible { opacity:1; pointer-events:all; }

  .intro-sub-line { color:#00ff88; font-size:12px; letter-spacing:4px; margin-top:6px; opacity:0.6; }
  .intro-glitch-wrap { position:relative; }
  .intro-glitch {
    font-family:'Bebas Neue',sans-serif;
    font-size:clamp(56px,9vw,110px);
    color:#00ff88; letter-spacing:8px;
    text-shadow:0 0 10px #00ff88,0 0 40px #00ff88,0 0 80px rgba(0,255,136,0.4);
    animation:intro-glitch 3s infinite; display:block; position:relative;
    opacity:0; animation:introGlitchIn 0.6s ease 0.2s forwards, intro-glitch 3s 1s infinite;
  }
  .intro-glitch::before,.intro-glitch::after { content:'FORTUNA'; position:absolute; top:0; left:0; right:0; }
  .intro-glitch::before { color:#ff0055; text-shadow:0 0 20px #ff0055; animation:intro-glitch-1 3s infinite; clip-path:polygon(0 0,100% 0,100% 35%,0 35%); }
  .intro-glitch::after  { color:#0088ff; text-shadow:0 0 20px #0088ff; animation:intro-glitch-2 3s infinite; clip-path:polygon(0 65%,100% 65%,100% 100%,0 100%); }

  .intro-dashboard-tag {
    font-family:'Bebas Neue',sans-serif;
    font-size:clamp(20px,3vw,32px);
    color:rgba(0,255,136,0.5); letter-spacing:12px; margin-top:4px;
    opacity:0; animation:introLineUp 0.5s ease 0.45s forwards;
  }
  .intro-meta-line {
    color:rgba(0,255,136,0.5); font-size:12px; letter-spacing:4px; margin-top:10px;
    opacity:0; animation:introLineUp 0.5s ease 0.65s forwards;
  }
  .intro-counter {
    margin-top:26px; font-size:13px; color:#00ff88; letter-spacing:2px;
    animation:introBlink 1s step-end infinite;
    opacity:0; animation:introLineUp 0.5s ease 0.8s forwards, introBlink 1s 1.3s step-end infinite;
  }
  .intro-btn {
    margin-top:22px; display:inline-block; background:transparent;
    border:1px solid #00ff88; color:#00ff88;
    font-family:'Share Tech Mono',monospace; font-size:13px; letter-spacing:3px;
    padding:12px 36px; cursor:pointer; text-transform:uppercase;
    transition:all 0.2s;
    box-shadow:0 0 20px rgba(0,255,136,0.2),inset 0 0 20px rgba(0,255,136,0.05);
    opacity:0; animation:introLineUp 0.6s cubic-bezier(0.34,1.56,0.64,1) 1s forwards;
  }
  .intro-btn:hover { background:#00ff88; color:#000; box-shadow:0 0 40px rgba(0,255,136,0.7); }

  /* CORNER INFO */
  .intro-corner { position:fixed; font-size:9px; color:rgba(0,255,136,0.28); letter-spacing:1px; line-height:1.85; z-index:25; }
  .intro-corner.tl{top:20px;left:20px} .intro-corner.tr{top:20px;right:20px;text-align:right}
  .intro-corner.bl{bottom:20px;left:20px} .intro-corner.br{bottom:20px;right:20px;text-align:right}

  /* Scanlines */
  .intro-scan { position:fixed; inset:0; z-index:16; pointer-events:none;
    background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 6px); }

  @keyframes intro-glitch   { 0%,90%,100%{transform:translate(0)} 91%{transform:translate(-3px,1px)} 93%{transform:translate(3px,-1px)} 95%{transform:translate(-2px,2px)} }
  @keyframes intro-glitch-1 { 0%,90%,100%{transform:translate(0);opacity:0} 91%{transform:translate(6px,0);opacity:0.8} 94%{transform:translate(-4px,0);opacity:0.6} 96%{opacity:0} }
  @keyframes intro-glitch-2 { 0%,90%,100%{transform:translate(0);opacity:0} 92%{transform:translate(-6px,0);opacity:0.8} 95%{transform:translate(4px,0);opacity:0.6} 97%{opacity:0} }
  @keyframes introGlitchIn { from{opacity:0;transform:skewX(-10deg) scale(0.92)} to{opacity:1;transform:skewX(0) scale(1)} }
  @keyframes introLineUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes introBlink    { 50%{opacity:0.15} }
`;

const IntroSequence = ({ onFinish }) => {
  const canvasRef = useCallback((node) => {
    if (!node) return;
    const ctx = node.getContext('2d');
    let width = (node.width = window.innerWidth);
    let height = (node.height = window.innerHeight);
    const bills = [];

    const makeBill = () => ({
      x: Math.random() * width,
      y: -120 - Math.random() * height,
      w: 88 + Math.random() * 32,
      h: 0,
      speed: 2 + Math.random() * 3,
      rot: (Math.random() - 0.5) * 0.6,
      rotV: (Math.random() - 0.5) * 0.02,
      alpha: 0.18 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 1,
      hue: Math.random() > 0.68 ? 150 : Math.random() > 0.5 ? 340 : 200,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: (Math.random() - 0.5) * 0.04,
    });

    for (let i = 0; i < 24; i++) {
      const b = makeBill();
      b.y = Math.random() * height;
      b.h = b.w * 0.44;
      bills.push(b);
    }

    const drawNeonBill = (b) => {
      const { x, y, w, h, rot, alpha, hue, flip } = b;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      const sY = Math.cos(flip);
      ctx.scale(1, sY);
      if (Math.abs(sY) < 0.05) {
        ctx.restore();
        return;
      }
      ctx.shadowColor = `hsl(${hue},100%,55%)`;
      ctx.shadowBlur = 18;
      const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      grad.addColorStop(0, `hsla(${hue},80%,8%,0.95)`);
      grad.addColorStop(1, `hsla(${hue + 20},80%,12%,0.95)`);
      ctx.fillStyle = grad;
      ctx.strokeStyle = `hsl(${hue},100%,45%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = `hsla(${hue},80%,40%,0.38)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 4, -h / 2 + 3, w - 8, h - 6, 1);
      ctx.stroke();
      ctx.shadowColor = `hsl(${hue},100%,70%)`;
      ctx.shadowBlur = 10;
      ctx.fillStyle = `hsl(${hue},100%,65%)`;
      ctx.font = `bold ${h * 0.42}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R$', 0, 0);
      ctx.font = `${h * 0.2}px monospace`;
      ctx.fillStyle = `hsla(${hue},100%,70%,0.6)`;
      ctx.fillText('100', -w * 0.27, -h * 0.22);
      ctx.fillText('100', w * 0.27, h * 0.22);
      ctx.restore();
    };

    let frame;
    const loop = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000008';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(0,255,136,0.035)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 60) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
      }
      bills.forEach((b) => {
        if (!b.h) b.h = b.w * 0.44;
        b.y += b.speed; b.x += b.drift; b.rot += b.rotV; b.flip += b.flipSpeed;
        if (b.y > height + b.h) {
          Object.assign(b, makeBill()); b.h = b.w * 0.44;
        }
        drawNeonBill(b);
      });
      frame = requestAnimationFrame(loop);
    };
    loop();

    const handleResize = () => {
      width = (node.width = window.innerWidth);
      height = (node.height = window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const [stage, setStage] = useState('countdown'); // countdown, ui
  const [count, setCount] = useState(5);
  const [percent, setPercent] = useState(0);
  const acRef = useState({ current: null })[0];

  const playBeep = (n) => {};
  const playChing = () => {};

  useEffect(() => {
    if (stage === 'countdown') {
      if (count > 0) {
        playBeep(count);
        const timer = setTimeout(() => setCount(count - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        playBeep(0);
        setTimeout(() => {
          setStage('ui');
          playChing();
          let p = 0;
          const iv = setInterval(() => {
            p += Math.floor(Math.random() * 6) + 2;
            if (p >= 100) { 
              p = 100; 
              clearInterval(iv); 
              setTimeout(onFinish, 800); // 800ms delay before dismissing intro
            }
            setPercent(p);
          }, 50);
        }, 800);
      }
    }
  }, [stage, count]);

  const startSequence = () => {
    setStage('countdown');
  };

  const labels = ['', '■ IMPACTO IMINENTE ■', '■ PREPARANDO SISTEMA ■', '■ SINCRONIZANDO ■', '■ VERIFICANDO MÓDULOS ■', '■ INICIALIZANDO SISTEMA ■'];

  return (
    <div id="intro-root">
      <style>{INTRO_CSS}</style>
      <canvas ref={canvasRef} />
      <div className="intro-scan" />



      {stage === 'countdown' && (
        <div id="cd-overlay" className="show">
          <div id="cd-num" className="pop">{count === 0 ? 'GO!' : count}</div>
          <div id="cd-bar-wrap">
            <div id="cd-bar" style={{ transform: `scaleX(${count / 5})`, transition: count === 5 ? 'none' : 'transform 0.9s linear' }} />
          </div>
          <div id="cd-label">{labels[count] || '■ INICIANDO ■'}</div>
        </div>
      )}

      {stage === 'ui' && (
        <div className="intro-ui visible">
          <div className="intro-sub-line">■ FORTUNA ENGINE — STATISTICAL SYSTEM</div>
          <div className="intro-glitch-wrap"><span className="intro-glitch">FORTUNA</span></div>
          <div className="intro-dashboard-tag">ENGINE</div>
          <div className="intro-meta-line">Mega-Sena Statistical Engine · React 19 + Vite 8</div>
          <div className="intro-counter">█ SISTEMA ONLINE... {percent}%</div>
          {percent >= 100 && (
            <div className="intro-meta-line" style={{marginTop: 20, color: '#fff'}}>Iniciando ambiente seguro...</div>
          )}
        </div>
      )}

      <div className="intro-corner tl">FORTUNA ENGINE v2.0.26<br />REACT 19 + VITE 8<br />RECHARTS 3</div>
      <div className="intro-corner tr">MÓDULO: STATISTICAL<br />STATUS: ONLINE<br />SEED: 14.133</div>
      <div className="intro-corner bl">SOSTHENIS.GITHUB.IO<br />FORTUNA-MEGASENA</div>
      <div className="intro-corner br">SYS: ACTIVE<br />PWR: 100%</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════
const MetalTooltip = ({ active, payload, labelKey, valueKey, valueFormat }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: `linear-gradient(160deg, #1A1A1E, #0E0E12)`,
      border: `1px solid ${C.gold}`,
      borderRadius: 10,
      padding: "9px 15px",
      fontFamily: "'JetBrains Mono', monospace",
      boxShadow: `0 0 20px rgba(212,175,55,0.25), 0 4px 16px rgba(0,0,0,0.8)`,
    }}>
      <div style={{ fontWeight: 800, marginBottom: 3, fontSize: 12, color: C.gold, letterSpacing: 1 }}>
        DEZENA {String(d[labelKey || "dezena"]).padStart(2, "0")}
      </div>
      <div style={{ color: C.chromeLight, fontSize: 13 }}>
        {valueFormat ? valueFormat(d[valueKey || "value"]) : d[valueKey || "value"]}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════

function KPICard({ label, value, sub, gold = false }) {
  return (
    <div style={{
      ...carbonCard,
      padding: "18px 20px",
      minWidth: 0,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* top chrome line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: gold ? GOLD_GRADIENT : CHROME_GRADIENT, borderRadius: "16px 16px 0 0" }} />
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: gold ? C.gold : C.chromeDark, fontWeight: 700, marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", background: gold ? GOLD_GRADIENT : CHROME_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `linear-gradient(160deg, #1E1A0A, #2A240E)` : "rgba(255,255,255,0.02)",
      border: active ? `1px solid rgba(212,175,55,0.5)` : `1px solid rgba(255,255,255,0.06)`,
      borderRadius: 10,
      padding: "9px 20px",
      color: active ? C.goldLight : C.textMuted,
      fontWeight: active ? 800 : 500,
      fontSize: 13,
      cursor: "pointer",
      marginRight: 8,
      marginBottom: 8,
      transition: "all 0.18s",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: 0.5,
      boxShadow: active ? `0 0 16px rgba(212,175,55,0.18), inset 0 1px 0 rgba(212,175,55,0.15)` : "none",
    }}>
      {label}
    </button>
  );
}

function BallDisplay({ numbers }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {numbers.map((n, i) => (
        <div key={i} style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 14,
          color: "#1A1200",
          background: GOLD_GRADIENT,
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.3),
            inset 0 -2px 4px rgba(0,0,0,0.5),
            0 0 16px rgba(212,175,55,0.5),
            0 4px 12px rgba(0,0,0,0.6)
          `,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {String(n).padStart(2, "0")}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CHART PANELS
// ═══════════════════════════════════════════════════

function ChartTitle({ children, color = C.gold }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      {children}
    </div>
  );
}

function FreqChart({ data }) {
  return (
    <div>
      <ChartTitle color={C.gold}>Frequência Histórica</ChartTitle>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="dezena" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<MetalTooltip valueKey="freq" valueFormat={(v) => `Frequência: ${v}`} />} />
          <Bar dataKey="freq" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={C.gold} fillOpacity={0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProbChart({ data }) {
  return (
    <div>
      <ChartTitle color={C.chrome}>Probabilidade Bayesiana</ChartTitle>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="dezena" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => v.toFixed(3)} />
          <Tooltip content={<MetalTooltip valueKey="prob" valueFormat={(v) => `Prob: ${v.toFixed(5)}`} />} />
          <Bar dataKey="prob" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={C.chrome} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DesvioChart({ data }) {
  return (
    <div>
      <ChartTitle color={C.chromeLight}>Desvio da Média</ChartTitle>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="dezena" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
          <Tooltip content={<MetalTooltip valueKey="desvio" valueFormat={(v) => `Desvio: ${v.toFixed(2)}`} />} />
          <Bar dataKey="desvio" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.desvio >= 0 ? C.green : C.red} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankChart({ data, title, dataKey, color }) {
  const sorted = [...data].sort((a, b) => b[dataKey] - a[dataKey]).map((d) => ({ ...d, label: String(d.dezena).padStart(2, "0") }));
  return (
    <div>
      <ChartTitle color={color}>{title}</ChartTitle>
      <ResponsiveContainer width="100%" height={Math.max(260, sorted.length * 28)}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <XAxis type="number" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={{ fill: C.textSecondary, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip content={<MetalTooltip labelKey="dezena" valueKey={dataKey} valueFormat={(v) => dataKey === "prob" ? `Prob: ${v.toFixed(5)}` : `Valor: ${typeof v === "number" ? v.toFixed(2) : v}`} />} />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {sorted.map((_, i) => <Cell key={i} fill={color} fillOpacity={0.88} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HeatmapPanel({ cooc, start, end }) {
  const size = end - start + 1;
  const slice = [];
  let maxVal = 0;
  for (let i = start - 1; i < end; i++) {
    for (let j = start - 1; j < end; j++) {
      if (i !== j) {
        slice.push({ x: i - start + 2, y: j - start + 2, v: cooc[i][j] });
        if (cooc[i][j] > maxVal) maxVal = cooc[i][j];
      }
    }
  }
  const cellSize = Math.max(8, Math.min(22, Math.floor(600 / size)));
  const totalSize = cellSize * size;

  return (
    <div>
      <ChartTitle color={C.gold}>Heatmap de Coocorrência</ChartTitle>
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 520, maxWidth: "100%" }}>
        <div style={{ position: "relative", width: totalSize + 30, height: totalSize + 30 }}>
          {Array.from({ length: size }, (_, i) => (
            <div key={`yl-${i}`} style={{ position: "absolute", left: 0, top: 30 + i * cellSize, width: 28, height: cellSize, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: Math.min(10, cellSize - 2), color: C.textMuted, paddingRight: 3, fontFamily: "'JetBrains Mono', monospace" }}>{start + i}</div>
          ))}
          {Array.from({ length: size }, (_, i) => (
            <div key={`xl-${i}`} style={{ position: "absolute", left: 30 + i * cellSize, top: 0, width: cellSize, height: 28, display: "flex", alignItems: "flex-end", justifyContent: "center", fontSize: Math.min(10, cellSize - 2), color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{start + i}</div>
          ))}
          {slice.map((cell, idx) => {
            const ratio = maxVal > 0 ? cell.v / maxVal : 0;
            let bg;
            if      (ratio < 0.15) bg = "#0A0A0C";
            else if (ratio < 0.32) bg = "#1A1A1E";
            else if (ratio < 0.50) bg = "#2E2E35";
            else if (ratio < 0.68) bg = C.chromeDark;
            else if (ratio < 0.84) bg = C.chrome;
            else                   bg = C.goldBright;
            return (
              <div key={idx} title={`${start + cell.x - 1} × ${start + cell.y - 1}: ${cell.v}`} style={{ position: "absolute", left: 30 + (cell.x - 1) * cellSize, top: 30 + (cell.y - 1) * cellSize, width: cellSize - 1, height: cellSize - 1, background: bg, borderRadius: 2, cursor: "crosshair" }} />
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[["#0A0A0C","Baixa"],["#1A1A1E",""],["#2E2E35",""],[C.chromeDark,""],[C.chrome,""],[C.goldBright,"Alta"]].map(([color, label], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: color, border: "1px solid rgba(255,255,255,0.08)" }} />
            {label && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDERS
// ═══════════════════════════════════════════════════
function SliderLabel({ children }) {
  return <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: C.chromeDark, fontWeight: 700, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>;
}

function RangeSlider({ label, min, max, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SliderLabel>{label}</SliderLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="range" min={min} max={max} value={value[0]} onChange={(e) => { const v = Math.min(Number(e.target.value), value[1] - 5); onChange([v, value[1]]); }} style={{ flex: 1, accentColor: C.gold }} />
        <input type="range" min={min} max={max} value={value[1]} onChange={(e) => { const v = Math.max(Number(e.target.value), value[0] + 5); onChange([value[0], v]); }} style={{ flex: 1, accentColor: C.chrome }} />
      </div>
      <div style={{ textAlign: "center", fontSize: 15, fontWeight: 900, marginTop: 6, fontFamily: "'JetBrains Mono', monospace", background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {String(value[0]).padStart(2, "0")} — {String(value[1]).padStart(2, "0")}
      </div>
    </div>
  );
}

function SimpleSlider({ label, min, max, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SliderLabel>{label}</SliderLabel>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: C.gold }} />
      <div style={{ textAlign: "center", fontSize: 15, fontWeight: 900, marginTop: 6, fontFamily: "'JetBrains Mono', monospace", color: C.chromeLight }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════
function Divider() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)`, margin: "16px 0" }} />;
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function MegaSenaDashboard() {
  const [showIntro, setShowIntro] = useState(true);
  const [rawData, setRawData]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [range, setRange]       = useState([1, 60]);
  const [topN, setTopN]         = useState(10);
  const [numJogos, setNumJogos] = useState(10);
  const [tab, setTab]           = useState("panorama");
  const [jogos, setJogos]       = useState([]);
  const [jogosKey, setJogosKey] = useState(0);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => r.json())
      .then((d) => {
        // A nova API retorna um array, transformamos no objeto { concurso: dezenas } esperado
        const mapped = d.reduce((acc, item) => {
          acc[item.concurso] = item.dezenas;
          return acc;
        }, {});
        setRawData(mapped);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const computed = useMemo(() => { if (!rawData) return null; return computeAll(rawData); }, [rawData]);

  const chartData = useMemo(() => {
    if (!computed) return null;
    const [s, e] = range;
    const freqData = [], probData = [], desvioData = [];
    for (let i = s; i <= e; i++) {
      freqData.push({ dezena: i, freq: computed.freq[i - 1] });
      probData.push({ dezena: i, prob: computed.prob[i - 1] });
      desvioData.push({ dezena: i, desvio: computed.desvio[i - 1] });
    }
    const rankFreq   = [...freqData].sort((a, b) => b.freq - a.freq).slice(0, topN);
    const rankProb   = [...probData].sort((a, b) => b.prob - a.prob).slice(0, topN);
    const rankDesvio = [...desvioData].sort((a, b) => b.desvio - a.desvio).slice(0, topN);
    return { freqData, probData, desvioData, rankFreq, rankProb, rankDesvio };
  }, [computed, range, topN]);

  const kpis = useMemo(() => {
    if (!chartData || !computed) return null;
    const topFreq = chartData.rankFreq[0];
    const topProb = chartData.rankProb[0];
    return {
      concursos: computed.totalConcursos,
      faixa: `${String(range[0]).padStart(2, "0")} — ${String(range[1]).padStart(2, "0")}`,
      freqDezena: String(topFreq.dezena).padStart(2, "0"),
      freqVal: topFreq.freq,
      probDezena: String(topProb.dezena).padStart(2, "0"),
      probVal: topProb.prob.toFixed(4),
    };
  }, [chartData, computed, range]);

  const handleGerarJogos = useCallback(() => {
    if (!computed) return;
    setJogos(generateGames(numJogos, range[0], range[1], computed.prob));
    setJogosKey((k) => k + 1);
  }, [computed, numJogos, range]);

  useEffect(() => { if (tab === "jogos" && jogos.length === 0 && computed) handleGerarJogos(); }, [tab, computed]);

  // ── Loading ──────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 20, background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "spin 2s linear infinite" }}>◈</div>
        <div style={{ fontSize: 14, color: C.chrome, letterSpacing: 2 }}>CARREGANDO DADOS...</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, letterSpacing: 1 }}>{">"}2900 CONCURSOS</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", padding: 30, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.red, marginBottom: 10, letterSpacing: 1 }}>FALHA NA CONEXÃO</div>
        <div style={{ color: C.textMuted, fontSize: 13 }}>{error}</div>
      </div>
    </div>
  );

  if (showIntro) {
    return <IntroSequence onFinish={() => setShowIntro(false)} />;
  }

  // ── Main ─────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: `
        radial-gradient(ellipse at 10% 10%, rgba(212,175,55,0.06) 0%, transparent 40%),
        radial-gradient(ellipse at 90% 90%, rgba(200,200,204,0.04) 0%, transparent 40%),
        radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.02) 0%, transparent 60%),
        ${C.bg}
      `,
      color: C.textPrimary,
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      padding: 16,
    }}>
      <MoneyRain />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input[type=range] { height: 4px; cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 3px; }
        
        @keyframes magicGlow {
          0% { box-shadow: 0 0 10px rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.2); transform: scale(1); }
          50% { box-shadow: 0 0 25px rgba(212,175,55,0.8), 0 0 40px rgba(212,175,55,0.4); transform: scale(1.02); }
          100% { box-shadow: 0 0 10px rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.2); transform: scale(1); }
        }

        @keyframes moneyFall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", gap: 16, maxWidth: 1440, margin: "0 auto" }}>

        {/* ═══ SIDEBAR ═══════════════════════════════ */}
        <div style={{ ...carbonCard, padding: 22, height: "fit-content", position: "sticky", top: 16 }}>
          {/* Chrome top accent */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: GOLD_GRADIENT, borderRadius: "16px 16px 0 0" }} />

          {/* Logo */}
          <div style={{ marginBottom: 4, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: C.chromeDark, letterSpacing: 2, marginBottom: 4 }}>PROJECT</div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'JetBrains Mono', monospace", letterSpacing: -0.5 }}>SOSTHENIS</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.chrome, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 3, marginTop: 2 }}>FORTUNA ENGINE</div>
          </div>

          {/* Terminal badge */}
          <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3, marginTop: 10, marginBottom: 18, padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            [SYSTEM]: AUTHOR_ID: SOSTHENIS // CODE_REV: 2.0.26
          </div>

          <Divider />

          <RangeSlider label="Faixa de dezenas" min={1} max={60} value={range} onChange={setRange} />
          <SimpleSlider label="Top ranking" min={5} max={20} value={topN} onChange={setTopN} />
          <SimpleSlider label="Quantidade de jogos" min={3} max={20} value={numJogos} onChange={setNumJogos} />

          <button onClick={handleGerarJogos} style={{
            background: GOLD_GRADIENT,
            color: "#1A1000",
            border: "none",
            borderRadius: 10,
            padding: "13px 16px",
            fontWeight: 900,
            fontSize: 12,
            cursor: "pointer",
            width: "100%",
            marginTop: 4,
            letterSpacing: 2,
            fontFamily: "'JetBrains Mono', monospace",
            boxShadow: `0 0 24px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3)`,
            textTransform: "uppercase",
          }}>
            ◈ GERAR NOVOS JOGOS
          </button>

          <Divider />

          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.7, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontStyle: "italic" }}>
            Sim, eu sei. Histórico não prevê sorteio futuro. Mas entre fazer nada e fazer um dashboard de fibra de carbono absurdo, a segunda opção claramente tem mais classe.
          </div>
        </div>

        {/* ═══ MAIN ══════════════════════════════════ */}
        <div style={{ minWidth: 0 }}>

          {/* HERO HEADER */}
          <div style={{ ...carbonCard, padding: 24, marginBottom: 14, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: CHROME_GRADIENT, borderRadius: "16px 16px 0 0" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: C.chromeDark, letterSpacing: 3, marginBottom: 6 }}>MEGA-SENA // STATISTICAL ENGINE</div>
                <div style={{ fontSize: 30, fontWeight: 900, background: CHROME_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.15, fontFamily: "'JetBrains Mono', monospace" }}>
                  FORTUNA DASHBOARD
                </div>
                <div style={{ color: C.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 1.7, maxWidth: 520 }}>
                  Frequência histórica · Estimativa bayesiana · Desvios estatísticos · Coocorrência · Jogos sugeridos
                </div>
              </div>
              {/* Neon Badge */}
              <div style={{
                flexShrink: 0,
                padding: "8px 16px",
                borderRadius: 24,
                border: `1px solid rgba(212,175,55,0.45)`,
                background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))",
                boxShadow: `0 0 20px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.12)`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.8, fontFamily: "'JetBrains Mono', monospace", background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap" }}>
                  BY SOSTHENIS — THE ARCHITECT OF CHANCE
                </div>
              </div>

              {/* MAGIC TUTORIAL BUTTON */}
              <a 
                href="ebook.html" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 24px",
                  marginTop: 10,
                  background: `linear-gradient(180deg, #F9D976 0%, #D4AF37 40%, #B88A0B 100%)`,
                  border: "2px solid #8A6C10",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontWeight: "900",
                  fontSize: "13px",
                  color: "#FFFFFF",
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  boxShadow: `
                    0 6px 12px rgba(0,0,0,0.5),
                    inset 0 2px 2px rgba(255,255,255,0.6),
                    inset 0 -2px 3px rgba(0,0,0,0.4)
                  `,
                  animation: `magicGlow 2.4s infinite ease-in-out`,
                  cursor: "pointer",
                  transition: "all 0.3s",
                  textAlign: "center",
                  textShadow: "0 1px 2px rgba(0,0,0,0.6)"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
              >
                ◈ Tutorial do sistema
              </a>
            </div>
          </div>

          {/* KPI CARDS */}
          {kpis && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12, marginBottom: 14 }}>
              <KPICard label="Concursos lidos" value={kpis.concursos.toLocaleString("pt-BR")} sub="Base histórica" />
              <KPICard label="Faixa ativa" value={kpis.faixa} sub="Recorte atual" />
              <KPICard label="Dezena dominante" value={kpis.freqDezena} sub={`${kpis.freqVal} ocorrências`} gold />
              <KPICard label="Bayes supremo" value={kpis.probDezena} sub={`${kpis.probVal} peso`} gold />
            </div>
          )}

          {/* TABS PANEL */}
          <div style={{ ...carbonCard, padding: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 6 }}>
              {[["panorama","◈ Panorama"],["rankings","▲ Rankings"],["heatmap","▦ Heatmap"],["jogos","◎ Jogos"]].map(([key, label]) => (
                <TabButton key={key} label={label} active={tab === key} onClick={() => setTab(key)} />
              ))}
            </div>
            <Divider />

            {tab === "panorama" && chartData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                <div style={{ ...carbonCard, padding: 16 }}><FreqChart data={chartData.freqData} /></div>
                <div style={{ ...carbonCard, padding: 16 }}><ProbChart data={chartData.probData} /></div>
                <div style={{ ...carbonCard, padding: 16 }}><DesvioChart data={chartData.desvioData} /></div>
              </div>
            )}

            {tab === "rankings" && chartData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                <div style={{ ...carbonCard, padding: 16 }}><RankChart data={chartData.rankFreq} title={`Top ${topN} — Frequência`} dataKey="freq" color={C.gold} /></div>
                <div style={{ ...carbonCard, padding: 16 }}><RankChart data={chartData.rankProb} title={`Top ${topN} — Bayes`} dataKey="prob" color={C.chrome} /></div>
                <div style={{ ...carbonCard, padding: 16 }}><RankChart data={chartData.rankDesvio} title={`Top ${topN} — Desvio`} dataKey="desvio" color={C.green} /></div>
              </div>
            )}

            {tab === "heatmap" && computed && (
              <div style={{ ...carbonCard, padding: 16 }}>
                <HeatmapPanel cooc={computed.cooc} start={range[0]} end={range[1]} />
              </div>
            )}

            {tab === "jogos" && (
              <div>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 16, lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3 }}>
                  Combinações geradas com peso bayesiano na faixa selecionada. Estatística premium, não feitiçaria.
                </div>
                {jogos.length === 0 ? (
                  <div style={{ ...carbonCard, padding: 24, textAlign: "center" }}>
                    <div style={{ color: C.red, fontSize: 15, fontWeight: 800, marginBottom: 6 }}>FAIXA INVÁLIDA</div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>Mínimo de 6 dezenas na faixa selecionada.</div>
                  </div>
                ) : (
                  <div key={jogosKey} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
                    {jogos.map((jogo, i) => (
                      <div key={i} style={{ ...carbonCard, padding: 16, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GOLD_GRADIENT }} />
                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2.5, fontFamily: "'JetBrains Mono', monospace", background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 14 }}>
                          JOGO {String(i + 1).padStart(2, "0")}
                        </div>
                        <BallDisplay numbers={jogo} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, fontStyle: "italic" }}>
              Rodapé da honestidade: sorteio é aleatório. Se esse painel acertar seis dezenas, pode me chamar de oráculo. Até lá, somos dois adultos elegantes olhando probabilidades com textura de carbono.
            </div>
            <div style={{ flexShrink: 0, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.7 }}>
              © 2026 SOSTHENIS. CYBER-RESOURCE-MGMT.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
