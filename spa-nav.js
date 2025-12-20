(() => {
  // Define your main header paths here. 
  // These will load INSTANTLY (no blank screen).
  const MAIN_PAGES = [
    "/",
    "/index.html",
    "/portfolio", "/portfolio/",
    "/bookshelf", "/bookshelf/",
    "/principles", "/principles/",
    "/photography", "/photography/"
  ];

  async function navigate(url, push = true) {
    // Clean up the URL to check against our list
    const path = url.split("?")[0].split("#")[0];
    
    // Check: Is this a Main Page?
    // If YES: We skip the "fade out" so it feels instant.
    // If NO (Articles): We keep the "fade out" to prevent glitches.
    const isMainPage = MAIN_PAGES.some(p => path === p || path === p.replace(/\/$/, ""));

    if (!isMainPage) {
      // THE "HARD WIPE" (Only for Articles)
      document.documentElement.style.transition = "opacity 0.15s ease";
      document.documentElement.style.opacity = "0";
      await new Promise(r => setTimeout(r, 150));
    }

    try {
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      /* ===============================
         SWAP STYLES
         =============================== */
      document.querySelectorAll("style[data-page-style]").forEach(s => s.remove());
      doc.querySelectorAll("style[data-page-style]").forEach(style => {
        document.head.appendChild(style.cloneNode(true));
      });

      /* ===============================
         SWAP CONTENT
         =============================== */
      const newMain = doc.querySelector("main");
      const currentMain = document.querySelector("main");

      if (!newMain || !currentMain) {
        window.location.href = url;
        return;
      }

      currentMain.replaceWith(newMain);

      // Always scroll to top
      window.scrollTo(0, 0);

      /* ===============================
         RE-RUN SCRIPTS
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
         UPDATE NAV
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

    // IF we hid the page (for an article), reveal it now.
    // IF we didn't hide it (main page), this does nothing (opacity is already 1).
    if (!isMainPage) {
      setTimeout(() => {
        document.documentElement.style.opacity = "1";
      }, 50);
    }
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

  // Initial Load
  document.documentElement.style.opacity = "1";
})();
