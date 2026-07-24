// Acceptance-criteria-focused tests, supplementing tests/game-logic.test.js.
// Only covers angles from story.md's AC1/AC9 phrasing not already exercised
// by game-logic.test.js (see .feature-work/test-report.md for the mapping).
const assert = require('assert');
const { generateMultiplicationQuestion, buildAnswerOptions } = require('../game-logic.js');

// AC1 (superseded by AC16 for multiplication): "one factor is randomly
// chosen from 1-10 and the other from 1-20." generateMultiplicationQuestion
// no longer picks its own fixed factor (the caller supplies N via
// pickBucketAndGenerateQuestion), so this test drives N across 1-10 and
// confirms the random second factor genuinely exercises the full 1-20
// range (not just the overlapping 1-10 sub-range).
function testAC1SecondFactorRangeGenuinelyExceeds10() {
  let sawFactorAbove10 = false;
  let sawFactorAtOrBelow10 = false;

  for (let i = 0; i < 500; i++) {
    const n = (i % 10) + 1;
    const q = generateMultiplicationQuestion(n);
    if (q.displayFirst > 10 || q.displaySecond > 10) {
      sawFactorAbove10 = true;
    }
    if (q.displayFirst <= 10 || q.displaySecond <= 10) {
      sawFactorAtOrBelow10 = true;
    }
  }

  assert.ok(
    sawFactorAbove10,
    'expected at least one factor greater than 10 to appear across 500 runs (proves the 1-20 range is genuinely used, not just 1-10)'
  );
  assert.ok(
    sawFactorAtOrBelow10,
    'expected at least one factor <=10 to appear across 500 runs'
  );
}

// AC9: "The 4 answer options for any given question never contain duplicate
// values, and exactly one of them equals the correct product." game-logic.
// test.js checks this for a single fixed correctAnswer (42) once.
// This test checks it across many real generateMultiplicationQuestion() ->
// buildAnswerOptions() cycles (matching "for any given question" in the AC
// wording), plus the story.md edge case where both random factors are equal
// (e.g. 5 x 5 = 25).
function testAC9NeverDuplicateExactlyOneCorrectAcrossManyRuns() {
  for (let i = 0; i < 500; i++) {
    const n = (i % 10) + 1;
    const q = generateMultiplicationQuestion(n);
    const options = buildAnswerOptions('mul', q.correctAnswer);

    assert.strictEqual(options.length, 4, 'run ' + i + ': expected exactly 4 options');

    const values = options.map((o) => o.value);
    assert.strictEqual(
      new Set(values).size,
      4,
      'run ' + i + ': expected all 4 option values to be distinct (correctAnswer=' + q.correctAnswer + ')'
    );

    const correctCount = options.filter((o) => o.isCorrect).length;
    assert.strictEqual(
      correctCount,
      1,
      'run ' + i + ': expected exactly one correct option (correctAnswer=' + q.correctAnswer + ')'
    );
  }

  // Edge case from story.md: both random factors happen to be equal (5 x 5 = 25).
  const equalFactorsOptions = buildAnswerOptions('mul', 25);
  const equalValues = equalFactorsOptions.map((o) => o.value);
  assert.strictEqual(
    new Set(equalValues).size,
    4,
    'equal-factors edge case (5x5=25): expected 4 distinct option values'
  );
  assert.strictEqual(
    equalFactorsOptions.filter((o) => o.isCorrect).length,
    1,
    'equal-factors edge case (5x5=25): expected exactly one correct option'
  );
}

module.exports = {
  testAC1SecondFactorRangeGenuinelyExceeds10,
  testAC9NeverDuplicateExactlyOneCorrectAcrossManyRuns
};
