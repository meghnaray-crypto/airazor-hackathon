(() => {
  const razorSenseLink = document.createElement('link');
  razorSenseLink.rel = 'stylesheet';
  razorSenseLink.href = '/razorsense.css?v=20260821-1';
  document.head.appendChild(razorSenseLink);

  const $ = (id) => document.getElementById(id);
  const backend = $('backendStatus');
  const db = $('dbStatus');
  const brain = $('brainStatus');
  const tavus = $('tavusStatusControl');
  const groq = $('groqStatus');
  const gemini = $('geminiStatus');
  const slack = $('slackStatus');
  const slackChannel = $('slackChannel');
  const providerOrder = $('providerOrder');
  const output = $('apiOutput');
  const testInput = $('llmTestInput');
  const runButton = $('runLLMTest');
  const slackButton = $('testSlackHandoff');

  function badge(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = `badge ${kind || ''}`.trim();
  }

  async function refresh() {
    const status = await window.AIRazorAPI.status();
    const ragReady = Boolean(status.rag_configured && status.database === 'connected');
    const tavusReady = Boolean(status.tavus_configured);
    badge(backend, 'Online', 'good');
    badge(tavus, tavusReady ? 'Configured' : 'Pending', tavusReady ? 'good' : 'warn');
    badge(db, ragReady ? 'Connected' : 'Not ready', ragReady ? 'good' : 'warn');
    badge(brain, status.brain_mode === 'rag_grounded' ? 'RAG grounded' : (status.llm_ready ? 'LLM ready' : 'Not ready'), status.llm_ready ? 'good' : 'warn');
    badge(groq, status.llm_providers?.groq ? 'Online' : 'Not configured', status.llm_providers?.groq ? 'good' : 'warn');
    badge(gemini, status.llm_providers?.gemini ? 'Online' : 'Not configured', status.llm_providers?.gemini ? 'good' : 'warn');
    badge(providerOrder, (status.llm_order || []).join(' → ') || '—', '');
    badge($('ragModeBadge'), ragReady ? 'Supabase RAG active' : 'Qualification only', ragReady ? 'good' : 'warn');
    badge($('embeddingStatus'), ragReady ? 'RAG endpoint ready' : 'Not verified', ragReady ? 'good' : 'warn');
    badge($('ragIntegrationStatus'), ragReady ? 'Connected' : 'Not ready', ragReady ? 'good' : 'warn');
    badge($('tavusIntegrationStatus'), tavusReady ? 'Configured' : 'Not configured', tavusReady ? 'good' : 'warn');
    badge(slack, status.slack_configured ? 'Connected' : 'Not configured', status.slack_configured ? 'good' : 'warn');
    badge(slackChannel, status.slack_channel_id || 'C0BS5MPCP7S', status.slack_channel_id ? 'good' : '');
    if (slackButton) slackButton.disabled = !status.slack_configured;
    return status;
  }

  async function runLLMTest() {
    const message = (testInput?.value || '').trim();
    if (!message) { output.textContent = 'Enter a merchant message first.'; return; }
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
        `RETRIEVAL COUNT: ${Number(result.retrieval_count || 0)}`,
        `FALLBACK ATTEMPTS: ${(result.fallback_attempts || []).length}`,
        '', 'AIRAZOR:', result.reply || '(empty response)', '', 'RAW RESPONSE:', JSON.stringify(result, null, 2)
      ].join('\n');
    } catch (error) {
      output.textContent = [`TESTED: ${new Date().toLocaleTimeString()}`, `STATUS: ${error.status || 'unknown'}`, `ERROR: ${error.message}`, '', 'BACKEND PAYLOAD:', JSON.stringify(error.payload || null, null, 2)].join('\n');
    } finally {
      runButton.disabled = false;
      runButton.textContent = 'Ask AIRazor';
    }
  }

  async function runSlackTest() {
    if (!slackButton) return;
    slackButton.disabled = true;
    slackButton.textContent = 'Sending…';
    output.textContent = 'Sending AIRazor specialist handoff test to Slack...';
    try {
      const response = await fetch('/api/slack/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: 'AIRazor Demo Merchant',
          product: 'Payment Gateway',
          product_family: 'payment_gateway',
          new_requirement: 'Verify specialist handoff from AIRazor Control Room',
          source: 'AIRazor Control Room smoke test',
          existing_context: {
            business_model: 'Marketplace / ecommerce',
            qualification: 'Completed',
            rag_grounding: 'Supabase RAG enabled'
          }
        })
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(data.error || `Backend returned ${response.status}`);
      output.textContent = [
        'SLACK HANDOFF TEST: SUCCESS',
        `CHANNEL: ${data.channel || 'C0BS5MPCP7S'}`,
        '',
        'The specialist handoff message was accepted by the AIRazor backend and posted to Slack.',
        '',
        JSON.stringify(data, null, 2)
      ].join('\n');
      badge(slack, 'Connected', 'good');
    } catch (error) {
      output.textContent = `SLACK HANDOFF TEST: FAILED\n${error.message}`;
    } finally {
      slackButton.textContent = 'Test Slack handoff';
      try {
        const status = await refresh();
        slackButton.disabled = !status.slack_configured;
      } catch (_) {
        slackButton.disabled = false;
      }
    }
  }

  $('refreshStatus')?.addEventListener('click', () => refresh().catch((error) => { output.textContent = error.message; }));
  $('testStatus')?.addEventListener('click', async () => { output.textContent = 'Checking backend status...'; try { output.textContent = JSON.stringify(await refresh(), null, 2); } catch (error) { output.textContent = error.message; } });
  runButton?.addEventListener('click', runLLMTest);
  slackButton?.addEventListener('click', runSlackTest);
  window.runAIRazorControlTest = runLLMTest;
  if (runButton) runButton.onclick = runLLMTest;
  refresh().catch((error) => { badge(backend, 'Offline', 'warn'); output.textContent = `Control Room initialization error: ${error.message}`; });
})();
