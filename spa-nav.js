/**
 * Robust SPA nav with defensive fetch retries
 * - tries multiple URL variants if first fetch returns non-HTML / empty body
 * - imports style/link/script tags with data-page-style
 * - falls back to full navigation if all fails
 *
 * Drop-in replacement for your current spa-nav.js
 */
(function () {
  "use strict";

  // ---------- Helpers ----------
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

  // Remove and insert page-scoped styles/scripts
  function replacePageAssets(parsedDoc) {
    var head = document.head;
    // remove old assets
    head.querySelectorAll("style[data-page-style], link[data-page-style], script[data-page-style]")
      .forEach(function (el) { el.remove(); });

    // append new assets in order they appear
    var newAssets = parsedDoc.querySelectorAll("style[data-page-style], link[data-page-style], script[data-page-style]");
    newAssets.forEach(function (asset) {
      if (asset.tagName.toLowerCase() === "script") {
        // re-create script so it executes
        var s = document.createElement("script");
        Array.from(asset.attributes).forEach(function (attr) {
          s.setAttribute(attr.name, attr.value);
        });
        s.textContent = asset.textContent;
        head.appendChild(s);
      } else {
        head.appendChild(asset.cloneNode(true));
      }
    });
  }

  // preload images within a node
  function preloadImagesWithin(node) {
    var imgs = Array.from(node.querySelectorAll("img")).map(function (img) { return img.getAttribute("src"); }).filter(Boolean);
    if (!imgs.length) return Promise.resolve();
    var loads = imgs.map(function (src) {
      return new Promise(function (resolve) {
        try {
          var i = new Image();
          i.onload = function () { resolve(); };
          i.onerror = function () { resolve(); };
          i.src = src;
        } catch (e) { resolve(); }
      });
    });
    return Promise.all(loads);
  }

  function extractTitleFromDoc(doc) {
    var t = doc.querySelector("title");
    return t ? t.textContent : document.title;
  }

  function stripScripts(node) {
    node.querySelectorAll("script").forEach(function (s) { s.remove(); });
  }

  // sanity-check whether fetched text looks like a usable HTML page
  function looksLikeHtml(text) {
    if (!text || text.trim().length === 0) return false;
    var low = text.toLowerCase();
    // quick checks: contains html/body/doctype or the critical fragment marker
    return low.indexOf("<!doctype") !== -1 || low.indexOf("<html") !== -1 ||
           low.indexOf("<body") !== -1 || low.indexOf("class=\"page-enter\"") !== -1 ||
           low.indexOf("main id=\"app\"") !== -1;
  }

  // parse HTML text to document
  function parseHtml(text) {
    var parser = new DOMParser();
    return parser.parseFromString(text, "text/html");
  }

  // Try fetching the URL and return parsed doc or null
  async function tryFetchVariants(urls) {
    for (var i = 0; i < urls.length; i++) {
      var u = urls[i];
      try {
        var res = await fetch(u, { headers: { "X-Requested-With": "spa-nav" }, redirect: "follow", credentials: "include" });
        // Accept non-ok only if it returns usable body; otherwise continue to next variant
        var text = await res.text();
        if (!looksLikeHtml(text)) {
          // try next variant
          continue;
        }
        // parsed doc
        return parseHtml(text);
      } catch (err) {
        // network error -> try next variant
        continue;
      }
    }
    return null;
  }

  // Build candidate URL variants (ordered by preference)
  function buildVariants(requestHref) {
    try {
      var base = new URL(requestHref, window.location.origin);
      var pathname = base.pathname;
      var variants = [];

      // 1) exact href (as provided)
      variants.push(base.href);

      // 2) ensure trailing slash version
      if (!pathname.endsWith("/")) {
        variants.push(new URL(pathname + "/", window.location.origin).href);
      } else {
        // if already ended with slash, also try without
        variants.push(new URL(pathname.slice(0, -1), window.location.origin).href);
      }

      // 3) append index.html
      var idx = pathname.endsWith("/") ? pathname + "index.html" : pathname + "/index.html";
      variants.push(new URL(idx, window.location.origin).href);

      // 4) normalized pathname with index.html
      variants.push(new URL(normalizePath(pathname) + "/index.html", window.location.origin).href);

      // Deduplicate while preserving order
      return variants.filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    } catch (e) {
      return [requestHref];
    }
  }

  // Extract fragment to inject: prefer .page-enter (non-empty), else main#app, else whole body inner
  function findReplacementFragment(parsedDoc) {
    var fragment = parsedDoc.querySelector(".page-enter");
    if (fragment && fragment.innerHTML.trim().length > 0) return fragment;
    var main = parsedDoc.querySelector("main#app") || parsedDoc.querySelector("main");
    if (main && main.innerHTML.trim().length > 0) return main;
    // last resort: body
    var body = parsedDoc.querySelector("body");
    return body || null;
  }

  // Core load
  async function loadPage(href, pushState = true) {
    var url;
    try {
      url = new URL(href, window.location.origin);
    } catch (e) {
      window.location.href = href;
      return;
    }

    // Build candidate URLs
    var variants = buildVariants(url.href);

    // Try fetching variants until a valid HTML doc is returned
    var parsedDoc = await tryFetchVariants(variants);
    if (!parsedDoc) {
      // fallback to full navigation
      window.location.href = url.href;
      return;
    }

    // Replace page assets (styles/scripts)
    try {
      replacePageAssets(parsedDoc);
    } catch (e) {
      // if asset replacement fails, fallback to full nav
      console.error("replacePageAssets failed", e);
      window.location.href = url.href;
      return;
    }

    // Choose fragment
    var replacementNode = findReplacementFragment(parsedDoc);
    if (!replacementNode) {
      window.location.href = url.href;
      return;
    }

    // Clone & sanitize
    var safeClone = replacementNode.cloneNode(true);
    stripScripts(safeClone);

    // Preload images inside clone
    try { await preloadImagesWithin(safeClone); } catch (e) {}

    // Find current main
    var currentMain = document.querySelector("main#app") || document.querySelector("main");
    if (!currentMain) {
      window.location.href = url.href;
      return;
    }

    // Hide current to avoid flicker
    currentMain.style.visibility = "hidden";
    currentMain.classList.remove("page-enter-active");
    await new Promise(requestAnimationFrame);

    // Replace content
    currentMain.innerHTML = safeClone.innerHTML;

    // Update title
    var newTitle = extractTitleFromDoc(parsedDoc);
    if (newTitle) {
      try { document.title = newTitle; } catch (e) {}
    }

    // History
    if (pushState) {
      history.pushState({ path: url.pathname + url.search }, "", url.pathname + url.search);
    }

    // Reveal & animate
    currentMain.style.visibility = "visible";
    requestAnimationFrame(function () { currentMain.classList.add("page-enter-active"); });

    // Scroll top
    window.scrollTo({ top: 0, behavior: "auto" });

    // Update nav and animations
    setActiveNav(url.pathname);
    runPageEnterAnimations(currentMain);
  }

  // Click delegation
  document.addEventListener("click", function (event) {
    // find nearest anchor with data-spa
    var link = event.target.closest("a");
    if (!link) return;

    // honor data-no-spa
    if (link.hasAttribute("data-no-spa")) return;

    // only intercept links explicitly marked with data-spa
    if (!link.hasAttribute("data-spa")) return;

    // modifier keys/new tab => let browser handle
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var href = link.getAttribute("href");
    if (!href) return;

    // external origin => let browser handle
    try {
      var u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return;
    } catch (e) {
      return;
    }

    // if same path+search => prevent default but noop
    if (normalizePath(u.pathname) === normalizePath(window.location.pathname) && u.search === window.location.search) {
      event.preventDefault(); return;
    }

    event.preventDefault();
    loadPage(href, true);
  });

  // popstate
  window.addEventListener("popstate", function () {
    loadPage(window.location.href, false);
  });

  // initial setup
  window.addEventListener("DOMContentLoaded", function () {
    setActiveNav(window.location.pathname);
    runPageEnterAnimations();
  });

})();
