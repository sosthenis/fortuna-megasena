import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const DATA_URL =
  "https://loteriascaixa-api.herokuapp.com/api/megasena";

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
