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

  /* ---------- The kitchen: a four-chapter film that plays itself once you reach it ---------- */
  const kitchen = $(".kitchen");
  let kitchenCheck = () => {};
  if (kitchen && !reduce) {
    kitchen.classList.add("live");
    const stage = $(".stage", kitchen);
    const clips = $$(".k-clip", kitchen);
    const lines = $$(".k-line", kitchen), rail = $$(".k-rail li", kitchen);
    const tc = $(".k-tc-n", kitchen), pp = $(".k-pp", kitchen);
    const HOLD = 5600; // each chapter's screen time, a little longer than its 4.4 s loop
    let ch = -1, timer = 0, running = false, paused = false, warmed = false;

    const show = (i) => {
      ch = (i + clips.length) % clips.length;
      clips.forEach((v, k) => {
        if (k === ch) {
          v.classList.add("on");
          try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
          v.play().catch(() => {});
        } else if (v.classList.contains("on")) {
          v.classList.remove("on");
          setTimeout(() => { if (!v.classList.contains("on")) v.pause(); }, 1400); // after the dissolve
        }
      });
      lines.forEach((el, k) => el.classList.toggle("on", k === ch));
      rail.forEach((li, k) => li.classList.toggle("on", k === ch));
      tc.textContent = String(ch + 1).padStart(2, "0");
      stage.classList.toggle("open", ch === clips.length - 1); // the letterbox opens for the table
    };
    const next = () => { show(ch + 1); timer = setTimeout(next, HOLD); };
    const start = () => {
      if (running || paused) return;
      running = true;
      if (!warmed) { warmed = true; clips.forEach((v) => { v.preload = "auto"; }); }
      if (ch < 0) show(0); else clips[ch].play().catch(() => {});
      timer = setTimeout(next, HOLD);
    };
    const stop = () => {
      if (!running) return;
      running = false; clearTimeout(timer);
      clips.forEach((v) => v.pause());
    };
    kitchenCheck = () => {
      const r = kitchen.getBoundingClientRect();
      if (!warmed && r.top < window.innerHeight * 1.5) { warmed = true; clips.forEach((v) => { v.preload = "auto"; }); }
      const seen = r.top < window.innerHeight * 0.7 && r.bottom > window.innerHeight * 0.3;
      if (seen && !document.hidden) start(); else stop();
    };
    pp.addEventListener("click", () => {
      paused = !paused;
      pp.setAttribute("aria-pressed", String(paused));
      pp.setAttribute("aria-label", paused ? "Play the kitchen film" : "Pause the kitchen film");
      if (paused) stop(); else kitchenCheck();
    });
    document.addEventListener("visibilitychange", kitchenCheck);
  }

  const onScroll = () => {
    headerTheme();
    revealHangs();
    kitchenCheck();
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
