#!/usr/bin/env node
// BCDD exportar: genera la versión para el cliente de un contrato (HTML autocontenido, imprimible a PDF).
//   node exportar.mjs <contrato.md> [--out <archivo.html>]
// No incluye fuentes, rutas internas ni la sección "Para quien construye".
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, splitSections, parseTable } from "./lint.mjs";

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
if (!file || !fs.existsSync(file)) { console.error("Uso: node exportar.mjs <contrato.md> [--out <archivo.html>]"); process.exit(2); }

const text = fs.readFileSync(file, "utf8");
const fm = parseFrontmatter(text) ?? {};
const sec = splitSections(text);
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
const title = (n) => (text.match(new RegExp(`^## ${n}\\.\\s*(.+)$`, "m")) ?? [])[1] ?? "";

function mdBlock(md) {
  const out = [];
  let list = false;
  for (const raw of md.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/)) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*[-•]\s+(.*)$/);
    if (li) { if (!list) { out.push("<ul>"); list = true; } out.push(`<li>${inline(li[1])}</li>`); continue; }
    if (list) { out.push("</ul>"); list = false; }
    if (!line.trim()) continue;
    if (line.startsWith(">")) out.push(`<p class="note">${inline(line.replace(/^>\s?/, ""))}</p>`);
    else out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push("</ul>");
  return out.join("\n");
}
function table(head, rows) {
  if (!rows.length) return "";
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

const mermaid = ((sec["2"] ?? "").match(/```mermaid\r?\n([\s\S]*?)```/) ?? [])[1] ?? "";
// Respaldo legible del diagrama, por si el navegador no puede cargar Mermaid (sin conexión, PDF).
function flowSteps(src) {
  const label = {};
  const clean = (t) => t.replace(/^["']|["']$/g, "").trim();
  for (const m of src.matchAll(/\b([A-Za-z0-9_]+)\s*(?:\[([^\]]+)\]|\{([^}]+)\}|\(([^)]+)\))/g)) label[m[1]] = clean(m[2] ?? m[3] ?? m[4]);
  const steps = [];
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)[^-]*-->\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_]+)/);
    if (!m || !label[m[1]] || !label[m[3]]) continue;
    steps.push(`${esc(label[m[1]])}${m[2] ? ` <em>(${esc(clean(m[2]))})</em>` : ""} → ${esc(label[m[3]])}`);
  }
  return steps.length ? `<ol class="steps">${steps.map((x) => `<li>${x}</li>`).join("")}</ol>` : `<pre>${esc(src)}</pre>`;
}
const dead = ["descartada", "descartado", "discarded"];
const rules = parseTable(sec["3"]).filter((r) => !dead.includes(norm(r[2]))).map((r) => [r[0], r[1], r[2]]);
const reqs = parseTable(sec["4"]).filter((r) => !dead.includes(norm(r[2]))).map((r) => [r[0], r[1], r[2], r[4]]);
const lastChange = ((sec["5"] ?? "").match(/### v[\s\S]*?(?=\n### v|$)/) ?? [""])[0];
const changeTitle = (lastChange.match(/^### (.+)$/m) ?? [])[1] ?? "";
const changeBody = lastChange.replace(/^### .+$/m, "");
const firstVersion = /^v1\b/.test(changeTitle);
const aviso = (text.split(/^## 1\./m)[0].match(/^>.*$/gm) ?? []).join("\n");

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fm.proyecto ?? "Contrato de negocio")} — resumen de lo acordado</title>
<style>
:root{--ink:#1c2430;--soft:#5b6675;--line:#dfe3e8;--bg:#f6f4ef;--card:#fff;--accent:#0f6e64}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:780px;margin:0 auto;padding:32px 20px 56px}
header{border-bottom:3px solid var(--accent);padding-bottom:14px;margin-bottom:8px}
h1{font-size:1.7rem;line-height:1.2;margin:0 0 6px;text-wrap:balance}
.meta{color:var(--soft);font-size:.92rem}
h2{font-size:1.15rem;margin:34px 0 10px;color:var(--accent)}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:4px 20px 14px;margin-top:18px}
ul{padding-left:1.2rem;margin:.4rem 0}li{margin:.25rem 0}p{margin:.7rem 0}
.note{background:#fff7e0;border-left:4px solid #d9a400;padding:8px 12px;border-radius:4px}
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.94rem}
th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{color:var(--soft);font-weight:600;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em}
td:first-child{white-space:nowrap;color:var(--soft);font-variant-numeric:tabular-nums}
.diagram{text-align:center;overflow-x:auto}.steps{padding-left:1.4rem}.steps em{color:var(--soft)}
td:nth-child(3){white-space:nowrap}
footer{margin-top:28px;padding:16px 20px;border:2px solid var(--accent);border-radius:10px;background:var(--card)}
.gen{margin-top:22px;color:var(--soft);font-size:.8rem;text-align:center}
@media print{body{background:#fff}section,footer{break-inside:avoid;border-color:#bbb}main{padding:0}}
</style></head><body><main>
<header><h1>${esc(fm.proyecto ?? "Contrato de negocio")}</h1>
<div class="meta">Resumen de lo acordado${fm.cliente ? ` con ${esc(fm.cliente)}` : ""} · versión ${esc(fm.version ?? "")} · ${esc(fm.actualizado ?? "")}${norm(fm.estado) === "borrador" ? " · <strong>borrador para revisar</strong>" : ""}</div></header>
${aviso ? mdBlock(aviso) : ""}
<section><h2>${esc(title(1) || "En dos minutos")}</h2>${mdBlock(sec["1"] ?? "")}</section>
${mermaid ? `<section><h2>${esc(title(2) || "Cómo funciona")}</h2><div class="diagram"><pre class="mermaid" hidden>${esc(mermaid)}</pre></div>${flowSteps(mermaid)}</section>` : ""}
${rules.length ? `<section><h2>${esc(title(3) || "Reglas del negocio")}</h2><div class="tw">${table(["", "Regla", "Estado"], rules)}</div></section>` : ""}
${reqs.length ? `<section><h2>Qué incluye</h2><div class="tw">${table(["", "Qué necesita el negocio", "Estado", "Se considera listo cuando"], reqs)}</div></section>` : ""}
${changeBody.trim() && !firstVersion ? `<section><h2>Qué cambió — ${esc(changeTitle)}</h2>${mdBlock(changeBody)}</section>` : ""}
<footer><strong>¿Está bien así?</strong> Respondé "OK" para avanzar, o indicá qué corregir citando el código de la fila (por ejemplo, RN-02 o REQ-04).</footer>
<p class="gen">Generado con BCDD</p>
</main>
<script type="module">
try{const m=await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");m.default.initialize({startOnLoad:false,theme:"neutral"});
const el=document.querySelector("pre.mermaid");if(el){el.hidden=false;await m.default.run();document.querySelector(".steps")?.remove();}}
catch(e){document.querySelector("pre.mermaid")?.remove();/* sin conexión: el flujo queda como lista de pasos */}
</script></body></html>
`;
const out = outArg ?? path.join(path.dirname(file), "contrato-cliente.html");
fs.writeFileSync(out, html);
console.log(`✔ Versión para el cliente: ${out}`);
console.log("  Abrila en el navegador para revisarla; desde ahí se puede imprimir a PDF.");
