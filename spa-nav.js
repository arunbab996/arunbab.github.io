// spa-nav.js

function runPageEnterAnimations() {
  var containers = document.querySelectorAll(".page-enter");
  containers.forEach(function (el) {
    el.classList.remove("page-enter-active");
    // force reflow to restart animation
    void el.offsetWidth;
    el.classList.add("page-enter-active");
  });
}

function setActiveNav(pathname) {
  var links = document.querySelectorAll("nav.nav a[data-spa]");
  links.forEach(function (link) {
    var linkPath = new URL(link.href, window.location.origin).pathname;
    if (linkPath === pathname) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

async function loadPage(urlString, pushState = true) {
  try {
    const url = new URL(urlString, window.location.origin);

    const response = await fetch(url.pathname + url.search, {
      headers: { "X-Requested-With": "spa-nav" },
    });

    if (!response.ok) {
      window.location.href = url.href; // fallback
      return;
    }

    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newMain = doc.querySelector("main#app") || doc.querySelector("main");
    const currentMain = document.querySelector("main#app");

    if (!newMain || !currentMain) {
      window.location.href = url.href; // fallback
      return;
    }

    currentMain.innerHTML = newMain.innerHTML;

    if (doc.title) {
      document.title = doc.title;
    }

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

// Intercept clicks on <a data-spa>
document.addEventListener("click", function (event) {
  const link = event.target.closest("a[data-spa]");
  if (!link) return;

  const url = new URL(link.href, window.location.origin);

  if (url.origin !== window.location.origin) return;

  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  loadPage(url.href);
});

// Handle browser back/forward
window.addEventListener("popstate", function () {
  loadPage(window.location.href, false);
});

// Initial run on first load
window.addEventListener("DOMContentLoaded", function () {
  setActiveNav(window.location.pathname);
  runPageEnterAnimations();
});
