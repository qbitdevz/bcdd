#!/usr/bin/env node
// BCDD — instalador. Sin dependencias. Node 18+.
//
//   node install.mjs [install]     instala o actualiza la skill en el proyecto actual
//   node install.mjs update        trae la última versión del repo y reinstala donde ya estaba
//   node install.mjs doctor        revisa instalación, regla, contratos y versión disponible
//   node install.mjs uninstall     quita la skill y la regla; no toca contratos ni fuentes
//   node install.mjs lint <archivo>  valida un contrato
//   node install.mjs set-repo usuario/repo   (mantenedor) configura el repo en scripts, README y package.json
//
// Opciones:
//   --with-rule     agrega la regla BCDD a AGENTS.md / CLAUDE.md (bloque delimitado y removible)
//   --no-rule       quita esa regla
//   --global        instala para todos los proyectos del usuario
//   --target <t>    claude | agents | both (por defecto both)
//   --dir <ruta>    proyecto destino (por defecto, el directorio actual)
//   --force         sobrescribe una skill modificada a mano (guarda una copia antes)
//   --offline       no consulta el repo
//   --no-pull       en update, no ejecuta git pull
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_SRC = path.join(HERE, "skills", "bcdd");
const RULE_SRC = path.join(HERE, "snippets", "agents-rule.md");
const PKG = JSON.parse(fs.readFileSync(path.join(HERE, "package.json"), "utf8"));
const VERSION = PKG.version;
const doc = await import(pathToFileURL(path.join(SKILL_SRC, "scripts", "doctor.mjs")).href);
const { MANIFEST, START_PREFIX, END, sha, hashDir, readManifest, diffInstall, ruleState, runDoctor } = doc;

const COMMANDS = ["install", "update", "doctor", "check", "uninstall", "lint", "set-repo", "help"];
const BOOL = ["--with-rule", "--no-rule", "--global", "--force", "--offline", "--no-pull", "--help", "-h"];
const VALUE = ["--target", "--dir"];

class Friendly extends Error {}
const ok = (m) => console.log(`✔ ${m}`);
const info = (m) => console.log(`  ${m}`);
const warn = (m) => console.log(`! ${m}`);

function parseArgs(argv) {
  const o = { cmd: null, flags: new Set(), values: {}, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (BOOL.includes(a)) o.flags.add(a);
    else if (VALUE.includes(a)) {
      if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Friendly(`La opción ${a} necesita un valor.`);
      o.values[a] = argv[++i];
    } else if (a.startsWith("-")) throw new Friendly(`Opción desconocida: ${a}. Probá "node install.mjs help".`);
    else if (!o.cmd && COMMANDS.includes(a)) o.cmd = a;
    else if (o.cmd === "lint" || o.cmd === "set-repo") o.rest.push(a);
    else throw new Friendly(`Comando desconocido: ${a}. Comandos: install, update, doctor, uninstall, lint.`);
  }
  o.cmd ??= "install";
  if (o.cmd === "check") o.cmd = "doctor";
  return o;
}

function context(o) {
  const isGlobal = o.flags.has("--global");
  const base = isGlobal ? os.homedir() : path.resolve(o.values["--dir"] ?? process.cwd());
  const target = o.values["--target"] ?? "both";
  if (!["claude", "agents", "both"].includes(target)) throw new Friendly(`--target inválido: ${target} (claude | agents | both).`);
  if (!isGlobal && !fs.existsSync(base)) throw new Friendly(`No existe el directorio ${base}.`);
  const all = { claude: path.join(base, ".claude", "skills", "bcdd"), agents: path.join(base, ".agents", "skills", "bcdd") };
  const dirs = target === "both" ? [all.claude, all.agents] : [all[target]];
  const rel = (p) => (isGlobal ? p.replace(os.homedir(), "~") : path.relative(base, p) || ".");
  return { isGlobal, base, target, dirs, all, rel };
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---------- Regla en AGENTS.md / CLAUDE.md: solo se escribe entre los marcadores bcdd ----------
const ruleText = () => fs.readFileSync(RULE_SRC, "utf8").replace(/\r\n/g, "\n").trim();
function ruleFiles(base) {
  const agents = path.join(base, "AGENTS.md"), claude = path.join(base, "CLAUDE.md");
  const files = [];
  if (fs.existsSync(agents)) files.push(agents);
  if (fs.existsSync(claude)) {
    const st = fs.lstatSync(claude);
    // Si CLAUDE.md enlaza o importa AGENTS.md, alcanza con AGENTS.md.
    const independent = !st.isSymbolicLink() && !/@AGENTS\.md/.test(fs.readFileSync(claude, "utf8"));
    if (independent) files.push(claude);
    else if (!files.length) files.push(agents);
  }
  if (!files.length) files.push(agents); // ninguno existe: se crea AGENTS.md
  return files;
}
function stripBlock(txt) {
  const a = txt.indexOf(START_PREFIX), b = txt.indexOf(END);
  if (a < 0 || b < a) return null;
  const eof = txt.slice(a, txt.indexOf("-->", a)).includes("eof");
  let before = txt.slice(0, a), after = txt.slice(b + END.length);
  if (after.startsWith("\n")) after = after.slice(1);
  const cut = eof ? "\n\n" : "\n";
  if (before.endsWith(cut)) before = before.slice(0, -cut.length);
  return before + after;
}
function writeRule(file, rel) {
  const st = ruleState(file);
  if (st.state === "dañada")
    throw new Friendly(`${rel(file)} tiene un bloque BCDD dañado (${st.starts} inicio, ${st.ends} cierre). Borrá a mano lo que quede entre los marcadores "bcdd" y volvé a correr el instalador. No modifiqué el archivo.`);
  const exists = fs.existsSync(file);
  const raw = exists ? fs.readFileSync(file, "utf8") : "";
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  let txt = raw.replace(/\r\n/g, "\n");
  const had = st.state === "presente";
  if (had) txt = stripBlock(txt);
  const eof = txt.length > 0 && !txt.endsWith("\n");
  const start = eof ? "<!-- bcdd:start eof -->" : "<!-- bcdd:start -->";
  const sep = txt.length === 0 ? "" : eof ? "\n\n" : "\n";
  fs.writeFileSync(file, (txt + sep + `${start}\n${ruleText()}\n${END}\n`).replace(/\n/g, eol));
  ok(`${!exists ? "creado" : had ? "regla actualizada en" : "regla agregada al final de"} ${rel(file)}`);
}
function removeRule(file, rel) {
  if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink()) return;
  const st = ruleState(file);
  if (st.state === "dañada") return warn(`${rel(file)}: bloque BCDD dañado; quitalo a mano.`);
  if (st.state !== "presente") return;
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const out = stripBlock(raw.replace(/\r\n/g, "\n"));
  if (out.trim() === "") { fs.rmSync(file); ok(`eliminado ${rel(file)} (solo contenía la regla BCDD)`); }
  else { fs.writeFileSync(file, out.replace(/\n/g, eol)); ok(`regla quitada de ${rel(file)}`); }
}

function refreshRegistry(base) {
  const r = spawnSync("gentle-ai", ["skill-registry", "refresh"], { cwd: base, encoding: "utf8", shell: process.platform === "win32" });
  if (r.error || r.status !== 0) info("gentle-ai no detectado: no hay registro que actualizar.");
  else ok("registro de skills de gentle-ai actualizado");
}

// ---------- Comandos ----------
function install(o) {
  const c = context(o);
  if (!fs.existsSync(path.join(SKILL_SRC, "SKILL.md"))) throw new Friendly("No encuentro skills/bcdd/SKILL.md junto al instalador.");
  console.log(`BCDD ${VERSION} → ${c.isGlobal ? "usuario (global)" : c.base}\n`);
  const srcHashes = hashDir(SKILL_SRC);
  const prevRule = Object.values(c.all).some((d) => readManifest(d)?.rule);
  const rule = !c.isGlobal && !o.flags.has("--no-rule") && (o.flags.has("--with-rule") || prevRule);
  let blocked = 0;

  for (const dir of c.dirs) {
    let prev = null;
    if (fs.existsSync(dir)) {
      const d = diffInstall(dir);
      prev = d.manifest?.version ?? "anterior a 0.2";
      const touched = d.manifest ? [...d.modified, ...d.extra] : ["(sin manifiesto: no se puede saber si fue modificada)"];
      const identical = d.manifest && !touched.length && !d.missing.length;
      if (!identical && d.manifest && touched.length && !o.flags.has("--force")) {
        warn(`${c.rel(dir)} fue modificada a mano (${touched.join(", ")}). No la toqué.`);
        info('Para adaptar el formato sin editar la skill, usá "plantilla.md" junto a tu contrato.');
        info("Para sobrescribirla igual: agregá --force (guarda una copia antes).");
        blocked++;
        continue;
      }
      if (!identical && (touched.length || !d.manifest)) {
        const bak = path.join(os.tmpdir(), `bcdd-backup-${Date.now()}`, path.basename(path.dirname(path.dirname(dir))));
        copyDir(dir, bak);
        info(`copia de la versión anterior en ${bak}`);
      }
      fs.rmSync(dir, { recursive: true, force: true });
    }
    copyDir(SKILL_SRC, dir);
    const manifest = {
      name: "bcdd", version: VERSION, installedAt: new Date().toISOString(),
      repo: process.env.BCDD_REPO || PKG.bcdd?.repo || "", branch: PKG.bcdd?.branch || "main",
      source: HERE, scope: c.isGlobal ? "global" : "proyecto", rule, ruleHash: rule ? sha(ruleText()) : null, files: srcHashes,
    };
    fs.writeFileSync(path.join(dir, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
    ok(`skill ${prev ? (prev === VERSION ? `reinstalada (${VERSION})` : `actualizada (${prev} → ${VERSION})`) : `instalada (${VERSION})`} en ${c.rel(dir)}`);
  }

  if (!c.isGlobal) {
    if (rule) ruleFiles(c.base).forEach((f) => writeRule(f, c.rel));
    else if (o.flags.has("--no-rule")) ["AGENTS.md", "CLAUDE.md"].forEach((f) => removeRule(path.join(c.base, f), c.rel));
    refreshRegistry(c.base);
  } else if (o.flags.has("--with-rule")) warn("--with-rule se ignora con --global: la regla es por proyecto.");

  if (blocked) throw new Friendly(`\n${blocked} ubicación(es) sin actualizar por cambios locales.`);
  console.log(`\nListo. Reiniciá el agente y usá:
  Claude Code / OpenCode   /bcdd
  Pi / gentle-shell        /skill:bcdd
  Codex                    $bcdd
  …o pasale directamente la transcripción de una reunión.`);
  if (!rule && !c.isGlobal) console.log(`\nOpcional: --with-rule agrega 3 líneas a AGENTS.md para que el agente respete el contrato aunque no invoques la skill.`);
  console.log(`Para revisar la instalación en cualquier momento: node "${path.join(HERE, "install.mjs")}" doctor`);
}

function update(o) {
  const c = context(o);
  const isRepo = fs.existsSync(path.join(HERE, ".git"));
  if (isRepo && !o.flags.has("--no-pull") && !o.flags.has("--offline")) {
    const r = spawnSync("git", ["-C", HERE, "pull", "--ff-only"], { encoding: "utf8" });
    if (r.error || r.status !== 0) throw new Friendly(`No pude actualizar el repo (${(r.stderr || r.error?.message || "").trim().split("\n").pop()}). Revisá la conexión o corré "git pull" a mano en ${HERE}.`);
    ok(`repo actualizado: ${r.stdout.trim().split("\n").pop()}`);
  } else if (!isRepo) info("Reinstalo desde los archivos locales. Para traer la última versión, volvé a ejecutar el comando de instalación (curl o irm).");
  // Reinstala solo donde ya estaba, con las mismas opciones, usando el código recién traído.
  const scopes = [["proyecto", c.base, []], ["global", os.homedir(), ["--global"]]];
  let any = false;
  for (const [, base, extra] of scopes) {
    const has = { claude: fs.existsSync(path.join(base, ".claude", "skills", "bcdd", "SKILL.md")), agents: fs.existsSync(path.join(base, ".agents", "skills", "bcdd", "SKILL.md")) };
    if (!has.claude && !has.agents) continue;
    if (extra.length === 0 && base === os.homedir()) continue;
    any = true;
    const target = has.claude && has.agents ? "both" : has.claude ? "claude" : "agents";
    const args = [path.join(HERE, "install.mjs"), "install", "--target", target, ...extra];
    if (!extra.length) args.push("--dir", base);
    if (o.flags.has("--force")) args.push("--force");
    const r = spawnSync(process.execPath, args, { stdio: "inherit" });
    if (r.status !== 0) process.exitCode = 1;
  }
  if (!any) throw new Friendly('BCDD no está instalada acá ni a nivel global. Usá "node install.mjs" para instalarla.');
}

// Mantenedor: deja el repo configurado en todos los lugares que lo nombran.
function setRepo(o) {
  const repo = o.rest[0];
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) throw new Friendly("Uso: node install.mjs set-repo usuario/repo");
  const url = /(raw\.githubusercontent\.com\/)(?:__BCDD_REPO__|[\w.-]+\/[\w.-]+)(\/)/g;
  const edits = [
    ["package.json", /("bcdd":\s*\{\s*"repo":\s*")[^"]*(")/, `$1${repo}$2`],
    ["scripts/install.sh", /(REPO="\$\{BCDD_REPO:-)[^}]*(\}")/, `$1${repo}$2`],
    ["scripts/install.ps1", /(\$env:BCDD_REPO \} else \{ ')[^']*(' \})/, `$1${repo}$2`],
    ["README.md", null, null],
  ];
  for (const [f, re, to] of edits) {
    const p = path.join(HERE, f);
    let s = fs.readFileSync(p, "utf8");
    if (re) {
      if (!re.test(s)) throw new Friendly(`No encontré dónde configurar el repo en ${f}.`);
      s = s.replace(re, to);
    }
    fs.writeFileSync(p, s.replace(url, `$1${repo}$2`));
    ok(f);
  }
  console.log(`\nRepo configurado: ${repo}. Subí los cambios y el comando de instalación queda listo.`);
}

function uninstall(o) {
  const c = context(o);
  console.log(`BCDD uninstall → ${c.isGlobal ? "usuario (global)" : c.base}\n`);
  let n = 0;
  for (const dir of Object.values(c.all)) {
    if (!fs.existsSync(dir)) continue;
    fs.rmSync(dir, { recursive: true, force: true });
    n++;
    ok(`skill quitada de ${c.rel(dir)}`);
    for (const d of [path.dirname(dir), path.dirname(path.dirname(dir))]) {
      if (fs.existsSync(d) && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
      else break;
    }
  }
  if (!c.isGlobal) {
    ["AGENTS.md", "CLAUDE.md"].forEach((f) => removeRule(path.join(c.base, f), c.rel));
    if (n) refreshRegistry(c.base);
  }
  if (!n) info("No había ninguna instalación de BCDD.");
  console.log("\nTus contratos y tus fuentes no se tocaron.");
}

try {
  const o = parseArgs(process.argv.slice(2));
  if (o.cmd === "help" || o.flags.has("--help") || o.flags.has("-h")) {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n");
    console.log(src.slice(1, src.findIndex((l) => l.startsWith("import"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  } else if (o.cmd === "install") install(o);
  else if (o.cmd === "update") update(o);
  else if (o.cmd === "uninstall") uninstall(o);
  else if (o.cmd === "set-repo") setRepo(o);
  else if (o.cmd === "doctor") {
    const c = context(o);
    const res = await runDoctor({ base: c.base, offline: o.flags.has("--offline") });
    const newest = res.installed.map((i) => i.version).sort().pop();
    if (newest && newest !== VERSION && !res.latest) info(`Este paquete trae la versión ${VERSION}.`);
    process.exitCode = res.problems ? 1 : 0;
  } else if (o.cmd === "lint") {
    if (!o.rest[0]) throw new Friendly("Uso: node install.mjs lint <contrato.md>");
    const r = spawnSync(process.execPath, [path.join(SKILL_SRC, "scripts", "lint.mjs"), ...o.rest], { stdio: "inherit" });
    process.exitCode = r.status ?? 1;
  }
} catch (e) {
  if (e instanceof Friendly) console.error(e.message.startsWith("\n") ? e.message : `✖ ${e.message}`);
  else if (["EACCES", "EPERM", "EROFS"].includes(e.code)) console.error(`✖ Sin permiso para escribir en ${e.path ?? "el destino"}. Revisá los permisos o que el archivo no sea de solo lectura.`);
  else console.error(`✖ Error inesperado: ${e.message}`);
  process.exitCode = 1;
}
