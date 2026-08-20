(() => {
  const $ = (id) => document.getElementById(id);
  const backend = $('backendStatus');
  const db = $('dbStatus');
  const brain = $('brainStatus');
  const tavus = $('tavusStatusControl');
  const groq = $('groqStatus');
  const gemini = $('geminiStatus');
  const providerOrder = $('providerOrder');
  const output = $('apiOutput');
  const testInput = $('llmTestInput');
  const runButton = $('runLLMTest');

  function badge(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = `badge ${kind || ''}`.trim();
  }

  async function refresh() {
    const status = await window.AIRazorAPI.status();
    badge(backend, 'Online', 'good');
    badge(tavus, status.tavus_configured ? 'Configured' : 'Pending', status.tavus_configured ? 'good' : 'warn');
    badge(db, status.database === 'connected' ? 'Connected' : 'Team working', status.database === 'connected' ? 'good' : 'warn');
    badge(brain, status.llm_ready ? 'Ready' : 'Not ready', status.llm_ready ? 'good' : 'warn');
    badge(groq, status.llm_providers?.groq ? 'Online' : 'Not configured', status.llm_providers?.groq ? 'good' : 'warn');
    badge(gemini, status.llm_providers?.gemini ? 'Online' : 'Not configured', status.llm_providers?.gemini ? 'good' : 'warn');
    badge(providerOrder, (status.llm_order || []).join(' → ') || '—', '');
    return status;
  }

  async function runLLMTest() {
    const message = (testInput?.value || '').trim();
    if (!message) {
      output.textContent = 'Enter a merchant message first.';
      return;
    }
    runButton.disabled = true;
    runButton.textContent = 'AIRazor is thinking…';
    output.textContent = `NEW TEST STARTED: ${new Date().toLocaleTimeString()}\n\nCalling /api/chat...`;
    try {
      const result = await window.AIRazorAPI.chat({ session_id: `control-${Date.now()}`, message, history: [] });
      output.textContent = [
        `TESTED: ${new Date().toLocaleTimeString()}`,
        `PROVIDER: ${String(result.provider || 'unknown').toUpperCase()}`,
        `MODEL: ${result.model || 'unknown'}`,
        `GROUNDING: ${result.grounding || 'unknown'}`,
        `FALLBACK ATTEMPTS: ${(result.fallback_attempts || []).length}`,
        '', 'AIRAZOR:', result.reply || '(empty response)', '', 'RAW RESPONSE:', JSON.stringify(result, null, 2)
      ].join('\n');
    } catch (error) {
      output.textContent = [
        `TESTED: ${new Date().toLocaleTimeString()}`,
        `STATUS: ${error.status || 'unknown'}`,
        `ERROR: ${error.message}`,
        '', 'BACKEND PAYLOAD:', JSON.stringify(error.payload || null, null, 2)
      ].join('\n');
    } finally {
      runButton.disabled = false;
      runButton.textContent = 'Ask AIRazor';
    }
  }

  $('refreshStatus')?.addEventListener('click', () => refresh().catch((error) => { output.textContent = error.message; }));
  $('testStatus')?.addEventListener('click', async () => {
    output.textContent = 'Checking backend status...';
    try { output.textContent = JSON.stringify(await refresh(), null, 2); }
    catch (error) { output.textContent = error.message; }
  });
  runButton?.addEventListener('click', runLLMTest);

  // Fallback hook: useful if a browser extension or stale DOM interferes with the normal listener.
  window.runAIRazorControlTest = runLLMTest;
  if (runButton) runButton.onclick = runLLMTest;

  refresh().catch((error) => {
    badge(backend, 'Offline', 'warn');
    output.textContent = `Control Room initialization error: ${error.message}`;
  });
})();
