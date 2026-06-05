'use strict';
const Report = (() => {
  let _sessionId = null;
  let _modalOpen  = false;

  function init() {
    _sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const btn = Utils.$('report-btn');
    if (btn) {
      btn.onclick = openModal;
      btn.ontouchstart = e => { e.preventDefault(); openModal(); };
    }
  }

  function openModal() {
    const modal = Utils.$('report-modal');
    const list  = Utils.$('report-players-list');
    if (!modal || !list) return;

    list.innerHTML = '';
    const players = Network.getPlayers();

    if (!players || players.size === 0) {
      list.innerHTML = '<div style="color:#aaa;font-size:7px;text-align:center;padding:10px;">لا يوجد لاعبون قريبون</div>';
    } else {
      for (const [id, p] of players.entries()) {
        const btn = document.createElement('button');
        btn.style.cssText = [
          'background:#0a0a1e','border:2px solid #cc1111',
          'color:#fff','padding:10px','font-family:\'Press Start 2P\',monospace',
          'font-size:7px','cursor:pointer','text-align:right'
        ].join(';');
        btn.textContent = '🚨 ' + (p.name || 'لاعب');
        btn.onclick = () => sendReport(id, p.name);
        list.appendChild(btn);
      }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    _modalOpen = true;
  }

  function closeModal() {
    const modal = Utils.$('report-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    _modalOpen = false;
  }

  async function sendReport(targetId, targetName) {
    closeModal();
    try {
      const res = await fetch('https://ncore-mmo-server.onrender.com/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: Network.getMyId(),
          targetId,
          sessionId: _sessionId
        })
      });
      const data = await res.json();
      UI.showToast(`تم التبليغ ✅ (${data.reports || 1}/3)`, 2000);
    } catch (e) {
      UI.showToast('فشل التبليغ ❌', 1500);
    }
  }

  function showReportBtn() {
    const b = Utils.$('report-btn');
    if (b) { b.classList.remove('hidden'); b.style.display = 'block'; }
  }

  function hideReportBtn() {
    closeModal(); 
    const b = Utils.$('report-btn');
    if (b) { b.classList.add('hidden'); b.style.display = 'none'; }
  }

  return { init, openModal, closeModal, showReportBtn, hideReportBtn };
})();
