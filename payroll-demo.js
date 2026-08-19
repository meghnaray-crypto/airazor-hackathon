(() => {
  const params = new URLSearchParams(window.location.search);
  const merchant = params.get("merchant") || "Demo company";
  const employees = params.get("employees") || "Not provided";
  const rawFocus = (params.get("focus") || "").split(",").map(v => v.trim()).filter(Boolean);

  const normalize = (value) => String(value || "").toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const focusSet = new Set(rawFocus.map(normalize));

  const modules = [
    {
      id: "overview",
      label: "Overview",
      description: "Set context for the merchant and explain what this walkthrough will focus on.",
      narration: "I’ll keep this short and focus only on the areas you said are painful. We can skip anything that is not relevant to your current process.",
      objective: "Frame the demo around the merchant’s stated priorities.",
      body: () => `
        <div class="stat-grid">
          <div class="stat"><span>Demo mode</span><strong>Personalised</strong></div>
          <div class="stat"><span>Employee scale</span><strong>${employees}</strong></div>
          <div class="stat"><span>Priority modules</span><strong>${focusSet.size || "General"}</strong></div>
        </div>
        <div class="workflow">
          <div class="step"><small>Step 1</small><strong>Understand pain points</strong></div>
          <div class="step"><small>Step 2</small><strong>Show only relevant modules</strong></div>
          <div class="step"><small>Step 3</small><strong>Answer questions live</strong></div>
        </div>`
    },
    {
      id: "employee_setup",
      label: "Employee setup",
      description: "Illustrative setup view used only to explain the demo journey.",
      narration: "If employee setup is relevant, I can show how the workflow begins. If your real challenge is elsewhere, we can skip this and go directly to the priority area.",
      objective: "Show that AIRazor can skip non-priority setup content.",
      body: () => `
        <div class="fake-table">
          <div class="fake-row header"><span>Employee</span><span>Department</span><span>Status</span></div>
          <div class="fake-row"><span>Sample Employee A</span><span>Operations</span><span>Ready</span></div>
          <div class="fake-row"><span>Sample Employee B</span><span>Sales</span><span>Ready</span></div>
          <div class="fake-row"><span>Sample Employee C</span><span>Finance</span><span>Review</span></div>
        </div>`
    },
    {
      id: "attendance",
      label: "Attendance",
      description: "Illustrative attendance-focused screen for merchants who raise attendance as a pain point.",
      narration: "You mentioned attendance as a major source of manual work, so I’m prioritising this section instead of taking you through the entire product first.",
      objective: "Demonstrate pain-point-driven sequencing.",
      body: () => `
        <div class="stat-grid">
          <div class="stat"><span>Employees in demo</span><strong>${employees === "Not provided" ? "120" : employees}</strong></div>
          <div class="stat"><span>Inputs awaiting review</span><strong>8</strong></div>
          <div class="stat"><span>Demo focus</span><strong>Attendance</strong></div>
        </div>
        <div class="fake-table">
          <div class="fake-row header"><span>Employee</span><span>Attendance input</span><span>Demo status</span></div>
          <div class="fake-row"><span>Sample Employee A</span><span>Present</span><span>Reviewed</span></div>
          <div class="fake-row"><span>Sample Employee B</span><span>Correction</span><span>Needs review</span></div>
          <div class="fake-row"><span>Sample Employee C</span><span>Leave</span><span>Reviewed</span></div>
        </div>`
    },
    {
      id: "payroll_run",
      label: "Payroll run",
      description: "Illustrative payroll-cycle screen for explaining the overall demo flow.",
      narration: "Once the relevant employee inputs are ready, this is where I would explain the payroll-cycle step at a high level, without going into areas you did not ask about.",
      objective: "Keep the walkthrough concise and outcome-oriented.",
      body: () => `
        <div class="workflow">
          <div class="step"><small>Stage 1</small><strong>Inputs ready</strong></div>
          <div class="step"><small>Stage 2</small><strong>Review</strong></div>
          <div class="step"><small>Stage 3</small><strong>Payroll run</strong></div>
          <div class="step"><small>Stage 4</small><strong>Completion</strong></div>
        </div>`
    },
    {
      id: "f_and_f",
      label: "F&F / employee exit",
      description: "Illustrative employee-exit section for merchants who mention full-and-final settlement.",
      narration: "You also called out full-and-final settlement, so I’m moving directly to the employee-exit part of the demo rather than continuing with unrelated sections.",
      objective: "Show live adaptation when the merchant changes or adds a pain point.",
      body: () => `
        <div class="fake-table">
          <div class="fake-row header"><span>Employee</span><span>Exit stage</span><span>Demo status</span></div>
          <div class="fake-row"><span>Sample Employee X</span><span>Last working day captured</span><span>Ready</span></div>
          <div class="fake-row"><span>Sample Employee Y</span><span>Settlement review</span><span>Review</span></div>
          <div class="fake-row"><span>Sample Employee Z</span><span>Closure</span><span>Complete</span></div>
        </div>`
    },
    {
      id: "reports",
      label: "Reports",
      description: "Illustrative reporting section that can be included only when the merchant asks for visibility or reporting.",
      narration: "If reporting is important to you, I can cover it here. Otherwise, I would normally skip this and move to the next action.",
      objective: "Avoid generic demo sections when they are not relevant.",
      body: () => `
        <div class="stat-grid">
          <div class="stat"><span>Demo report</span><strong>Payroll summary</strong></div>
          <div class="stat"><span>Demo report</span><strong>Attendance review</strong></div>
          <div class="stat"><span>Demo report</span><strong>Exit summary</strong></div>
        </div>`
    }
  ];

  const aliases = {
    f_and_f: "f_and_f",
    f&f: "f_and_f",
    fff: "f_and_f",
    final_settlement: "f_and_f",
    full_and_final: "f_and_f",
    employee_exit: "f_and_f",
    payroll: "payroll_run",
    payroll_run: "payroll_run",
    attendance: "attendance",
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

  const state = {
    index: 0,
    covered: new Set()
  };

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
      button.addEventListener("click", () => {
        state.index = index;
        render();
      });
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
      ? ["Lead with merchant priorities", "Skip low-relevance sections", "Allow live topic changes", "Close with a next action"]
      : ["Understand the merchant first", "Keep the walkthrough concise", "Adapt if a pain point appears", "Close with a next action"];
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
    if (state.index > 0) {
      state.index -= 1;
      render();
    }
  });

  els.markCovered.addEventListener("click", () => {
    const module = orderedModules[state.index];
    state.covered.add(module.id);
    if (state.index < orderedModules.length - 1) {
      state.index += 1;
    } else {
      els.heroTitle.textContent = "Demo complete — ready for the next action";
      els.heroCopy.textContent = "Tomorrow AIRazor will use the conversation state to decide whether the merchant should continue to onboarding or specialist handoff.";
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
