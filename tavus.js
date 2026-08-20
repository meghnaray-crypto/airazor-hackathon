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
  let fallback3DContainer = null;
  let fallback3DCleanup = null;

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
        setStatus(providerStatus.did_configured ? "Tavus ready · D-ID + 3D fallback" : "Tavus ready · 3D fallback", "good");
      } else if (providerStatus.did_configured) {
        setStatus("D-ID ready · 3D fallback", "good");
      } else {
        setStatus("3D presenter ready", "good");
      }
      els.start.disabled = false;
      els.test.disabled = false;
    } catch (error) {
      setStatus("3D presenter ready", "good");
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
      return "Based on what you shared, I would focus this walkthrough on Payroll. I will prioritise employee scale, attendance and leave inputs, payroll processing, compliance operations and full-and-final settlement only where they are relevant to your problem.";
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
      return "Based on what you shared, I would focus on payment acceptance and qualify the checkout channel, payment modes, international requirement and whether reconciliation or settlement is the bigger pain point.";
    }
    return "I will use the merchant conversation to explain only the Razorpay journey that matches the business problem, rather than running a generic product demo.";
  }

  function preferredVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const preferredNames = [
      /Google.*English.*India/i,
      /Microsoft Neerja/i,
      /Rishi/i,
      /Veena/i,
      /Samantha/i,
      /Google UK English Female/i,
      /Google US English/i,
      /Microsoft Aria/i
    ];
    for (const pattern of preferredNames) {
      const match = voices.find(v => pattern.test(v.name));
      if (match) return match;
    }
    return voices.find(v => /en-IN/i.test(v.lang)) || voices.find(v => /^en-(GB|US)/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
  }

  function speakNatural(text, onStart, onEnd) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  }

  async function start3DFallback(reason = "") {
    const shell = els.frame?.parentElement;
    if (!shell) return;
    els.frame.style.display = "none";
    if (didContainer) { didContainer.remove(); didContainer = null; }
    document.getElementById("airazor-did-agent-script")?.remove();
    if (fallback3DCleanup) { fallback3DCleanup(); fallback3DCleanup = null; }
    if (fallback3DContainer) fallback3DContainer.remove();

    fallback3DContainer = document.createElement("div");
    fallback3DContainer.id = "airazor3DPresenter";
    fallback3DContainer.style.minHeight = "430px";
    fallback3DContainer.style.position = "relative";
    fallback3DContainer.style.overflow = "hidden";
    fallback3DContainer.style.borderRadius = "16px";
    fallback3DContainer.style.background = "radial-gradient(circle at 50% 15%, #eef5ff 0%, #dce9ff 45%, #c9dcff 100%)";
    fallback3DContainer.innerHTML = `
      <div id="airazor3DCanvas" style="height:300px;width:100%"></div>
      <div style="padding:0 22px 22px;text-align:center">
        <div style="font-size:11px;letter-spacing:.16em;font-weight:800;color:#1c5bc7;margin-bottom:8px">AIRAZOR 3D PRESENTER</div>
        <p id="airazor3DText" style="font-size:14px;line-height:1.6;color:#455570;margin:0 auto 12px;max-width:560px"></p>
        <button id="airazor3DReplay" type="button" style="border:1px solid #c5d4ee;background:#fff;border-radius:10px;padding:9px 15px;font-weight:700;cursor:pointer;color:#17396e">Replay explanation</button>
      </div>`;
    shell.appendChild(fallback3DContainer);

    const context = latestMerchantContext();
    const intro = reason ? "The premium live avatar is unavailable, so I am continuing with AIRazor's no-credit 3D presenter. " : "";
    const narration = `${intro}${context} Product facts and recommendations still come from the same AIRazor backend and verified Razorpay context.`;
    fallback3DContainer.querySelector("#airazor3DText").textContent = narration;

    let speaking = false;
    let stopped = false;
    let raf = 0;
    try {
      const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
      const mount = fallback3DContainer.querySelector("#airazor3DCanvas");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0.15, 6.2);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const resize = () => {
        const width = mount.clientWidth || 420;
        const height = mount.clientHeight || 300;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x6d86b4, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x5f8fff, 2.0);
      rim.position.set(-4, 2, -2);
      scene.add(rim);

      const group = new THREE.Group();
      scene.add(group);

      const blue = new THREE.MeshStandardMaterial({ color: 0x2f6fed, roughness: 0.38, metalness: 0.15 });
      const navy = new THREE.MeshStandardMaterial({ color: 0x163a72, roughness: 0.42, metalness: 0.1 });
      const skin = new THREE.MeshStandardMaterial({ color: 0xf0b58f, roughness: 0.7 });
      const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x172033, roughness: 0.65 });

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.02, 1.2, 8, 24), navy);
      torso.position.y = -1.45;
      torso.scale.z = 0.62;
      group.add(torso);

      const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.92, 0.45, 24), blue);
      shirt.position.y = -0.62;
      group.add(shirt);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.42, 20), skin);
      neck.position.y = -0.36;
      group.add(neck);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 32), skin);
      head.scale.set(0.88, 1.08, 0.88);
      head.position.y = 0.55;
      group.add(head);

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.92, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.46), dark);
      hair.position.y = 0.82;
      hair.scale.set(0.9, 0.82, 0.91);
      group.add(hair);

      [-0.31, 0.31].forEach(x => {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 16), white);
        eyeWhite.scale.set(1.3, 0.72, 0.55);
        eyeWhite.position.set(x, 0.7, 0.77);
        group.add(eyeWhite);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), dark);
        pupil.position.set(x, 0.69, 0.865);
        group.add(pupil);
      });

      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.055), new THREE.MeshStandardMaterial({ color: 0x7c2e3d, roughness: 0.8 }));
      mouth.position.set(0, 0.29, 0.84);
      group.add(mouth);

      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.23, 32), blue);
      badge.position.set(0, -1.2, 0.73);
      group.add(badge);

      group.rotation.x = -0.03;

      const clock = new THREE.Clock();
      function animate() {
        if (stopped) return;
        const t = clock.getElapsedTime();
        group.rotation.y = Math.sin(t * 0.55) * 0.055;
        group.position.y = Math.sin(t * 1.2) * 0.025;
        mouth.scale.y = speaking ? 1 + Math.abs(Math.sin(t * 13)) * 7 : 1;
        head.rotation.z = Math.sin(t * 0.7) * 0.018;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      }
      animate();

      fallback3DCleanup = () => {
        stopped = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        renderer.dispose();
      };
    } catch (error) {
      console.warn("3D renderer unavailable, keeping voice presenter:", error);
    }

    const play = () => speakNatural(narration, () => { speaking = true; }, () => { speaking = false; });
    fallback3DContainer.querySelector("#airazor3DReplay").addEventListener("click", play);
    if (window.speechSynthesis?.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => play();
      setTimeout(() => play(), 700);
    } else {
      play();
    }

    els.label.textContent = "AIRazor 3D presenter";
    els.empty.classList.add("hidden");
    els.live.classList.remove("hidden");
    els.open.style.display = "none";
    setStatus("3D presenter live", "good");
  }

  async function startConversation(testMode = false) {
    const original = testMode ? els.test.textContent : els.start.textContent;
    const button = testMode ? els.test : els.start;
    try {
      button.disabled = true;
      button.textContent = testMode ? "Testing…" : "Starting…";

      if (!providerStatus.tavus_configured && providerStatus.did_configured) {
        if (testMode) setStatus("D-ID fallback ready", "good");
        else startDidFallback();
        return;
      }

      if (!providerStatus.tavus_configured && !providerStatus.did_configured) {
        if (testMode) setStatus("3D fallback ready", "good");
        else await start3DFallback();
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
        await start3DFallback(error.message || "Tavus unavailable");
        return;
      }
      setStatus("3D fallback ready", "good");
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
    document.getElementById("airazor-did-agent-script")?.remove();
    if (fallback3DCleanup) { fallback3DCleanup(); fallback3DCleanup = null; }
    if (fallback3DContainer) { fallback3DContainer.remove(); fallback3DContainer = null; }
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