/**
 * build-offline.js — Assemble le dossier www/ pour l'app Android (Capacitor).
 *
 * 1. Vide www/
 * 2. Copie tout public/ -> www/
 * 3. Copie les modules métier purs de src/ -> www/src/
 * 4. Injecte les <script> offline dans chaque page HTML, AVANT le premier
 *    script existant, pour que le shim d'API locale soit actif avant que le
 *    front n'appelle fetch('/api/...').
 *
 * Le dossier public/ (mode web/serveur) n'est PAS modifié : il continue de
 * fonctionner normalement avec Express.
 *
 * Usage : node build-offline.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const SRC_DIR = path.join(ROOT, 'src');
const WWW_DIR = path.join(ROOT, 'www');

// Modules métier purs requis par l'API locale (double-export navigateur).
const PURE_MODULES = [
  'seed.js',
  'attribution.js',
  'whatsapp.js',
  'antifraud.js',
  'billing.js',
  'establishments.js',
];

const HTML_PAGES = ['index.html', 'product.html', 'dashboard.html', 'login.html', 'manage.html'];

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

// Balises injectées avant le premier <script> de chaque page.
const OFFLINE_SCRIPTS = [
  '/src/seed.js',
  '/src/attribution.js',
  '/src/whatsapp.js',
  '/src/antifraud.js',
  '/src/billing.js',
  '/src/establishments.js',
  '/offline/store.local.js',
  '/offline/auth.local.js',
  '/offline/api.js',
];

function buildScriptTags() {
  return OFFLINE_SCRIPTS.map((s) => `    <script src="${s}"></script>`).join('\n') + '\n    ';
}

function injectScripts(html) {
  const marker = '<script';
  const idx = html.indexOf(marker);
  if (idx === -1) return html;
  return html.slice(0, idx) + buildScriptTags() + html.slice(idx);
}

function main() {
  console.log('[build-offline] Nettoyage de www/ ...');
  rmrf(WWW_DIR);

  console.log('[build-offline] Copie de public/ -> www/ ...');
  copyDir(PUBLIC_DIR, WWW_DIR);

  console.log('[build-offline] Copie des modules métier -> www/src/ ...');
  const destSrc = path.join(WWW_DIR, 'src');
  fs.mkdirSync(destSrc, { recursive: true });
  for (const mod of PURE_MODULES) {
    fs.copyFileSync(path.join(SRC_DIR, mod), path.join(destSrc, mod));
  }

  console.log('[build-offline] Injection des scripts offline dans les pages ...');
  for (const page of HTML_PAGES) {
    const file = path.join(WWW_DIR, page);
    if (!fs.existsSync(file)) {
      console.warn(`[build-offline] Page absente, ignorée : ${page}`);
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    const updated = injectScripts(html);
    fs.writeFileSync(file, updated, 'utf8');
  }

  console.log('[build-offline] Terminé. Dossier www/ prêt pour Capacitor.');
}

main();
