const FCFA = (value) => `${Number(value || 0).toLocaleString('fr-CM')} FCFA`;
const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)} %`;

/**
 * Retourne la clé de jour (YYYY-MM-DD) d'un timestamp ISO.
 */
const dayKey = (iso) => iso.slice(0, 10);

/**
 * Calcule l'ensemble des métriques du dashboard à partir des données brutes.
 * Couvre §7.2 (mesures) et §9 (dashboard minimal).
 */
function computeDashboard(data) {
  const clicks = data.clicks || [];
  const blocks = data.blocks || [];
  const establishments = data.establishments || [];

  const estById = {};
  establishments.forEach((e) => {
    estById[e.id] = e;
  });

  const totalClicks = clicks.length;
  const uniqueClicks = new Set(clicks.map((c) => c.session_id)).size;
  const attributed = clicks.filter((c) => c.is_attributed);
  const totalAttributed = attributed.length;
  const payingConversations = attributed.length; // MVP : toute attribuée est facturable
  const conversionRate = totalClicks > 0 ? totalAttributed / totalClicks : 0;

  const totalRevenue = blocks.reduce((sum, b) => sum + b.montant_total, 0);
  const consumed = blocks.reduce((sum, b) => sum + b.conversations_consommees, 0);
  const avgCostPerConversation = consumed > 0 ? totalRevenue / consumed : 0;

  // --- Performance par verticale ---
  const byVertical = {};
  ['restaurant', 'meuble'].forEach((v) => {
    const vClicks = clicks.filter((c) => estById[c.id_etablissement] && estById[c.id_etablissement].type === v);
    const vAttributed = vClicks.filter((c) => c.is_attributed);
    const vBlocks = blocks.filter((b) => b.type_verticale === v);
    byVertical[v] = {
      label: v === 'restaurant' ? 'Restaurant' : 'Meublé',
      establishments: establishments.filter((e) => e.type === v).length,
      clicks: vClicks.length,
      attributed: vAttributed.length,
      revenue: vBlocks.reduce((sum, b) => sum + b.montant_total, 0),
      conversion: vClicks.length > 0 ? vAttributed.length / vClicks.length : 0,
    };
  });

  // --- Rentabilité par établissement ---
  const byEstablishment = establishments.map((e) => {
    const eClicks = clicks.filter((c) => c.id_etablissement === e.id);
    const eAttributed = eClicks.filter((c) => c.is_attributed);
    const eBlocks = blocks.filter((b) => b.id_etablissement === e.id);
    const revenue = eBlocks.reduce((sum, b) => sum + b.montant_total, 0);
    const consumedHere = eBlocks.reduce((sum, b) => sum + b.conversations_consommees, 0);
    return {
      id: e.id,
      nom: e.nom,
      type: e.type,
      quartier: e.quartier,
      clicks: eClicks.length,
      attributed: eAttributed.length,
      revenue,
      consumed: consumedHere,
      costPerConversation: consumedHere > 0 ? revenue / consumedHere : 0,
      conversion: eClicks.length > 0 ? eAttributed.length / eClicks.length : 0,
    };
  });

  // --- Performance par quartier ---
  const quartierMap = {};
  clicks.forEach((c) => {
    const q = (estById[c.id_etablissement] && estById[c.id_etablissement].quartier) || c.zone_geo || 'Inconnu';
    if (!quartierMap[q]) {
      quartierMap[q] = { quartier: q, clicks: 0, attributed: 0 };
    }
    quartierMap[q].clicks += 1;
    if (c.is_attributed) {
      quartierMap[q].attributed += 1;
    }
  });
  const byQuartier = Object.values(quartierMap).map((row) => ({
    ...row,
    conversion: row.clicks > 0 ? row.attributed / row.clicks : 0,
  }));

  // --- Évolution du trafic par jour ---
  const dayMap = {};
  clicks.forEach((c) => {
    const d = dayKey(c.timestamp);
    if (!dayMap[d]) {
      dayMap[d] = { jour: d, clicks: 0, attributed: 0 };
    }
    dayMap[d].clicks += 1;
    if (c.is_attributed) {
      dayMap[d].attributed += 1;
    }
  });
  const traffic = Object.values(dayMap).sort((a, b) => a.jour.localeCompare(b.jour));

  return {
    metrics: {
      totalEstablishments: establishments.length,
      totalClicks,
      uniqueClicks,
      totalAttributed,
      payingConversations,
      conversionRate,
      totalRevenue,
      avgCostPerConversation,
    },
    byVertical,
    byEstablishment,
    byQuartier,
    traffic,
    blocks,
    recentClicks: clicks.slice(-10).reverse(),
  };
}

/**
 * Rend un tableau HTML à partir d'en-têtes et de lignes.
 */
function renderTable(container, headers, rows) {
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune donnée pour le moment.</p>';
    return;
  }
  const head = headers.map((h) => `<th>${h}</th>`).join('');
  const body = rows
    .map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');
  container.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

async function loadDashboard() {
  const response = await fetch('/api/dashboard');
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }
  const data = await response.json();
  const view = computeDashboard(data);

  const metricsContainer = document.getElementById('metrics');

  const metricCards = [
    { label: 'Établissements', value: view.metrics.totalEstablishments, count: view.metrics.totalEstablishments },
    { label: 'Clics totaux', value: view.metrics.totalClicks, count: view.metrics.totalClicks },
    { label: 'Clics uniques', value: view.metrics.uniqueClicks, count: view.metrics.uniqueClicks },
    { label: 'Conversations attribuées', value: view.metrics.totalAttributed, count: view.metrics.totalAttributed },
    { label: 'Conversations payantes', value: view.metrics.payingConversations, count: view.metrics.payingConversations },
    { label: 'Taux clic → conversation', value: pct(view.metrics.conversionRate), count: view.metrics.conversionRate * 100, suffix: ' %' },
    { label: 'Revenus (blocs)', value: FCFA(view.metrics.totalRevenue), count: view.metrics.totalRevenue, suffix: ' FCFA' },
    { label: 'Coût / conversation', value: FCFA(view.metrics.avgCostPerConversation), count: view.metrics.avgCostPerConversation, suffix: ' FCFA' },
  ];

  metricsContainer.innerHTML = metricCards
    .map((metric) => {
      return `<div class="metric-card"><span class="metric-label">${metric.label}</span><strong class="metric-value">${metric.value}</strong></div>`;
    })
    .join('');

  // --- Performance par verticale ---
  renderTable(
    document.getElementById('verticals'),
    ['Verticale', 'Établissements', 'Clics', 'Attribuées', 'Conversion', 'Revenus'],
    Object.values(view.byVertical).map((v) => [
      v.label,
      v.establishments,
      v.clicks,
      v.attributed,
      pct(v.conversion),
      FCFA(v.revenue),
    ])
  );

  // --- Rentabilité par établissement ---
  renderTable(
    document.getElementById('establishments'),
    ['Établissement', 'Type', 'Quartier', 'Clics', 'Attribuées', 'Conv.', 'Conso.', 'Coût/conv.', 'Revenus'],
    view.byEstablishment.map((e) => [
      e.nom,
      e.type === 'restaurant' ? 'Restaurant' : 'Meublé',
      e.quartier,
      e.clicks,
      e.attributed,
      pct(e.conversion),
      e.consumed,
      FCFA(e.costPerConversation),
      FCFA(e.revenue),
    ])
  );

  // --- Performance par quartier ---
  renderTable(
    document.getElementById('quartiers'),
    ['Quartier', 'Clics', 'Attribuées', 'Conversion'],
    view.byQuartier.map((q) => [q.quartier, q.clicks, q.attributed, pct(q.conversion)])
  );

  // --- Évolution du trafic ---
  renderTable(
    document.getElementById('traffic'),
    ['Jour', 'Clics', 'Attribuées'],
    view.traffic.map((t) => [t.jour, t.clicks, t.attributed])
  );

  // --- Blocs de facturation ---
  renderTable(
    document.getElementById('blocks'),
    ['Bloc', 'Verticale', 'Total', 'Consommées', 'Restantes', 'Prix unitaire', 'Montant', 'Statut'],
    view.blocks.map((b) => [
      b.id_bloc,
      b.type_verticale,
      b.nombre_conversations,
      b.conversations_consommees,
      b.nombre_conversations - b.conversations_consommees,
      FCFA(b.prix_unitaire),
      FCFA(b.montant_total),
      b.statut,
    ])
  );

  // --- Derniers clics ---
  renderTable(
    document.getElementById('clicks'),
    ['ID clic', 'Établissement', 'Canal', 'Source', 'Statut', 'Horaire'],
    view.recentClicks.map((c) => [
      c.id_clic,
      c.id_etablissement,
      c.canal,
      c.source,
      c.status,
      new Date(c.timestamp).toLocaleString('fr-FR'),
    ])
  );

  renderCharts(view);
}

/**
 * Dessine les 3 graphiques (rôles distincts) via charts.js.
 * Chaque appel est protégé : si la lib n'est pas chargée, on n'affiche rien.
 */
function renderCharts(view) {
  if (!window.DDCharts) return;

  // 1) Tendance temporelle : clics vs conversations attribuées par jour.
  const trafficEl = document.getElementById('chart-traffic');
  if (trafficEl) {
    if (view.traffic.length === 0) {
      trafficEl.innerHTML = '<p class="empty-state">Aucune donnée de trafic pour le moment.</p>';
    } else {
      window.DDCharts.lineChart(trafficEl, {
        labels: view.traffic.map((t) => t.jour.slice(5)),
        series: [
          { name: 'Clics', color: '#2f6df6', values: view.traffic.map((t) => t.clicks), area: true },
          { name: 'Conversations', color: '#10a37f', values: view.traffic.map((t) => t.attributed) },
        ],
      });
    }
  }

  // 2) Comparaison par verticale : clics + conversations (restaurant vs meublé).
  const verticalEl = document.getElementById('chart-vertical');
  if (verticalEl) {
    const verticals = Object.values(view.byVertical);
    window.DDCharts.groupedBar(verticalEl, {
      categories: verticals.map((v) => v.label),
      series: [
        { name: 'Clics', color: '#2f6df6', values: verticals.map((v) => v.clicks) },
        { name: 'Conversations', color: '#ff7a2f', values: verticals.map((v) => v.attributed) },
      ],
    });
  }

  // 3) Classement géographique : top quartiers par clics attribués.
  const quartierEl = document.getElementById('chart-quartiers');
  if (quartierEl) {
    const top = view.byQuartier.slice().sort((a, b) => b.clicks - a.clicks).slice(0, 8);
    if (top.length === 0) {
      quartierEl.innerHTML = '<p class="empty-state">Aucune donnée par quartier pour le moment.</p>';
    } else {
      window.DDCharts.rankedBar(quartierEl, {
        items: top.map((q) => ({
          label: q.quartier,
          value: q.clicks,
          sub: `${q.attributed} conversations`,
          color: '#2f6df6',
        })),
      });
    }
  }
}

loadDashboard();
