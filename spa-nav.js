// spa-nav.js

function runPageEnterAnimations() {
  var containers = document.querySelectorAll(".page-enter");
  containers.forEach(function (el) {
    el.classList.remove("page-enter-active");
    void el.offsetWidth; // force reflow
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
      window.location.href = url.href;
      return;
    }

    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newMain = doc.querySelector("main#app") || doc.querySelector("main");
    const currentMain = document.querySelector("main#app");

    if (!newMain || !currentMain) {
      window.location.href = url.href;
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
    window.location.href = urlString;
  }
}

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

window.addEventListener("popstate", function () {
  loadPage(window.location.href, false);
});

window.addEventListener("DOMContentLoaded", function () {
  setActiveNav(window.location.pathname);
  // your inline scripts already handle first animation,
  // this just makes sure SPA nav re-uses the same behaviour
});
