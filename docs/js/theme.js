/**
 * theme.js
 * Multi-theme picker with FAB + popover menu.
 * Initial theme follows OS preference (prefers-color-scheme).
 */

const STORAGE_KEY = "roleExporterTheme";

const THEMES = [
  { id: "dark-pure",     ad: "Pure Dark",  swatch: "#0a0a0a" },
  { id: "dark-navy",     ad: "Navy Dark",  swatch: "#1a1a2e" },
  { id: "dark-charcoal", ad: "Komur Dark", swatch: "#15151a" },
  { id: "light",         ad: "Acik",       swatch: "#f0f2f5" },
];

function isValid(id) {
  return THEMES.some((t) => t.id === id);
}

function getPreferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && isValid(saved)) return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark-pure";
}

function applyTheme(id) {
  if (id === "dark-pure") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
  document.querySelectorAll(".theme-option").forEach((el) => {
    el.classList.toggle("active", el.dataset.theme === id);
  });
}

function buildMenu(menuEl) {
  // Clear any existing children then rebuild via DOM API (no innerHTML).
  while (menuEl.firstChild) menuEl.removeChild(menuEl.firstChild);

  for (const t of THEMES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-option";
    btn.dataset.theme = t.id;
    btn.setAttribute("role", "menuitemradio");

    const swatch = document.createElement("span");
    swatch.className = "theme-swatch";
    swatch.style.background = t.swatch;

    const label = document.createElement("span");
    label.textContent = t.ad;

    btn.appendChild(swatch);
    btn.appendChild(label);
    menuEl.appendChild(btn);
  }
}

export function themeBaslat() {
  const fab = document.getElementById("theme-fab");
  const menu = document.getElementById("theme-menu");
  if (!fab || !menu) {
    applyTheme(getPreferredTheme());
    return;
  }

  buildMenu(menu);
  applyTheme(getPreferredTheme());

  fab.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });

  menu.addEventListener("click", (e) => {
    const btn = e.target.closest(".theme-option");
    if (!btn) return;
    const id = btn.dataset.theme;
    if (!isValid(id)) return;
    localStorage.setItem(STORAGE_KEY, id);
    applyTheme(id);
    menu.hidden = true;
  });

  document.addEventListener("click", (e) => {
    if (menu.hidden) return;
    if (e.target.closest("#theme-menu, #theme-fab")) return;
    menu.hidden = true;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") menu.hidden = true;
  });

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? "light" : "dark-pure");
    }
  });
}
