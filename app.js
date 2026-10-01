/* RESET · lógica. Sin red, sin cuentas, sin datos fuera del dispositivo. */
(() => {
  const BREATH_MS = 10000;     // un ciclo: 4 s inhala + 6 s exhala
  const SUB_DELAY = 700;       // frase secundaria
  const QUESTION_DELAY = 1800; // pregunta + botones (obliga a leer antes de decidir)
  const RESTART_AFTER = 60000; // si vuelves tras 1 min, empieza de cero

  const $ = (id) => document.getElementById(id);
  let timers = [];
  let current = null;
  let finished = false;
  let hiddenAt = 0;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* Háptica: vibrate() donde exista; en iPhone (iOS 18+) el truco del switch nativo. */
  const haptic = (() => {
    if (typeof navigator.vibrate === "function") return () => navigator.vibrate(8);
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none";
    document.body.appendChild(label);
    return () => { try { label.click(); } catch (_) {} };
  })();

  function show(id) {
    document.querySelectorAll(".screen.on").forEach((s) => s.classList.remove("on"));
    $(id).classList.add("on");
    current = id;
  }

  function start() {
    clearTimers();
    finished = false;
    const orb = $("orb");
    orb.classList.remove("run");
    void orb.offsetWidth; // reinicia la animación
    orb.classList.add("run");
    show("breathe");
    later(() => show("trigger"), BREATH_MS);
  }

  /* Elige una tarjeta evitando las dos últimas vistas en ese tema. */
  function pick(topic, cards) {
    const key = "reset.hist." + topic;
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}
    const id = (c) => c.join("|");
    const avoid = new Set(hist.slice(-Math.min(2, cards.length - 1)));
    const pool = cards.filter((c) => !avoid.has(id(c)));
    const card = (pool.length ? pool : cards)[Math.floor(Math.random() * (pool.length || cards.length))];
    hist.push(id(card));
    try { localStorage.setItem(key, JSON.stringify(hist.slice(-6))); } catch (_) {}
    return card;
  }

  function choose(topic) {
    const set = MENSAJES[topic];
    if (!set) return;
    const [head, sub] = pick(topic, set.tarjetas);
    $("p-head").textContent = head;
    $("p-sub").textContent = sub || "";
    $("p-q").textContent = set.pregunta;
    const p = $("perspective");
    p.classList.remove("step1", "step2");
    show("perspective");
    later(() => p.classList.add("step1"), SUB_DELAY);
    later(() => p.classList.add("step2"), QUESTION_DELAY);
  }

  function done() {
    clearTimers();
    finished = true;
    show("rest");
  }

  /* Eventos */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !b.closest(".screen.on")) return;
    haptic();
    if (b.dataset.trigger) choose(b.dataset.trigger);
    else if (b.dataset.answer) show(b.dataset.answer === "si" ? "act" : "release");
    else if ("done" in b.dataset) done();
  });

  /* Cada vez que abres el icono debe sentirse como RESET. */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (finished || current === "breathe" || Date.now() - hiddenAt > RESTART_AFTER) start();
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted) start(); });

  start();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
