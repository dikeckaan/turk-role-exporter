/**
 * banner.js
 * Error/warning banner display and retry logic.
 */

let _retryCallback = null;

export function bannerRetryCallbackAta(fn) {
  _retryCallback = fn;
}

export function bannerGoster(tip, mesaj) {
  const container = document.getElementById("banner-container");
  if (!container) return;
  container.replaceChildren();
  const banner = document.createElement("div");
  banner.className = "banner banner-" + tip;
  const span = document.createElement("span");
  span.textContent = mesaj;
  banner.appendChild(span);
  const btn = document.createElement("button");
  btn.className = "btn-secondary";
  btn.textContent = "Tekrar Dene";
  btn.addEventListener("click", () => { if (_retryCallback) _retryCallback(); });
  banner.appendChild(btn);
  container.appendChild(banner);
}

export function bannerGizle() {
  const container = document.getElementById("banner-container");
  if (container) container.replaceChildren();
}
