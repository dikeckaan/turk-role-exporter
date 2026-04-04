/**
 * theme.js
 * Dark/Light mode toggle with localStorage persistence.
 */

const STORAGE_KEY = "roleExporterTheme";

function getPreferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("theme-icon");
  const label = document.getElementById("theme-label");
  if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
  if (label) label.textContent = theme === "light" ? "Koyu Tema" : "Acik Tema";
}

export function themeBaslat() {
  applyTheme(getPreferredTheme());

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });

  // Listen for OS theme changes
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? "light" : "dark");
    }
  });
}
