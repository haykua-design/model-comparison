const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
};

const groups = Array.from(document.querySelectorAll(".group"));
const more = $("more");
const moreTrigger = $("moreTrigger");
const moreSurface = $("moreSurface");
const outsideOverlay = $("outsideOverlay");
const menuItems = Array.from(moreSurface.querySelectorAll(".menu-item"));

function setGroupOpen(groupEl, open) {
  groupEl.dataset.open = open ? "true" : "false";
  const head = groupEl.querySelector(".group-head");
  if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
}

function toggleGroup(groupEl) {
  const next = groupEl.dataset.open !== "true";
  setGroupOpen(groupEl, next);
}

for (const groupEl of groups) {
  const head = groupEl.querySelector(".group-head");
  if (!head) continue;
  head.addEventListener("click", () => toggleGroup(groupEl));
}

function setMoreOpen(open) {
  more.dataset.open = open ? "true" : "false";
  moreTrigger.setAttribute("aria-expanded", open ? "true" : "false");
  moreSurface.setAttribute("aria-hidden", open ? "false" : "true");
  outsideOverlay.hidden = !open;
}

function toggleMore() {
  setMoreOpen(more.dataset.open !== "true");
}

moreTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleMore();
});

outsideOverlay.addEventListener("click", () => setMoreOpen(false));

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMoreOpen(false);
});

// Click inside menu should not close unless it bubbles to overlay.
moreSurface.addEventListener("click", (e) => e.stopPropagation());
for (const item of menuItems) {
  item.addEventListener("click", () => setMoreOpen(false));
}

// Default states per spec.
setGroupOpen($("groupDraft"), true);
setGroupOpen($("groupTickets"), false);
setGroupOpen($("groupClips"), false);
setMoreOpen(false);
