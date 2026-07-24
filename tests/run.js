const tests = Object.assign(
  {},
  require('./game-logic.test.js'),
  require('./acceptance.test.js'),
  require('./profiles.test.js'),
  require('./question-generator.test.js'),
  require('./storage.test.js'),
  require('./profile-lifecycle.test.js'),
  require('./monster.test.js')
);

let passed = 0;
let failed = 0;

for (const [name, testFn] of Object.entries(tests)) {
  try {
    testFn();
    console.log('PASS - ' + name);
    passed++;
  } catch (err) {
    console.log('FAIL - ' + name);
    console.log('  ' + err.message);
    failed++;
  }
}

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');

if (failed > 0) {
  process.exit(1);
}
