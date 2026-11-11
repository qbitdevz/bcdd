#!/usr/bin/env node
// BCDD lint: valida un contrato de negocio. Sin dependencias. Node 18+.
//   node lint.mjs <contrato.md> [--json]
// Sale con 1 si hay errores. Las advertencias no cortan.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const RULE_STATES = ["a confirmar", "acordada", "descartada", "to confirm", "agreed", "discarded"];
const REQ_STATES = ["a confirmar", "acordado", "entregado", "descartado", "to confirm", "agreed", "delivered", "discarded"];
const CHANGES = ["nuevo", "modificado", "sin cambios", "eliminado", "new", "modified", "unchanged", "removed"];
const DEAD = ["descartado", "descartada", "discarded"];
const JARGON =
  /\b(api|apis|endpoint|endpoints|sql|backend|frontend|framework|json|deploy|query|queries|webhook|microservicio|microservicios|cache|commit|repo|repositorio|middleware|crud|orm|docker|token jwt|jwt)\b/gi;

export function parseFrontmatter(text) {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 1 || /^\s/.test(line)) continue;
    fm[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .replace(/\s+#.*$/, "")
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return fm;
}

export function splitSections(text) {
  const body = text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---/, "");
  const out = {};
  const re = /^## (\d+)\.[^\n]*$/gm;
  const hits = [...body.matchAll(re)];
  hits.forEach((h, i) => {
    out[h[1]] = body.slice(h.index + h[0].length, i + 1 < hits.length ? hits[i + 1].index : body.length);
  });
  return out;
}

export function parseTable(section) {
  const rows = [];
  for (const line of (section ?? "").split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows.slice(1); // sin encabezado
}

const stripCode = (s) => (s ?? "").replace(/```[\s\S]*?```/g, "").replace(/<!--[\s\S]*?-->/g, "");
const empty = (c) => !c || /^[—–-]+$/.test(c.trim());

export function lintContract(text) {
  const errors = [];
  const warnings = [];
  const E = (m) => errors.push(m);
  const W = (m) => warnings.push(m);

  const fm = parseFrontmatter(text);
  if (!fm) return { errors: ["No tiene frontmatter (bloque --- al inicio)."], warnings, summary: {} };
  if (fm.bcdd !== "1") E('Frontmatter: falta `bcdd: 1`.');
  for (const k of ["proyecto", "version", "estado", "actualizado"]) if (!fm[k]) E(`Frontmatter: falta \`${k}\`.`);
  if (fm.version && !/^\d+$/.test(fm.version)) E("Frontmatter: `version` tiene que ser un número entero.");
  const estado = norm(fm.estado);
  if (fm.estado && !["borrador", "aprobado", "draft", "approved"].includes(estado)) E("Frontmatter: `estado` tiene que ser `borrador` o `aprobado`.");
  if (fm.actualizado && !/^\d{4}-\d{2}-\d{2}$/.test(fm.actualizado)) E("Frontmatter: `actualizado` tiene que tener formato AAAA-MM-DD.");
  if (["aprobado", "approved"].includes(estado) && !fm.aprobado_equipo) E("Estado `aprobado` sin `aprobado_equipo` (quién y cuándo).");
  if (["borrador", "draft"].includes(estado) && (fm.aprobado_equipo || fm.aprobado_cliente)) W("Está en `borrador` pero conserva aprobaciones: vaciá `aprobado_equipo` y `aprobado_cliente`.");

  const sec = splitSections(text);
  const index = !sec["3"] && !sec["4"] && /\]\([^)]+\.md\)/.test(text); // contrato índice de módulos
  for (const n of index ? ["1"] : ["1", "2", "3", "4", "5", "6", "7"]) if (!sec[n]) E(`Falta la sección ${n} (encabezado "## ${n}. …").`);

  if (sec["1"]) {
    const words = stripCode(sec["1"]).split(/\s+/).filter(Boolean).length;
    if (words > 320) W(`La sección 1 tiene ${words} palabras; tiene que leerse en dos minutos (hasta unas 300).`);
    if (!/fuera de alcance|out of scope/i.test(sec["1"])) W('La sección 1 no tiene "Fuera de alcance".');
  }
  if (sec["2"] && !/```mermaid/.test(sec["2"])) E("La sección 2 no tiene un diagrama Mermaid.");

  const rules = parseTable(sec["3"]);
  const reqs = parseTable(sec["4"]);
  const ruleIds = new Set();
  const usedRules = new Set();

  if (sec["3"] && rules.length === 0) E("La sección 3 no tiene ninguna regla de negocio.");
  for (const r of rules) {
    const [id, texto, est, fuente] = r;
    if (!/^([A-Z]{2,5}-)?RN-\d+$/.test(id ?? "")) { E(`Regla con ID inválido: "${id}".`); continue; }
    if (ruleIds.has(id)) E(`ID de regla repetido: ${id}.`);
    ruleIds.add(id);
    if (empty(texto)) E(`${id}: la regla está vacía.`);
    if (!RULE_STATES.includes(norm(est))) E(`${id}: estado "${est}" inválido (A confirmar · Acordada · Descartada).`);
    if (empty(fuente)) E(`${id}: falta la fuente.`);
    if (/a definir|to be defined|tbd/i.test(texto ?? "") && !["a confirmar", "to confirm"].includes(norm(est))) W(`${id}: tiene un valor "a definir" pero no está "A confirmar".`);
  }
  if (rules.length > 14) W(`Hay ${rules.length} reglas; por encima de 12 conviene agrupar o dividir por módulo.`);

  const reqIds = new Set();
  let active = 0;
  if (sec["4"] && reqs.length === 0) E("La sección 4 no tiene ningún requisito.");
  for (const r of reqs) {
    const [id, texto, est, cambio, listo, reglas, fuente] = r;
    if (!/^([A-Z]{2,5}-)?REQ-\d+$/.test(id ?? "")) { E(`Requisito con ID inválido: "${id}".`); continue; }
    if (reqIds.has(id)) E(`ID de requisito repetido: ${id}.`);
    reqIds.add(id);
    if (empty(texto)) E(`${id}: el requisito está vacío.`);
    const e = norm(est);
    if (!REQ_STATES.includes(e)) E(`${id}: estado "${est}" inválido (A confirmar · Acordado · Entregado · Descartado).`);
    if (!CHANGES.includes(norm(cambio))) E(`${id}: cambio "${cambio}" inválido (Nuevo · Modificado · Sin cambios · Eliminado).`);
    const dead = DEAD.includes(e);
    if (!dead) active++;
    if (!dead && empty(listo)) E(`${id}: falta "Listo cuando".`);
    if (!dead && /funciona bien|validado en demo|works (fine|well)|ok en demo/i.test(listo ?? "")) W(`${id}: "Listo cuando" no es comprobable ("${listo}").`);
    if (empty(fuente)) E(`${id}: falta la fuente.`);
    for (const ref of (reglas ?? "").match(/([A-Z]{2,5}-)?RN-\d+/g) ?? []) {
      usedRules.add(ref);
      if (!ruleIds.has(ref)) E(`${id}: referencia a ${ref}, que no existe en la sección 3.`);
    }
  }
  for (const r of rules) {
    if (["acordada", "agreed"].includes(norm(r[2])) && !usedRules.has(r[0])) W(`${r[0]}: regla Acordada que ningún requisito aplica.`);
  }
  if (active > 22) W(`Hay ${active} requisitos activos; por encima de 20 conviene dividir por módulo.`);

  const versions = (sec["5"] ?? "").match(/^### v\d+/gm) ?? [];
  if (sec["5"] && fm.version && !new RegExp(`^### v${fm.version}\\b`, "m").test(sec["5"])) E(`La sección 5 no tiene la entrada de la versión ${fm.version}.`);
  if (versions.length > 6) W(`Cambios tiene ${versions.length} versiones; mové las más viejas a historial.md.`);

  const questions = (stripCode(sec["1"]).match(/\*\*P-\d+:?\*\*/g) ?? []).length;
  const prose = [sec["1"], sec["2"], sec["3"]].map(stripCode).join("\n").replace(/\|[^|\n]*$/gm, "");
  const jargon = [...new Set((prose.match(JARGON) ?? []).map((w) => w.toLowerCase()))];
  if (jargon.length) W(`Posible jerga técnica en las secciones 1 a 3: ${jargon.join(", ")}.`);
  const placeholders = stripCode(text).match(/\[[A-ZÁÉÍÓÚ¿][^\]\n]{2,70}\](?!\()/g) ?? [];
  if (placeholders.length) W(`Quedan ${placeholders.length} textos de plantilla sin completar (por ejemplo ${placeholders[0]}).`);
  if (/[a-z]{3,}[?]{2,}|Ã[¡©­³º±]/.test(text)) W("Hay caracteres rotos: revisá la codificación (tiene que ser UTF-8).");

  return {
    errors,
    warnings,
    summary: { proyecto: fm.proyecto, version: fm.version, estado: fm.estado, reglas: rules.length, requisitos: reqs.length, activos: active, preguntas: questions },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const json = process.argv.includes("--json");
  if (!file) { console.error("Uso: node lint.mjs <contrato.md> [--json]"); process.exit(2); }
  if (!fs.existsSync(file)) { console.error(`No existe ${file}`); process.exit(2); }
  const res = lintContract(fs.readFileSync(file, "utf8"));
  if (json) console.log(JSON.stringify(res, null, 2));
  else {
    const s = res.summary;
    console.log(`BCDD lint → ${file}`);
    if (s.proyecto) console.log(`  ${s.proyecto} · v${s.version} · ${s.estado} · ${s.reglas} reglas · ${s.requisitos} requisitos (${s.activos} activos) · ${s.preguntas} preguntas abiertas\n`);
    res.errors.forEach((e) => console.log(`✖ ${e}`));
    res.warnings.forEach((w) => console.log(`! ${w}`));
    if (!res.errors.length && !res.warnings.length) console.log("✔ Sin observaciones.");
    else console.log(`\n${res.errors.length} errores, ${res.warnings.length} advertencias.`);
  }
  process.exit(res.errors.length ? 1 : 0);
}
