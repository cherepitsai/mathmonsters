// Monster generation & reveal. Adapted from a standalone reference
// generator (monster-generator.html): a random monster spec is built from
// 10 independent parts (body, legs, arms, eyes, mouth, horns, ears, tail,
// pattern, accessory), matching PATH_LENGTH's 10 cells 1:1 — one part is
// revealed per correct answer instead of the old plain red-circle token.
//
// buildMonsterSpec() is pure (no DOM) and dual-exported for Node tests,
// following the same convention as game-logic.js/profiles.js. The
// rendering/reveal functions need document/SVG and stay browser-only,
// consistent with this project's existing DOM-vs-pure-logic split (no DOM
// testing tool in this stack, per CLAUDE.md).

var TOTAL_MONSTER_PARTS = 10;
var MONSTER_SVG_NS = 'http://www.w3.org/2000/svg';

function monsterRand(min, max) {
  return min + Math.random() * (max - min);
}

function monsterRandInt(min, max) {
  return Math.floor(monsterRand(min, max + 1));
}

function monsterChoice(arr) {
  return arr[monsterRandInt(0, arr.length - 1)];
}

function monsterChance(p) {
  return Math.random() < p;
}

function monsterRandHue() {
  return monsterRandInt(0, 360);
}

// Pure: builds a random monster spec (no DOM access). Same field shape as
// the reference generator's buildSpec().
function buildMonsterSpec() {
  var bodyHue = monsterRandHue();
  var accentHue = (bodyHue + monsterRandInt(120, 240)) % 360;
  return {
    body: {
      shape: monsterChoice(['blob', 'round', 'egg', 'square']),
      w: monsterRand(70, 100),
      h: monsterRand(80, 110),
      hue: bodyHue,
      sat: monsterRandInt(45, 75),
      light: monsterRandInt(45, 65)
    },
    legs: {
      count: monsterChoice([2, 2, 3, 4]),
      kind: monsterChoice(['stubby', 'long', 'spring']),
      spread: monsterRand(0.7, 1.3)
    },
    arms: {
      count: monsterChoice([2, 2, 2, 4]),
      kind: monsterChoice(['straight', 'curly', 'tentacle']),
      len: monsterRand(30, 55)
    },
    eyes: {
      count: monsterChoice([1, 2, 2, 2, 3]),
      shape: monsterChoice(['round', 'oval', 'slit', 'star']),
      hue: (accentHue + monsterRandInt(-20, 20) + 360) % 360,
      size: monsterRand(9, 18)
    },
    mouth: {
      kind: monsterChoice(['smile', 'teeth', 'zigzag', 'round', 'flat']),
      width: monsterRand(24, 50)
    },
    horns: {
      // Every reveal step should show a visible change, so unlike the
      // original reference generator this never picks "0 horns".
      count: monsterChoice([1, 2, 3]),
      kind: monsterChoice(['straight', 'curved', 'branched'])
    },
    ears: {
      // Same reasoning as horns.count above: never "0 ears".
      count: 2,
      kind: monsterChoice(['round', 'pointy', 'floppy'])
    },
    tail: {
      // Same reasoning: always present (was a 75% chance before).
      present: true,
      kind: monsterChoice(['curl', 'straight', 'fork', 'paddle'])
    },
    pattern: {
      // Same reasoning: never "none" (was one of 4 equally-likely options).
      kind: monsterChoice(['spots', 'stripes', 'patches']),
      hue: accentHue,
      count: monsterRandInt(4, 9)
    },
    accessory: {
      // Same reasoning: never "none" (was one of 6 equally-likely options).
      kind: monsterChoice(['glasses', 'hat', 'bowtie', 'wings', 'spikes']),
      hue: (accentHue + monsterRandInt(60, 180)) % 360
    }
  };
}

// --- DOM/SVG rendering (browser-only; needs document.createElementNS) ---

function monsterEl(tag, attrs) {
  var n = document.createElementNS(MONSTER_SVG_NS, tag);
  for (var k in attrs) {
    n.setAttribute(k, attrs[k]);
  }
  return n;
}

function monsterBodyPath(spec) {
  var cx = 150, cy = 165, w = spec.w, h = spec.h;
  var d;
  if (spec.shape === 'round') {
    d = 'M ' + (cx - w) + ' ' + cy + ' a ' + w + ' ' + h + ' 0 1 0 ' + (w * 2) + ' 0 a ' + w + ' ' + h + ' 0 1 0 ' + (-w * 2) + ' 0 Z';
  } else if (spec.shape === 'egg') {
    d = 'M ' + cx + ' ' + (cy - h) + ' C ' + (cx + w) + ' ' + (cy - h) + ' ' + (cx + w) + ' ' + (cy + h) + ' ' + cx + ' ' + (cy + h) +
      ' C ' + (cx - w) + ' ' + (cy + h) + ' ' + (cx - w) + ' ' + (cy - h) + ' ' + cx + ' ' + (cy - h) + ' Z';
  } else if (spec.shape === 'square') {
    var r = 22;
    d = 'M ' + (cx - w + r) + ' ' + (cy - h) + ' h ' + (2 * (w - r)) + ' q ' + r + ' 0 ' + r + ' ' + r +
      ' v ' + (2 * (h - r)) + ' q 0 ' + r + ' ' + (-r) + ' ' + r + ' h ' + (-2 * (w - r)) + ' q ' + (-r) + ' 0 ' + (-r) + ' ' + (-r) +
      ' v ' + (-2 * (h - r)) + ' q 0 ' + (-r) + ' ' + r + ' ' + (-r) + ' Z';
  } else {
    var pts = 8, radius = (w + h) / 2, ring = [];
    for (var i = 0; i < pts; i++) {
      var a = (i / pts) * Math.PI * 2;
      var rr = radius * monsterRand(0.75, 1.15);
      ring.push([cx + Math.cos(a) * rr * (w / radius), cy + Math.sin(a) * rr * (h / radius)]);
    }
    d = 'M ' + ring[0][0] + ' ' + ring[0][1] + ' ';
    for (var j = 1; j <= pts; j++) {
      var p = ring[j % pts];
      d += 'Q ' + cx + ' ' + cy + ' ' + p[0] + ' ' + p[1] + ' ';
    }
    d += 'Z';
  }
  var fill = 'hsl(' + spec.hue + ' ' + spec.sat + '% ' + spec.light + '%)';
  return [monsterEl('path', { d: d, fill: fill, stroke: 'rgba(0,0,0,0.25)', 'stroke-width': 2, id: 'monster-body-shape' })];
}

function monsterLegsShapes(spec, bodySpec) {
  var out = [];
  var n = spec.count;
  var baseY = 165 + bodySpec.h * 0.85;
  for (var i = 0; i < n; i++) {
    var x = 150 + (i - (n - 1) / 2) * 30 * spec.spread;
    var fill = 'hsl(' + bodySpec.hue + ' ' + bodySpec.sat + '% ' + Math.max(bodySpec.light - 12, 20) + '%)';
    if (spec.kind === 'stubby') {
      out.push(monsterEl('rect', { x: x - 9, y: baseY, width: 18, height: 20, rx: 8, fill: fill }));
    } else if (spec.kind === 'long') {
      out.push(monsterEl('rect', { x: x - 6, y: baseY, width: 12, height: 34, rx: 6, fill: fill }));
      out.push(monsterEl('ellipse', { cx: x, cy: baseY + 36, rx: 12, ry: 6, fill: fill }));
    } else {
      out.push(monsterEl('path', { d: 'M ' + x + ' ' + baseY + ' q -10 12 0 22 q 10 10 0 20', stroke: fill, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }));
    }
  }
  return out;
}

function monsterArmsShapes(spec, bodySpec) {
  var out = [];
  var n = spec.count;
  var y = 165;
  for (var i = 0; i < n; i++) {
    var side = i % 2 === 0 ? -1 : 1;
    var idx = Math.floor(i / 2);
    var x0 = 150 + side * bodySpec.w * 0.85;
    var fill = 'hsl(' + bodySpec.hue + ' ' + bodySpec.sat + '% ' + Math.max(bodySpec.light - 6, 20) + '%)';
    var yy = y + idx * 24 - 6;
    if (spec.kind === 'straight') {
      out.push(monsterEl('rect', { x: side > 0 ? x0 : x0 - spec.len, y: yy - 6, width: spec.len, height: 12, rx: 6, fill: fill }));
    } else if (spec.kind === 'curly') {
      out.push(monsterEl('path', { d: 'M ' + x0 + ' ' + yy + ' q ' + (side * spec.len * 0.6) + ' -10 ' + (side * spec.len) + ' 10 q ' + (side * 10) + ' 8 0 18', stroke: fill, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round' }));
    } else {
      out.push(monsterEl('path', { d: 'M ' + x0 + ' ' + yy + ' q ' + (side * spec.len * 0.5) + ' 5 ' + (side * spec.len * 0.3) + ' ' + (spec.len * 0.5) + ' t ' + (side * spec.len * 0.3) + ' ' + (spec.len * 0.4), stroke: fill, 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }));
    }
  }
  return out;
}

function monsterEyesShapes(spec) {
  var out = [];
  var n = spec.count;
  for (var i = 0; i < n; i++) {
    var x = 150 + (i - (n - 1) / 2) * (spec.size * 2.4);
    var y = 130;
    var fillWhite = '#fdfdfd';
    var fillIris = 'hsl(' + spec.hue + ' 70% 45%)';
    if (spec.shape === 'round' || spec.shape === 'oval') {
      var rx = spec.size, ry = spec.shape === 'oval' ? spec.size * 1.3 : spec.size;
      out.push(monsterEl('ellipse', { cx: x, cy: y, rx: rx, ry: ry, fill: fillWhite }));
      out.push(monsterEl('circle', { cx: x, cy: y, r: spec.size * 0.5, fill: fillIris }));
      out.push(monsterEl('circle', { cx: x - spec.size * 0.15, cy: y - spec.size * 0.15, r: spec.size * 0.15, fill: '#fff' }));
    } else if (spec.shape === 'slit') {
      out.push(monsterEl('ellipse', { cx: x, cy: y, rx: spec.size * 1.1, ry: spec.size * 0.6, fill: fillWhite }));
      out.push(monsterEl('rect', { x: x - 2, y: y - spec.size * 0.5, width: 4, height: spec.size, fill: fillIris }));
    } else {
      var r1 = spec.size, r2 = spec.size * 0.45, pts = [];
      for (var k = 0; k < 10; k++) {
        var a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        var r = k % 2 === 0 ? r1 : r2;
        pts.push((x + Math.cos(a) * r) + ',' + (y + Math.sin(a) * r));
      }
      out.push(monsterEl('polygon', { points: pts.join(' '), fill: fillIris }));
    }
  }
  return out;
}

function monsterMouthShape(spec) {
  var cx = 150, cy = 175, w = spec.width;
  if (spec.kind === 'smile') {
    return [monsterEl('path', { d: 'M ' + (cx - w / 2) + ' ' + cy + ' Q ' + cx + ' ' + (cy + w * 0.5) + ' ' + (cx + w / 2) + ' ' + cy, stroke: '#2b1a1a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' })];
  }
  if (spec.kind === 'teeth') {
    var out = [monsterEl('rect', { x: cx - w / 2, y: cy - 6, width: w, height: 16, rx: 4, fill: '#2b1a1a' })];
    var teeth = monsterRandInt(3, 5);
    for (var i = 0; i < teeth; i++) {
      out.push(monsterEl('rect', { x: cx - w / 2 + (i + 0.5) * (w / teeth) - 4, y: cy - 6, width: 8, height: 10, fill: '#fff' }));
    }
    return out;
  }
  if (spec.kind === 'zigzag') {
    var d = 'M ' + (cx - w / 2) + ' ' + cy;
    var teethCount = 5;
    for (var t = 1; t <= teethCount; t++) {
      var x = cx - w / 2 + t * (w / teethCount);
      d += ' L ' + x + ' ' + (cy + (t % 2 === 0 ? 10 : -10));
    }
    return [monsterEl('path', { d: d, stroke: '#2b1a1a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })];
  }
  if (spec.kind === 'round') {
    return [monsterEl('ellipse', { cx: cx, cy: cy + 4, rx: w * 0.35, ry: w * 0.28, fill: '#2b1a1a' })];
  }
  return [monsterEl('rect', { x: cx - w / 2, y: cy, width: w, height: 5, rx: 2, fill: '#2b1a1a' })];
}

function monsterHornsShapes(spec, bodySpec) {
  var out = [];
  var n = spec.count;
  var fill = 'hsl(' + ((bodySpec.hue + 40) % 360) + ' 40% 75%)';
  for (var i = 0; i < n; i++) {
    var x = 150 + (i - (n - 1) / 2) * 30;
    var y = 95;
    if (spec.kind === 'straight') {
      out.push(monsterEl('polygon', { points: (x - 6) + ',' + (y + 18) + ' ' + (x + 6) + ',' + (y + 18) + ' ' + x + ',' + (y - 16), fill: fill }));
    } else if (spec.kind === 'curved') {
      out.push(monsterEl('path', { d: 'M ' + (x - 6) + ' ' + (y + 16) + ' Q ' + (x + 2) + ' ' + (y - 4) + ' ' + (x + 14) + ' ' + (y - 14), stroke: fill, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }));
    } else {
      out.push(monsterEl('path', { d: 'M ' + x + ' ' + (y + 16) + ' L ' + x + ' ' + (y - 8) + ' M ' + x + ' ' + (y - 8) + ' L ' + (x - 8) + ' ' + (y - 18) + ' M ' + x + ' ' + (y - 8) + ' L ' + (x + 8) + ' ' + (y - 18), stroke: fill, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }));
    }
  }
  return out;
}

function monsterEarsShapes(spec, bodySpec) {
  var out = [];
  var fill = 'hsl(' + bodySpec.hue + ' ' + bodySpec.sat + '% ' + Math.min(bodySpec.light + 10, 80) + '%)';
  for (var i = 0; i < spec.count; i++) {
    var side = i % 2 === 0 ? -1 : 1;
    var x = 150 + side * bodySpec.w * 0.8;
    var y = 105;
    if (spec.kind === 'round') {
      out.push(monsterEl('circle', { cx: x, cy: y, r: 16, fill: fill }));
    } else if (spec.kind === 'pointy') {
      out.push(monsterEl('polygon', { points: (x - 14) + ',' + (y + 14) + ' ' + (x + 14) + ',' + (y + 14) + ' ' + x + ',' + (y - 16), fill: fill }));
    } else {
      out.push(monsterEl('path', { d: 'M ' + x + ' ' + (y - 10) + ' q ' + (side * 22) + ' 10 0 40', fill: fill }));
    }
  }
  return out;
}

function monsterTailShape(spec, bodySpec) {
  if (!spec.present) {
    return [];
  }
  var fill = 'hsl(' + bodySpec.hue + ' ' + bodySpec.sat + '% ' + Math.max(bodySpec.light - 8, 20) + '%)';
  var x0 = 150 + bodySpec.w * 0.9, y0 = 190;
  if (spec.kind === 'curl') {
    return [monsterEl('path', { d: 'M ' + x0 + ' ' + y0 + ' q 30 0 25 -25 q -5 -20 -25 -10', stroke: fill, 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round' })];
  }
  if (spec.kind === 'straight') {
    return [monsterEl('path', { d: 'M ' + x0 + ' ' + y0 + ' l 40 10', stroke: fill, 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round' })];
  }
  if (spec.kind === 'fork') {
    return [
      monsterEl('path', { d: 'M ' + x0 + ' ' + y0 + ' l 34 8 l 12 -10', stroke: fill, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }),
      monsterEl('path', { d: 'M ' + (x0 + 34) + ' ' + (y0 + 8) + ' l 10 14', stroke: fill, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' })
    ];
  }
  return [
    monsterEl('path', { d: 'M ' + x0 + ' ' + y0 + ' l 36 6', stroke: fill, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round' }),
    monsterEl('ellipse', { cx: x0 + 42, cy: y0 + 6, rx: 12, ry: 16, fill: fill, transform: 'rotate(20 ' + (x0 + 42) + ' ' + (y0 + 6) + ')' })
  ];
}

function monsterPointInBody(bodySpec) {
  var rw = bodySpec.w * 0.75, rh = bodySpec.h * 0.75;
  var x, y, nx, ny;
  do {
    nx = monsterRand(-1, 1);
    ny = monsterRand(-1, 1);
  } while (nx * nx + ny * ny > 1);
  x = 150 + nx * rw;
  y = 165 + ny * rh;
  return [x, y];
}

function monsterPatternShapes(spec, bodySpec) {
  if (spec.kind === 'none') {
    return [];
  }
  var out = [];
  var lighter = monsterChance(0.5);
  var delta = monsterRand(9, 16) * (lighter ? 1 : -1);
  var light = Math.min(88, Math.max(12, bodySpec.light + delta));
  var fill = 'hsl(' + bodySpec.hue + ' ' + bodySpec.sat + '% ' + light + '% / 0.9)';
  for (var i = 0; i < spec.count; i++) {
    var point = monsterPointInBody(bodySpec);
    var x = point[0], y = point[1];
    if (spec.kind === 'spots') {
      out.push(monsterEl('circle', { cx: x, cy: y, r: monsterRand(4, 10), fill: fill }));
    } else if (spec.kind === 'stripes') {
      out.push(monsterEl('rect', { x: x - 3, y: y - bodySpec.h * 0.6, width: 6, height: bodySpec.h * 1.2, rx: 3, fill: fill, transform: 'rotate(' + monsterRand(-15, 15) + ' ' + x + ' ' + y + ')' }));
    } else {
      out.push(monsterEl('ellipse', { cx: x, cy: y, rx: monsterRand(10, 18), ry: monsterRand(6, 12), fill: fill }));
    }
  }
  return out;
}

function monsterAccessoryShapes(spec, bodySpec) {
  var fill = 'hsl(' + spec.hue + ' 55% 55%)';
  if (spec.kind === 'none') {
    return [];
  }
  if (spec.kind === 'glasses') {
    return [
      monsterEl('circle', { cx: 135, cy: 130, r: 16, fill: 'none', stroke: '#222', 'stroke-width': 4 }),
      monsterEl('circle', { cx: 165, cy: 130, r: 16, fill: 'none', stroke: '#222', 'stroke-width': 4 }),
      monsterEl('line', { x1: 151, y1: 130, x2: 149, y2: 130, stroke: '#222', 'stroke-width': 4 })
    ];
  }
  if (spec.kind === 'hat') {
    return [
      monsterEl('rect', { x: 120, y: 78, width: 60, height: 8, rx: 4, fill: fill }),
      monsterEl('path', { d: 'M 130 80 L 140 40 L 160 40 L 170 80 Z', fill: fill })
    ];
  }
  if (spec.kind === 'bowtie') {
    return [
      monsterEl('polygon', { points: '140,205 160,195 160,215', fill: fill }),
      monsterEl('polygon', { points: '160,205 140,195 140,215', fill: fill }),
      monsterEl('circle', { cx: 150, cy: 205, r: 5, fill: '#fff' })
    ];
  }
  if (spec.kind === 'wings') {
    return [
      monsterEl('path', { d: 'M ' + (150 - bodySpec.w) + ' 150 q -40 -30 -10 -60 q 20 10 20 50 Z', fill: fill, opacity: 0.85 }),
      monsterEl('path', { d: 'M ' + (150 + bodySpec.w) + ' 150 q 40 -30 10 -60 q -20 10 -20 50 Z', fill: fill, opacity: 0.85 })
    ];
  }
  var out = [];
  for (var i = 0; i < 5; i++) {
    var x = 150 + (i - 2) * 18;
    out.push(monsterEl('polygon', { points: (x - 6) + ',100 ' + (x + 6) + ',100 ' + x + ',80', fill: fill }));
  }
  return out;
}

// Renders the full monster into svgEl (clears it first). All 10 parts are
// added with class "part" (opacity 0 / scaled down via CSS) and none get
// the "on" class yet — call revealMonsterPart() to reveal each one.
function renderMonsterSVG(svgEl, spec) {
  svgEl.innerHTML = '';

  var bodyShapes = monsterBodyPath(spec.body);

  var defs = monsterEl('defs', {});
  var clip = monsterEl('clipPath', { id: 'monster-body-clip' });
  clip.appendChild(monsterEl('use', { href: '#monster-body-shape' }));
  defs.appendChild(clip);
  svgEl.appendChild(defs);

  var parts = [
    { i: 0, shapes: bodyShapes },
    { i: 1, shapes: monsterLegsShapes(spec.legs, spec.body) },
    { i: 2, shapes: monsterArmsShapes(spec.arms, spec.body) },
    { i: 3, shapes: monsterEyesShapes(spec.eyes) },
    { i: 4, shapes: monsterMouthShape(spec.mouth) },
    { i: 5, shapes: monsterHornsShapes(spec.horns, spec.body) },
    { i: 6, shapes: monsterEarsShapes(spec.ears, spec.body) },
    { i: 7, shapes: monsterTailShape(spec.tail, spec.body) },
    { i: 8, shapes: monsterPatternShapes(spec.pattern, spec.body) },
    { i: 9, shapes: monsterAccessoryShapes(spec.accessory, spec.body) }
  ];

  // SVG stacking order (bottom -> top) is independent of reveal order: the
  // pattern (index 8) is drawn right above the body so it never covers
  // eyes/mouth/limbs/accessories, even though it's still the 9th part
  // revealed.
  var zOrder = [0, 8, 1, 2, 5, 6, 7, 3, 4, 9];

  zOrder.forEach(function (i) {
    var shapes = parts[i].shapes;
    var attrs = { 'class': 'part', id: 'monster-part-' + i };
    if (i === 8) {
      attrs['clip-path'] = 'url(#monster-body-clip)';
    }
    var g = monsterEl('g', attrs);
    shapes.forEach(function (s) { g.appendChild(s); });
    svgEl.appendChild(g);
  });
}

// Reveals the part at the given index (0-9) by adding the "on" class,
// triggering its CSS opacity/scale transition.
function revealMonsterPart(svgEl, index) {
  var part = svgEl.querySelector('#monster-part-' + index);
  if (part) {
    part.classList.add('on');
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    TOTAL_MONSTER_PARTS: TOTAL_MONSTER_PARTS,
    buildMonsterSpec: buildMonsterSpec
  };
}
