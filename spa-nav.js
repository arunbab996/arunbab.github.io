(() => {
  const READY_CLASS = "ready";

  function lock() {
    document.documentElement.classList.remove(READY_CLASS);
  }

  function unlock() {
    // Small buffer to allow the browser to paint the new layout
    // and let scripts initiate before showing the page.
    setTimeout(() => {
      document.documentElement.classList.add(READY_CLASS);
    }, 50);
  }

  async function navigate(url, push = true) {
    lock();

    try {
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      /* ===============================
         1. SCROLL TO TOP (Crucial for Articles)
         =============================== */
      window.scrollTo(0, 0);

      /* ===============================
         2. SWAP STYLES (Safer Order)
         Load new CSS -> Then remove old CSS.
         Prevents "Unstyled" flashes.
         =============================== */
      const newStyles = doc.querySelectorAll("style[data-page-style]");
      newStyles.forEach(style => {
        document.head.appendChild(style.cloneNode(true));
      });

      // Give browser a micro-task to recognize new styles before deleting old ones
      const oldStyles = document.querySelectorAll("style[data-page-style]");
      
      /* ===============================
         3. SWAP MAIN CONTENT
         =============================== */
      const newMain = doc.querySelector("main");
      const currentMain = document.querySelector("main");

      if (!newMain || !currentMain) {
        window.location.href = url;
        return;
      }

      currentMain.replaceWith(newMain);

      // Now safe to remove old styles
      oldStyles.forEach(s => s.remove());

      /* ===============================
         4. RE-RUN PAGE SCRIPTS
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
         5. UPDATE ACTIVE NAV STATE
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
     LINK INTERCEPTION
     =============================== */
  document.addEventListener("click", e => {
    const link = e.target.closest("a[data-spa]");
    if (!link) return;

    const url = link.getAttribute("href");
    if (!url || url.startsWith("http")) return;

    e.preventDefault();
    navigate(url);
  });

  /* ===============================
     BACK / FORWARD
     =============================== */
  window.addEventListener("popstate", () => {
    navigate(location.pathname, false);
  });

  /* ===============================
     INITIAL STATE
     =============================== */
  // Slight delay on initial load too, just to be smooth
  setTimeout(() => {
    document.documentElement.classList.add(READY_CLASS);
  }, 50);

})();
