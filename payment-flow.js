(() => {
  const PAYMENT_URL = "https://script.google.com/a/macros/razorpay.com/s/AKfycbylM5xNIO0V4WavpYHrdqkAC_vVs-anZ3iq_pxm6FxEpySzK5OuFfsYbwKPPioHTSk2/exec";

  const generateButton = document.getElementById("generatePaymentButton");
  const paymentCard = document.getElementById("paymentCard");
  const paymentLinkText = document.getElementById("paymentLinkText");
  const copyButton = document.getElementById("copyPaymentButton");
  const chatWindow = document.getElementById("chatWindow");

  if (!generateButton || !paymentCard || !paymentLinkText) return;

  const style = document.createElement("style");
  style.textContent = `
    .airazor-payment-actions{display:grid;gap:10px;margin-top:14px}
    .airazor-payment-actions a{text-decoration:none;text-align:center}
    .activation-card{margin-top:16px;padding:18px;border:1px solid #b9dfcf;background:#f3fbf7;border-radius:14px}
    .activation-card h4{margin:0 0 8px;font-size:16px;color:#153c2f}
    .activation-card p{margin:4px 0;color:#35574c;line-height:1.45}
    .activation-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .activation-chip{padding:10px 12px;border-radius:10px;background:#fff;border:1px solid #d7ebe3;font-size:13px;color:#29483e}
    .payment-disclaimer{font-size:12px;color:#718096;margin-top:10px;line-height:1.4}
    .chat-payment-card{margin:10px 18px 18px 58px;padding:16px;border:1px solid #c9dafc;background:#f7faff;border-radius:14px;box-shadow:0 8px 22px rgba(31,87,184,.08)}
    .chat-payment-card strong{display:block;color:#13294b;margin-bottom:6px;font-size:15px}
    .chat-payment-card p{margin:0 0 12px;color:#51627f;line-height:1.5;font-size:13px}
    .chat-payment-card a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;background:#2f6fed;color:#fff;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px}
  `;
  document.head.appendChild(style);

  function markJourneyPayment() {
    document.querySelectorAll(".journey-step").forEach((step) => {
      const position = Number(step.dataset.stage);
      step.classList.toggle("active", position === 5);
      step.classList.toggle("done", position < 5);
    });
    const status = document.getElementById("conversationStatus");
    if (status) status.textContent = "Payment link ready";
  }

  function sendPaymentIntoChat() {
    if (!chatWindow) return;
    chatWindow.querySelector("#airazorChatPaymentCard")?.remove();
    const card = document.createElement("div");
    card.id = "airazorChatPaymentCard";
    card.className = "chat-payment-card";
    card.innerHTML = `
      <strong>You’re eligible to move to payment</strong>
      <p>I’ve prepared the approved Razorpay payment step for this setup. Complete payment in the secure link below, then come back here to continue to activation.</p>
      <a href="${PAYMENT_URL}" target="_blank" rel="noopener noreferrer">Pay now</a>
    `;
    chatWindow.appendChild(card);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function renderPayment() {
    markJourneyPayment();
    paymentLinkText.textContent = PAYMENT_URL;
    paymentCard.classList.remove("hidden");
    sendPaymentIntoChat();

    const oldActions = paymentCard.querySelector(".airazor-payment-actions");
    if (oldActions) oldActions.remove();
    const oldActivation = paymentCard.querySelector(".activation-card");
    if (oldActivation) oldActivation.remove();

    const actions = document.createElement("div");
    actions.className = "airazor-payment-actions";
    actions.innerHTML = `
      <a class="primary-button full-width" href="${PAYMENT_URL}" target="_blank" rel="noopener noreferrer">Open secure payment link</a>
      <button class="secondary-button full-width" id="paymentCompletedButton" type="button">I’ve completed payment</button>
    `;
    paymentCard.appendChild(actions);

    const disclaimer = document.createElement("p");
    disclaimer.className = "payment-disclaimer";
    disclaimer.textContent = "The payment URL is the approved Razorpay internal link supplied for this demo. There is no payment-status callback connected yet, so completion is merchant-confirmed in the prototype.";
    actions.appendChild(disclaimer);

    document.getElementById("paymentCompletedButton")?.addEventListener("click", showActivation);
    paymentCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showActivation() {
    const existing = paymentCard.querySelector(".activation-card");
    if (existing) existing.remove();

    const activation = document.createElement("div");
    activation.className = "activation-card";
    activation.innerHTML = `
      <h4>Payment acknowledged — activation is next</h4>
      <p><strong>Your RazorpayX setup can now move to activation.</strong></p>
      <p>The relevant dashboard/onboarding flow is now the next step. AIRazor can also connect you with an RM or product POC if you have questions.</p>
      <div class="activation-grid">
        <div class="activation-chip"><strong>Dashboard</strong><br>Activation flow ready</div>
        <div class="activation-chip"><strong>Support</strong><br>RM / product POC available</div>
      </div>
      <div class="airazor-payment-actions">
        <button class="primary-button full-width" id="requestRmButton" type="button">Connect me to a Razorpay RM / POC</button>
      </div>
    `;
    paymentCard.appendChild(activation);

    const status = document.getElementById("conversationStatus");
    if (status) status.textContent = "Payment acknowledged · activation next";

    if (chatWindow) {
      const message = document.createElement("div");
      message.className = "chat-payment-card";
      message.innerHTML = `<strong>Payment acknowledged</strong><p>Your RazorpayX setup can now move to activation. The dashboard/onboarding flow is the next step, and I can connect you to an RM or product POC for any remaining questions.</p>`;
      chatWindow.appendChild(message);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    document.getElementById("requestRmButton")?.addEventListener("click", () => {
      const chatInput = document.getElementById("messageInput");
      if (chatInput) {
        chatInput.value = "I have completed payment. Please connect me to a Razorpay RM or product POC for activation questions.";
        chatInput.focus();
      }
    });
  }

  generateButton.addEventListener("click", (event) => {
    if (generateButton.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderPayment();
  }, true);

  if (copyButton) {
    copyButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await navigator.clipboard.writeText(PAYMENT_URL);
        copyButton.textContent = "Copied";
        setTimeout(() => { copyButton.textContent = "Copy"; }, 1200);
      } catch (_) {
        window.prompt("Copy payment link", PAYMENT_URL);
      }
    }, true);
  }
})();