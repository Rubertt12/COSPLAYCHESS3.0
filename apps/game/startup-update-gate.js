(() => {
  if (window.__cosplayStartupUpdateGateLoaded) return;
  window.__cosplayStartupUpdateGateLoaded = true;

  const api = window.electronAPI?.updates;
  if (!api?.getState || !api?.check) return;

  let dismissed = false;
  let unsubscribe = null;
  let lastState = null;

  function ensureStyles() {
    if (document.getElementById('startup-update-gate-styles')) return;
    const style = document.createElement('style');
    style.id = 'startup-update-gate-styles';
    style.textContent = `
      #startup-update-gate {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px;
        background:
          radial-gradient(circle at 18% 20%, rgba(122, 31, 52, .28), transparent 33%),
          radial-gradient(circle at 84% 78%, rgba(225, 180, 93, .16), transparent 36%),
          linear-gradient(145deg, #070609 0%, #0d0910 46%, #08070a 100%);
        color: #f8f0df;
        font-family: 'Segoe UI', sans-serif;
        transition: opacity .28s ease, visibility .28s ease;
      }
      #startup-update-gate.is-closing {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      #startup-update-gate::before {
        content: '♜';
        position: absolute;
        right: -45px;
        bottom: -85px;
        font: 500 min(42vw, 520px)/1 Georgia, serif;
        color: rgba(225, 180, 93, .035);
        transform: rotate(-10deg);
        pointer-events: none;
      }
      .sug-card {
        position: relative;
        width: min(610px, 94vw);
        overflow: hidden;
        border: 1px solid rgba(225, 180, 93, .35);
        border-radius: 22px;
        background: linear-gradient(155deg, rgba(33, 18, 27, .97), rgba(10, 10, 15, .98) 72%);
        box-shadow: 0 35px 100px rgba(0,0,0,.72), inset 0 1px 0 rgba(255,255,255,.035);
      }
      .sug-card::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #e1b45d 22%, #ffd985 50%, #e1b45d 78%, transparent);
        opacity: .9;
      }
      .sug-head {
        padding: 30px 32px 22px;
        border-bottom: 1px solid rgba(255,255,255,.07);
      }
      .sug-kicker {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 12px;
        color: #e1b45d;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 2.1px;
      }
      .sug-kicker::before {
        content: '';
        width: 30px;
        height: 1px;
        background: #e1b45d;
      }
      .sug-title {
        margin: 0;
        color: #fff5df;
        font: 700 clamp(25px, 4vw, 38px)/1.08 Georgia, serif;
        letter-spacing: .3px;
      }
      .sug-subtitle {
        margin: 10px 0 0;
        color: #9d96a1;
        font-size: 12px;
        line-height: 1.6;
      }
      .sug-body { padding: 24px 32px 30px; }
      .sug-status-row {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 54px;
      }
      .sug-spinner {
        width: 30px;
        height: 30px;
        flex: 0 0 30px;
        border-radius: 50%;
        border: 2px solid rgba(225,180,93,.18);
        border-top-color: #e1b45d;
        animation: sug-spin .8s linear infinite;
      }
      .sug-spinner.paused { animation: none; border-color: rgba(225,180,93,.48); }
      .sug-spinner.done {
        animation: none;
        display: grid;
        place-items: center;
        border-color: rgba(225,180,93,.55);
        color: #e1b45d;
        font-weight: 900;
      }
      .sug-spinner.error { border-color: rgba(213,70,101,.65); color:#ff91aa; }
      .sug-spinner.done::after { content: '✓'; }
      .sug-spinner.error::after { content: '!'; }
      @keyframes sug-spin { to { transform: rotate(360deg); } }
      .sug-state-label {
        color: #fff;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .4px;
      }
      .sug-state-detail {
        margin-top: 4px;
        color: #89838e;
        font-size: 10px;
        line-height: 1.45;
      }
      .sug-progress-wrap {
        display: none;
        height: 8px;
        margin-top: 20px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 999px;
        background: rgba(255,255,255,.045);
      }
      .sug-progress {
        height: 100%;
        width: 0%;
        border-radius: inherit;
        background: linear-gradient(90deg, #a56e2d, #e1b45d, #ffd985);
        box-shadow: 0 0 18px rgba(225,180,93,.32);
        transition: width .24s ease;
      }
      .sug-version {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 16px;
        padding: 11px 13px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.07);
        background: rgba(255,255,255,.025);
        color: #7f7984;
        font-size: 9px;
        letter-spacing: .6px;
      }
      .sug-version strong { color: #c9b381; font-size: 10px; }
      .sug-actions {
        display: none;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
        margin-top: 20px;
      }
      .sug-btn {
        min-height: 44px;
        padding: 10px 14px;
        border-radius: 9px;
        cursor: pointer;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1px;
        transition: transform .15s ease, border-color .15s ease, background .15s ease;
      }
      .sug-btn:hover { transform: translateY(-1px); }
      .sug-btn-primary {
        border: 1px solid #e1b45d;
        background: linear-gradient(135deg, #d59e4c, #f0c46f);
        color: #171009;
      }
      .sug-btn-secondary {
        border: 1px solid rgba(255,255,255,.13);
        background: rgba(255,255,255,.035);
        color: #c7c1ca;
      }
      .sug-foot {
        margin-top: 18px;
        color: #5e5963;
        font-size: 8px;
        line-height: 1.5;
        text-align: center;
        letter-spacing: .7px;
      }
      @media (max-width: 560px) {
        #startup-update-gate { padding: 16px; }
        .sug-head, .sug-body { padding-left: 22px; padding-right: 22px; }
        .sug-actions { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureGate() {
    let gate = document.getElementById('startup-update-gate');
    if (gate) return gate;
    ensureStyles();
    gate = document.createElement('div');
    gate.id = 'startup-update-gate';
    gate.innerHTML = `
      <section class="sug-card" role="dialog" aria-modal="true" aria-label="Atualização do Cosplay Chess">
        <div class="sug-head">
          <div class="sug-kicker">RUBRA STUDIOS · INICIALIZAÇÃO</div>
          <h1 class="sug-title">Preparando o Cosplay Chess</h1>
          <p class="sug-subtitle">Antes de entrar no jogo, verificamos se existe uma versão mais recente.</p>
        </div>
        <div class="sug-body">
          <div class="sug-status-row">
            <div class="sug-spinner" data-role="spinner"></div>
            <div>
              <div class="sug-state-label" data-role="label">VERIFICANDO ATUALIZAÇÕES...</div>
              <div class="sug-state-detail" data-role="detail">Consultando a versão mais recente do jogo.</div>
            </div>
          </div>
          <div class="sug-progress-wrap" data-role="progress-wrap"><div class="sug-progress" data-role="progress"></div></div>
          <div class="sug-version">
            <span>VERSÃO INSTALADA <strong data-role="current">-</strong></span>
            <span data-role="available-wrap" style="display:none">NOVA VERSÃO <strong data-role="available">-</strong></span>
          </div>
          <div class="sug-actions" data-role="actions">
            <button type="button" class="sug-btn sug-btn-primary" data-role="primary">ATUALIZAR AGORA</button>
            <button type="button" class="sug-btn sug-btn-secondary" data-role="secondary">ENTRAR SEM ATUALIZAR</button>
          </div>
          <div class="sug-foot">ATUALIZAÇÕES AUTOMÁTICAS FUNCIONAM NA VERSÃO INSTALADA DO WINDOWS.</div>
        </div>
      </section>
    `;
    document.body.appendChild(gate);
    return gate;
  }

  function closeGate() {
    if (dismissed) return;
    dismissed = true;
    const gate = document.getElementById('startup-update-gate');
    if (!gate) return;
    gate.classList.add('is-closing');
    setTimeout(() => gate.remove(), 320);
  }

  function setText(gate, role, value) {
    const el = gate.querySelector(`[data-role="${role}"]`);
    if (el) el.textContent = value || '';
  }

  function render(state) {
    if (!state || dismissed) return;
    lastState = state;
    const gate = ensureGate();
    const spinner = gate.querySelector('[data-role="spinner"]');
    const progressWrap = gate.querySelector('[data-role="progress-wrap"]');
    const progress = gate.querySelector('[data-role="progress"]');
    const actions = gate.querySelector('[data-role="actions"]');
    const primary = gate.querySelector('[data-role="primary"]');
    const secondary = gate.querySelector('[data-role="secondary"]');
    const availableWrap = gate.querySelector('[data-role="available-wrap"]');

    setText(gate, 'current', state.currentVersion || '-');
    if (state.availableVersion) {
      setText(gate, 'available', state.availableVersion);
      if (availableWrap) availableWrap.style.display = '';
    } else if (availableWrap) {
      availableWrap.style.display = 'none';
    }

    spinner?.classList.remove('paused', 'done', 'error');
    if (actions) actions.style.display = 'none';
    if (progressWrap) progressWrap.style.display = 'none';

    switch (state.status) {
      case 'idle':
      case 'checking':
        setText(gate, 'label', 'VERIFICANDO ATUALIZAÇÕES...');
        setText(gate, 'detail', 'Consultando a versão mais recente antes de abrir o menu principal.');
        break;
      case 'up-to-date':
        spinner?.classList.add('done');
        setText(gate, 'label', 'JOGO ATUALIZADO');
        setText(gate, 'detail', 'Tudo certo. Abrindo o menu principal...');
        setTimeout(closeGate, 480);
        break;
      case 'available':
        spinner?.classList.add('paused');
        setText(gate, 'label', `ATUALIZAÇÃO ${state.availableVersion || ''} DISPONÍVEL`.trim());
        setText(gate, 'detail', state.message || 'Atualize antes de continuar para usar a versão mais recente.');
        if (actions) actions.style.display = 'grid';
        if (primary) {
          primary.textContent = 'ATUALIZAR AGORA';
          primary.onclick = async () => {
            primary.disabled = true;
            try { render(await api.download()); } catch (_) {}
            finally { primary.disabled = false; }
          };
        }
        if (secondary) {
          secondary.textContent = 'ENTRAR SEM ATUALIZAR';
          secondary.onclick = closeGate;
        }
        break;
      case 'downloading': {
        const pct = Math.max(0, Math.min(100, Number(state.progress) || 0));
        setText(gate, 'label', 'BAIXANDO ATUALIZAÇÃO...');
        setText(gate, 'detail', `Aguarde. O jogo será atualizado antes de você entrar. ${Math.round(pct)}%`);
        if (progressWrap) progressWrap.style.display = 'block';
        if (progress) progress.style.width = `${pct}%`;
        break;
      }
      case 'downloaded':
        spinner?.classList.add('done');
        setText(gate, 'label', 'ATUALIZAÇÃO PRONTA');
        setText(gate, 'detail', 'A nova versão foi baixada. Reinicie para concluir a instalação.');
        if (progressWrap) progressWrap.style.display = 'block';
        if (progress) progress.style.width = '100%';
        if (actions) actions.style.display = 'grid';
        if (primary) {
          primary.textContent = 'REINICIAR E ATUALIZAR';
          primary.onclick = () => api.install();
        }
        if (secondary) {
          secondary.textContent = 'DEPOIS';
          secondary.onclick = closeGate;
        }
        break;
      case 'unsupported':
        closeGate();
        break;
      case 'error':
      default:
        spinner?.classList.add('done', 'error');
        setText(gate, 'label', 'NÃO FOI POSSÍVEL VERIFICAR');
        setText(gate, 'detail', state.message || 'Houve uma falha ao verificar atualizações.');
        if (actions) actions.style.display = 'grid';
        if (primary) {
          primary.textContent = 'TENTAR NOVAMENTE';
          primary.onclick = async () => {
            primary.disabled = true;
            try { render(await api.check()); } catch (_) {}
            finally { primary.disabled = false; }
          };
        }
        if (secondary) {
          secondary.textContent = 'ABRIR O JOGO';
          secondary.onclick = closeGate;
        }
        break;
    }
  }

  async function init() {
    const gate = ensureGate();
    gate.style.visibility = 'hidden';
    try {
      const initial = await api.getState();
      if (!initial?.supported) {
        gate.remove();
        return;
      }
      gate.style.visibility = 'visible';
      render({ ...initial, status: 'checking', message: 'Verificando atualizações...' });
      if (typeof api.onStatus === 'function') unsubscribe = api.onStatus(render);
      const checked = await api.check();
      render(checked);
    } catch (error) {
      gate.style.visibility = 'visible';
      render({
        ...(lastState || {}),
        status: 'error',
        message: error?.message || String(error || 'Falha ao verificar atualização.')
      });
    }
  }

  window.addEventListener('beforeunload', () => {
    try { unsubscribe?.(); } catch (_) {}
  }, { once: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();