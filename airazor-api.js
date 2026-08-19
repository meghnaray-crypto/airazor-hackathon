(() => {
  async function chat(payload) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {}

    if (!response.ok) {
      const error = new Error(data.error || `AIRazor backend returned ${response.status}`);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  }

  async function status() {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Status check failed (${response.status})`);
    return response.json();
  }

  window.AIRazorAPI = { chat, status };
})();
