(() => {
  const DATA = window.AIRAZOR_DATA;

  const DEFAULT_PROFILE = {
    "Business model": "",
    "Requirement": "",
    "Secondary need": "",
    "Recipients": "",
    "Scale": "",
    "Frequency": "",
    "Existing setup": "",
    "Serviceability": "Qualification not started"
  };

  const state = {
    sessionId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    stage: 0,
    flow: null,
    flowStep: 0,
    messages: [],
    profile: { ...DEFAULT_PROFILE },
    missing: [],
    recommendation: null,
    selectedPlan: null,
    commercials: [],
    checklist: [],
    checklistComplete: new Set(),
    paymentLink: null,
    lastIntent: null,
    detectedNeeds: [],
    retrievedContext: [],
    closed: false
  };

  const els = {
    chatWindow: document.getElementById("chatWindow"),
    chatForm: document.getElementById("chatForm"),
    messageInput: document.getElementById("messageInput"),
    quickPrompts: document.getElementById("quickPrompts"),
    sendButton: document.getElementById("sendButton"),
    resetButton: document.getElementById("resetButton"),
    conversationStatus: document.getElementById("conversationStatus"),
    profileStatus: document.getElementById("profileStatus"),
    merchantProfile: document.getElementById("merchantProfile"),
    missingInfo: document.getElementById("missingInfo"),
    recommendationCard: document.getElementById("recommendationCard"),
    recommendationProduct: document.getElementById("recommendationProduct"),
    recommendationRoute: document.getElementById("recommendationRoute"),
    recommendationConfidence: document.getElementById("recommendationConfidence"),
    recommendationReason: document.getElementById("recommendationReason"),
    recommendationWarnings: document.getElementById("recommendationWarnings"),
    recommendationActions: document.getElementById("recommendationActions"),
    plansCard: document.getElementById("plansCard"),
    planGrid: document.getElementById("planGrid"),
    commercialsCard: document.getElementById("commercialsCard"),
    commercialTitle: document.getElementById("commercialTitle"),
    commercialSummary: document.getElementById("commercialSummary"),
    continueDetailsButton: document.getElementById("continueDetailsButton"),
    detailsCard: document.getElementById("detailsCard"),
    checklistProgress: document.getElementById("checklistProgress"),
    onboardingChecklist: document.getElementById("onboardingChecklist"),
    fillDemoDetailsButton: document.getElementById("fillDemoDetailsButton"),
    generatePaymentButton: document.getElementById("generatePaymentButton"),
    paymentCard: document.getElementById("paymentCard"),
    paymentLinkText: document.getElementById("paymentLinkText"),
    copyPaymentButton: document.getElementById("copyPaymentButton"),
    debugToggle: document.getElementById("debugToggle"),
    closeDebugButton: document.getElementById("closeDebugButton"),
    debugPanel: document.getElementById("debugPanel"),
    debugState: document.getElementById("debugState")
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function addMessage(role, content, actions = []) {
    state.messages.push({ role, content, actions });
    renderMessages();
  }

  function renderMessages() {
    els.chatWindow.innerHTML = "";

    state.messages.forEach((message) => {
      const wrapper = document.createElement("div");
      wrapper.className = `message ${message.role}`;

      if (message.role === "assistant") {
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = "AI";
        wrapper.appendChild(avatar);
      }

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = escapeHtml(message.content).replaceAll("\n", "<br>");
      wrapper.appendChild(bubble);
      els.chatWindow.appendChild(wrapper);

      if (message.actions?.length) {
        const actionWrap = document.createElement("div");
        actionWrap.className = "inline-actions";

        message.actions.forEach((action) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "inline-action";
          button.textContent = action.label;
          button.addEventListener("click", action.handler);
          actionWrap.appendChild(button);
        });

        els.chatWindow.appendChild(actionWrap);
      }
    });

    els.chatWindow.scrollTop = els.chatWindow.scrollHeight;
  }

  function setStage(index) {
    state.stage = Math.max(0, Math.min(5, index));

    document.querySelectorAll(".journey-step").forEach((step) => {
      const position = Number(step.dataset.stage);
      step.classList.toggle("active", position === state.stage);
      step.classList.toggle("done", position < state.stage);
    });

    const statusText = [
      "Understanding the requirement",
      "Qualification in progress",
      "Recommendation ready",
      "Commercials under review",
      "Collecting required details",
      "Payment link ready"
    ];

    els.conversationStatus.textContent = state.closed
      ? "Conversation complete"
      : statusText[state.stage];

    updateDebug();
  }

  function updateProfile(updates) {
    state.profile = { ...state.profile, ...updates };
    renderProfile();
  }

  function renderProfile() {
    els.merchantProfile.innerHTML = "";

    Object.entries(state.profile).forEach(([label, value]) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");

      dt.textContent = label;
      dd.textContent = value || "Not captured";
      if (!value) dd.classList.add("empty");

      wrap.append(dt, dd);
      els.merchantProfile.appendChild(wrap);
    });

    const filled = Object.values(state.profile).filter(
      (value) => value && value !== "Qualification not started"
    ).length;

    els.profileStatus.textContent = filled >= 4 ? "Structured" : "Building";

    if (state.missing.length) {
      els.missingInfo.classList.remove("hidden");
      els.missingInfo.innerHTML =
        `<strong>Still needed:</strong> ${state.missing.map(escapeHtml).join(", ")}`;
    } else {
      els.missingInfo.classList.add("hidden");
    }

    updateDebug();
  }

  function showRecommendation(data) {
    state.recommendation = data;
    els.recommendationCard.classList.remove("hidden");
    els.recommendationProduct.textContent = data.product;
    els.recommendationRoute.textContent = data.route;
    els.recommendationConfidence.textContent = `${data.confidence} confidence`;
    els.recommendationReason.textContent = data.reason;
    els.recommendationWarnings.innerHTML = "";
    els.recommendationActions.innerHTML = "";

    (data.warnings || []).forEach((warning) => {
      const item = document.createElement("div");
      item.className = "warning-item";
      item.textContent = warning;
      els.recommendationWarnings.appendChild(item);
    });

    (data.actions || []).forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.primary ? "primary-button" : "secondary-button";
      button.textContent = action.label;
      button.addEventListener("click", action.handler);
      els.recommendationActions.appendChild(button);
    });

    updateDebug();
  }

  function showPlans() {
    setStage(3);
    els.plansCard.classList.remove("hidden");
    els.planGrid.innerHTML = "";

    DATA.plans.forEach((plan) => {
      const card = document.createElement("article");
      card.className = `plan ${state.selectedPlan?.id === plan.id ? "selected" : ""}`;

      card.innerHTML = `
        <div class="plan-topline">
          <div>
            <h4>${escapeHtml(plan.name)}</h4>
            <p class="plan-billing">${escapeHtml(plan.billing)}</p>
          </div>
          <div class="plan-price">${escapeHtml(plan.price)}</div>
        </div>
        <ul class="feature-list">
          ${plan.features.slice(0, 5).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
        </ul>
      `;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "plan-select";
      button.textContent = state.selectedPlan?.id === plan.id ? "Selected" : `Select ${plan.name}`;
      button.addEventListener("click", () => selectPlan(plan));
      card.appendChild(button);
      els.planGrid.appendChild(card);
    });

    els.plansCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function selectPlan(plan) {
    state.selectedPlan = plan;
    showPlans();

    if (state.flow === "vendorPayouts") {
      state.commercials = [
        ["Recommended setup", "RazorpayX Payouts + Current Account"],
        ["Selected plan", `${plan.name} — ${plan.price}`],
        ["Bank minimum balance", "Approximately ₹50,000; subject to banking partner review"],
        ["Transaction pricing", "As per approved payout pricing matrix"],
        ["GST", "Applicable"]
      ];
    } else if (state.flow === "escrow") {
      state.commercials = [
        ["Recommended setup", "Escrow Account + RazorpayX"],
        ["Selected plan", `${plan.name} — ${plan.price}`],
        ["Bank charges", "Estimated ₹25,000–₹1,00,000 annually; final bank review required"],
        ["Trustee charges", "Example: ₹75,000 setup + ₹10,000 monthly maintenance"],
        ["Transaction pricing", "As per approved payout pricing matrix"],
        ["GST", "Applicable"]
      ];
    } else {
      state.commercials = [
        ["Selected plan", `${plan.name} — ${plan.price}`],
        ["Transaction pricing", "As per approved pricing matrix"],
        ["GST", "Applicable"]
      ];
    }

    showCommercials(`${plan.name} commercial`);
    addMessage(
      "assistant",
      `The ${plan.name} plan is selected for this demo. I have added the applicable account and commercial structure on the right. Review it and continue to the required details.`
    );
  }

  function showCommercials(title) {
    setStage(3);
    els.commercialsCard.classList.remove("hidden");
    els.commercialTitle.textContent = title;
    els.commercialSummary.innerHTML = "";

    state.commercials.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "commercial-row";
      row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
      els.commercialSummary.appendChild(row);
    });

    updateDebug();
  }

  function showDetails(checklistKey) {
    setStage(4);
    state.checklist = DATA.checklists[checklistKey] || [];
    state.checklistComplete.clear();
    els.detailsCard.classList.remove("hidden");
    renderChecklist();
    els.detailsCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

    addMessage(
      "assistant",
      "Before the payment link is generated, I need the required business and onboarding information. The checklist on the right will fill as the merchant shares each detail."
    );
  }

  function renderChecklist() {
    els.onboardingChecklist.innerHTML = "";

    state.checklist.forEach((item, index) => {
      const complete = state.checklistComplete.has(index);
      const row = document.createElement("div");
      row.className = `check-item ${complete ? "complete" : ""}`;
      row.innerHTML = `
        <span class="check-icon">${complete ? "✓" : ""}</span>
        <span>${escapeHtml(item)}</span>
      `;
      els.onboardingChecklist.appendChild(row);
    });

    els.checklistProgress.textContent =
      `${state.checklistComplete.size} of ${state.checklist.length}`;
    els.generatePaymentButton.disabled =
      state.checklist.length === 0 || state.checklistComplete.size !== state.checklist.length;

    updateDebug();
  }

  function completeDemoChecklist() {
    state.checklist.forEach((_, index) => state.checklistComplete.add(index));
    renderChecklist();

    addMessage(
      "assistant",
      "All required fields are complete for the demo. The payment-link action is now available."
    );
  }

  function generatePaymentLink() {
    if (state.checklistComplete.size !== state.checklist.length) return;

    setStage(5);
    const suffix = Math.random().toString(36).slice(2, 10);
    state.paymentLink = `https://example.com/airazor-demo-payment/${suffix}`;

    els.paymentLinkText.textContent = state.paymentLink;
    els.paymentCard.classList.remove("hidden");
    els.paymentCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

    addMessage(
      "assistant",
      "The demo payment link is ready. In production, AIRazor will call the approved internal payment-link service after validating the selected commercial. Once payment is confirmed, the onboarding workflow can begin."
    );

    updateDebug();
  }

  function detectNeeds(text) {
    const value = text.toLowerCase();
    const needs = [];

    if (/\b(vendor|supplier|payout|contractor|disburs)/i.test(value)) {
      needs.push({ type: "vendorPayouts", label: "Vendor / supplier payouts" });
    }
    if (/\b(accept payments|collect payments|customer payments|payment gateway|checkout)\b/i.test(value)) {
      needs.push({ type: "paymentGateway", label: "Customer payment collection" });
    }
    if (/\b(employee|employees|salary|payroll)\b/i.test(value)) {
      needs.push({ type: "payroll", label: "Employee / payroll requirement" });
    }
    if (/\b(current account|business bank account|open an account)\b/i.test(value)) {
      needs.push({ type: "currentAccount", label: "Business Current Account" });
    }
    if (
      /\b(escrow|hold funds|hold money)\b/i.test(value) ||
      (/\bmarketplace\b/i.test(value) && /\b(seller|vendor|service provider)\b/i.test(value))
    ) {
      needs.push({ type: "escrow", label: "Marketplace / escrow flow" });
    }

    return needs;
  }

  function isTopicSwitch(text) {
    return /\b(leave that|leave that for|ignore that|new requirement|different requirement|instead|for a sec|for now)\b/i.test(text);
  }

  function asksForUnderstanding(text) {
    return /\b(did you understand|do you understand|what did you understand|summari[sz]e|recap|my requirement fully|understood my requirement)\b/i.test(text);
  }

  function asksToProceed(text) {
    return /\b(proceed|go ahead|move forward|ready to pay|ready to proceed|let'?s do it|yes.*proceed|generate.*link)\b/i.test(text);
  }

  function isClosingMessage(text) {
    return /\b(thanks|thank you|that'?s all|thats all|nothing else|done|perfect|sounds good)\b/i.test(text);
  }

  function classifyIntent(text) {
    const needs = detectNeeds(text);
    if (needs.find((n) => n.type === "escrow")) return "escrow";
    if (needs.find((n) => n.type === "currentAccount")) return "currentAccount";
    if (needs.find((n) => n.type === "vendorPayouts")) return "vendorPayouts";
    if (needs.find((n) => n.type === "paymentGateway")) return "paymentGateway";
    if (needs.find((n) => n.type === "payroll")) return "payroll";
    return "unknown";
  }

  function summarizeUnderstanding() {
    const lines = [];

    if (state.detectedNeeds.length > 1) {
      lines.push("Yes — I understood that you have multiple requirements, not just one:");
      state.detectedNeeds.forEach((need, index) => {
        lines.push(`${index + 1}. ${need.label}`);
      });
    } else if (state.detectedNeeds.length === 1) {
      lines.push(`Yes — I understand the primary requirement as ${state.detectedNeeds[0].label}.`);
    } else if (state.profile["Requirement"]) {
      lines.push(`Yes — I understand the primary requirement as ${state.profile["Requirement"]}.`);
    } else {
      lines.push("I understand part of the requirement, but I do not have enough information to make a final recommendation yet.");
    }

    if (state.profile["Scale"]) lines.push(`Scale captured: ${state.profile["Scale"]}.`);
    if (state.profile["Frequency"] && state.profile["Frequency"] !== "Not specified") {
      lines.push(`Frequency captured: ${state.profile["Frequency"]}.`);
    }
    if (state.profile["Business model"]) lines.push(`Business model: ${state.profile["Business model"]}.`);

    if (state.missing.length) {
      lines.push(`Before I can close the recommendation, I still need: ${state.missing.join(", ")}.`);
    }

    if (state.detectedNeeds.length > 1) {
      lines.push("These may map to different Razorpay products, so I should not collapse them into one recommendation. Choose which requirement you want to solve first and I’ll take that journey to completion.");
    } else if (state.recommendation) {
      lines.push(`Current recommendation: ${state.recommendation.product}. If you want to proceed, I can take you to plans/commercials and then onboarding.`);
    }

    return lines.join("\n");
  }

  function handleMultiIntent(needs, text) {
    state.detectedNeeds = mergeNeeds(state.detectedNeeds, needs);

    const labels = state.detectedNeeds.map((n) => n.label);
    updateProfile({
      "Requirement": labels[0] || "",
      "Secondary need": labels.slice(1).join(" + "),
      "Scale": extractContextualScale(text) || state.profile["Scale"],
      "Serviceability": "Multiple requirements detected"
    });

    state.missing = ["priority requirement"];
    state.flow = null;
    state.flowStep = 0;
    setStage(1);

    const actions = state.detectedNeeds.map((need) => ({
      label: `Solve ${need.label.toLowerCase()} first`,
      handler: () => selectPriorityNeed(need)
    }));

    addMessage(
      "assistant",
      `I picked up more than one requirement here:\n${labels.map((label, index) => `${index + 1}. ${label}`).join("\n")}\n\nThese should not be forced into one product recommendation. Choose the one you want to solve first; I’ll keep the others in context for later.`,
      actions
    );
  }

  function selectPriorityNeed(need) {
    state.flow = need.type;
    state.flowStep = 0;
    state.missing = [];

    updateProfile({
      "Requirement": need.label,
      "Secondary need": state.detectedNeeds
        .filter((item) => item.type !== need.type)
        .map((item) => item.label)
        .join(" + "),
      "Serviceability": "Qualification in progress"
    });

    addMessage(
      "assistant",
      `Got it. We’ll solve ${need.label.toLowerCase()} first. I’ll keep the other requirements noted and come back to them after this journey is complete.`
    );

    beginSelectedFlow();
  }

  function beginSelectedFlow() {
    const flow = state.flow;
    state.flowStep = 1;
    setStage(1);

    if (flow === "vendorPayouts") {
      state.missing = ["recipient relationship", "vendor count", "payout frequency", "manual / bulk / API mode"];
      updateProfile({
        "Recipients": "Vendors / suppliers",
        "Serviceability": "Qualification in progress"
      });
      addMessage("assistant", "Are these vendors or suppliers you pay for your own business expenses? Also, roughly how many payouts do you make, how often, and do you want to trigger them manually, in bulk, or through APIs?");
      return;
    }

    if (flow === "paymentGateway") {
      state.missing = ["selling channel", "payment type", "expected volume"];
      updateProfile({ "Recipients": "Customers", "Serviceability": "Qualification in progress" });
      addMessage("assistant", "For payment acceptance, are customers paying through a website or app, and are these one-time payments or recurring collections?");
      return;
    }

    if (flow === "payroll") {
      state.missing = ["employee count", "payroll requirement", "existing payroll setup"];
      updateProfile({ "Recipients": "Employees", "Serviceability": "Needs product qualification" });
      addMessage("assistant", "For the employee requirement, how many employees are you planning for, and are you looking for salary processing, payroll management, or only employee payouts?");
      return;
    }

    if (flow === "currentAccount") {
      state.missing = ["entity type", "business model"];
      addMessage("assistant", "For the Current Account route, what is the entity type and what does the business do?");
      return;
    }

    if (flow === "escrow") {
      state.missing = ["platform status", "Payment Gateway status", "vendor agreements", "customer invoices"];
      updateProfile({ "Business model": "Marketplace / platform", "Recipients": "Sellers / service providers" });
      addMessage("assistant", "For the Escrow route, is the platform already live, is Payment Gateway integrated, and do you have signed vendor agreements and customer tax invoices?");
    }
  }

  function mergeNeeds(existing, incoming) {
    const map = new Map();
    [...existing, ...incoming].forEach((need) => map.set(need.type, need));
    return [...map.values()];
  }

  function extractContextualScale(text) {
    const lower = text.toLowerCase();
    const patterns = [
      { regex: /(\d[\d,]*)\s+(vendors?|suppliers?)/i, label: "vendors" },
      { regex: /(\d[\d,]*)\s+(employees?|staff)/i, label: "employees" },
      { regex: /(\d[\d,]*)\s+(sellers?|merchants?)/i, label: "sellers" },
      { regex: /(\d[\d,]*)\s+(payouts?)/i, label: "payouts" }
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) return `${match[1]} ${pattern.label}`;
    }
    return "";
  }

  async function submitMessage(text) {
    const clean = text.trim();
    if (!clean) return;

    els.quickPrompts.classList.add("hidden");
    addMessage("user", clean);
    els.messageInput.value = "";
    autoResizeTextarea();
    els.sendButton.disabled = true;

    await sleep(360);
    processMockConversation(clean);
    els.sendButton.disabled = false;
    els.messageInput.focus();
  }

  function processMockConversation(text) {
    // 1. Always handle meta questions first.
    if (asksForUnderstanding(text)) {
      addMessage("assistant", summarizeUnderstanding());
      return;
    }

    if (isClosingMessage(text)) {
      state.closed = true;
      els.conversationStatus.textContent = "Conversation complete";
      addMessage(
        "assistant",
        state.paymentLink
          ? `You're all set for this journey. The payment link is ready, and after payment confirmation the next step is onboarding. ${state.detectedNeeds.length > 1 ? "I also have your other requirements noted, so we can take those up next without starting over." : ""}`.trim()
          : state.recommendation
            ? `Got it. For this requirement, the current recommendation is ${state.recommendation.product}. ${state.detectedNeeds.length > 1 ? "I also have the other requirements noted separately." : ""} When you are ready, we can continue with plans/commercials, required details and payment.`.trim()
            : "Got it. I have kept the requirements from this conversation in the current session. We can continue from here whenever you're ready."
      );
      updateDebug();
      return;
    }

    if (asksToProceed(text) && state.recommendation) {
      if (state.flow === "vendorPayouts" || state.flow === "escrow") {
        addMessage(
          "assistant",
          "Yes. The next step is to choose the applicable RazorpayX plan before I can confirm the commercial and collect onboarding details."
        );
        showPlans();
      } else if (state.flow === "currentAccount") {
        state.commercials = [
          ["Product", "Vanilla Current Account"],
          ["One-time charge", "₹1,000 + applicable GST"],
          ["Subscription", "Not applicable for the vanilla account-opening flow"],
          ["Approval", "Subject to bank and internal checks"]
        ];
        showCommercials("Vanilla Current Account");
        addMessage(
          "assistant",
          "We can proceed. I have opened the commercial summary. After you review it, continue to the required details and then the payment-link step."
        );
      } else if (state.flow === "paymentGateway") {
        showDetails("paymentGateway");
      }
      return;
    }

    // 2. Detect changes and multiple requirements on every turn.
    const needs = detectNeeds(text);
    const switching = isTopicSwitch(text);

    if (switching && needs.length) {
      state.flow = null;
      state.flowStep = 0;
      state.recommendation = null;
      els.recommendationCard.classList.add("hidden");
      els.plansCard.classList.add("hidden");
      els.commercialsCard.classList.add("hidden");
      els.detailsCard.classList.add("hidden");
      els.paymentCard.classList.add("hidden");
      state.detectedNeeds = [];
    }

    if (needs.length > 1) {
      handleMultiIntent(needs, text);
      return;
    }

    if (needs.length === 1) {
      state.detectedNeeds = mergeNeeds(state.detectedNeeds, needs);
      if (!state.flow || switching || state.flow === "unknown") {
        state.flow = needs[0].type;
        state.flowStep = 0;
      }
    }

    if (!state.flow) {
      state.flow = classifyIntent(text);
    }

    // 3. Initial qualification by flow.
    if (state.flowStep === 0) {
      state.lastIntent = state.flow;
      state.flowStep = 1;

      if (state.flow === "currentAccount") {
        setStage(1);
        state.missing = ["entity type", "business model"];
        updateProfile({
          "Requirement": "Open a business current account",
          "Secondary need": "",
          "Serviceability": "Qualification in progress"
        });
        addMessage(
          "assistant",
          "I can help with the Current Account route. To confirm the right setup, what is the entity type and what does the business do?"
        );
        return;
      }

      if (state.flow === "vendorPayouts") {
        setStage(1);
        state.missing = ["recipient relationship", "vendor count", "payout frequency", "manual / bulk / API mode"];
        updateProfile({
          "Requirement": "Vendor or supplier payouts",
          "Secondary need": "",
          "Recipients": "Vendors / suppliers",
          "Scale": extractContextualScale(text),
          "Serviceability": "Qualification in progress"
        });
        addMessage(
          "assistant",
          "Understood. Are these vendors or suppliers you pay for your own business expenses? Also, roughly how many payouts do you make, how often, and do you want to trigger them manually, in bulk, or through APIs?"
        );
        return;
      }

      if (state.flow === "escrow") {
        setStage(1);
        state.missing = [
          "platform status",
          "Payment Gateway status",
          "vendor agreements",
          "customer invoices"
        ];
        updateProfile({
          "Business model": "Marketplace / platform",
          "Requirement": "Controlled collection and seller release",
          "Secondary need": "",
          "Recipients": "Sellers / service providers",
          "Serviceability": "Qualification in progress"
        });
        addMessage(
          "assistant",
          "This may require an Escrow setup. Is the platform already live, is Payment Gateway integrated, and do you have signed vendor agreements and customer tax invoices?"
        );
        return;
      }

      if (state.flow === "paymentGateway") {
        setStage(1);
        state.missing = ["selling channel", "payment type", "expected volume"];
        updateProfile({
          "Requirement": "Accept customer payments",
          "Secondary need": "",
          "Recipients": "Customers",
          "Serviceability": "Qualification in progress"
        });
        addMessage(
          "assistant",
          "I can help with payment acceptance. Are customers paying on a website or app, and are these one-time payments or recurring collections?"
        );
        return;
      }

      if (state.flow === "payroll") {
        setStage(1);
        state.missing = ["employee count", "payroll requirement", "existing payroll setup"];
        updateProfile({
          "Requirement": "Employee / payroll requirement",
          "Secondary need": "",
          "Recipients": "Employees",
          "Scale": extractContextualScale(text),
          "Serviceability": "Needs product qualification"
        });
        addMessage(
          "assistant",
          "I picked up an employee or payroll requirement. How many employees are you planning for, and are you looking for salary processing, payroll management, or only employee payouts?"
        );
        return;
      }

      setStage(1);
      state.missing = ["collection or payout requirement", "business model"];
      addMessage(
        "assistant",
        "I need one more piece of context before I recommend anything. Are you looking to collect customer payments, pay vendors or employees, open a business account, or manage a marketplace fund flow?"
      );
      state.flow = null;
      return;
    }

    // 4. Qualification response.
    if (state.flowStep === 1) {
      state.flowStep = 2;
      state.missing = [];
      setStage(2);

      if (state.flow === "currentAccount") {
        updateProfile({
          "Business model": inferBusinessModel(text),
          "Scale": extractContextualScale(text),
          "Serviceability": "Initial fit identified"
        });

        showRecommendation({
          product: "Vanilla Current Account",
          route: "Direct Current Account opening",
          confidence: "High",
          reason:
            "The primary requirement is a business Current Account rather than a payout or marketplace setup.",
          warnings: [
            "Final serviceability and banking-partner approval are still required."
          ],
          actions: [
            {
              label: "Review commercial",
              primary: true,
              handler: () => {
                state.commercials = [
                  ["Product", "Vanilla Current Account"],
                  ["One-time charge", "₹1,000 + applicable GST"],
                  ["Subscription", "Not applicable for the vanilla account-opening flow"],
                  ["Approval", "Subject to bank and internal checks"]
                ];
                showCommercials("Vanilla Current Account");
                addMessage(
                  "assistant",
                  "The Vanilla Current Account commercial is ₹1,000 plus applicable GST. Review the commercial summary and continue to the required details."
                );
              }
            }
          ]
        });

        addMessage(
          "assistant",
          "This looks like a Vanilla Current Account flow. The sample one-time charge is ₹1,000 plus applicable GST, subject to the applicable checks. If you'd like to proceed, I can open the commercial and onboarding steps."
        );
        return;
      }

      if (state.flow === "vendorPayouts") {
        updateProfile({
          "Business model": inferBusinessModel(text),
          "Scale": extractContextualScale(text) || state.profile["Scale"],
          "Frequency": inferFrequency(text),
          "Existing setup": inferAutomationMode(text),
          "Serviceability": "Current Account route under qualification"
        });

        showRecommendation({
          product: "RazorpayX Payouts",
          route: "Current Account + RazorpayX subscription",
          confidence: "High",
          reason:
            "The merchant needs recurring vendor payouts and the plan should be selected based on dashboard, bulk or API requirements.",
          warnings: [
            "Current Account opening and banking-partner approval are required.",
            "Bank minimum balance and commercials must be retrieved from the latest approved record."
          ],
          actions: [
            {
              label: "Compare plans",
              primary: true,
              handler: showPlans
            }
          ]
        });

        addMessage(
          "assistant",
          `I understand the payout requirement. ${state.profile["Existing setup"] ? `You indicated ${state.profile["Existing setup"].toLowerCase()}. ` : ""}RazorpayX Payouts is the closest fit, with a Current Account route and a plan selected based on the payout workflow. If you also have another requirement such as customer collections or payroll, I can map that separately rather than mixing it into this recommendation.`
        );
        return;
      }

      if (state.flow === "escrow") {
        const ready = !/\b(no|not yet|isn't|is not)\b/i.test(text);

        updateProfile({
          "Existing setup": ready
            ? "Platform appears live with required readiness"
            : "One or more readiness requirements are missing",
          "Serviceability": ready ? "Escrow review can proceed" : "Not ready for commercial confirmation"
        });

        showRecommendation({
          product: "Escrow Account + RazorpayX",
          route: "Bank + trustee + RazorpayX subscription",
          confidence: ready ? "Medium" : "Low",
          reason:
            "The marketplace holds or controls customer funds before releasing them to sellers or service providers.",
          warnings: ready
            ? [
                "Final bank and trustee review is required before pricing is confirmed.",
                "Commercials vary by approved bank/trustee structure."
              ]
            : [
                "The platform should be live with Payment Gateway integrated.",
                "Vendor agreements and customer tax invoices are required for review."
              ],
          actions: ready
            ? [
                {
                  label: "Compare RazorpayX plans",
                  primary: true,
                  handler: showPlans
                }
              ]
            : []
        });

        addMessage(
          "assistant",
          ready
            ? "The use case appears suitable for an Escrow review. The final structure includes bank, trustee and RazorpayX plan components, all subject to approval. If you want to proceed, we can review the plan and commercials next."
            : "The Escrow route cannot move to commercials yet. The platform readiness, Payment Gateway integration, vendor agreements and customer-invoice flow need to be completed or confirmed."
        );
        return;
      }

      if (state.flow === "paymentGateway") {
        updateProfile({
          "Business model": inferBusinessModel(text),
          "Existing setup": inferCollectionMode(text),
          "Serviceability": "Initial Payment Gateway fit identified"
        });

        showRecommendation({
          product: "Payment Gateway",
          route: "Online payment collection",
          confidence: "High",
          reason:
            "The merchant needs to accept customer payments through a website, application or related digital flow.",
          warnings: [
            "Final product configuration, pricing and onboarding requirements must come from the approved product record."
          ],
          actions: [
            {
              label: "Continue to requirements",
              primary: true,
              handler: () => showDetails("paymentGateway")
            }
          ]
        });

        addMessage(
          "assistant",
          "Payment Gateway is the closest fit for this collection requirement. I have captured it separately from any payout or payroll need. If you'd like, we can continue with the onboarding requirements."
        );
        return;
      }

      if (state.flow === "payroll") {
        updateProfile({
          "Scale": extractContextualScale(text) || state.profile["Scale"],
          "Existing setup": text.length < 100 ? text : "",
          "Serviceability": "Needs approved payroll product rules"
        });

        addMessage(
          "assistant",
          "I understand this as a payroll or employee-payment requirement. I don't have enough approved product/commercial rules in this frontend mock to make a final recommendation, so I would keep this as a separate requirement and route it to the approved payroll knowledge once the backend is connected."
        );
        state.missing = ["approved payroll product rules"];
        renderProfile();
        return;
      }
    }

    // 5. Post-recommendation conversation: never silently stop responding.
    if (state.flowStep >= 2) {
      const newNeeds = detectNeeds(text);

      if (newNeeds.length && !newNeeds.some((n) => n.type === state.flow)) {
        handleMultiIntent(newNeeds, text);
        return;
      }

      addMessage(
        "assistant",
        state.recommendation
          ? `Yes — I still have the current recommendation as ${state.recommendation.product}. ${state.missing.length ? `I still need ${state.missing.join(", ")} before the flow is complete.` : "The qualification step is complete."} You can ask me to recap, compare plans, proceed to onboarding, or switch to another requirement.`
          : "I have the current requirement in context. Tell me whether you want to continue, recap what I understood, or switch to another requirement."
      );
    }
  }

  function inferBusinessModel(text) {
    const value = text.toLowerCase();
    if (value.includes("marketplace")) return "Marketplace";
    if (value.includes("ecommerce") || value.includes("e-commerce")) return "E-commerce";
    if (value.includes("travel") || value.includes("hotel")) return "Travel / hospitality";
    if (value.includes("saas")) return "SaaS";
    if (value.includes("service")) return "Services";
    if (value.includes("retail")) return "Retail";
    return "";
  }

  function inferFrequency(text) {
    const value = text.toLowerCase();
    if (value.includes("daily")) return "Daily";
    if (value.includes("weekly")) return "Weekly";
    if (value.includes("monthly")) return "Monthly";
    if (value.includes("quarter")) return "Quarterly";
    return "Not specified";
  }

  function inferAutomationMode(text) {
    const value = text.toLowerCase();
    if (value.includes("api") || value.includes("backend")) return "API-driven payouts";
    if (value.includes("bulk")) return "Bulk payouts";
    if (value.includes("manual") || value.includes("dashboard")) return "Dashboard / manual payouts";
    return "";
  }

  function inferCollectionMode(text) {
    const value = text.toLowerCase();
    const parts = [];
    if (value.includes("website")) parts.push("Website");
    if (value.includes("app")) parts.push("App");
    if (value.includes("recurring")) parts.push("Recurring");
    if (value.includes("one-time") || value.includes("one time")) parts.push("One-time");
    return parts.join(" / ");
  }

  function resetState() {
    state.sessionId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    state.stage = 0;
    state.flow = null;
    state.flowStep = 0;
    state.messages = [];
    state.profile = { ...DEFAULT_PROFILE };
    state.missing = [];
    state.recommendation = null;
    state.selectedPlan = null;
    state.commercials = [];
    state.checklist = [];
    state.checklistComplete = new Set();
    state.paymentLink = null;
    state.lastIntent = null;
    state.detectedNeeds = [];
    state.retrievedContext = [];
    state.closed = false;

    els.quickPrompts.classList.remove("hidden");
    els.recommendationCard.classList.add("hidden");
    els.plansCard.classList.add("hidden");
    els.commercialsCard.classList.add("hidden");
    els.detailsCard.classList.add("hidden");
    els.paymentCard.classList.add("hidden");
    els.debugPanel.classList.add("hidden");
    els.planGrid.innerHTML = "";
    els.commercialSummary.innerHTML = "";
    els.onboardingChecklist.innerHTML = "";
    setStage(0);
    renderProfile();

    addMessage(
      "assistant",
      "Hi, I’m AIRazor. Tell me what you are trying to achieve, and I’ll help identify the right Razorpay product, commercial route and next step."
    );
  }

  function autoResizeTextarea() {
    els.messageInput.style.height = "auto";
    els.messageInput.style.height = `${Math.min(els.messageInput.scrollHeight, 135)}px`;
  }

  function updateDebug() {
    els.debugState.textContent = JSON.stringify(
      {
        session_id: state.sessionId,
        stage: state.stage,
        flow: state.flow,
        flow_step: state.flowStep,
        detected_needs: state.detectedNeeds,
        merchant_profile: state.profile,
        missing_fields: state.missing,
        recommendation: state.recommendation
          ? {
              product: state.recommendation.product,
              route: state.recommendation.route,
              confidence: state.recommendation.confidence
            }
          : null,
        selected_plan: state.selectedPlan,
        commercials: state.commercials,
        checklist_progress: `${state.checklistComplete.size}/${state.checklist.length}`,
        payment_link: state.paymentLink,
        conversation_closed: state.closed,
        backend_mode: "improved_mock_frontend_only"
      },
      null,
      2
    );
  }

  els.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage(els.messageInput.value);
  });

  els.messageInput.addEventListener("input", autoResizeTextarea);
  els.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      els.chatForm.requestSubmit();
    }
  });

  document.querySelectorAll(".prompt-chip").forEach((button) => {
    button.addEventListener("click", () => submitMessage(button.dataset.prompt));
  });

  els.resetButton.addEventListener("click", resetState);

  els.continueDetailsButton.addEventListener("click", () => {
    const checklistKey =
      state.flow === "currentAccount"
        ? "currentAccount"
        : state.flow === "vendorPayouts"
          ? "vendorPayouts"
          : state.flow === "escrow"
            ? "escrow"
            : "paymentGateway";

    showDetails(checklistKey);
  });

  els.fillDemoDetailsButton.addEventListener("click", completeDemoChecklist);
  els.generatePaymentButton.addEventListener("click", generatePaymentLink);

  els.copyPaymentButton.addEventListener("click", async () => {
    if (!state.paymentLink) return;

    try {
      await navigator.clipboard.writeText(state.paymentLink);
      els.copyPaymentButton.textContent = "Copied";
      setTimeout(() => (els.copyPaymentButton.textContent = "Copy"), 1400);
    } catch {
      els.copyPaymentButton.textContent = "Select link";
    }
  });

  els.debugToggle.addEventListener("click", () => {
    els.debugPanel.classList.toggle("hidden");
    if (!els.debugPanel.classList.contains("hidden")) {
      updateDebug();
      els.debugPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  els.closeDebugButton.addEventListener("click", () => {
    els.debugPanel.classList.add("hidden");
  });

  resetState();
})();
