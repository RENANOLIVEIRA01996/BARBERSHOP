/**
 * Componentes de visualização do dashboard — SVG puro, sem dependências.
 * Usados no Dashboard, Financeiro e Relatórios.
 */
import { useMemo, useState } from 'react';

/* ---------- formatação ---------- */
function brl(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ---------- Sparkline (micro-tendência) ---------- */
export function Sparkline({ values, width = 96, height = 32, color = 'var(--brand-gold)' }) {
  const path = useMemo(() => {
    const v = (values || []).map(Number);
    if (!v.length) return null;
    const max = Math.max(...v);
    const min = Math.min(...v);
    const range = max - min || 1;
    const step = width / (v.length - 1 || 1);
    return v.map((val, i) => {
      const x = i * step;
      const y = height - 3 - ((val - min) / range) * (height - 6);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [values, width, height]);

  if (!path) return <span className="spark-empty">—</span>;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Donut ---------- */
export function Donut({ segments = [], size = 168, thickness = 20, centerTitle, centerValue, centerSub }) {
  const [active, setActive] = useState(null);
  const total = segments.reduce((s, sg) => s + (Number(sg.value) || 0), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  if (!total) {
    return (
      <div className="donut-empty" style={{ width: size, height: size }}>
        <span>Sem dados</span>
      </div>
    );
  }

  const rendered = segments.map((sg, idx) => {
    const len = (Number(sg.value) / total) * c;
    const offset = (acc / total) * c;
    acc += Number(sg.value) || 0;
    const isActive = active === idx;
    return (
      <circle
        key={sg.label}
        className="donut-seg"
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={sg.color}
        strokeWidth={isActive ? thickness + 4 : thickness}
        strokeDasharray={`${len} ${c - len}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        role="button"
        tabIndex={0}
        aria-label={`${sg.label}: ${brl(sg.value)}`}
        onMouseEnter={() => setActive(idx)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(idx)}
        onBlur={() => setActive(null)}
        onClick={() => setActive(isActive ? null : idx)}
      />
    );
  });

  const activeSeg = active != null ? segments[active] : null;

  return (
    <div
      className="donut"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${centerTitle}: ${centerValue || ''}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{rendered}</svg>
      <div className={`donut-center ${activeSeg ? 'has-selection' : ''}`}>
        {activeSeg ? (
          <>
            <span className="donut-center-label">{activeSeg.label}</span>
            <strong className="donut-center-value">{brl(activeSeg.value)}</strong>
            <span className="donut-center-sub">{activeSeg.pct != null ? `${activeSeg.pct}%` : '—'}</span>
          </>
        ) : (
          <>
            <span className="donut-center-label">{centerTitle}</span>
            <strong className="donut-center-value">{centerValue}</strong>
            {centerSub && <span className="donut-center-sub">{centerSub}</span>}
          </>
        )}
      </div>
    </div>
  );
}
/* ---------- gráfico de linha com tooltip ---------- */
export function LineChart({ data = [], width = 640, height = 220, formatY = brl }) {
  const [hover, setHover] = useState(null);
  const pad = { top: 14, right: 12, bottom: 26, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const pts = useMemo(() => {
    if (!data.length) return [];
    const max = Math.max(0, ...data.map(d => Number(d.revenue) || 0));
    const min = Math.min(0, ...data.map(d => Number(d.revenue) || 0));
    const range = Math.max(1, max - min);
    return data.map((d, i) => ({
      x: pad.left + (i / (data.length - 1 || 1)) * innerW,
      y: pad.top + innerH - ((Number(d.revenue) || 0) - min) / range * innerH,
      d,
    }));
  }, [data, innerW, innerH, pad.left, pad.top]);

  if (!data.length) {
    return <div className="chart-empty">Sem dados no período selecionado.</div>;
  }

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${pad.top + innerH} L${pts[0].x.toFixed(1)},${pad.top + innerH} Z`;
  const maxRev = Math.max(0, ...data.map(d => Number(d.revenue) || 0));
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: pad.top + innerH - f * innerH,
    value: (maxRev || 0) * f,
  }));

  return (
    <div className="linechart-wrap">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="linechart"
        role="img"
        aria-label="Faturamento ao longo do tempo"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="lc-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.left} y1={g.y} x2={width - pad.right} y2={g.y} className="linechart-grid" />
            <text x={pad.left - 8} y={g.y + 4} className="linechart-tick" textAnchor="end">{formatY(g.value)}</text>
          </g>
        ))}
        <path d={areaPath} className="linechart-area" />
        <path d={linePath} className="linechart-line" />
        {pts.map((p) => (
          <circle
            key={p.d.date}
            cx={p.x}
            cy={p.y}
            r={hover === p.d.date ? 6 : 3.5}
            className="linechart-dot"
            tabIndex={0}
            role="button"
            aria-label={`${p.d.date}: ${formatY(p.d.revenue)}`}
            onMouseEnter={() => setHover(p.d.date)}
            onFocus={() => setHover(p.d.date)}
            onBlur={() => setHover(null)}
          />
        ))}
        {hover && (() => {
          const p = pts.find(pt => pt.d.date === hover);
          if (!p) return null;
          return (
            <g className="linechart-hover">
              <line x1={p.x} y1={pad.top} x2={p.x} y2={pad.top + innerH} />
              <rect x={Math.min(p.x + 10, width - 128)} y={Math.max(pad.top - 4, 2)} width={118} height={52} rx={8} className="linechart-tooltip-bg" />
              <text x={Math.min(p.x + 16, width - 122)} y={pad.top + 14} className="linechart-tooltip-date">{p.d.date}</text>
              <text x={Math.min(p.x + 16, width - 122)} y={pad.top + 30} className="linechart-tooltip-val">{formatY(p.d.revenue)}</text>
              <text x={Math.min(p.x + 16, width - 122)} y={pad.top + 44} className="linechart-tooltip-sub">{p.d.count} atendimento{p.d.count === 1 ? '' : 's'}</text>
            </g>
          );
        })()}
        {pts.filter((_, i) => i % Math.max(1, Math.ceil(pts.length / 10)) === 0).map((p) => (
          <text key={`lbl-${p.d.date}`} x={p.x} y={height - 8} className="linechart-tick" textAnchor="middle">
            {String(p.d.date).slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}
/* ---------- barras horizontais (top serviços) ---------- */
export function HBarList({ items = [], useMoney = false, maxWidth = 100 }) {
  const max = Math.max(1, ...items.map(i => Number(i.value) || 0));
  return (
    <div className="hbar-list">
      {items.length === 0 && <p className="empty-state">Sem dados no período.</p>}
      {items.map((it, i) => {
        const w = Math.round((Number(it.value) / max) * maxWidth);
        return (
          <button
            key={it.label + i}
            type="button"
            className="hbar-item"
            aria-label={`${it.label}: ${useMoney ? brl(it.value) : it.value}`}
            title={`${it.label}: ${useMoney ? brl(it.value) : it.value}${it.sub ? ` · ${it.sub}` : ''}`}
          >
            <span className="hbar-head">
              <span className="hbar-name">{it.label}</span>
              <span className="hbar-meta">
                {it.pct != null && <span className="hbar-pct">{it.pct}%</span>}
                <strong className="hbar-value">{useMoney ? brl(it.value) : it.value}</strong>
              </span>
            </span>
            <span className="hbar-track"><span className="hbar-fill" style={{ width: `${w}%` }} /></span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- heatmap de horários ---------- */
export function HourHeatmap({ items = [], max }) {
  const peak = max || Math.max(1, ...items.map(h => h.count));
  return (
    <div className="hour-grid" role="img" aria-label="Horários mais movimentados">
      {items.length === 0 && <p className="empty-state">Sem atendimentos no período.</p>}
      {items.map(h => {
        const lvl = h.count === 0 ? 0 : Math.max(1, Math.round((h.count / peak) * 4));
        return (
          <div key={h.hour} className="hour-cell" title={`${String(h.hour).padStart(2, '0')}h — ${h.count} atendimento${h.count === 1 ? '' : 's'}`}>
            <span className={`hour-bar lvl-${lvl}`} style={{ height: `${Math.max(8, (h.count / peak) * 100)}%` }} />
            <span className="hour-label">{String(h.hour).padStart(2, '0')}h</span>
            <span className="hour-count">{h.count || ''}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- resumo legenda para donuts ---------- */
export function DonutLegend({ segments = [], money = true }) {
  return (
    <div className="donut-legend">
      {segments.map(s => (
        <div key={s.label} className="legend-row">
          <span className="legend-dot" style={{ background: s.color }} />
          <span className="legend-name">{s.label}</span>
          <span className="legend-pct">{s.pct != null ? `${s.pct}%` : ''}</span>
          <strong className="legend-val">{money ? brl(s.value) : s.value}</strong>
        </div>
      ))}
    </div>
  );
}

/* ---------- paleta ---------- */
export const GOLD = '#D4AF37';
export const GOLD_SOFT = '#E6C066';
export const METAL = '#9AA0A6';
export const CREAM = '#F5EFE0';
export const BRONZE = '#B08D57';
export const GRAY = '#6A6E73';
export const SUCCESS = '#3FA24D';
export const DANGER = '#C74444';
export const WARN = '#D9A13B';
export const INFO = '#4A90D9';

export const PAY_COLORS = [GOLD, GOLD_SOFT, METAL, BRONZE, GRAY, CREAM];
export const SVC_COLORS = [GOLD, METAL, GOLD_SOFT, BRONZE, CREAM, GRAY];