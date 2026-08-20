(() => {
  const params = new URLSearchParams(window.location.search);
  const merchant = params.get("merchant") || "Demo company";
  const employees = params.get("employees") || "Not provided";
  const rawFocus = (params.get("focus") || "").split(",").map(v => v.trim()).filter(Boolean);

  const normalize = (value) => String(value || "").toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const focusSet = new Set(rawFocus.map(normalize));
  const employeeNumber = Number(String(employees).replaceAll(",", ""));
  const documentedPlanBand = Number.isFinite(employeeNumber)
    ? employeeNumber >= 1001 ? "Enterprise (1001+ employees)"
      : employeeNumber >= 31 ? "Elite (31–1000 employees)"
        : employeeNumber >= 11 ? "Prime (11–30 employees)"
          : "Verify plan fit"
    : "Verify plan fit";

  const modules = [
    {
      id: "overview",
      label: "Overview",
      description: "Set context for the merchant, capture employee scale and explain which Payroll areas will be prioritised.",
      narration: "I’ll keep this focused on your operating pain points instead of giving you a generic product tour. I’ve captured your employee scale and I’ll lead with the workflows that matter most to your team.",
      objective: "Frame the demo around the merchant’s stated priorities and scale.",
      body: () => `
        <div class="stat-grid">
          <div class="stat"><span>Demo mode</span><strong>Personalised</strong></div>
          <div class="stat"><span>Employee scale</span><strong>${employees}</strong></div>
          <div class="stat"><span>Documented plan band</span><strong>${documentedPlanBand}</strong></div>
        </div>
        <div class="workflow">
          <div class="step"><small>Step 1</small><strong>Understand payroll setup</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Current HRMS, spreadsheets or payroll provider</div></div>
          <div class="step"><small>Step 2</small><strong>Prioritise pain points</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Attendance, compliance, payroll run, F&F or reporting</div></div>
          <div class="step"><small>Step 3</small><strong>Move to next action</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Relevant demo, plan verification or onboarding</div></div>
        </div>`
    },
    {
      id: "employee_setup",
      label: "Employee setup",
      description: "Explain the employee lifecycle entry point only when setup or onboarding is relevant to the merchant.",
      narration: "Payroll supports employee lifecycle workflows, but I would only spend time here if employee onboarding or setup is actually one of your problems. Otherwise I’ll move straight to the operational pain point you raised.",
      objective: "Show that AIRazor can skip non-priority setup content.",
      body: () => `
        <div class="fake-table">
          <div class="fake-row header"><span>Employee</span><span>Department</span><span>Status</span></div>
          <div class="fake-row"><span>Sample Employee A</span><span>Operations</span><span>Ready</span></div>
          <div class="fake-row"><span>Sample Employee B</span><span>Sales</span><span>Ready</span></div>
          <div class="fake-row"><span>Sample Employee C</span><span>Finance</span><span>Review</span></div>
        </div>
        <div class="workflow">
          <div class="step"><small>Verified capability</small><strong>Employee lifecycle</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Payroll covers workflows across onboarding, employee management and exit.</div></div>
          <div class="step"><small>Employee self-service</small><strong>Pay, leave and tax tasks</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Employees can use self-service for relevant payroll and HR tasks.</div></div>
        </div>`
    },
    {
      id: "attendance",
      label: "Attendance",
      description: "Show how attendance and leave inputs can connect to payroll calculations instead of being reconciled manually.",
      narration: "You mentioned attendance as a major source of manual work. Payroll can track attendance and shifts, support corrections, and use attendance and leave inputs in salary calculations. If you use biometric devices or another attendance source, I’d qualify that integration path before we go deeper.",
      objective: "Connect the merchant's attendance pain directly to payroll processing.",
      body: () => `
        <div class="stat-grid">
          <div class="stat"><span>Employees in demo</span><strong>${employees === "Not provided" ? "120" : employees}</strong></div>
          <div class="stat"><span>Input path</span><strong>Web / biometric / integration</strong></div>
          <div class="stat"><span>Payroll impact</span><strong>Attendance + leave sync</strong></div>
        </div>
        <div class="fake-table">
          <div class="fake-row header"><span>Employee</span><span>Attendance input</span><span>Action</span></div>
          <div class="fake-row"><span>Sample Employee A</span><span>Present</span><span>Included</span></div>
          <div class="fake-row"><span>Sample Employee B</span><span>Correction</span><span>Regularise</span></div>
          <div class="fake-row"><span>Sample Employee C</span><span>Leave</span><span>Factor into payroll</span></div>
        </div>
        <div class="workflow">
          <div class="step"><small>Merchant qualifier</small><strong>Where does attendance come from today?</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Sheets, HRMS, biometric device or Payroll itself.</div></div>
        </div>`
    },
    {
      id: "payroll_run",
      label: "Payroll run",
      description: "Explain how verified employee inputs move into payroll calculation, review and salary disbursement.",
      narration: "Once the employee inputs are ready, Payroll can calculate salaries using the relevant attendance and leave data, let the team review the payroll run, and then move into salary disbursement. I’d confirm your current approval process before recommending the exact operating flow.",
      objective: "Show the connection between inputs, calculations, review and payout.",
      body: () => `
        <div class="workflow">
          <div class="step"><small>Stage 1</small><strong>Employee inputs ready</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Salary structure, attendance, leave and relevant payroll inputs.</div></div>
          <div class="step"><small>Stage 2</small><strong>Payroll calculation</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Calculate payroll using the configured employee data.</div></div>
          <div class="step"><small>Stage 3</small><strong>Review</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Validate the run before completion.</div></div>
          <div class="step"><small>Stage 4</small><strong>Salary disbursement</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Move from approved payroll to employee salary payment.</div></div>
        </div>`
    },
    {
      id: "compliance",
      label: "Automatic compliance",
      description: "Explain the supported operational compliance calculations, payments and filings connected to Payroll.",
      narration: "Payroll can automate supported operational compliance work such as TDS, PF, PT and ESI or ESIC calculations, payments and filings. I would still verify the current compliance scope before making a promise about organisation-level registrations or an edge case.",
      objective: "Show compliance automation without over-claiming unsupported registration scope.",
      body: () => `
        <div class="stat-grid">
          <div class="stat"><span>Operational scope</span><strong>Calculations</strong></div>
          <div class="stat"><span>Operational scope</span><strong>Payments</strong></div>
          <div class="stat"><span>Operational scope</span><strong>Filings</strong></div>
        </div>
        <div class="workflow">
          <div class="step"><small>Supported areas</small><strong>TDS · PF · PT · ESI/ESIC</strong></div>
          <div class="step"><small>Guardrail</small><strong>Verify registration scope</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Do not assume every organisation-level registration is automated.</div></div>
          <div class="step"><small>Merchant qualifier</small><strong>What is manual today?</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Calculation, payment, filing or reconciliation.</div></div>
        </div>`
    },
    {
      id: "f_and_f",
      label: "F&F / employee exit",
      description: "Focus on full-and-final settlement when employee exits are creating manual work for HR or finance.",
      narration: "You also called out full-and-final settlement. Payroll's HR workflow covers employee exit management including F&F, so I’d move here immediately. I’d then understand whether your biggest problem is settlement calculation, approvals, tracking last working day, or closure.",
      objective: "Show live adaptation and directly address employee-exit pain.",
      body: () => `
        <div class="fake-table">
          <div class="fake-row header"><span>Employee</span><span>Exit stage</span><span>Demo status</span></div>
          <div class="fake-row"><span>Sample Employee X</span><span>Last working day captured</span><span>Ready</span></div>
          <div class="fake-row"><span>Sample Employee Y</span><span>Settlement review</span><span>Review</span></div>
          <div class="fake-row"><span>Sample Employee Z</span><span>Closure</span><span>Complete</span></div>
        </div>
        <div class="workflow">
          <div class="step"><small>Merchant qualifier</small><strong>Where is the F&F bottleneck?</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">Calculation · approvals · settlement tracking · closure</div></div>
        </div>`
    },
    {
      id: "reports",
      label: "Reports",
      description: "Use reporting only when the merchant needs payroll visibility, auditability or management insights.",
      narration: "If reporting is important, Payroll provides analytics and reporting capabilities. I would understand whether you need payroll summaries, attendance visibility, employee-level data or management reporting before spending time here.",
      objective: "Avoid generic reporting content unless it maps to a merchant decision.",
      body: () => `
        <div class="stat-grid">
          <div class="stat"><span>Visibility</span><strong>Payroll summary</strong></div>
          <div class="stat"><span>Visibility</span><strong>Attendance review</strong></div>
          <div class="stat"><span>Visibility</span><strong>Employee data</strong></div>
        </div>
        <div class="workflow">
          <div class="step"><small>Merchant qualifier</small><strong>Who needs the report?</strong><div style="margin-top:6px;color:#667085;font-size:.76rem">HR, finance, founders, auditors or managers.</div></div>
        </div>`
    }
  ];

  const aliases = {
    f_and_f: "f_and_f",
    "f&f": "f_and_f",
    fff: "f_and_f",
    final_settlement: "f_and_f",
    full_and_final: "f_and_f",
    employee_exit: "f_and_f",
    payroll: "payroll_run",
    payroll_run: "payroll_run",
    attendance: "attendance",
    leave: "attendance",
    compliance: "compliance",
    automatic_compliance: "compliance",
    compliance_calculation: "compliance",
    reports: "reports",
    reporting: "reports",
    employee_setup: "employee_setup"
  };

  if (focusSet.size) {
    const expanded = new Set();
    [...focusSet].forEach((key) => expanded.add(aliases[key] || key));
    focusSet.clear();
    expanded.forEach(key => focusSet.add(key));
  }

  const orderedModules = focusSet.size
    ? [modules[0], ...modules.filter(m => m.id !== "overview" && focusSet.has(m.id)), ...modules.filter(m => m.id !== "overview" && !focusSet.has(m.id))]
    : modules;

  const state = { index: 0, covered: new Set() };

  const els = {
    merchantName: document.getElementById("merchantName"),
    employeeScale: document.getElementById("employeeScale"),
    focusSummary: document.getElementById("focusSummary"),
    heroTitle: document.getElementById("heroTitle"),
    heroCopy: document.getElementById("heroCopy"),
    moduleList: document.getElementById("moduleList"),
    moduleTitle: document.getElementById("moduleTitle"),
    moduleDescription: document.getElementById("moduleDescription"),
    screenTitle: document.getElementById("screenTitle"),
    screenBody: document.getElementById("screenBody"),
    narration: document.getElementById("narration"),
    focusBadge: document.getElementById("focusBadge"),
    previousModule: document.getElementById("previousModule"),
    markCovered: document.getElementById("markCovered"),
    painList: document.getElementById("painList"),
    progressFill: document.getElementById("progressFill"),
    progressText: document.getElementById("progressText"),
    progressPercent: document.getElementById("progressPercent"),
    objectiveList: document.getElementById("objectiveList")
  };

  function humanLabel(id) {
    const match = modules.find(m => m.id === id);
    return match ? match.label : id.replaceAll("_", " ");
  }

  function renderNav() {
    els.moduleList.innerHTML = "";
    orderedModules.forEach((module, index) => {
      const button = document.createElement("button");
      button.className = "module-button";
      if (index === state.index) button.classList.add("active");
      if (focusSet.has(module.id)) button.classList.add("focus");
      if (state.covered.has(module.id)) button.classList.add("covered");
      button.textContent = module.label;
      button.addEventListener("click", () => { state.index = index; render(); });
      els.moduleList.appendChild(button);
    });
  }

  function renderPainPoints() {
    els.painList.innerHTML = "";
    const points = focusSet.size ? [...focusSet] : ["general walkthrough"];
    points.forEach(point => {
      const chip = document.createElement("span");
      chip.className = "chip focus";
      chip.textContent = humanLabel(point);
      els.painList.appendChild(chip);
    });
  }

  function renderObjectives() {
    els.objectiveList.innerHTML = "";
    const objectives = focusSet.size
      ? ["Lead with merchant priorities", "Use verified capability context", "Skip low-relevance sections", "Close with a next action"]
      : ["Understand employee scale", "Identify the current payroll setup", "Map the pain point to a relevant module", "Close with a next action"];
    objectives.forEach(text => {
      const li = document.createElement("li");
      li.textContent = text;
      els.objectiveList.appendChild(li);
    });
  }

  function renderProgress() {
    const total = orderedModules.length;
    const count = state.covered.size;
    const percent = Math.round((count / total) * 100);
    els.progressFill.style.width = `${percent}%`;
    els.progressText.textContent = `${count} of ${total} covered`;
    els.progressPercent.textContent = `${percent}%`;
  }

  function render() {
    const module = orderedModules[state.index];
    els.moduleTitle.textContent = module.label;
    els.moduleDescription.textContent = module.description;
    els.screenTitle.textContent = `${module.label} · demo view`;
    els.screenBody.innerHTML = module.body();
    els.narration.textContent = module.narration;
    els.focusBadge.hidden = !focusSet.has(module.id);
    els.previousModule.disabled = state.index === 0;
    els.markCovered.textContent = state.index === orderedModules.length - 1 ? "Mark covered & finish" : "Mark covered & continue";
    renderNav();
    renderProgress();
  }

  els.previousModule.addEventListener("click", () => {
    if (state.index > 0) { state.index -= 1; render(); }
  });

  els.markCovered.addEventListener("click", () => {
    const module = orderedModules[state.index];
    state.covered.add(module.id);
    if (state.index < orderedModules.length - 1) {
      state.index += 1;
    } else {
      els.heroTitle.textContent = "Demo complete — ready for the next action";
      els.heroCopy.textContent = "AIRazor can now carry the captured merchant context into onboarding, plan verification or specialist support without restarting discovery.";
    }
    render();
  });

  els.merchantName.textContent = merchant;
  els.employeeScale.textContent = employees;
  els.focusSummary.textContent = focusSet.size ? [...focusSet].map(humanLabel).join(" + ") : "General walkthrough";
  if (focusSet.size) {
    els.heroTitle.textContent = "A Payroll demo shaped around the merchant";
    els.heroCopy.textContent = `AIRazor has prioritised ${[...focusSet].map(humanLabel).join(" and ")} based on the merchant conversation.`;
  }
  renderPainPoints();
  renderObjectives();
  render();
})();
