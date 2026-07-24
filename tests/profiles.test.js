const assert = require('assert');
const {
  createProfile,
  getEnabledBuckets,
  getFallbackBuckets,
  recordAttempt,
  aggregateCategories,
  getFactsForCategory
} = require('../profiles.js');

// AC8/AC9: default settings and zeroed stats.
function testCreateProfileDefaults() {
  const profile = createProfile('Маша');

  assert.strictEqual(profile.name, 'Маша');
  assert.strictEqual(profile.letter, 'М');

  assert.strictEqual(profile.settings.add.enabled, true);
  assert.deepStrictEqual(profile.settings.add.numbers.slice().sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.strictEqual(profile.settings.add.gt10, false);

  ['sub', 'mul', 'div'].forEach((op) => {
    assert.strictEqual(profile.settings[op].enabled, false, op + ' should start disabled');
    assert.deepStrictEqual(profile.settings[op].numbers, [], op + ' should start with no numbers');
    assert.strictEqual(profile.settings[op].gt10, false, op + ' gt10 should start false');
  });

  assert.deepStrictEqual(profile.stats.facts, [], 'a new profile should have zero recorded facts');
}

// AC12/AC15: enabled buckets reflect only enabled operations' checked
// numbers/gt10; a fully-configured-but-disabled operation contributes
// nothing.
function testGetEnabledBuckets() {
  const profile = createProfile('Петя');
  profile.settings.add.enabled = true;
  profile.settings.add.numbers = [2, 4];
  profile.settings.add.gt10 = true;

  profile.settings.mul.enabled = false;
  profile.settings.mul.numbers = [3, 5, 7];
  profile.settings.mul.gt10 = true;

  const buckets = getEnabledBuckets(profile);

  const addBuckets = buckets.filter((b) => b.op === 'add');
  assert.strictEqual(addBuckets.length, 3, 'expected 2 numbers + 1 gt10 slot for add');
  assert.ok(addBuckets.some((b) => b.bucket === 2));
  assert.ok(addBuckets.some((b) => b.bucket === 4));
  assert.ok(addBuckets.some((b) => b.bucket === 'gt10'));

  const mulBuckets = buckets.filter((b) => b.op === 'mul');
  assert.strictEqual(mulBuckets.length, 0, 'disabled operation must contribute zero buckets despite configured numbers');
}

// AC21: fixed fallback pool, independent of profile input.
function testGetFallbackBuckets() {
  const buckets = getFallbackBuckets();
  assert.strictEqual(buckets.length, 10);
  for (let n = 1; n <= 10; n++) {
    assert.ok(buckets.some((b) => b.op === 'add' && b.bucket === n), 'expected an add bucket for ' + n);
  }
  assert.ok(buckets.every((b) => b.op === 'add'), 'fallback pool must be addition-only');

  // Must not depend on any profile's saved settings.
  const profile = createProfile('X');
  profile.settings.add.enabled = false;
  profile.settings.add.numbers = [];
  const bucketsAgain = getFallbackBuckets();
  assert.deepStrictEqual(bucketsAgain, buckets);
}

// AC22: attempts increment every call; correct only increments on
// first-try-correct calls, across repeated calls for the same fact.
function testRecordAttempt() {
  const profile = createProfile('X');

  recordAttempt(profile, 'mul', 3, 7, false); // wrong-then-correct
  recordAttempt(profile, 'mul', 3, 7, true); // first-try correct
  recordAttempt(profile, 'mul', 3, 7, true); // first-try correct

  const fact = profile.stats.facts.find((f) => f.op === 'mul' && f.n === 3 && f.other === 7);
  assert.strictEqual(fact.attempts, 3);
  assert.strictEqual(fact.correct, 2);
}

// AC25/AC26: category sums always equal underlying facts' totals; zero
// -attempt categories are omitted.
function testAggregateCategories() {
  const profile = createProfile('X');
  recordAttempt(profile, 'mul', 3, 2, true);
  recordAttempt(profile, 'mul', 3, 5, false);
  recordAttempt(profile, 'mul', 14, 2, true); // bucketed into 'gt10'

  const categories = aggregateCategories(profile);

  const mul3 = categories.find((c) => c.op === 'mul' && c.bucket === 3);
  assert.strictEqual(mul3.attempts, 2);
  assert.strictEqual(mul3.correct, 1);

  const mulGt10 = categories.find((c) => c.op === 'mul' && c.bucket === 'gt10');
  assert.strictEqual(mulGt10.attempts, 1);
  assert.strictEqual(mulGt10.correct, 1);

  // No add/sub/div facts recorded — those categories must not appear.
  assert.ok(!categories.some((c) => c.op === 'add'));
  assert.ok(!categories.some((c) => c.op === 'sub'));
  assert.ok(!categories.some((c) => c.op === 'div'));
}

// AC23/AC24: 11-20 numbers grouped into the single 'gt10' bucket; 1-10
// numbers grouped into their own individual buckets.
function testGetFactsForCategory() {
  const profile = createProfile('X');
  recordAttempt(profile, 'div', 4, 3, true);
  recordAttempt(profile, 'div', 15, 2, true);
  recordAttempt(profile, 'div', 18, 5, false);

  const bucket4Facts = getFactsForCategory(profile, 'div', 4);
  assert.strictEqual(bucket4Facts.length, 1);
  assert.strictEqual(bucket4Facts[0].n, 4);

  const gt10Facts = getFactsForCategory(profile, 'div', 'gt10');
  assert.strictEqual(gt10Facts.length, 2);
  assert.ok(gt10Facts.every((f) => f.n > 10));
}

module.exports = {
  testCreateProfileDefaults,
  testGetEnabledBuckets,
  testGetFallbackBuckets,
  testRecordAttempt,
  testAggregateCategories,
  testGetFactsForCategory
};
