const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * S'assure que le dossier data/ existe.
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Charge une collection depuis un fichier JSON.
 * Si le fichier n'existe pas, il est créé avec la valeur par défaut fournie.
 * @param {string} name Nom du fichier (sans extension), ex: "clickLogs"
 * @param {*} defaultValue Valeur utilisée si le fichier est absent ou corrompu
 * @returns {*} La collection chargée
 */
function loadCollection(name, defaultValue = []) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    saveCollection(name, defaultValue);
    return structuredClone(defaultValue);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    // Fichier corrompu : on repart d'une base saine sans écraser aveuglément.
    console.warn(`[store] Impossible de lire ${name}.json (${err.message}). Valeur par défaut utilisée.`);
    return structuredClone(defaultValue);
  }
}

/**
 * Écrit une collection dans un fichier JSON de manière atomique
 * (écriture dans un fichier temporaire puis renommage).
 * @param {string} name Nom du fichier (sans extension)
 * @param {*} data Données à persister
 */
function saveCollection(name, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${name}.json`);
  const tmpPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`[store] Échec de sauvegarde de ${name}.json : ${err.message}`);
    if (fs.existsSync(tmpPath)) {
      fs.rmSync(tmpPath, { force: true });
    }
    throw err;
  }
}

module.exports = {
  DATA_DIR,
  loadCollection,
  saveCollection,
};
