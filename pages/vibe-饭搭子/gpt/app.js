const KEY_USER = "fdz_user";
const KEY_MEALS = "fdz_meals";
const KEY_CREDIT_MAP = "fdz_credit_map";
const KEY_RATING_RECORDS = "fdz_rating_records";

function now() {
  return Date.now();
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${now()}`;
}

function getJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureCreditEntry(userId, fallbackCredit) {
  if (!userId) return;
  const map = getJson(KEY_CREDIT_MAP, {});
  if (map[userId]) return;
  map[userId] = {
    score: (fallbackCredit && fallbackCredit.score) || 80,
    rating_count: (fallbackCredit && fallbackCredit.rating_count) || 0,
    tags: (fallbackCredit && fallbackCredit.tags) || []
  };
  setJson(KEY_CREDIT_MAP, map);
}

function getCreditByUserId(userId) {
  const map = getJson(KEY_CREDIT_MAP, {});
  return map[userId] || { score: 80, rating_count: 0, tags: [] };
}

function updateCreditFromRating({ toUserId, ratingScore }) {
  ensureCreditEntry(toUserId, null);
  const map = getJson(KEY_CREDIT_MAP, {});
  const prev = map[toUserId];
  const count = Number(prev.rating_count) || 0;
  const prevScore = Number(prev.score) || 80;
  const nextRating = Math.max(1, Math.min(5, Number(ratingScore) || 5));
  const nextScore = Math.round((prevScore * count + nextRating * 20) / (count + 1));
  map[toUserId] = { ...prev, score: nextScore, rating_count: count + 1 };
  setJson(KEY_CREDIT_MAP, map);
  return map[toUserId];
}

function addRatingRecord(record) {
  const list = getJson(KEY_RATING_RECORDS, []);
  list.unshift(record);
  setJson(KEY_RATING_RECORDS, list.slice(0, 200));
}

function getOrCreateUser() {
  const existing = getJson(KEY_USER, null);
  if (existing && existing.id) {
    ensureCreditEntry(existing.id, existing.credit);
    return existing;
  }
  const user = {
    id: randomId("u"),
    nickname: "我",
    avatar_url: "",
    created_at: now(),
    taste_dna: {
      spice_level: 2,
      avoid: [],
      diet: [],
      budget_pp: 80,
      notes: ""
    },
    credit: { score: 80, rating_count: 0, tags: ["守时", "好沟通"] }
  };
  setJson(KEY_USER, user);
  ensureCreditEntry(user.id, user.credit);
  return user;
}

function setUser(nextUser) {
  setJson(KEY_USER, nextUser);
  ensureCreditEntry(nextUser.id, nextUser.credit);
}

function getMeals() {
  return getJson(KEY_MEALS, []);
}

function setMeals(meals) {
  setJson(KEY_MEALS, meals || []);
}

function getMealById(mealId) {
  const meals = getMeals();
  return meals.find((m) => m.id === mealId) || null;
}

function upsertMeal(nextMeal) {
  const meals = getMeals();
  const idx = meals.findIndex((m) => m.id === nextMeal.id);
  if (idx >= 0) meals[idx] = nextMeal;
  else meals.unshift(nextMeal);
  setMeals(meals);
  return nextMeal;
}

function seedIfNeeded() {
  const meals = getMeals();
  if (meals.length) return;

  const createdAt = now() - 5 * 60 * 1000;
  const joinDeadline = createdAt + 30 * 60 * 1000;
  const demoMeals = [
    {
      id: randomId("m"),
      creator_id: "demo_1",
      title: "今晚想吃火锅",
      cuisine: "火锅",
      start_time: now() + 90 * 60 * 1000,
      location_name: "望京 SOHO",
      lat: 39.9968,
      lng: 116.4707,
      min_people: 2,
      max_people: 4,
      created_at: createdAt,
      join_deadline: joinDeadline,
      status: "recruiting",
      participants: [{ user_id: "demo_1", joined_at: createdAt, role: "creator", status: "joined" }],
      creator_taste_snapshot: {
        spice_level: 3,
        avoid: ["香菜"],
        diet: [],
        budget_pp: 100,
        notes: "能吃辣，但别太麻"
      },
      notes: "地铁口集合，不用尬聊，吃完就散"
    },
    {
      id: randomId("m"),
      creator_id: "demo_2",
      title: "中午想吃日料定食",
      cuisine: "日料",
      start_time: now() + 40 * 60 * 1000,
      location_name: "合生麒麟社",
      lat: 39.995,
      lng: 116.48,
      min_people: 2,
      max_people: 3,
      created_at: now() - 20 * 60 * 1000,
      join_deadline: now() + 10 * 60 * 1000,
      status: "recruiting",
      participants: [{ user_id: "demo_2", joined_at: now() - 20 * 60 * 1000, role: "creator", status: "joined" }],
      creator_taste_snapshot: {
        spice_level: 0,
        avoid: ["芥末"],
        diet: [],
        budget_pp: 120,
        notes: "偏清淡"
      },
      notes: ""
    }
  ];

  setMeals(demoMeals);
  ensureCreditEntry("demo_1", { score: 86, rating_count: 12, tags: ["守时", "AA爽快"] });
  ensureCreditEntry("demo_2", { score: 78, rating_count: 5, tags: ["好沟通"] });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatHM(ms) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatCountdown(msRemaining) {
  const safe = Math.max(0, msRemaining);
  const totalSec = Math.floor(safe / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function resolveStatus(meal, nowTs) {
  if (meal.status !== "recruiting") return meal.status;
  if (meal.join_deadline > nowTs) return "recruiting";
  const joined = (meal.participants || []).filter((p) => p.status === "joined").length;
  if (joined < meal.min_people) return "cancelled";
  return "confirmed";
}

function resolveAndPersistIfNeeded(meal, nowTs) {
  const nextStatus = resolveStatus(meal, nowTs);
  if (nextStatus === meal.status) return meal;
  const next = { ...meal, status: nextStatus };
  upsertMeal(next);
  return next;
}

function listMeals({ nowTs, filters, location }) {
  const meals = getMeals();
  const cuisine = (filters && filters.cuisine) || "";
  const timeWindowMins = (filters && filters.timeWindowMins) || 360;
  const timeTo = nowTs + timeWindowMins * 60 * 1000;

  return meals
    .map((m) => {
      const resolved = resolveAndPersistIfNeeded(m, nowTs);
      const distance =
        location && typeof location.lat === "number"
          ? distanceKm(location.lat, location.lng, resolved.lat, resolved.lng)
          : null;
      const credit = getCreditByUserId(resolved.creator_id);
      return { ...resolved, distance_km: distance, creator_credit_score: credit.score };
    })
    .filter((m) => {
      if (m.status === "cancelled") return false;
      if (cuisine && m.cuisine !== cuisine) return false;
      if (m.start_time < nowTs) return false;
      if (m.start_time > timeTo) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.distance_km == null && b.distance_km == null) return a.start_time - b.start_time;
      if (a.distance_km == null) return 1;
      if (b.distance_km == null) return -1;
      if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
      return a.start_time - b.start_time;
    });
}

function createMeal({ user, payload }) {
  const nowTs = now();
  const meal = {
    id: randomId("m"),
    creator_id: user.id,
    title: payload.title || "一起吃饭",
    cuisine: payload.cuisine || "其他",
    start_time: payload.start_time,
    location_name: payload.location_name,
    lat: payload.lat,
    lng: payload.lng,
    min_people: payload.min_people,
    max_people: payload.max_people,
    created_at: nowTs,
    join_deadline: nowTs + 30 * 60 * 1000,
    status: "recruiting",
    participants: [{ user_id: user.id, joined_at: nowTs, role: "creator", status: "joined" }],
    creator_taste_snapshot: { ...user.taste_dna },
    notes: payload.notes || ""
  };
  upsertMeal(meal);
  return meal;
}

function joinMeal({ userId, mealId }) {
  const meal = getMealById(mealId);
  if (!meal) return { ok: false, code: "MEAL_NOT_FOUND" };

  const nowTs = now();
  const status = resolveStatus(meal, nowTs);
  if (status === "cancelled") return { ok: false, code: "MEAL_CANCELLED" };
  if (meal.join_deadline <= nowTs) return { ok: false, code: "MEAL_JOIN_DEADLINE_PASSED" };

  const participants = meal.participants || [];
  const joined = participants.filter((p) => p.status === "joined");
  if (joined.find((p) => p.user_id === userId)) return { ok: true, meal: { ...meal, status } };
  if (joined.length >= meal.max_people) return { ok: false, code: "MEAL_FULL" };

  const next = {
    ...meal,
    status,
    participants: [
      ...participants,
      { user_id: userId, joined_at: nowTs, role: "member", status: "joined" }
    ]
  };
  upsertMeal(next);
  return { ok: true, meal: next };
}

function leaveMeal({ userId, mealId }) {
  const meal = getMealById(mealId);
  if (!meal) return { ok: false, code: "MEAL_NOT_FOUND" };
  const nextParticipants = (meal.participants || []).map((p) =>
    p.user_id === userId ? { ...p, status: "left" } : p
  );
  const next = { ...meal, participants: nextParticipants };
  upsertMeal(next);
  return { ok: true, meal: next };
}

function getMealResolved({ mealId, nowTs }) {
  const meal = getMealById(mealId);
  if (!meal) return null;
  return resolveAndPersistIfNeeded(meal, nowTs || now());
}

function spiceToText(level) {
  const map = ["不辣", "微辣", "中辣", "重辣", "爆辣", "地狱辣"];
  return map[Math.max(0, Math.min(5, Number(level) || 0))];
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function parseHash() {
  const raw = location.hash || "#/feed";
  const [path, query] = raw.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query || "");
  return { path, params };
}

function setActiveTab(tab) {
  document.querySelectorAll(".tab").forEach((a) => {
    a.classList.toggle("active", a.dataset.tab === tab);
  });
}

function minsUntilTonightEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  const diff = d.getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / 60000));
}

function renderFeed(root, ctx) {
  setActiveTab("feed");
  const cuisineOptions = ["全部菜系", "火锅", "日料", "烧烤", "粤菜", "其他"];
  const timeOptions = ["接下来 6 小时", "1 小时内", "2 小时内", "今晚"];

  const cuisine = ctx.feedCuisineIndex === 0 ? "" : cuisineOptions[ctx.feedCuisineIndex];
  const timeWindowMins =
    ctx.feedTimeIndex === 3 ? minsUntilTonightEnd() : [360, 60, 120, 360][ctx.feedTimeIndex] || 360;

  const meals = listMeals({ nowTs: ctx.nowTs, filters: { cuisine, timeWindowMins }, location: ctx.location });

  root.innerHTML = `
    <section class="glass card">
      <div class="row">
        <div>
          <div class="title">附近饭局</div>
          <div class="meta muted">${escapeHtml(ctx.locationText)}${ctx.locationHint ? `（${escapeHtml(ctx.locationHint)}）` : ""}</div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn" id="btn-refresh" type="button">刷新</button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="row" style="justify-content:flex-start; flex-wrap:wrap;">
        <label class="chip">
          菜系
          <select class="select" id="sel-cuisine" style="width:auto; padding:6px 8px;">
            ${cuisineOptions
              .map((x, i) => `<option value="${i}" ${i === ctx.feedCuisineIndex ? "selected" : ""}>${escapeHtml(x)}</option>`)
              .join("")}
          </select>
        </label>
        <label class="chip">
          时间
          <select class="select" id="sel-time" style="width:auto; padding:6px 8px;">
            ${timeOptions
              .map((x, i) => `<option value="${i}" ${i === ctx.feedTimeIndex ? "selected" : ""}>${escapeHtml(x)}</option>`)
              .join("")}
          </select>
        </label>
      </div>
    </section>

    <div style="height:12px;"></div>

    <section class="grid" id="meal-grid">
      ${
        meals.length
          ? meals.map((m) => renderMealCard(m, ctx.user.id, ctx.nowTs, ctx.location)).join("")
          : `<div class="glass card muted">附近暂时没人开局，要不你来发一个？</div>`
      }
    </section>

    <button class="btn btn-primary fab" id="btn-create" type="button">+ 发饭局</button>
  `;

  root.querySelector("#btn-create").addEventListener("click", () => {
    location.hash = "#/create";
  });
  root.querySelector("#btn-refresh").addEventListener("click", () => refreshLocation(ctx));

  root.querySelector("#sel-cuisine").addEventListener("change", (e) => {
    ctx.feedCuisineIndex = Number(e.target.value) || 0;
    rerender();
  });
  root.querySelector("#sel-time").addEventListener("change", (e) => {
    ctx.feedTimeIndex = Number(e.target.value) || 0;
    rerender();
  });

  root.querySelectorAll("[data-meal-id]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      const mealId = ev.currentTarget.dataset.mealId;
      location.hash = `#/detail?id=${encodeURIComponent(mealId)}`;
    });
  });

  root.querySelectorAll("[data-join-id]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const mealId = ev.currentTarget.dataset.joinId;
      const res = joinMeal({ userId: ctx.user.id, mealId });
      if (!res.ok) {
        const map = {
          MEAL_FULL: "人满啦，下次再凑～",
          MEAL_JOIN_DEADLINE_PASSED: "这局到点了，来晚一步",
          MEAL_CANCELLED: "这局已取消啦"
        };
        toast(map[res.code] || "加入失败");
        rerender();
        return;
      }
      toast("接搭成功");
      rerender();
    });
  });
}

function renderMealCard(meal, userId, nowTs, location) {
  const remain = Math.max(0, meal.join_deadline - nowTs);
  const joinedCount = (meal.participants || []).filter((p) => p.status === "joined").length;
  const joined = !!(meal.participants || []).find((p) => p.user_id === userId && p.status === "joined");
  const badge =
    meal.status === "recruiting"
      ? `<span class="badge">还剩 ${escapeHtml(formatCountdown(remain))} 凑人</span>`
      : meal.status === "confirmed"
        ? `<span class="badge">已成局，等开饭</span>`
        : `<span class="badge">已取消</span>`;

  const distanceText =
    location && typeof location.lat === "number" && typeof meal.distance_km === "number"
      ? `${meal.distance_km.toFixed(1)}km`
      : "";

  const taste = meal.creator_taste_snapshot || {};
  const avoid = Array.isArray(taste.avoid) ? taste.avoid.slice(0, 3) : [];

  return `
    <article class="glass meal-card" data-meal-id="${escapeHtml(meal.id)}">
      <div class="row">
        <div class="meal-title">${escapeHtml(meal.title)}</div>
        ${badge}
      </div>
      <div class="meta">${escapeHtml(meal.cuisine)} · ${escapeHtml(meal.location_name)} · ${escapeHtml(formatHM(meal.start_time))}${distanceText ? ` · ${escapeHtml(distanceText)}` : ""}</div>
      <div style="margin-top:10px;">
        <span class="chip">${escapeHtml(`${joinedCount}/${meal.max_people}`)}</span>
        <span class="chip">至少 ${escapeHtml(meal.min_people)}</span>
        <span class="chip">信用 ${escapeHtml(meal.creator_credit_score || 80)}</span>
      </div>
      <div style="margin-top:4px;">
        <span class="chip warm">辣度 ${escapeHtml(spiceToText(taste.spice_level))}</span>
        ${taste.budget_pp ? `<span class="chip">人均 ${escapeHtml(taste.budget_pp)} 元</span>` : ""}
        ${avoid.map((x) => `<span class="chip">不吃 ${escapeHtml(x)}</span>`).join("")}
      </div>
      ${taste.notes ? `<div class="meta">${escapeHtml(taste.notes)}</div>` : ""}
      <div class="divider"></div>
      <div class="row">
        <div class="meta">${escapeHtml(meal.notes || "备注：不尴尬，吃得开心就好")}</div>
        <button class="btn ${joined ? "" : "btn-primary"}" data-join-id="${escapeHtml(meal.id)}" ${joined ? "disabled" : ""} type="button">
          ${joined ? "已接搭" : "接搭"}
        </button>
      </div>
    </article>
  `;
}

function renderCreate(root, ctx) {
  setActiveTab("feed");
  const cuisineOptions = ["火锅", "日料", "烧烤", "粤菜", "其他"];
  const defaultTime = "19:00";
  root.innerHTML = `
    <section class="glass card">
      <div class="row">
        <div>
          <div class="title">发个饭局</div>
          <div class="meta muted">30 分钟凑人，人满或到点就定。</div>
        </div>
        <button class="btn" id="btn-back" type="button">返回</button>
      </div>
      <div class="divider"></div>

      <div class="field">
        <div class="label">我想吃</div>
        <input class="input" id="in-title" placeholder="比如：火锅 / 烧烤 / 粤菜" />
      </div>

      <div class="field">
        <div class="label">菜系</div>
        <select class="select" id="sel-cuisine">
          ${cuisineOptions.map((x) => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("")}
        </select>
      </div>

      <div class="field">
        <div class="label">地点</div>
        <input class="input" id="in-loc" placeholder="比如：望京 SOHO" value="${escapeHtml(ctx.locationNameFallback)}" />
      </div>

      <div class="field">
        <div class="label">开饭时间</div>
        <input class="input" id="in-time" type="time" value="${escapeHtml(defaultTime)}" />
      </div>

      <div class="cols">
        <div class="field">
          <div class="label">最少人数</div>
          <input class="input" id="in-min" type="number" value="2" min="2" />
        </div>
        <div class="field">
          <div class="label">最多人数</div>
          <input class="input" id="in-max" type="number" value="4" min="2" />
        </div>
      </div>

      <div class="field">
        <div class="label">备注（可选）</div>
        <input class="input" id="in-notes" placeholder="集合点 / 忌口 / 不太想社交也行" />
      </div>

      <div class="divider"></div>
      <button class="btn btn-primary" id="btn-submit" type="button" style="width:100%;">发布饭局（30 分钟凑人）</button>
    </section>
  `;

  root.querySelector("#btn-back").addEventListener("click", () => history.back());
  root.querySelector("#btn-submit").addEventListener("click", () => {
    const title = root.querySelector("#in-title").value.trim();
    const cuisine = root.querySelector("#sel-cuisine").value;
    const locationName = root.querySelector("#in-loc").value.trim() || "附近";
    const timeValue = root.querySelector("#in-time").value || "19:00";
    const minPeople = Math.max(2, Number(root.querySelector("#in-min").value) || 2);
    const maxPeople = Math.max(minPeople, Number(root.querySelector("#in-max").value) || minPeople);
    const notes = root.querySelector("#in-notes").value.trim();

    const startTime = todayAtHM(timeValue);
    const meal = createMeal({
      user: ctx.user,
      payload: {
        title: title || `一起吃${cuisine}`,
        cuisine,
        start_time: startTime,
        location_name: locationName,
        lat: ctx.location.lat,
        lng: ctx.location.lng,
        min_people: minPeople,
        max_people: maxPeople,
        notes
      }
    });
    toast("发布成功");
    location.hash = `#/detail?id=${encodeURIComponent(meal.id)}`;
  });
}

function todayAtHM(hm) {
  const [hh, mm] = hm.split(":").map((x) => Number(x) || 0);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  const t = d.getTime();
  if (t < Date.now() + 5 * 60 * 1000) return t + 24 * 60 * 60 * 1000;
  return t;
}

function renderDetail(root, ctx, mealId) {
  setActiveTab("feed");
  const meal = getMealResolved({ mealId, nowTs: ctx.nowTs });
  if (!meal) {
    root.innerHTML = `<section class="glass card muted">找不到这条饭局了</section>`;
    return;
  }

  const remain = Math.max(0, meal.join_deadline - ctx.nowTs);
  const joinedCount = (meal.participants || []).filter((p) => p.status === "joined").length;
  const joined = !!(meal.participants || []).find((p) => p.user_id === ctx.user.id && p.status === "joined");
  const credit = getCreditByUserId(meal.creator_id);
  const badge =
    meal.status === "recruiting"
      ? `还剩 ${formatCountdown(remain)} 凑人`
      : meal.status === "confirmed"
        ? "已成局"
        : "已取消";

  const taste = meal.creator_taste_snapshot || {};
  const avoid = Array.isArray(taste.avoid) ? taste.avoid : [];

  root.innerHTML = `
    <section class="glass card">
      <div class="row">
        <div>
          <div class="title">${escapeHtml(meal.title)}</div>
          <div class="meta muted">${escapeHtml(meal.cuisine)} · ${escapeHtml(meal.location_name)} · ${escapeHtml(formatHM(meal.start_time))}</div>
        </div>
        <div class="badge">${escapeHtml(badge)}</div>
      </div>

      <div style="margin-top:10px;">
        <span class="chip">${escapeHtml(`${joinedCount}/${meal.max_people}`)}</span>
        <span class="chip">至少 ${escapeHtml(meal.min_people)}</span>
        <span class="chip">发起人信用 ${escapeHtml(credit.score)}</span>
        ${joined ? `<span class="chip warm">你已接搭</span>` : ""}
      </div>

      <div class="divider"></div>
      <div class="section-title">发起人口味 DNA</div>
      <div style="margin-top:8px;">
        <span class="chip warm">辣度 ${escapeHtml(spiceToText(taste.spice_level))}</span>
        ${taste.budget_pp ? `<span class="chip">人均 ${escapeHtml(taste.budget_pp)} 元</span>` : ""}
        ${avoid.map((x) => `<span class="chip">不吃 ${escapeHtml(x)}</span>`).join("")}
      </div>
      ${taste.notes ? `<div class="meta">${escapeHtml(taste.notes)}</div>` : ""}

      <div class="divider"></div>
      <div class="section-title">备注 / 集合点</div>
      <div class="meta">${escapeHtml(meal.notes || "暂无备注")}</div>

      <div class="divider"></div>
      <div class="row" style="flex-wrap:wrap; justify-content:space-between;">
        <div class="row" style="justify-content:flex-start;">
          ${
            !joined && meal.status !== "cancelled"
              ? `<button class="btn btn-primary" id="btn-join" type="button">接搭加入</button>`
              : ""
          }
          ${
            joined && meal.status !== "cancelled"
              ? `<button class="btn" id="btn-leave" type="button">退出这局</button>`
              : ""
          }
          <button class="btn" id="btn-back" type="button">返回</button>
        </div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn" id="btn-settlement" type="button">AA 分账</button>
          <button class="btn" id="btn-rate" type="button">互评</button>
        </div>
      </div>
    </section>
  `;

  root.querySelector("#btn-back").addEventListener("click", () => history.back());

  const btnJoin = root.querySelector("#btn-join");
  if (btnJoin) {
    btnJoin.addEventListener("click", () => {
      const res = joinMeal({ userId: ctx.user.id, mealId });
      if (!res.ok) {
        const map = {
          MEAL_FULL: "人满啦，下次再凑～",
          MEAL_JOIN_DEADLINE_PASSED: "这局到点了，来晚一步",
          MEAL_CANCELLED: "这局已取消啦"
        };
        toast(map[res.code] || "加入失败");
        rerender();
        return;
      }
      toast("接搭成功");
      rerender();
    });
  }

  const btnLeave = root.querySelector("#btn-leave");
  if (btnLeave) {
    btnLeave.addEventListener("click", () => {
      leaveMeal({ userId: ctx.user.id, mealId });
      toast("已退出");
      rerender();
    });
  }

  root.querySelector("#btn-settlement").addEventListener("click", () => {
    location.hash = `#/settlement?meal_id=${encodeURIComponent(mealId)}`;
  });
  root.querySelector("#btn-rate").addEventListener("click", () => {
    location.hash = `#/rate?meal_id=${encodeURIComponent(mealId)}`;
  });
}

function renderProfile(root, ctx) {
  setActiveTab("profile");
  const user = getOrCreateUser();
  const credit = getCreditByUserId(user.id);
  const taste = user.taste_dna || {};

  root.innerHTML = `
    <section class="glass card">
      <div class="title">我的口味 DNA</div>
      <div class="meta muted">只用来避雷，不是社交人设。</div>
      <div class="divider"></div>

      <div class="field">
        <div class="label">辣度（0-5）</div>
        <input class="input" id="in-spice" type="number" min="0" max="5" value="${escapeHtml(taste.spice_level ?? 2)}" />
        <div class="meta muted" id="spice-text">当前：${escapeHtml(spiceToText(taste.spice_level ?? 2))}</div>
      </div>

      <div class="field">
        <div class="label">忌口（用逗号分隔）</div>
        <input class="input" id="in-avoid" value="${escapeHtml((taste.avoid || []).join(", "))}" placeholder="比如：香菜, 花生" />
      </div>

      <div class="field">
        <div class="label">人均预算（元）</div>
        <input class="input" id="in-budget" type="number" value="${escapeHtml(taste.budget_pp ?? 80)}" />
      </div>

      <div class="field">
        <div class="label">备注（可选）</div>
        <input class="input" id="in-notes" value="${escapeHtml(taste.notes || "")}" placeholder="比如：不吃麻，偏清淡" />
      </div>

      <div class="divider"></div>
      <button class="btn btn-primary" id="btn-save" type="button" style="width:100%;">保存</button>
    </section>

    <div style="height:12px;"></div>

    <section class="glass card">
      <div class="title">搭子信用分</div>
      <div class="meta muted">网页预览版：互评会本地模拟影响分数。</div>
      <div style="font-size:48px; font-weight:800; color: var(--primary); margin-top: 6px;">${escapeHtml(credit.score)}</div>
      <div class="meta muted">${escapeHtml((credit.tags || []).length ? credit.tags.join(" · ") : "评分积累中")}</div>
    </section>
  `;

  const spiceInput = root.querySelector("#in-spice");
  spiceInput.addEventListener("input", () => {
    const v = Math.max(0, Math.min(5, Number(spiceInput.value) || 0));
    root.querySelector("#spice-text").textContent = `当前：${spiceToText(v)}`;
  });

  root.querySelector("#btn-save").addEventListener("click", () => {
    const spice = Math.max(0, Math.min(5, Number(root.querySelector("#in-spice").value) || 0));
    const avoid = (root.querySelector("#in-avoid").value || "")
      .split(/,|，/)
      .map((s) => s.trim())
      .filter(Boolean);
    const budget = Number(root.querySelector("#in-budget").value) || 0;
    const notes = root.querySelector("#in-notes").value || "";

    const next = {
      ...user,
      taste_dna: { ...user.taste_dna, spice_level: spice, avoid, budget_pp: budget, notes }
    };
    setUser(next);
    ctx.user = next;
    toast("已保存");
    rerender();
  });
}

function renderSettlement(root, ctx, mealId) {
  setActiveTab("feed");
  root.innerHTML = `
    <section class="glass card">
      <div class="row">
        <div>
          <div class="title">AA 一下</div>
          <div class="meta muted">网页预览版：先做“算账+记账”，不接真实支付。</div>
        </div>
        <button class="btn" id="btn-back" type="button">返回</button>
      </div>
      <div class="divider"></div>

      <div class="field">
        <div class="label">总共花了多少钱（元）</div>
        <input class="input" id="in-total" type="number" value="0" />
      </div>
      <div class="field">
        <div class="label">参与人数</div>
        <input class="input" id="in-people" type="number" value="2" min="1" />
      </div>

      <div class="divider"></div>
      <div class="row" style="justify-content:flex-start;">
        <div class="meta muted">每人</div>
        <div style="font-size:42px; font-weight:800; color: var(--primary);" id="per">0.00</div>
        <div class="meta muted">元（可后续做微调）</div>
      </div>
    </section>
  `;

  root.querySelector("#btn-back").addEventListener("click", () => history.back());
  const compute = () => {
    const total = Number(root.querySelector("#in-total").value) || 0;
    const people = Math.max(1, Number(root.querySelector("#in-people").value) || 1);
    root.querySelector("#per").textContent = (total / people).toFixed(2);
  };
  root.querySelector("#in-total").addEventListener("input", compute);
  root.querySelector("#in-people").addEventListener("input", compute);
  compute();
}

function renderRate(root, ctx, mealId) {
  setActiveTab("feed");
  const meal = getMealResolved({ mealId, nowTs: ctx.nowTs });
  if (!meal) {
    root.innerHTML = `<section class="glass card muted">找不到这条饭局了</section>`;
    return;
  }

  const participants = (meal.participants || []).filter((p) => p.status === "joined");
  const targets = participants.filter((p) => p.user_id !== ctx.user.id).map((p) => p.user_id);
  const ratings = new Map(targets.map((id) => [id, 5]));

  root.innerHTML = `
    <section class="glass card">
      <div class="row">
        <div>
          <div class="title">互评</div>
          <div class="meta muted">一句话就好，主要为了下次更安心。</div>
        </div>
        <button class="btn" id="btn-back" type="button">返回</button>
      </div>
      <div class="divider"></div>

      ${
        targets.length
          ? targets
              .map(
                (id) => `
                  <div class="row" style="padding:10px 0;">
                    <div>
                      <div class="section-title">${escapeHtml(id === meal.creator_id ? "发起人" : "搭子")}（${escapeHtml(id.slice(-4))}）</div>
                      <div class="meta muted">给个星就好，不用长评</div>
                    </div>
                    <div class="stars" data-stars-for="${escapeHtml(id)}">
                      ${[1, 2, 3, 4, 5]
                        .map((n) => `<span class="star ${n <= 5 ? "on" : ""}" data-v="${n}">★</span>`)
                        .join("")}
                    </div>
                  </div>
                `
              )
              .join("")
          : `<div class="muted">这局里暂时没有需要互评的搭子。</div>`
      }

      ${
        targets.length
          ? `<div class="divider"></div>
             <button class="btn btn-primary" id="btn-submit" type="button" style="width:100%;">提交互评</button>
             <div class="meta muted" style="margin-top:10px;">提交后会影响对方的“信用分”（网页预览版先本地模拟）。</div>`
          : ""
      }
    </section>
  `;

  root.querySelector("#btn-back").addEventListener("click", () => history.back());

  root.querySelectorAll("[data-stars-for]").forEach((wrap) => {
    const toUserId = wrap.dataset.starsFor;
    const update = (v) => {
      ratings.set(toUserId, v);
      wrap.querySelectorAll(".star").forEach((s) => {
        const n = Number(s.dataset.v) || 0;
        s.classList.toggle("on", n <= v);
      });
    };
    update(5);
    wrap.querySelectorAll(".star").forEach((star) => {
      star.addEventListener("click", () => {
        update(Number(star.dataset.v) || 5);
      });
    });
  });

  const btn = root.querySelector("#btn-submit");
  if (btn) {
    btn.addEventListener("click", () => {
      const ts = now();
      targets.forEach((toUserId) => {
        const score = ratings.get(toUserId) || 5;
        updateCreditFromRating({ toUserId, ratingScore: score });
        addRatingRecord({
          id: randomId("r"),
          meal_id: mealId,
          from_user_id: ctx.user.id,
          to_user_id: toUserId,
          score,
          created_at: ts
        });
      });
      toast("已提交");
      location.hash = "#/profile";
    });
  }
}

let ctx = {
  user: null,
  nowTs: now(),
  timer: null,
  feedCuisineIndex: 0,
  feedTimeIndex: 0,
  location: { lat: 39.9968, lng: 116.4707 },
  locationText: "望京附近",
  locationHint: "",
  locationNameFallback: "望京 SOHO"
};

function refreshLocation(nextCtx) {
  nextCtx.locationHint = "尝试定位中…";
  rerender();
  if (!navigator.geolocation) {
    nextCtx.locationHint = "浏览器不支持定位，先用默认位置";
    rerender();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      nextCtx.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      nextCtx.locationText = "你附近";
      nextCtx.locationHint = "";
      nextCtx.locationNameFallback = "附近";
      rerender();
    },
    () => {
      nextCtx.locationHint = "未授权定位，先用默认位置";
      rerender();
    },
    { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 }
  );
}

function rerender() {
  const root = document.querySelector("#root");
  if (!root) return;
  const { path, params } = parseHash();

  if (path === "/feed" || path === "/") renderFeed(root, ctx);
  else if (path === "/create") renderCreate(root, ctx);
  else if (path === "/detail") renderDetail(root, ctx, params.get("id") || "");
  else if (path === "/profile") renderProfile(root, ctx);
  else if (path === "/settlement") renderSettlement(root, ctx, params.get("meal_id") || "");
  else if (path === "/rate") renderRate(root, ctx, params.get("meal_id") || "");
  else {
    location.hash = "#/feed";
    return;
  }
}

function startTicker() {
  if (ctx.timer) clearInterval(ctx.timer);
  ctx.timer = setInterval(() => {
    ctx.nowTs = now();
    rerender();
  }, 1000);
}

function boot() {
  seedIfNeeded();
  ctx.user = getOrCreateUser();
  refreshLocation(ctx);
  rerender();
  startTicker();
  window.addEventListener("hashchange", rerender);
}

boot();

