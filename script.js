/* ==========================================================================
   MARÍN PRODUCTOS INDUSTRIALES · Interacciones
   Sin dependencias, salvo Lenis (scroll suave) cargado desde vendor/.
   Un solo bucle rAF coordina el scroll y las animaciones continuas (no se usa
   window.addEventListener("scroll"). Todo respeta prefers-reduced-motion.
   ========================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIGURACIÓN: completar antes de publicar
     ------------------------------------------------------------------ */
  const CONFIG = {
    // Número de WhatsApp en formato internacional, solo dígitos. Ej. México: "527441234567"
    WHATSAPP_NUMBER: "52XXXXXXXXXX",
    // URL de la página de Facebook del negocio (si se deja vacío, se ocultan los enlaces)
    FACEBOOK_URL: "",
    DEFAULT_MESSAGE: "Hola, quiero cotizar un proyecto de piso epóxico con Marín Productos Industriales."
  };

  const doc = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let reduceMotion = reduceMQ.matches;
  reduceMQ.addEventListener?.("change", (e) => { reduceMotion = e.matches; });

  /* ------------------------------------------------------------------
     Bucle central: scroll suave + suscriptores de scroll y de frame
     ------------------------------------------------------------------ */
  const scrollSubs = [];
  const frameSubs = [];
  let lenis = null;
  let lastY = -1;

  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  }

  function frame(t) {
    if (lenis) lenis.raf(t);
    const y = window.scrollY;
    if (y !== lastY) {
      lastY = y;
      for (const fn of scrollSubs) fn(y);
    }
    for (const fn of frameSubs) fn(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const stopScroll = () => lenis && lenis.stop();
  const startScroll = () => lenis && lenis.start();

  function goTo(target, instant) {
    const navH = parseFloat(getComputedStyle(doc).getPropertyValue("--nav-h")) || 72;
    // Posición absoluta calculada aquí: evita doble compensación con scroll-padding
    const y = typeof target === "number" ? target : Math.round(target.getBoundingClientRect().top + window.scrollY - navH + 1);
    if (lenis && !instant) {
      lenis.scrollTo(y, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      window.scrollTo({ top: y, behavior: reduceMotion || instant ? "auto" : "smooth" });
    }
  }

  /* ------------------------------------------------------------------
     Enlaces: WhatsApp / Facebook
     ------------------------------------------------------------------ */
  const waReady = () => !/X/i.test(CONFIG.WHATSAPP_NUMBER);
  const waURL = (text) => `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text || CONFIG.DEFAULT_MESSAGE)}`;

  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 4200);
  }

  function openWhatsApp(text) {
    if (!waReady()) {
      toast("Falta configurar el número de WhatsApp en script.js (CONFIG.WHATSAPP_NUMBER).");
      return;
    }
    const w = window.open(waURL(text), "_blank", "noopener");
    if (!w) window.location.href = waURL(text);
  }

  $$("[data-wa]").forEach((el) => {
    el.setAttribute("rel", "noopener noreferrer");
    el.setAttribute("target", "_blank");
    el.setAttribute("href", waReady() ? waURL(el.dataset.waText) : "#contacto");
    el.addEventListener("click", (e) => {
      if (!waReady()) { e.preventDefault(); e.stopImmediatePropagation(); openWhatsApp(); }
    }, true);
  });

  $$("[data-fb]").forEach((el) => {
    if (CONFIG.FACEBOOK_URL) el.setAttribute("href", CONFIG.FACEBOOK_URL);
    else (el.closest("[data-fb-item]") || el).hidden = true;
  });

  /* ------------------------------------------------------------------
     Loader: progreso real (carga de recursos) con piso mínimo
     ------------------------------------------------------------------ */
  const loader = $("#loader");
  const ldBar = $("#ldBar");
  const ldBrand = $(".ld__brand");
  const ldPct = $("#ldPct");
  const ldStatus = $("#ldStatus");
  const statuses = ["Preparando superficie", "Mezclando resinas", "Aplicando capa epóxica", "Sellando acabado", "Listo"];
  const MIN_MS = reduceMotion ? 500 : 2100;
  const t0 = performance.now();
  let loaded = false;
  let shown = 0;
  let finished = false;

  const markLoaded = () => { loaded = true; };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const pageLoaded = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((res) => window.addEventListener("load", res, { once: true }));
  Promise.all([fontsReady, pageLoaded]).then(markLoaded);
  setTimeout(markLoaded, 7000); // tope de seguridad en conexiones lentas

  function finishLoader() {
    if (finished) return;
    finished = true;
    loader.classList.add("is-done");
    setTimeout(() => {
      doc.classList.remove("is-loading");
      doc.classList.add("is-ready");
      startHero();
    }, 650);
    setTimeout(() => { loader.classList.add("is-gone"); loader.setAttribute("aria-hidden", "true"); }, 1900);
  }

  function ldTick(now) {
    if (finished) return;
    const time = clamp((now - t0) / MIN_MS, 0, 1);
    const target = loaded ? Math.min(100, time * 100) : Math.min(88, time * 88);
    shown = lerp(shown, target, 0.1);
    if (loaded && time >= 1 && shown > 99.4) shown = 100;
    ldBar.style.transform = `scaleX(${(shown / 100).toFixed(4)})`;
    ldBrand.style.setProperty("--p", shown.toFixed(1));
    ldPct.textContent = String(Math.round(shown));
    ldStatus.textContent = statuses[Math.min(statuses.length - 1, Math.floor(shown / 25))];
    if (shown >= 100) { finishLoader(); return; }
    requestAnimationFrame(ldTick);
  }
  requestAnimationFrame(ldTick);

  /* ------------------------------------------------------------------
     Titulares partidos por palabra + reveal con IntersectionObserver
     ------------------------------------------------------------------ */
  $$("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words
      .map((w, i) => `<span class="w" aria-hidden="true"><span class="w__in" style="--i:${i}">${w}</span></span>`)
      .join(" ");
  });

  // Los elementos con clip-path no son detectados por IntersectionObserver: se observa su contenedor
  const revealMap = new Map();
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      (revealMap.get(e.target) || e.target).classList.add("is-in");
      revealIO.unobserve(e.target);
    }
  }, { threshold: 0.16, rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal], [data-split]").forEach((el) => {
    if (el.dataset.reveal === "clip") { revealMap.set(el.parentElement, el); revealIO.observe(el.parentElement); }
    else revealIO.observe(el);
  });

  /* ------------------------------------------------------------------
     Contadores de indicadores
     ------------------------------------------------------------------ */
  const countIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      countIO.unobserve(e.target);
      const el = e.target;
      const end = Number(el.dataset.count);
      const prefix = el.dataset.prefix || "";
      if (reduceMotion) { el.textContent = prefix + end; continue; }
      const dur = 1900;
      const s = performance.now();
      const step = (now) => {
        const p = clamp((now - s) / dur, 0, 1);
        el.textContent = prefix + Math.round(end * ease(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => {
    if (!reduceMotion) el.textContent = (el.dataset.prefix || "") + "0";
    countIO.observe(el);
  });

  /* ------------------------------------------------------------------
     Hero: visor de sectores sincronizado con la palabra del titular
     ------------------------------------------------------------------ */
  const viewer = $("#viewer");
  let heroStarted = false;
  let viewerGo = () => {};

  (() => {
    if (!viewer) return;
    const tabs = $$(".vtab", viewer);
    const panels = $$(".vpanel", viewer);
    const words = $$(".roll__w");
    const cap = $("#viewerCap");
    let cur = 0;

    function restartProgress() {
      viewer.classList.remove("is-playing");
      void viewer.offsetWidth; // reinicia la animación de la barra
      if (!reduceMotion && heroStarted) viewer.classList.add("is-playing");
    }

    function set(i) {
      if (i === cur) return;
      const prev = panels[cur];
      const next = panels[i];
      panels.forEach((p) => p.classList.remove("is-prev"));
      prev.classList.remove("is-on");
      prev.classList.add("is-prev");
      next.classList.remove("is-prev");
      next.classList.add("is-on");
      prev.setAttribute("aria-hidden", "true");
      next.removeAttribute("aria-hidden");
      setTimeout(() => { if (!prev.classList.contains("is-on")) prev.classList.remove("is-prev"); }, 1300);

      tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      cap.textContent = next.dataset.cap;

      const wOut = words[cur];
      const wIn = words[i];
      if (wOut && wIn) {
        wOut.classList.remove("is-on");
        wOut.classList.add("is-off");
        wIn.classList.remove("is-off");
        wIn.style.transition = "none";
        wIn.style.transform = "translateY(105%)";
        void wIn.offsetWidth; // fija el estado inicial antes de animar
        wIn.style.transition = "";
        wIn.style.transform = "";
        wIn.classList.add("is-on");
      }
      cur = i;
      restartProgress();
    }

    tabs.forEach((t, i) => {
      t.addEventListener("click", () => set(i));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          set(n);
          tabs[n].focus();
        }
      });
    });
    // La barra de progreso de la pestaña activa dispara el siguiente sector
    viewer.addEventListener("animationend", (e) => {
      if (e.animationName === "vfill") set((cur + 1) % tabs.length);
    });
    new IntersectionObserver(([e]) => viewer.classList.toggle("is-off", !e.isIntersecting), { threshold: 0.2 }).observe(viewer);

    viewerGo = restartProgress;
  })();

  function startHero() {
    heroStarted = true;
    viewerGo();
  }

  // Foco de luz de la grilla del hero
  const hero = $("#inicio");
  if (hero && finePointer) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  // Al bajar, el texto y el visor del hero se separan a distinta velocidad
  if (hero && viewer && !reduceMotion) {
    const copy = $(".hero__copy");
    scrollSubs.push((y) => {
      const h = hero.offsetHeight;
      if (y > h) return;
      const p = clamp(y / (h * 0.85), 0, 1);
      copy.style.transform = `translate3d(0, ${(p * 60).toFixed(1)}px, 0)`;
      copy.style.opacity = (1 - p * 1.15).toFixed(3);
      viewer.style.translate = `0 ${(-p * 36).toFixed(1)}px`;
    });
  }

  /* ------------------------------------------------------------------
     Parallax de imágenes (solo las visibles)
     ------------------------------------------------------------------ */
  (() => {
    const visible = new Set();
    function update() {
      const vh = window.innerHeight;
      for (const img of visible) {
        const box = img.parentElement.getBoundingClientRect();
        const c = box.top + box.height / 2 - vh / 2;
        const max = box.height * 0.07;
        img.style.setProperty("--py", `${clamp(-c * 0.05, -max, max).toFixed(1)}px`);
      }
    }
    if (reduceMotion) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
      update();
    }, { rootMargin: "10% 0px" });
    $$("[data-parallax]").forEach((img) => io.observe(img));
    scrollSubs.push(update);
  })();

  /* ------------------------------------------------------------------
     Foco de luz en tarjetas y botones magnéticos
     ------------------------------------------------------------------ */
  if (finePointer) {
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest && e.target.closest(".spot");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });

    if (!reduceMotion) {
      $$("[data-magnetic]").forEach((el) => {
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
          const dy = (e.clientY - (r.top + r.height / 2)) * 0.26;
          el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        });
        el.addEventListener("pointerleave", () => { el.style.translate = ""; });
      });
    }
  }

  /* ------------------------------------------------------------------
     Navegación: progreso, menú móvil, sección activa (rail + header)
     ------------------------------------------------------------------ */
  const bar = $("#progressBar");
  const burger = $("#burger");
  const menu = $("#menu");

  scrollSubs.push((y) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0})`;
  });

  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    if (open) { stopScroll(); doc.style.overflow = "hidden"; }
    else { startScroll(); doc.style.overflow = ""; }
  }
  burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  menu.setAttribute("data-lenis-prevent", "");

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2 || (a.hasAttribute("data-wa") && waReady())) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    if (menu.classList.contains("is-open")) { setMenu(false); setTimeout(() => goTo(target), 350); }
    else goTo(target);
  });

  const navLinks = $$(".nav__links a, .rail__nav a");
  const alias = { indicadores: "inicio", pie: "contacto" };
  const secIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const id = alias[e.target.id] || e.target.id;
      navLinks.forEach((l) => l.classList.toggle("is-current", l.getAttribute("href") === `#${id}`));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id], #pie").forEach((s) => secIO.observe(s));

  $$("[data-totop]").forEach((b) => b.addEventListener("click", () => goTo(0)));
  $("#year").textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Sistemas: maestro / detalle accesible
     ------------------------------------------------------------------ */
  $$(".meters dd").forEach((dd) => dd.style.setProperty("--lv", dd.dataset.lv));
  (() => {
    const tabs = $$(".sys");
    const panels = $$(".spanel");
    const imgs = $$(".md__media img");
    const cta = $("#sysCta");
    let current = 0;
    function select(i, focus) {
      current = i;
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute("aria-selected", String(on));
        t.classList.toggle("is-active", on);
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p, k) => { p.hidden = k !== i; p.classList.toggle("is-active", k === i); });
      imgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
      if (focus) tabs[i].focus();
      const list = tabs[i].parentElement;
      if (list.scrollWidth > list.clientWidth) tabs[i].scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        const k = e.key;
        if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(k)) {
          e.preventDefault();
          const fwd = k === "ArrowRight" || k === "ArrowDown";
          const next = k === "Home" ? 0 : k === "End" ? tabs.length - 1 : (i + (fwd ? 1 : -1) + tabs.length) % tabs.length;
          select(next, true);
        }
      });
    });
    // "Solicitar cotización" desde un sistema precarga el mensaje del formulario
    cta.addEventListener("click", () => {
      const msg = $("#f-msg");
      const name = panels[current].dataset.sys;
      if (msg && !msg.value.trim()) msg.value = `Me interesa el sistema: ${name}.`;
    });
  })();

  /* ------------------------------------------------------------------
     Proyectos: filtros, conteo y lightbox
     ------------------------------------------------------------------ */
  (() => {
    const shots = $$(".shot");
    const chips = $$(".chip", $("#filters"));
    const count = $("#galleryCount");
    const labels = { industrial: "Industrial", comercial: "Comercial", residencial: "Residencial", sanitario: "Sanitario", decorativo: "Decorativo", impermeabilizacion: "Impermeabilización", obra: "En obra" };

    // Barra de leyenda al pasar el puntero (se genera aquí para no repetir marcado)
    shots.forEach((s) => {
      const btn = $(".shot__btn", s);
      const cap = document.createElement("span");
      cap.className = "shot__cap";
      cap.setAttribute("aria-hidden", "true");
      cap.innerHTML = `<span>${labels[s.dataset.cat] || ""}</span><svg class="ic"><use href="#i-corners-out"/></svg>`;
      btn.appendChild(cap);
    });

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const f = chip.dataset.filter;
        chips.forEach((c) => { const on = c === chip; c.classList.toggle("is-active", on); c.setAttribute("aria-pressed", String(on)); });
        let n = 0;
        shots.forEach((s) => {
          const show = f === "all" || s.dataset.cat === f;
          s.classList.toggle("is-hidden", !show);
          s.classList.remove("is-filtering");
          if (show) {
            s.style.setProperty("--i", String(n++));
            void s.offsetWidth;
            if (!reduceMotion) s.classList.add("is-filtering");
          }
        });
        count.textContent = String(n);
      });
    });

    const lb = $("#lb");
    const lbImg = $("#lbImg");
    const lbCap = $("#lbCap");
    const closeBtn = $("#lbClose");
    const prev = $("#lbPrev");
    const next = $("#lbNext");
    let list = [];
    let idx = 0;
    let opener = null;
    lb.setAttribute("data-lenis-prevent", "");

    function show(i, instant) {
      idx = (i + list.length) % list.length;
      const img = $("img", list[idx]);
      const apply = () => {
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = img.alt;
        lbImg.classList.remove("is-swap");
      };
      if (instant || reduceMotion) apply();
      else { lbImg.classList.add("is-swap"); setTimeout(apply, 260); }
    }
    function open(shot) {
      list = shots.filter((s) => !s.classList.contains("is-hidden"));
      opener = document.activeElement;
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      stopScroll();
      doc.style.overflow = "hidden";
      show(list.indexOf(shot), true);
      closeBtn.focus();
    }
    function close() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      startScroll();
      doc.style.overflow = "";
      if (opener) opener.focus();
    }
    shots.forEach((s) => $(".shot__btn", s).addEventListener("click", () => open(s)));
    closeBtn.addEventListener("click", close);
    prev.addEventListener("click", () => show(idx - 1));
    next.addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "Tab") {
        const f = [closeBtn, prev, next];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    let sx = 0;
    lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
  })();

  /* ------------------------------------------------------------------
     Proceso: escena 3D anclada al scroll (capas del sistema epóxico)
     ------------------------------------------------------------------ */
  (() => {
    const section = $("#proceso");
    const stack = $("#stack");
    if (!section || !stack) return;
    const layers = $$(".layer", stack);
    const steps = $$(".step", section);
    const N = layers.length;
    let visible = false;
    let current = -1;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "20% 0px" }).observe(section);

    function render() {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / Math.max(1, total), 0, 1);
      const p5 = p * (N - 0.0001);
      const idx = Math.min(N - 1, Math.floor(p5));
      const size = stack.offsetWidth;
      const gap = size * 0.17 * (0.55 + 0.45 * p);
      layers.forEach((l, i) => {
        const t = i === 0 ? 1 : clamp((p5 - (i - 0.5)) / 0.8, 0, 1); // la capa llega justo cuando su paso se activa
        const drop = (1 - ease(t)) * size * 0.9;
        l.style.setProperty("--z", (i * gap + drop).toFixed(1));
        l.style.setProperty("--o", i === 0 ? "1" : ease(t).toFixed(3));
        l.classList.toggle("is-active", i === idx);
      });
      const lift = (N - 1) * gap * 0.87 * 0.5;
      stack.style.transform = `translateY(${lift.toFixed(1)}px) rotateX(60deg) rotateZ(${(-38 + p * 26).toFixed(1)}deg)`;
      if (idx !== current) {
        current = idx;
        steps.forEach((s, k) => s.classList.toggle("is-active", k === idx));
      }
    }
    if (reduceMotion) {
      layers.forEach((l, i) => { l.style.setProperty("--z", String(i * 40)); l.style.setProperty("--o", "1"); });
      steps.forEach((s) => s.classList.add("is-active"));
      return;
    }
    render();
    scrollSubs.push(() => { if (visible) render(); });
    window.addEventListener("resize", render);
  })();

  /* ------------------------------------------------------------------
     FAQ: acordeón
     ------------------------------------------------------------------ */
  $$(".acc__item").forEach((item) => {
    const q = $(".acc__q", item);
    q.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      q.setAttribute("aria-expanded", String(open));
    });
  });

  /* ------------------------------------------------------------------
     Formulario → WhatsApp
     ------------------------------------------------------------------ */
  (() => {
    const form = $("#quoteForm");
    if (!form) return;
    const rules = {
      nombre: (v) => (v.trim().length >= 2 ? "" : "Escribe tu nombre completo."),
      tipo: (v) => (v ? "" : "Selecciona el tipo de proyecto."),
      mensaje: (v) => (v.trim().length >= 10 ? "" : "Cuéntanos un poco más sobre tu proyecto (mínimo 10 caracteres).")
    };
    const errId = { nombre: "e-nombre", tipo: "e-tipo", mensaje: "e-msg" };

    function check(name) {
      const field = form.elements[name];
      const msg = rules[name](field.value);
      field.closest(".field").classList.toggle("is-invalid", !!msg);
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      $("#" + errId[name]).textContent = msg;
      return !msg;
    }
    Object.keys(rules).forEach((name) => {
      const f = form.elements[name];
      f.addEventListener("blur", () => check(name));
      f.addEventListener("input", () => { if (f.closest(".field").classList.contains("is-invalid")) check(name); });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const results = Object.keys(rules).map((n) => [n, check(n)]);
      const bad = results.find(([, ok]) => !ok);
      if (bad) { form.elements[bad[0]].focus(); return; }
      const v = (n) => form.elements[n].value.trim();
      const lines = [
        "Hola, quiero solicitar una cotización con Marín Productos Industriales.",
        "",
        `*Nombre:* ${v("nombre")}`,
        `*Tipo de proyecto:* ${v("tipo")}`
      ];
      if (v("ciudad")) lines.push(`*Ciudad y estado:* ${v("ciudad")}`);
      if (v("m2")) lines.push(`*Superficie aproximada:* ${v("m2")} m²`);
      lines.push(`*Detalles:* ${v("mensaje")}`);
      if (!waReady()) { openWhatsApp(); return; }
      form.classList.add("is-sent");
      toast("Abriendo WhatsApp con tu solicitud.");
      openWhatsApp(lines.join("\n"));
      setTimeout(() => { form.reset(); form.classList.remove("is-sent"); }, 1500);
    });
  })();

  /* ------------------------------------------------------------------
     Campo de nodos en contacto (evoca la molécula del logotipo)
     ------------------------------------------------------------------ */
  (() => {
    const canvas = $("#contactNodes");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const o = { density: 20000, max: 50, link: 130, speed: 0.16 };
    let w = 0, h = 0, nodes = [];
    const mouse = { x: -999, y: -999 };
    let visible = true;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(o.max, Math.round((w * h) / o.density));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * o.speed, vy: (Math.random() - 0.5) * o.speed,
        r: Math.random() < 0.14 ? 2.6 : 1.4
      }));
    }
    build();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });
    if (finePointer) {
      window.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      }, { passive: true });
    }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

    function draw(move) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (move) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < -10) a.x = w + 10; else if (a.x > w + 10) a.x = -10;
          if (a.y < -10) a.y = h + 10; else if (a.y > h + 10) a.y = -10;
          const mx = a.x - mouse.x, my = a.y - mouse.y, md = mx * mx + my * my;
          if (md < 14000) { const f = (1 - md / 14000) * 0.6; a.x += (mx / Math.sqrt(md + 1)) * f; a.y += (my / Math.sqrt(md + 1)) * f; }
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
          if (d < o.link * o.link) {
            const al = (1 - Math.sqrt(d) / o.link) * 0.34;
            ctx.strokeStyle = `rgba(226,191,120,${al.toFixed(3)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const a of nodes) {
        ctx.fillStyle = a.r > 2 ? "rgba(241,219,160,.95)" : "rgba(226,191,120,.6)";
        ctx.fillRect(a.x - a.r, a.y - a.r, a.r * 2, a.r * 2); // nodos cuadrados, coherentes con la geometría recta
      }
    }
    draw(false);
    if (!reduceMotion) frameSubs.push(() => { if (visible && !document.hidden) draw(true); });
  })();
})();
