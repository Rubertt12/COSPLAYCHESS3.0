(() => {
  if (window.__cosplayResultsAutoModeLoaded) return;
  window.__cosplayResultsAutoModeLoaded = true;

  const db = window.getCosplayChessDb?.() || window.COSPLAYCHESS_DB;
  if (!db) return;

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  let sourceByMatch = new Map();

  async function loadAutomaticSummary() {
    const summary = document.getElementById('resultSyncSummary');
    if (!summary) return;
    try {
      const { data, error } = await db
        .from('cosplay_matches')
        .select('id,source_result_id,ingest_source,ingested_at,played_at')
        .order('played_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      sourceByMatch = new Map(rows.map(row => [String(row.id), row]));
      const automatic = rows.filter(row => row.ingest_source === 'game-auto').length;
      const fallback = rows.length - automatic;
      const lastAuto = rows.find(row => row.ingest_source === 'game-auto');

      summary.innerHTML = `
        <div><span>Partidas</span><b>${rows.length}</b></div>
        <div class="auto"><span>Recebidas do jogo</span><b>${automatic}</b></div>
        <div><span>Correções / legado</span><b>${fallback}</b></div>
        <div class="wide"><span>Última sincronização automática</span><b>${lastAuto?.ingested_at ? new Date(lastAuto.ingested_at).toLocaleString('pt-BR') : 'Nenhuma ainda'}</b></div>`;
      decorateMatchRows();
    } catch (error) {
      summary.innerHTML = `<span>Não foi possível carregar o resumo de sincronização: ${esc(error?.message || error)}</span>`;
    }
  }

  function decorateMatchRows() {
    const root = document.getElementById('adminMatches');
    if (!root) return;

    root.querySelectorAll('[data-edit-match]').forEach(button => {
      const id = button.dataset.editMatch;
      const item = button.closest('.community-admin-item');
      if (!item || !id) return;

      const row = sourceByMatch.get(String(id));
      const auto = row?.ingest_source === 'game-auto';
      const expectedText = auto ? '☁ RECEBIDA DO JOGO' : '✎ MANUAL / LEGADO';

      let badge = item.querySelector('.match-source-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'match-source-badge';
        item.insertBefore(badge, item.firstChild);
      }

      if (badge.classList.contains('auto') !== auto) {
        badge.classList.toggle('auto', auto);
      }
      if (badge.textContent !== expectedText) {
        badge.textContent = expectedText;
      }
      if (button.textContent !== 'Corrigir') {
        button.textContent = 'Corrigir';
      }
    });
  }

  async function restrictAwardsToSpecialOnly() {
    const select = document.getElementById('awardAchievement');
    if (!select) return;
    try {
      const { data, error } = await db
        .from('cosplay_achievements')
        .select('id,slug,title,icon,published')
        .eq('slug', 'lenda-fergorverse')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        select.innerHTML = '<option value="">Nenhuma conquista especial configurada</option>';
        select.disabled = true;
        return;
      }
      select.disabled = false;
      select.innerHTML = `<option value="">Selecione...</option><option value="${esc(data.id)}">${esc(data.icon || '🏆')} ${esc(data.title || 'Conquista especial')}</option>`;
    } catch (error) {
      select.innerHTML = '<option value="">Erro ao carregar conquista especial</option>';
      select.disabled = true;
    }
  }

  function installRecoveryOpeners() {
    document.addEventListener('click', event => {
      const edit = event.target.closest?.('[data-edit-match]');
      if (!edit) return;
      const details = document.getElementById('manualRecoveryPanel');
      if (!details) return;
      details.open = true;
      setTimeout(() => details.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, true);
  }

  function observeMatches() {
    const root = document.getElementById('adminMatches');
    if (!root) return;

    // Observe apenas substituições/adições diretas na lista. Não usamos subtree,
    // pois decorateMatchRows() também altera elementos internos e isso causava
    // um loop infinito de MutationObserver que congelava a página.
    const observer = new MutationObserver(() => {
      requestAnimationFrame(decorateMatchRows);
    });
    observer.observe(root, { childList: true });
    decorateMatchRows();
  }

  async function init() {
    installRecoveryOpeners();
    observeMatches();
    await Promise.all([loadAutomaticSummary(), restrictAwardsToSpecialOnly()]);
    setTimeout(restrictAwardsToSpecialOnly, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
