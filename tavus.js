(() => {
  const BACKEND = "https://airazor-hackathon.onrender.com";
  const els = {
    status: document.getElementById("tavusStatus"),
    empty: document.getElementById("tavusEmptyState"),
    live: document.getElementById("tavusLiveState"),
    frame: document.getElementById("tavusFrame"),
    start: document.getElementById("startTavusButton"),
    test: document.getElementById("testTavusButton"),
    end: document.getElementById("endTavusButton"),
    open: document.getElementById("openTavusButton"),
    label: document.getElementById("tavusConversationLabel")
  };
  if (!els.status) return;

  let currentConversationId = null;
  let currentConversationUrl = null;
  let providerStatus = { tavus_configured: false, did_configured: false };
  let didContainer = null;

  function setStatus(text, kind = "neutral") {
    els.status.textContent = text;
    if (kind === "good") { els.status.style.color = "#17654f"; els.status.style.background = "#e8f7f1"; }
    else if (kind === "bad") { els.status.style.color = "#b42318"; els.status.style.background = "#fff0ee"; }
    else { els.status.style.color = ""; els.status.style.background = ""; }
  }

  function backendUrl(path) {
    return path.startsWith("/api/") ? `${BACKEND}${path}` : path;
  }

  async function api(path, body) {
    const response = await fetch(backendUrl(path), {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : {"Content-Type": "application/json"},
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store"
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
    return payload;
  }

  async function refreshStatus() {
    try {
      providerStatus = await api("/api/status");
      if (providerStatus.tavus_configured) {
        setStatus(providerStatus.did_configured ? "Tavus ready · D-ID fallback" : "Tavus ready", "good");
        els.start.disabled = false;
        els.test.disabled = false;
      } else if (providerStatus.did_configured) {
        setStatus("D-ID fallback ready", "good");
        els.start.disabled = false;
        els.test.disabled = false;
      } else {
        setStatus("Presenter not configured", "bad");
        els.start.disabled = true;
        els.test.disabled = false;
      }
    } catch (error) {
      setStatus("Backend offline", "bad");
      els.start.disabled = true;
    }
  }

  function ensureDidContainer() {
    const shell = els.frame?.parentElement;
    if (!shell) throw new Error("AI presenter container is unavailable.");
    els.frame.style.display = "none";
    if (!didContainer) {
      didContainer = document.createElement("div");
      didContainer.id = "didAgentContainer";
      didContainer.style.width = "100%";
      didContainer.style.minHeight = "420px";
      shell.appendChild(didContainer);
    }
    return didContainer;
  }

  function startDidFallback() {
    if (!providerStatus.did_configured || !providerStatus.did_client_key || !providerStatus.did_agent_id) {
      throw new Error("D-ID fallback is not configured.");
    }
    ensureDidContainer();
    const old = document.getElementById("airazor-did-agent-script");
    if (old) old.remove();
    const script = document.createElement("script");
    script.id = "airazor-did-agent-script";
    script.type = "module";
    script.src = "https://agent.d-id.com/v2/index.js";
    script.dataset.mode = "full";
    script.dataset.targetId = "didAgentContainer";
    script.dataset.clientKey = providerStatus.did_client_key;
    script.dataset.agentId = providerStatus.did_agent_id;
    script.dataset.showRestartButton = "true";
    script.dataset.showAgentName = "false";
    document.body.appendChild(script);
    els.label.textContent = "AIRazor live conversation · D-ID fallback";
    els.empty.classList.add("hidden");
    els.live.classList.remove("hidden");
    els.open.style.display = "none";
    setStatus("D-ID live", "good");
  }

  async function startConversation(testMode = false) {
    const original = testMode ? els.test.textContent : els.start.textContent;
    const button = testMode ? els.test : els.start;
    try {
      button.disabled = true;
      button.textContent = testMode ? "Testing…" : "Starting…";

      if (!providerStatus.tavus_configured && providerStatus.did_configured) {
        if (testMode) {
          setStatus("D-ID fallback ready", "good");
          alert("D-ID fallback is configured.");
        } else {
          startDidFallback();
        }
        return;
      }

      const result = await api("/api/tavus/start", {
        test_mode: testMode,
        conversation_name: testMode ? "AIRazor connectivity test" : "AIRazor merchant demo"
      });

      if (testMode) {
        setStatus("Tavus connection works", "good");
        if (result.conversation_id) {
          try { await api("/api/tavus/end", {conversation_id: result.conversation_id}); } catch (_) {}
        }
        alert("Tavus connection works.");
        return;
      }

      currentConversationId = result.conversation_id;
      currentConversationUrl = result.conversation_url;
      if (!currentConversationUrl) throw new Error("Tavus did not return a conversation URL.");
      els.frame.style.display = "block";
      els.frame.src = currentConversationUrl;
      els.label.textContent = result.conversation_name || "AIRazor live conversation";
      els.empty.classList.add("hidden");
      els.live.classList.remove("hidden");
      els.open.style.display = "";
      setStatus("Tavus live", "good");
    } catch (error) {
      if (providerStatus.did_configured && !testMode) {
        try {
          startDidFallback();
          return;
        } catch (_) {}
      }
      setStatus("Presenter error", "bad");
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function endConversation() {
    if (currentConversationId) {
      try { els.end.disabled = true; await api("/api/tavus/end", {conversation_id: currentConversationId}); }
      catch (error) { console.warn(error); }
    }
    currentConversationId = null;
    currentConversationUrl = null;
    els.frame.src = "about:blank";
    els.frame.style.display = "block";
    if (didContainer) {
      didContainer.remove();
      didContainer = null;
    }
    document.getElementById("airazor-did-agent-script")?.remove();
    els.live.classList.add("hidden");
    els.empty.classList.remove("hidden");
    els.end.disabled = false;
    els.open.style.display = "";
    await refreshStatus();
  }

  els.start.addEventListener("click", () => startConversation(false));
  els.test.addEventListener("click", () => startConversation(true));
  els.end.addEventListener("click", endConversation);
  els.open.addEventListener("click", () => { if (currentConversationUrl) window.open(currentConversationUrl, "_blank", "noopener,noreferrer"); });
  refreshStatus();
})();
