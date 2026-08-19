
(() => {
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

  function setStatus(text, kind = "neutral") {
    els.status.textContent = text;
    if (kind === "good") {
      els.status.style.color = "#17654f";
      els.status.style.background = "#e8f7f1";
    } else if (kind === "bad") {
      els.status.style.color = "#b42318";
      els.status.style.background = "#fff0ee";
    } else {
      els.status.style.color = "";
      els.status.style.background = "";
    }
  }

  async function api(path, body) {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : {"Content-Type": "application/json"},
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
    }
    return payload;
  }

  async function refreshStatus() {
    try {
      const status = await api("/api/status");
      if (status.tavus_configured) {
        setStatus("Tavus ready", "good");
        els.start.disabled = false;
        els.test.disabled = false;
      } else {
        setStatus("Needs API key", "bad");
        els.start.disabled = true;
        els.test.disabled = false;
      }
    } catch (error) {
      setStatus("Backend offline", "bad");
      els.start.disabled = true;
    }
  }

  async function startConversation(testMode = false) {
    const original = testMode ? els.test.textContent : els.start.textContent;
    const button = testMode ? els.test : els.start;

    try {
      button.disabled = true;
      button.textContent = testMode ? "Testing…" : "Starting…";

      const result = await api("/api/tavus/start", {
        test_mode: testMode,
        conversation_name: testMode ? "AIRazor connectivity test" : "AIRazor merchant demo"
      });

      if (testMode) {
        setStatus("Connection works", "good");
        alert("Tavus connection is configured correctly. Test mode did not consume a live avatar session.");
        return;
      }

      currentConversationId = result.conversation_id;
      currentConversationUrl = result.conversation_url;
      els.frame.src = currentConversationUrl;
      els.label.textContent = result.conversation_name || "AIRazor live conversation";
      els.empty.classList.add("hidden");
      els.live.classList.remove("hidden");
      setStatus("Live", "good");
    } catch (error) {
      setStatus("Tavus error", "bad");
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function endConversation() {
    if (!currentConversationId) return;

    try {
      els.end.disabled = true;
      await api("/api/tavus/end", {conversation_id: currentConversationId});
    } catch (error) {
      console.warn(error);
    } finally {
      currentConversationId = null;
      currentConversationUrl = null;
      els.frame.src = "about:blank";
      els.live.classList.add("hidden");
      els.empty.classList.remove("hidden");
      els.end.disabled = false;
      setStatus("Tavus ready", "good");
    }
  }

  els.start.addEventListener("click", () => startConversation(false));
  els.test.addEventListener("click", () => startConversation(true));
  els.end.addEventListener("click", endConversation);
  els.open.addEventListener("click", () => {
    if (currentConversationUrl) {
      window.open(currentConversationUrl, "_blank", "noopener,noreferrer");
    }
  });

  window.addEventListener("beforeunload", () => {
    // Best-effort cleanup; navigator.sendBeacon cannot set Tavus API auth,
    // so the backend cleanup endpoint remains manual during the prototype.
  });

  refreshStatus();
})();
