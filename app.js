(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = window.matchMedia("(max-width: 767px)");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (p, a, b) => clamp((p - a) / (b - a));

  /* Header goes dark while it sits over a lamp-lit section */
  const top = $(".top");
  const darks = $$("[data-dark]");
  const headerTheme = () => {
    const y = top.offsetHeight + 2; // the band just under the header
    top.classList.toggle("on-dark", darks.some((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
  };

  /* Phones: the home page is one long page, so its links jump within it */
  const anchored = $$("a[data-anchor]");
  anchored.forEach((a) => (a.dataset.page = a.getAttribute("href")));
  const syncLinks = () => {
    const onePage = document.body.classList.contains("page-home") && phone.matches;
    anchored.forEach((a) => a.setAttribute("href", onePage ? a.dataset.anchor : a.dataset.page));
  };
  syncLinks();
  phone.addEventListener?.("change", syncLinks);

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
    let msg;
    if (today && mins >= today[0] && mins < today[1]) {
      document.body.classList.add("is-open");
      msg = `Open now until ${fmt(today[1])}`;
    } else if (today && mins < today[0]) {
      msg = `Closed now. Opens today at ${fmt(today[0])}`;
    } else {
      let d = day, offset = 0;
      do { d = (d + 1) % 7; offset++; } while (!HOURS[d]);
      msg = `Closed now. Opens ${offset === 1 ? "tomorrow" : DAYS[d]} at ${fmt(HOURS[d][0])}`;
    }
    $$("[data-status-text]").forEach((t) => (t.textContent = msg));
    $$(`.hours li[data-day="${day}"]`).forEach((r) => r.classList.add("today"));
  } catch (e) { /* keep the static hours line */ }

  /* ---------- The kitchen: scroll drives fire, sizzle, salt, table ---------- */
  const kitchen = $(".kitchen");
  let kitchenFrame = null;
  if (kitchen && !reduce) {
    kitchen.classList.add("live");
    const stage = $(".stage", kitchen);
    const skillet = $(".k-skillet", kitchen);
    const fire = $(".k-fire", kitchen), air = $(".k-air", kitchen);
    const fctx = fire.getContext("2d"), actx = air.getContext("2d");
    const lines = $$(".k-line", kitchen), rail = $$(".k-rail li", kitchen), cta = $(".k-cta", kitchen);
    const plates = $$(".kp", kitchen).filter((el) => getComputedStyle(el).display !== "none");
    const FROM = { "kp-bagoong": [1, 0], "kp-karekare": [1, 0.2], "kp-skewers": [0, 1], "kp-friedchicken": [-0.6, -1] };
    const WINDOWS = [[0.0, 0.22], [0.22, 0.46], [0.46, 0.7], [0.7, 1.01]];
    let W = 0, H = 0, dpr = 1;

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, phone.matches ? 1.5 : 2);
      W = stage.clientWidth; H = stage.clientHeight;
      for (const [cv, ctx] of [[fire, fctx], [air, actx]]) {
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    size();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(size, 150); });

    // seeded random so salt lands in the same places when you scroll back
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const SALT = Array.from({ length: 74 }, () => {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
      const sides = 5 + Math.floor(rnd() * 2), size = 3 + rnd() * 3.6, pts = [];
      for (let k = 0; k < sides; k++) { const t = (k / sides) * Math.PI * 2 + rnd() * 0.45; const rr = size * (0.75 + rnd() * 0.4); pts.push([Math.cos(t) * rr, Math.sin(t) * rr]); }
      return { fx: 0.47 + Math.cos(a) * r * 0.27, fy: 0.37 + Math.sin(a) * r * 0.2, t0: 0.47 + rnd() * 0.17, rot: rnd() * 6.28, spin: (rnd() - 0.5) * 6, pts, light: rnd() > 0.45, x0: (rnd() - 0.5) * 120 };
    });
    const embers = [], puffs = [];

    const drawCrystal = (c, x, y, rot) => {
      actx.save(); actx.translate(x, y); actx.rotate(rot);
      const path = (dx, dy) => { actx.beginPath(); c.pts.forEach(([px, py], i) => (i ? actx.lineTo(px + dx, py + dy) : actx.moveTo(px + dx, py + dy))); actx.closePath(); };
      actx.globalAlpha = 0.3; actx.fillStyle = "#4a1426"; path(1, 1.4); actx.fill();
      actx.globalAlpha = 1; actx.fillStyle = c.light ? "#f6c9d3" : "#e48ba1"; path(0, 0); actx.fill();
      actx.fillStyle = c.light ? "#fff" : "#f7c4cf";
      actx.beginPath(); actx.moveTo(0, 0); actx.lineTo(c.pts[0][0], c.pts[0][1]); actx.lineTo(c.pts[1][0], c.pts[1][1]); actx.lineTo(c.pts[2][0], c.pts[2][1]); actx.closePath(); actx.fill();
      actx.restore();
    };

    let last = performance.now();
    kitchenFrame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const r = kitchen.getBoundingClientRect();
      const p = clamp(-r.top / (kitchen.offsetHeight - window.innerHeight));
      const f1 = seg(p, 0, 0.2), f2 = seg(p, 0.22, 0.44), f4 = seg(p, 0.7, 0.9);
      const heat = (0.3 + 0.7 * ease(f1)) * (1 - ease(f4));
      const steam = ease(f2) * (1 - 0.45 * seg(p, 0.5, 0.68)) * (1 - ease(f4));
      const table = ease(f4);
      stage.style.setProperty("--table", table.toFixed(3));

      // skillet: rises in on the fire, shivers while it sizzles, settles onto the table
      const jit = steam > 0.05 ? Math.sin(now / 37) * 0.7 * steam : 0;
      const sc = (0.84 + 0.16 * ease(f1)) * (1 - 0.2 * table);
      const lift = (1 - ease(f1)) * 40 - table * 10;
      skillet.style.transform = `translate(${jit}px, ${lift}px) scale(${sc.toFixed(4)})`;

      // copy: one line per chapter
      const ch = WINDOWS.findIndex(([a, b]) => p >= a && p < b);
      lines.forEach((el, i) => {
        const [a, b] = WINDOWS[i];
        const fin = ease(seg(p, a + 0.01, a + 0.06));
        const fout = i < 3 ? ease(seg(p, b - 0.05, b)) : 0;
        const o = i === 0 && p < 0.02 ? 1 : fin * (1 - fout);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${((1 - fin) * 26 - fout * 26).toFixed(1)}px)`;
      });
      rail.forEach((li, i) => li.classList.toggle("on", i === Math.max(0, ch)));
      cta.classList.toggle("on", p > 0.8);

      // table: plates slide in from where they were cut off on the printed menu
      plates.forEach((el, i) => {
        const q = ease(seg(f4, i * 0.12, i * 0.12 + 0.55));
        const [dx, dy] = FROM[[...el.classList].find((c) => FROM[c])] || [0, 1];
        el.style.opacity = q.toFixed(3);
        el.style.transform = `translate(${(dx * (1 - q) * W * 0.4).toFixed(1)}px, ${(dy * (1 - q) * H * 0.5).toFixed(1)}px)`;
      });

      // fire, behind the skillet
      const s = skillet.getBoundingClientRect(), st = stage.getBoundingClientRect();
      const sx = s.left - st.left, sy = s.top - st.top, sw = s.width, sh = s.height;
      const cx = sx + sw * 0.47, cy = sy + sh * 0.6;
      fctx.clearRect(0, 0, W, H);
      if (heat > 0.01) {
        fctx.globalCompositeOperation = "lighter";
        const g = fctx.createRadialGradient(cx, cy, 0, cx, cy, sw * (0.55 + 0.35 * heat));
        g.addColorStop(0, `rgba(255,150,60,${0.55 * heat})`); g.addColorStop(0.5, `rgba(240,100,40,${0.22 * heat})`); g.addColorStop(1, "rgba(0,0,0,0)");
        fctx.fillStyle = g; fctx.fillRect(0, 0, W, H);
        // a gas ring under the pan: overlapping tongues, blue at the root, soft at the tips
        const n = 56, scale = phone.matches ? 0.7 : 1;
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const fx = cx + Math.cos(a) * sw * 0.42, fy = cy + Math.sin(a) * sh * 0.28;
            const flick = 0.55 + 0.45 * Math.sin(now / 80 + i * 2.3) * Math.sin(now / 47 + i * 0.7);
            const fh = (pass ? 12 + 14 * flick : 22 + 30 * flick) * heat * scale;
            const fw = (pass ? 4 : 11) * (0.6 + heat * 0.4) * scale;
            const fg = fctx.createLinearGradient(fx, fy, fx, fy - fh);
            if (pass) { fg.addColorStop(0, `rgba(110,150,255,${0.5 * heat})`); fg.addColorStop(0.5, `rgba(255,230,170,${0.45 * heat})`); fg.addColorStop(1, "rgba(255,200,120,0)"); }
            else { fg.addColorStop(0, `rgba(255,170,80,${0.32 * heat})`); fg.addColorStop(0.55, `rgba(240,90,30,${0.2 * heat})`); fg.addColorStop(1, "rgba(200,40,20,0)"); }
            const lean = Math.sin(now / 300 + i) * fw * 0.5;
            fctx.fillStyle = fg; fctx.beginPath();
            fctx.moveTo(fx - fw, fy); fctx.quadraticCurveTo(fx - fw * 0.5 + lean, fy - fh * 0.55, fx + lean * 1.6, fy - fh); fctx.quadraticCurveTo(fx + fw * 0.5 + lean, fy - fh * 0.55, fx + fw, fy); fctx.closePath(); fctx.fill();
          }
        }
        if (embers.length < 140 && Math.random() < heat * 0.9) {
          const a = Math.random() * Math.PI * 2;
          embers.push({ x: cx + Math.cos(a) * sw * 0.45, y: cy + Math.sin(a) * sh * 0.25, vy: -(40 + Math.random() * 70), ph: Math.random() * 6, life: 0, max: 1.6 + Math.random() * 1.6, r: 0.8 + Math.random() * 1.8 });
        }
      }
      fctx.globalCompositeOperation = "lighter";
      for (let i = embers.length - 1; i >= 0; i--) {
        const m = embers[i]; m.life += dt; m.y += m.vy * dt; m.x += Math.sin(m.ph + m.life * 3) * 18 * dt;
        if (m.life > m.max) { embers.splice(i, 1); continue; }
        const a = (1 - m.life / m.max) * Math.max(heat, 0.2);
        fctx.fillStyle = `rgba(255,${150 + (m.r * 30) | 0},80,${a})`; fctx.beginPath(); fctx.arc(m.x, m.y, m.r, 0, 6.283); fctx.fill();
      }
      fctx.globalCompositeOperation = "source-over";

      // steam and salt, in front of the skillet
      actx.clearRect(0, 0, W, H);
      if (steam > 0.02 && puffs.length < 40 && Math.random() < steam * 0.5) {
        puffs.push({ x: sx + sw * (0.3 + Math.random() * 0.36), y: sy + sh * (0.28 + Math.random() * 0.15), life: 0, max: 2.2 + Math.random() * 1.6, r0: 14 + Math.random() * 16, ph: Math.random() * 6 });
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const u = puffs[i]; u.life += dt;
        if (u.life > u.max) { puffs.splice(i, 1); continue; }
        const k = u.life / u.max, y = u.y - k * 150, x = u.x + Math.sin(u.ph + u.life * 1.4) * 22 * k, rad = u.r0 + k * 70;
        const a = Math.sin(k * Math.PI) * 0.16 * Math.max(steam, 0.25);
        const g = actx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(255,248,240,${a})`); g.addColorStop(1, "rgba(255,248,240,0)");
        actx.fillStyle = g; actx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      for (const c of SALT) {
        const q = seg(p, c.t0, c.t0 + 0.06);
        if (q <= 0) continue;
        const lx = sx + sw * c.fx, ly = sy + sh * c.fy;
        const y = -20 + (ly + 20) * q * q, x = lx + c.x0 * (1 - q);
        drawCrystal(c, x, y, c.rot + c.spin * (1 - q));
      }
    };
  }

  /* One loop for everything that follows scroll */
  let looping = false;
  const kitchenInView = () => { const r = kitchen.getBoundingClientRect(); return r.bottom > -100 && r.top < window.innerHeight + 100; };
  const tick = (now) => {
    if (!kitchenInView()) { looping = false; return; }
    kitchenFrame(now);
    requestAnimationFrame(tick);
  };
  const onScroll = () => {
    headerTheme();
    revealHangs();
    if (kitchenFrame && !looping && kitchenInView()) { looping = true; requestAnimationFrame(tick); }
  };
  let hq = false;
  window.addEventListener("scroll", () => { if (!hq) { hq = true; requestAnimationFrame(() => { hq = false; onScroll(); }); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  document.fonts?.ready.then(onScroll);

  /* Phone call bar: waits until the hero's own buttons have scrolled away */
  const callbar = $(".callbar");
  const heroActions = $(".hero .actions");
  if (callbar && heroActions && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => callbar.classList.toggle("on", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(heroActions);
  } else if (callbar) callbar.classList.add("on");

  /* Best sellers hang themselves on the wall as you arrive */
  function revealHangs() {
    $$(".hang:not(.in)").forEach((el, i) => {
      if (reduce || el.getBoundingClientRect().top < window.innerHeight * 0.9) setTimeout(() => el.classList.add("in"), (i % 3) * 110);
    });
    // social logos slide out of their buttons as the row arrives
    $$(".socials:not(.in)").forEach((el) => {
      if (reduce || el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("in");
    });
  }
  onScroll();

  /* Menu section chips follow the reader */
  $$(".chips").forEach((nav) => {
    const chips = $$("a", nav);
    const byId = new Map(chips.map((a) => [a.getAttribute("href").slice(1), a]));
    if ("IntersectionObserver" in window) {
      const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const a = byId.get(e.target.id); if (!a) return;
        chips.forEach((c) => c.classList.toggle("on", c === a));
        nav.scrollTo({ left: a.offsetLeft - 20, behavior: reduce ? "auto" : "smooth" });
      }), { rootMargin: "-30% 0px -60% 0px" });
      byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
    }
    chips.forEach((a) => a.addEventListener("click", () => {
      const s = document.getElementById(a.getAttribute("href").slice(1));
      if (!s) return;
      s.classList.add("flash"); setTimeout(() => s.classList.remove("flash"), 1400);
    }));
  });

  /* Catering request: checks the basics, sends nothing on the concept */
  $$(".cat-form").forEach((form) => {
    const receipt = $(".receipt", form);
    const mark = (input, msg) => {
      const err = document.getElementById(input.getAttribute("aria-describedby"));
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
      return !msg;
    };
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (form.elements.company_website.value) return;
      const { name, phone: tel, date, guests } = form.elements;
      const digits = tel.value.replace(/\D/g, "");
      let ok = true;
      ok = mark(name, name.value.trim() ? "" : "Please add your name so we know who to ask for.") && ok;
      ok = mark(tel, digits.length >= 10 ? "" : "Please add a phone number with area code, like 661 260 3502.") && ok;
      let dateMsg = "";
      if (date.value) {
        const d = new Date(date.value + "T12:00:00"), t = new Date(); t.setHours(0, 0, 0, 0);
        if (d < t) dateMsg = "That date has already passed. Pick an upcoming date.";
      }
      ok = mark(date, dateMsg) && ok;
      ok = mark(guests, guests.value && Number(guests.value) < 1 ? "Guests should be 1 or more." : "") && ok;
      if (!ok) { $('[aria-invalid="true"]', form).focus(); return; }
      const when = date.value ? ` for ${new Date(date.value + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}` : "";
      const count = guests.value ? ` (${guests.value} guests)` : "";
      $("[data-receipt]", receipt).textContent = `We'd call ${name.value.trim()} at ${tel.value.trim()} about your event${when}${count}.`;
      receipt.hidden = false;
      $('button[type="submit"]', form).textContent = "Request noted";
    });
  });
})();
