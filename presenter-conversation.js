(() => {
  const BACKEND = "https://airazor-hackathon.onrender.com";
  const history = [];
  let recognition = null;
  let listening = false;
  let activeVoiceName = "";

  function allVoices() {
    return ("speechSynthesis" in window) ? window.speechSynthesis.getVoices() : [];
  }

  function chooseDefaultVoice() {
    const voices = allVoices();
    const preferred = [
      /Rishi/i,
      /Microsoft Prabhat/i,
      /Daniel/i,
      /Alex/i,
      /Google UK English Male/i,
      /Microsoft Ryan/i,
      /Google.*English.*India/i,
      /Samantha/i,
      /Microsoft Aria/i,
      /Google UK English Female/i,
      /Google US English/i
    ];
    for (const pattern of preferred) {
      const match = voices.find((voice) => pattern.test(voice.name));
      if (match) return match;
    }
    return voices.find((voice) => /en-IN/i.test(voice.lang)) ||
      voices.find((voice) => /^en-(GB|US)/i.test(voice.lang)) ||
      voices.find((voice) => /^en/i.test(voice.lang)) || null;
  }

  function selectedVoice() {
    const voices = allVoices();
    return voices.find((voice) => voice.name === activeVoiceName) || chooseDefaultVoice();
  }

  function speak(text, root) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = selectedVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 0.93;
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
        session_id: "presenter-live-session",
        message,
        history: history.slice(-12)
      }),
      cache: "no-store"
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(payload.error || payload.message || `AIRazor backend returned ${response.status}`);
    return payload;
  }

  function addMessage(transcript, role, text) {
    const row = document.createElement("div");
    row.className = `airazor-presenter-turn ${role}`;
    row.innerHTML = `<span>${role === "user" ? "You" : "AIRazor"}</span><p></p>`;
    row.querySelector("p").textContent = text;
    transcript.appendChild(row);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function installStyles() {
    if (document.getElementById("airazor-presenter-conversation-styles")) return;
    const style = document.createElement("style");
    style.id = "airazor-presenter-conversation-styles";
    style.textContent = `
      .tavus-frame-shell:has(#airazor3DPresenter){height:auto!important;max-height:none!important;overflow:visible!important;aspect-ratio:auto!important;background:transparent!important}
      .tavus-frame-shell:has(#airazor3DPresenter) iframe{display:none!important}
      #airazor3DPresenter{min-height:0!important;border:1px solid #d8e4fb!important;border-radius:18px!important;overflow:visible!important;background:linear-gradient(180deg,#eef5ff 0%,#f9fbff 62%,#fff 100%)!important}
      #airazor3DPresenter #airazor3DCanvas{height:240px!important;border-radius:18px 18px 0 0;overflow:hidden}
      #airazor3DPresenter > div:nth-child(2){padding:0 18px 12px!important}
      #airazor3DPresenter #airazor3DText{display:none!important}
      #airazor3DPresenter #airazor3DReplay{display:none!important}
      .airazor-presenter-console{border-top:1px solid #dfe8f7;background:#fff;border-radius:0 0 18px 18px;padding:14px}
      .airazor-presenter-topline{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .airazor-presenter-title{font-size:13px;font-weight:800;color:#17223b}
      .airazor-presenter-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#17654f;background:#eaf8f2;border-radius:999px;padding:5px 8px}
      .airazor-presenter-live:before{content:"";width:7px;height:7px;border-radius:50%;background:#20a978}
      .airazor-presenter-transcript{max-height:170px;overflow:auto;background:#f7f9fd;border:1px solid #e4e9f3;border-radius:12px;padding:10px;margin-bottom:10px}
      .airazor-presenter-turn{margin:0 0 9px}.airazor-presenter-turn:last-child{margin-bottom:0}
      .airazor-presenter-turn span{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#7a879c;margin-bottom:3px}
      .airazor-presenter-turn p{margin:0;font-size:12px;line-height:1.48;color:#344054}
      .airazor-presenter-turn.user p{color:#174aa3}
      .airazor-presenter-input-row{display:grid;grid-template-columns:minmax(0,1fr) 42px 56px;gap:8px}
      .airazor-presenter-input-row input{min-width:0;border:1px solid #cfd9e9;background:#fff;border-radius:10px;padding:10px 11px;color:#17223b;outline:none;font:inherit;font-size:12px}
      .airazor-presenter-input-row input:focus{border-color:#4f7fe7;box-shadow:0 0 0 3px rgba(47,111,237,.12)}
      .airazor-presenter-input-row button{border-radius:10px;border:1px solid #d7e1f2;background:#fff;font-weight:800;cursor:pointer;font-size:12px}
      #airazorPresenterSend{background:#2f6fed;color:#fff;border-color:#2f6fed}
      #airazorPresenterMic{font-size:17px;color:#1f56bd;background:#edf3ff}
      #airazorPresenterMic.listening{background:#fff0ee;color:#b42318;border-color:#ffc8c0;box-shadow:0 0 0 4px rgba(180,35,24,.08)}
      .airazor-presenter-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;flex-wrap:wrap}
      .airazor-presenter-hint{font-size:10px;color:#6d7b92;line-height:1.35;flex:1}
      .airazor-voice-select{border:1px solid #d7e1ef;background:#fff;border-radius:9px;padding:6px 8px;color:#475467;font-size:10px;max-width:150px}
      .airazor-talk-button{width:100%;margin-top:10px;border:0;border-radius:11px;padding:11px 12px;background:linear-gradient(135deg,#2f6fed,#1457cf);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(47,111,237,.18)}
      .airazor-talk-button.listening{background:#b42318;box-shadow:0 8px 20px rgba(180,35,24,.18)}
      #airazor3DPresenter.airazor-speaking #airazor3DCanvas{box-shadow:inset 0 -4px 0 rgba(47,111,237,.18)}
      @media(max-width:560px){.airazor-presenter-input-row{grid-template-columns:1fr 42px}.airazor-presenter-input-row input{grid-column:1/-1}.airazor-presenter-input-row #airazorPresenterSend{grid-column:1/-1;padding:10px}}
    `;
    document.head.appendChild(style);
  }

  function buildControls(root) {
    if (!root || root.dataset.conversationReady === "true") return;
    root.dataset.conversationReady = "true";
    installStyles();

    const consoleEl = document.createElement("div");
    consoleEl.className = "airazor-presenter-console";
    consoleEl.innerHTML = `
      <div class="airazor-presenter-topline">
        <div class="airazor-presenter-title">Talk to AIRazor</div>
        <div class="airazor-presenter-live">Live conversation</div>
      </div>
      <div id="airazorPresenterTranscript" class="airazor-presenter-transcript" aria-live="polite"></div>
      <div class="airazor-presenter-input-row">
        <input id="airazorPresenterInput" type="text" autocomplete="off" placeholder="Ask a follow-up question…" aria-label="Ask AIRazor presenter" />
        <button id="airazorPresenterMic" type="button" aria-label="Use microphone" title="Speak">🎙</button>
        <button id="airazorPresenterSend" type="button">Ask</button>
      </div>
      <button id="airazorPresenterTalk" class="airazor-talk-button" type="button">Tap to speak to AIRazor</button>
      <div class="airazor-presenter-tools">
        <div id="airazorPresenterHint" class="airazor-presenter-hint">Use the mic or type. AIRazor will answer and speak back.</div>
        <select id="airazorPresenterVoice" class="airazor-voice-select" aria-label="Presenter voice"></select>
      </div>`;
    root.appendChild(consoleEl);

    const input = root.querySelector("#airazorPresenterInput");
    const send = root.querySelector("#airazorPresenterSend");
    const mic = root.querySelector("#airazorPresenterMic");
    const talk = root.querySelector("#airazorPresenterTalk");
    const hint = root.querySelector("#airazorPresenterHint");
    const transcript = root.querySelector("#airazorPresenterTranscript");
    const voiceSelect = root.querySelector("#airazorPresenterVoice");

    addMessage(transcript, "assistant", "Hi. Ask me about your business requirement and I’ll walk you through the relevant Razorpay setup.");

    function populateVoices() {
      const voices = allVoices().filter((voice) => /^en/i.test(voice.lang));
      voiceSelect.innerHTML = "";
      voices.slice(0, 24).forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} · ${voice.lang}`;
        voiceSelect.appendChild(option);
      });
      const best = selectedVoice();
      if (best) {
        activeVoiceName = activeVoiceName || best.name;
        voiceSelect.value = activeVoiceName;
      }
    }
    populateVoices();
    if ("speechSynthesis" in window) window.speechSynthesis.addEventListener?.("voiceschanged", populateVoices);
    voiceSelect.addEventListener("change", () => { activeVoiceName = voiceSelect.value; speak("Hi, I’m AIRazor. This is the selected presenter voice.", root); });

    async function submit(messageOverride = "") {
      const message = (messageOverride || input.value || "").trim();
      if (!message) return;
      send.disabled = true;
      mic.disabled = true;
      talk.disabled = true;
      hint.textContent = "AIRazor is thinking…";
      addMessage(transcript, "user", message);
      history.push({ role: "user", content: message });
      input.value = "";
      try {
        const result = await askAIRazor(message);
        const reply = result.reply || "I couldn't generate an answer just now. Please try that again.";
        history.push({ role: "assistant", content: reply });
        addMessage(transcript, "assistant", reply);
        hint.textContent = result.grounding === "supabase_rag" ? "Answered using Razorpay knowledge context." : "Answered using AIRazor qualification mode.";
        speak(reply, root);
      } catch (error) {
        const fallback = "I can continue the conversation, but the live AIRazor brain is temporarily unavailable. Try that once more.";
        addMessage(transcript, "assistant", fallback);
        hint.textContent = "Backend temporarily unavailable.";
        speak(fallback, root);
      } finally {
        send.disabled = false;
        mic.disabled = false;
        talk.disabled = false;
        input.focus();
      }
    }

    send.addEventListener("click", () => submit());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); submit(); }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        listening = true;
        mic.classList.add("listening");
        talk.classList.add("listening");
        talk.textContent = "Listening… tap to stop";
        hint.textContent = "Listening now. Speak naturally.";
      };
      recognition.onresult = (event) => {
        let transcriptText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) transcriptText += event.results[i][0].transcript;
        input.value = transcriptText.trim();
      };
      recognition.onend = () => {
        listening = false;
        mic.classList.remove("listening");
        talk.classList.remove("listening");
        talk.textContent = "Tap to speak to AIRazor";
        const captured = (input.value || "").trim();
        if (captured) submit(captured);
        else hint.textContent = "I didn't catch that. Tap the button and try again.";
      };
      recognition.onerror = (event) => {
        listening = false;
        mic.classList.remove("listening");
        talk.classList.remove("listening");
        talk.textContent = "Tap to speak to AIRazor";
        const reason = event.error === "not-allowed" ? "Microphone permission is blocked. Allow microphone access in the browser address bar and try again." : "I couldn't start voice recognition. You can still type your question.";
        hint.textContent = reason;
      };

      async function toggleMic() {
        try {
          if (listening) { recognition.stop(); return; }
          if (navigator.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
          }
          recognition.start();
        } catch (error) {
          hint.textContent = "Microphone access is blocked. Click the lock/site-controls icon near the URL, allow Microphone, then try again.";
        }
      }
      mic.addEventListener("click", toggleMic);
      talk.addEventListener("click", toggleMic);
    } else {
      mic.disabled = true;
      talk.disabled = true;
      talk.textContent = "Voice input unavailable in this browser";
      hint.textContent = "This browser doesn't expose speech recognition. Type your question below; AIRazor will still speak the response.";
    }
  }

  function scan() {
    buildControls(document.getElementById("airazor3DPresenter"));
  }

  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();