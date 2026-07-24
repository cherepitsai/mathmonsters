const assert = require('assert');
const { TOTAL_MONSTER_PARTS, buildMonsterSpec } = require('../monster.js');

// TOTAL_MONSTER_PARTS must match PATH_LENGTH (script.js) so exactly one
// monster part is revealed per path cell / correct answer.
function testTotalMonsterPartsMatchesPathLength() {
  assert.strictEqual(TOTAL_MONSTER_PARTS, 10);
}

// buildMonsterSpec() is pure (no DOM) and must always return a complete,
// well-typed spec covering every one of the 10 renderable parts.
function testBuildMonsterSpecShape() {
  for (let i = 0; i < 200; i++) {
    const spec = buildMonsterSpec();

    assert.ok(['blob', 'round', 'egg', 'square'].includes(spec.body.shape));
    assert.ok(spec.body.w >= 70 && spec.body.w <= 100);
    assert.ok(spec.body.h >= 80 && spec.body.h <= 110);
    assert.ok(spec.body.hue >= 0 && spec.body.hue <= 360);
    assert.ok(spec.body.sat >= 45 && spec.body.sat <= 75);
    assert.ok(spec.body.light >= 45 && spec.body.light <= 65);

    assert.ok([2, 3, 4].includes(spec.legs.count));
    assert.ok(['stubby', 'long', 'spring'].includes(spec.legs.kind));

    assert.ok([2, 4].includes(spec.arms.count));
    assert.ok(['straight', 'curly', 'tentacle'].includes(spec.arms.kind));

    assert.ok([1, 2, 3].includes(spec.eyes.count));
    assert.ok(['round', 'oval', 'slit', 'star'].includes(spec.eyes.shape));
    assert.ok(spec.eyes.size >= 9 && spec.eyes.size <= 18);

    assert.ok(['smile', 'teeth', 'zigzag', 'round', 'flat'].includes(spec.mouth.kind));

    assert.ok([0, 1, 2, 3].includes(spec.horns.count));
    assert.ok(['straight', 'curved', 'branched'].includes(spec.horns.kind));

    assert.ok([0, 2].includes(spec.ears.count));
    assert.ok(['round', 'pointy', 'floppy'].includes(spec.ears.kind));

    assert.strictEqual(typeof spec.tail.present, 'boolean');
    assert.ok(['curl', 'straight', 'fork', 'paddle'].includes(spec.tail.kind));

    assert.ok(['none', 'spots', 'stripes', 'patches'].includes(spec.pattern.kind));
    assert.ok(spec.pattern.count >= 4 && spec.pattern.count <= 9);

    assert.ok(['none', 'glasses', 'hat', 'bowtie', 'wings', 'spikes'].includes(spec.accessory.kind));
  }
}

// Across many calls, randomness must genuinely vary (not silently collapse
// to a single fixed spec) — a regression here would mean every monster
// looks identical, defeating the point of the feature.
function testBuildMonsterSpecVariesAcrossCalls() {
  const seenBodyShapes = new Set();
  const seenLegKinds = new Set();
  const seenAccessoryKinds = new Set();

  for (let i = 0; i < 300; i++) {
    const spec = buildMonsterSpec();
    seenBodyShapes.add(spec.body.shape);
    seenLegKinds.add(spec.legs.kind);
    seenAccessoryKinds.add(spec.accessory.kind);
  }

  assert.ok(seenBodyShapes.size > 1, 'expected multiple body shapes across many random specs');
  assert.ok(seenLegKinds.size > 1, 'expected multiple leg kinds across many random specs');
  assert.ok(seenAccessoryKinds.size > 1, 'expected multiple accessory kinds across many random specs');
}

module.exports = {
  testTotalMonsterPartsMatchesPathLength,
  testBuildMonsterSpecShape,
  testBuildMonsterSpecVariesAcrossCalls
};
