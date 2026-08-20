(() => {
  const BACKEND = "https://airazor-hackathon.onrender.com";
  const history = [];
  let recognition = null;
  let listening = false;

  function preferredVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const preferred = [
      /Google.*English.*India/i,
      /Microsoft Neerja/i,
      /Microsoft Aria/i,
      /Samantha/i,
      /Google UK English Female/i,
      /Google US English/i,
      /Rishi/i,
      /Veena/i
    ];
    for (const pattern of preferred) {
      const match = voices.find((voice) => pattern.test(voice.name));
      if (match) return match;
    }
    return voices.find((voice) => /en-IN/i.test(voice.lang)) ||
      voices.find((voice) => /^en-(GB|US)/i.test(voice.lang)) ||
      voices.find((voice) => /^en/i.test(voice.lang)) || null;
  }

  function speak(text, root) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => root?.classList.add("airazor-speaking");
    utterance.onend = () => root?.classList.remove("airazor-speaking");
    utterance.onerror = () => root?.classList.remove("airazor-speaking");
    window.speechSynthesis.speak(utterance);
  }

  async function askAIRazor(message) {
    const response = await fetch(`${BACKEND}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: `presenter-${Date.now()}`,
        message,
        history: history.slice(-10)
      }),
      cache: "no-store"
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(payload.error || payload.message || `AIRazor backend returned ${response.status}`);
    return payload;
  }

  function buildControls(root) {
    if (!root || root.dataset.conversationReady === "true") return;
    root.dataset.conversationReady = "true";

    const textEl = root.querySelector("#airazor3DText");
    const replay = root.querySelector("#airazor3DReplay");
    if (replay) replay.textContent = "Replay answer";

    const controls = document.createElement("div");
    controls.className = "airazor-presenter-conversation";
    controls.innerHTML = `
      <div class="airazor-presenter-label">Talk to AIRazor</div>
      <div class="airazor-presenter-input-row">
        <input id="airazorPresenterInput" type="text" autocomplete="off" placeholder="Ask about Payroll, Payouts, Smart Collect, payments…" aria-label="Ask AIRazor presenter" />
        <button id="airazorPresenterMic" type="button" aria-label="Use microphone">Mic</button>
        <button id="airazorPresenterSend" type="button">Ask</button>
      </div>
      <div id="airazorPresenterHint" class="airazor-presenter-hint">You can type or use your microphone. Answers come from the same AIRazor backend and RAG context.</div>
    `;
    root.appendChild(controls);

    const style = document.createElement("style");
    style.textContent = `
      .airazor-presenter-conversation{padding:0 22px 22px;max-width:680px;margin:0 auto}
      .airazor-presenter-label{font-size:12px;font-weight:800;letter-spacing:.08em;color:#1b4fb6;margin:4px 0 8px;text-transform:uppercase}
      .airazor-presenter-input-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px}
      .airazor-presenter-input-row input{min-width:0;border:1px solid #cbd8ee;background:#fff;border-radius:12px;padding:11px 12px;color:#17233b;outline:none;font:inherit}
      .airazor-presenter-input-row input:focus{border-color:#5287eb;box-shadow:0 0 0 3px rgba(47,111,237,.12)}
      .airazor-presenter-input-row button{border:0;border-radius:10px;padding:10px 13px;font-weight:800;cursor:pointer}
      #airazorPresenterMic{background:#edf3ff;color:#1f56bd;border:1px solid #d4e1fb}
      #airazorPresenterMic.listening{background:#fff0ee;color:#b42318;border-color:#ffd2cd}
      #airazorPresenterSend{background:#2f6fed;color:#fff}
      .airazor-presenter-hint{font-size:11px;color:#6d7b92;margin-top:7px;line-height:1.45}
      #airazor3DPresenter.airazor-speaking{box-shadow:0 0 0 3px rgba(47,111,237,.12),0 18px 44px rgba(31,86,189,.16)}
      @media(max-width:560px){.airazor-presenter-input-row{grid-template-columns:1fr 1fr}.airazor-presenter-input-row input{grid-column:1/-1}}
    `;
    document.head.appendChild(style);

    const input = root.querySelector("#airazorPresenterInput");
    const send = root.querySelector("#airazorPresenterSend");
    const mic = root.querySelector("#airazorPresenterMic");
    const hint = root.querySelector("#airazorPresenterHint");

    async function submit() {
      const message = (input?.value || "").trim();
      if (!message) return;
      send.disabled = true;
      mic.disabled = true;
      hint.textContent = "AIRazor is thinking…";
      if (textEl) textEl.textContent = `You: ${message}`;
      history.push({ role: "user", content: message });
      input.value = "";
      try {
        const result = await askAIRazor(message);
        const reply = result.reply || "I couldn't generate an answer just now. Please try that again.";
        history.push({ role: "assistant", content: reply });
        if (textEl) textEl.textContent = reply;
        hint.textContent = result.grounding === "supabase_rag" ? "Answered with Supabase RAG context." : "Answered with AIRazor qualification fallback.";
        speak(reply, root);
      } catch (error) {
        const fallback = "I can still continue the demo, but the live AIRazor brain is temporarily unavailable. Please try your question once more.";
        if (textEl) textEl.textContent = fallback;
        hint.textContent = error.message;
        speak(fallback, root);
      } finally {
        send.disabled = false;
        mic.disabled = false;
        input.focus();
      }
    }

    send.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); submit(); }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onstart = () => {
        listening = true;
        mic.classList.add("listening");
        mic.textContent = "Listening…";
        hint.textContent = "Listening. Ask AIRazor a question.";
      };
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        input.value = transcript;
      };
      recognition.onend = () => {
        listening = false;
        mic.classList.remove("listening");
        mic.textContent = "Mic";
        if ((input.value || "").trim()) submit();
      };
      recognition.onerror = () => {
        listening = false;
        mic.classList.remove("listening");
        mic.textContent = "Mic";
        hint.textContent = "Microphone recognition did not start. You can still type your question.";
      };
      mic.addEventListener("click", () => {
        try {
          if (listening) recognition.stop();
          else recognition.start();
        } catch (_) {}
      });
    } else {
      mic.disabled = true;
      mic.title = "Speech recognition is not available in this browser";
      hint.textContent = "Type your question below. Microphone conversation is not supported by this browser.";
    }

    replay?.addEventListener("click", () => {
      const current = (textEl?.textContent || "").trim();
      if (current) speak(current, root);
    });
  }

  function scan() {
    buildControls(document.getElementById("airazor3DPresenter"));
  }

  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
})();