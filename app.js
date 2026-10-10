/* RESET · lógica. Sin red, sin cuentas, sin datos fuera del dispositivo. */
(() => {
  const SUB_DELAY = 700;       // frase secundaria
  const QUESTION_DELAY = 1800; // pregunta + botones (obliga a leer antes de decidir)
  const RESTART_AFTER = 60000; // si vuelves tras 1 min, empieza de cero
  const BR = { inhale: 4000, hold: 2000, exhale: 4000, cycles: 3 }; // respiración 4-2-4
  const NOHOLD_KEY = "reset.v2.nohold"; // preferencia: omitir la pausa
  const EDITING = ["mp", "mpcat"];      // pantallas donde NO se reinicia solo (no perder lo escrito)
  const Q = window.RESETQ || null;      // módulo de preguntas (si no carga, RESET original sigue igual)

  const $ = (id) => document.getElementById(id);
  let timers = [];
  let current = null;
  let finished = false;
  let hiddenAt = 0;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

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
    if (current === "breathe" && id !== "breathe") brClear();
    document.querySelectorAll(".screen.on").forEach((s) => s.classList.remove("on"));
    $(id).classList.add("on");
    current = id;
  }

  /* Pantalla principal: RESET original (acceso inmediato) + camino de enfoque + Mis preguntas. */
  function start() {
    clearTimers();
    brClear();
    finished = false;
    show("trigger");
  }

  /* ---------- Respiración 4-2-4 ---------- */
  const br = { timers: [], iv: null, cycle: 0 };
  const noHold = () => lsGet(NOHOLD_KEY) === "1";

  function brClear() {
    br.timers.forEach(clearTimeout);
    br.timers = [];
    clearInterval(br.iv);
    br.iv = null;
  }

  function setOrb(scale, ms) {
    const o = $("orb");
    o.style.transition = ms ? "transform " + ms + "ms cubic-bezier(.4,0,.25,1)" : "none";
    o.style.transform = "scale(" + scale + ")";
  }

  function brCount(ms) {
    clearInterval(br.iv);
    let left = Math.round(ms / 1000);
    $("br-count").textContent = left;
    br.iv = setInterval(() => { left -= 1; if (left > 0) $("br-count").textContent = left; }, 1000);
  }

  function brPhase(p) {
    br.timers.forEach(clearTimeout);
    br.timers = [];
    br.phase = p;
    const cyc = br.cycle + " de " + BR.cycles;
    let ms;
    if (p === "in") {
      ms = BR.inhale;
      $("br-label").textContent = "Inhala por la nariz";
      $("br-sub").textContent = cyc;
      setOrb(1, ms);
    } else if (p === "hold") {
      ms = BR.hold;
      $("br-label").textContent = "Pausa";
      $("br-sub").textContent = cyc + " · opcional";
    } else {
      ms = BR.exhale;
      $("br-label").textContent = "Exhala por la nariz";
      $("br-sub").textContent = cyc;
      setOrb(0.34, ms);
    }
    brCount(ms);
    br.timers.push(setTimeout(() => brNext(p), ms));
  }

  function brNext(p) {
    if (p === "in") brPhase(noHold() ? "out" : "hold");
    else if (p === "hold") brPhase("out");
    else if (br.cycle < BR.cycles) { br.cycle += 1; brPhase("in"); }
    else brDone();
  }

  function brDone() {
    brClear();
    br.phase = "done";
    $("breathe").classList.add("done");
    $("br-label").textContent = "Listo.";
    $("br-count").textContent = "";
    $("br-sub").textContent = "";
  }

  function syncHoldButton() {
    $("br-hold").textContent = noHold() ? "Incluir pausa" : "Omitir pausa";
  }

  function brStart() {
    brClear();
    br.cycle = 1;
    $("breathe").classList.remove("done");
    setOrb(0.34, 0);
    void $("orb").offsetWidth; // fija el punto de partida antes de animar
    syncHoldButton();
    brPhase("in");
  }

  function breathAction(a) {
    if (a === "hold") {
      lsSet(NOHOLD_KEY, noHold() ? "0" : "1");
      syncHoldButton();
      if (br.phase === "hold" && noHold()) brPhase("out"); // si estás en la pausa, pasa a exhalar ya
    } else if (a === "repeat") brStart();
    else openDimension(); // saltar, terminar respiración o continuar
  }

  /* ---------- Ámbitos y preguntas ---------- */
  const qs = { name: "", list: [], i: 0 };

  function openDimension() {
    const box = $("dim-list");
    box.replaceChildren();
    const cats = Q ? Q.visible() : [];
    if (!cats.length) {
      const p = document.createElement("p");
      p.className = "sub";
      p.textContent = "Aún no hay preguntas.";
      const b = document.createElement("button");
      b.textContent = "Mis preguntas";
      b.dataset.go = "mp";
      box.append(p, b);
    }
    cats.forEach((c) => {
      const b = document.createElement("button");
      b.textContent = c.nombre;
      b.dataset.cat = c.id;
      if (c.sub) b.className = "sub";
      box.append(b);
    });
    show("dimension");
  }

  function openQuestions(id) {
    const c = Q && Q.visible().find((x) => x.id === id);
    if (!c) return openDimension();
    qs.name = c.nombre;
    qs.list = c.preguntas;
    qs.i = 0;
    renderQuestion();
    show("question");
  }

  function renderQuestion() {
    $("q-cat").textContent = qs.name;
    $("q-pos").textContent = qs.i + 1 + " / " + qs.list.length;
    const t = $("q-text");
    t.textContent = qs.list[qs.i];
    t.classList.remove("in");
    void t.offsetWidth;
    t.classList.add("in");
    const last = qs.i === qs.list.length - 1;
    $("q-mid").hidden = last;
    $("q-last").hidden = !last;
  }

  function questionAction(a) {
    if (a === "prev") { if (qs.i > 0) { qs.i -= 1; renderQuestion(); } else openDimension(); }
    else if (a === "next") { if (qs.i < qs.list.length - 1) { qs.i += 1; renderQuestion(); } }
    else if (a === "cont") start();   // continuar al RESET original
    else if (a === "fin") done();     // finalizar
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

  function go(where) {
    if (where === "focus") { show("breathe"); brStart(); }
    else if (where === "mp" && Q) Q.openList();
  }

  /* Eventos */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !b.closest(".screen.on")) return;
    haptic();
    const d = b.dataset;
    if (d.trigger) choose(d.trigger);
    else if (d.answer) show(d.answer === "si" ? "act" : "release");
    else if ("done" in d) done();
    else if (d.go) go(d.go);
    else if (d.br) breathAction(d.br);
    else if (d.cat) openQuestions(d.cat);
    else if (d.q) questionAction(d.q);
    else if (d.nav === "exit") start();
  });

  /* Cada vez que abres el icono debe sentirse como RESET (salvo mientras editas tus preguntas). */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (EDITING.includes(current)) return;
    if (finished || current === "breathe" || Date.now() - hiddenAt > RESTART_AFTER) start();
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted && !EDITING.includes(current)) start(); });

  if (Q) Q.init({ show });
  else document.querySelectorAll("[data-go]").forEach((b) => { b.hidden = true; });

  start();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    // Cada apertura pide revisar si hay versión nueva (sin usar copias viejas del navegador).
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {}));
  }
})();
