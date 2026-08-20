(() => {
  const card = document.getElementById('payrollJourneyCard');
  if (!card) return;

  const input = document.getElementById('messageInput');
  const form = document.getElementById('chatForm');
  const primaryLink = card.querySelector('a.primary-button');
  const description = card.querySelector('.muted-text');
  const title = card.querySelector('h3');
  const badge = card.querySelector('.outline-pill');

  function payrollSignals(text) {
    const value = String(text || '').toLowerCase();
    const payroll = /\b(payroll|salary|salaries|employee|employees|attendance|leave|f&f|full[- ]?and[- ]?final|employee exit|payslip|compliance|reimbursement)\b/i.test(value);
    const employeeMatch = value.match(/\b(\d{2,5})\s*(?:employees?|people|staff|team members?)\b/i);
    const focus = [];
    if (/attendance|leave|shift|biometric/i.test(value)) focus.push('attendance');
    if (/f&f|full[- ]?and[- ]?final|employee exit|exit settlement|final settlement/i.test(value)) focus.push('f_and_f');
    if (/compliance|tds|pf|esi|esic|professional tax|pt\b/i.test(value)) focus.push('compliance');
    if (/salary processing|payroll run|salary calculation|payroll processing/i.test(value)) focus.push('payroll_run');
    if (/report|analytics|visibility/i.test(value)) focus.push('reports');
    return { payroll, employees: employeeMatch ? employeeMatch[1] : '', focus };
  }

  function showFor(text) {
    const signals = payrollSignals(text);
    if (!signals.payroll) return;
    card.classList.remove('hidden');
    if (title) title.textContent = 'See how Payroll solves your pain points';
    if (badge) badge.textContent = 'Recommended next step';
    if (description) {
      description.textContent = 'Discovery tells AIRazor what is broken. This demo is the proof step: it opens only the Payroll modules relevant to the merchant instead of forcing a generic product tour.';
    }
    const employees = signals.employees || '120';
    const focus = signals.focus.length ? signals.focus.join(',') : 'payroll_run,attendance,compliance';
    if (primaryLink) {
      primaryLink.href = `/payroll-demo.html?merchant=Merchant&employees=${encodeURIComponent(employees)}&focus=${encodeURIComponent(focus)}`;
      primaryLink.textContent = signals.focus.length ? 'Show my relevant Payroll flow' : 'See a tailored Payroll walkthrough';
    }
  }

  card.classList.add('hidden');

  document.querySelectorAll('.prompt-chip').forEach((button) => {
    button.addEventListener('click', () => showFor(button.dataset.prompt || button.textContent || ''));
  });

  form?.addEventListener('submit', () => showFor(input?.value || ''), true);

  const chatWindow = document.getElementById('chatWindow');
  if (chatWindow && window.MutationObserver) {
    const observer = new MutationObserver(() => {
      const text = chatWindow.textContent || '';
      if (/payroll|attendance|full-and-final|f&f|employee exit/i.test(text)) showFor(text);
    });
    observer.observe(chatWindow, { childList: true, subtree: true });
  }
})();
