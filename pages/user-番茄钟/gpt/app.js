const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
};

const timeText = $("timeText");
const cycleText = $("cycleText");
const modeLabel = $("modeLabel");
const statusPill = $("statusPill");
const ringProgress = document.querySelector(".ring-progress");

const startPauseBtn = $("startPauseBtn");
const startPauseText = $("startPauseText");
const startPauseIcon = $("startPauseIcon");
const resetBtn = $("resetBtn");
const skipBtn = $("skipBtn");

const setWorkModeBtn = $("setWorkModeBtn");
const setRestModeBtn = $("setRestModeBtn");
const hintText = $("hintText");

const settingsForm = $("settingsForm");
const workMinutesInput = $("workMinutes");
const restMinutesInput = $("restMinutes");
const longRestMinutesInput = $("longRestMinutes");
const longRestEveryInput = $("longRestEvery");
const autoSwitchInput = $("autoSwitch");
const autoStartNextInput = $("autoStartNext");
const soundOnInput = $("soundOn");
const flashTitleInput = $("flashTitle");
const notifyBtn = $("notifyBtn");
const noteText = $("noteText");

const doneDialog = $("doneDialog");
const doneTitle = $("doneTitle");
const doneBody = $("doneBody");
const doneOkBtn = $("doneOkBtn");
const doneStartBtn = $("doneStartBtn");

const STORAGE_KEY = "pomodoro:v1";
const MODES = {
  work: { label: "工作中", className: "work-mode" },
  rest: { label: "休息中", className: "rest-mode" },
  long_rest: { label: "长休息", className: "long-rest-mode" },
};

const state = {
  mode: "work",
  running: false,
  cycle: 1,
  remainingMs: 25 * 60 * 1000,
  startedAtMs: null,
  endAtMs: null,
  tickHandle: null,
  titleFlashHandle: null,
  titleBase: document.title,
  audio: {
    ctx: null,
  },
  durations: {
    workMs: 25 * 60 * 1000,
    restMs: 5 * 60 * 1000,
    longRestMs: 15 * 60 * 1000,
    longRestEvery: 4,
  },
  options: {
    autoSwitch: true,
    autoStartNext: false,
    soundOn: true,
    flashTitle: true,
  },
};

function clampNumber(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function formatMMSS(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function setRingProgress(progress01) {
  const p = Number.isFinite(progress01) ? progress01 : 0;
  const clamped = Math.min(1, Math.max(0, p));
  const offset = 100 - clamped * 100;
  ringProgress.style.strokeDashoffset = String(offset);
}

function currentModeDurationMs(mode) {
  if (mode === "work") return state.durations.workMs;
  if (mode === "rest") return state.durations.restMs;
  return state.durations.longRestMs;
}

function updateModeUI() {
  const info = MODES[state.mode];
  modeLabel.textContent = info.label;

  document.body.classList.remove("work-mode", "rest-mode", "long-rest-mode");
  document.body.classList.add(info.className);

  setWorkModeBtn.classList.toggle("active", state.mode === "work");
  setRestModeBtn.classList.toggle("active", state.mode !== "work");

  statusPill.querySelector(".dot").style.background =
    state.mode === "work" ? "var(--accent2)" : "var(--accent)";
}

function updateTexts() {
  timeText.textContent = formatMMSS(state.remainingMs);
  cycleText.textContent = `第 ${state.cycle} 轮`;
  const duration = currentModeDurationMs(state.mode);
  const p = duration <= 0 ? 0 : state.remainingMs / duration;
  setRingProgress(p);

  const runningLabel = state.running ? "暂停" : "开始";
  startPauseText.textContent = runningLabel;
  startPauseIcon.textContent = state.running ? "⏸" : "▶";
}

function saveToStorage() {
  const data = {
    durations: state.durations,
    options: state.options,
    mode: state.mode,
    cycle: state.cycle,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.durations) state.durations = { ...state.durations, ...data.durations };
    if (data?.options) state.options = { ...state.options, ...data.options };
    if (data?.mode && MODES[data.mode]) state.mode = data.mode;
    if (Number.isFinite(data?.cycle) && data.cycle >= 1) state.cycle = data.cycle;
  } catch {
    // ignore
  }
}

function syncInputsFromState() {
  workMinutesInput.value = String(Math.round(state.durations.workMs / 60000));
  restMinutesInput.value = String(Math.round(state.durations.restMs / 60000));
  longRestMinutesInput.value = String(Math.round(state.durations.longRestMs / 60000));
  longRestEveryInput.value = String(state.durations.longRestEvery);

  autoSwitchInput.checked = !!state.options.autoSwitch;
  autoStartNextInput.checked = !!state.options.autoStartNext;
  soundOnInput.checked = !!state.options.soundOn;
  flashTitleInput.checked = !!state.options.flashTitle;
}

function applyInputsToState() {
  const workMin = clampNumber(workMinutesInput.value, { min: 1, max: 180, fallback: 25 });
  const restMin = clampNumber(restMinutesInput.value, { min: 1, max: 60, fallback: 5 });
  const longRestMin = clampNumber(longRestMinutesInput.value, {
    min: 1,
    max: 90,
    fallback: 15,
  });
  const longEvery = clampNumber(longRestEveryInput.value, { min: 2, max: 12, fallback: 4 });

  state.durations.workMs = workMin * 60 * 1000;
  state.durations.restMs = restMin * 60 * 1000;
  state.durations.longRestMs = longRestMin * 60 * 1000;
  state.durations.longRestEvery = longEvery;

  state.options.autoSwitch = !!autoSwitchInput.checked;
  state.options.autoStartNext = !!autoStartNextInput.checked;
  state.options.soundOn = !!soundOnInput.checked;
  state.options.flashTitle = !!flashTitleInput.checked;
}

function setMode(nextMode, { resetRemaining = true } = {}) {
  if (!MODES[nextMode]) return;
  state.mode = nextMode;
  updateModeUI();
  if (resetRemaining) {
    state.remainingMs = currentModeDurationMs(state.mode);
    state.startedAtMs = null;
    state.endAtMs = null;
  }
  updateTexts();
  saveToStorage();
}

function stopTicking() {
  if (state.tickHandle) {
    clearInterval(state.tickHandle);
    state.tickHandle = null;
  }
}

function startTicking() {
  stopTicking();
  state.tickHandle = setInterval(tick, 250);
}

function startTimer() {
  if (state.running) return;
  const now = Date.now();
  state.running = true;
  state.startedAtMs = now;
  state.endAtMs = now + state.remainingMs;
  hintText.textContent = "进行中：空格可暂停";
  startTicking();
  updateTexts();
}

function pauseTimer() {
  if (!state.running) return;
  state.running = false;
  const now = Date.now();
  state.remainingMs = Math.max(0, state.endAtMs - now);
  state.startedAtMs = null;
  state.endAtMs = null;
  hintText.textContent = "已暂停：空格继续";
  stopTicking();
  updateTexts();
}

function resetTimer() {
  pauseTimer();
  state.remainingMs = currentModeDurationMs(state.mode);
  hintText.textContent = "已重置";
  updateTexts();
}

function nextModeAfterFinish() {
  if (state.mode === "work") {
    const shouldLongRest = state.cycle % state.durations.longRestEvery === 0;
    return shouldLongRest ? "long_rest" : "rest";
  }
  return "work";
}

function advanceAfterFinish() {
  const nextMode = nextModeAfterFinish();
  const enteringWork = nextMode === "work";
  setMode(nextMode, { resetRemaining: true });
  if (enteringWork) {
    state.cycle += 1;
    saveToStorage();
    updateTexts();
  }
}

function startTitleFlashing(message) {
  stopTitleFlashing();
  if (!state.options.flashTitle) return;
  let flip = false;
  state.titleFlashHandle = setInterval(() => {
    flip = !flip;
    document.title = flip ? `⏰ ${message}` : state.titleBase;
  }, 650);
}

function stopTitleFlashing() {
  if (state.titleFlashHandle) {
    clearInterval(state.titleFlashHandle);
    state.titleFlashHandle = null;
  }
  document.title = state.titleBase;
}

async function maybeNotify(title, body) {
  if (!("Notification" in window)) {
    noteText.textContent = "此浏览器不支持系统通知（会用弹窗/声音提醒）。";
    return;
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }
  if (Notification.permission === "denied") return;

  try {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // ignore
  }
}

async function beepTriple() {
  if (!state.options.soundOn) return;
  try {
    const ctx = await ensureAudioUnlocked();
    if (!ctx) return;

    const now = ctx.currentTime;
    const tones = [
      { t: now + 0.0, f: 880 },
      { t: now + 0.18, f: 988 },
      { t: now + 0.36, f: 880 },
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.60);
    master.connect(ctx.destination);

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.f, tone.t);
      osc.connect(master);
      osc.start(tone.t);
      osc.stop(tone.t + 0.12);
    }
  } catch {
    // ignore
  }
}

function showDoneDialog({ title, body }) {
  doneTitle.textContent = title;
  doneBody.textContent = body;

  doneStartBtn.disabled = false;
  doneOkBtn.focus();
  if (typeof doneDialog.showModal === "function") doneDialog.showModal();
  else alert(`${title}\n\n${body}`);
}

async function onFinished() {
  pauseTimer();
  state.remainingMs = 0;
  updateTexts();

  const title = state.mode === "work" ? "工作时间到" : "休息时间到";
  const body =
    state.mode === "work"
      ? "站起来走走，补点水。"
      : "准备开始下一段专注吧。";

  startTitleFlashing(title);
  await beepTriple();
  await maybeNotify(title, body);

  showDoneDialog({ title, body });
}

function tick() {
  if (!state.running) return;
  const now = Date.now();
  const ms = Math.max(0, state.endAtMs - now);
  state.remainingMs = ms;
  updateTexts();

  if (ms <= 0) {
    stopTicking();
    onFinished();
  }
}

function onStartPause() {
  stopTitleFlashing();
  ensureAudioUnlocked();
  if (state.running) pauseTimer();
  else startTimer();
}

function onSkip() {
  stopTitleFlashing();
  pauseTimer();
  const nextMode = nextModeAfterFinish();
  const enteringWork = nextMode === "work";
  setMode(nextMode, { resetRemaining: true });
  if (enteringWork) {
    state.cycle += 1;
    saveToStorage();
    updateTexts();
  }
  hintText.textContent = "已切换";
}

function applySettingsAndMaybeReset() {
  const oldDuration = currentModeDurationMs(state.mode);
  applyInputsToState();
  const newDuration = currentModeDurationMs(state.mode);
  if (!state.running && state.remainingMs === oldDuration) {
    state.remainingMs = newDuration;
  }
  updateTexts();
  saveToStorage();
}

function updateNotifyButton() {
  if (!("Notification" in window)) {
    notifyBtn.disabled = true;
    notifyBtn.textContent = "通知不可用";
    return;
  }
  const perm = Notification.permission;
  if (perm === "granted") {
    notifyBtn.disabled = true;
    notifyBtn.textContent = "通知已开启";
  } else if (perm === "denied") {
    notifyBtn.disabled = true;
    notifyBtn.textContent = "通知被禁用";
  } else {
    notifyBtn.disabled = false;
    notifyBtn.textContent = "开启通知";
  }
}

function onAutoSwitchIfEnabled() {
  if (!state.options.autoSwitch) return;
  advanceAfterFinish();
  if (state.options.autoStartNext) startTimer();
}

function wireDialog() {
  doneOkBtn.addEventListener("click", () => {
    doneDialog.close();
    stopTitleFlashing();
    onAutoSwitchIfEnabled();
  });
  doneStartBtn.addEventListener("click", () => {
    doneDialog.close();
    stopTitleFlashing();
    advanceAfterFinish();
    startTimer();
  });
  doneDialog.addEventListener("close", () => {
    stopTitleFlashing();
  });
}

function wireEvents() {
  startPauseBtn.addEventListener("click", onStartPause);
  resetBtn.addEventListener("click", () => {
    stopTitleFlashing();
    ensureAudioUnlocked();
    resetTimer();
  });
  skipBtn.addEventListener("click", onSkip);

  setWorkModeBtn.addEventListener("click", () => {
    stopTitleFlashing();
    pauseTimer();
    setMode("work", { resetRemaining: true });
    hintText.textContent = "已切换到工作";
  });
  setRestModeBtn.addEventListener("click", () => {
    stopTitleFlashing();
    pauseTimer();
    setMode("rest", { resetRemaining: true });
    hintText.textContent = "已切换到休息";
  });

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    applySettingsAndMaybeReset();
    hintText.textContent = "设置已保存";
  });

  notifyBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    try {
      ensureAudioUnlocked();
      const perm = await Notification.requestPermission();
      if (perm === "granted") noteText.textContent = "通知已开启：到点会弹出系统通知。";
      updateNotifyButton();
    } catch {
      // ignore
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) stopTitleFlashing();
  });

  window.addEventListener("beforeunload", () => {
    saveToStorage();
  });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target?.tagName || "").toLowerCase();
    const inForm = tag === "input" || tag === "textarea" || tag === "select";
    if (inForm) return;

    if (e.code === "Space") {
      e.preventDefault();
      onStartPause();
    } else if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      stopTitleFlashing();
      resetTimer();
    } else if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      onSkip();
    }
  });

  // Live preview when editing settings (without saving)
  for (const input of [
    workMinutesInput,
    restMinutesInput,
    longRestMinutesInput,
    longRestEveryInput,
    autoSwitchInput,
    autoStartNextInput,
    soundOnInput,
    flashTitleInput,
  ]) {
    input.addEventListener("change", () => {
      applySettingsAndMaybeReset();
      updateNotifyButton();
    });
  }
}

function init() {
  loadFromStorage();
  syncInputsFromState();
  updateModeUI();
  updateTexts();
  updateNotifyButton();
  wireDialog();
  wireEvents();
}

init();

async function ensureAudioUnlocked() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!state.audio.ctx) state.audio.ctx = new AudioCtx();
    if (state.audio.ctx.state === "suspended") await state.audio.ctx.resume();
    return state.audio.ctx;
  } catch {
    return null;
  }
}
