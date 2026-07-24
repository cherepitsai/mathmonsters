// Pure profile/settings/stats logic. No DOM access. Usable both as a
// browser global script and as a Node-requireable module (see export guard
// below), following the same dual-export pattern as game-logic.js.

var OP_ORDER = ['add', 'sub', 'mul', 'div'];
var OP_NAMES = { add: 'Сложение', sub: 'Вычитание', mul: 'Умножение', div: 'Деление' };
var OP_SYMBOLS = { add: '+', sub: '−', mul: '×', div: '÷' };

function getProfileLetter(name) {
  return name.trim().charAt(0).toUpperCase();
}

function makeDefaultSettings() {
  return {
    add: { enabled: true, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], gt10: false },
    sub: { enabled: false, numbers: [], gt10: false },
    mul: { enabled: false, numbers: [], gt10: false },
    div: { enabled: false, numbers: [], gt10: false }
  };
}

// Creates a new Profile object per AC8/AC9: Addition enabled with numbers
// 1-10 (gt10 false); Subtraction/Multiplication/Division disabled with
// empty numbers/gt10 false; stats.facts is empty.
function createProfile(name) {
  var trimmed = name.trim();
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: trimmed,
    letter: getProfileLetter(name),
    settings: makeDefaultSettings(),
    stats: { facts: [] }
  };
}

function findProfileById(data, profileId) {
  return data.profiles.find(function (p) { return p.id === profileId; });
}

function addProfileToData(data, profile) {
  data.profiles.push(profile);
  return data;
}

function setOperationEnabled(profile, op, enabled) {
  profile.settings[op].enabled = enabled;
}

function toggleNumber(profile, op, number, checked) {
  var numbers = profile.settings[op].numbers;
  var idx = numbers.indexOf(number);
  if (checked) {
    if (idx === -1) {
      numbers.push(number);
    }
  } else if (idx !== -1) {
    numbers.splice(idx, 1);
  }
}

function toggleGt10(profile, op, checked) {
  profile.settings[op].gt10 = checked;
}

function bucketOf(n) {
  return n <= 10 ? n : 'gt10';
}

// Returns the profile's real, saved-settings-derived question pool:
// Array<{op, bucket}>, one slot per checked number plus one slot per
// checked gt10, only for operations whose master checkbox is enabled.
function getEnabledBuckets(profile) {
  var buckets = [];
  for (var i = 0; i < OP_ORDER.length; i++) {
    var op = OP_ORDER[i];
    var s = profile.settings[op];
    if (!s.enabled) {
      continue;
    }
    for (var j = 0; j < s.numbers.length; j++) {
      buckets.push({ op: op, bucket: s.numbers[j] });
    }
    if (s.gt10) {
      buckets.push({ op: op, bucket: 'gt10' });
    }
  }
  return buckets;
}

// Fixed 10-slot "Addition 1-10" fallback pool, independent of any profile.
// Callers must use this instead of getEnabledBuckets output only when that
// array is empty, and must never write it back to the profile.
function getFallbackBuckets() {
  var buckets = [];
  for (var n = 1; n <= 10; n++) {
    buckets.push({ op: 'add', bucket: n });
  }
  return buckets;
}

// Finds the fact in profile.stats.facts matching (op, n, other), creating
// it with {attempts:0, correct:0} if absent; increments attempts by 1
// always, increments correct by 1 only if wasFirstTryCorrect.
function recordAttempt(profile, op, n, other, wasFirstTryCorrect) {
  var fact = profile.stats.facts.find(function (f) {
    return f.op === op && f.n === n && f.other === other;
  });
  if (!fact) {
    fact = { op: op, n: n, other: other, attempts: 0, correct: 0 };
    profile.stats.facts.push(fact);
  }
  fact.attempts += 1;
  if (wasFirstTryCorrect) {
    fact.correct += 1;
  }
  return fact;
}

// Groups profile.stats.facts by (op, bucketOf(n)), summing attempts/correct.
// Returns Array<{op, bucket, attempts, correct}> sorted by fixed operation
// order (add, sub, mul, div) then bucket ascending with 'gt10' last; omits
// any category with zero total attempts.
function aggregateCategories(profile) {
  var map = {};
  var order = [];
  profile.stats.facts.forEach(function (fact) {
    var bucket = bucketOf(fact.n);
    var key = fact.op + '|' + bucket;
    if (!map[key]) {
      map[key] = { op: fact.op, bucket: bucket, attempts: 0, correct: 0 };
      order.push(key);
    }
    map[key].attempts += fact.attempts;
    map[key].correct += fact.correct;
  });

  var result = order.map(function (key) { return map[key]; }).filter(function (entry) {
    return entry.attempts > 0;
  });

  result.sort(function (a, b) {
    var opDiff = OP_ORDER.indexOf(a.op) - OP_ORDER.indexOf(b.op);
    if (opDiff !== 0) {
      return opDiff;
    }
    if (a.bucket === 'gt10' && b.bucket === 'gt10') {
      return 0;
    }
    if (a.bucket === 'gt10') {
      return 1;
    }
    if (b.bucket === 'gt10') {
      return -1;
    }
    return a.bucket - b.bucket;
  });

  return result;
}

// Returns every fact in profile.stats.facts matching (op, bucketOf(n) ===
// bucket), each annotated with a label string per factLabel(op, n, other).
function getFactsForCategory(profile, op, bucket) {
  return profile.stats.facts
    .filter(function (f) { return f.op === op && bucketOf(f.n) === bucket; })
    .map(function (f) {
      return {
        op: f.op,
        n: f.n,
        other: f.other,
        attempts: f.attempts,
        correct: f.correct,
        label: factLabel(f.op, f.n, f.other)
      };
    });
}

// Pure formatting helper. `other` is the minuend for subtraction and the
// quotient for division (n * other is the dividend), per the data model.
function factLabel(op, n, other) {
  switch (op) {
    case 'add':
      return n + '+' + other;
    case 'mul':
      return n + '×' + other;
    case 'sub':
      return other + '−' + n;
    case 'div':
      return (n * other) + '÷' + n;
    default:
      return '';
  }
}

// Pure formatting helper, e.g. "Умножение ×3", "Умножение >10".
function categoryLabel(op, bucket) {
  var name = OP_NAMES[op];
  if (bucket === 'gt10') {
    return name + ' >10';
  }
  return name + ' ' + OP_SYMBOLS[op] + bucket;
}

if (typeof module !== 'undefined') {
  module.exports = {
    createProfile: createProfile,
    getProfileLetter: getProfileLetter,
    findProfileById: findProfileById,
    addProfileToData: addProfileToData,
    setOperationEnabled: setOperationEnabled,
    toggleNumber: toggleNumber,
    toggleGt10: toggleGt10,
    getEnabledBuckets: getEnabledBuckets,
    getFallbackBuckets: getFallbackBuckets,
    bucketOf: bucketOf,
    recordAttempt: recordAttempt,
    aggregateCategories: aggregateCategories,
    getFactsForCategory: getFactsForCategory,
    factLabel: factLabel,
    categoryLabel: categoryLabel
  };
}
