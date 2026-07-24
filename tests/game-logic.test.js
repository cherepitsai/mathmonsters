const assert = require('assert');
const {
  generateDistractors,
  buildAnswerOptions,
  shuffleArray,
  advancePath
} = require('../game-logic.js');

function assertValidDistractors(op, correctAnswer) {
  const distractors = generateDistractors(op, correctAnswer);
  assert.strictEqual(distractors.length, 3, 'expected exactly 3 distractors');

  const seen = new Set();
  for (const value of distractors) {
    assert.ok(value >= 0, 'distractor must be >= 0');
    assert.notStrictEqual(value, correctAnswer, 'distractor must not equal correct answer');
    assert.ok(!seen.has(value), 'distractors must be distinct from each other');
    seen.add(value);
  }
}

function testGenerateDistractors() {
  assertValidDistractors('sub', 0);
  assertValidDistractors('mul', 1);
  assertValidDistractors('mul', 200);
  assertValidDistractors('add', 10);
  assertValidDistractors('div', 50);
}

function testBuildAnswerOptions() {
  const correctAnswer = 42;
  const options = buildAnswerOptions('mul', correctAnswer);

  assert.strictEqual(options.length, 4, 'expected exactly 4 options');

  const correctOptions = options.filter((o) => o.isCorrect);
  assert.strictEqual(correctOptions.length, 1, 'expected exactly one correct option');
  assert.strictEqual(correctOptions[0].value, correctAnswer);

  const values = options.map((o) => o.value);
  const uniqueValues = new Set(values);
  assert.strictEqual(uniqueValues.size, 4, 'expected all 4 option values to be distinct');
}

function testShuffleArray() {
  const input = [1, 2, 3, 4, 5];
  const inputCopy = input.slice();
  const shuffled = shuffleArray(input);

  assert.notStrictEqual(shuffled, input, 'shuffleArray should return a new array');
  assert.deepStrictEqual(input, inputCopy, 'shuffleArray must not mutate the input array');

  assert.strictEqual(shuffled.length, input.length);
  const sortedInput = input.slice().sort();
  const sortedShuffled = shuffled.slice().sort();
  assert.deepStrictEqual(sortedShuffled, sortedInput, 'shuffled array must contain same elements');
}

function testAdvancePath() {
  const pathLength = 10;
  for (let position = 0; position < pathLength - 1; position++) {
    assert.strictEqual(advancePath(position, pathLength), position + 1);
  }
  assert.strictEqual(advancePath(pathLength - 1, pathLength), 0, 'expected wrap-around to 0');
}

module.exports = {
  testGenerateDistractors,
  testBuildAnswerOptions,
  testShuffleArray,
  testAdvancePath
};
