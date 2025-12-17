(() => {
  const READY_CLASS = "ready";
  const LOADING_CLASS = "spa-loading";

  function lock() {
    document.documentElement.classList.remove(READY_CLASS);
    document.documentElement.classList.add(LOADING_CLASS);
  }

  function unlock() {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove(LOADING_CLASS);
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

      // 🔒 NEVER touch <head>
      const newMain = doc.querySelector("main");
      const currentMain = document.querySelector("main");

      if (!newMain || !currentMain) {
        window.location.href = url;
        return;
      }

      currentMain.replaceWith(newMain);

      // Update active nav
      document.querySelectorAll(".nav a").forEach(a => {
        const href = a.getAttribute("href");
        a.classList.toggle("active", href === url);
      });

      if (push) history.pushState({}, "", url);
    } catch (err) {
      window.location.href = url;
      return;
    }

    unlock();
  }

  // Intercept SPA links
  document.addEventListener("click", e => {
    const link = e.target.closest("a[data-spa]");
    if (!link) return;

    const url = link.getAttribute("href");
    if (!url || url.startsWith("http")) return;

    e.preventDefault();
    navigate(url);
  });

  // Back / forward support
  window.addEventListener("popstate", () => {
    navigate(location.pathname, false);
  });

  // Initial ready
  document.documentElement.classList.add(READY_CLASS);
})();
