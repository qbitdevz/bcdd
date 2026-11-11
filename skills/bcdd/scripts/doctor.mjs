#!/usr/bin/env node
// BCDD doctor: revisa la instalación, la regla en AGENTS.md/CLAUDE.md, los contratos del proyecto
// y si hay una versión más nueva en el repo. No modifica nada. Sin dependencias. Node 18+.
//   node doctor.mjs [--dir <proyecto>] [--offline] [--json]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lintContract } from "./lint.mjs";

export const MANIFEST = ".bcdd-manifest.json";
export const START_PREFIX = "<!-- bcdd:start";
export const END = "<!-- bcdd:end -->";
export const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export function listFiles(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else if (e.name !== MANIFEST) out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out.sort();
}
export function hashDir(dir) {
  const files = {};
  for (const f of listFiles(dir)) files[f] = sha(fs.readFileSync(path.join(dir, f)));
  return files;
}
export function readManifest(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), "utf8")); } catch { return null; }
}
/** Diferencias entre lo instalado y su manifiesto. */
export function diffInstall(dir) {
  const man = readManifest(dir);
  if (!man) return { manifest: null, modified: [], missing: [], extra: [] };
  const now = hashDir(dir);
  const modified = [], missing = [], extra = [];
  for (const [f, h] of Object.entries(man.files ?? {})) {
    if (!(f in now)) missing.push(f);
    else if (now[f] !== h) modified.push(f);
  }
  for (const f of Object.keys(now)) if (!(f in (man.files ?? {}))) extra.push(f);
  return { manifest: man, modified, missing, extra };
}
export function ruleState(file) {
  if (!fs.existsSync(file)) return { state: "sin-archivo" };
  const txt = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const starts = txt.split(START_PREFIX).length - 1;
  const ends = txt.split(END).length - 1;
  if (starts === 0 && ends === 0) return { state: "ausente" };
  if (starts !== 1 || ends !== 1 || txt.indexOf(END) < txt.indexOf(START_PREFIX)) return { state: "dañada", starts, ends };
  const a = txt.indexOf("\n", txt.indexOf(START_PREFIX)) + 1;
  return { state: "presente", hash: sha(txt.slice(a, txt.indexOf(END)).trim()) };
}
export function cmpVersion(a, b) {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}
export function findContracts(base, depth = 4) {
  const out = [];
  const skip = new Set(["node_modules", "dist", "build", "vendor", "target"]);
  (function walk(dir, d) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (d < depth && !e.name.startsWith(".") && !skip.has(e.name) && !p.split(path.sep).join("/").includes("skills/bcdd")) walk(p, d + 1);
      } else if (e.name.endsWith(".md")) {
        try {
          const head = fs.readFileSync(p, "utf8").slice(0, 400);
          if (/^﻿?---\r?\n[\s\S]*?^bcdd:\s*1\s*$/m.test(head)) out.push(p);
        } catch { /* ilegible: se ignora */ }
      }
    }
  })(base, 0);
  return out;
}
export async function remoteVersion(repo, branch = "main") {
  const override = process.env.BCDD_UPDATE_URL;
  const url = override || (repo ? `https://raw.githubusercontent.com/${repo}/${branch}/package.json` : null);
  if (!url) return { error: "sin-repo" };
  try {
    let raw;
    if (url.startsWith("file:")) raw = fs.readFileSync(fileURLToPath(url), "utf8");
    else {
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) return { error: `HTTP ${r.status}`, url };
      raw = await r.text();
    }
    return { version: JSON.parse(raw).version, url };
  } catch (e) {
    return { error: e.name === "TimeoutError" ? "sin respuesta" : e.message, url };
  }
}

export async function runDoctor({ base = process.cwd(), offline = false, quiet = false } = {}) {
  const lines = [];
  let problems = 0, notices = 0;
  const ok = (m) => lines.push(`✔ ${m}`);
  const bad = (m) => { problems++; lines.push(`✖ ${m}`); };
  const warn = (m) => { notices++; lines.push(`! ${m}`); };
  const info = (m) => lines.push(`  ${m}`);
  const home = os.homedir();
  const rel = (p) => (p.startsWith(base + path.sep) ? path.relative(base, p) : p.replace(home, "~"));

  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) bad(`Node ${process.versions.node}: hace falta 18 o superior.`);

  // 1. Instalaciones
  const places = [
    [path.join(base, ".claude", "skills", "bcdd"), "proyecto"],
    [path.join(base, ".agents", "skills", "bcdd"), "proyecto"],
    [path.join(home, ".claude", "skills", "bcdd"), "global"],
    [path.join(home, ".agents", "skills", "bcdd"), "global"],
  ].filter(([p], i, a) => a.findIndex(([q]) => q === p) === i);
  const found = [];
  for (const [dir, scope] of places) {
    if (!fs.existsSync(path.join(dir, "SKILL.md"))) continue;
    const d = diffInstall(dir);
    const head = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
    const name = (head.match(/^name:\s*(.+)$/m) ?? [])[1]?.trim();
    const desc = (head.match(/^description:\s*"?([\s\S]*?)"?\s*$/m) ?? [])[1] ?? "";
    const version = d.manifest?.version ?? (head.match(/version:\s*"?([\d.]+)"?/) ?? [])[1] ?? "?";
    found.push({ dir, scope, version, manifest: d.manifest });
    if (name !== "bcdd") bad(`${rel(dir)}: el nombre de la skill no es "bcdd" (${name}).`);
    if (!desc || desc.length > 1024) bad(`${rel(dir)}: la descripción falta o supera 1024 caracteres.`);
    if (!d.manifest) warn(`${rel(dir)}: versión ${version} sin manifiesto (instalación anterior a 0.2); reinstalá para poder verificarla.`);
    else if (d.missing.length) bad(`${rel(dir)}: faltan archivos (${d.missing.join(", ")}). Reinstalá.`);
    else if (d.modified.length || d.extra.length) warn(`${rel(dir)}: ${version}, modificada localmente (${[...d.modified, ...d.extra].join(", ")}). Una actualización pedirá --force.`);
    else ok(`skill ${version} íntegra en ${rel(dir)} (${scope})`);
  }
  if (!found.length) bad("BCDD no está instalada en este proyecto ni a nivel global.");
  const versions = [...new Set(found.map((f) => f.version))];
  if (versions.length > 1) warn(`Hay versiones distintas instaladas (${versions.join(", ")}): actualizá para unificarlas.`);
  const projectScoped = found.filter((f) => f.scope === "proyecto");
  if (projectScoped.length && found.some((f) => f.scope === "global")) info("Instalada en el proyecto y a nivel global: en el proyecto rige la del proyecto.");

  // 2. Regla en AGENTS.md / CLAUDE.md
  const wantRule = found.some((f) => f.manifest?.rule);
  const ruleHash = found.find((f) => f.manifest?.ruleHash)?.manifest.ruleHash;
  let anyRule = false;
  for (const f of ["AGENTS.md", "CLAUDE.md"]) {
    const st = ruleState(path.join(base, f));
    if (st.state === "presente") {
      anyRule = true;
      if (ruleHash && st.hash !== ruleHash) warn(`${f}: la regla BCDD difiere de la versión instalada (editada o desactualizada).`);
      else ok(`regla BCDD presente en ${f}`);
    } else if (st.state === "dañada") bad(`${f}: bloque BCDD dañado (${st.starts} inicio, ${st.ends} cierre). Borrá a mano lo que quede entre los marcadores "bcdd" y reinstalá con --with-rule.`);
  }
  if (wantRule && !anyRule) bad("La regla BCDD se había instalado y ya no está en AGENTS.md ni CLAUDE.md (¿la pisó una actualización de otra herramienta?). Reinstalá con --with-rule.");
  if (!wantRule && !anyRule && found.length) info("Sin regla en AGENTS.md (opcional): se agrega con --with-rule.");

  // 3. Registro de gentle-ai (solo si el proyecto lo usa: existe .atl/)
  if (projectScoped.length && fs.existsSync(path.join(base, ".atl"))) {
    const r = spawnSync("gentle-ai skill-registry list", { cwd: base, encoding: "utf8", shell: true });
    if (!r.error && r.status === 0) {
      if (/\bbcdd\b/.test(r.stdout)) ok("bcdd figura en el registro de skills de gentle-ai");
      else bad('bcdd no figura en el registro de gentle-ai: corré "gentle-ai skill-registry refresh".');
    } else info("gentle-ai no detectado: se omite el chequeo del registro.");
  }

  // 4. Contratos
  const contracts = findContracts(base);
  if (!contracts.length) info("Todavía no hay contratos BCDD en este proyecto.");
  for (const c of contracts) {
    const res = lintContract(fs.readFileSync(c, "utf8"));
    const s = res.summary;
    const tag = `${rel(c)} (v${s.version ?? "?"}, ${s.estado ?? "?"})`;
    if (res.errors.length) bad(`contrato ${tag}: ${res.errors.length} errores. Detalle: node <skill>/scripts/lint.mjs ${rel(c)}`);
    else if (res.warnings.length) warn(`contrato ${tag}: ${res.warnings.length} advertencias.`);
    else ok(`contrato ${tag} válido`);
  }

  // 5. Versión disponible en el repo
  const man = found.find((f) => f.manifest)?.manifest;
  const repo = process.env.BCDD_REPO || man?.repo || "";
  const current = found.map((f) => f.version).filter((v) => v !== "?").sort(cmpVersion)[0];
  let latest = null;
  if (offline) info("Chequeo de versión omitido (--offline).");
  else if (current) {
    const r = await remoteVersion(repo, man?.branch || "main");
    if (r.error === "sin-repo") info('Repo de origen sin configurar: definí "bcdd.repo" en package.json del paquete o la variable BCDD_REPO=usuario/repo.');
    else if (r.error) info(`No pude consultar la última versión (${r.error}). Sin conexión no es un problema.`);
    else {
      latest = r.version;
      if (cmpVersion(latest, current) > 0) {
        warn(`Hay una versión nueva: ${latest} (instalada: ${current}). Para actualizar:`);
        const raw = `https://raw.githubusercontent.com/${repo || "USUARIO/REPO"}/${man?.branch || "main"}/scripts`;
        if (man?.source && fs.existsSync(path.join(man.source, ".git"))) info(`  node "${path.join(man.source, "install.mjs")}" update`);
        else {
          info(`  macOS / Linux:  curl -fsSL ${raw}/install.sh | sh`);
          info(`  Windows:        irm ${raw}/install.ps1 | iex`);
        }
      } else ok(`al día con el repo (${current})`);
    }
  }

  const summary = { problems, notices, installed: found.map((f) => ({ dir: f.dir, version: f.version })), contracts: contracts.length, latest };
  if (!quiet) {
    console.log(`BCDD doctor → ${base}\n`);
    lines.forEach((l) => console.log(l));
    console.log(problems ? `\n${problems} problema(s) para reparar.` : notices ? `\nFunciona; ${notices} aviso(s) para revisar.` : "\nTodo en orden.");
  }
  return { ...summary, lines };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const a = process.argv.slice(2);
  const base = path.resolve(a.includes("--dir") ? a[a.indexOf("--dir") + 1] : process.cwd());
  const json = a.includes("--json");
  const res = await runDoctor({ base, offline: a.includes("--offline"), quiet: json });
  if (json) console.log(JSON.stringify(res, null, 2));
  process.exit(res.problems ? 1 : 0);
}
