(() => {
  // We will use standard CSS opacity for a smoother, safer hide
  const TRANSITION_DURATION = 150; 

  async function navigate(url, push = true) {
    // 1. HARD LOCK: Force invisible immediately
    document.documentElement.style.transition = `opacity ${TRANSITION_DURATION}ms ease`;
    document.documentElement.style.opacity = "0";

    // Wait for the fade-out to finish before touching DOM
    await new Promise(r => setTimeout(r, TRANSITION_DURATION));

    try {
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      /* ===============================
         2. SWAP STYLES
         =============================== */
      document.querySelectorAll("style[data-page-style]").forEach(s => s.remove());
      doc.querySelectorAll("style[data-page-style]").forEach(style => {
        document.head.appendChild(style.cloneNode(true));
      });

      /* ===============================
         3. SWAP CONTENT
         =============================== */
      const newMain = doc.querySelector("main");
      const currentMain = document.querySelector("main");

      if (!newMain || !currentMain) {
        window.location.href = url;
        return;
      }

      currentMain.replaceWith(newMain);

      // Force Scroll Top
      window.scrollTo(0, 0);

      /* ===============================
         4. RE-RUN SCRIPTS
         =============================== */
      newMain.querySelectorAll("script").forEach(oldScript => {
        const script = document.createElement("script");
        if (oldScript.src) {
          script.src = oldScript.src;
        } else {
          script.textContent = oldScript.textContent;
        }
        oldScript.replaceWith(script);
      });

      /* ===============================
         5. UPDATE NAV
         =============================== */
      document.querySelectorAll(".nav a").forEach(a => {
        const href = a.getAttribute("href");
        a.classList.toggle("active", href === url);
      });

      if (push) history.pushState({}, "", url);

    } catch (err) {
      console.error("Nav Error:", err);
      window.location.href = url;
      return;
    }

    // 6. UNLOCK: Tiny delay to ensure browser painting is done, then fade in
    setTimeout(() => {
      document.documentElement.style.opacity = "1";
    }, 50);
  }

  /* ===============================
     LISTENERS
     =============================== */
  document.addEventListener("click", e => {
    const link = e.target.closest("a[data-spa]");
    if (!link) return;

    const url = link.getAttribute("href");
    if (!url || url.startsWith("http")) return;

    e.preventDefault();
    navigate(url);
  });

  window.addEventListener("popstate", () => {
    navigate(location.pathname, false);
  });

  // Initial Load: Fade in cleanly
  document.documentElement.style.transition = "opacity 0.3s ease";
  document.documentElement.style.opacity = "1";
})();
