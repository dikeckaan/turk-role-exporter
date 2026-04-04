/**
 * undo.js
 * Simple undo/redo stack for CSV table edits.
 */

const MAX_UNDO = 20;
let undoStack = [];
let redoStack = [];

export function undoKaydet(csvSatirlar) {
  undoStack.push(JSON.parse(JSON.stringify(csvSatirlar)));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  butonDurumGuncelle();
}

export function undoYap(state) {
  if (undoStack.length === 0) return false;
  redoStack.push(JSON.parse(JSON.stringify(state.csvSatirlar)));
  state.csvSatirlar = undoStack.pop();
  butonDurumGuncelle();
  return true;
}

export function redoYap(state) {
  if (redoStack.length === 0) return false;
  undoStack.push(JSON.parse(JSON.stringify(state.csvSatirlar)));
  state.csvSatirlar = redoStack.pop();
  butonDurumGuncelle();
  return true;
}

export function undoTemizle() {
  undoStack = [];
  redoStack = [];
  butonDurumGuncelle();
}

function butonDurumGuncelle() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

export function undoUiKur(containerEl, state, csvTabloYenileFn) {
  if (!containerEl) return;

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.id = "undo-btn";
  undoBtn.className = "btn-secondary btn-sm";
  undoBtn.textContent = "↩ Geri Al";
  undoBtn.disabled = true;
  undoBtn.setAttribute("aria-label", "Geri al (Ctrl+Z)");

  const redoBtn = document.createElement("button");
  redoBtn.type = "button";
  redoBtn.id = "redo-btn";
  redoBtn.className = "btn-secondary btn-sm";
  redoBtn.textContent = "↪ Ileri Al";
  redoBtn.disabled = true;
  redoBtn.setAttribute("aria-label", "Ileri al (Ctrl+Shift+Z)");

  undoBtn.addEventListener("click", () => {
    if (undoYap(state)) csvTabloYenileFn();
  });
  redoBtn.addEventListener("click", () => {
    if (redoYap(state)) csvTabloYenileFn();
  });

  containerEl.appendChild(undoBtn);
  containerEl.appendChild(redoBtn);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      if (undoYap(state)) csvTabloYenileFn();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
      e.preventDefault();
      if (redoYap(state)) csvTabloYenileFn();
    }
  });
}
