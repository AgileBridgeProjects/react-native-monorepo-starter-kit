#!/usr/bin/env node
// Builds docs/domain-explorer.html — a self-contained, double-clickable interactive
// map of the StarterKit domain model, parsed from docs/erd.md (the single source of truth).
//
// Run:  npm run build:domain-explorer
//
// The output has NO external dependencies (no CDN, fonts, or network calls) so it can be
// handed to a client and opened offline by double-clicking. Re-run this whenever erd.md changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ERD_FILE = join(ROOT, 'docs', 'erd.md');
const OUT_FILE = join(ROOT, 'docs', 'domain-explorer.html');

// Relationship/FK endpoints in erd.md sometimes use the conceptual name; map to the real entity.
const ALIASES = { User: 'UserEntity', Role: 'RoleEntity' };
const resolveAlias = (name) => ALIASES[name] ?? name;

// ─────────────────────────────────────────────────────────────────────────────
// Parse
// ─────────────────────────────────────────────────────────────────────────────

const md = readFileSync(ERD_FILE, 'utf8');
const lines = md.split(/\r?\n/);

/** @type {{interfaces: {name:string, desc:string}[]}} */
const crossCutting = { interfaces: [] };
const entities = []; // {name, domain, fields:[{name,type,isPk,isFk,nullable,note,target}]}
const entitiesByName = new Map();
const relations = []; // {parent, child, parentMult, childMult, label}
const designDecisions = []; // {term, text} or {text}

// --- Cross-cutting interfaces (the intro bullet list before the first '---') ---
for (const line of lines) {
    if (line.trim() === '---') break;
    const m = line.match(/^\s*-\s+\*\*(\w+)\*\*\s*[—-]\s*(.+)$/);
    if (m) crossCutting.interfaces.push({ name: m[1], desc: m[2].trim() });
}

// --- Entities + domains, walking the mermaid erDiagram blocks ---
let inMermaid = false;
let currentHeading = '';
let currentDomain = '';
let currentEntity = null;

const sectionFromComment = (line) => {
    // %% ─── Reports / Analytics ─── → "Reports / Analytics"
    const m = line.match(/^\s*%%\s*[─—-]*\s*(.+?)\s*[─—-]*\s*$/);
    if (!m) return null;
    const text = m[1].trim();
    if (!text || /^[─—-]+$/.test(text)) return null;
    return text;
};

const decodeMult = (token) => {
    const many = token.includes('{') || token.includes('}');
    const optional = token.includes('o');
    if (many) return optional ? '0..N' : '1..N';
    return optional ? '0..1' : '1';
};

for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    const heading = raw.match(/^##\s+(.+?)\s*$/);
    if (heading && !inMermaid) {
        currentHeading = heading[1].replace(/\s+Entities$/i, '').trim();
        continue;
    }

    if (line.startsWith('```mermaid')) {
        inMermaid = true;
        // Reset per-block domain; fall back to the section heading (Gamification / Streaks).
        currentDomain = currentHeading || '';
        continue;
    }
    if (inMermaid && line.startsWith('```')) {
        inMermaid = false;
        currentEntity = null;
        continue;
    }
    if (!inMermaid) continue;
    if (line === 'erDiagram' || line === '') continue;

    // Domain section comment
    if (line.startsWith('%%')) {
        const sec = sectionFromComment(line);
        if (sec && !/^relationships$/i.test(sec)) currentDomain = sec;
        continue;
    }

    // Relationship line:  A  ||--o{  B  : "label"
    const rel = line.match(/^([A-Za-z]\w*)\s+(\S+?)--(\S+?)\s+([A-Za-z]\w*)\s*:\s*"([^"]*)"\s*$/);
    if (rel && !currentEntity) {
        const left = resolveAlias(rel[1]);
        const leftCard = rel[2];
        const rightCard = rel[3];
        const right = resolveAlias(rel[4]);
        const label = rel[5];
        // FK holder (child) = side with a crow's foot; else the optional (o|) side; else left.
        const leftCrow = /[{}]/.test(leftCard);
        const rightCrow = /[{}]/.test(rightCard);
        let parent;
        let child;
        let parentMult;
        let childMult;
        if (leftCrow !== rightCrow) {
            if (rightCrow) {
                parent = left;
                child = right;
                parentMult = decodeMult(leftCard);
                childMult = decodeMult(rightCard);
            } else {
                parent = right;
                child = left;
                parentMult = decodeMult(rightCard);
                childMult = decodeMult(leftCard);
            }
        } else {
            // No crow's foot on either side (e.g. ||--o|): the exactly-one side is the parent.
            if (leftCard === '||') {
                parent = left;
                child = right;
                parentMult = decodeMult(leftCard);
                childMult = decodeMult(rightCard);
            } else {
                parent = right;
                child = left;
                parentMult = decodeMult(rightCard);
                childMult = decodeMult(leftCard);
            }
        }
        relations.push({ parent, child, parentMult, childMult, label });
        continue;
    }

    // Entity open:  EntityName {
    const open = line.match(/^([A-Za-z]\w*)\s*\{$/);
    if (open) {
        currentEntity = {
            name: open[1],
            domain: currentDomain || 'Other',
            fields: [],
        };
        entities.push(currentEntity);
        entitiesByName.set(currentEntity.name, currentEntity);
        continue;
    }

    // Entity close
    if (line === '}') {
        currentEntity = null;
        continue;
    }

    // Field line inside an entity:  type  Name  [PK|FK]  ["note"]
    if (currentEntity) {
        const noteMatch = line.match(/"([^"]*)"/);
        const note = noteMatch ? noteMatch[1].trim() : '';
        const withoutNote = line.replace(/"[^"]*"/, '').trim();
        const tokens = withoutNote.split(/\s+/).filter(Boolean);
        if (tokens.length < 2) continue;
        const type = tokens[0];
        const name = tokens[1];
        const flags = tokens.slice(2);
        currentEntity.fields.push({
            type,
            name,
            isPk: flags.includes('PK'),
            isFk: flags.includes('FK'),
            nullable: /nullable/i.test(note),
            note,
        });
    }
}

// --- Resolve FK column → target entity by naming convention (best-effort) ---
const resolveTarget = (fieldName) => {
    if (!fieldName.endsWith('Id') || fieldName === 'Id') return null;
    const base = fieldName.slice(0, -2);
    if (entitiesByName.has(base)) return base;
    const aliased = resolveAlias(base);
    if (entitiesByName.has(aliased)) return aliased;
    return null;
};
for (const e of entities) {
    for (const f of e.fields) {
        f.target = resolveTarget(f.name);
    }
}

// --- Key Design Decisions (bullets under that heading to EOF) ---
let inDecisions = false;
for (const raw of lines) {
    if (/^##\s+Key Design Decisions/i.test(raw)) {
        inDecisions = true;
        continue;
    }
    if (inDecisions) {
        if (/^##\s+/.test(raw)) break;
        const m = raw.match(/^\s*-\s+(.+)$/);
        if (m) {
            const text = m[1].trim();
            const term = text.match(/^\*\*(.+?)\*\*\s*[—-]?\s*(.*)$/);
            designDecisions.push(term ? { term: term[1], text: term[2] } : { text });
        }
    }
}

// --- Merge the curated narrative content layer (docs/domain-explorer-content.json) ---
const CONTENT_FILE = join(ROOT, 'docs', 'domain-explorer-content.json');
let content = { overview: null, domains: {}, entities: {} };
try {
    content = JSON.parse(readFileSync(CONTENT_FILE, 'utf8'));
} catch {
    console.warn(`  ⚠ ${CONTENT_FILE} not found — building without narrative descriptions.`);
}
const missingPurpose = [];
for (const e of entities) {
    e.purpose = content.entities?.[e.name] ?? '';
    if (!e.purpose) missingPurpose.push(e.name);
}
const domainInfo = content.domains ?? {};
const overview = content.overview ?? null;

// --- Domain ordering + counts ---
const domainOrder = [];
for (const e of entities) if (!domainOrder.includes(e.domain)) domainOrder.push(e.domain);

const DATA = {
    generatedFrom: 'docs/erd.md',
    entityCount: entities.length,
    domainOrder,
    crossCutting,
    entities,
    relations,
    designDecisions,
    overview,
    domainInfo,
};

// ─────────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────────

const json = JSON.stringify(DATA).replace(/</g, '\\u003c');
const html = renderHtml(json, entities.length, domainOrder.length, relations.length);
writeFileSync(OUT_FILE, html, 'utf8');

console.log(`Domain explorer built → docs/domain-explorer.html`);
console.log(
    `  ${entities.length} entities · ${domainOrder.length} domains · ${relations.length} relationships · ${designDecisions.length} design notes`,
);
const unresolved = relations.filter(
    (r) => !entitiesByName.has(r.parent) || !entitiesByName.has(r.child),
);
if (unresolved.length) {
    console.warn(`  ⚠ ${unresolved.length} relationship(s) reference an unknown entity:`);
    for (const r of unresolved) console.warn(`     ${r.parent} → ${r.child} ("${r.label}")`);
}
if (missingPurpose.length) {
    console.warn(
        `  ⚠ ${missingPurpose.length} entit(y/ies) have no description in domain-explorer-content.json:`,
    );
    console.warn(`     ${missingPurpose.join(', ')}`);
}
const missingDomainCopy = domainOrder.filter((d) => !domainInfo[d]?.summary);
if (missingDomainCopy.length) {
    console.warn(`  ⚠ domains with no summary: ${missingDomainCopy.join(', ')}`);
}

function renderHtml(dataJson, nEntities, nDomains, nRels) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>StarterKit — Domain Explorer</title>
<style>
  :root {
    --bg: #0e1116; --panel: #161b22; --panel-2: #1c2230; --line: #2a3140;
    --text: #e6edf3; --muted: #9aa6b2; --accent: #6ad28a; --accent-2: #58a6ff;
    --pk: #f0b429; --fk: #58a6ff; --null: #8b949e; --chip: #232b3a;
    --shadow: 0 6px 24px rgba(0,0,0,.35);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; height: 100vh; overflow: hidden;
  }
  header {
    display: flex; align-items: center; gap: 16px; padding: 12px 18px;
    background: linear-gradient(180deg, #11161f, #0e1116); border-bottom: 1px solid var(--line);
    flex: 0 0 auto;
  }
  header .logo { font-size: 18px; font-weight: 700; letter-spacing: .3px; }
  header .logo span { color: var(--accent); }
  header .stats { color: var(--muted); font-size: 12px; }
  header .search { margin-left: auto; position: relative; }
  header .search input {
    background: var(--panel-2); border: 1px solid var(--line); color: var(--text);
    border-radius: 8px; padding: 8px 12px; width: 280px; outline: none;
  }
  header .search input:focus { border-color: var(--accent-2); }
  header button.nav {
    background: var(--panel-2); border: 1px solid var(--line); color: var(--text);
    border-radius: 8px; padding: 8px 12px; cursor: pointer;
  }
  header button.nav:hover { border-color: var(--accent-2); }
  .layout { display: flex; flex: 1 1 auto; min-height: 0; }
  aside {
    width: 290px; flex: 0 0 auto; border-right: 1px solid var(--line);
    overflow-y: auto; background: var(--panel); padding: 8px 0;
  }
  .domain-group > .domain-head {
    display: flex; justify-content: space-between; align-items: center; cursor: pointer;
    padding: 8px 16px; color: var(--muted); text-transform: uppercase; font-size: 11px;
    letter-spacing: .6px; font-weight: 700; user-select: none;
  }
  .domain-group > .domain-head:hover { color: var(--text); }
  .domain-head .count { background: var(--chip); border-radius: 10px; padding: 1px 8px; font-size: 11px; }
  .domain-head .hd-left { display: flex; align-items: center; gap: 7px; }
  .domain-head .chev { font-size: 9px; transition: transform .15s; display: inline-block; }
  .domain-group:not(.collapsed) .domain-head .chev { transform: rotate(90deg); }
  .domain-head.activeDomain { color: var(--accent); }
  .crumbs { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
  .crumbs a { color: var(--accent-2); cursor: pointer; }
  .crumbs a:hover { text-decoration: underline; }
  .crumbs .sep { margin: 0 8px; color: var(--line); }
  .entity-link {
    padding: 6px 16px 6px 26px; cursor: pointer; display: flex; gap: 8px; align-items: center;
    border-left: 3px solid transparent;
  }
  .entity-link:hover { background: var(--panel-2); }
  .entity-link.active { background: var(--panel-2); border-left-color: var(--accent); color: var(--accent); }
  .entity-link .dim { color: var(--muted); font-size: 11px; }
  .collapsed .entity-link { display: none; }
  main { flex: 1 1 auto; overflow-y: auto; padding: 22px 28px; min-width: 0; }
  .home h1, .detail h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { color: var(--muted); margin-bottom: 18px; }
  .domain-badge {
    display: inline-block; background: var(--chip); color: var(--accent-2);
    padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
  }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .card {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px;
    cursor: pointer; transition: border-color .15s, transform .05s;
  }
  .card:hover { border-color: var(--accent); transform: translateY(-1px); }
  .card h3 { margin: 0 0 6px; font-size: 15px; }
  .card .meta { color: var(--muted); font-size: 12px; }
  .card ul { margin: 8px 0 0; padding-left: 16px; color: var(--muted); font-size: 12px; }
  .card .card-sum { color: var(--muted); font-size: 12.5px; margin: 8px 0 0; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .narrative { font-size: 15px; line-height: 1.7; background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 12px; padding: 15px 18px; margin: 4px 0 16px; }
  .flow { display: flex; flex-direction: column; gap: 9px; margin: 6px 0 8px; }
  .flow-step { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .flow-node { background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; font-weight: 600; white-space: nowrap; }
  .flow-node.link { cursor: pointer; color: var(--accent-2); border-color: rgba(88,166,255,.35); }
  .flow-node.link:hover { border-color: var(--accent-2); background: #1b2636; }
  .flow-conn { display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: 13px; }
  .flow-conn .flow-arrow { color: var(--accent); font-weight: 700; font-size: 15px; }
  .flow-label { font-style: italic; }
  table.cols { width: 100%; border-collapse: collapse; margin: 6px 0 22px; }
  table.cols th, table.cols td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.cols th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  table.cols td.name { font-weight: 600; white-space: nowrap; }
  table.cols td.type { color: var(--accent); font-family: ui-monospace, Menlo, Consolas, monospace; white-space: nowrap; }
  table.cols td.note { color: var(--muted); }
  .badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 6px; margin-left: 6px; vertical-align: middle; }
  .badge.pk { background: rgba(240,180,41,.15); color: var(--pk); border: 1px solid rgba(240,180,41,.4); }
  .badge.fk { background: rgba(88,166,255,.12); color: var(--fk); border: 1px solid rgba(88,166,255,.4); }
  .badge.null { background: transparent; color: var(--null); border: 1px solid var(--line); }
  a.flink { color: var(--accent-2); cursor: pointer; text-decoration: none; }
  a.flink:hover { text-decoration: underline; }
  h2.section { font-size: 13px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin: 26px 0 10px; border-top: 1px solid var(--line); padding-top: 16px; }
  .rel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  @media (max-width: 900px) { .rel-grid { grid-template-columns: 1fr; } }
  .rel-list { display: flex; flex-direction: column; gap: 6px; }
  .rel-chip {
    display: flex; align-items: center; gap: 8px; background: var(--panel); border: 1px solid var(--line);
    border-radius: 8px; padding: 8px 12px; cursor: pointer;
  }
  .rel-chip:hover { border-color: var(--accent-2); }
  .rel-chip .target { font-weight: 600; }
  .rel-chip .label { color: var(--muted); font-size: 12px; }
  .rel-chip .mult { margin-left: auto; color: var(--accent); font-family: ui-monospace, monospace; font-size: 12px; }
  .empty { color: var(--muted); font-style: italic; }
  svg .node rect { fill: var(--panel-2); stroke: var(--line); cursor: pointer; }
  svg .node:hover rect { stroke: var(--accent-2); }
  svg .node.center rect { fill: #20303f; stroke: var(--accent); }
  svg .node text { fill: var(--text); font-size: 12px; pointer-events: none; }
  svg .edge { stroke: var(--line); fill: none; }
  svg .edge-label { fill: var(--muted); font-size: 10px; }
  .ego { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; margin: 6px 0 8px; overflow: hidden; }
  .info-block { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; }
  .info-block h3 { margin: 0 0 8px; font-size: 14px; }
  .info-block ul { margin: 0; padding-left: 18px; }
  .info-block li { margin-bottom: 8px; }
  .info-block b, .info-block strong { color: var(--text); }
  code { background: var(--panel-2); padding: 1px 5px; border-radius: 5px; font-family: ui-monospace, monospace; font-size: 12px; }
  .hidden { display: none !important; }
  footer { flex: 0 0 auto; padding: 6px 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }
</style>
</head>
<body>
<header>
  <div class="logo">Game<span>ON</span> · Domain Explorer</div>
  <div class="stats">${nEntities} tables · ${nDomains} domains · ${nRels} relationships</div>
  <button class="nav" id="homeBtn">Overview</button>
  <button class="nav" id="convBtn">Conventions</button>
  <div class="search"><input id="search" type="search" placeholder="Search tables &amp; columns…" autocomplete="off" /></div>
</header>
<div class="layout">
  <aside id="sidebar"></aside>
  <main id="main"></main>
</div>
<footer>Generated from <code>docs/erd.md</code> · re-run <code>npm run build:domain-explorer</code> after schema changes · open offline, no network required.</footer>

<script id="data" type="application/json">${dataJson}</script>
<script>
(function () {
  "use strict";
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const byName = new Map(DATA.entities.map(e => [e.name, e]));
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main');
  const searchInput = document.getElementById('search');

  // index relationships per entity
  const refOut = new Map(); // entity -> [{parent,label,mult}]  (this entity references parent)
  const refIn = new Map();  // entity -> [{child,label,mult}]   (child references this entity)
  for (const e of DATA.entities) { refOut.set(e.name, []); refIn.set(e.name, []); }
  for (const r of DATA.relations) {
    if (refOut.has(r.child)) refOut.get(r.child).push({ other: r.parent, label: r.label, mult: r.childMult + ' \\u2192 ' + r.parentMult });
    if (refIn.has(r.parent)) refIn.get(r.parent).push({ other: r.child, label: r.label, mult: r.parentMult + ' \\u2192 ' + r.childMult });
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- Flow diagram (curated narrative steps; nodes that are tables are clickable) ----
  function flowNode(name) {
    return byName.has(name)
      ? '<span class="flow-node link" onclick="goto(\\'' + name + '\\')">' + esc(name) + '</span>'
      : '<span class="flow-node">' + esc(name) + '</span>';
  }
  function flowDiagram(flow) {
    if (!flow || !flow.length) return '';
    const rows = flow.map(s =>
      '<div class="flow-step">' + flowNode(s.from) +
      '<span class="flow-conn"><span class="flow-label">' + esc(s.label) + '</span><span class="flow-arrow">\\u2192</span></span>' +
      flowNode(s.to) + '</div>'
    ).join('');
    return '<div class="flow">' + rows + '</div>';
  }

  // ---- Sidebar ----
  function buildSidebar() {
    sidebar.innerHTML = '';
    for (const domain of DATA.domainOrder) {
      const ents = DATA.entities.filter(e => e.domain === domain);
      const group = document.createElement('div');
      group.className = 'domain-group collapsed';
      group.dataset.domain = domain;
      const head = document.createElement('div');
      head.className = 'domain-head';
      head.innerHTML = '<span class="hd-left"><span class="chev">\\u25B8</span>' + esc(domain) + '</span><span class="count">' + ents.length + '</span>';
      head.onclick = () => { location.hash = 'domain:' + encodeURIComponent(domain); };
      group.appendChild(head);
      for (const e of ents) {
        const link = document.createElement('div');
        link.className = 'entity-link';
        link.dataset.entity = e.name;
        link.innerHTML = '<span>' + esc(e.name) + '</span><span class="dim">' + e.fields.length + '</span>';
        link.onclick = (ev) => { ev.stopPropagation(); location.hash = encodeURIComponent(e.name); };
        group.appendChild(link);
      }
      sidebar.appendChild(group);
    }
  }

  function highlightSidebar(name) {
    for (const el of sidebar.querySelectorAll('.entity-link')) {
      el.classList.toggle('active', el.dataset.entity === name);
    }
  }

  // Accordion: expand only the active domain (or none), collapse the rest.
  function accordion(activeDomain) {
    for (const g of sidebar.querySelectorAll('.domain-group')) {
      const isActive = g.dataset.domain === activeDomain;
      g.classList.toggle('collapsed', !isActive);
      g.querySelector('.domain-head').classList.toggle('activeDomain', isActive);
    }
  }

  // ---- Ego graph (selected entity + direct neighbours) ----
  function egoGraph(entity) {
    const neighbours = [];
    const seen = new Set();
    for (const r of refOut.get(entity.name)) if (!seen.has(r.other)) { seen.add(r.other); neighbours.push({ name: r.other, label: r.label, dir: 'out' }); }
    for (const r of refIn.get(entity.name)) if (!seen.has(r.other)) { seen.add(r.other); neighbours.push({ name: r.other, label: r.label, dir: 'in' }); }
    if (!neighbours.length) return '';
    const W = 760, cx = W / 2, cy = 200, H = 400, rx = 250, ry = 150;
    const n = neighbours.length;
    let edges = '', nodes = '';
    neighbours.forEach((nb, i) => {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + rx * Math.cos(ang), y = cy + ry * Math.sin(ang);
      edges += '<path class="edge" d="M' + cx + ',' + cy + ' L' + x + ',' + y + '" />';
      const mx = (cx + x) / 2, my = (cy + y) / 2;
      edges += '<text class="edge-label" x="' + mx + '" y="' + my + '" text-anchor="middle">' + esc(nb.label) + (nb.dir === 'out' ? ' \\u2197' : ' \\u2199') + '</text>';
      nodes += nodeSvg(nb.name, x, y, false);
    });
    nodes += nodeSvg(entity.name, cx, cy, true);
    return '<div class="ego"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" preserveAspectRatio="xMidYMid meet">' + edges + nodes + '</svg></div>';
  }
  function nodeSvg(name, x, y, center) {
    const w = Math.max(90, name.length * 7.4 + 20), h = 30;
    return '<g class="node' + (center ? ' center' : '') + '"' + (center ? '' : ' onclick="goto(\\'' + name + '\\')"') + '>' +
      '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="7" />' +
      '<text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + esc(name) + '</text></g>';
  }

  // ---- Entity detail ----
  function renderEntity(name) {
    const e = byName.get(name);
    if (!e) { renderHome(); return; }
    accordion(e.domain);
    highlightSidebar(name);

    let cols = '';
    for (const f of e.fields) {
      let badges = '';
      if (f.isPk) badges += '<span class="badge pk">PK</span>';
      if (f.isFk) badges += '<span class="badge fk">FK</span>';
      if (f.nullable) badges += '<span class="badge null">null</span>';
      const nameCell = f.target
        ? '<a class="flink" onclick="goto(\\'' + f.target + '\\')">' + esc(f.name) + '</a>'
        : esc(f.name);
      cols += '<tr><td class="name">' + nameCell + badges + '</td><td class="type">' + esc(f.type) + '</td><td class="note">' + esc(f.note) + '</td></tr>';
    }

    const outs = refOut.get(name), ins = refIn.get(name);
    const relHtml = (arr, verb) => arr.length
      ? arr.map(r => '<div class="rel-chip" onclick="goto(\\'' + r.other + '\\')"><span class="target">' + esc(r.other) + '</span><span class="label">' + esc(verb) + ' ' + esc(r.label) + '</span><span class="mult">' + r.mult + '</span></div>').join('')
      : '<div class="empty">None</div>';

    main.innerHTML =
      '<div class="detail">' +
        '<div class="crumbs"><a onclick="location.hash=\\'\\'">Overview</a><span class="sep">\\u203A</span><a onclick="gotoDomain(\\'' + cssEsc(e.domain) + '\\')">' + esc(e.domain) + '</a><span class="sep">\\u203A</span><span>' + esc(e.name) + '</span></div>' +
        '<h1>' + esc(e.name) + '</h1>' +
        '<div class="sub"><span class="domain-badge">' + esc(e.domain) + '</span> &nbsp; ' + e.fields.length + ' columns</div>' +
        (e.purpose ? '<div class="narrative">' + esc(e.purpose) + '</div>' : '') +
        egoGraph(e) +
        '<h2 class="section">Columns</h2>' +
        '<table class="cols"><thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead><tbody>' + cols + '</tbody></table>' +
        '<h2 class="section">Relationships</h2>' +
        '<div class="rel-grid">' +
          '<div><div class="sub">References (this table\\u2019s foreign keys)</div><div class="rel-list">' + relHtml(outs, '\\u2192') + '</div></div>' +
          '<div><div class="sub">Referenced by</div><div class="rel-list">' + relHtml(ins, '\\u2190') + '</div></div>' +
        '</div>' +
      '</div>';
    main.scrollTop = 0;
  }
  function cssEsc(s) { return String(s).replace(/"/g, '\\\\"'); }

  // ---- Home / overview ----
  function renderHome() {
    highlightSidebar(null);
    accordion(null);
    let cards = '';
    for (const domain of DATA.domainOrder) {
      const ents = DATA.entities.filter(e => e.domain === domain);
      const info = DATA.domainInfo[domain] || {};
      const sum = info.summary ? '<p class="card-sum">' + esc(info.summary) + '</p>' : '';
      cards += '<div class="card" onclick="gotoDomain(\\'' + cssEsc(domain) + '\\')"><h3>' + esc(domain) + '</h3>' +
        '<div class="meta">' + ents.length + ' tables</div>' + sum + '</div>';
    }
    const ov = DATA.overview;
    const ovHtml = ov
      ? '<div class="narrative">' + esc(ov.narrative) + '</div>' +
        '<h2 class="section">The end-to-end journey</h2>' + flowDiagram(ov.flow)
      : '';
    main.innerHTML =
      '<div class="home">' +
        '<h1>How StarterKit works</h1>' +
        '<div class="sub">' + DATA.entityCount + ' tables across ' + DATA.domainOrder.length + ' domains. Start with the journey below, open a domain to read its story, or click any table to see what it\\u2019s for. Table names everywhere are clickable.</div>' +
        ovHtml +
        '<h2 class="section">Domains</h2>' +
        '<div class="cards">' + cards + '</div>' +
      '</div>';
    main.scrollTop = 0;
  }

  // ---- Domain view ----
  function renderDomain(domain) {
    const ents = DATA.entities.filter(e => e.domain === domain);
    if (!ents.length) { renderHome(); return; }
    accordion(domain);
    highlightSidebar(null);
    let cards = '';
    for (const e of ents) {
      const fkCount = e.fields.filter(f => f.isFk).length;
      const purpose = e.purpose ? '<p class="card-sum">' + esc(e.purpose) + '</p>' : '';
      cards += '<div class="card" onclick="goto(\\'' + e.name + '\\')"><h3>' + esc(e.name) + '</h3>' +
        '<div class="meta">' + e.fields.length + ' columns · ' + fkCount + ' FK</div>' + purpose + '</div>';
    }
    const info = DATA.domainInfo[domain] || {};
    const narrative = info.summary ? '<div class="narrative">' + esc(info.summary) + '</div>' : '';
    const flow = (info.flow && info.flow.length) ? '<h2 class="section">How it flows</h2>' + flowDiagram(info.flow) : '';
    const crumb = '<div class="crumbs"><a onclick="location.hash=\\'\\'">Overview</a><span class="sep">\\u203A</span><span>' + esc(domain) + '</span></div>';
    main.innerHTML = '<div class="home">' + crumb + '<h1>' + esc(domain) + '</h1><div class="sub">' + ents.length + ' tables in this domain.</div>' +
      narrative + flow + '<h2 class="section">Tables</h2><div class="cards">' + cards + '</div></div>';
    main.scrollTop = 0;
  }

  // ---- Conventions / design decisions ----
  function renderConventions() {
    highlightSidebar(null);
    let iface = DATA.crossCutting.interfaces.map(i => '<li><b>' + esc(i.name) + '</b> — ' + esc(i.desc) + '</li>').join('');
    let dec = DATA.designDecisions.map(d => '<li>' + (d.term ? '<b>' + esc(d.term) + '</b> — ' : '') + esc(d.text) + '</li>').join('');
    main.innerHTML =
      '<div class="home"><h1>Conventions &amp; key design decisions</h1>' +
        '<div class="info-block"><h3>Cross-cutting fields (on every table unless noted)</h3><ul>' + iface + '</ul></div>' +
        '<div class="info-block"><h3>Key design decisions</h3><ul>' + dec + '</ul></div>' +
      '</div>';
    main.scrollTop = 0;
  }

  // ---- Search ----
  function applySearch(q) {
    q = q.trim().toLowerCase();
    const groups = sidebar.querySelectorAll('.domain-group');
    if (!q) {
      for (const g of groups) { g.classList.remove('hidden'); for (const l of g.querySelectorAll('.entity-link')) l.classList.remove('hidden'); }
      route(); // restore accordion to the current view
      return;
    }
    for (const g of groups) {
      let anyVisible = false;
      for (const link of g.querySelectorAll('.entity-link')) {
        const e = byName.get(link.dataset.entity);
        const hit = e.name.toLowerCase().includes(q) || e.fields.some(f => f.name.toLowerCase().includes(q) || (f.note && f.note.toLowerCase().includes(q)));
        link.classList.toggle('hidden', !hit);
        if (hit) anyVisible = true;
      }
      g.classList.toggle('hidden', !anyVisible);
      if (anyVisible) g.classList.remove('collapsed');
    }
  }

  // ---- Navigation ----
  window.goto = (name) => { location.hash = encodeURIComponent(name); };
  window.gotoDomain = (domain) => { location.hash = 'domain:' + encodeURIComponent(domain); };

  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!h) { renderHome(); return; }
    if (h === 'conventions') { renderConventions(); return; }
    if (h.startsWith('domain:')) { renderDomain(decodeURIComponent(h.slice(7))); return; }
    if (byName.has(h)) { renderEntity(h); return; }
    renderHome();
  }

  document.getElementById('homeBtn').onclick = () => { location.hash = ''; };
  document.getElementById('convBtn').onclick = () => { location.hash = 'conventions'; };
  searchInput.addEventListener('input', () => applySearch(searchInput.value));
  window.addEventListener('hashchange', route);

  buildSidebar();
  route();
})();
</script>
</body>
</html>
`;
}
