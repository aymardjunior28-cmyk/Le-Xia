/**
 * charts.js — Graphiques SVG légers, sans aucune dépendance externe.
 * Chaque graphique a un rôle métier distinct :
 *   - lineChart  : tendance temporelle (clics vs conversations attribuées / jour)
 *   - groupedBar : comparaison par verticale (restaurant vs meublé)
 *   - rankedBar  : classement géographique (top quartiers par trafic)
 * Les tooltips utilisent l'élément natif SVG <title> (aucun JS supplémentaire).
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    primary: '#2f6df6',
    accent: '#ff7a2f',
    success: '#10a37f',
    muted: '#98a0b0',
    grid: 'rgba(27,35,51,0.08)',
    text: '#5c6577',
  };

  function svg(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function label(parent, x, y, str, anchor, fill, size) {
    const t = svg('text', { x, y, fill: fill || C.text, 'font-size': size || 11, 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }
  function withTip(node, str) {
    const t = svg('title', null, node);
    t.textContent = str;
    return node;
  }
  function niceMax(v) {
    v = Number(v) || 0;
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return f * p;
  }
  function legend(container, items) {
    const w = document.createElement('div');
    w.className = 'chart-legend';
    items.forEach((it) => {
      const s = document.createElement('span');
      s.className = 'legend-item';
      const marker = document.createElement('i');
      marker.style.backgroundColor = it.color;
      s.append(marker, document.createTextNode(it.label));
      w.appendChild(s);
    });
    container.appendChild(w);
  }
  function canvas(container, w, h) {
    container.innerHTML = '';
    const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', height: 'auto', preserveAspectRatio: 'xMidYMid meet' });
    container.appendChild(s);
    return s;
  }

  /** Courbe multi-séries. data = { labels:[], series:[{name,color,values:[],area?}] } */
  function lineChart(container, data) {
    const W = 680, H = 280, m = { l: 48, r: 16, t: 18, b: 40 };
    const labels = data.labels || [];
    const series = data.series || [];
    const s = canvas(container, W, H);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = niceMax(Math.max(0, ...series.map((se) => Math.max(0, ...se.values))));
    const n = labels.length || 1;
    const X = (i) => (n === 1 ? m.l + iw / 2 : m.l + (i * iw) / (n - 1));
    const Y = (v) => m.t + ih - (v / max) * ih;

    for (let g = 0; g <= 4; g++) {
      const val = (max * g) / 4, y = Y(val);
      svg('line', { x1: m.l, y1: y, x2: W - m.r, y2: y, stroke: C.grid, 'stroke-width': 1 }, s);
      label(s, m.l - 8, y + 4, Math.round(val), 'end', C.muted);
    }
    const step = Math.max(1, Math.ceil(n / 7));
    for (let i = 0; i < n; i += step) label(s, X(i), H - m.b + 18, labels[i], 'middle', C.muted, 10);

    series.forEach((se) => {
      if (se.area) {
        const pts = se.values.map((v, i) => `${X(i)},${Y(v)}`).join(' L');
        svg('path', { d: `M${X(0)},${Y(0)} L${pts} L${X(n - 1)},${Y(0)} Z`, fill: se.color, opacity: 0.1 }, s);
      }
      svg('polyline', {
        points: se.values.map((v, i) => `${X(i)},${Y(v)}`).join(' '),
        fill: 'none', stroke: se.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      }, s);
      se.values.forEach((v, i) => {
        const c = svg('circle', { cx: X(i), cy: Y(v), r: 3.5, fill: '#fff', stroke: se.color, 'stroke-width': 2 }, s);
        withTip(c, `${labels[i] || ''} — ${se.name} : ${v}`);
      });
    });
    legend(container, series.map((se) => ({ color: se.color, label: se.name })));
  }

  // groupedBar et rankedBar sont ajoutés ci-dessous.

  /** Barres groupées par catégorie. data = { categories:[], series:[{name,color,values:[]}] } */
  function groupedBar(container, data) {
    const W = 680, H = 280, m = { l: 48, r: 16, t: 18, b: 46 };
    const cats = data.categories || [];
    const series = data.series || [];
    const s = canvas(container, W, H);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = niceMax(Math.max(0, ...series.map((se) => Math.max(0, ...se.values))));

    for (let g = 0; g <= 4; g++) {
      const val = (max * g) / 4, y = m.t + ih - (val / max) * ih;
      svg('line', { x1: m.l, y1: y, x2: W - m.r, y2: y, stroke: C.grid, 'stroke-width': 1 }, s);
      label(s, m.l - 8, y + 4, Math.round(val), 'end', C.muted);
    }
    const gw = iw / Math.max(1, cats.length);
    const bw = Math.min(40, (gw - 30) / Math.max(1, series.length));
    cats.forEach((cat, ci) => {
      const gx = m.l + ci * gw;
      const totalW = bw * series.length + 8 * (series.length - 1);
      const start = gx + (gw - totalW) / 2;
      series.forEach((se, si) => {
        const v = se.values[ci] || 0;
        const h = (v / max) * ih;
        const x = start + si * (bw + 8);
        const y = m.t + ih - h;
        withTip(svg('rect', { x, y, width: bw, height: Math.max(h, 1), rx: 5, fill: se.color }, s), `${cat} — ${se.name} : ${v}`);
      });
      label(s, gx + gw / 2, H - m.b + 20, cat, 'middle', C.text, 12);
    });
    legend(container, series.map((se) => ({ color: se.color, label: se.name })));
  }

  /** Barres horizontales classées. data = { items:[{label,value,sub?,color?}] } */
  function rankedBar(container, data) {
    const items = data.items || [];
    const W = 680, rowH = 36, m = { l: 140, r: 64, t: 8, b: 8 };
    const H = m.t + m.b + Math.max(1, items.length) * rowH;
    const s = canvas(container, W, H);
    const iw = W - m.l - m.r;
    const max = niceMax(Math.max(0, ...items.map((it) => Number(it.value) || 0)));

    items.forEach((it, i) => {
      const y = m.t + i * rowH, bh = 18;
      label(s, m.l - 12, y + rowH / 2 + 4, it.label, 'end', C.text, 12);
      svg('rect', { x: m.l, y: y + (rowH - bh) / 2, width: iw, height: bh, rx: 7, fill: 'rgba(27,35,51,0.05)' }, s);
      const w = (Number(it.value) / max) * iw;
      withTip(
        svg('rect', { x: m.l, y: y + (rowH - bh) / 2, width: Math.max(w, 2), height: bh, rx: 7, fill: it.color || C.primary }, s),
        `${it.label} : ${it.value}${it.sub ? ' (' + it.sub + ')' : ''}`
      );
      label(s, m.l + Math.max(w, 2) + 8, y + rowH / 2 + 4, String(it.value), 'start', C.text, 12);
    });
  }

  window.DDCharts = { lineChart, groupedBar, rankedBar };
})();
