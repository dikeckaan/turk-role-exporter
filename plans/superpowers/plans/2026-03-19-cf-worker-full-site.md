# Cloudflare Worker Full Site + Password-Protected Air/Marine Band

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the app to a full Cloudflare Worker site that serves both static assets and API, with password-protected Air Band and Marine Band access.

**Architecture:** The Worker serves static files from KV (Workers Sites) for non-API paths, and handles API routes including new authenticated endpoints for Air/Marine data. GitHub Pages continues to work for the static site, but Air/Marine features require the Worker API (password-gated). Frontend shows a password modal when users try to enable Air/Marine checkboxes.

**Tech Stack:** Cloudflare Workers, KV (Workers Sites), `@cloudflare/kv-asset-handler`, vanilla JS frontend

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Create | npm deps for kv-asset-handler |
| `wrangler.toml` | Create | Workers Sites config |
| `worker/index.js` | Modify | Add static asset serving + auth + protected endpoints |
| `js/frekanslar.js` | Modify | Remove AIRBAND/MARINE data, add async fetch from Worker |
| `js/api.js` | Modify | Add auth and protected data fetch functions |
| `js/app.js` | Modify | Password modal logic for Air/Marine checkboxes |
| `js/csv.js` | Modify | Handle async Air/Marine data (passed from app state) |
| `index.html` | Modify | Add password modal HTML |
| `css/style.css` | Modify | Add modal styles |

---

### Task 1: Create Branch + Project Config

**Files:**
- Create: `package.json`
- Create: `wrangler.toml`

- [ ] **Step 1: Create new branch**

```bash
git checkout -b feature/cf-worker-full-site
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "turk-role-exporter",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@cloudflare/kv-asset-handler": "^0.3.4"
  }
}
```

- [ ] **Step 3: Create wrangler.toml**

```toml
name = "turk-role-exporter"
main = "worker/index.js"
compatibility_date = "2024-01-01"

[site]
bucket = "."
exclude = ["node_modules", "worker", "docs", ".git"]

[vars]
PROTECTED_PASSWORD = "telsiz2024"
```

Note: The password should later be moved to a secret via `wrangler secret put PROTECTED_PASSWORD`.

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

- [ ] **Step 5: Add node_modules to .gitignore**

Create or update `.gitignore` with `node_modules/`.

- [ ] **Step 6: Commit**

```bash
git add package.json wrangler.toml .gitignore
git commit -m "feat: add wrangler config for Workers Sites deployment"
```

---

### Task 2: Worker — Serve Static Assets + Auth Endpoints

**Files:**
- Modify: `worker/index.js`

The Worker needs three additions:
1. Static asset serving via `getAssetFromKV` for non-API routes
2. `POST /api/auth/verify` — accepts `{ password }`, returns `{ token }` if correct
3. `GET /api/protected/airband` and `GET /api/protected/marine` — require `Authorization: Bearer <token>` header

- [ ] **Step 1: Add static asset serving to Worker**

At the top of `worker/index.js`, add the KV asset handler import. In the router's `default` case, serve static assets instead of returning 404.

```javascript
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

// In the fetch handler, replace the default 404 case:
// Before API routes check, try static assets for non-/api/ paths
if (!url.pathname.startsWith("/api/")) {
  try {
    return await getAssetFromKV(
      { request, waitUntil: ctx.waitUntil.bind(ctx) },
      {}
    );
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
```

- [ ] **Step 2: Add token generation helper**

Simple approach: HMAC-SHA256 of password with a static salt, creating a session token. The token is deterministic for a given password — no server-side session storage needed.

```javascript
async function generateToken(password, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC", key, encoder.encode(password)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyToken(token, password, secret) {
  const expected = await generateToken(password, secret);
  return token === expected;
}
```

- [ ] **Step 3: Add POST /api/auth/verify endpoint**

```javascript
case "/api/auth/verify": {
  if (request.method !== "POST") {
    return jsonResponse({ hata: "POST gerekli" }, 405);
  }
  const body = await request.json();
  const password = body?.password;
  const secret = env.PROTECTED_PASSWORD;
  if (!password || !secret || password !== secret) {
    return jsonResponse({ hata: "Yanlis sifre" }, 401);
  }
  const token = await generateToken(password, secret);
  return jsonResponse({ token });
}
```

- [ ] **Step 4: Add Air Band/Marine Band data and protected endpoints**

Move `AIRBAND_FREKANSLARI` and `MARINE_FREKANSLARI` arrays into the Worker file. Add two GET endpoints that verify the token before returning data.

```javascript
case "/api/protected/airband":
  return handleProtected(request, env, AIRBAND_FREKANSLARI);
case "/api/protected/marine":
  return handleProtected(request, env, MARINE_FREKANSLARI);
```

```javascript
async function handleProtected(request, env, data) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token || !(await verifyToken(token, env.PROTECTED_PASSWORD, env.PROTECTED_PASSWORD))) {
    return jsonResponse({ hata: "Yetkilendirme gerekli" }, 401);
  }
  return jsonResponse(data);
}
```

- [ ] **Step 5: Update router switch statement**

Add the new routes to the switch in `fetch()`:

```javascript
case "/api/auth/verify":
  return handleAuthVerify(request, env);
case "/api/protected/airband":
  return handleProtected(request, env, AIRBAND_FREKANSLARI);
case "/api/protected/marine":
  return handleProtected(request, env, MARINE_FREKANSLARI);
```

Make sure OPTIONS is handled for these new routes (CORS).

- [ ] **Step 6: Commit**

```bash
git add worker/index.js
git commit -m "feat: Worker serves static assets + auth + protected airband/marine endpoints"
```

---

### Task 3: Frontend — Auth API Functions

**Files:**
- Modify: `js/api.js`

- [ ] **Step 1: Add auth functions to api.js**

```javascript
/** Verifies password and returns auth token */
export async function sifreDogrula(password) {
  const response = await fetch(`${WORKER_BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.hata || "Dogrulama hatasi");
  }
  const { token } = await response.json();
  return token;
}

/** Fetches protected Air Band data with auth token */
export async function airbandGetir(token) {
  const response = await fetch(`${WORKER_BASE}/api/protected/airband`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Airband verisi alinamadi");
  return response.json();
}

/** Fetches protected Marine Band data with auth token */
export async function marineGetir(token) {
  const response = await fetch(`${WORKER_BASE}/api/protected/marine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Marine verisi alinamadi");
  return response.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add js/api.js
git commit -m "feat: add auth and protected data fetch functions"
```

---

### Task 4: Remove Air/Marine Data from Client-Side

**Files:**
- Modify: `js/frekanslar.js`
- Modify: `js/csv.js`

- [ ] **Step 1: Update frekanslar.js**

Remove `AIRBAND_FREKANSLARI` and `MARINE_FREKANSLARI` constants. Replace `ekKanalSayisi` and `kanalDagilimi` to accept the data as parameters instead of using the removed constants.

```javascript
// Remove lines 377-415 (AIRBAND_FREKANSLARI and MARINE_FREKANSLARI)

// Update ekKanalSayisi to accept airband/marine data
export function ekKanalSayisi(opsiyonlar) {
  let toplam = 0;
  if (opsiyonlar.pmrEkle) toplam += 16;
  if (opsiyonlar.dpmrEkle) toplam += 16;
  if (opsiyonlar.fmRadyoEkle && opsiyonlar.fmSehirler?.length > 0) {
    toplam += fmIstasyonlariGetir(opsiyonlar.fmSehirler).length;
  }
  if (opsiyonlar.airbandEkle && opsiyonlar.airbandData) {
    toplam += opsiyonlar.airbandData.length;
  }
  if (opsiyonlar.marineEkle && opsiyonlar.marineData) {
    toplam += opsiyonlar.marineData.length;
  }
  if (opsiyonlar.simplexEkle) {
    toplam += DIGITAL_SIMPLEX.uhf.length + DIGITAL_SIMPLEX.vhf.length;
  }
  return toplam;
}

// Similarly update kanalDagilimi
```

- [ ] **Step 2: Update csv.js**

Remove `AIRBAND_FREKANSLARI` and `MARINE_FREKANSLARI` imports. Use `opsiyonlar.airbandData` and `opsiyonlar.marineData` instead.

```javascript
// Remove from imports:
// AIRBAND_FREKANSLARI, MARINE_FREKANSLARI

// In chirpCsvOlustur, replace:
// AIRBAND_FREKANSLARI → opsiyonlar.airbandData || []
// MARINE_FREKANSLARI → opsiyonlar.marineData || []
```

- [ ] **Step 3: Commit**

```bash
git add js/frekanslar.js js/csv.js
git commit -m "refactor: remove airband/marine data from client, use dynamic data"
```

---

### Task 5: Password Modal UI

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add modal HTML to index.html**

Add before the closing `</body>` tag:

```html
<!-- Sifre Modali -->
<div id="sifre-modal" class="modal-overlay" style="display:none;">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Sifre Gerekli</h3>
      <button type="button" id="sifre-modal-kapat" class="modal-close">&times;</button>
    </div>
    <p class="modal-desc">Air Band ve Marine Band kanallarina erismek icin sifre girin.</p>
    <div class="modal-body">
      <input type="password" id="sifre-input" placeholder="Sifre" autocomplete="off">
      <div id="sifre-hata" class="modal-error"></div>
    </div>
    <div class="modal-footer">
      <button type="button" id="sifre-iptal" class="btn-secondary">Iptal</button>
      <button type="button" id="sifre-onayla" class="btn-primary">Giris</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add modal CSS to style.css**

```css
/* ── Password Modal ─────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.modal-header h3 {
  color: var(--accent);
  font-size: 1.1rem;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 4px;
}

.modal-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.modal-body {
  margin-bottom: 16px;
}

.modal-body input[type="password"] {
  width: 100%;
  padding: 10px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 1rem;
  outline: none;
}

.modal-body input[type="password"]:focus {
  border-color: var(--accent);
}

.modal-error {
  color: var(--error);
  font-size: 0.85rem;
  margin-top: 8px;
  min-height: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.protected-badge {
  display: inline-block;
  font-size: 0.7rem;
  padding: 1px 6px;
  background: var(--warning);
  color: #111;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
  font-weight: 600;
}

.protected-unlocked {
  background: var(--success);
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add password modal UI for protected band access"
```

---

### Task 6: Wire Up Password Logic in app.js

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add auth state and imports**

```javascript
import { sifreDogrula, airbandGetir, marineGetir } from "./api.js";

// Add to state section:
let authToken = sessionStorage.getItem("authToken") || null;
let airbandData = null;
let marineData = null;
```

- [ ] **Step 2: Add password modal handler functions**

```javascript
function sifreModaliGoster(hedefCheckboxId) {
  const modal = document.getElementById("sifre-modal");
  const input = document.getElementById("sifre-input");
  const hata = document.getElementById("sifre-hata");
  if (!modal) return;

  hata.textContent = "";
  input.value = "";
  modal.style.display = "flex";
  input.focus();
  modal.dataset.hedef = hedefCheckboxId;
}

function sifreModaliKapat() {
  const modal = document.getElementById("sifre-modal");
  if (modal) modal.style.display = "none";
}

async function sifreOnayla() {
  const modal = document.getElementById("sifre-modal");
  const input = document.getElementById("sifre-input");
  const hata = document.getElementById("sifre-hata");
  const password = input?.value;

  if (!password) { hata.textContent = "Sifre bos olamaz"; return; }

  try {
    authToken = await sifreDogrula(password);
    sessionStorage.setItem("authToken", authToken);

    // Fetch both protected datasets
    const [ab, mb] = await Promise.all([
      airbandGetir(authToken),
      marineGetir(authToken),
    ]);
    airbandData = ab;
    marineData = mb;

    sifreModaliKapat();
    korunanlariGuncelle(true);

    // Enable the checkbox that triggered the modal
    const hedef = modal.dataset.hedef;
    if (hedef) {
      const cb = document.getElementById(hedef);
      if (cb) { cb.checked = true; }
    }
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  } catch (err) {
    hata.textContent = err.message || "Sifre hatasi";
    authToken = null;
    sessionStorage.removeItem("authToken");
  }
}

function korunanlariGuncelle(unlocked) {
  document.querySelectorAll(".protected-badge").forEach((el) => {
    if (unlocked) {
      el.textContent = "Acik";
      el.classList.add("protected-unlocked");
    } else {
      el.textContent = "Sifre";
      el.classList.remove("protected-unlocked");
    }
  });
}
```

- [ ] **Step 3: Modify Air/Marine checkbox listeners**

In `dinleyicileriKur()`, replace the simple change listeners for `opsiyon-airband` and `opsiyon-marine` with password-gated ones:

```javascript
// Replace generic listener for airband/marine with password gate
["opsiyon-airband", "opsiyon-marine"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", (e) => {
    if (e.target.checked && !authToken) {
      e.target.checked = false;
      sifreModaliGoster(id);
      return;
    }
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  });
});

// Remove airband/marine from the generic listener list
// Keep: "opsiyon-pmr", "opsiyon-dpmr", "opsiyon-fmradyo",
//       "opsiyon-simplex", "opsiyon-rxonly"
```

- [ ] **Step 4: Wire modal buttons**

In `dinleyicileriKur()`:

```javascript
document.getElementById("sifre-modal-kapat")?.addEventListener("click", sifreModaliKapat);
document.getElementById("sifre-iptal")?.addEventListener("click", sifreModaliKapat);
document.getElementById("sifre-onayla")?.addEventListener("click", sifreOnayla);
document.getElementById("sifre-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sifreOnayla();
});
```

- [ ] **Step 5: Pass airband/marine data through options**

In `opsiyonTopla()`, add the protected data:

```javascript
airbandData: airbandData,
marineData: marineData,
```

- [ ] **Step 6: Auto-restore session on load**

In `basla()`, after initial setup, try to restore auth if token exists:

```javascript
if (authToken) {
  try {
    const [ab, mb] = await Promise.all([
      airbandGetir(authToken),
      marineGetir(authToken),
    ]);
    airbandData = ab;
    marineData = mb;
    korunanlariGuncelle(true);
  } catch {
    authToken = null;
    sessionStorage.removeItem("authToken");
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add js/app.js
git commit -m "feat: password-gated Air Band and Marine Band with session persistence"
```

---

### Task 7: Add Protected Badges to HTML

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add badges to Air/Marine checkbox labels**

```html
<div class="filter-group" id="opsiyon-airband-group" style="display:none;">
  <label>
    <input type="checkbox" id="opsiyon-airband" class="toggle">
    Havacilik (Air Band) Kanallari Ekle
    <span class="protected-badge">Sifre</span>
  </label>
</div>
<div class="filter-group" id="opsiyon-marine-group" style="display:none;">
  <label>
    <input type="checkbox" id="opsiyon-marine" class="toggle">
    Denizcilik (Marine Band) Kanallari Ekle
    <span class="protected-badge">Sifre</span>
  </label>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add protected badges to air/marine band options"
```

---

### Task 8: Test and Final Commit

- [ ] **Step 1: Run wrangler dev locally**

```bash
npx wrangler dev
```

Verify:
- Static site loads at localhost
- API routes still work (`/api/roleler`)
- `/api/auth/verify` returns token for correct password
- `/api/protected/airband` returns 401 without token
- `/api/protected/airband` returns data with valid token
- Air Band checkbox shows password modal
- After entering password, checkbox enables and data loads
- Page refresh preserves auth via sessionStorage

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete CF Worker full site with password-protected air/marine bands"
```
