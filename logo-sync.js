(() => {
  const LOGO_SVG = `
    <svg class="airazor-shared-mark" viewBox="0 0 48 48" role="img" aria-label="AIRazor">
      <defs>
        <linearGradient id="airazorSharedBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2F80FF"/>
          <stop offset="100%" stop-color="#0B4FC7"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#airazorSharedBlue)"/>
      <path d="M13 32.5 23.6 11h5.2L39 32.5h-6.1l-2.2-5H21.2l-2.3 5H13Zm10.5-10.1h5L26 16.6l-2.5 5.8Z" fill="white"/>
      <path d="M31.3 9.5 39.5 9.5 34.3 19.8 28.5 19.8 31.3 9.5Z" fill="#7EC8FF"/>
    </svg>`;

  function installStyles() {
    if (document.getElementById("airazor-logo-sync-styles")) return;
    const style = document.createElement("style");
    style.id = "airazor-logo-sync-styles";
    style.textContent = `
      .avatar .airazor-shared-mark{width:100%;height:100%;display:block}
      .avatar{padding:0!important;background:transparent!important;overflow:hidden}
      .tavus-avatar-placeholder .airazor-shared-mark{width:74%;height:74%;display:block}
      .tavus-avatar-placeholder{display:flex!important;align-items:center!important;justify-content:center!important}
      .tavus-avatar-placeholder>span{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function applySharedLogo(root = document) {
    root.querySelectorAll?.(".avatar").forEach((avatar) => {
      if (avatar.dataset.airazorLogoSynced === "true") return;
      avatar.innerHTML = LOGO_SVG;
      avatar.dataset.airazorLogoSynced = "true";
      avatar.setAttribute("aria-label", "AIRazor");
    });

    root.querySelectorAll?.(".tavus-avatar-placeholder").forEach((placeholder) => {
      if (placeholder.dataset.airazorLogoSynced === "true") return;
      placeholder.innerHTML = LOGO_SVG;
      placeholder.dataset.airazorLogoSynced = "true";
      placeholder.setAttribute("aria-label", "AIRazor");
    });
  }

  installStyles();
  applySharedLogo();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches?.(".avatar, .tavus-avatar-placeholder")) applySharedLogo(node.parentElement || document);
        else applySharedLogo(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
