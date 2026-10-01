/* ==========================================================================
   MARÍN PRODUCTOS INDUSTRIALES · Interacciones
   Sin dependencias, salvo Lenis (scroll suave) cargado desde vendor/.
   Un solo bucle rAF coordina scroll y animaciones continuas (no se usa
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

  let navLockUntil = 0; // evita ocultar la barra durante saltos por ancla
  function goTo(target, instant) {
    const navH = parseFloat(getComputedStyle(doc).getPropertyValue("--nav-h")) || 72;
    // Posición absoluta calculada aquí: así no se duplica el scroll-padding-top del html
    const y = typeof target === "number" ? target : Math.round(target.getBoundingClientRect().top + window.scrollY - navH + 1);
    navLockUntil = performance.now() + 2200;
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
  const ldArc = $(".ld__arc");
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
      startHeroRoll();
    }, 650);
    setTimeout(() => { loader.classList.add("is-gone"); loader.setAttribute("aria-hidden", "true"); }, 1900);
  }

  function ldTick(now) {
    if (finished) return;
    const elapsed = now - t0;
    const time = clamp(elapsed / MIN_MS, 0, 1);
    const target = loaded ? Math.min(100, time * 100) : Math.min(88, time * 88);
    shown = lerp(shown, target, 0.1);
    if (loaded && time >= 1 && shown > 99.4) shown = 100;
    ldArc.style.strokeDashoffset = String(100 - shown);
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

  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      revealIO.unobserve(e.target);
    }
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal], [data-split]").forEach((el) => revealIO.observe(el));

  /* ------------------------------------------------------------------
     Contadores
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
     Hero: palabra rotatoria
     ------------------------------------------------------------------ */
  let rollTimer;
  function startHeroRoll() {
    const words = $$(".roll__w");
    if (reduceMotion || words.length < 2) return;
    let i = 0;
    rollTimer = setInterval(() => {
      if (document.hidden) return;
      const cur = words[i];
      i = (i + 1) % words.length;
      const next = words[i];
      cur.classList.remove("is-on");
      cur.classList.add("is-off");
      next.classList.remove("is-off");
      next.style.transition = "none";
      next.style.transform = "translateY(105%)";
      void next.offsetWidth; // reinicia el estado inicial antes de animar
      next.style.transition = "";
      next.style.transform = "";
      next.classList.add("is-on");
    }, 2800);
  }

  /* ------------------------------------------------------------------
     Hero: fondo WebGL (resina líquida con vetas doradas)
     ------------------------------------------------------------------ */
  function initHeroGL() {
    const canvas = $("#heroGL");
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) { canvas.style.background = "radial-gradient(80% 60% at 70% 40%, #13244a, #050a14)"; return; }

    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs = `
      precision mediump float;
      uniform vec2 u_res; uniform float u_t; uniform vec2 u_m;
      float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y);
      }
      float fbm(vec2 p){
        float v=0., a=.5; mat2 r=mat2(.8,-.6,.6,.8);
        for(int i=0;i<5;i++){ v+=a*noise(p); p=r*p*2.02; a*=.5; }
        return v;
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/u_res;
        vec2 p=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
        float t=u_t*.05;
        vec2 q=vec2(fbm(p*1.5+vec2(0.,t)), fbm(p*1.5+vec2(5.2,1.3)-t));
        vec2 r=vec2(fbm(p*1.5+3.*q+vec2(1.7,9.2)+t*1.4), fbm(p*1.5+3.*q+vec2(8.3,2.8)-t));
        float f=fbm(p*1.5+3.*r);

        vec3 ink=vec3(.02,.04,.08), navy=vec3(.06,.15,.33), blue=vec3(.10,.26,.52), gold=vec3(.89,.72,.42);
        vec3 col=mix(ink,navy,smoothstep(.15,.85,f));
        col=mix(col,blue,smoothstep(.55,1.,length(q))*.45);

        float vein =1.-smoothstep(0.,.05,abs(f-.54));
        float vein2=1.-smoothstep(0.,.03,abs(fbm(p*2.6+2.*r+t)-.5));
        col+=gold*vein*.5+gold*vein2*.2;

        vec2 mp=(u_m-.5*u_res)/min(u_res.x,u_res.y);
        col+=gold*exp(-7.*length(p-mp))*.13;

        float sweep=smoothstep(.0,.5,sin(uv.x*3.-uv.y*1.5+u_t*.25)*.5+.5);
        col+=vec3(.03,.06,.12)*sweep;

        col*=1.-.55*smoothstep(1.,0.,uv.x)*smoothstep(0.,.45,1.-uv.y+.3);
        col*=smoothstep(1.35,.35,length(uv-.5)*1.5);
        gl_FragColor=vec4(col,1.);
      }`;

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.background = "radial-gradient(80% 60% at 70% 40%, #13244a, #050a14)";
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uT = gl.getUniformLocation(prog, "u_t");
    const uM = gl.getUniformLocation(prog, "u_m");

    const small = window.innerWidth < 768;
    const scale = small ? 0.45 : 0.62; // se renderiza a menor resolución: el fondo es difuso por diseño
    let w = 0, h = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(2, Math.round(canvas.clientWidth * dpr * scale));
      h = Math.max(2, Math.round(canvas.clientHeight * dpr * scale));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0.7, y: 0.5, tx: 0.7, ty: 0.5 };
    if (finePointer) {
      window.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) / r.width;
        mouse.ty = 1 - (e.clientY - r.top) / r.height;
      }, { passive: true });
    }

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    const draw = (t) => {
      mouse.x = lerp(mouse.x, mouse.tx, 0.05);
      mouse.y = lerp(mouse.y, mouse.ty, 0.05);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uT, t * 0.001 + 20);
      gl.uniform2f(uM, mouse.x * w, mouse.y * h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw(0);
    if (!reduceMotion) frameSubs.push((t) => { if (visible && !document.hidden) draw(t); });
  }

  /* ------------------------------------------------------------------
     Campo de nodos (evoca la molécula del logotipo)
     ------------------------------------------------------------------ */
  function initNodes(canvas, opts) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const o = Object.assign({ density: 15000, max: 80, link: 150, speed: 0.22 }, opts);
    let w = 0, h = 0, dpr = 1, nodes = [];
    const mouse = { x: -999, y: -999 };
    let visible = true;

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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
        ctx.beginPath();
        ctx.fillStyle = a.r > 2 ? "rgba(241,219,160,.95)" : "rgba(226,191,120,.6)";
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    draw(false);
    if (!reduceMotion) frameSubs.push(() => { if (visible && !document.hidden) draw(true); });
  }

  /* ------------------------------------------------------------------
     Hero: paralaje de tarjetas con el puntero
     ------------------------------------------------------------------ */
  const heroCards = $(".hero__cards");
  if (heroCards && finePointer && !reduceMotion) {
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (e) => {
      m.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      m.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    frameSubs.push(() => {
      m.x = lerp(m.x, m.tx, 0.06); m.y = lerp(m.y, m.ty, 0.06);
      heroCards.style.setProperty("--mx", m.x.toFixed(3));
      heroCards.style.setProperty("--my", m.y.toFixed(3));
    });
  }

  /* ------------------------------------------------------------------
     Foco de luz sobre tarjetas, tilt y botones magnéticos
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
      $$("[data-tilt]").forEach((el) => {
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          el.style.transform = `rotateY(${((px - 0.5) * 10).toFixed(2)}deg) rotateX(${((0.5 - py) * 10).toFixed(2)}deg)`;
          el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
          el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        });
        el.addEventListener("pointerleave", () => { el.style.transform = ""; });
      });

      $$("[data-magnetic]").forEach((el) => {
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
          const dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
          el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        });
        el.addEventListener("pointerleave", () => { el.style.translate = ""; });
      });
    }
  }

  /* ------------------------------------------------------------------
     Navegación: estado, ocultar al bajar, enlace activo, menú móvil
     ------------------------------------------------------------------ */
  const nav = $("#nav");
  const bar = $("#progressBar");
  const burger = $("#burger");
  const menu = $("#menu");
  let navLastY = 0;

  scrollSubs.push((y) => {
    nav.classList.toggle("is-stuck", y > 24);
    const goingDown = y > navLastY;
    if (performance.now() < navLockUntil) nav.classList.remove("is-hidden");
    else if (!menu.classList.contains("is-open")) nav.classList.toggle("is-hidden", goingDown && y > 520 && y - navLastY > 2);
    if (!goingDown && navLastY - y > 2) nav.classList.remove("is-hidden");
    navLastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0})`;
  });

  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    if (open) { nav.classList.remove("is-hidden"); stopScroll(); doc.style.overflow = "hidden"; }
    else { startScroll(); doc.style.overflow = ""; }
  }
  burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  menu.setAttribute("data-lenis-prevent", "");

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2 || a.hasAttribute("data-wa") && waReady()) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    if (menu.classList.contains("is-open")) { setMenu(false); setTimeout(() => goTo(target), 350); }
    else goTo(target);
  });

  const links = $$(".nav__links a");
  const secIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((l) => l.classList.toggle("is-current", l.getAttribute("href") === `#${e.target.id}`));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => secIO.observe(s));

  $("#toTop").addEventListener("click", () => goTo(0));
  $("#year").textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Sistemas: tabs accesibles
     ------------------------------------------------------------------ */
  $$(".meters dd").forEach((dd) => dd.style.setProperty("--lv", dd.dataset.lv));
  (() => {
    const tabs = $$(".tab");
    const panels = $$(".panel");
    const imgs = $$(".tabs__media img");
    function select(i, focus) {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute("aria-selected", String(on));
        t.classList.toggle("is-active", on);
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p, k) => { p.hidden = k !== i; p.classList.toggle("is-active", k === i); });
      imgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
      if (focus) tabs[i].focus();
      tabs[i].scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        const k = e.key;
        if (k === "ArrowRight" || k === "ArrowLeft" || k === "Home" || k === "End") {
          e.preventDefault();
          const next = k === "Home" ? 0 : k === "End" ? tabs.length - 1 : (i + (k === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          select(next, true);
        }
      });
    });
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

    function render(y) {
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
    render(0);
    scrollSubs.push((y) => { if (visible) render(y); });
    window.addEventListener("resize", () => render(window.scrollY));
  })();

  /* ------------------------------------------------------------------
     Galería: filtros + lightbox
     ------------------------------------------------------------------ */
  (() => {
    const shots = $$(".shot");
    const chips = $$(".chip", $("#filters"));
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
     Suministro: riel con flechas
     ------------------------------------------------------------------ */
  (() => {
    const rail = $("#rail");
    if (!rail) return;
    rail.setAttribute("data-lenis-prevent", "");
    const step = () => (rail.firstElementChild ? rail.firstElementChild.getBoundingClientRect().width + 14 : 300);
    const by = (d) => rail.scrollBy({ left: d * step(), behavior: reduceMotion ? "auto" : "smooth" });
    $("#railPrev").addEventListener("click", () => by(-1));
    $("#railNext").addEventListener("click", () => by(1));
    rail.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); by(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); by(-1); }
    });
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
      const wrap = field.closest(".field");
      wrap.classList.toggle("is-invalid", !!msg);
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
     Arranque
     ------------------------------------------------------------------ */
  initHeroGL();
  initNodes($("#heroNodes"), { density: window.innerWidth < 768 ? 22000 : 15000, max: window.innerWidth < 768 ? 34 : 80 });
  initNodes($("#contactNodes"), { density: 20000, max: 50, link: 130, speed: 0.16 });
})();
