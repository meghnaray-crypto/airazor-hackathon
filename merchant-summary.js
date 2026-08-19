(() => {
  const params = new URLSearchParams(window.location.search);
  const merchant = params.get("merchant") || "Demo Company";
  const employees = params.get("employees") || "120";
  const focus = (params.get("focus") || "attendance,f_and_f").split(",").map(v => v.trim()).filter(Boolean);

  const labels = {
    attendance: "Attendance",
    f_and_f: "F&F / employee exit",
    payroll_run: "Payroll run",
    reports: "Reports"
  };

  document.getElementById("merchantName").textContent = merchant;
  document.getElementById("employeeScale").textContent = employees;

  const chips = document.getElementById("priorityChips");
  focus.forEach(item => {
    const chip = document.createElement("span");
    chip.className = "chip priority";
    chip.textContent = labels[item] || item.replaceAll("_", " ");
    chips.appendChild(chip);
  });
})();
