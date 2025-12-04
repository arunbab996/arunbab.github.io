// spa-nav.js

function normalizePath(path) {
  if (!path) return "/";
  // strip trailing slash except for root
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function runPageEnterAnimations() {
  var containers = document.querySelectorAll(".page-enter");
  containers.forEach(function (el) {
    el.classList.remove("page-enter-active");
    // force reflow so animation restarts
    void el.offsetWidth;
    el.classList.add("page-enter-active");
  });
}

function setActiveNav(pathname) {
  var current = normalizePath(pathname);
  var links = document.querySelectorAll("nav.nav a[data-spa]");

  links.forEach(function (link) {
    var linkPath = normalizePath(
      new URL(link.href, window.location.origin).pathname
    );
    if (linkPath === current) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// swap <style data-page-style> blocks in <head>
function replacePageStyles(doc) {
  var head = document.head;

  // remove existing page styles
  head
    .querySelectorAll("style[data-page-style], link[data-page-style]")
    .forEach(function (el) {
      el.remove();
    });

  // add new page styles from fetched document
  doc
    .querySelectorAll("style[data-page-style], link[data-page-style]")
    .forEach(function (el) {
      head.appendChild(el.cloneNode(true));
    });
}

async function loadPage(urlString, pushState = true) {
  try {
    var url = new URL(urlString, window.location.origin);

    var response = await fetch(url.pathname + url.search, {
      headers: { "X-Requested-With": "spa-nav" },
    });

    if (!response.ok) {
      window.location.href = url.href; // fallback
      return;
    }

    var html = await response.text();

    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");

    // update page-specific styles first
    replacePageStyles(doc);

    var newMain = doc.querySelector("main#app") || doc.querySelector("main");
    var currentMain = document.querySelector("main#app");

    if (!newMain || !currentMain) {
      window.location.href = url.href; // fallback
      return;
    }

    // swap content
    currentMain.innerHTML = newMain.innerHTML;

    // update title
    if (doc.title) {
      document.title = doc.title;
    }

    // update URL without full reload
    if (pushState) {
      history.pushState(
        { path: url.pathname + url.search },
        "",
        url.pathname + url.search
      );
    }

    window.scrollTo({ top: 0, behavior: "auto" });

    setActiveNav(url.pathname);
    runPageEnterAnimations();
  } catch (err) {
    console.error("Error in loadPage:", err);
    window.location.href = urlString; // fallback
  }
}

// intercept clicks on <a data-spa>
document.addEventListener("click", function (event) {
  var link = event.target.closest("a[data-spa]");
  if (!link) return;

  var url = new URL(link.href, window.location.origin);

  // external links: let browser handle
  if (url.origin !== window.location.origin) return;

  // same-page link: do nothing
  if (
    normalizePath(url.pathname) === normalizePath(window.location.pathname) &&
    url.search === window.location.search
  ) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  loadPage(url.href);
});

// browser back/forward
window.addEventListener("popstate", function () {
  loadPage(window.location.href, false);
});

// initial setup on first full load
window.addEventListener("DOMContentLoaded", function () {
  setActiveNav(window.location.pathname);
  runPageEnterAnimations();
});
