(() => {
  const backend = document.getElementById('backendStatus');
  const db = document.getElementById('dbStatus');
  const brain = document.getElementById('brainStatus');
  const tavus = document.getElementById('tavusStatusControl');
  const groq = document.getElementById('groqStatus');
  const gemini = document.getElementById('geminiStatus');
  const providerOrder = document.getElementById('providerOrder');
  const output = document.getElementById('apiOutput');
  const testInput = document.getElementById('llmTestInput');

  function badge(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = `badge ${kind || ''}`.trim();
  }

  async function refresh() {
    try {
      const status = await window.AIRazorAPI.status();
      badge(backend, 'Online', 'good');
      badge(tavus, status.tavus_configured ? 'Configured' : 'Pending', status.tavus_configured ? 'good' : 'warn');
      badge(db, status.database === 'connected' ? 'Connected' : 'Team working', status.database === 'connected' ? 'good' : 'warn');
      badge(brain, status.llm_ready ? 'Ready' : 'Not ready', status.llm_ready ? 'good' : 'warn');
      badge(groq, status.llm_providers?.groq ? 'Online' : 'Not configured', status.llm_providers?.groq ? 'good' : 'warn');
      badge(gemini, status.llm_providers?.gemini ? 'Online' : 'Not configured', status.llm_providers?.gemini ? 'good' : 'warn');
      badge(providerOrder, (status.llm_order || []).join(' → ') || '—', '');
      return status;
    } catch (error) {
      badge(backend, 'Offline', 'warn');
      output.textContent = error.message;
      throw error;
    }
  }

  document.getElementById('refreshStatus').addEventListener('click', refresh);

  document.getElementById('testStatus').addEventListener('click', async () => {
    output.textContent = 'Checking backend status...';
    try {
      const result = await refresh();
      output.textContent = JSON.stringify(result, null, 2);
    } catch (_) {}
  });

  document.getElementById('runLLMTest').addEventListener('click', async () => {
    const message = testInput.value.trim();
    if (!message) return;
    output.textContent = 'AIRazor is thinking...';
    try {
      const result = await window.AIRazorAPI.chat({
        session_id: `control-${Date.now()}`,
        message,
        history: []
      });
      output.textContent = [
        `PROVIDER: ${String(result.provider || 'unknown').toUpperCase()}`,
        `MODEL: ${result.model || 'unknown'}`,
        `GROUNDING: ${result.grounding || 'unknown'}`,
        `FALLBACK ATTEMPTS: ${(result.fallback_attempts || []).length}`,
        '',
        'AIRAZOR:',
        result.reply || '(empty response)',
        '',
        'RAW RESPONSE:',
        JSON.stringify(result, null, 2)
      ].join('\n');
    } catch (error) {
      output.textContent = JSON.stringify({
        status: error.status || null,
        message: error.message,
        backend_payload: error.payload || null
      }, null, 2);
    }
  });

  refresh().catch(() => {});
})();
