/**
 * etablissement-dashboard.js — Tableau de bord d'un établissement.
 * Charge GET /api/etablissement/mes-stats et affiche les métriques.
 */
(function bootDashboard() {
  const msg = document.getElementById('msg-dashboard');
  const logout = document.getElementById('nav-logout-dash');

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg auth-' + (type || 'error');
  }

  if (logout) {
    logout.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        /* ignore */
      }
      window.location.href = '/login';
    });
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/etablissement/mes-stats');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/login';
          return;
        }
        showMsg('Impossible de charger les statistiques.', 'error');
        return;
      }
      const data = await res.json();
      render(data);
    } catch (err) {
      showMsg('Erreur réseau. Réessayez.', 'error');
    }
  }

  const FCFA = (v) => Number(v || 0).toLocaleString('fr-CM') + ' FCFA';
  const pct = (v) => (Number(v || 0) * 100).toFixed(1) + ' %';

  function render(data) {
    document.getElementById('stat-clics').textContent = data.totalClicks;
    document.getElementById('stat-attribuees').textContent = data.totalAttributed;
    document.getElementById('stat-conversion').textContent = pct(data.conversion);
    document.getElementById('stat-blocs').textContent = data.activeBlocks;
    document.getElementById('stat-consommees').textContent = data.totalConsumed;
    document.getElementById('stat-restantes').textContent = data.totalRemaining;
    document.getElementById('stat-revenus').textContent = FCFA(data.totalRevenue);

    renderTable(
      document.getElementById('table-blocs'),
      ['Bloc', 'Verticale', 'Acheté', 'Consommé', 'Restant', 'Prix unitaire', 'Montant', 'Statut'],
      data.blocks.map((b) => [
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

    renderTable(
      document.getElementById('table-clics'),
      ['ID clic', 'Produit', 'Source', 'Canal', 'Statut', 'Horaire'],
      data.recentClicks.map((c) => [
        c.id_clic,
        c.id_produit || '—',
        c.source,
        c.canal,
        c.status,
        new Date(c.timestamp).toLocaleString('fr-FR'),
      ])
    );
  }

  function renderTable(container, headers, rows) {
    if (!container) return;
    const html =
      '<table>' +
      '<thead><tr>' +
      headers.map((h) => '<th>' + h + '</th>').join('') +
      '</tr></thead>' +
      '<tbody>' +
      rows
        .map(
          (row) =>
            '<tr>' +
            row.map((cell) => '<td>' + String(cell) + '</td>').join('') +
            '</tr>'
        )
        .join('') +
      '</tbody>' +
      '</table>';
    container.innerHTML = html;
  }

  loadStats();
})();