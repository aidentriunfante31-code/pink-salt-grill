(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let alive = false;
  requestAnimationFrame(() => { alive = true; });

  /* Header shadow once the page moves */
  const top = document.querySelector(".top");
  const onScrollHeader = () => top.classList.toggle("scrolled", window.scrollY > 8);
  onScrollHeader();

  /* Open now, in the restaurant's own time zone */
  const HOURS = { 0: [600, 1080], 1: null, 2: [690, 1230], 3: [690, 1230], 4: [690, 1230], 5: [690, 1230], 6: [600, 1230] };
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const fmt = (m) => {
    const h = Math.floor(m / 60), mm = m % 60, h12 = ((h + 11) % 12) + 1;
    return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`;
  };
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    const mins = (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10);
    const today = HOURS[day];
    const text = document.querySelector("[data-status-text]");
    let msg;
    if (today && mins >= today[0] && mins < today[1]) {
      document.body.classList.add("is-open");
      msg = `Open now until ${fmt(today[1])}`;
    } else {
      let d = day, offset = 0;
      if (today && mins < today[0]) { msg = `Closed now. Opens today at ${fmt(today[0])}`; }
      else {
        do { d = (d + 1) % 7; offset++; } while (!HOURS[d]);
        msg = `Closed now. Opens ${offset === 1 ? "tomorrow" : DAYS[d]} at ${fmt(HOURS[d][0])}`;
      }
    }
    if (text) text.textContent = msg;
    const row = document.querySelector(`.hours li[data-day="${day}"]`);
    if (row) row.classList.add("today");
  } catch (e) { /* keep the static hours line */ }

  /* Signature: pink salt falls once and settles on the food */
  const hero = document.querySelector(".hero");
  const art = document.querySelector(".hero-art");
  const canvas = document.querySelector(".salt");
  const wordCanvas = document.querySelector(".salt-word");
  const COLORS = [["#fbe1e7", "#f2a9ba"], ["#ffffff", "#f6c9d3"], ["#f7c4cf", "#e48ba1"], ["#fde9ed", "#efb3c1"]];

  // Where salt comes to rest: on the food, around plate rims, and along the baseline of "Salt."
  function targets(cv) {
    const c = cv.getBoundingClientRect();
    const rel = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }; };
    if (cv === wordCanvas) {
      const w2 = cv.parentNode.querySelector(".w2");
      const s = rel(w2);
      // measure the real baseline so the salt rests on the marble just under the letters
      const probe = document.createElement("i");
      probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      w2.appendChild(probe);
      const base = probe.getBoundingClientRect().top - c.top;
      probe.remove();
      return [{ kind: "line", x: s.x + s.w * 0.04, w: s.w * 0.84, y: base + 9, n: 24 }];
    }
    const slab = rel(art.querySelector(".slab img"));
    return [{ kind: "box", x: slab.x + slab.w * 0.18, y: slab.y + slab.h * 0.3, w: slab.w * 0.64, h: slab.h * 0.5, n: 56 }];
  }

  function makeCrystals(cv) {
    const list = [];
    for (const t of targets(cv)) {
      for (let i = 0; i < t.n; i++) {
        let x, y;
        if (t.kind === "line") { x = t.x + Math.random() * t.w; y = t.y + (Math.random() - 0.5) * 3; }
        else { x = t.x + Math.random() * t.w; y = t.y + Math.random() * t.h; }
        const r = (t.kind === "line" ? 2.6 : 3.4) + Math.random() * (t.kind === "line" ? 2.4 : 3.6);
        const sides = 5 + Math.floor(Math.random() * 2);
        const pts = [];
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * Math.PI * 2 + Math.random() * 0.45;
          const rr = r * (0.75 + Math.random() * 0.4);
          pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
        }
        // pale crystals read on the food; deeper pink ones read on white marble under the word
        const col = t.kind === "line" ? COLORS[2] : COLORS[(Math.random() * 2) | 0];
        list.push({ x, y, y0: y - 180 - Math.random() * 320, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 5, pts, col, delay: Math.random() * 420, dur: 520 + Math.random() * 360 });
      }
    }
    return list;
  }

  function sizeCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  // A faceted crystal: shadow, a darker body, a light top facet and one glint
  function draw(cv, ctx, list, t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const c of list) {
      const p = Math.min(1, Math.max(0, (t - c.delay) / c.dur));
      if (p <= 0) continue;
      const bounce = p > 0.86 && p < 1 ? Math.sin((p - 0.86) * 22) * 14 * (1 - p) : 0;
      const y = c.y0 + (c.y - c.y0) * p * p - Math.max(0, bounce);
      ctx.save();
      ctx.translate(c.x, y);
      ctx.rotate(c.rot + c.spin * (1 - p));
      const path = (dx, dy) => { ctx.beginPath(); c.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy))); ctx.closePath(); };
      ctx.globalAlpha = 0.28; ctx.fillStyle = "#6e1f3a"; path(0.9, 1.3); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = c.col[1]; path(0, 0); ctx.fill();
      ctx.fillStyle = c.col[0];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(c.pts[0][0], c.pts[0][1]); ctx.lineTo(c.pts[1][0], c.pts[1][1]); ctx.lineTo(c.pts[2][0], c.pts[2][1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(c.pts[0][0], c.pts[0][1]); ctx.lineTo(c.pts[1][0], c.pts[1][1]); ctx.stroke();
      ctx.restore();
    }
  }

  const canvases = [canvas, wordCanvas].filter(Boolean);

  function settle() {
    for (const cv of canvases) draw(cv, sizeCanvas(cv), makeCrystals(cv), 1e6);
  }

  function sprinkle() {
    const jobs = canvases.map((cv) => ({ cv, ctx: sizeCanvas(cv), list: makeCrystals(cv) }));
    if (reduce) { jobs.forEach((j) => draw(j.cv, j.ctx, j.list, 1e6)); return; }
    const start = performance.now();
    const end = 420 + 880;
    let done = false;
    const frame = (now) => {
      if (done) return;
      const t = now - start;
      jobs.forEach((j) => draw(j.cv, j.ctx, j.list, t));
      if (t < end) requestAnimationFrame(frame); else done = true;
    };
    requestAnimationFrame(frame);
    // never leave salt hanging mid-air: after the fall, the settled state always wins
    setTimeout(() => { done = true; jobs.forEach((j) => draw(j.cv, j.ctx, j.list, 1e6)); }, 1800);
  }

  if (canvas && art) {
    hero.classList.add("pre");
    const go = () => {
      hero.classList.remove("pre");
      sprinkle();
    };
    const imgs = [...art.querySelectorAll("img")];
    Promise.all(imgs.map((i) => (i.complete ? 1 : new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); }))))
      .then(() => requestAnimationFrame(go));
    setTimeout(() => { if (hero.classList.contains("pre")) go(); }, 1500);
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(settle, 200); });
  }

  /* Parallax: three depths in the hero, transform only */
  const layers = [...document.querySelectorAll("[data-depth]")];
  let ticking = false;
  const parallax = () => {
    ticking = false;
    const y = Math.min(window.scrollY, 1200);
    for (const el of layers) el.style.translate = `0 ${(-y * parseFloat(el.dataset.depth)).toFixed(1)}px`;
  };
  window.addEventListener("scroll", () => {
    onScrollHeader();
    if (!reduce && !ticking) { ticking = true; requestAnimationFrame(parallax); }
  }, { passive: true });

  /* Phone call bar waits until the hero's own Call button has scrolled away */
  const callbar = document.querySelector(".callbar");
  const heroActions = document.querySelector(".hero .hero-actions");
  if (callbar && heroActions && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => callbar.classList.toggle("on", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(heroActions);
    setTimeout(() => { if (!alive) callbar.classList.add("on"); }, 1200);
  } else if (callbar) callbar.classList.add("on");

  /* Best sellers set down onto their salt slabs as you arrive */
  const watch = [...document.querySelectorAll(".fo")];
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const i = [...el.parentNode.children].indexOf(el);
        setTimeout(() => el.classList.add("in"), Math.min(i, 5) * 70);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    watch.forEach((el) => io.observe(el));
    setTimeout(() => { if (!alive) watch.forEach((el) => el.classList.add("in")); }, 1200);
  } else {
    watch.forEach((el) => el.classList.add("in"));
  }

  /* Menu section chips follow the reader */
  const chips = [...document.querySelectorAll(".menu-nav a")];
  const nav = document.querySelector(".menu-nav");
  const byId = new Map(chips.map((a) => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const a = byId.get(e.target.id);
        if (!a) return;
        chips.forEach((c) => c.classList.toggle("on", c === a));
        nav.scrollTo({ left: a.offsetLeft - 16, behavior: reduce ? "auto" : "smooth" });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }
  chips.forEach((a) => a.addEventListener("click", () => {
    const s = document.getElementById(a.getAttribute("href").slice(1));
    if (!s) return;
    s.classList.add("flash");
    setTimeout(() => s.classList.remove("flash"), 1400);
  }));

  /* Catering request: checks the basics, sends nothing on the concept */
  const form = document.querySelector(".cat-form");
  if (form) {
    const receipt = form.querySelector(".receipt");
    const mark = (input, msg) => {
      const err = document.getElementById(input.getAttribute("aria-describedby"));
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
      return !msg;
    };
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (form.elements.company_website.value) return;
      const { name, phone, date, guests } = form.elements;
      const digits = phone.value.replace(/\D/g, "");
      let ok = true;
      ok = mark(name, name.value.trim() ? "" : "Please add your name so we know who to ask for.") && ok;
      ok = mark(phone, digits.length >= 10 ? "" : "Please add a phone number with area code, like 661 260 3502.") && ok;
      let dateMsg = "";
      if (date.value) {
        const d = new Date(date.value + "T12:00:00");
        const t = new Date(); t.setHours(0, 0, 0, 0);
        if (d < t) dateMsg = "That date has already passed. Pick an upcoming date.";
      }
      ok = mark(date, dateMsg) && ok;
      ok = mark(guests, guests.value && Number(guests.value) < 1 ? "Guests should be 1 or more." : "") && ok;
      if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }
      const when = date.value ? ` for ${new Date(date.value + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}` : "";
      const count = guests.value ? ` (${guests.value} guests)` : "";
      receipt.querySelector("[data-receipt]").textContent = `We'd call ${name.value.trim()} at ${phone.value.trim()} about your event${when}${count}.`;
      receipt.hidden = false;
      form.querySelector('button[type="submit"]').textContent = "Request noted";
    });
  }
})();
