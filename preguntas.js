/*
  RESET v2 · Biblioteca de preguntas + editor "Mis preguntas"
  ------------------------------------------------------------------
  Este archivo NO contiene preguntas personales. Todo se guarda en el
  dispositivo (localStorage, clave "reset.v2.library"). Nada se envía
  a ningún servidor. No está cifrado ni se sincroniza.

  Formato (también el del respaldo JSON):
  {
    "app": "RESET", "tipo": "biblioteca-de-preguntas", "version": 1,
    "categorias": [
      { "id": "…", "nombre": "…", "padre": null | "id-de-otra-categoria",
        "preguntas": ["texto exacto", …] }
    ]
  }
  "padre" permite una subcategoría (un solo nivel).
*/
window.RESETQ = (() => {
  const KEY = "reset.v2.library";
  const FORMAT = { app: "RESET", tipo: "biblioteca-de-preguntas", version: 1 };
  const LIMITS = { categorias: 100, preguntas: 200, nombre: 80, texto: 1000, archivo: 1048576 };

  const $ = (id) => document.getElementById(id);
  const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    kids.forEach((k) => n.append(k));
    return n;
  }

  /* ---------- Validación (sirve para lo guardado y para importar) ---------- */
  function validate(d) {
    const err = (error) => ({ error });
    if (!d || typeof d !== "object" || Array.isArray(d)) return err("El archivo no tiene el formato de un respaldo de RESET.");
    if (d.app !== FORMAT.app || d.tipo !== FORMAT.tipo) return err("Este archivo no es un respaldo de preguntas de RESET.");
    if (d.version !== FORMAT.version) return err("La versión de este respaldo no es compatible.");
    const src = d.categorias;
    if (!Array.isArray(src)) return err("El respaldo no contiene categorías.");
    if (src.length > LIMITS.categorias) return err("El respaldo tiene demasiadas categorías.");

    const ids = new Set();
    const cats = [];
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      const n = i + 1;
      if (!c || typeof c !== "object") return err("Categoría " + n + ": formato inválido.");
      if (typeof c.id !== "string" || !c.id || c.id.length > 64 || ids.has(c.id)) return err("Categoría " + n + ": identificador inválido o repetido.");
      ids.add(c.id);
      const nombre = typeof c.nombre === "string" ? c.nombre.trim() : "";
      if (!nombre || nombre.length > LIMITS.nombre) return err("Categoría " + n + ": nombre inválido.");
      if (c.padre != null && typeof c.padre !== "string") return err("«" + nombre + "»: subcategoría inválida.");
      if (!Array.isArray(c.preguntas) || c.preguntas.length > LIMITS.preguntas) return err("«" + nombre + "»: lista de preguntas inválida.");
      const preguntas = [];
      for (const p of c.preguntas) {
        if (typeof p !== "string" || !p.trim() || p.length > LIMITS.texto) return err("«" + nombre + "»: hay una pregunta vacía o demasiado larga.");
        preguntas.push(p); // el texto se conserva EXACTAMENTE como viene
      }
      cats.push({ id: c.id, nombre, padre: c.padre == null ? null : c.padre, preguntas });
    }
    for (const c of cats) {
      if (c.padre === null) continue;
      const p = cats.find((x) => x.id === c.padre);
      if (!p || p === c || p.padre !== null) return err("«" + c.nombre + "»: subcategoría inválida.");
    }
    return { lib: { categorias: cats } };
  }

  /* ---------- Almacenamiento ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { categorias: [] };
      const r = validate(JSON.parse(raw));
      return r.lib || { categorias: [] };
    } catch (_) { return { categorias: [] }; }
  }
  function store(lib) {
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.assign({}, FORMAT, { categorias: lib.categorias })));
      return true;
    } catch (_) { return false; }
  }
  function serialize(lib) {
    return JSON.stringify(Object.assign({}, FORMAT, { exportado: new Date().toISOString(), categorias: lib.categorias }), null, 2);
  }
  function counts(lib) {
    return { cats: lib.categorias.length, qs: lib.categorias.reduce((a, c) => a + c.preguntas.length, 0) };
  }
  /* Orden de presentación: cada categoría principal seguida de sus subcategorías. */
  function ordered(lib) {
    const out = [];
    lib.categorias.filter((c) => c.padre === null).forEach((t) => {
      out.push({ c: t, sub: false });
      lib.categorias.filter((x) => x.padre === t.id).forEach((s) => out.push({ c: s, sub: true }));
    });
    return out;
  }
  /* Solo categorías con preguntas. */
  function visible() {
    const lib = load();
    const withQ = (id) => lib.categorias.some((c) => c.id === id && c.preguntas.length);
    return ordered(lib)
      .filter((x) => x.c.preguntas.length)
      .map((x) => ({ id: x.c.id, nombre: x.c.nombre, preguntas: x.c.preguntas.slice(), sub: x.sub && withQ(x.c.padre) }));
  }

  /* ---------- Diálogos propios (sin alert/confirm del navegador) ---------- */
  function dialog(msg, okLabel, cancelLabel) {
    return new Promise((resolve) => {
      const modal = $("modal"), ok = $("modal-ok"), no = $("modal-no");
      $("modal-msg").textContent = msg;
      ok.textContent = okLabel || "Aceptar";
      no.hidden = cancelLabel === null;
      no.textContent = cancelLabel || "Cancelar";
      modal.hidden = false;
      const end = (v) => { modal.hidden = true; ok.onclick = no.onclick = null; resolve(v); };
      ok.onclick = () => end(true);
      no.onclick = () => end(false);
    });
  }
  const ask = (m, ok) => dialog(m, ok, "Cancelar");
  const tell = (m) => dialog(m, "Entendido", null);

  /* ---------- Editor ---------- */
  const E = { ctx: null, draft: null, dirty: false, saving: 0 };

  function renderList() {
    const lib = load();
    const box = $("mp-list");
    box.replaceChildren();
    const o = ordered(lib);
    if (!o.length) box.append(el("p", { class: "sub" }, "Aún no tienes categorías."));
    o.forEach(({ c, sub }) => {
      const b = el("button", { class: "cat" + (sub ? " sub" : ""), "data-mp": "open", "data-id": c.id },
        el("span", {}, c.nombre), el("span", { class: "n" }, String(c.preguntas.length)));
      box.append(b);
    });
  }
  function openList() { renderList(); E.ctx.show("mp"); }

  function openCat(id) {
    const lib = load();
    const c = id && lib.categorias.find((x) => x.id === id);
    E.draft = c
      ? { id: c.id, nombre: c.nombre, padre: c.padre, preguntas: c.preguntas.slice() }
      : { id: uid(), nombre: "", padre: null, preguntas: [] };
    E.dirty = false;
    renderCat();
    E.ctx.show("mpcat");
  }

  function grow(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }

  function renderCat(focusLast) {
    const lib = load();
    const d = E.draft;
    $("mc-name").value = d.nombre;

    const hasKids = lib.categorias.some((x) => x.padre === d.id);
    const sel = $("mc-parent");
    sel.replaceChildren(el("option", { value: "" }, "Ninguna (categoría principal)"));
    lib.categorias.filter((c) => c.padre === null && c.id !== d.id).forEach((c) => {
      const o = el("option", { value: c.id }, c.nombre);
      sel.append(o);
    });
    sel.value = d.padre || "";
    $("mc-parent-wrap").hidden = hasKids;

    const box = $("mc-qs");
    box.replaceChildren();
    d.preguntas.forEach((text, i) => {
      const t = el("textarea", { rows: "2", maxlength: String(LIMITS.texto), autocapitalize: "off", autocorrect: "off", spellcheck: "false", "aria-label": "Pregunta " + (i + 1), "data-i": String(i) });
      t.value = text;
      t.addEventListener("input", () => { d.preguntas[i] = t.value; E.dirty = true; grow(t); });
      const tools = el("div", { class: "qtools" },
        el("button", { "data-qa": "up", "data-i": String(i), "aria-label": "Subir" }, "↑"),
        el("button", { "data-qa": "down", "data-i": String(i), "aria-label": "Bajar" }, "↓"),
        el("button", { "data-qa": "del", "data-i": String(i), class: "danger" }, "Eliminar"));
      if (i === 0) tools.firstChild.disabled = true;
      if (i === d.preguntas.length - 1) tools.children[1].disabled = true;
      box.append(el("div", { class: "qrow" }, t, tools));
      requestAnimationFrame(() => grow(t));
    });
    $("mc-del").hidden = !lib.categorias.some((x) => x.id === d.id);
    if (focusLast) {
      const all = box.querySelectorAll("textarea");
      const last = all[all.length - 1];
      if (last) { last.focus(); last.scrollIntoView({ block: "center" }); }
    }
  }

  function readHeader() {
    E.draft.nombre = $("mc-name").value;
    E.draft.padre = $("mc-parent").value || null;
  }

  function persist(lib) {
    if (store(lib)) return true;
    tell("No se pudo guardar en este dispositivo. Revisa que Safari permita guardar datos del sitio.");
    return false;
  }

  function saveCat() {
    readHeader();
    const nombre = E.draft.nombre.trim();
    if (!nombre) { tell("Escribe un nombre para la categoría."); return; }
    const cat = {
      id: E.draft.id,
      nombre,
      padre: E.draft.padre,
      preguntas: E.draft.preguntas.map((s) => s.trim()).filter(Boolean),
    };
    const lib = load();
    const i = lib.categorias.findIndex((x) => x.id === cat.id);
    if (i >= 0) lib.categorias[i] = cat; else lib.categorias.push(cat);
    if (!persist(lib)) return;
    E.draft = { id: cat.id, nombre, padre: cat.padre, preguntas: cat.preguntas.slice() };
    E.dirty = false;
    renderCat();
    const b = $("mc-save");
    b.textContent = "Guardado ✓";
    clearTimeout(E.saving);
    E.saving = setTimeout(() => { b.textContent = "Guardar"; }, 1600);
  }

  async function backFromCat() {
    if (E.dirty && !(await ask("Hay cambios sin guardar. ¿Descartarlos?", "Descartar"))) return;
    E.dirty = false;
    openList();
  }

  async function deleteCat() {
    const lib = load();
    const c = lib.categorias.find((x) => x.id === E.draft.id);
    if (!c) return;
    const msg = "¿Eliminar la categoría «" + c.nombre + "» y sus " + c.preguntas.length + " preguntas?";
    if (!(await ask(msg, "Eliminar"))) return;
    lib.categorias = lib.categorias.filter((x) => x.id !== c.id);
    lib.categorias.forEach((x) => { if (x.padre === c.id) x.padre = null; });
    if (!persist(lib)) return;
    E.dirty = false;
    openList();
  }

  async function questionAction(a, i) {
    const qs = E.draft.preguntas;
    if (a === "up" && i > 0) { [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]]; }
    else if (a === "down" && i < qs.length - 1) { [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]]; }
    else if (a === "del") {
      if (!(await ask("¿Eliminar esta pregunta?", "Eliminar"))) return;
      qs.splice(i, 1);
    } else return;
    E.dirty = true;
    readHeader();
    renderCat();
  }

  /* ---------- Respaldo ---------- */
  async function exportBackup() {
    const lib = load();
    const text = serialize(lib);
    const name = "reset-preguntas-respaldo-" + new Date().toISOString().slice(0, 10) + ".json";
    try {
      const file = new File([text], name, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Respaldo de RESET" });
        return;
      }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = el("a", { href: url, download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (_) { tell("No se pudo exportar el respaldo en este dispositivo."); }
  }

  function readFile(file) {
    if (file.text) return file.text();
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
  }

  async function importBackup(file) {
    if (!file) return;
    if (file.size > LIMITS.archivo) { tell("El archivo es demasiado grande para ser un respaldo de RESET."); return; }
    let data;
    try { data = JSON.parse(await readFile(file)); }
    catch (_) { tell("No se pudo leer el archivo. No es un JSON válido."); return; }
    const r = validate(data);
    if (r.error) { tell(r.error); return; }
    const next = counts(r.lib);
    const cur = counts(load());
    if (cur.cats || cur.qs) {
      const msg = "Esto reemplazará tu biblioteca actual (" + cur.cats + " categorías, " + cur.qs + " preguntas) por la del archivo (" + next.cats + " categorías, " + next.qs + " preguntas). ¿Continuar?";
      if (!(await ask(msg, "Reemplazar"))) return;
    }
    if (!persist(r.lib)) return;
    renderList();
    tell("Listo: " + next.cats + " categorías y " + next.qs + " preguntas importadas.");
  }

  /* ---------- Eventos ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-mp],button[data-qa]");
      if (!b || !b.closest(".screen.on") || b.disabled) return;
      if (b.dataset.qa) { questionAction(b.dataset.qa, Number(b.dataset.i)); return; }
      switch (b.dataset.mp) {
        case "open": openCat(b.dataset.id); break;
        case "newcat": openCat(null); break;
        case "list": openList(); break;
        case "back": backFromCat(); break;
        case "addq":
          if (E.draft.preguntas.length >= LIMITS.preguntas) { tell("Llegaste al máximo de preguntas por categoría."); break; }
          readHeader();
          E.draft.preguntas.push("");
          E.dirty = true;
          renderCat(true);
          break;
        case "save": saveCat(); break;
        case "delcat": deleteCat(); break;
        case "export": exportBackup(); break;
        case "import": $("imp-file").click(); break;
      }
    });
    $("mc-name").addEventListener("input", () => { E.dirty = true; });
    $("mc-parent").addEventListener("change", () => { E.dirty = true; });
    $("imp-file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      importBackup(f);
    });
  }

  function init(ctx) {
    E.ctx = ctx;
    bind();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) {}
  }

  return {
    init, openList, visible,
    // expuestos para pruebas y mantenimiento
    _validate: validate, _load: load, _serialize: serialize,
  };
})();
