const assert = require('assert');
const {
  getDefaultData,
  loadData,
  saveData,
  isStorageAvailable,
  exportBackup,
  parseImportedBackup
} = require('../storage.js');

// Simple in-memory mock in place of a real localStorage.
function createMockStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    }
  };
}

function createThrowingStorage() {
  return {
    getItem() {
      throw new Error('storage unavailable');
    },
    setItem() {
      throw new Error('storage unavailable');
    }
  };
}

function makeSampleData() {
  return {
    schemaVersion: 1,
    profiles: [
      {
        id: 'abc123',
        name: 'Маша',
        letter: 'М',
        settings: {
          add: { enabled: true, numbers: [1, 2, 3], gt10: false },
          sub: { enabled: false, numbers: [], gt10: false },
          mul: { enabled: false, numbers: [], gt10: false },
          div: { enabled: false, numbers: [], gt10: false }
        },
        stats: { facts: [{ op: 'add', n: 1, other: 5, attempts: 2, correct: 1 }] }
      }
    ]
  };
}

// AC3: loadData returns getDefaultData() on a fresh/empty mock store.
function testLoadDataReturnsDefaultOnEmptyStore() {
  const mockStorage = createMockStorage();
  const result = loadData(mockStorage);
  assert.deepStrictEqual(result, getDefaultData());
}

// AC27/AC28: saveData followed by loadData round-trips a populated data
// blob exactly.
function testSaveThenLoadRoundTrips() {
  const mockStorage = createMockStorage();
  const data = makeSampleData();

  const saveResult = saveData(data, mockStorage);
  assert.strictEqual(saveResult, true);

  const loaded = loadData(mockStorage);
  assert.deepStrictEqual(loaded, data);
}

// Resolved Decision #6: loadData/saveData catch a throwing mock store,
// return/report gracefully, and isStorageAvailable() reflects the failure.
function testThrowingStorageDegradesGracefully() {
  const throwingStorage = createThrowingStorage();

  const loaded = loadData(throwingStorage);
  assert.deepStrictEqual(loaded, getDefaultData());
  assert.strictEqual(isStorageAvailable(), false);

  const saveResult = saveData(makeSampleData(), throwingStorage);
  assert.strictEqual(saveResult, false);
  assert.strictEqual(isStorageAvailable(), false);
}

// AC30/AC31: exportBackup output is valid JSON that parseImportedBackup
// accepts and reproduces the original data.
function testExportThenParseImportReproducesData() {
  const data = makeSampleData();
  const json = exportBackup(data);
  const parsed = parseImportedBackup(json);
  assert.deepStrictEqual(parsed, data);
}

// AC32: parseImportedBackup throws on malformed JSON and on structurally
// invalid (but parseable) JSON, without touching any existing data.
function testParseImportedBackupRejectsInvalidInput() {
  assert.throws(() => parseImportedBackup('{ this is not valid json'), /.*/);
  assert.throws(() => parseImportedBackup(JSON.stringify({ foo: 'bar' })), /.*/);
  assert.throws(() => parseImportedBackup(JSON.stringify({ schemaVersion: 1, profiles: 'not-an-array' })), /.*/);
}

module.exports = {
  testLoadDataReturnsDefaultOnEmptyStore,
  testSaveThenLoadRoundTrips,
  testThrowingStorageDegradesGracefully,
  testExportThenParseImportReproducesData,
  testParseImportedBackupRejectsInvalidInput
};
