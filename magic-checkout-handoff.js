(() => {
  const params = new URLSearchParams(window.location.search);
  const merchant = params.get("merchant") || "Demo Company";
  const employees = params.get("employees") || "120";
  const product = params.get("product") || "Magic Checkout";

  const normalize = (value) => String(value || "").trim().toLowerCase();
  const productKey = normalize(product);
  const isSmartCollect20 = productKey === "smart collect 2.0" || productKey === "smart collect 2";
  const isSmartCollect = productKey === "smart collect";

  const merchantName = document.getElementById("merchantName");
  const employeeScale = document.getElementById("employeeScale");
  const productName = document.getElementById("productName");
  const routeName = document.getElementById("routeName");
  const productFamily = document.getElementById("productFamily");
  const demoOwner = document.getElementById("demoOwner");
  const destination = document.getElementById("destination");
  const routingBanner = document.getElementById("routingBanner");
  const simulationNote = document.getElementById("simulationNote");
  const newRequirement = document.getElementById("newRequirement");
  const simulateButton = document.getElementById("simulateHandoff");
  const payload = document.getElementById("handoffPayload");
  const ready = document.getElementById("handoffReady");

  merchantName.textContent = merchant;
  employeeScale.textContent = employees;
  productName.textContent = product;

  const route = isSmartCollect20
    ? {
        product,
        product_family: "razorpayx",
        demo_owner: "airazor",
        handoff_required: false,
        handoff_destination: null,
        route_label: "AIRazor-led RazorpayX demo",
        requirement: "Smart Collect 2.0"
      }
    : {
        product,
        product_family: "payment_gateway",
        demo_owner: "specialist",
        handoff_required: true,
        handoff_destination: "#airazor-test-handoffs",
        route_label: "Payment Gateway specialist",
        requirement: isSmartCollect ? "Smart Collect" : "Checkout / Payment Gateway requirement"
      };

  routeName.textContent = route.route_label;
  productFamily.textContent = route.product_family === "razorpayx" ? "RazorpayX" : "Payment Gateway";
  demoOwner.textContent = route.demo_owner === "airazor" ? "AIRazor" : "Specialist";
  destination.textContent = route.handoff_destination || "Not required";
  newRequirement.textContent = route.requirement;

  if (route.handoff_required) {
    routingBanner.textContent = "Payment Gateway products route through the shared AIRazor test handoff channel when specialist involvement is required.";
    simulationNote.textContent = "This button prepares the payload the real backend will send to Slack. It does not send a Slack message yet.";
    simulateButton.textContent = "Prepare Payment Gateway handoff";
  } else {
    routingBanner.textContent = "Smart Collect 2.0 is a RazorpayX product. AIRazor should continue the demo instead of sending it to the Payment Gateway Slack handoff.";
    routingBanner.classList.add("good-banner");
    simulationNote.textContent = "This route should continue into an AIRazor-led Smart Collect 2.0 demo. No Payment Gateway Slack handoff should be created by default.";
    simulateButton.textContent = "Prepare AIRazor demo route";
  }

  simulateButton.addEventListener("click", () => {
    const routingPackage = {
      merchant,
      product: route.product,
      product_family: route.product_family,
      demo_owner: route.demo_owner,
      source: "AIRazor hackathon demo",
      existing_context: {
        payroll_demo_completed: true,
        employee_count: Number(employees) || employees,
        payroll_priorities: ["attendance", "f_and_f", "automatic_compliance"]
      },
      new_requirement: route.requirement,
      handoff_required: route.handoff_required,
      handoff_destination: route.handoff_destination,
      sla_status: route.handoff_required ? "pending_internal_confirmation" : null,
      next_action: route.handoff_required ? "prepare_specialist_slack_handoff" : "launch_airazor_product_demo"
    };

    payload.textContent = JSON.stringify(routingPackage, null, 2);
    ready.classList.remove("hidden");
    ready.textContent = route.handoff_required
      ? "Payment Gateway handoff package ready. Tomorrow the backend will send this through the approved Slack integration."
      : "AIRazor demo route ready. Smart Collect 2.0 stays in the RazorpayX demo journey.";
    simulateButton.textContent = route.handoff_required ? "Handoff package prepared" : "AIRazor route prepared";
  });
})();
