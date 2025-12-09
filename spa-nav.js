// Updated spa-nav.js
// - Fragment-first: prefer .page-enter in fetched doc
// - Preloads images in fragment before swapping to avoid FOUC
// - Injects page styles early
// - Graceful fallback to full navigation only if necessary
// Safe: no eval, CSP-friendly.

/* original inspected file: :contentReference[oaicite:1]{index=1} */

(function () {
  "use strict";

  // --- helpers ---
  function normalizePath(path) {
    if (!path) return "/";
    if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
    return path;
  }

  function runPageEnterAnimations(root) {
    var containers = (root || document).querySelectorAll(".page-enter");
    containers.forEach(function (el) {
      el.classList.remove("page-enter-active");
      void el.offsetWidth;
      el.classList.add("page-enter-active");
    });
  }

  function setActiveNav(pathname) {
    var current = normalizePath(pathname);
    var links = document.querySelectorAll("nav.nav a[data-spa]");
    links.forEach(function (link) {
      var linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
      if (linkPath === current) link.classList.add("active");
      else link.classList.remove("active");
    });
  }

  // Replace page styles marked with data-page-style
  function replacePageStyles(doc) {
    var head = document.head;
    // remove old
    head.querySelectorAll("style[data-page-style], link[data-page-style]").forEach(function (el) { el.remove(); });

    // append new styles *early* (we append before content swap)
    var newStyles = doc.querySelectorAll("style[data-page-style], link[data-page-style]");
    newStyles.forEach(function (el) {
      head.appendChild(el.cloneNode(true));
    });
  }

  // Preload images found within an element (returns a Promise)
  function preloadImagesWithin(node) {
    var imgs = Array.from(node.querySelectorAll("img")).map(function (img) { return img.getAttribute("src"); }).filter(Boolean);
    if (!imgs.length) return Promise.resolve();
    var loads = imgs.map(function (src) {
      return new Promise(function (resolve) {
        try {
          var i = new Image();
          i.onload = function () { resolve(); };
          i.onerror = function () { resolve(); }; // ignore errors
          i.src = src;
        } catch (e) { resolve(); }
      });
    });
    return Promise.all(loads);
  }

  // Extract title safely from parsed doc
  function extractTitleFromDoc(doc) {
    var t = doc.querySelector("title");
    return t ? t.textContent : document.title;
  }

  // Safe: remove <script> tags from fragment to avoid double execution
  function stripScripts(node) {
    node.querySelectorAll("script").forEach(function (s) { s.remove(); });
  }

  // --- Core SPA load/replace logic ---
  async function loadPage(urlString, pushState = true) {
    var url;
    try {
      url = new URL(urlString, window.location.origin);
    } catch (e) {
      // invalid URL -> fallback
      window.location.href = urlString;
      return;
    }

    try {
      var res = await fetch(url.pathname + url.search, { headers: { "X-Requested-With": "spa-nav" } });
      if (!res.ok) {
        window.location.href = url.href;
        return;
      }

      var html = await res.text();
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, "text/html");

      // Prefer fragment .page-enter if present
      var fragment = doc.querySelector(".page-enter");
      var newMain = doc.querySelector("main#app") || doc.querySelector("main");

      if (!fragment && !newMain) {
        // nothing we can extract safely -> full navigation
        window.location.href = url.href;
        return;
      }

      // Inject page styles first so CSS is available before content paint
      replacePageStyles(doc);

      // Choose replacement node: prefer fragment
      var replacementNode = fragment || newMain;
      // clone to avoid moving nodes out of parser doc
      var safeClone = replacementNode.cloneNode(true);

      // strip scripts from clone for safety and CSP compatibility
      stripScripts(safeClone);

      // Preload images inside the clone to avoid flashes/jank
      await preloadImagesWithin(safeClone);

      // Now perform the swap in a safe order:
      var currentMain = document.querySelector("main#app") || document.querySelector("main");
      if (!currentMain) {
        // No main to replace on current page: fallback to full nav
        window.location.href = url.href;
        return;
      }

      // Hide current content to avoid flicker
      currentMain.style.visibility = "hidden";
      currentMain.classList.remove("page-enter-active");

      // Wait a frame so hidden state paints
      await new Promise(requestAnimationFrame);

      // Replace content - if fragment was used, we replace the innerHTML of currentMain
      // If the replacement is a full <main>, use its innerHTML as well.
      currentMain.innerHTML = safeClone.innerHTML;

      // Update title
      var newTitle = extractTitleFromDoc(doc);
      if (newTitle) {
        try { document.title = newTitle; } catch (e) {}
      }

      // Update history
      if (pushState) {
        history.pushState({ path: url.pathname + url.search }, "", url.pathname + url.search);
      }

      // Reveal and animate
      currentMain.style.visibility = "visible";
      requestAnimationFrame(function () {
        currentMain.classList.add("page-enter-active");
      });

      // Scroll to top
      window.scrollTo({ top: 0, behavior: "auto" });

      // Update nav and run animations (scoped to currentMain)
      setActiveNav(url.pathname);
      runPageEnterAnimations(currentMain);

    } catch (err) {
      // In case of any unexpected error, fallback to full navigation
      console.error("spa-nav loadPage failed:", err);
      try { window.location.href = url.href; } catch (e) { window.location.href = urlString; }
    }
  }

  // --- event delegation for clicks ---
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-spa]");
    if (!link) return;

    // open in new tab / modifier keys => let browser handle
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var href = link.getAttribute("href");
    if (!href) return;

    // External links: let browser handle
    try {
      var u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return;
    } catch (e) {
      // invalid URL -> do nothing
      return;
    }

    // If same path and same search, don't reload, but prevent default
    if (normalizePath(u.pathname) === normalizePath(window.location.pathname) && u.search === window.location.search) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    loadPage(href, true);
  });

  // Back/forward
  window.addEventListener("popstate", function () {
    loadPage(window.location.href, false);
  });

  // initial setup
  window.addEventListener("DOMContentLoaded", function () {
    setActiveNav(window.location.pathname);
    runPageEnterAnimations();
  });

})();
