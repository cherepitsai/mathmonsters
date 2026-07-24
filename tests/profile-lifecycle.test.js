// End-to-end pure-logic acceptance tests: chains createProfile ->
// toggle settings -> getEnabledBuckets -> pickBucketAndGenerateQuestion ->
// recordAttempt -> aggregateCategories, exercising the full pipeline the
// same way script.js wires these modules together, rather than testing
// each function in isolation (see tests/profiles.test.js/
// tests/question-generator.test.js for the per-function unit tests).
const assert = require('assert');
const profilesModule = require('../profiles.js');
const {
  createProfile,
  getEnabledBuckets,
  getFallbackBuckets,
  recordAttempt,
  aggregateCategories,
  getFactsForCategory
} = profilesModule;
const { pickBucketAndGenerateQuestion } = require('../game-logic.js');

// AC5/AC12/AC13/AC15/AC22/AC25 acting together: a profile configured to
// only Multiplication x3 must draw only mul/3 questions, and the stats
// built up from real recordAttempt calls (using the actual randomly
// generated `other` values from pickBucketAndGenerateQuestion, not fixed
// stubs) must aggregate exactly back to the manually tracked totals.
function testFullProfileLifecycleQuizFlow() {
  const profile = createProfile('Ольга');

  profile.settings.add.enabled = false; // turn off the AC9 default-on op
  profile.settings.mul.enabled = true;
  profile.settings.mul.numbers = [3];

  const buckets = getEnabledBuckets(profile);
  assert.deepStrictEqual(buckets, [{ op: 'mul', bucket: 3 }]);

  const manualTotals = {}; // key "n|other" -> {attempts, correct}
  let totalAttempts = 0;
  let totalCorrect = 0;

  for (let i = 0; i < 300; i++) {
    const q = pickBucketAndGenerateQuestion(buckets);
    assert.strictEqual(q.op, 'mul', 'every question drawn from a mul-only pool must be mul');
    assert.strictEqual(q.n, 3, 'every question drawn from this pool must use fixed number 3');

    const wasFirstTryCorrect = i % 3 !== 0; // vary correct / wrong-then-correct
    recordAttempt(profile, q.op, q.n, q.other, wasFirstTryCorrect);

    const key = q.n + '|' + q.other;
    if (!manualTotals[key]) {
      manualTotals[key] = { attempts: 0, correct: 0 };
    }
    manualTotals[key].attempts += 1;
    if (wasFirstTryCorrect) {
      manualTotals[key].correct += 1;
    }
    totalAttempts += 1;
    if (wasFirstTryCorrect) {
      totalCorrect += 1;
    }
  }

  const categories = aggregateCategories(profile);
  assert.strictEqual(categories.length, 1, 'only the played category should appear (AC26)');
  assert.strictEqual(categories[0].op, 'mul');
  assert.strictEqual(categories[0].bucket, 3);
  assert.strictEqual(categories[0].attempts, totalAttempts);
  assert.strictEqual(categories[0].correct, totalCorrect);

  const facts = getFactsForCategory(profile, 'mul', 3);
  const factAttemptSum = facts.reduce(function (sum, f) { return sum + f.attempts; }, 0);
  const factCorrectSum = facts.reduce(function (sum, f) { return sum + f.correct; }, 0);
  assert.strictEqual(factAttemptSum, categories[0].attempts, 'category total must equal sum of its facts (AC25)');
  assert.strictEqual(factCorrectSum, categories[0].correct, 'category total must equal sum of its facts (AC25)');

  facts.forEach(function (f) {
    const key = f.n + '|' + f.other;
    assert.strictEqual(f.attempts, manualTotals[key].attempts);
    assert.strictEqual(f.correct, manualTotals[key].correct);
  });
}

// AC21 end-to-end: a profile with every operation disabled (including the
// default-on Addition) must yield an empty real pool; an entire play
// session drawn from getFallbackBuckets() (and recorded via recordAttempt,
// exactly as script.js's nextQuestion()/handleAnswerTap() would) must never
// alter the profile's saved settings, and getEnabledBuckets(profile) must
// still report zero afterward.
function testFallbackPoolNeverMutatesSavedSettingsEndToEnd() {
  const profile = createProfile('Игорь');

  ['add', 'sub', 'mul', 'div'].forEach(function (op) {
    profile.settings[op].enabled = false;
  });
  profile.settings.add.numbers = [];

  const settingsSnapshotBefore = JSON.parse(JSON.stringify(profile.settings));

  const enabledBuckets = getEnabledBuckets(profile);
  assert.deepStrictEqual(enabledBuckets, [], 'zero-enabled profile must produce an empty real pool');

  const fallbackBuckets = getFallbackBuckets();
  assert.strictEqual(fallbackBuckets.length, 10);

  for (let i = 0; i < 100; i++) {
    const q = pickBucketAndGenerateQuestion(fallbackBuckets);
    assert.strictEqual(q.op, 'add', 'fallback pool is addition-only');
    assert.ok(q.n >= 1 && q.n <= 10, 'fallback pool only uses numbers 1-10');
    recordAttempt(profile, q.op, q.n, q.other, i % 2 === 0);
  }

  assert.deepStrictEqual(
    profile.settings,
    settingsSnapshotBefore,
    'an entire fallback play session must never alter the profile\'s saved settings (AC21)'
  );

  assert.deepStrictEqual(
    getEnabledBuckets(profile),
    [],
    'saved settings must still yield zero enabled buckets after a fallback session (fallback pool must not leak back into saved settings)'
  );
}

// AC25/AC26 as a general invariant (not a single fixed example): after
// recording many attempts across random ops/numbers/outcomes, every
// category's attempts/correct must equal exactly the sum of the individual
// facts beneath it, with no independent category-level state, and every
// reported category must have at least one attempt.
function testCategorySumInvariantAcrossManyRandomFacts() {
  const profile = createProfile('Т');
  const ops = ['add', 'sub', 'mul', 'div'];
  const numbers = [1, 2, 5, 9, 10, 12, 17, 20];

  for (let i = 0; i < 500; i++) {
    const op = ops[i % ops.length];
    const n = numbers[Math.floor(Math.random() * numbers.length)];
    const other = Math.floor(Math.random() * 20) + 1;
    const wasFirstTryCorrect = Math.random() < 0.5;
    recordAttempt(profile, op, n, other, wasFirstTryCorrect);
  }

  const categories = aggregateCategories(profile);
  assert.ok(categories.length > 0, 'expected at least one category after 500 recorded attempts');

  categories.forEach(function (cat) {
    const facts = getFactsForCategory(profile, cat.op, cat.bucket);
    const attemptsSum = facts.reduce(function (sum, f) { return sum + f.attempts; }, 0);
    const correctSum = facts.reduce(function (sum, f) { return sum + f.correct; }, 0);
    assert.strictEqual(cat.attempts, attemptsSum, 'category attempts must be exactly the sum of its facts: ' + cat.op + '/' + cat.bucket);
    assert.strictEqual(cat.correct, correctSum, 'category correct must be exactly the sum of its facts: ' + cat.op + '/' + cat.bucket);
    assert.ok(cat.attempts > 0, 'AC26: zero-attempt categories must never be reported');
  });

  // Recompute expected totals directly from profile.stats.facts (the single
  // source of truth per spec.md's data model) to prove aggregateCategories
  // carries no state of its own independent of the underlying facts.
  const expected = {};
  profile.stats.facts.forEach(function (f) {
    const bucket = f.n <= 10 ? f.n : 'gt10';
    const key = f.op + '|' + bucket;
    if (!expected[key]) {
      expected[key] = { attempts: 0, correct: 0 };
    }
    expected[key].attempts += f.attempts;
    expected[key].correct += f.correct;
  });
  categories.forEach(function (cat) {
    const key = cat.op + '|' + cat.bucket;
    assert.strictEqual(cat.attempts, expected[key].attempts);
    assert.strictEqual(cat.correct, expected[key].correct);
  });
}

// AC7's only pure-logic angle: profiles.js must not expose any function to
// delete or rename an existing profile (deleting/renaming is confirmed out
// of scope). This can't prove the UI has no such affordance, but it does
// prove the logic layer offers no such capability at all.
function testNoDeleteOrRenameAffordanceInProfilesModule() {
  const exportedNames = Object.keys(profilesModule);
  const forbiddenPattern = /delete|remove|rename/i;
  const offending = exportedNames.filter(function (name) { return forbiddenPattern.test(name); });
  assert.deepStrictEqual(
    offending,
    [],
    'profiles.js must not expose any delete/remove/rename function (AC7): found ' + JSON.stringify(offending)
  );
}

module.exports = {
  testFullProfileLifecycleQuizFlow,
  testFallbackPoolNeverMutatesSavedSettingsEndToEnd,
  testCategorySumInvariantAcrossManyRandomFacts,
  testNoDeleteOrRenameAffordanceInProfilesModule
};
