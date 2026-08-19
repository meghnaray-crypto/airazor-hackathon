(() => {
  const params = new URLSearchParams(window.location.search);
  const merchant = params.get("merchant") || "Demo Company";
  const employees = params.get("employees") || "120";

  const merchantName = document.getElementById("merchantName");
  const employeeScale = document.getElementById("employeeScale");
  const simulateButton = document.getElementById("simulateHandoff");
  const payload = document.getElementById("handoffPayload");
  const ready = document.getElementById("handoffReady");

  merchantName.textContent = merchant;
  employeeScale.textContent = employees;

  simulateButton.addEventListener("click", () => {
    const handoff = {
      merchant,
      product: "Magic Checkout",
      route: "specialist_slack",
      source: "AIRazor hackathon demo",
      existing_context: {
        payroll_demo_completed: true,
        employee_count: Number(employees) || employees,
        payroll_priorities: ["attendance", "f_and_f", "automatic_compliance"]
      },
      new_requirement: "Checkout optimisation / conversion improvement",
      qualification_status: "Basic context captured; specialist follow-up required",
      destination: "#airazor-test-handoffs",
      sla_status: "pending_internal_confirmation",
      merchant_message: "Specialist handoff prepared. Follow-up timing will use the approved SLA once confirmed."
    };

    payload.textContent = JSON.stringify(handoff, null, 2);
    ready.classList.remove("hidden");
    simulateButton.textContent = "Handoff package prepared";
  });
})();
