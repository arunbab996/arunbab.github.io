/**
 * SPA Navigation Script (Fully Patched)
 * -------------------------------------
 * Fixes:
 * - Blank portfolio page
 * - Missing CSS after SPA navigation
 * - Missing page-enter animations
 * - Style desync after loading project pages
 *
 * Adds:
 * - Full import of <style data-page-style>, <link data-page-style>, <script data-page-style>
 * - Removes previous page styles & scripts
 * - Stable SPA fallback logic
 */

(function () {
  // Utility to fetch and parse HTML
  function fetchPage(url) {
    return fetch(url, { credentials: "include" })
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        return parser.parseFromString(html, "text/html");
      });
  }

  /**
   * Replace page-specific styles & scripts
   * --------------------------------------
   * We completely remove previous <style data-page-style>,
   * <link data-page-style>, and <script data-page-style>.
   *
   * Then we insert the new ones in the same order they appear in the document.
   */
  function replacePageStyles(doc) {
    const head = document.head;

    // Remove all old page-scoped assets
    head.querySelectorAll(
      'style[data-page-style], link[data-page-style], script[data-page-style]'
    ).forEach(el => el.remove());

    // Insert new ones
    const newAssets = doc.querySelectorAll(
      'style[data-page-style], link[data-page-style], script[data-page-style]'
    );

    newAssets.forEach(asset => {
      const clone = asset.cloneNode(true);

      // Re-run scripts (otherwise they remain inert)
      if (clone.tagName.toLowerCase() === "script") {
        const freshScript = document.createElement("script");
        Array.from(clone.attributes).forEach(attr =>
          freshScript.setAttribute(attr.name, attr.value)
        );
        freshScript.textContent = clone.textContent;
        head.appendChild(freshScript);
      } else {
        head.appendChild(clone);
      }
    });
  }

  /**
   * Extracts page content for injection
   */
  function extractPageContent(doc) {
    // Try to find .page-enter first (your page wrapper)
    let fragment = doc.querySelector(".page-enter");

    // Fallback to <main id="app"> if .page-enter is missing or empty
    if (!fragment || fragment.innerHTML.trim().length === 0) {
      fragment = doc.querySelector("main#app");
    }

    return fragment ? fragment.innerHTML : "";
  }

  /**
   * Perform the page transition
   */
  function navigateTo(url) {
    fetchPage(url).then(doc => {
      // Update styles/scripts first
      replacePageStyles(doc);

      // Extract content
      const newContent = extractPageContent(doc);
      const app = document.querySelector("main#app");

      // Replace content
      app.innerHTML = newContent;

      // Ensure page-enter animation triggers
      requestAnimationFrame(() => {
        const wrapper = document.querySelector(".page-enter");
        wrapper?.classList.add("page-enter-active");
      });

      // Update URL without full reload
      window.history.pushState({}, "", url);
    });
  }

  /**
   * Intercept link clicks
   */
  function handleLinkClick(event) {
    const link = event.target.closest("a");

    if (!link) return;

    // If no-spa, let browser do full load
    if (link.hasAttribute("data-no-spa")) return;

    // Only intercept internal links with data-spa
    if (!link.hasAttribute("data-spa")) return;

    event.preventDefault();
    const url = link.getAttribute("href");
    navigateTo(url);
  }

  /**
   * Handle browser back/forward
   */
  window.addEventListener("popstate", () => {
    navigateTo(window.location.pathname);
  });

  /**
   * Bind listener
   */
  document.addEventListener("click", handleLinkClick);
})();
