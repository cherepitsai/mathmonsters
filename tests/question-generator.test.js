const assert = require('assert');
const {
  generateAdditionQuestion,
  generateSubtractionQuestion,
  generateMultiplicationQuestion,
  generateDivisionQuestion,
  pickBucketAndGenerateQuestion,
  generateDistractors,
  buildAnswerOptions
} = require('../game-logic.js');

// AC16-19: subtraction/division correct answers are always >= 0 and always
// whole numbers; addition/multiplication correct answers match
// displayFirst/displaySecond combined per the operator.
function testCorrectAnswerInvariants() {
  for (let i = 0; i < 500; i++) {
    const n = ((i % 10) + 1);

    const add = generateAdditionQuestion(n);
    assert.strictEqual(add.correctAnswer, add.displayFirst + add.displaySecond);
    assert.strictEqual(Number.isInteger(add.correctAnswer), true);

    const mul = generateMultiplicationQuestion(n);
    assert.strictEqual(mul.correctAnswer, mul.displayFirst * mul.displaySecond);
    assert.strictEqual(Number.isInteger(mul.correctAnswer), true);

    const sub = generateSubtractionQuestion(n);
    assert.ok(sub.correctAnswer >= 0, 'subtraction result must never be negative');
    assert.strictEqual(Number.isInteger(sub.correctAnswer), true);
    assert.strictEqual(sub.correctAnswer, sub.displayFirst - sub.displaySecond);

    const div = generateDivisionQuestion(n);
    assert.ok(div.correctAnswer >= 0, 'division result must never be negative');
    assert.strictEqual(Number.isInteger(div.correctAnswer), true);
    assert.strictEqual(div.displayFirst / div.displaySecond, div.correctAnswer);
  }
}

// AC16-19: subtraction/division display order is never randomized (minuend
// /dividend always shown first); addition/multiplication display order is
// randomized (both orders observed across many runs).
function testDisplayOrderRandomization() {
  let sawNFirstAdd = false;
  let sawNSecondAdd = false;
  let sawNFirstMul = false;
  let sawNSecondMul = false;
  const n = 5;

  for (let i = 0; i < 500; i++) {
    const add = generateAdditionQuestion(n);
    if (add.displayFirst === n) sawNFirstAdd = true;
    if (add.displaySecond === n) sawNSecondAdd = true;

    const mul = generateMultiplicationQuestion(n);
    if (mul.displayFirst === n) sawNFirstMul = true;
    if (mul.displaySecond === n) sawNSecondMul = true;

    const sub = generateSubtractionQuestion(n);
    assert.strictEqual(sub.displaySecond, n, 'subtraction: N (subtrahend) must always be displayed second');
    assert.strictEqual(sub.displayFirst, sub.other, 'subtraction: minuend must always be displayed first');

    const div = generateDivisionQuestion(n);
    assert.strictEqual(div.displaySecond, n, 'division: N (divisor) must always be displayed second');
    assert.strictEqual(div.displayFirst, n * div.other, 'division: dividend must always be displayed first');
  }

  assert.ok(sawNFirstAdd, 'expected addition to sometimes display N first');
  assert.ok(sawNSecondAdd, 'expected addition to sometimes display N second');
  assert.ok(sawNFirstMul, 'expected multiplication to sometimes display N first');
  assert.ok(sawNSecondMul, 'expected multiplication to sometimes display N second');
}

// AC15: pickBucketAndGenerateQuestion only ever produces an op/n
// combination present in the input buckets array.
function testPickBucketAndGenerateQuestionRespectsInputBuckets() {
  const buckets = [
    { op: 'add', bucket: 3 },
    { op: 'mul', bucket: 7 },
    { op: 'div', bucket: 'gt10' }
  ];

  for (let i = 0; i < 200; i++) {
    const q = pickBucketAndGenerateQuestion(buckets);
    if (q.op === 'add') {
      assert.strictEqual(q.n, 3);
    } else if (q.op === 'mul') {
      assert.strictEqual(q.n, 7);
    } else if (q.op === 'div') {
      assert.ok(q.n >= 11 && q.n <= 20, 'gt10 bucket should resolve N to 11-20');
    } else {
      assert.fail('unexpected op produced: ' + q.op);
    }
  }
}

// AC20/Resolved Decision #4: generateDistractors/buildAnswerOptions produce
// exactly 3 distinct, non-negative distractors (none equal to the correct
// answer), for representative correct answers including 0, 1, and large
// products.
function testDistractorsAndAnswerOptions() {
  [0, 1, 20, 200].forEach((correctAnswer) => {
    const distractors = generateDistractors('sub', correctAnswer);
    assert.strictEqual(distractors.length, 3, 'expected exactly 3 distractors for ' + correctAnswer);
    const seen = new Set();
    distractors.forEach((value) => {
      assert.ok(value >= 0, 'distractor must be >= 0 (correctAnswer=' + correctAnswer + ')');
      assert.notStrictEqual(value, correctAnswer);
      assert.ok(!seen.has(value), 'distractors must be distinct from each other');
      seen.add(value);
    });

    const options = buildAnswerOptions('div', correctAnswer);
    assert.strictEqual(options.length, 4);
    const correctOptions = options.filter((o) => o.isCorrect);
    assert.strictEqual(correctOptions.length, 1);
    assert.strictEqual(correctOptions[0].value, correctAnswer);
    const values = options.map((o) => o.value);
    assert.strictEqual(new Set(values).size, 4, 'expected all 4 option values to be distinct');
  });
}

// Regression test: when a profile only enables specific 1-10 numbers (>10
// unchecked), the random counterpart operand must also stay within 1-10 —
// previously it was hardcoded to 1-20 regardless of bucket, so e.g. "+8"
// (an enabled 1-10 slot) could pair with a random "+15", confusing a
// learner practicing "addition up to 10". Covers all four operations.
function testOtherOperandScopedToBucketDifficulty() {
  const oneToTenBuckets = [
    { op: 'add', bucket: 8 },
    { op: 'mul', bucket: 8 },
    { op: 'sub', bucket: 8 },
    { op: 'div', bucket: 8 }
  ];

  for (let i = 0; i < 500; i++) {
    const q = pickBucketAndGenerateQuestion(oneToTenBuckets);
    if (q.op === 'add' || q.op === 'mul') {
      assert.ok(q.other >= 1 && q.other <= 10, 'expected ' + q.op + ' counterpart within 1-10 when only a 1-10 bucket is enabled, got ' + q.other);
    } else if (q.op === 'sub') {
      assert.ok(q.correctAnswer >= 0 && q.correctAnswer <= 10, 'expected subtraction offset within 0-10 when only a 1-10 bucket is enabled, got ' + q.correctAnswer);
    } else if (q.op === 'div') {
      assert.ok(q.other >= 1 && q.other <= 10, 'expected division quotient within 1-10 when only a 1-10 bucket is enabled, got ' + q.other);
    }
  }

  // Sanity check the fix actually engages: across many runs, some questions
  // from a 1-10 bucket must produce a counterpart above 1 (not just always
  // the minimum), so the range genuinely spans 1-10, not a degenerate point.
  let sawCounterpartAbove5 = false;
  for (let i = 0; i < 200; i++) {
    const q = pickBucketAndGenerateQuestion([{ op: 'add', bucket: 8 }]);
    if (q.other > 5) sawCounterpartAbove5 = true;
  }
  assert.ok(sawCounterpartAbove5, 'expected the 1-10-scoped counterpart to genuinely vary, not stay fixed');
}

// When the enabled bucket is the combined ">10" slot, the random
// counterpart is allowed to use the full 1-20 range (matching the wider
// difficulty tier ">10" represents), including values above 10.
function testOtherOperandUsesFullRangeForGt10Bucket() {
  const gt10Buckets = [{ op: 'add', bucket: 'gt10' }];
  let sawCounterpartAbove10 = false;

  for (let i = 0; i < 500; i++) {
    const q = pickBucketAndGenerateQuestion(gt10Buckets);
    assert.ok(q.n >= 11 && q.n <= 20, 'gt10 bucket should resolve N to 11-20');
    assert.ok(q.other >= 1 && q.other <= 20, 'expected gt10 counterpart within 1-20, got ' + q.other);
    if (q.other > 10) sawCounterpartAbove10 = true;
  }

  assert.ok(sawCounterpartAbove10, 'expected the gt10-scoped counterpart to sometimes exceed 10');
}

// Calling a per-operation generator directly (not via
// pickBucketAndGenerateQuestion) without an otherMax argument defaults to
// the original 1-20 range, preserving backward compatibility for any
// direct caller/test that doesn't pass a bucket-derived max.
function testDirectCallDefaultsToFullRange() {
  for (let i = 0; i < 200; i++) {
    const add = generateAdditionQuestion(5);
    assert.ok(add.other >= 1 && add.other <= 20, 'expected default otherMax of 20 when omitted, got ' + add.other);
  }
}

module.exports = {
  testCorrectAnswerInvariants,
  testDisplayOrderRandomization,
  testPickBucketAndGenerateQuestionRespectsInputBuckets,
  testDistractorsAndAnswerOptions,
  testOtherOperandScopedToBucketDifficulty,
  testOtherOperandUsesFullRangeForGt10Bucket,
  testDirectCallDefaultsToFullRange
};
