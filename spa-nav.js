document.addEventListener("click", async (e) => {
  const link = e.target.closest("a[data-spa]");
  if (!link) return;

  const url = link.getAttribute("href");
  if (!url || url.startsWith("http")) return;

  e.preventDefault();

  // lock body to prevent FOUC
  document.documentElement.classList.add("spa-loading");

  try {
    const res = await fetch(url);
    const text = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    // Replace <main> ONLY
    const newMain = doc.querySelector("main");
    const currentMain = document.querySelector("main");
    if (newMain && currentMain) {
      currentMain.replaceWith(newMain);
    }

    // Update active nav state
    document.querySelectorAll(".nav a").forEach(a =>
      a.classList.toggle("active", a.getAttribute("href") === url)
    );

    history.pushState({}, "", url);
  } catch (err) {
    window.location.href = url;
  } finally {
    // unlock paint AFTER layout stabilizes
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("spa-loading");
    });
  }
});

window.addEventListener("popstate", () => location.reload());
