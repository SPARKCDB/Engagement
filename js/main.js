/* ==========================================================================
   Yogathipan & Selvarani — Engagement Invitation
   Scroll engine, media manager, card choreography, music & actions.
   All content comes from js/config.js (window.invitationConfig).
   ========================================================================== */
(function () {
  "use strict";

  const CFG = window.invitationConfig || {};
  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;

  /* ------------------------------------------------------------------ */
  /* Utilities                                                          */
  /* ------------------------------------------------------------------ */
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const withTimeout = (promise, ms) => Promise.race([promise, wait(ms)]).catch(() => {});
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const safely = (label, fn) => {
    try { return fn(); } catch (err) { console.error(`[invitation] ${label} failed:`, err); return undefined; }
  };
  // Write a style value only when it has changed (keeps the per-frame loop cheap).
  const setStyle = (el, prop, value) => {
    const cache = el.__styles || (el.__styles = {});
    if (cache[prop] !== value) { cache[prop] = value; el.style[prop] = value; }
  };

  /* ------------------------------------------------------------------ */
  /* Environment                                                         */
  /* ------------------------------------------------------------------ */
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  let MOTION = !REDUCED;
  root.classList.add(MOTION ? "is-motion" : "is-static", HAS_GSAP ? "has-gsap" : "no-gsap");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* ------------------------------------------------------------------ */
  /* 1 · Content derived from the configuration                          */
  /* ------------------------------------------------------------------ */
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december"];
  const pad = (n) => String(n).padStart(2, "0");

  function deriveData(c) {
    const split = (full) => {
      const parts = String(full || "").trim().split(/\s+/);
      return { first: parts[0] || "", last: parts.slice(1).join(" ") };
    };
    const g = split(c.groom);
    const b = split(c.bride);

    const dm = String(c.date || "").trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    const day = dm ? +dm[1] : NaN;
    const month = dm ? dm[2] : "";
    const year = dm ? +dm[3] : NaN;
    const mIdx = dm ? MONTHS.findIndex((m) => m.startsWith(month.toLowerCase().slice(0, 3))) : -1;

    const tm = String(c.time || "").trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*([AaPp])\.?\s*[Mm]\.?$/);
    const hours = tm ? (+tm[1] % 12) + (/p/i.test(tm[3]) ? 12 : 0) : 19;
    const minutes = tm && tm[2] ? +tm[2] : 0;

    const valid = mIdx >= 0 && !isNaN(day) && !isNaN(year);
    const start = valid
      ? new Date(`${year}-${pad(mIdx + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${c.utcOffset || "+00:00"}`)
      : null;
    const end = start ? new Date(start.getTime() + (c.durationHours || 3) * 3600e3) : null;
    const weekday = valid
      ? new Date(Date.UTC(year, mIdx, day)).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })
      : "";

    return {
      groom: c.groom, bride: c.bride,
      groomFirst: g.first, groomLast: g.last,
      brideFirst: b.first, brideLast: b.last,
      initials: `${g.first.charAt(0)} & ${b.first.charAt(0)}`,
      date: c.date, time: c.time,
      day: valid ? String(day) : "", month, year: valid ? String(year) : "", weekday,
      dateDots: valid ? `${pad(day)} • ${pad(mIdx + 1)} • ${year}` : c.date,
      venue: c.venue,
      rsvpBy: c.rsvpBy || "",
      venueLines: (c.venueLines && c.venueLines.length) ? c.venueLines : String(c.venue || "").split(/,\s*/),
      start, end,
    };
  }

  const DATA = deriveData(CFG);

  function bindContent() {
    if (!DATA.rsvpBy) $$("[data-rsvp-by]").forEach((el) => el.remove());
    $$("[data-bind]").forEach((el) => {
      const v = DATA[el.dataset.bind];
      if (v !== undefined && v !== null && v !== "") el.textContent = v;
    });
    $$("[data-bind-lines]").forEach((el) => {
      const lines = DATA[el.dataset.bindLines] || [];
      el.textContent = "";
      lines.forEach((line) => {
        const span = doc.createElement("span");
        span.textContent = line;
        el.appendChild(span);
      });
    });
    doc.title = `${DATA.groomFirst} & ${DATA.brideFirst} · Engagement`;
  }

  /* ------------------------------------------------------------------ */
  /* 2 · Links: maps, WhatsApp, calendar                                 */
  /* ------------------------------------------------------------------ */
  const Links = {
    maps(path = "venue.google") {
      const [place, app] = path.split(".");
      const url = ((CFG.maps || {})[place] || {})[app];
      return url || CFG.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CFG.venue || "")}`;
    },
    // Which host this copy of the invitation belongs to (?rsvp=selvarani or #selvarani)
    rsvpContact() {
      const contacts = CFG.rsvpContacts || {};
      const params = new URLSearchParams(window.location.search);
      const wanted = (params.get("rsvp") || window.location.hash.slice(1) || "").toLowerCase();
      const key = contacts[wanted] ? wanted : CFG.defaultRsvp;
      const c = contacts[key] || Object.values(contacts)[0] || {};
      return { key: key || "", name: c.name || "", number: String(c.number || "").replace(/\D/g, "") };
    },
    whatsapp(number, message) {
      const text = encodeURIComponent(message || CFG.rsvpMessage || "");
      return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
    },
    // "60146155770" → "+60 14-615 5770"
    prettyNumber(n) {
      if (!n.startsWith("60") || n.length < 10) return `+${n}`;
      const rest = n.slice(2);
      const pre = rest.slice(0, 2);
      const tail = rest.slice(2);
      const cut = tail.length - 4;
      return `+60 ${pre}-${tail.slice(0, cut)} ${tail.slice(cut)}`;
    },
    eventTitle() { return `Engagement · ${CFG.groom} & ${CFG.bride}`; },
    eventDetails() {
      return `With the blessings of our families, ${CFG.groom} & ${CFG.bride} joyfully invite you to celebrate their engagement.`;
    },
    stamp(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); },
    googleCalendar() {
      if (!DATA.start) return "https://calendar.google.com/";
      const p = new URLSearchParams({
        action: "TEMPLATE",
        text: this.eventTitle(),
        dates: `${this.stamp(DATA.start)}/${this.stamp(DATA.end)}`,
        details: this.eventDetails(),
        location: CFG.venue || "",
      });
      return `https://calendar.google.com/calendar/render?${p.toString()}`;
    },
    downloadIcs() {
      if (!DATA.start) return;
      const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
      const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Engagement Invitation//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${this.stamp(DATA.start)}-${(DATA.groomFirst + DATA.brideFirst).toLowerCase()}@engagement`,
        `DTSTAMP:${this.stamp(new Date())}`,
        `DTSTART:${this.stamp(DATA.start)}`,
        `DTEND:${this.stamp(DATA.end)}`,
        `SUMMARY:${esc(this.eventTitle())}`,
        `DESCRIPTION:${esc(this.eventDetails())}`,
        `LOCATION:${esc(CFG.venue || "")}`,
        "BEGIN:VALARM", "TRIGGER:-PT3H", "ACTION:DISPLAY", `DESCRIPTION:${esc(this.eventTitle())}`, "END:VALARM",
        "END:VEVENT", "END:VCALENDAR",
      ].join("\r\n");
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement("a");
      a.href = url;
      a.download = `engagement-${DATA.groomFirst}-${DATA.brideFirst}.ics`.toLowerCase();
      body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    },
  };

  function initActions() {
    // Questions go to the host whose version of the link the guest opened
    const host = Links.rsvpContact();
    const wa = $("#rsvp-whatsapp");
    if (host.number) {
      wa.href = Links.whatsapp(host.number);
      $("#rsvp-host").textContent = host.name || Links.prettyNumber(host.number);
    } else {
      wa.parentElement.remove();
    }

    // Choice menu: calendar, directions to the venue, directions to parking
    const CHOICES = {
      calendar: () => [
        { label: "Google Calendar", href: Links.googleCalendar() },
        { label: "Apple / Outlook (.ics)", run: () => Links.downloadIcs() },
      ],
      map: (place) => [
        { label: "Google Maps", href: Links.maps(`${place}.google`) },
        { label: "Waze", href: Links.maps(`${place}.waze`) },
      ],
    };
    const menu = $("#choice-menu");
    let owner = null;
    const items = () => $$(".cal-menu__item", menu);

    const close = (refocus) => {
      if (!owner) return;
      owner.setAttribute("aria-expanded", "false");
      menu.hidden = true;
      if (refocus) owner.focus();
      owner = null;
    };
    const open = (btn) => {
      const [kind, arg] = btn.dataset.choices.split(":");
      menu.textContent = "";
      CHOICES[kind](arg).forEach((c) => {
        const el = doc.createElement(c.href ? "a" : "button");
        el.className = "cal-menu__item";
        el.setAttribute("role", "menuitem");
        el.textContent = c.label;
        if (c.href) {
          el.href = c.href;
          el.target = "_blank";
          el.rel = "noopener";
          el.addEventListener("click", () => close(false));
        } else {
          el.type = "button";
          el.addEventListener("click", () => { c.run(); close(true); });
        }
        menu.appendChild(el);
      });
      owner = btn;
      btn.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-label", btn.textContent.trim());
      menu.hidden = false;
      const r = btn.getBoundingClientRect();
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      const left = clamp(r.left + r.width / 2 - mw / 2, 12, window.innerWidth - mw - 12);
      const below = r.bottom + mh + 16 < window.innerHeight;
      const top = below ? r.bottom + 8 : r.top - mh - 8;
      menu.style.left = `${left + window.scrollX}px`;
      menu.style.top = `${top + window.scrollY}px`;
      items()[0].focus({ preventScroll: true });
    };

    $$("[data-choices]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (owner === btn) close(true); else { close(false); open(btn); }
      });
    });
    doc.addEventListener("click", (e) => { if (owner && !menu.contains(e.target)) close(false); });
    doc.addEventListener("keydown", (e) => {
      if (!owner) return;
      if (e.key === "Escape") close(true);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = items();
        const i = list.indexOf(doc.activeElement);
        list[(i + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length].focus();
      }
    });
    menu.addEventListener("focusout", (e) => {
      if (owner && !menu.contains(e.relatedTarget) && e.relatedTarget !== owner) close(false);
    });
    window.addEventListener("resize", () => close(false));

    // Decorative images (optional): hide silently when missing
    $$("[data-image]").forEach((img) => {
      const src = (CFG.images || {})[img.dataset.image];
      if (!src) { img.remove(); return; }
      img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
      img.addEventListener("error", () => img.remove(), { once: true });
      img.decoding = "async";
      img.dataset.src = src;
    });
  }

  function loadDecorativeImages() {
    $$("img[data-image][data-src]").forEach((img) => { img.src = img.dataset.src; img.removeAttribute("data-src"); });
  }

  /* ------------------------------------------------------------------ */
  /* 3 · Scene media: video + poster + designed fallback                 */
  /* ------------------------------------------------------------------ */
  const FALLBACK_ART = {
    doors: "arch", mandapam: "arch", vinayagar: "lamp", invitation: "lotus", cardOpen: "lotus",
    groom: "arch", bride: "arch", meeting: "kolam", stairs: "arch", hero: "kolam",
  };
  const ART_SYMBOL = { arch: "orn-arch", lamp: "orn-lamp", lotus: "orn-lotus", kolam: "orn-kolam" };
  const VIDEO_MODE = ["scrub", "play"].includes(CFG.videoMode) ? CFG.videoMode : "auto";

  class SceneMedia {
    constructor(el, key) {
      this.el = el;
      this.key = key;
      this.conf = (CFG.videos || {})[key] || {};
      this.state = "idle"; // idle | loading | ready | failed
      this.progress = 0;
      this.current = 0;
      this.duration = 0;
      this.mode = VIDEO_MODE === "play" ? "play" : "scrub";
      this.seekTimes = [];
      this.waiters = [];

      el.style.setProperty("--pos", this.conf.position || "center center");
      el.style.setProperty("--pos-m", this.conf.positionMobile || this.conf.position || "center center");
      if (this.conf.focus) el.parentElement.style.setProperty("--focus", this.conf.focus);

      // Designed fallback — always present underneath
      const art = FALLBACK_ART[key] || "arch";
      const fb = doc.createElement("div");
      fb.className = "media-fallback";
      fb.dataset.art = art;
      if (key === "cardOpen") fb.dataset.tone = "ivory";
      fb.innerHTML = `<svg aria-hidden="true" focusable="false"><use href="#${ART_SYMBOL[art]}"/></svg>`;
      el.appendChild(fb);

      // Poster image
      this.poster = doc.createElement("img");
      this.poster.className = "media-poster";
      this.poster.alt = "";
      this.poster.setAttribute("aria-hidden", "true");
      this.poster.decoding = "async";
      el.appendChild(this.poster);
      this.posterQueue = [].concat(this.conf.poster || []);
      this.posterSettled = new Promise((res) => { this.resolvePoster = res; });

      // Video (never in reduced-motion mode: posters only)
      if (MOTION) {
        const v = (this.video = doc.createElement("video"));
        v.className = "media-video";
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.controls = false;
        v.preload = "none";
        v.disablePictureInPicture = true;
        v.tabIndex = -1;
        ["muted", "playsinline", "webkit-playsinline", "disableremoteplayback"].forEach((a) => v.setAttribute(a, ""));
        v.setAttribute("aria-hidden", "true");
        v.addEventListener("loadeddata", () => this.onReady());
        v.addEventListener("error", () => this.onError());
        v.addEventListener("seeked", () => this.onSeeked());
        v.addEventListener("ended", () => { this.ended = true; });
        el.appendChild(v);
      }
    }

    /* Posters */
    loadPoster() {
      if (this.posterStarted) return;
      this.posterStarted = true;
      this.nextPoster();
    }
    nextPoster() {
      const src = this.posterQueue.shift();
      if (!src) { this.poster.remove(); this.resolvePoster(); return; }
      this.poster.onload = () => { this.poster.classList.add("is-loaded"); this.resolvePoster(); };
      this.poster.onerror = () => this.nextPoster();
      this.poster.src = src;
    }

    /* Video lifecycle */
    sources() {
      const src = this.conf.src;
      if (!src || !this.video) return [];
      const list = [];
      (CFG.videoFormats || ["mp4"]).forEach((f) => {
        if (f === "webm" && this.video.canPlayType('video/webm; codecs="vp9"')) list.push(src.replace(/\.mp4$/i, ".webm"));
        if (f === "mp4") list.push(src);
      });
      return [...new Set(list.length ? list : [src])];
    }
    load() {
      this.loadPoster();
      if (!this.video || this.state !== "idle") return;
      this.state = "loading";
      this.queue = this.sources();
      this.tryNext();
    }
    tryNext() {
      const src = this.queue.shift();
      if (!src) { this.fail(); return; }
      this.video.preload = "auto";
      this.video.src = src;
      try { this.video.load(); } catch (e) { this.fail(); }
    }
    onError() {
      if (this.state !== "loading" && this.state !== "ready") return;
      this.state = "loading";
      this.el.classList.remove("is-ready");
      this.tryNext();
    }
    fail() {
      this.state = "failed";
      this.el.classList.add("is-failed");
      if (this.video) { this.video.removeAttribute("src"); try { this.video.load(); } catch (e) { /* noop */ } }
      this.flushWaiters();
    }
    onReady() {
      if (this.state !== "loading") return;
      this.state = "ready";
      const d = this.video.duration;
      this.duration = isFinite(d) && d > 0 ? d : 0;
      this.el.classList.add("is-ready");
      this.current = this.targetTime();
      if (this.mode === "scrub") {
        try { this.video.currentTime = this.current; } catch (e) { /* noop */ }
        this.prime();
      }
      this.flushWaiters();
    }
    // iOS only paints seeked frames after the element has played once.
    prime() {
      if (this.primed || !this.video) return;
      const p = this.video.play();
      if (p && p.then) {
        p.then(() => {
          this.video.pause();
          this.primed = true;
          try { this.video.currentTime = this.current; } catch (e) { /* noop */ }
        }).catch(() => { /* will retry after the first user gesture */ });
      }
    }
    unload() {
      if (!this.video || this.state === "idle" || this.state === "failed") return;
      this.state = "idle";
      this.el.classList.remove("is-ready");
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.preload = "none";
      try { this.video.load(); } catch (e) { /* noop */ }
      this.primed = false;
      this.ended = false;
    }
    settled() {
      return new Promise((res) => {
        if (!this.video || this.state === "ready" || this.state === "failed") res();
        else this.waiters.push(res);
      });
    }
    flushWaiters() { this.waiters.splice(0).forEach((r) => r()); }

    /* Playback */
    targetTime() { return clamp(this.progress) * Math.max(0, this.duration - 0.06); }
    onSeeked() {
      if (!this.seekAt) return;
      this.seekTimes.push(performance.now() - this.seekAt);
      this.seekAt = 0;
      if (this.seekTimes.length > 8) this.seekTimes.shift();
      // Slow seeking device → switch this video to smooth natural playback.
      if (VIDEO_MODE === "auto" && this.seekTimes.length >= 6) {
        const avg = this.seekTimes.reduce((a, b) => a + b, 0) / this.seekTimes.length;
        if (avg > 320) { this.mode = "play"; console.info(`[invitation] ${this.key}: using playback mode`); }
      }
    }
    update(visible, dt) {
      if (this.state !== "ready" || !this.video) return;
      const v = this.video;
      if (!visible) { if (!v.paused) v.pause(); return; }

      if (this.mode === "play") {
        if (this.progress <= 0.001 && (this.ended || v.currentTime > 0.5) && v.paused) {
          try { v.currentTime = 0; } catch (e) { /* noop */ }
          this.ended = false;
        }
        if (v.paused && !this.ended && this.progress > 0.001 && this.progress < 1) {
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        }
        return;
      }

      // Scrub: ease the playhead toward the scroll position.
      if (!v.paused && this.primed) v.pause();
      const target = this.targetTime();
      const k = 1 - Math.pow(1 - 0.16, dt * 60);
      this.current += (target - this.current) * k;
      if (Math.abs(target - this.current) < 0.004) this.current = target;
      if (!v.seeking && Math.abs(v.currentTime - this.current) > 0.025) {
        this.seekAt = performance.now();
        try { v.currentTime = this.current; } catch (e) { /* noop */ }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* 4 · Atmosphere: jasmine petals & golden motes (one shared canvas)   */
  /* ------------------------------------------------------------------ */
  class Atmosphere {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.items = [];
      this.mode = null;
      this.intensity = 0;
      this.spawnAcc = 0;
      this.dirty = false;
      this.petal = this.makePetal();
      this.mote = this.makeMote();
      this.resize();
    }
    makePetal() {
      const c = doc.createElement("canvas");
      c.width = 40; c.height = 24;
      const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 40, 24);
      g.addColorStop(0, "rgba(255,255,250,.98)");
      g.addColorStop(0.7, "rgba(247,240,226,.95)");
      g.addColorStop(1, "rgba(230,205,148,.9)");
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(2, 12);
      x.bezierCurveTo(10, 0, 30, 0, 38, 12);
      x.bezierCurveTo(30, 24, 10, 24, 2, 12);
      x.fill();
      return c;
    }
    makeMote() {
      const c = doc.createElement("canvas");
      c.width = c.height = 32;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,240,200,1)");
      g.addColorStop(0.25, "rgba(230,205,148,.85)");
      g.addColorStop(1, "rgba(198,161,91,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 32);
      return c;
    }
    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    set(mode, intensity) { this.mode = mode; this.intensity = intensity; }
    spawn(kind, opts = {}) {
      const r = Math.random;
      if (kind === "petal") {
        this.items.push({
          kind, x: r() * this.w, y: -20, vx: (r() - 0.3) * 18, vy: 48 + r() * 36,
          rot: r() * Math.PI * 2, vr: (r() - 0.5) * 1.6, flip: r() * Math.PI * 2, vf: 1.5 + r() * 2,
          size: 0.4 + r() * 0.45, life: 0, max: (this.h + 40) / 48 + 2, alpha: 0.7 + r() * 0.25,
        });
      } else {
        const burst = !!opts.burst;
        const a = r() * Math.PI * 2;
        const sp = burst ? 20 + r() * 70 : 4 + r() * 10;
        this.items.push({
          kind: "mote",
          x: burst ? this.w * 0.5 + (r() - 0.5) * this.w * 0.25 : r() * this.w,
          y: burst ? this.h * 0.52 + (r() - 0.5) * this.h * 0.2 : this.h * (0.3 + r() * 0.75),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - (burst ? 22 : 10),
          size: 3 + r() * (burst ? 9 : 6), life: 0, max: burst ? 3.5 + r() * 3 : 5 + r() * 4,
          tw: r() * Math.PI * 2, alpha: (burst ? 0.9 : 0.55) * (0.5 + r() * 0.5),
        });
      }
    }
    burst(n = 70) { for (let i = 0; i < n; i++) this.spawn("mote", { burst: true }); }
    tick(dt) {
      const { mode, intensity } = this;
      if (mode && intensity > 0.02) {
        const rate = mode === "petals" ? 3.5 : mode === "motes" ? 7 : 3;
        const cap = mode === "petals" ? 16 : 46;
        this.spawnAcc += rate * intensity * dt;
        while (this.spawnAcc >= 1) {
          this.spawnAcc -= 1;
          if (this.items.length < cap) this.spawn(mode === "petals" ? "petal" : "mote");
        }
      }
      if (!this.items.length) {
        if (this.dirty) { this.ctx.clearRect(0, 0, this.w, this.h); this.dirty = false; }
        return;
      }
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.dirty = true;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        // Petals belong to the mandapam: let them fade quickly once it has passed.
        p.life += p.kind === "petal" && this.mode !== "petals" ? dt * 4 : dt;
        if (p.life > p.max) { this.items.splice(i, 1); continue; }
        const fade = Math.min(1, p.life / 0.8, (p.max - p.life) / 1.2);
        if (p.kind === "petal") {
          p.x += (p.vx + Math.sin(p.life * 1.2 + p.flip) * 14) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          p.flip += p.vf * dt;
          ctx.save();
          ctx.globalAlpha = p.alpha * fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(p.size, p.size * Math.max(0.15, Math.abs(Math.cos(p.flip))));
          ctx.drawImage(this.petal, -20, -12);
          ctx.restore();
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 1 - 0.6 * dt;
          p.vy = p.vy * (1 - 0.6 * dt) - 3 * dt;
          const tw = 0.6 + 0.4 * Math.sin(p.life * 3 + p.tw);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = p.alpha * fade * tw;
          ctx.drawImage(this.mote, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 5 · Sound: background music + optional soft effects                 */
  /* ------------------------------------------------------------------ */
  const Sound = {
    cache: {},
    ambience: null,
    effect(key) {
      if (!Music.on) return;
      const src = (CFG.sounds || {})[key];
      if (!src) return;
      const a = this.cache[key] || (this.cache[key] = new Audio(src));
      a.volume = CFG.soundVolume != null ? CFG.soundVolume : 0.35;
      try { a.currentTime = 0; } catch (e) { /* noop */ }
      a.play().catch(() => {});
    },
    setAmbience(on) {
      const src = (CFG.sounds || {}).templeAmbience;
      if (!src) return;
      if (!this.ambience) {
        this.ambience = new Audio(src);
        this.ambience.loop = true;
        this.ambience.volume = (CFG.soundVolume != null ? CFG.soundVolume : 0.35) * 0.5;
      }
      if (on) this.ambience.play().catch(() => {}); else this.ambience.pause();
    },
  };

  const Music = {
    on: false,
    init() {
      this.audio = $("#bg-music");
      this.btn = $("#music-toggle");
      if (!CFG.music) { this.btn.hidden = true; return; }
      this.audio.src = CFG.music;
      this.audio.volume = 0;
      this.pref = storage.get("ys-engagement-music"); // "on" | "off" | null
      this.audio.addEventListener("error", () => { this.btn.hidden = true; this.setState(false); });

      this.btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.on) { this.pause(); this.pref = "off"; } else { this.play(); this.pref = "on"; }
        storage.set("ys-engagement-music", this.pref);
      });

      // Browsers allow audio only after a gesture: start on the first one.
      const events = ["pointerup", "touchend", "keydown", "click"];
      const unlock = (e) => {
        if (e.target && e.target.closest && e.target.closest("#music-toggle, #enter")) return;
        Media.primeAll();
        if (this.pref === "off") { done(); return; }
        this.play().then((ok) => { if (ok) done(); });
      };
      const done = () => events.forEach((ev) => window.removeEventListener(ev, unlock, true));
      this.stopAutoUnlock = done;
      events.forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

      doc.addEventListener("visibilitychange", () => {
        if (doc.hidden && this.on) { this.audio.pause(); this.resume = true; } else if (!doc.hidden && this.resume) {
          this.resume = false; this.audio.play().catch(() => {});
        }
      });
    },
    available() { return !!CFG.music && !this.btn.hidden; },
    // The visitor's choice on the opening screen. The tap itself lets the browser play audio.
    choose(withSound) {
      if (this.stopAutoUnlock) this.stopAutoUnlock();
      this.pref = withSound ? "on" : "off";
      storage.set("ys-engagement-music", this.pref);
      if (withSound) this.play();
    },
    setState(on) {
      this.on = on;
      this.btn.setAttribute("aria-pressed", String(on));
      this.btn.setAttribute("aria-label", on ? "Pause background music" : "Play background music");
      Sound.setAmbience(on);
    },
    fade(to, ms) {
      cancelAnimationFrame(this.fadeRaf);
      const from = this.audio.volume;
      const t0 = performance.now();
      return new Promise((res) => {
        const step = (t) => {
          const k = clamp((t - t0) / ms);
          try { this.audio.volume = from + (to - from) * k; } catch (e) { /* iOS: fixed volume */ }
          if (k < 1) this.fadeRaf = requestAnimationFrame(step); else res();
        };
        this.fadeRaf = requestAnimationFrame(step);
      });
    },
    play() {
      const p = this.audio.play();
      return Promise.resolve(p).then(() => {
        this.setState(true);
        this.fade(CFG.musicVolume != null ? CFG.musicVolume : 0.55, 2600);
        return true;
      }).catch(() => false);
    },
    pause() {
      this.setState(false);
      this.fade(0, 700).then(() => { if (!this.on) this.audio.pause(); });
    },
  };

  /* ------------------------------------------------------------------ */
  /* 6 · Scenes & scroll engine                                          */
  /* ------------------------------------------------------------------ */
  const VEIL_MAX = { glow: 0.9, dark: 0.88, ivory: 1 };
  let scenes = [];
  let chapters = [];
  let vh = window.innerHeight;
  let atmosphere = null;
  let lenis = null;
  let lastY = -1;
  let scrollDir = 1;

  const Media = {
    primeAll() { scenes.forEach((s) => { if (s.media.state === "ready" && s.media.mode === "scrub") s.media.prime(); }); },
    // Keep only the visible scene(s) and the next one in memory.
    manage(y, now) {
      if (!MOTION) return;
      const keep = new Set(scenes.filter((s) => s.visible));
      const upcoming = scenes.find((s) => s.visStart > y);
      if (upcoming) keep.add(upcoming);
      if (scrollDir < 0) {
        const behind = [...scenes].reverse().find((s) => s.visEnd <= y);
        if (behind) keep.add(behind);
      }
      if (!keep.size && scenes[0]) keep.add(scenes[0]);
      scenes.forEach((s) => {
        if (keep.has(s)) { s.dropAt = 0; s.media.load(); } else if (s.media.state !== "idle") {
          if (!s.dropAt) s.dropAt = now + 1500;
          else if (now > s.dropAt) { s.media.unload(); s.dropAt = 0; }
        }
      });
    },
  };

  function buildScenes() {
    scenes = $$(".scene").map((section, i) => {
      const stage = $(".stage", section);
      const mediaEl = $(".media", stage);
      const key = mediaEl.dataset.video;
      const ds = section.dataset;
      const s = {
        section, stage, key, index: i,
        media: new SceneMedia(mediaEl, key),
        mediaEl,
        veilIn: $(".veil--in", stage),
        veilOut: $(".veil--out", stage),
        inTone: ds.in || null,
        outTone: ds.out || null,
        cut: ds.cut === "1",
        zoom: ds.zoom ? parseFloat(ds.zoom) : 0,
        vignette: $(".vignette", stage),
        cardFill: ds.cardfill ? $(".card-fill", stage) : null,
        atmos: ds.atmos || null,
        burstAt: ds.burst ? parseFloat(ds.burst) : null,
        burstDone: false,
        sfx: (ds.sfx || "").split(/\s+/).filter(Boolean).map((t) => {
          const [k, at] = t.split("@");
          return { key: k, at: parseFloat(at) || 0, done: false };
        }),
        fx: $$("[data-fx]", stage).map((el) => {
          const [a, b, c, d] = el.dataset.fx.split(",").map(parseFloat);
          return { el, a, b, c, d, par: parseFloat(el.dataset.par || "0") };
        }),
        visible: false, p: 0,
      };
      if (s.veilIn && s.inTone) s.veilIn.dataset.tone = s.inTone;
      if (s.veilOut && s.outTone) s.veilOut.dataset.tone = s.outTone;
      stage.style.zIndex = String(1 + i);
      return s;
    });
  }

  function measure() {
    vh = window.innerHeight;
    const sy = window.scrollY;
    scenes.forEach((s) => {
      const r = s.section.getBoundingClientRect();
      const prev = s.section.previousElementSibling;
      const next = s.section.nextElementSibling;
      s.top = r.top + sy;
      s.height = s.section.offsetHeight;
      s.prevIsScene = !!prev && prev.classList.contains("scene");
      s.nextIsScene = !!next && next.classList.contains("scene");
      // When following another scene: crossfade over its last 40% of a screen.
      // When following a paper section: present as soon as it is uncovered.
      s.fadeLen = s.prevIsScene && !s.cut ? vh * 0.4 : 0;
      s.visStart = s.prevIsScene ? s.top - s.fadeLen : s.top - vh;
      s.visEnd = s.top + s.height;
      s.pEnd = s.nextIsScene ? s.top + s.height - vh * 0.2 : s.top + s.height - vh;
      if (s.pEnd <= s.top) s.pEnd = s.top + 1;
    });
    chapters = $$("main > section, main > footer").map((el) => {
      const r = el.getBoundingClientRect();
      return { el, top: r.top + sy, bottom: r.bottom + sy, chapter: +el.dataset.chapter || 1,
        light: el.dataset.theme === "light", quiet: el.dataset.quiet === "1" };
    });
    lastY = -1;
    AutoScroll.build();
  }

  function updateScene(s, y) {
    const vis = y >= s.visStart && y < s.visEnd;
    if (vis !== s.visible) {
      s.visible = vis;
      s.stage.classList.toggle("is-visible", vis);
      if (vis) s.media.load();
    }
    if (!vis) return;

    const opacity = s.fadeLen ? clamp((y - s.visStart) / s.fadeLen) : 1;
    setStyle(s.stage, "opacity", opacity.toFixed(3));

    const p = clamp((y - s.top) / (s.pEnd - s.top));
    s.p = p;
    s.media.progress = p;

    if (s.inTone) setStyle(s.veilIn, "opacity", ((1 - smooth(0, 0.16, p)) * VEIL_MAX[s.inTone]).toFixed(3));
    if (s.outTone) setStyle(s.veilOut, "opacity", (smooth(0.8, 0.99, p) * VEIL_MAX[s.outTone]).toFixed(3));

    // Camera: slow push-in, or a deliberate zoom toward the subject.
    const scale = s.zoom ? 1 + s.zoom * easeInOut(p) : 1.0 + 0.06 * p;
    setStyle(s.mediaEl, "transform", `scale(${scale.toFixed(4)})`);
    if (s.vignette) setStyle(s.vignette, "opacity", (smooth(0.1, 0.92, p) * 0.92).toFixed(3));

    if (s.cardFill) {
      const f = smooth(0.6, 0.97, p);
      const sc = 0.16 + 0.84 * easeInOut(f);
      setStyle(s.cardFill, "opacity", smooth(0.58, 0.68, p).toFixed(3));
      setStyle(s.cardFill, "transform", `translate3d(0, ${((1 - f) * 6).toFixed(2)}vh, 0) scale(${sc.toFixed(4)})`);
    }

    s.fx.forEach((f) => {
      const inn = smooth(f.a, f.b, p);
      const out = smooth(f.c, f.d, p);
      const ty = (1 - inn) * 26 + f.par * p - out * 18;
      setStyle(f.el, "opacity", (inn * (1 - out)).toFixed(3));
      setStyle(f.el, "transform", `translate3d(0, ${ty.toFixed(1)}px, 0)`);
    });

    s.sfx.forEach((fx) => { if (!fx.done && p >= fx.at && p < fx.at + 0.25) { fx.done = true; Sound.effect(fx.key); } });

    if (s.burstAt != null) {
      if (!s.burstDone && p >= s.burstAt && p < s.burstAt + 0.2) {
        s.burstDone = true;
        if (atmosphere) atmosphere.burst();
        Sound.effect("atmosphere");
      } else if (p < s.burstAt - 0.15) s.burstDone = false;
    }
  }

  function updateAtmosphere() {
    if (!atmosphere) return;
    // The top-most visible scene that has atmosphere decides the mood.
    let mode = null;
    let intensity = 0;
    for (let i = scenes.length - 1; i >= 0; i--) {
      const s = scenes[i];
      if (!s.visible) continue;
      if (s.atmos) {
        mode = s.atmos === "petals" ? "petals" : s.atmos === "motes" ? "motes" : "motes-soft";
        intensity = smooth(0, 0.12, s.p) * (1 - smooth(0.88, 1, s.p));
      }
      break;
    }
    atmosphere.set(mode, intensity);
  }

  const progressEl = $("#progress");
  const progressBtns = $$("[data-goto]", progressEl);
  let currentChapter = 0;

  function updateChrome(y) {
    if (y > 30 && !body.classList.contains("has-begun") && body.classList.contains("is-ready")) {
      body.classList.add("has-begun");
    }
    const mid = y + vh * 0.5;
    const sec = chapters.find((c) => mid >= c.top && mid < c.bottom) || chapters[chapters.length - 1];
    if (!sec) return;
    body.classList.toggle("ui-light", sec.light);
    body.classList.toggle("is-quiet", sec.quiet);
    if (sec.chapter !== currentChapter) {
      currentChapter = sec.chapter;
      progressBtns.forEach((b) => {
        if (+b.dataset.goto === currentChapter) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
    }
  }

  function scrollToTarget(target) {
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY;
    if (lenis) { AutoScroll.opened = true; AutoScroll.glide(y, 2.6, (t) => 1 - Math.pow(1 - t, 4)); }
    else window.scrollTo({ top: y, behavior: REDUCED ? "auto" : "smooth" });
  }

  /* ------------------------------------------------------------------ */
  /* Auto-scroll: once a visitor starts a chapter, glide to its end       */
  /* ------------------------------------------------------------------ */
  const AutoScroll = {
    stops: [],
    freeFrom: Infinity,  // below this point (the RSVP form) scrolling is free
    active: false,       // a glide is running
    touching: false,
    dir: 1,
    idleTimer: 0,
    SECONDS_PER_SCREEN: 1.7,

    init() {
      this.hint = $("#continue-hint");
      this.tap = $("#tap-open");
      if (!lenis) { if (this.tap) this.tap.remove(); this.tap = null; return; }
      this.tap.addEventListener("click", (e) => { e.stopPropagation(); this.open(); });
      // Elders may tap anywhere on the envelope, not only the button.
      window.addEventListener("click", (e) => {
        if (!this.atGate) return;
        if (e.target.closest && e.target.closest("button, a, input, label, #progress")) return;
        this.open();
      });
      const cancel = () => {
        if (!this.active) return;
        this.active = false;
        lenis.scrollTo(window.scrollY, { immediate: true, force: true });
      };
      window.addEventListener("touchstart", () => { this.touching = true; cancel(); }, { passive: true });
      window.addEventListener("touchend", () => { this.touching = false; this.schedule(); }, { passive: true });
      window.addEventListener("wheel", () => { this.active = false; }, { passive: true });
      window.addEventListener("keydown", (e) => {
        if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(e.key)) cancel();
      });
      lenis.on("scroll", ({ direction }) => {
        if (this.active) return;
        if (direction) this.dir = direction;
        this.schedule();
      });
    },

    // Chapter end points, in page pixels. Rebuilt whenever the layout is measured.
    build() {
      const top0 = doc.getElementById("rsvp");
      this.freeFrom = top0 ? top0.getBoundingClientRect().top + window.scrollY : Infinity;
      if (!lenis) return;
      const scene = (id) => scenes.find((s) => s.section.id === id);
      const at = (id, p) => { const s = scene(id); return s ? s.top + p * (s.pEnd - s.top) : null; };
      const top = (id) => { const el = doc.getElementById(id); return el ? el.getBoundingClientRect().top + window.scrollY : null; };
      const cardAt = (label) => {
        const tl = cardTimeline;
        if (!tl || !tl.scrollTrigger || tl.labels[label] == null) return null;
        const st = tl.scrollTrigger;
        return st.start + (st.end - st.start) * (tl.labels[label] / tl.duration());
      };
      const details = doc.getElementById("details");
      const detailsEnd = details ? top("details") + details.offsetHeight - vh : null;
      const venue = doc.getElementById("venue");
      const venueStop = venue ? top("venue") + Math.max(0, venue.offsetHeight - vh) + 110 : null;
      // [position, pace] — pace slows the glide into that stop (1 = normal).
      this.stops = [
        [0, 1],
        [at("scene-vinayagar", 0.2), 1.35],     // doors open, walk in, Vinayagar appears (slower)
        [top("scene-card") + 2, 1, "gate"],     // Vinayagar presents the sealed envelope → "Tap to open"
        [cardAt("names") ?? top("invite"), 1],  // the card opens: names
        [cardAt("date"), 1],                    // date and time
        [at("scene-groom", 0.82), 1],           // the groom
        [at("scene-bride", 0.82), 1],           // the bride
        [top("details"), 1],                    // they meet → engagement details
        [detailsEnd, 1],
        [venueStop, 1],                         // the celebration (buttons clear of the hint)
        [at("scene-hero", 1), 1.6],             // the staircase → seated together (slower)
        [this.freeFrom, 1],                     // RSVP
      ].filter(([y]) => y != null && isFinite(y)).sort((x, z) => x[0] - z[0])
        .filter(([y], i, arr) => i === 0 || y - arr[i - 1][0] > 24)
        .map(([y, pace, kind]) => ({ y, pace, gate: kind === "gate" }));
      const gate = this.stops.find((st) => st.gate);
      this.gateY = gate ? gate.y : null;
    },

    schedule() {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.settle(), 160);
    },

    // Called when the visitor stops scrolling between two chapter ends.
    settle() {
      if (this.active || this.touching || !lenis || !this.stops.length) return;
      if (body.classList.contains("is-loading")) return;
      const y = window.scrollY;
      if (y >= this.freeFrom - 2) return;
      if (this.gateY != null && !this.opened && y > this.gateY + 3 && y < this.gateY + vh * 6) {
        // The invitation opens with a tap, not a scroll: return to the envelope.
        this.glide(this.gateY, clamp(((y - this.gateY) / vh) * 0.8, 0.6, 2.5), (t) => 1 - Math.pow(1 - t, 3));
        this.nudgeTap();
        return;
      }
      const stops = this.stops;
      let i = 0;
      while (i < stops.length - 1 && stops[i + 1].y <= y) i += 1;
      if (!stops[i + 1]) return;
      const a = stops[i].y;
      const b = stops[i + 1].y;
      const pace = stops[i + 1].pace;
      if (Math.abs(y - a) < 3 || Math.abs(y - b) < 3) return;
      // Moving forward: any deliberate start continues the chapter. Backwards: return to its start.
      const NUDGE = 30;
      const target = this.dir > 0 ? (y - a > NUDGE ? b : a) : (b - y > NUDGE ? a : b);
      const seconds = clamp((Math.abs(target - y) / vh) * this.SECONDS_PER_SCREEN * pace, 0.7, 16);
      this.glide(target, seconds, (t) => -(Math.cos(Math.PI * t) - 1) / 2);
    },

    glide(y, seconds, easing) {
      if (!lenis) return;
      this.active = true;
      clearTimeout(this.safety);
      // Never leave the page thinking a glide is still running.
      this.safety = setTimeout(() => { this.active = false; }, seconds * 1000 + 800);
      lenis.scrollTo(y, {
        duration: seconds,
        easing,
        force: true,
        onComplete: () => { this.active = false; },
      });
    },

    // "Scroll to continue" stays on screen through every scene, until the RSVP.
    updateHint(y) {
      if (!this.hint) return;
      const begun = body.classList.contains("has-begun");
      this.atGate = begun && this.gateY != null && !this.opened && !this.active && Math.abs(y - this.gateY) < Math.max(12, vh * 0.04);
      if (this.tap) {
        this.tap.classList.toggle("is-shown", this.atGate);
        this.tap.tabIndex = this.atGate ? 0 : -1;
      }
      const show = begun && !this.atGate && y < this.freeFrom - vh * 0.35;
      this.hint.classList.toggle("is-shown", show);
      this.hint.classList.toggle("is-gliding", show && this.active);
    },

    // Tap on the sealed envelope: play the card opening and stop on the names.
    open() {
      if (this.opened || this.gateY == null) return;
      this.opened = true;
      const next = this.stops.find((st) => st.y > this.gateY + 3);
      if (!next) return;
      const seconds = clamp(((next.y - window.scrollY) / vh) * this.SECONDS_PER_SCREEN * 4, 6, 30);
      this.glide(next.y, seconds, (t) => -(Math.cos(Math.PI * t) - 1) / 2);
    },
    nudgeTap() {
      if (!this.tap) return;
      this.tap.classList.remove("is-nudged");
      void this.tap.offsetWidth;
      this.tap.classList.add("is-nudged");
    },
  };

  function initNavigation() {
    $$("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = btn.dataset.goto;
        const target = /^\d+$/.test(g) ? $(`main > [data-chapter="${g}"]`) : doc.getElementById(g);
        scrollToTarget(target);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* RSVP form → Google Sheet (via Apps Script web app)                  */
  /* ------------------------------------------------------------------ */
  function initRsvpForm() {
    const form = $("#rsvp-form");
    if (!form) return;
    const host = Links.rsvpContact();
    const status = $("#rsvp-status");
    const submit = $("#rsvp-submit");
    const thanks = $("#rsvp-thanks");
    const nameInput = $("#rsvp-name");
    const DONE_KEY = "ys-engagement-rsvp";

    // − / + steppers
    const clampCount = (input) => {
      const min = +input.min, max = +input.max;
      const v = parseInt(input.value, 10);
      input.value = String(isNaN(v) ? min : Math.min(max, Math.max(min, v)));
    };
    $$(".stepper__btn", form).forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = doc.getElementById(btn.dataset.for);
        input.value = String((parseInt(input.value, 10) || 0) + +btn.dataset.delta);
        clampCount(input);
      });
    });
    $$(".stepper__value", form).forEach((input) => input.addEventListener("change", () => clampCount(input)));

    const showError = (id, show) => {
      const el = doc.getElementById(id);
      el.hidden = !show;
      const field = el.closest(".field");
      field.classList.toggle("is-invalid", show);
    };
    nameInput.addEventListener("input", () => { if (nameInput.value.trim()) showError("rsvp-name-error", false); });
    $$('input[name="meal"]', form).forEach((r) => r.addEventListener("change", () => showError("rsvp-meal-error", false)));

    const showThanks = (data) => {
      const pax = data.adults + data.children;
      $("#rsvp-thanks-text").textContent =
        `We have noted ${pax} ${pax === 1 ? "guest" : "guests"} (${data.adults} ${data.adults === 1 ? "adult" : "adults"}` +
        `${data.children ? `, ${data.children} ${data.children === 1 ? "child" : "children"}` : ""}), ${data.meal.toLowerCase()}. ` +
        `We look forward to celebrating with you, ${data.name.split(" ")[0]}.`;
      form.hidden = true;
      thanks.hidden = false;
    };

    // A guest who already replied on this device sees their confirmation.
    try {
      const saved = JSON.parse(storage.get(DONE_KEY) || "null");
      if (saved && saved.name) showThanks(saved);
    } catch (e) { /* ignore */ }

    $("#rsvp-again").addEventListener("click", () => {
      thanks.hidden = true;
      form.hidden = false;
      form.reset();
      status.textContent = "";
      nameInput.focus();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submit.disabled) return;
      $$(".stepper__value", form).forEach(clampCount);
      const fd = new FormData(form);
      const data = {
        name: String(fd.get("name") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        adults: parseInt(fd.get("adults"), 10) || 0,
        children: parseInt(fd.get("children"), 10) || 0,
        meal: String(fd.get("meal") || ""),
        invitedBy: host.name || host.key,
      };
      showError("rsvp-name-error", !data.name);
      showError("rsvp-meal-error", !data.meal);
      if (!data.name) { nameInput.focus(); return; }
      if (!data.meal) { $('input[name="meal"]', form).focus(); return; }
      if (fd.get("website")) return; // spam trap

      // No sheet configured yet: hand the answers to WhatsApp instead.
      if (!CFG.rsvpSheetUrl) {
        const msg = `${CFG.rsvpMessage}\n\nName: ${data.name}${data.phone ? `\nPhone: ${data.phone}` : ""}` +
          `\nAdults: ${data.adults}\nChildren: ${data.children}\nMeal: ${data.meal}`;
        const a = doc.createElement("a");
        a.href = Links.whatsapp(host.number, msg);
        a.target = "_blank";
        a.rel = "noopener";
        body.appendChild(a);
        a.click();
        a.remove();
        status.textContent = "Opening WhatsApp with your reply…";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Sending…";
      status.textContent = "";
      try {
        // Apps Script web apps do not return CORS headers for every browser,
        // so the request is sent as a simple no-cors form post.
        await fetch(CFG.rsvpSheetUrl, {
          method: "POST",
          mode: "no-cors",
          body: new URLSearchParams({ ...data, website: "" }),
        });
        storage.set(DONE_KEY, JSON.stringify(data));
        showThanks(data);
        thanks.focus();
      } catch (err) {
        console.error("[invitation] RSVP failed", err);
        status.textContent = "We couldn't send your RSVP. Please check your connection and try again.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Send RSVP";
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 7 · Reveals for the paper sections                                  */
  /* ------------------------------------------------------------------ */
  function initReveals() {
    const groups = new Map();
    $$("[data-reveal]").forEach((el) => {
      const parent = el.closest("section, footer");
      const i = groups.get(parent) || 0;
      groups.set(parent, i + 1);
      el.style.setProperty("--d", `${(i * 0.13).toFixed(2)}s`);
    });
    const targets = [...$$("[data-reveal]"), $("#closing")];
    if (!("IntersectionObserver" in window)) { targets.forEach((t) => t.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    targets.forEach((t) => t && io.observe(t));
  }

  /* ------------------------------------------------------------------ */
  /* 8 · The invitation card choreography (GSAP + ScrollTrigger)         */
  /* ------------------------------------------------------------------ */
  let cardTimeline = null;
  function initCardTimeline() {
    if (!MOTION || !HAS_GSAP) return;
    const { gsap } = window;
    const card = $("#card");
    const phase1 = $(".card__phase--names", card);
    const phase2 = $(".card__phase--date", card);
    const s1 = $$("[data-step]", phase1);
    const s2 = $$("[data-step2]", phase2);
    const up = { opacity: 0, y: 22 };
    const shown = { opacity: 1, y: 0, duration: 1 };

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: { trigger: "#invite", start: "top 55%", end: "bottom bottom", scrub: 1.4 },
    });

    tl.fromTo(card, { opacity: 0, scale: 0.94, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: 1.2 });
    s1.forEach((el) => {
      const kind = el.dataset.step;
      if (kind === "name") {
        tl.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.5 }, ">-0.2");
        tl.fromTo($(".names__first", el), { letterSpacing: "0.24em" }, { letterSpacing: "0.05em", duration: 1.8, ease: "power3.out" }, "<");
      } else if (kind === "amp") {
        tl.fromTo(el, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 1, ease: "power3.out" }, ">-0.3");
      } else if (kind === "line") {
        tl.fromTo(el, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 1 }, ">-0.2");
      } else {
        tl.fromTo(el, up, shown, ">-0.2");
      }
    });
    tl.to({}, { duration: 1.6 }); // let the names breathe
    tl.addLabel("names", "-=0.6");
    tl.to(phase1, { opacity: 0, y: -36, duration: 1.1, ease: "power2.in" });
    s2.forEach((el, i) => {
      if (el.classList.contains("date")) {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.8 }, ">-0.1");
        tl.fromTo($(".date__day", el), { scale: 1.18, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: "power3.out" }, "<");
        tl.fromTo($$(".date__side", el), { opacity: 0, x: (k) => (k === 0 ? -18 : 18) }, { opacity: 1, x: 0, duration: 1.2 }, "<0.2");
      } else if (el.classList.contains("divider")) {
        tl.fromTo(el, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.9 }, ">-0.2");
      } else {
        tl.fromTo(el, up, shown, i === 0 ? ">" : ">-0.25");
      }
    });
    tl.to({}, { duration: 1.4 });
    tl.addLabel("date", "-=0.7");
    cardTimeline = tl;
  }

  /* ------------------------------------------------------------------ */
  /* 9 · Smooth scrolling + the frame loop                               */
  /* ------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (!MOTION || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.85, touchMultiplier: 1.1 });
    lenis.stop();
    if (HAS_GSAP) lenis.on("scroll", window.ScrollTrigger.update);
  }

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    if (lenis && !HAS_GSAP) lenis.raf(now);
    const y = window.scrollY;
    if (y !== lastY) {
      if (lastY >= 0) scrollDir = y > lastY ? 1 : -1;
      if (MOTION) { scenes.forEach((s) => updateScene(s, y)); updateAtmosphere(); }
      updateChrome(y);
      lastY = y;
    }
    AutoScroll.updateHint(y);
    if (MOTION) {
      scenes.forEach((s) => s.media.update(s.visible, dt));
      Media.manage(y, now);
      if (atmosphere) atmosphere.tick(dt);
    }
  }

  function startLoop() {
    if (HAS_GSAP) {
      const { gsap } = window;
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.add((time) => {
        if (lenis) lenis.raf(time * 1000);
        frame(performance.now());
      });
    } else {
      const loop = (t) => { frame(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 10 · Loader                                                          */
  /* ------------------------------------------------------------------ */
  let failsafeTimer = 0;
  async function runLoader() {
    const loader = $("#loader");
    const line = $(".loader__line", loader);
    const first = scenes[0];
    const tasks = [
      withTimeout(doc.fonts ? doc.fonts.ready : Promise.resolve(), 3500),
      first ? withTimeout(first.media.posterSettled, 3500) : Promise.resolve(),
      first && MOTION ? withTimeout(first.media.settled(), 7000) : Promise.resolve(),
    ];
    let done = 0;
    tasks.forEach((t) => t.then(() => { done += 1; line.style.setProperty("--p", (done / tasks.length) * 0.9); }));
    await Promise.all([Promise.all(tasks), wait(REDUCED ? 600 : 1900)]);
    line.style.setProperty("--p", 1);
    await wait(REDUCED ? 200 : 700);

    if (Music.available()) {
      // Ask once: with music or without. Browsers only allow sound after a tap,
      // so this tap is what lets the music start.
      clearTimeout(failsafeTimer);
      const gate = $("#enter");
      gate.hidden = false;
      requestAnimationFrame(() => loader.classList.add("is-gate"));
      $('[data-enter="sound"]', gate).focus({ preventScroll: true });
      const withSound = await new Promise((resolve) => {
        $$("[data-enter]", gate).forEach((btn) => btn.addEventListener("click", () => resolve(btn.dataset.enter === "sound"), { once: true }));
      });
      Music.choose(withSound);
      Media.primeAll();
    }

    window.scrollTo(0, 0);
    loader.classList.add("is-done");
    loader.setAttribute("aria-busy", "false");
    body.classList.remove("is-loading");
    body.classList.add("is-ready");
    if (lenis) lenis.start();
    measure();
    if (HAS_GSAP) window.ScrollTrigger.refresh();
    loadDecorativeImages();
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  function init() {
    // Never leave the visitor behind the loader.
    clearTimeout(window.__loaderTimeout);
    failsafeTimer = setTimeout(() => {
      $("#loader").classList.add("is-done");
      body.classList.remove("is-loading");
      body.classList.add("is-ready");
      if (lenis) lenis.start();
    }, 12000);

    window.scrollTo(0, 0);
    safely("content", bindContent);
    safely("actions", initActions);
    safely("scenes", buildScenes);

    if (!MOTION) {
      // Reduced motion: posters, simple fades, everything readable.
      scenes.forEach((s) => s.media.loadPoster());
    } else {
      safely("atmosphere", () => { atmosphere = new Atmosphere($("#atmosphere")); });
      safely("smooth scroll", initSmoothScroll);
      if (HAS_GSAP) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.ScrollTrigger.config({ ignoreMobileResize: true });
        window.ScrollTrigger.addEventListener("refresh", measure);
      }
      safely("card timeline", initCardTimeline);
      // Begin with the first scene and the next one.
      scenes.slice(0, 2).forEach((s) => s.media.load());
    }

    safely("rsvp form", initRsvpForm);
    safely("reveals", initReveals);
    safely("navigation", initNavigation);
    safely("auto scroll", () => AutoScroll.init());
    safely("music", () => Music.init());
    measure();
    startLoop();

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        if (atmosphere) atmosphere.resize();
      }, 180);
    });
    window.addEventListener("load", () => { measure(); if (HAS_GSAP) window.ScrollTrigger.refresh(); });

    runLoader().catch((e) => console.error(e)).finally(() => clearTimeout(failsafeTimer));
  }

  // If something unexpected breaks the cinematic engine, fall back to a calm static page.
  window.addEventListener("error", (e) => {
    if (e && e.target && e.target !== window) return; // resource errors are handled per element
    if (!e || !e.filename || !/main\.js/.test(e.filename)) return; // only our own failures
    if (!MOTION) return;
    console.warn("[invitation] switching to static mode");
    MOTION = false;
    root.classList.replace("is-motion", "is-static");
    scenes.forEach((s) => { s.stage.style.opacity = ""; s.media.unload(); s.media.loadPoster(); });
    $("#loader").classList.add("is-done");
    body.classList.remove("is-loading");
    body.classList.add("is-ready");
    if (lenis) { lenis.destroy(); lenis = null; }
  });

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
