document.addEventListener("DOMContentLoaded", () => {
  // 1. Get the current page URL path
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav a');

  // 2. Loop through each nav link to decide if it should be "active"
  navLinks.forEach(link => {
    // Clean up paths: remove trailing slashes for consistent matching
    // e.g. "/portfolio/" becomes "/portfolio"
    const linkPath = link.getAttribute('href').replace(/\/$/, "");
    const locationPath = currentPath.replace(/\/$/, "");

    // 3. Highlight logic:
    // - Match if paths are identical
    // - OR match if we are in a sub-section (e.g. /portfolio/specter should highlight /portfolio)
    // - EXCLUDE: Do not let Home ("/") match everything via startsWith
    if (linkPath === locationPath || (linkPath !== "" && linkPath !== "/" && locationPath.startsWith(linkPath))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }

    // 4. Double-check Safety for Home Link:
    // If the link is exactly "/" but we are NOT at the root, remove active class
    if (link.getAttribute('href') === "/" && currentPath !== "/" && currentPath !== "") {
      link.classList.remove('active');
    }
  });
});
