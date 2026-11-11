#!/usr/bin/env node
// Pruebas automáticas del paquete BCDD. Sin dependencias: node tests/run.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL = path.join(ROOT, "install.mjs");
const SKILL = path.join(ROOT, "skills", "bcdd");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "bcdd-test-"));
const HOME = path.join(TMP, "home");
fs.mkdirSync(HOME);
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log(`✔ ${name}`); }
  catch (e) { fail++; console.log(`✖ ${name}\n    ${String(e.message).split("\n").join("\n    ")}`); }
};
const eq = (a, b, m = "") => { if (a !== b) throw new Error(`${m} esperado ${JSON.stringify(b)}, obtuve ${JSON.stringify(a)}`); };
const yes = (c, m) => { if (!c) throw new Error(m); };
const baseEnv = () => {
  // En Windows la variable puede llamarse "Path": se deja una sola, "PATH".
  const e = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== "PATH"));
  return { ...e, PATH: process.env.PATH };
};
const run = (args, env = {}) => {
  const r = spawnSync(process.execPath, [INSTALL, ...args], { encoding: "utf8", env: { ...baseEnv(), HOME, USERPROFILE: HOME, BCDD_REPO: "", BCDD_UPDATE_URL: "", ...env } });
  return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") };
};
const proj = (name, files = {}) => {
  const d = path.join(TMP, name);
  fs.mkdirSync(d, { recursive: true });
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(d, f), c);
  return d;
};
const read = (p) => fs.readFileSync(p, "utf8");
const count = (s, sub) => s.split(sub).length - 1;

// ---------- Skill ----------
t("SKILL.md: frontmatter válido según Agent Skills y la guía de gentle-shell", () => {
  const s = read(path.join(SKILL, "SKILL.md"));
  const fm = s.split("---")[1];
  eq((fm.match(/^name:\s*(.+)$/m) ?? [])[1], "bcdd", "name");
  const desc = (fm.match(/^description:\s*"(.*)"\s*$/m) ?? [])[1];
  yes(desc, "description tiene que estar en una sola línea y entre comillas");
  yes(desc.length <= 1024, `description de ${desc.length} caracteres`);
  yes(desc.startsWith("Trigger:"), 'description tiene que empezar con "Trigger:"');
  yes(/^license:\s*\S+/m.test(fm), "falta license");
  yes(/author:\s*\S+/.test(fm) && /version:\s*"[\d.]+"/.test(fm), "falta metadata.author o metadata.version");
  eq((fm.match(/version:\s*"([\d.]+)"/) ?? [])[1], VERSION, "versión de SKILL.md vs package.json");
  for (const h of ["Activation Contract", "Hard Rules", "Decision Gates", "Execution Steps", "Output Contract", "References"]) yes(s.includes(`## ${h}`), `falta la sección ${h}`);
  yes(s.split("\n").length < 500, "más de 500 líneas");
});
t("SKILL.md: todas las rutas que menciona existen", () => {
  const s = read(path.join(SKILL, "SKILL.md"));
  for (const m of s.matchAll(/`((?:references|assets|scripts)\/[\w.-]+)`/g)) yes(fs.existsSync(path.join(SKILL, m[1])), `no existe ${m[1]}`);
});
t("Textos en español con tildes (UTF-8)", () => {
  for (const f of ["SKILL.md", "references/modos.md", "references/redaccion.md", "assets/plantilla-contrato.md", "assets/ejemplo-contrato.md", "assets/mensaje-cliente.md"]) {
    const s = read(path.join(SKILL, f));
    yes((s.match(/[áéíóúñ]/g) ?? []).length > 5, `${f} parece no tener tildes`);
    yes(!/Ã[¡©­³º±]/.test(s), `${f} tiene caracteres rotos`);
  }
});

// ---------- Lint ----------
const { lintContract } = await import(pathToFileURL(path.join(SKILL, "scripts", "lint.mjs")).href);
const example = read(path.join(SKILL, "assets", "ejemplo-contrato.md"));
t("lint: el contrato de ejemplo pasa sin errores ni advertencias", () => {
  const r = lintContract(example);
  eq(r.errors.length, 0, r.errors.join(" | "));
  eq(r.warnings.length, 0, r.warnings.join(" | "));
});
t("lint: los contratos esperados de las pruebas pasan sin errores", () => {
  for (const f of ["esperado-v1.md", "esperado-v2.md"]) {
    const r = lintContract(read(path.join(ROOT, "tests", "fixtures", f)));
    eq(r.errors.length, 0, `${f}: ${r.errors.join(" | ")}`);
  }
});
const breaks = [
  ["regla referenciada que no existe", (s) => s.replace("| RN-04 | docs", "| RN-99 | docs"), /RN-99/],
  ["estado de requisito inválido", (s) => s.replace("| Acordado | Sin cambios | Un vendedor", "| En curso | Sin cambios | Un vendedor"), /estado "En curso"/],
  ["falta Listo cuando", (s) => s.replace("Al elegir un producto se ve la cantidad disponible en ese momento", "—"), /REQ-02: falta "Listo cuando"/],
  ["ID repetido", (s) => s.replace("| RN-03 | Si el encargado", "| RN-02 | Si el encargado"), /repetido: RN-02/],
  ["regla sin fuente", (s) => s.replace("| A confirmar | equipo |\n| RN-07", "| A confirmar | — |\n| RN-07"), /RN-06: falta la fuente/],
  ["aprobado sin responsable", (s) => s.replace("estado: borrador", "estado: aprobado"), /aprobado_equipo/],
  ["sin diagrama", (s) => s.replace("```mermaid", "```text"), /Mermaid/],
  ["falta la sección 7", (s) => s.replace("## 7. Para quien construye", "## Para quien construye"), /sección 7/],
  ["versión sin entrada en Cambios", (s) => s.replace("version: 2", "version: 3"), /versión 3/],
];
for (const [name, mut, re] of breaks)
  t(`lint detecta: ${name}`, () => {
    const mutated = mut(example);
    yes(mutated !== example, "la mutación de prueba no cambió nada");
    yes(lintContract(mutated).errors.some((e) => re.test(e)), "no lo detectó");
  });
t("lint advierte jerga técnica y criterios no comprobables", () => {
  const r = lintContract(example.replace("llega directo al depósito.", "llega directo al depósito por la API del backend.").replace("Un vendedor arma y envía un pedido completo sin llamar al depósito", "Funciona bien"));
  yes(r.warnings.some((w) => /jerga/.test(w) && /api/.test(w)), "no advirtió jerga");
  yes(r.warnings.some((w) => /no es comprobable/.test(w)), "no advirtió el criterio vago");
});

// ---------- Exportar ----------
t("exportar: genera la versión para el cliente sin rutas internas", () => {
  const out = path.join(TMP, "cliente.html");
  const r = spawnSync(process.execPath, [path.join(SKILL, "scripts", "exportar.mjs"), path.join(SKILL, "assets", "ejemplo-contrato.md"), "--out", out], { encoding: "utf8" });
  eq(r.status, 0, r.stderr);
  const h = read(out);
  yes(h.includes("Pedidos Distribuidora Norte") && h.includes("RN-02") && h.includes("class=\"steps\""), "falta contenido");
  yes(!h.includes("docs/reuniones") && !h.includes("Para quien construye") && !h.includes("Descartado"), "filtró contenido interno");
});

// ---------- Instalador ----------
t("install: copia la skill a ambas carpetas con manifiesto y no toca AGENTS.md", () => {
  const d = proj("p1", { "AGENTS.md": "# A\n" });
  const r = run(["--dir", d]);
  eq(r.code, 0, r.out);
  for (const k of [".claude", ".agents"]) {
    yes(fs.existsSync(path.join(d, k, "skills", "bcdd", "SKILL.md")), `falta en ${k}`);
    eq(JSON.parse(read(path.join(d, k, "skills", "bcdd", ".bcdd-manifest.json"))).version, VERSION);
  }
  eq(read(path.join(d, "AGENTS.md")), "# A\n", "AGENTS.md");
});
const originals = { "sin salto final": "# A\n\nnotas", "con salto final": "# A\n\nnotas\n", "CRLF": "# A\r\n\r\nnotas\r\n", "CRLF sin salto final": "# A\r\nnotas", "líneas vacías al final": "# A\n\n\n" };
for (const [name, content] of Object.entries(originals))
  t(`regla: se agrega una sola vez y al desinstalar AGENTS.md queda idéntico (${name})`, () => {
    const d = proj(`rule-${name.replace(/\W+/g, "-")}`, { "AGENTS.md": content });
    run(["--dir", d, "--with-rule"]); run(["--dir", d, "--with-rule"]); run(["--dir", d]);
    eq(count(read(path.join(d, "AGENTS.md")), "<!-- bcdd:start"), 1, "bloques");
    eq(run(["--dir", d, "uninstall"]).code, 0);
    eq(read(path.join(d, "AGENTS.md")), content, "contenido");
    yes(!fs.existsSync(path.join(d, ".claude")) && !fs.existsSync(path.join(d, ".agents")), "quedaron carpetas vacías");
  });
t("regla: la reinstalación la conserva sin repetir --with-rule, y --no-rule la quita", () => {
  const d = proj("keep", { "AGENTS.md": "# A\n" });
  run(["--dir", d, "--with-rule"]); run(["--dir", d]);
  eq(count(read(path.join(d, "AGENTS.md")), "<!-- bcdd:start"), 1);
  run(["--dir", d, "--no-rule"]);
  eq(read(path.join(d, "AGENTS.md")), "# A\n");
});
t("regla: proyecto que solo usa CLAUDE.md no recibe un AGENTS.md", () => {
  const d = proj("claude-only", { "CLAUDE.md": "# C\n" });
  run(["--dir", d, "--with-rule"]);
  yes(!fs.existsSync(path.join(d, "AGENTS.md")), "creó AGENTS.md");
  yes(read(path.join(d, "CLAUDE.md")).includes("<!-- bcdd:start"), "no escribió en CLAUDE.md");
});
t("regla: si CLAUDE.md importa AGENTS.md, escribe solo en AGENTS.md", () => {
  const d = proj("import", { "CLAUDE.md": "@AGENTS.md\n", "AGENTS.md": "# A\n" });
  run(["--dir", d, "--with-rule"]);
  eq(read(path.join(d, "CLAUDE.md")), "@AGENTS.md\n");
  yes(read(path.join(d, "AGENTS.md")).includes("<!-- bcdd:start"), "no escribió en AGENTS.md");
});
t("regla: texto agregado por el usuario después del bloque se conserva", () => {
  const d = proj("after", { "AGENTS.md": "# A\n" });
  run(["--dir", d, "--with-rule"]);
  fs.appendFileSync(path.join(d, "AGENTS.md"), "\n## Mío\ntexto\n");
  run(["--dir", d, "uninstall"]);
  eq(read(path.join(d, "AGENTS.md")), "# A\n\n## Mío\ntexto\n");
});
t("regla: un bloque dañado no se duplica; se avisa y no se modifica el archivo", () => {
  const d = proj("broken", { "AGENTS.md": "# A\n" });
  run(["--dir", d, "--with-rule"]);
  const f = path.join(d, "AGENTS.md");
  fs.writeFileSync(f, read(f).replace("<!-- bcdd:end -->\n", ""));
  const before = read(f);
  const r = run(["--dir", d, "--with-rule"]);
  eq(r.code, 1); yes(/dañado/.test(r.out), r.out);
  eq(read(f), before);
  const doc = run(["--dir", d, "doctor", "--offline"]);
  eq(doc.code, 1); yes(/dañado/.test(doc.out), doc.out);
});
t("install: una skill modificada a mano no se pisa sin --force", () => {
  const d = proj("custom");
  run(["--dir", d]);
  const f = path.join(d, ".claude", "skills", "bcdd", "assets", "plantilla-contrato.md");
  fs.appendFileSync(f, "MI CAMBIO\n");
  const r = run(["--dir", d]);
  eq(r.code, 1); yes(/modificada a mano/.test(r.out), r.out);
  yes(read(f).includes("MI CAMBIO"), "pisó el cambio");
  const r2 = run(["--dir", d, "--force"]);
  eq(r2.code, 0, r2.out); yes(/copia de la versión anterior/.test(r2.out), "no avisó de la copia");
  yes(!read(f).includes("MI CAMBIO"), "no sobrescribió con --force");
});
t("install: opciones mal escritas se rechazan", () => {
  const d = proj("typo");
  const r = run(["--dir", d, "--with-rules"]);
  eq(r.code, 1); yes(/Opción desconocida: --with-rules/.test(r.out), r.out);
  yes(!fs.existsSync(path.join(d, ".claude")), "instaló igual");
  eq(run(["--dir", d, "--target", "todo"]).code, 1);
  eq(run(["instal"]).code, 1);
});
t("install --global: instala en el home y no en el proyecto", () => {
  const r = run(["--global"]);
  eq(r.code, 0, r.out);
  yes(fs.existsSync(path.join(HOME, ".claude", "skills", "bcdd", "SKILL.md")) && fs.existsSync(path.join(HOME, ".agents", "skills", "bcdd", "SKILL.md")), "no instaló en home");
  run(["--global", "uninstall"]);
  yes(!fs.existsSync(path.join(HOME, ".claude", "skills", "bcdd")), "no desinstaló");
});

// ---------- Registro de gentle-ai ----------
// gentle-ai falso: anota cada llamada en GA_LOG y lista "bcdd".
const gaBin = path.join(TMP, "ga-bin");
fs.mkdirSync(gaBin);
if (process.platform === "win32") fs.writeFileSync(path.join(gaBin, "gentle-ai.cmd"), '@echo %* >> "%GA_LOG%"\r\n@echo bcdd\r\n');
else fs.writeFileSync(path.join(gaBin, "gentle-ai"), '#!/bin/sh\necho "$@" >> "$GA_LOG"\necho bcdd\n', { mode: 0o755 });
const runGA = (args, log) => run(args, { PATH: gaBin + path.delimiter + process.env.PATH, GA_LOG: log });
const gaCalls = (log) => (fs.existsSync(log) ? read(log).trim().split(/\r?\n/).map((l) => l.trim()) : []);
t("registro: en un proyecto sin .atl/ no llama a gentle-ai ni crea archivos", () => {
  const d = proj("ga-none"), log = path.join(TMP, "ga-none.log");
  eq(runGA(["--dir", d], log).code, 0);
  eq(runGA(["--dir", d, "uninstall"], log).code, 0);
  eq(gaCalls(log).join(" | "), "", "llamadas a gentle-ai");
  eq(fs.readdirSync(d).join(", "), "", "archivos que quedaron en el proyecto");
  const doc = (runGA(["--dir", d], log), runGA(["--dir", d, "doctor", "--offline"], log));
  eq(doc.code, 0, doc.out); yes(!/registro/.test(doc.out), doc.out);
  eq(gaCalls(log).join(" | "), "", "llamadas del doctor");
});
t("registro: en un proyecto con .atl/ lo actualiza y el doctor lo revisa, sin avisos de Node", () => {
  const d = proj("ga-atl"), log = path.join(TMP, "ga-atl.log");
  fs.mkdirSync(path.join(d, ".atl"));
  const r = runGA(["--dir", d], log);
  eq(r.code, 0, r.out); yes(/registro de skills de gentle-ai actualizado/.test(r.out), r.out);
  const doc = runGA(["--dir", d, "doctor", "--offline"], log);
  eq(doc.code, 0, doc.out); yes(/bcdd figura en el registro/.test(doc.out), doc.out);
  eq(gaCalls(log).join(" | "), "skill-registry refresh | skill-registry list", "llamadas a gentle-ai");
  yes(!/DeprecationWarning|DEP0190/.test(r.out + doc.out), r.out + doc.out);
});

// ---------- Doctor ----------
t("doctor: instalación parcial (--target claude) no da falsa alarma", () => {
  const d = proj("one");
  run(["--dir", d, "--target", "claude"]);
  const r = run(["--dir", d, "doctor", "--offline"]);
  eq(r.code, 0, r.out); yes(/íntegra en .claude/.test(r.out) && !/\.agents/.test(r.out), r.out);
});
t("doctor: detecta archivos alterados, faltantes y regla desaparecida", () => {
  const d = proj("doc", { "AGENTS.md": "# A\n" });
  run(["--dir", d, "--with-rule"]);
  fs.appendFileSync(path.join(d, ".claude", "skills", "bcdd", "SKILL.md"), "x");
  fs.rmSync(path.join(d, ".agents", "skills", "bcdd", "scripts", "lint.mjs"));
  fs.writeFileSync(path.join(d, "AGENTS.md"), "# A regenerado por otra herramienta\n");
  const r = run(["--dir", d, "doctor", "--offline"]);
  eq(r.code, 1);
  yes(/modificada localmente \(SKILL\.md\)/.test(r.out), "no vio la modificación\n" + r.out);
  yes(/faltan archivos \(scripts\/lint\.mjs\)/.test(r.out), "no vio el faltante\n" + r.out);
  yes(/ya no está en AGENTS\.md/.test(r.out), "no vio la regla perdida\n" + r.out);
});
t("doctor: valida los contratos del proyecto e ignora el ejemplo de la skill", () => {
  const d = proj("contracts");
  fs.mkdirSync(path.join(d, "bcdd"));
  fs.writeFileSync(path.join(d, "bcdd", "contrato.md"), example);
  run(["--dir", d]);
  const r = run(["--dir", d, "doctor", "--offline"]);
  eq(r.code, 0, r.out);
  eq(count(r.out, "contrato "), 1, "cantidad de contratos detectados");
  fs.writeFileSync(path.join(d, "bcdd", "contrato.md"), example.replace("| RN-04 | docs", "| RN-99 | docs"));
  eq(run(["--dir", d, "doctor", "--offline"]).code, 1);
});
t("doctor: avisa cuando el repo tiene una versión más nueva, y cuando está al día", () => {
  const d = proj("remote");
  run(["--dir", d]);
  const newer = path.join(TMP, "remote-new.json"), same = path.join(TMP, "remote-same.json");
  fs.writeFileSync(newer, JSON.stringify({ version: "9.9.9" }));
  fs.writeFileSync(same, JSON.stringify({ version: VERSION }));
  const a = run(["--dir", d, "doctor"], { BCDD_UPDATE_URL: pathToFileURL(newer).href });
  yes(/versión nueva: 9\.9\.9/.test(a.out) && /curl -fsSL/.test(a.out) && /irm /.test(a.out), a.out);
  const b = run(["--dir", d, "doctor"], { BCDD_UPDATE_URL: pathToFileURL(same).href });
  yes(/al día con el repo/.test(b.out), b.out); eq(b.code, 0);
  const c = run(["--dir", d, "doctor", "--offline"]);
  yes(/Chequeo de versión omitido/.test(c.out), c.out); eq(c.code, 0);
});
t("doctor incluido en la skill funciona sin el paquete de instalación", () => {
  const d = proj("standalone");
  run(["--dir", d]);
  const r = spawnSync(process.execPath, [path.join(d, ".agents", "skills", "bcdd", "scripts", "doctor.mjs"), "--dir", d, "--offline"], { encoding: "utf8", env: { ...process.env, HOME, USERPROFILE: HOME } });
  eq(r.status, 0, r.stdout + r.stderr);
});

// ---------- Instalación en un comando (sh) ----------
const hasSh = process.platform !== "win32" && ["sh", "tar", "curl"].every((b) => spawnSync("sh", ["-c", `command -v ${b}`]).status === 0);
if (hasSh) {
  const tgz = path.join(TMP, "pkg.tar.gz");
  spawnSync("tar", ["-czf", tgz, "--exclude=.git", "--transform", "s,^[^/]*,bcdd-main,", "-C", path.dirname(ROOT), path.basename(ROOT)]);
  const boot = (cwd, args = [], env = {}) => {
    const r = spawnSync("sh", ["-s", "--", ...args], { cwd, input: read(path.join(ROOT, "scripts", "install.sh")), encoding: "utf8", env: { ...process.env, HOME, BCDD_REPO: "", BCDD_UPDATE_URL: "", BCDD_TARBALL_URL: pathToFileURL(tgz).href, BCDD_HOME: path.join(TMP, "bhome"), ...env } });
    return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") };
  };
  t("curl | sh: descarga, instala y deja el paquete en BCDD_HOME", () => {
    const d = proj("boot");
    const r = boot(d, ["--with-rule"]);
    eq(r.code, 0, r.out);
    yes(fs.existsSync(path.join(d, ".agents", "skills", "bcdd", ".bcdd-manifest.json")) && fs.existsSync(path.join(TMP, "bhome", "pkg", "install.mjs")), "no instaló");
    yes(read(path.join(d, "AGENTS.md")).includes("<!-- bcdd:start"), "no pasó las opciones");
    eq(boot(d, ["doctor", "--offline"]).code, 0, "doctor por el mismo comando");
  });
  t("curl | sh: no deja archivos temporales al pasarle el control a Node", () => {
    const tmpdir = path.join(TMP, "sh-tmp"); fs.mkdirSync(tmpdir);
    const r = boot(proj("boot-tmp"), [], { TMPDIR: tmpdir });
    eq(r.code, 0, r.out);
    eq(fs.readdirSync(tmpdir).join(", "), "", "quedó en el temporal");
  });
  t("curl | sh: sin repo configurado o con descarga inválida, falla con mensaje claro", () => {
    const a = boot(proj("boot-norepo"), [], { BCDD_TARBALL_URL: "", BCDD_REPO: "__BCDD_REPO__" });
    eq(a.code, 1); yes(/no está configurado/.test(a.out), a.out);
    const bad = path.join(TMP, "bad.tar.gz"); fs.writeFileSync(bad, "basura");
    const b = boot(proj("boot-bad"), [], { BCDD_TARBALL_URL: pathToFileURL(bad).href });
    eq(b.code, 1); yes(/no es válido/.test(b.out), b.out);
  });
  t("curl | sh: sin Node instala la skill en modo básico y rechaza doctor", () => {
    const bin = path.join(TMP, "bin"); fs.mkdirSync(bin);
    for (const b of ["sh", "tar", "gzip", "curl", "mktemp", "rm", "mkdir", "mv", "cp", "pwd"]) {
      const w = spawnSync("sh", ["-c", `command -v ${b}`], { encoding: "utf8" }).stdout.trim();
      if (w) fs.symlinkSync(w, path.join(bin, b));
    }
    const d = proj("boot-nonode");
    const r = boot(d, [], { PATH: bin });
    eq(r.code, 0, r.out); yes(/instalación básica/.test(r.out), r.out);
    yes(fs.existsSync(path.join(d, ".claude", "skills", "bcdd", "SKILL.md")), "no copió la skill");
    const x = boot(d, ["doctor"], { PATH: bin });
    eq(x.code, 1); yes(/necesita Node/.test(x.out), x.out);
  });
}
t("set-repo: configura el repo en scripts, README y package.json, y se puede repetir", () => {
  const copy = path.join(TMP, "copy");
  fs.cpSync(ROOT, copy, { recursive: true, filter: (s) => !s.includes(`${path.sep}.git`) });
  const sr = (repo) => spawnSync(process.execPath, [path.join(copy, "install.mjs"), "set-repo", repo], { encoding: "utf8" });
  eq(sr("uno/bcdd").status, 0); eq(sr("dos/bcdd").status, 0);
  for (const f of ["scripts/install.sh", "scripts/install.ps1", "README.md", "package.json"]) {
    const s = read(path.join(copy, f));
    yes(s.includes("dos/bcdd") && !s.includes("uno/bcdd") && !s.includes("__BCDD_REPO__"), `${f} quedó mal`);
  }
  eq(sr("sin-barra").status, 1);
});

// ---------- Update ----------
t("update: reinstala solo donde ya estaba y con la regla que tenía", () => {
  const d = proj("upd", { "AGENTS.md": "# A\n" });
  run(["--dir", d, "--target", "agents", "--with-rule"]);
  const man = path.join(d, ".agents", "skills", "bcdd", ".bcdd-manifest.json");
  fs.writeFileSync(man, read(man).replace(`"version": "${VERSION}"`, '"version": "0.1.0"'));
  const r = run(["--dir", d, "update", "--no-pull"]);
  eq(r.code, 0, r.out);
  yes(/actualizada \(0\.1\.0 → /.test(r.out), r.out);
  yes(!fs.existsSync(path.join(d, ".claude")), "instaló en una carpeta donde no estaba");
  eq(count(read(path.join(d, "AGENTS.md")), "<!-- bcdd:start"), 1, "regla");
});
t("update sin instalación previa avisa en vez de instalar", () => {
  const r = run(["--dir", proj("empty"), "update", "--no-pull"]);
  eq(r.code, 1); yes(/no está instalada/.test(r.out), r.out);
});
t("migración desde 0.1 (sin manifiesto): actualiza y guarda copia", () => {
  const d = proj("legacy");
  fs.mkdirSync(path.join(d, ".claude", "skills", "bcdd"), { recursive: true });
  fs.writeFileSync(path.join(d, ".claude", "skills", "bcdd", "SKILL.md"), '---\nname: bcdd\ndescription: x\nmetadata:\n  version: "0.1.0"\n---\n');
  const r = run(["--dir", d]);
  eq(r.code, 0, r.out); yes(/copia de la versión anterior/.test(r.out), r.out);
  yes(fs.existsSync(path.join(d, ".claude", "skills", "bcdd", ".bcdd-manifest.json")), "sin manifiesto");
});

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} pruebas correctas, ${fail} fallidas.`);
process.exit(fail ? 1 : 0);
