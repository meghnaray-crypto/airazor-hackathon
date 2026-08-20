(() => {
  const PAYMENT_URL = "https://script.google.com/a/macros/razorpay.com/s/AKfycbylM5xNIO0V4WavpYHrdqkAC_vVs-anZ3iq_pxm6FxEpySzK5OuFfsYbwKPPioHTSk2/exec";

  const generateButton = document.getElementById("generatePaymentButton");
  const paymentCard = document.getElementById("paymentCard");
  const paymentLinkText = document.getElementById("paymentLinkText");
  const copyButton = document.getElementById("copyPaymentButton");

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

  function renderPayment() {
    markJourneyPayment();
    paymentLinkText.textContent = PAYMENT_URL;
    paymentCard.classList.remove("hidden");

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
    disclaimer.textContent = "AIRazor is using the approved Razorpay internal payment URL supplied for this demo. There is no payment-status API connected yet, so the confirmation button below is a demo acknowledgement rather than automated verification.";
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
      <h4>Payment acknowledged — next step ready</h4>
      <p><strong>Your RazorpayX setup can now move to activation.</strong></p>
      <p>Once the real payment callback is connected, AIRazor can automatically confirm payment and unlock the relevant dashboard/onboarding flow.</p>
      <div class="activation-grid">
        <div class="activation-chip"><strong>Dashboard</strong><br>Ready for activation flow</div>
        <div class="activation-chip"><strong>Support</strong><br>RM / product POC handoff available</div>
      </div>
      <div class="airazor-payment-actions">
        <button class="primary-button full-width" id="requestRmButton" type="button">Connect me to a Razorpay RM / POC</button>
      </div>
    `;
    paymentCard.appendChild(activation);

    const status = document.getElementById("conversationStatus");
    if (status) status.textContent = "Payment acknowledged · activation next";

    document.getElementById("requestRmButton")?.addEventListener("click", () => {
      const chatInput = document.getElementById("messageInput");
      if (chatInput) {
        chatInput.value = "I have completed payment. Please connect me to a Razorpay RM or product POC for any activation questions.";
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
