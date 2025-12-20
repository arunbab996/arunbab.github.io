(() => {
  const READY_CLASS = "ready";

  function lock() {
    document.documentElement.classList.remove(READY_CLASS);
  }

  function unlock() {
    requestAnimationFrame(() => {
      document.documentElement.classList.add(READY_CLASS);
    });
  }

  async function navigate(url, push = true) {
    lock();

    try {
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      /* ===============================
         1. SWAP STYLES (Standard Method)
         =============================== */
      // Remove old page-specific styles
      document.querySelectorAll("style[data-page-style]").forEach(s => s.remove());

      // Add new page-specific styles
      doc.querySelectorAll("style[data-page-style]").forEach(style => {
        document.head.appendChild(style.cloneNode(true));
      });

      /* ===============================
         2. SWAP MAIN CONTENT
         =============================== */
      const newMain = doc.querySelector("main");
      const currentMain = document.querySelector("main");

      if (!newMain || !currentMain) {
        window.location.href = url; // Fallback if structure differs
        return;
      }

      currentMain.replaceWith(newMain);

      /* ===============================
         3. SCROLL TO TOP (Kept this fix)
         =============================== */
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
         5. UPDATE NAV HIGHLIGHT
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

    unlock();
  }

  /* ===============================
     EVENT LISTENERS
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

  // Initial Ready State
  document.documentElement.classList.add(READY_CLASS);
})();
