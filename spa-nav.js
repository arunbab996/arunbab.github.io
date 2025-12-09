document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial Load: Highlight tab & load books if on bookshelf
  updateActiveNav();
  checkAndRenderBooks();

  // 2. Intercept clicks (SPA Navigation)
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-spa]");
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;

    e.preventDefault();
    const href = link.getAttribute("href");

    if (href === window.location.pathname) return;

    navigateTo(href);
  });

  // 3. Handle Back Button
  window.addEventListener("popstate", () => {
    window.location.reload();
  });
});

function navigateTo(url) {
  fetch(url)
    .then((response) => response.text())
    .then((html) => {
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, "text/html");

      // --- A. SWAP STYLES (Prevents Layout Glitch) ---
      const newStyles = newDoc.querySelector("style[data-page-style]");
      const oldStyles = document.querySelector("style[data-page-style]");
      if (newStyles && oldStyles) {
        oldStyles.textContent = newStyles.textContent;
      }

      // --- B. SWAP CONTENT ---
      const newContent = newDoc.querySelector("main").innerHTML;
      document.querySelector("main").innerHTML = newContent;

      // Update Title
      document.title = newDoc.title;

      // --- C. UPDATE STATE ---
      history.pushState({}, "", url);
      updateActiveNav();
      window.scrollTo(0, 0);

      // --- D. RENDER BOOKS (If navigated to Bookshelf) ---
      checkAndRenderBooks();
    })
    .catch((err) => {
      console.error("SPA Navigation failed:", err);
      window.location.href = url; // Fallback
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

    if (link.getAttribute("href") === "/" && currentPath !== "/") {
      link.classList.remove("active");
    } else if (isActive) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// --- BOOKSHELF RENDERER ---
function checkAndRenderBooks() {
  const container = document.getElementById("books-container");
  
  // If no container, we aren't on the bookshelf page. Stop.
  if (!container) return;

  // 🔴 PASTE YOUR SPREADSHEET ID HERE 🔴
  const sheetID = "1IY-ictcATAZNfcJajwkKCJlT7-b7SBwPl_q2RZ4ntCc"; 
  const tabName = "Latest"; 
  const endpoint = `https://opensheet.elk.sh/${sheetID}/${tabName}`;

  fetch(endpoint)
    .then(res => res.json())
    .then(books => {
      container.innerHTML = "";
      
      if (!Array.isArray(books)) {
        console.error("Data error:", books);
        container.innerHTML = "Error loading library.";
        return;
      }

      books.forEach((book, index) => {
        if (!book.title) return; // Skip empty rows

        const article = document.createElement("article");
        article.className = "book-card";
        
        // Stagger Animation Delay (0.05s per book)
        article.style.animationDelay = `${0.05 * (index + 1)}s`;

        // Optional: Check if book has a 'link' column in sheet
        const hasLink = book.link && book.link.startsWith('http');
        
        // Build the HTML structure exactly matching your original design
        article.innerHTML = `
          ${hasLink ? `<a href="${book.link}" target="_blank" style="text-decoration:none; color:inherit;">` : ''}
            <div class="book-cover">
              <img src="${book.cover}" alt="${book.title}" loading="lazy">
            </div>
            <div class="book-meta">
              <div class="book-title">${book.title}</div>
              <div class="book-author">${book.author}</div>
            </div>
          ${hasLink ? `</a>` : ''}
        `;
        container.appendChild(article);
      });
    })
    .catch(err => {
      console.error("Fetch error:", err);
      container.innerHTML = "Unable to load books.";
    });
}
