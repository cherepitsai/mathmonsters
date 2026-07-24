// Persistence layer. All localStorage reads/writes go through this module,
// wrapped in try/catch, per CLAUDE.md. Dual-exported (browser global +
// module.exports) following the same pattern as game-logic.js/profiles.js.

var STORAGE_KEY = 'mathGameData';
var storageAvailable = true;

function getDefaultData() {
  return { schemaVersion: 1, profiles: [] };
}

var REQUIRED_OPS = ['add', 'sub', 'mul', 'div'];

function isValidOperationSettings(s) {
  return !!s && typeof s === 'object' &&
    typeof s.enabled === 'boolean' &&
    Array.isArray(s.numbers) &&
    typeof s.gt10 === 'boolean';
}

// Structural validation: returns true/false, never throws.
function isValidDataShape(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }
  if (parsed.schemaVersion !== 1) {
    return false;
  }
  if (!Array.isArray(parsed.profiles)) {
    return false;
  }
  for (var i = 0; i < parsed.profiles.length; i++) {
    var profile = parsed.profiles[i];
    if (!profile || typeof profile !== 'object') {
      return false;
    }
    if (typeof profile.id !== 'string') {
      return false;
    }
    if (typeof profile.name !== 'string') {
      return false;
    }
    if (typeof profile.letter !== 'string') {
      return false;
    }
    if (!profile.settings || typeof profile.settings !== 'object') {
      return false;
    }
    for (var j = 0; j < REQUIRED_OPS.length; j++) {
      if (!isValidOperationSettings(profile.settings[REQUIRED_OPS[j]])) {
        return false;
      }
    }
    if (!profile.stats || typeof profile.stats !== 'object' || !Array.isArray(profile.stats.facts)) {
      return false;
    }
  }
  return true;
}

function resolveStorageImpl(storageImpl) {
  if (storageImpl !== undefined) {
    return storageImpl;
  }
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

// storageImpl defaults to the global localStorage if defined, else null.
function loadData(storageImpl) {
  var impl = resolveStorageImpl(storageImpl);
  if (!impl) {
    storageAvailable = false;
    return getDefaultData();
  }

  try {
    var raw = impl.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return getDefaultData();
    }
    try {
      var parsed = JSON.parse(raw);
      if (isValidDataShape(parsed)) {
        return parsed;
      }
      return getDefaultData();
    } catch (parseErr) {
      return getDefaultData();
    }
  } catch (readErr) {
    storageAvailable = false;
    return getDefaultData();
  }
}

function saveData(data, storageImpl) {
  var impl = resolveStorageImpl(storageImpl);
  if (!impl) {
    storageAvailable = false;
    return false;
  }

  try {
    impl.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (writeErr) {
    storageAvailable = false;
    return false;
  }
}

function isStorageAvailable() {
  return storageAvailable;
}

function exportBackup(data) {
  return JSON.stringify(data, null, 2);
}

// Parses and structurally validates an imported backup string. Throws a
// descriptive Error if either step fails; otherwise returns the parsed
// data object.
function parseImportedBackup(jsonString) {
  var parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (parseErr) {
    throw new Error('Файл повреждён или не является корректным JSON.');
  }
  if (!isValidDataShape(parsed)) {
    throw new Error('Файл не соответствует формату резервной копии.');
  }
  return parsed;
}

if (typeof module !== 'undefined') {
  module.exports = {
    STORAGE_KEY: STORAGE_KEY,
    getDefaultData: getDefaultData,
    isValidDataShape: isValidDataShape,
    loadData: loadData,
    saveData: saveData,
    isStorageAvailable: isStorageAvailable,
    exportBackup: exportBackup,
    parseImportedBackup: parseImportedBackup
  };
}
