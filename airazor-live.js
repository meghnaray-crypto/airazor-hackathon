(() => {
  const BACKEND = 'https://airazor-hackathon.onrender.com';
  const form = document.getElementById('chatForm');
  const input = document.getElementById('messageInput');
  const send = document.getElementById('sendButton');
  const chat = document.getElementById('chatWindow');
  const quickPrompts = document.getElementById('quickPrompts');
  const status = document.getElementById('conversationStatus');
  const modePill = document.getElementById('modePill');
  const profileStatus = document.getElementById('profileStatus');
  const profileEl = document.getElementById('merchantProfile');
  const payrollCard = document.getElementById('payrollJourneyCard');
  if (!form || !input || !chat) return;

  const sessionId = crypto.randomUUID ? crypto.randomUUID() : `live-${Date.now()}`;
  const history = [];
  const profile = {
    'Business model': '',
    'Requirement': '',
    'Secondary need': '',
    'Recipients': '',
    'Scale': '',
    'Frequency': '',
    'Existing setup': '',
    'Serviceability': 'Live RAG qualification'
  };

  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function renderProfile() {
    if (!profileEl) return;
    profileEl.innerHTML = '';
    Object.entries(profile).forEach(([label, value]) => {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value || 'Not captured';
      if (!value) dd.classList.add('empty');
      wrap.append(dt, dd);
      profileEl.appendChild(wrap);
    });
    if (profileStatus) {
      const filled = Object.values(profile).filter(Boolean).length;
      profileStatus.textContent = filled >= 4 ? 'Structured' : 'Building';
    }
  }

  function appendMessage(role, text, actions = []) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;
    if (role === 'assistant') {
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = 'AI';
      wrapper.appendChild(avatar);
    }
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = escapeHtml(text).replaceAll('\n', '<br>');
    wrapper.appendChild(bubble);
    chat.appendChild(wrapper);

    if (actions.length) {
      const actionWrap = document.createElement('div');
      actionWrap.className = 'inline-actions';
      actions.forEach((action) => {
        const a = document.createElement('a');
        a.className = 'inline-action';
        a.href = action.href;
        a.textContent = action.label;
        actionWrap.appendChild(a);
      });
      chat.appendChild(actionWrap);
    }
    chat.scrollTop = chat.scrollHeight;
  }

  function detectProfile(text) {
    const lower = text.toLowerCase();
    const employeeMatch = text.match(/(\d[\d,]*)\s+(?:employees?|staff|people)/i);
    const vendorMatch = text.match(/(\d[\d,]*)\s+(?:vendors?|suppliers?)/i);
    if (employeeMatch) profile.Scale = `${employeeMatch[1]} employees`;
    if (vendorMatch) profile.Scale = `${vendorMatch[1]} vendors`;

    const needs = [];
    if (/\b(payroll|salary|attendance|leave|full[- ]?and[- ]?final|f&f|employee exit|statutory compliance)\b/i.test(lower)) {
      needs.push('RazorpayX Payroll');
      profile.Recipients = 'Employees';
    }
    if (/\b(vendor|supplier|payout|disbursement)\b/i.test(lower)) {
      needs.push('Vendor payouts');
      profile.Recipients = profile.Recipients || 'Vendors / suppliers';
    }
    if (/\b(payment gateway|checkout|accept payments|collect payments|customer payments)\b/i.test(lower)) {
      needs.push('Customer payment collection');
      profile.Recipients = profile.Recipients || 'Customers';
    }
    if (/\b(current account|business bank account)\b/i.test(lower)) needs.push('Business Current Account');
    if (/\b(marketplace|escrow|hold funds)\b/i.test(lower)) {
      needs.push('Marketplace / escrow');
      profile['Business model'] = 'Marketplace / platform';
    }
    if (/\b(ecommerce|e-commerce|online store|website)\b/i.test(lower)) profile['Business model'] = 'Ecommerce / online business';
    if (/\b(spreadsheet|excel|sheet|manual)\b/i.test(lower)) profile['Existing setup'] = 'Manual / spreadsheet-led';
    if (/\b(monthly|every month)\b/i.test(lower)) profile.Frequency = 'Monthly';
    if (needs.length) {
      profile.Requirement = needs[0];
      profile['Secondary need'] = needs.slice(1).join(' + ');
    }
    renderProfile();
  }

  function payrollActions(text) {
    if (!/\b(payroll|salary|attendance|leave|full[- ]?and[- ]?final|f&f|employee exit)\b/i.test(text)) return [];
    const employeeMatch = text.match(/(\d[\d,]*)\s+(?:employees?|staff|people)/i);
    const employees = employeeMatch ? employeeMatch[1].replaceAll(',', '') : '120';
    const focus = [];
    if (/attendance|leave/i.test(text)) focus.push('attendance');
    if (/full[- ]?and[- ]?final|f&f|employee exit/i.test(text)) focus.push('f_and_f');
    if (/compliance|tds|pf|esi|esic|pt/i.test(text)) focus.push('compliance');
    const query = new URLSearchParams({ merchant: 'Demo Company', employees, focus: (focus.length ? focus : ['attendance', 'f_and_f']).join(',') });
    return [{ label: 'Open personalised Payroll demo', href: `/payroll-demo.html?${query.toString()}` }];
  }

  function updatePayrollCard(text) {
    if (!payrollCard || !/\b(payroll|salary|attendance|leave|full[- ]?and[- ]?final|f&f|employee exit)\b/i.test(text)) return;
    const employeeMatch = text.match(/(\d[\d,]*)\s+(?:employees?|staff|people)/i);
    const employees = employeeMatch ? employeeMatch[1].replaceAll(',', '') : '120';
    const focus = [];
    if (/attendance|leave/i.test(text)) focus.push('attendance');
    if (/full[- ]?and[- ]?final|f&f|employee exit/i.test(text)) focus.push('f_and_f');
    if (/compliance|tds|pf|esi|esic|pt/i.test(text)) focus.push('compliance');
    const link = payrollCard.querySelector('a.primary-button');
    if (link) {
      const q = new URLSearchParams({ merchant: 'Demo Company', employees, focus: (focus.length ? focus : ['attendance', 'f_and_f']).join(',') });
      link.href = `/payroll-demo.html?${q.toString()}`;
    }
    const description = payrollCard.querySelector('.muted-text');
    if (description && employeeMatch) {
      description.textContent = `AIRazor has captured ${employeeMatch[1]} employees and will prioritise the Payroll areas raised in this conversation.`;
    }
  }

  async function liveChat(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    if (quickPrompts) quickPrompts.classList.add('hidden');
    appendMessage('user', clean);
    detectProfile(clean);
    updatePayrollCard(clean);
    history.push({ role: 'user', content: clean });
    input.value = '';
    send.disabled = true;
    if (status) status.textContent = 'Retrieving verified Razorpay context';

    try {
      const response = await fetch(`${BACKEND}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: clean, history: history.slice(-10) })
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(data.error || `AIRazor backend returned ${response.status}`);
      const reply = data.reply || 'I could not generate a response from the verified context.';
      appendMessage('assistant', reply, payrollActions(clean));
      history.push({ role: 'assistant', content: reply });
      if (status) {
        const count = Number(data.retrieval_count || 0);
        status.textContent = count > 0 ? `RAG grounded · ${count} source match${count === 1 ? '' : 'es'}` : 'Verified Payroll context';
      }
      if (modePill) modePill.innerHTML = '<span class="status-dot"></span>Live RAG mode';
    } catch (error) {
      appendMessage('assistant', `I couldn't reach the live AIRazor brain just now. ${error.message}`);
      if (status) status.textContent = 'Live backend unavailable';
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    liveChat(input.value);
  }, true);

  document.querySelectorAll('.prompt-chip').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      liveChat(button.dataset.prompt || button.textContent);
    }, true);
  });

  renderProfile();
  if (modePill) modePill.innerHTML = '<span class="status-dot"></span>Live RAG mode';
})();
