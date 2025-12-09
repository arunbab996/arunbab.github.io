document.addEventListener("DOMContentLoaded", () => {
  // 1. Highlight the correct tab on first load
  updateActiveNav();

  // 2. Intercept clicks
  document.body.addEventListener("click", (e) => {
    // Only target links with the data-spa attribute
    const link = e.target.closest("a[data-spa]");
    
    // Ignore if not an SPA link, or if holding Ctrl/Cmd (new tab)
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;

    e.preventDefault();
    const href = link.getAttribute("href");

    // Don't reload if we are already on this page
    if (href === window.location.pathname) return;

    // Execute the swap
    navigateTo(href);
  });

  // 3. Handle Back Button (Reloads to ensure clean state)
  window.addEventListener("popstate", () => {
    window.location.reload();
  });
});

function navigateTo(url) {
  fetch(url)
    .then((response) => response.text())
    .then((html) => {
      // Parse the new HTML
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, "text/html");

      // --- CRITICAL STEP: SWAP STYLES FIRST ---
      // This prevents the "Home page looking broken" glitch.
      // We take the CSS from the new page and overwrite the current page's CSS.
      const newStyles = newDoc.querySelector("style[data-page-style]");
      const oldStyles = document.querySelector("style[data-page-style]");
      
      if (newStyles && oldStyles) {
        oldStyles.textContent = newStyles.textContent;
      }

      // --- SWAP CONTENT ---
      // Replace the Main container
      const newContent = newDoc.querySelector("main").innerHTML;
      document.querySelector("main").innerHTML = newContent;

      // Update Title
      document.title = newDoc.title;

      // --- UPDATE STATE ---
      history.pushState({}, "", url);
      updateActiveNav();
      window.scrollTo(0, 0);
      
      // Note: Your CSS .stagger-wrapper animation will automatically 
      // trigger here because the new DOM elements were just added.
    })
    .catch((err) => {
      console.error("SPA Navigation failed:", err);
      window.location.href = url; // Fallback to normal reload
    });
}

function updateActiveNav() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav a");

  navLinks.forEach((link) => {
    const linkPath = link.getAttribute("href").replace(/\/$/, "");
    const locationPath = currentPath.replace(/\/$/, "");

    // Logic: Exact match OR Sub-path match
    const isActive =
      linkPath === locationPath ||
      (linkPath !== "" && linkPath !== "/" && locationPath.startsWith(linkPath));

    // Safety: Don't highlight Home "/" on sub-pages
    if (link.getAttribute("href") === "/" && currentPath !== "/") {
      link.classList.remove("active");
    } else if (isActive) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}
