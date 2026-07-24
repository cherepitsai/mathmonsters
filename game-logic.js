// Pure game logic functions. No DOM access. Usable both as a browser
// global script and as a Node-requireable module (see export guard below).

// Returns an integer in [min, max], inclusive.
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Display symbol for each operation, used by script.js when rendering
// question text.
var OPERATOR_SYMBOLS = { add: '+', sub: '−', mul: '×', div: '÷' };

// Addition: fixed number n + random second addend (1-otherMax). Correct
// answer is the sum. Display order of the two addends is randomized.
// otherMax defaults to 20 when omitted (e.g. when called directly, not via
// pickBucketAndGenerateQuestion); pickBucketAndGenerateQuestion passes 10
// when n came from a 1-10 bucket, so the second number stays at the same
// difficulty tier as the enabled checkbox (fixes: "+8" pairing with "+15"
// when only 1-10 is enabled and >10 is unchecked).
function generateAdditionQuestion(n, otherMax) {
  if (otherMax === undefined) otherMax = 20;
  var other = randomInt(1, otherMax);
  var correctAnswer = n + other;
  var displayFirst = n;
  var displaySecond = other;
  if (Math.random() < 0.5) {
    displayFirst = other;
    displaySecond = n;
  }
  return { op: 'add', n: n, other: other, displayFirst: displayFirst, displaySecond: displaySecond, correctAnswer: correctAnswer };
}

// Multiplication: fixed number n x random second factor (1-otherMax).
// Correct answer is the product. Display order of the two factors is
// randomized. See generateAdditionQuestion's comment re: otherMax.
function generateMultiplicationQuestion(n, otherMax) {
  if (otherMax === undefined) otherMax = 20;
  var other = randomInt(1, otherMax);
  var correctAnswer = n * other;
  var displayFirst = n;
  var displaySecond = other;
  if (Math.random() < 0.5) {
    displayFirst = other;
    displaySecond = n;
  }
  return { op: 'mul', n: n, other: other, displayFirst: displayFirst, displaySecond: displaySecond, correctAnswer: correctAnswer };
}

// Subtraction: fixed number n is subtracted from a random minuend that is
// always >= n (result never negative, and never exceeds otherMax above n).
// Correct answer is the difference. Displayed as "[minuend] - [n]", minuend
// always shown first (never randomized). See generateAdditionQuestion's
// comment re: otherMax.
function generateSubtractionQuestion(n, otherMax) {
  if (otherMax === undefined) otherMax = 20;
  var offset = randomInt(0, otherMax);
  var minuend = n + offset;
  var correctAnswer = offset;
  return { op: 'sub', n: n, other: minuend, displayFirst: minuend, displaySecond: n, correctAnswer: correctAnswer };
}

// Division: fixed number n is the divisor. A random quotient (1-otherMax)
// is chosen and the dividend is computed as n * quotient, guaranteeing a
// whole-number result and never dividing by zero. Correct answer is the
// quotient. Displayed as "[dividend] / [n]", dividend always shown first
// (never randomized). See generateAdditionQuestion's comment re: otherMax.
function generateDivisionQuestion(n, otherMax) {
  if (otherMax === undefined) otherMax = 20;
  var quotient = randomInt(1, otherMax);
  var dividend = n * quotient;
  return { op: 'div', n: n, other: quotient, displayFirst: dividend, displaySecond: n, correctAnswer: quotient };
}

// Given a non-empty array of { op, bucket } slots (bucket is a number 1-10
// or the string 'gt10'), uniformly picks one slot, resolves its fixed
// number N (drawing randomInt(11,20) if bucket === 'gt10'), and dispatches
// to the matching per-operation generator above. The random counterpart's
// range is scoped to the same difficulty tier as the picked bucket: 1-10
// when the bucket is a specific number 1-10, or 1-20 when the bucket is
// 'gt10' — so enabling only "×3" (without ">10") never produces a
// counterpart above 10.
function pickBucketAndGenerateQuestion(buckets) {
  var slot = buckets[randomInt(0, buckets.length - 1)];
  var isGt10 = slot.bucket === 'gt10';
  var n = isGt10 ? randomInt(11, 20) : slot.bucket;
  var otherMax = isGt10 ? 20 : 10;

  switch (slot.op) {
    case 'add':
      return generateAdditionQuestion(n, otherMax);
    case 'sub':
      return generateSubtractionQuestion(n, otherMax);
    case 'mul':
      return generateMultiplicationQuestion(n, otherMax);
    case 'div':
      return generateDivisionQuestion(n, otherMax);
    default:
      throw new Error('Unknown operation: ' + slot.op);
  }
}

// Given the operation and the correct answer, returns an array of exactly
// 3 distinct, non-negative integers, none equal to correctAnswer.
function generateDistractors(op, correctAnswer) {
  var maxOffset = Math.max(3, Math.round(correctAnswer * 0.2));
  var distractors = [];
  var MAX_ATTEMPTS = 200;
  var attempts = 0;

  while (distractors.length < 3 && attempts < MAX_ATTEMPTS) {
    attempts++;
    var offset = randomInt(-maxOffset, maxOffset);
    if (offset === 0) {
      continue;
    }
    var candidate = correctAnswer + offset;
    if (candidate < 0) {
      continue;
    }
    if (candidate === correctAnswer) {
      continue;
    }
    if (distractors.indexOf(candidate) !== -1) {
      continue;
    }
    distractors.push(candidate);
  }

  return distractors;
}

// Given the operation and the correct answer, builds the full set of 4
// answer options (1 correct + 3 distractors), shuffles them, and returns
// an array of { value, isCorrect } in randomized order.
function buildAnswerOptions(op, correctAnswer) {
  var distractors = generateDistractors(op, correctAnswer);
  var options = [{ value: correctAnswer, isCorrect: true }];
  for (var i = 0; i < distractors.length; i++) {
    options.push({ value: distractors[i], isCorrect: false });
  }
  return shuffleArray(options);
}

// Fisher-Yates shuffle. Returns a NEW array (does not mutate input).
function shuffleArray(array) {
  var result = array.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = randomInt(0, i);
    var tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

// Given the current position and the fixed path length, returns the next
// position, wrapping to 0 after the last cell.
function advancePath(position, pathLength) {
  return (position + 1) % pathLength;
}

if (typeof module !== 'undefined') {
  module.exports = {
    randomInt: randomInt,
    OPERATOR_SYMBOLS: OPERATOR_SYMBOLS,
    generateAdditionQuestion: generateAdditionQuestion,
    generateMultiplicationQuestion: generateMultiplicationQuestion,
    generateSubtractionQuestion: generateSubtractionQuestion,
    generateDivisionQuestion: generateDivisionQuestion,
    pickBucketAndGenerateQuestion: pickBucketAndGenerateQuestion,
    generateDistractors: generateDistractors,
    buildAnswerOptions: buildAnswerOptions,
    shuffleArray: shuffleArray,
    advancePath: advancePath
  };
}
