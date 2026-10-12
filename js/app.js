/* One Day Closer — app logic. Texts live in js/content.js. */
(() => {
  "use strict";

  const C = window.CONTENT;
  const DAYS = C.days;
  const FIRST = DAYS[0].date;
  const LAST = DAYS[DAYS.length - 1].date;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");
  const motionOK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Storage (never required: everything works without it) ── */
  const store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem("odc:" + k);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("odc:" + k, JSON.stringify(v));
      } catch {}
    },
  };
  const getList = (k) => {
    const v = store.get(k, []);
    return Array.isArray(v) ? v : [];
  };
  const addTo = (k, val) => {
    const l = getList(k);
    if (!l.includes(val)) store.set(k, [...l, val]);
  };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* ── Dates (local time; ?date=2026-10-15 overrides it for testing) ── */
  const pad = (n) => String(n).padStart(2, "0");
  const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const getToday = () => {
    const q = new URLSearchParams(location.search).get("date");
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : localISO(new Date());
  };
  let TODAY = getToday();
  const toDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
  const dayNum = (d) => Number(d.date.slice(8));
  const phase = () => (TODAY < FIRST ? "before" : TODAY > LAST ? "after" : "during");
  const stateOf = (d) => (d.date === TODAY ? "today" : d.date < TODAY ? "past" : "future");
  const isOpen = (d) => d.date <= TODAY;
  const isDone = (d) => getList("done").includes(d.date);
  const finalOpen = () => TODAY > LAST || (TODAY === LAST && getList("seen").includes(LAST));

  /* ── Language ── */
  let lang = store.get("lang", null);
  if (lang !== "en" && lang !== "fr") lang = (navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en";
  const L = (o) => (o ? (o[lang] ?? o.en) : "");
  const t = (k, vars = {}) => String(L(C.ui[k])).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "");
  const fmt = (iso, opts) => new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", opts).format(toDate(iso));
  const longDate = (iso) => fmt(iso, { weekday: "long", month: "long", day: "numeric" });
  const shortDate = (iso) => fmt(iso, { month: "short", day: "numeric" });
  const quoted = (s) => (lang === "fr" ? `« ${s} »` : `“${s}”`);
  const name = () => (C.name || "").trim() || t("defaultName");

  /* ── Drawings ── */
  const ecgSVG = `
    <svg class="ecg" viewBox="0 0 320 60" aria-hidden="true" focusable="false">
      <path class="ecg-line" pathLength="1" d="M2 36 H92 L102 36 L110 14 L121 54 L130 24 L137 36 H190" />
      <path class="ecg-heart" d="M214 48 C199 38 194 28 200 21 C205 15 212 18 214 23 C216 18 223 15 228 21 C234 28 229 38 214 48 Z" />
      <path class="ecg-line ecg-tail" pathLength="1" d="M238 36 H318" />
    </svg>`;
  const sunriseSVG = `
    <svg class="hero-sunrise" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#fff3c4" />
          <stop offset=".6" stop-color="#ffdca0" />
          <stop offset="1" stop-color="#ffc9a8" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle class="sun" cx="300" cy="96" r="58" fill="url(#sun)" />
      <path d="M0 92 C80 66 150 76 222 90 S340 108 400 84 V120 H0Z" fill="#d4ebdd" />
      <path d="M0 106 C90 90 180 98 262 108 S362 116 400 102 V120 H0Z" fill="#bfe0cc" />
    </svg>`;

  /* ── Pieces ── */
  function timeline() {
    const p = phase();
    const idx = DAYS.findIndex((d) => d.date === TODAY);
    const fill = p === "before" ? 0 : p === "after" ? 1 : idx / (DAYS.length - 1);
    const items = DAYS.map((d) => {
      const s = stateOf(d);
      const done = isDone(d);
      const icon = done ? "✓" : s === "future" ? "🔒" : dayNum(d);
      const extra = s === "future" ? ` (${t("locked")})` : s === "today" ? ` (${t("today")})` : "";
      return `<li class="tl-item is-${s}${done ? " is-done" : ""}">
          <a class="tl-dot" href="#/day/${dayNum(d)}" aria-label="${esc(`${longDate(d.date)} — ${L(d.theme)}${extra}`)}"${s === "today" ? ' aria-current="date"' : ""}><span aria-hidden="true">${icon}</span></a>
          <span class="tl-label" aria-hidden="true">${esc(shortDate(d.date))}</span>
        </li>`;
    }).join("");
    return `<ol class="timeline" style="--fill:${fill}" aria-label="${esc(t("progressLabel"))}">${items}</ol>`;
  }

  function statusText() {
    const p = phase();
    if (p === "before") {
      const n = daysBetween(TODAY, FIRST);
      return n === 1 ? t("statusTomorrow") : t("statusBefore", { n });
    }
    if (p === "after") return t("statusAfter");
    return L(C.ui.statusDuring)[DAYS.findIndex((d) => d.date === TODAY)];
  }

  function cta() {
    const p = phase();
    if (p === "during") return { href: `#/day/${Number(TODAY.slice(8))}`, label: t("ctaToday") };
    if (p === "before") return { href: `#/day/${dayNum(DAYS[0])}`, label: t("ctaBefore") };
    return { href: "#/final", label: t("ctaAfter") };
  }

  /* ── Views ── */
  function viewHome() {
    const c = cta();
    const mood = store.get("mood:" + TODAY, null);
    const moodItem = C.mood.find((m) => m.id === mood);
    const cards = DAYS.map((d) => {
      const s = stateOf(d);
      const done = isDone(d);
      const badge = done ? t("doneBadge") : s === "today" ? t("today") : s === "future" ? t("opensOn", { date: shortDate(d.date) }) : "";
      return `<li>
          <a class="day-card is-${s}${done ? " is-done" : ""}" href="#/day/${dayNum(d)}"${s === "today" ? ' aria-current="date"' : ""}>
            <span class="dc-top">
              <span class="dc-emoji" aria-hidden="true">${s === "future" ? "🔒" : d.emoji}</span>
              ${badge ? `<span class="dc-badge">${esc(badge)}</span>` : ""}
            </span>
            <span class="dc-date">${esc(fmt(d.date, { weekday: "short", month: "short", day: "numeric" }))}</span>
            <span class="dc-theme">${esc(L(d.theme))}</span>
          </a>
        </li>`;
    }).join("");

    return `
      <section class="hero" aria-labelledby="hero-title">
        ${sunriseSVG}
        <div class="hero-inner">
          ${ecgSVG}
          <p class="eyebrow">${esc(t("eyebrow"))}</p>
          <h1 id="hero-title" tabindex="-1">${esc(t("heroTitle"))} <span aria-hidden="true">🩺</span></h1>
          <p class="lead">${esc(t("heroSub"))}</p>
          ${timeline()}
          <p class="status">${esc(statusText())}</p>
          <a class="btn btn-primary btn-big" href="${c.href}">${esc(c.label)}</a>
          <p class="note">${esc(t("dailyNote"))}</p>
        </div>
        <button class="secret-heart" type="button" aria-label="${esc(t("heartLabel"))}" aria-controls="heart-note"><span aria-hidden="true">♥</span></button>
      </section>
      <p id="heart-note" class="heart-note" role="status" aria-live="polite"></p>

      <section class="card" aria-labelledby="days-title">
        <h2 id="days-title">${esc(t("daysTitle"))}</h2>
        <ul class="day-grid">${cards}</ul>
      </section>

      <section class="card" aria-labelledby="mood-title">
        <h2 id="mood-title">${esc(t("moodTitle"))}</h2>
        <div class="mood-grid" role="group" aria-labelledby="mood-title">
          ${C.mood.map((m) => `<button type="button" class="chip" data-mood="${m.id}" aria-pressed="${mood === m.id}"><span aria-hidden="true">${m.emoji}</span> ${esc(L(m.label))}</button>`).join("")}
        </div>
        <p class="bubble bubble-green mood-reply" role="status" aria-live="polite">${moodItem ? esc(L(moodItem.reply)) : ""}</p>
      </section>

      <section class="card motivation" aria-labelledby="motiv-title">
        <h2 id="motiv-title">${esc(t("motivTitle"))}</h2>
        <button type="button" class="btn btn-soft motiv-btn"><span aria-hidden="true">✨</span> ${esc(t("motivBtn"))}</button>
        <p class="motiv-out" role="status" aria-live="polite"></p>
      </section>`;
  }

  function viewLocked(title, text) {
    return `
      <section class="card locked">
        <p class="big-emoji" aria-hidden="true">🔒</p>
        <h1 tabindex="-1">${esc(title)}</h1>
        <p>${esc(text)}</p>
        <a class="btn btn-primary" href="#/">${esc(t("backHome"))}</a>
      </section>`;
  }

  function viewDay(i) {
    const d = DAYS[i];
    if (!isOpen(d)) return viewLocked(t("lockedTitle"), t("lockedText", { date: longDate(d.date) }));

    const n = i + 1;
    const opened = getList("opened").includes(d.date);
    const done = isDone(d);
    const prev = DAYS[i - 1];
    const next = DAYS[i + 1];
    const isLast = i === DAYS.length - 1;

    return `
      <nav class="crumbs"><a href="#/">${esc(t("back"))}</a></nav>

      <header class="day-head">
        <p class="eyebrow">${esc(t("dayOf", { n }))} · ${esc(longDate(d.date))}</p>
        <h1 tabindex="-1"><span class="day-emoji" aria-hidden="true">${d.emoji}</span> ${esc(L(d.theme))}</h1>
      </header>

      <figure class="card quote" aria-label="${esc(t("quoteLabel"))}">
        <blockquote><p>${esc(quoted(L(d.quote)))}</p></blockquote>
        <figcaption>— ${esc(L(d.quote.author))}</figcaption>
      </figure>

      <article class="card letter">
        <p class="hand greet">${esc(t("greeting", { name: name() }))}</p>
        <p>${esc(L(d.message))}</p>
        <p class="hand sign">${esc(L(C.signature))}</p>
      </article>

      <section class="card rx" aria-labelledby="rx-title">
        <div class="rx-mark" aria-hidden="true">℞</div>
        <div>
          <h2 id="rx-title">${esc(t("rxTitle"))}</h2>
          <p>${esc(L(d.tip))}</p>
          <p class="hand rx-refills">${esc(t("rxRefills"))}</p>
        </div>
      </section>

      <section class="card envelope-card">
        <button type="button" class="envelope${opened ? " is-open" : ""}" aria-expanded="${opened}" aria-controls="secret-${n}" data-date="${d.date}">
          <span class="env" aria-hidden="true">
            <span class="env-back"></span>
            <span class="env-paper"></span>
            <span class="env-front"></span>
            <span class="env-flap"></span>
            <span class="env-seal">♥</span>
          </span>
          <span class="env-label">${esc(opened ? t("envOpened") : t("envLabel"))}</span>
        </button>
        <div class="secret" id="secret-${n}"${opened ? "" : " hidden"}>
          <p class="hand">${esc(L(d.secret))}</p>
        </div>
      </section>

      <p class="joke"><span aria-hidden="true">💊</span> ${esc(L(d.joke))}</p>

      <section class="card done-card">
        <button type="button" class="btn btn-green btn-big done-btn" data-date="${d.date}"><span aria-hidden="true">🌟</span> ${esc(t("doneBtn"))}</button>
        <p class="done-hint">${esc(t("doneHint"))}</p>
        <p class="bubble bubble-green done-msg" role="status" aria-live="polite">${done ? esc(L(d.done)) : ""}</p>
        ${isLast && finalOpen() ? `<a class="btn btn-primary btn-big final-link" href="#/final">${esc(t("finalUnlock"))}</a>` : ""}
      </section>

      <nav class="pager">
        ${prev ? `<a class="btn btn-ghost" href="#/day/${dayNum(prev)}">${esc(t("prev"))}</a>` : "<span></span>"}
        ${next ? `<a class="btn btn-ghost" href="#/day/${dayNum(next)}">${esc(t("next"))}</a>` : "<span></span>"}
      </nav>`;
  }

  function viewFinal() {
    if (!finalOpen()) return viewLocked(t("lockedTitle"), t("finalLockedText"));
    const F = C.final;
    return `
      <section class="final-hero">
        <p class="big-emoji" aria-hidden="true">🎉</p>
        <h1 tabindex="-1">${esc(L(F.title))}</h1>
        <p class="lead">${esc(L(F.lead))}</p>
        <p>${esc(L(F.body))}</p>
        <p class="closing">${esc(L(F.closing))}</p>
        <button type="button" class="btn btn-soft confetti-btn">${esc(t("moreConfetti"))}</button>
      </section>

      <article class="card letter">
        <p class="hand greet">${esc(t("greeting", { name: name() }))}</p>
        <p>${esc(L(F.note))}</p>
        <p class="hand sign">${esc(L(C.signature))}</p>
      </article>

      <section class="card replay" aria-labelledby="replay-title">
        <h2 id="replay-title">${esc(t("replayTitle"))}</h2>
        <div class="replay-out" role="status" aria-live="polite"></div>
        <button type="button" class="btn btn-soft replay-btn">${esc(t("replayBtn"))}</button>
      </section>

      <p class="joke"><span aria-hidden="true">🥳</span> ${esc(t("celebrateNote"))}</p>
      <nav class="pager"><a class="btn btn-ghost" href="#/">${esc(t("back"))}</a><span></span></nav>`;
  }

  /* ── Router ── */
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const m = h.match(/^day\/(\d{1,2})$/);
    if (m) {
      const i = DAYS.findIndex((d) => dayNum(d) === Number(m[1]));
      if (i >= 0) return { view: "day", i };
    }
    if (h === "final") return { view: "final" };
    return { view: "home" };
  }

  let firstFinalRender = true;
  function render(moveFocus) {
    const r = route();
    document.documentElement.lang = lang;
    document.title = t("docTitle");
    $(".brand-text").textContent = t("brand");
    $(".lang").setAttribute("aria-label", t("langLabel"));
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $("#footer-joke").textContent = L(C.footerJokes)[jokeIndex % L(C.footerJokes).length];

    if (r.view === "day" && isOpen(DAYS[r.i])) addTo("seen", DAYS[r.i].date);
    app.innerHTML = r.view === "day" ? viewDay(r.i) : r.view === "final" ? viewFinal() : viewHome();
    app.dataset.view = r.view;

    if (moveFocus) {
      window.scrollTo(0, 0);
      $("h1", app)?.focus({ preventScroll: true });
    }
    if (r.view === "final" && finalOpen() && moveFocus !== null && firstFinalRender) {
      firstFinalRender = false;
      setTimeout(() => confetti(180), 350);
    }
    if (r.view !== "final") firstFinalRender = true;
  }

  /* ── Interactions (one delegated listener) ── */
  let heartIdx = 0;
  let lastMotiv = -1;
  let replayPool = [];
  const jokeIndex = Math.floor(Math.random() * 4);

  function pop(el) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function buildReplayPool() {
    const pool = [];
    DAYS.forEach((d, i) => {
      if (!isOpen(d)) return;
      const n = i + 1;
      pool.push({ src: t("srcQuote", { n }), text: `${quoted(L(d.quote))} — ${L(d.quote.author)}` });
      pool.push({ src: t("srcMessage", { n }), text: L(d.message) });
      pool.push({ src: t("srcSecret", { n }), text: L(d.secret) });
    });
    L(C.heartNotes).forEach((text) => pool.push({ src: t("srcHeart"), text }));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }

  app.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.matches(".secret-heart")) {
      const notes = L(C.heartNotes);
      const out = $("#heart-note");
      out.textContent = notes[heartIdx % notes.length];
      heartIdx++;
      pop(out);
      pop(btn);
      floatHearts(btn);
      return;
    }

    if (btn.dataset.mood) {
      const m = C.mood.find((x) => x.id === btn.dataset.mood);
      store.set("mood:" + TODAY, m.id);
      $$(".chip", app).forEach((c) => c.setAttribute("aria-pressed", String(c === btn)));
      const out = $(".mood-reply", app);
      out.textContent = L(m.reply);
      pop(out);
      return;
    }

    if (btn.matches(".motiv-btn")) {
      const list = L(C.motivation);
      let i;
      do i = Math.floor(Math.random() * list.length);
      while (list.length > 1 && i === lastMotiv);
      lastMotiv = i;
      const out = $(".motiv-out", app);
      out.textContent = list[i];
      pop(out);
      return;
    }

    if (btn.matches(".envelope")) {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      btn.classList.toggle("is-open", open);
      $(".env-label", btn).textContent = open ? t("envOpened") : t("envLabel");
      const secret = $("#" + btn.getAttribute("aria-controls"));
      secret.hidden = !open;
      if (open) {
        addTo("opened", btn.dataset.date);
        pop(secret);
        floatHearts(btn);
      }
      return;
    }

    if (btn.matches(".done-btn")) {
      const d = DAYS.find((x) => x.date === btn.dataset.date);
      addTo("done", d.date);
      const out = $(".done-msg", app);
      out.textContent = L(d.done);
      pop(out);
      confetti(140);
      return;
    }

    if (btn.matches(".confetti-btn")) {
      confetti(180);
      return;
    }

    if (btn.matches(".replay-btn")) {
      if (!replayPool.length) replayPool = buildReplayPool();
      const item = replayPool.pop();
      const out = $(".replay-out", app);
      out.innerHTML = `<p class="replay-src">${esc(item.src)}</p><p class="replay-text">${esc(item.text)}</p>`;
      btn.textContent = t("replayAgain");
      pop(out);
    }
  });

  $(".lang").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    store.set("lang", lang);
    replayPool = [];
    render(null);
  });

  window.addEventListener("hashchange", () => render(true));

  // If the page stays open past midnight, move on to the new day.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const now = getToday();
    if (now !== TODAY) {
      TODAY = now;
      render(false);
    }
  });

  /* ── Little floating hearts ── */
  function floatHearts(origin) {
    if (!motionOK()) return;
    const r = origin.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const h = document.createElement("span");
      h.className = "float-heart";
      h.textContent = "♥";
      h.setAttribute("aria-hidden", "true");
      h.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * 40}px`;
      h.style.top = `${r.top + r.height / 2}px`;
      h.style.setProperty("--dx", `${(Math.random() - 0.5) * 80}px`);
      h.style.animationDelay = `${i * 70}ms`;
      h.style.color = ["#e5677f", "#f2a3b5", "#ffb48a"][i % 3];
      document.body.appendChild(h);
      h.addEventListener("animationend", () => h.remove());
    }
  }

  /* ── Confetti (skipped when reduced motion is on) ── */
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  let pieces = [];
  let raf = 0;
  const COLORS = ["#5b93c9", "#7cc4a0", "#ffb48a", "#f2a3b5", "#ffd86b", "#1c2d4f"];

  function confetti(amount) {
    if (!motionOK() || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = innerWidth;
    const H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < amount; i++) {
      const fromLeft = i % 2 === 0;
      pieces.push({
        x: fromLeft ? -10 : W + 10,
        y: H * (0.55 + Math.random() * 0.25),
        vx: (fromLeft ? 1 : -1) * (3 + Math.random() * 7),
        vy: -(8 + Math.random() * 9),
        s: 5 + Math.random() * 6,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        c: COLORS[i % COLORS.length],
        heart: Math.random() < 0.2,
        life: 0,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    const W = innerWidth;
    const H = innerHeight;
    ctx.clearRect(0, 0, W, H);
    pieces = pieces.filter((p) => p.y < H + 40 && p.life < 420);
    for (const p of pieces) {
      p.life++;
      p.vx *= 0.985;
      p.vy = Math.min(p.vy + 0.25, 3.2);
      p.x += p.vx + Math.sin((p.life + p.s) / 12) * 0.6;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.heart) {
        ctx.font = `${p.s * 2.4}px sans-serif`;
        ctx.fillText("♥", -p.s, p.s);
      } else {
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      }
      ctx.restore();
    }
    if (pieces.length) raf = requestAnimationFrame(tick);
    else {
      ctx.clearRect(0, 0, W, H);
      raf = 0;
    }
  }

  /* ── Start ── */
  render(false);

  // Works offline once loaded (where the browser allows it).
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
