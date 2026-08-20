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
  let browserPresenter = null;

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
        setStatus(providerStatus.did_configured ? "Tavus ready · D-ID fallback" : "Tavus ready · browser fallback", "good");
      } else if (providerStatus.did_configured) {
        setStatus("D-ID ready · browser fallback", "good");
      } else {
        setStatus("Browser presenter ready", "good");
      }
      els.start.disabled = false;
      els.test.disabled = false;
    } catch (error) {
      setStatus("Browser presenter ready", "good");
      els.start.disabled = false;
      els.test.disabled = false;
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

  function latestMerchantContext() {
    const userMessages = [...document.querySelectorAll('.message.user, .chat-message.user, [data-role="user"]')];
    const last = userMessages[userMessages.length - 1];
    const text = (last?.textContent || "").trim();
    if (/payroll|employee|attendance|salary|full.?and.?final|f&f/i.test(text)) {
      return "Based on what you shared, I would focus this walkthrough on Payroll. I will prioritise the employee scale, attendance or leave inputs, payroll processing, compliance operations and full-and-final settlement only where they are relevant to your problem.";
    }
    if (/vendor|supplier|payout|contractor|beneficiary/i.test(text)) {
      return "Based on what you shared, I would focus this walkthrough on RazorpayX Payouts: who you pay, payout volume, manual versus bulk or API execution, approval controls and reconciliation.";
    }
    if (/reconcil|bank transfer|neft|rtgs|imps|virtual account|vpa/i.test(text)) {
      return "Based on what you shared, I would explore Smart Collect 2.0 because the problem sounds like identifying and reconciling incoming transfers, not just accepting payments.";
    }
    if (/marketplace|seller|escrow|hold funds|release funds/i.test(text)) {
      return "Based on what you shared, I would first separate online payment acceptance from any controlled holding or release of seller funds, because a marketplace does not automatically mean escrow.";
    }
    if (/payment|checkout|card|website|international/i.test(text)) {
      return "Based on what you shared, I would focus on the payment acceptance journey and qualify the checkout channel, payment modes, international requirement and whether reconciliation or settlement is the bigger pain point.";
    }
    return "I will use the merchant conversation to explain only the Razorpay journey that matches the business problem, rather than running a generic product demo.";
  }

  function speakBrowserPresenter(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /en-IN/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }

  function startBrowserFallback(reason = "") {
    const shell = els.frame?.parentElement;
    if (!shell) return;
    els.frame.style.display = "none";
    if (didContainer) { didContainer.remove(); didContainer = null; }
    document.getElementById("airazor-did-agent-script")?.remove();
    if (browserPresenter) browserPresenter.remove();

    browserPresenter = document.createElement("div");
    browserPresenter.id = "airazorBrowserPresenter";
    browserPresenter.style.minHeight = "420px";
    browserPresenter.style.display = "flex";
    browserPresenter.style.flexDirection = "column";
    browserPresenter.style.alignItems = "center";
    browserPresenter.style.justifyContent = "center";
    browserPresenter.style.gap = "18px";
    browserPresenter.style.padding = "28px";
    browserPresenter.style.textAlign = "center";
    browserPresenter.style.background = "linear-gradient(180deg,#f8fbff 0%,#eef5ff 100%)";
    browserPresenter.innerHTML = `
      <div style="width:112px;height:112px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#0b4fc7,#2f80ff);box-shadow:0 0 0 14px #e7f0ff,0 0 0 16px #bed4ff;animation:airazorPulse 1.8s ease-in-out infinite"><span style="font-size:40px;font-weight:800;color:white">A</span></div>
      <div style="max-width:520px">
        <div style="font-size:12px;letter-spacing:.16em;font-weight:800;color:#1c5bc7;margin-bottom:8px">AIRAZOR LIVE PRESENTER</div>
        <div style="font-size:22px;font-weight:800;color:#14213d;margin-bottom:10px">Demo continues without external credits</div>
        <p id="browserPresenterText" style="font-size:15px;line-height:1.65;color:#52617a;margin:0"></p>
      </div>
      <button id="replayBrowserPresenter" type="button" style="border:1px solid #cfd9eb;background:white;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer">Replay explanation</button>
      <style>@keyframes airazorPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}</style>`;
    shell.appendChild(browserPresenter);

    const context = latestMerchantContext();
    const intro = reason ? "The live avatar provider is unavailable, so I am continuing in AIRazor's built-in presenter mode. " : "";
    const narration = `${intro}${context} The product facts and recommendations still come from the same AIRazor backend and verified Razorpay context.`;
    browserPresenter.querySelector("#browserPresenterText").textContent = narration;
    browserPresenter.querySelector("#replayBrowserPresenter").addEventListener("click", () => speakBrowserPresenter(narration));
    speakBrowserPresenter(narration);

    els.label.textContent = "AIRazor built-in presenter";
    els.empty.classList.add("hidden");
    els.live.classList.remove("hidden");
    els.open.style.display = "none";
    setStatus("Built-in presenter live", "good");
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
        } else {
          startDidFallback();
        }
        return;
      }

      if (!providerStatus.tavus_configured && !providerStatus.did_configured) {
        if (testMode) setStatus("Browser fallback ready", "good");
        else startBrowserFallback();
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
        try { startDidFallback(); return; } catch (_) {}
      }
      if (!testMode) {
        startBrowserFallback(error.message || "Tavus unavailable");
        return;
      }
      setStatus("Browser fallback ready", "good");
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
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    currentConversationId = null;
    currentConversationUrl = null;
    els.frame.src = "about:blank";
    els.frame.style.display = "block";
    if (didContainer) { didContainer.remove(); didContainer = null; }
    if (browserPresenter) { browserPresenter.remove(); browserPresenter = null; }
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