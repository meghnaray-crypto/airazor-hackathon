(() => {
  const backend = document.getElementById('backendStatus');
  const db = document.getElementById('dbStatus');
  const brain = document.getElementById('brainStatus');
  const tavus = document.getElementById('tavusStatusControl');
  const output = document.getElementById('apiOutput');

  function badge(el, text, kind) {
    el.textContent = text;
    el.className = `badge ${kind || ''}`.trim();
  }

  async function refresh() {
    try {
      const status = await window.AIRazorAPI.status();
      badge(backend, 'Online', 'good');
      badge(tavus, status.tavus_configured ? 'Configured' : 'Needs key', status.tavus_configured ? 'good' : 'warn');
      badge(db, status.database && status.database !== 'pending_team_confirmation' ? 'Configured' : 'Pending', status.database && status.database !== 'pending_team_confirmation' ? 'good' : 'warn');
      badge(brain, status.brain_mode && !status.brain_mode.includes('mock') ? 'Connected' : 'Mock / pending', status.brain_mode && !status.brain_mode.includes('mock') ? 'good' : 'warn');
      return status;
    } catch (error) {
      badge(backend, 'Offline', 'warn');
      output.textContent = error.message;
      throw error;
    }
  }

  document.getElementById('refreshStatus').addEventListener('click', refresh);

  document.getElementById('testStatus').addEventListener('click', async () => {
    try {
      const result = await refresh();
      output.textContent = JSON.stringify(result, null, 2);
    } catch (_) {}
  });

  document.getElementById('testChat').addEventListener('click', async () => {
    output.textContent = 'Testing /api/chat...';
    try {
      const result = await window.AIRazorAPI.chat({
        session_id: `control-${Date.now()}`,
        message: 'I have 120 employees and attendance and F&F are painful.',
        selected_plan_id: null,
        action: null
      });
      output.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      output.textContent = JSON.stringify({
        expected_for_now: true,
        status: error.status || null,
        message: error.message,
        backend_payload: error.payload || null
      }, null, 2);
    }
  });

  refresh().catch(() => {});
})();
