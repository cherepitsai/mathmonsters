// DOM rendering and event wiring. Relies on pure functions from
// game-logic.js/profiles.js/storage.js and the showScreen helper from
// navigation.js (all loaded before this file as plain global scripts).

var PATH_LENGTH = 10;
var CORRECT_DELAY_MS = 600;

var appState = { data: null, currentProfileId: null };

var MAX_WRONG_ATTEMPTS = 2;

var gameState = {
  profileId: null,
  position: 0,
  question: null,
  options: [],
  locked: false,
  wrongAttempts: 0
};

// Monster shown above the path track: one part revealed per correct
// answer (10 parts total, matching PATH_LENGTH). Kept separate from
// gameState.position (which still drives the path-cell highlight) because
// "10 revealed" and "0 revealed" would otherwise collide at position 0
// after a modulo wrap.
var currentMonsterSpec = null;
var monsterPartsRevealed = 0;

document.addEventListener('DOMContentLoaded', function () {
  appState.data = loadData();

  if (!isStorageAvailable()) {
    showStorageWarning();
  }

  wireDismissBanner();
  renderBothProfileLists();
  wireOperationCheckboxes();
  wireExportImport();
  wireAnswerButtons();
  wireNavigation();
});

function wireNavigation() {
  document.getElementById('btn-start-game').addEventListener('click', function () {
    showScreen('screen-play-picker');
  });
  document.getElementById('btn-open-settings').addEventListener('click', function () {
    showScreen('screen-settings-picker');
  });
  document.getElementById('btn-back-play-picker').addEventListener('click', function () {
    showScreen('screen-main-menu');
  });
  document.getElementById('btn-back-settings-picker').addEventListener('click', function () {
    showScreen('screen-main-menu');
  });
  document.getElementById('btn-back-profile-settings').addEventListener('click', function () {
    showScreen('screen-settings-picker');
  });
  document.getElementById('btn-quit-game').addEventListener('click', function () {
    showScreen('screen-main-menu');
  });
  document.getElementById('btn-add-profile-play').addEventListener('click', handleAddProfile);
  document.getElementById('btn-add-profile-settings').addEventListener('click', handleAddProfile);
}

// Shared DOM helper used by both #screen-play-picker and
// #screen-settings-picker; clears and re-renders one button per profile.
function renderProfileList(containerEl, onSelectProfile) {
  containerEl.innerHTML = '';
  appState.data.profiles.forEach(function (profile) {
    var btn = document.createElement('button');
    btn.className = 'profile-btn';
    btn.textContent = profile.letter;
    btn.addEventListener('click', function () {
      onSelectProfile(profile);
    });
    containerEl.appendChild(btn);
  });
}

function renderBothProfileLists() {
  renderProfileList(document.getElementById('play-profile-list'), function (profile) {
    startGameForProfile(profile);
  });
  renderProfileList(document.getElementById('settings-profile-list'), function (profile) {
    openProfileSettings(profile);
  });
}

function handleAddProfile() {
  var name = window.prompt('Имя профиля:');
  if (!name || !name.trim()) {
    return;
  }
  var profile = createProfile(name);
  addProfileToData(appState.data, profile);
  saveData(appState.data);
  renderBothProfileLists();
}

function startGameForProfile(profile) {
  gameState.profileId = profile.id;
  gameState.position = 0;
  gameState.locked = false;

  showScreen('screen-game');
  renderPathCells();
  highlightActiveCell();
  startNewMonster();
  nextQuestion();
}

// Generates a brand new random monster and renders it fully hidden (no
// parts revealed yet) into #monster-svg.
function startNewMonster() {
  currentMonsterSpec = buildMonsterSpec();
  monsterPartsRevealed = 0;
  renderMonsterSVG(document.getElementById('monster-svg'), currentMonsterSpec);
}

function openProfileSettings(profile) {
  appState.currentProfileId = profile.id;
  showScreen('screen-profile-settings');
  renderProfileSettingsScreen(profile);
}

function renderProfileSettingsScreen(profile) {
  document.getElementById('profile-settings-heading').textContent =
    profile.name + ' (' + profile.letter + ')';
  setCheckboxStates(profile);
  renderStatsTable(profile);
}

function setCheckboxStates(profile) {
  var ops = ['add', 'sub', 'mul', 'div'];
  ops.forEach(function (op) {
    var s = profile.settings[op];
    document.querySelector('.op-master[data-op="' + op + '"]').checked = s.enabled;
    for (var n = 1; n <= 10; n++) {
      var cb = document.querySelector('.op-number[data-op="' + op + '"][data-number="' + n + '"]');
      cb.checked = s.numbers.indexOf(n) !== -1;
    }
    document.querySelector('.op-gt10[data-op="' + op + '"]').checked = s.gt10;
  });
}

// One delegated `change` listener per operation block (data-attribute
// based), wired once; always looks up the currently-open profile fresh.
function wireOperationCheckboxes() {
  var blocks = document.querySelectorAll('.op-block');
  blocks.forEach(function (block) {
    block.addEventListener('change', function (event) {
      var profile = findProfileById(appState.data, appState.currentProfileId);
      if (!profile) {
        return;
      }
      var target = event.target;
      var op = target.getAttribute('data-op');

      if (target.classList.contains('op-master')) {
        setOperationEnabled(profile, op, target.checked);
      } else if (target.classList.contains('op-number')) {
        var number = parseInt(target.getAttribute('data-number'), 10);
        toggleNumber(profile, op, number, target.checked);
      } else if (target.classList.contains('op-gt10')) {
        toggleGt10(profile, op, target.checked);
      }

      saveData(appState.data);
    });
  });
}

function renderStatsTable(profile) {
  var container = document.getElementById('stats-table');
  container.innerHTML = '';

  var categories = aggregateCategories(profile);
  categories.forEach(function (cat) {
    var categoryRow = document.createElement('div');
    categoryRow.className = 'stats-category-row';
    appendStatsRowContent(categoryRow, categoryLabel(cat.op, cat.bucket), cat.attempts, cat.correct);
    container.appendChild(categoryRow);

    var facts = getFactsForCategory(profile, cat.op, cat.bucket);
    var factRows = facts.map(function (fact) {
      var row = document.createElement('div');
      row.className = 'stats-fact-row hidden';
      appendStatsRowContent(row, fact.label, fact.attempts, fact.correct);
      container.appendChild(row);
      return row;
    });

    categoryRow.addEventListener('click', function () {
      categoryRow.classList.toggle('expanded');
      factRows.forEach(function (row) {
        row.classList.toggle('hidden');
      });
    });
  });
}

function appendStatsRowContent(rowEl, label, attempts, correct) {
  var labelEl = document.createElement('span');
  labelEl.textContent = label;

  var barEl = document.createElement('div');
  barEl.className = 'stats-progress-bar';
  var fillEl = document.createElement('div');
  fillEl.className = 'stats-progress-fill';
  var ratio = attempts > 0 ? (correct / attempts) * 100 : 0;
  fillEl.style.width = ratio + '%';
  barEl.appendChild(fillEl);

  var countEl = document.createElement('span');
  countEl.className = 'stats-count';
  countEl.textContent = attempts + '/' + correct;

  rowEl.appendChild(labelEl);
  rowEl.appendChild(barEl);
  rowEl.appendChild(countEl);
}

function renderPathCells() {
  var track = document.getElementById('path-track');
  track.innerHTML = '';
  for (var i = 0; i < PATH_LENGTH; i++) {
    var cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('data-cell-index', String(i));
    track.appendChild(cell);
  }
}

// Highlights the current path cell (no character token — the monster
// stage above is the primary progress indicator now).
function highlightActiveCell() {
  var cells = document.querySelectorAll('.cell');
  cells.forEach(function (cell) {
    cell.classList.remove('active');
  });
  var activeCell = document.querySelector('.cell[data-cell-index="' + gameState.position + '"]');
  if (activeCell) {
    activeCell.classList.add('active');
  }
}

function nextQuestion() {
  var profile = findProfileById(appState.data, gameState.profileId);
  var buckets = getEnabledBuckets(profile);
  if (buckets.length === 0) {
    buckets = getFallbackBuckets();
  }

  var question = pickBucketAndGenerateQuestion(buckets);
  var options = buildAnswerOptions(question.op, question.correctAnswer).map(function (option) {
    return { value: option.value, isCorrect: option.isCorrect, wrongTapped: false };
  });

  gameState.question = question;
  gameState.options = options;
  gameState.wrongAttempts = 0;

  renderQuestion();
}

function renderQuestion() {
  var questionText = document.getElementById('question-text');
  questionText.textContent =
    gameState.question.displayFirst + ' ' + OPERATOR_SYMBOLS[gameState.question.op] + ' ' + gameState.question.displaySecond;

  var buttons = document.querySelectorAll('.answer-btn');
  buttons.forEach(function (button, index) {
    var option = gameState.options[index];
    button.textContent = String(option.value);
    button.classList.remove('correct', 'wrong');
  });
}

function wireAnswerButtons() {
  var buttons = document.querySelectorAll('.answer-btn');
  buttons.forEach(function (button, index) {
    button.addEventListener('click', function () {
      handleAnswerTap(index, button);
    });
  });
}

function handleAnswerTap(index, button) {
  if (gameState.locked) {
    return;
  }

  var option = gameState.options[index];

  if (option.isCorrect) {
    button.classList.add('correct');
    gameState.locked = true;

    var profile = findProfileById(appState.data, gameState.profileId);
    if (profile) {
      var wasFirstTryCorrect = !gameState.options.some(function (o) { return o.wrongTapped; });
      recordAttempt(profile, gameState.question.op, gameState.question.n, gameState.question.other, wasFirstTryCorrect);
      saveData(appState.data);
    }

    setTimeout(function () {
      if (monsterPartsRevealed >= TOTAL_MONSTER_PARTS) {
        // Previous monster is fully revealed — start a fresh one before
        // revealing its first part.
        startNewMonster();
      }
      revealMonsterPart(document.getElementById('monster-svg'), monsterPartsRevealed);
      monsterPartsRevealed++;

      gameState.position = advancePath(gameState.position, PATH_LENGTH);
      highlightActiveCell();
      nextQuestion();
      gameState.locked = false;
    }, CORRECT_DELAY_MS);
  } else {
    if (option.wrongTapped) {
      return;
    }
    option.wrongTapped = true;
    button.classList.add('wrong');
    gameState.wrongAttempts++;

    if (gameState.wrongAttempts >= MAX_WRONG_ATTEMPTS) {
      // Too many wrong tries: swap in a fresh question, but don't advance
      // the path/monster — only a correct answer does that.
      gameState.locked = true;
      setTimeout(function () {
        nextQuestion();
        gameState.locked = false;
      }, CORRECT_DELAY_MS);
    }
  }
}

function wireExportImport() {
  document.getElementById('btn-export-backup').addEventListener('click', function () {
    var json = exportBackup(appState.data);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'math-game-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import-backup').addEventListener('click', function () {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', function (event) {
    var file = event.target.files[0];
    if (!file) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var errorEl = document.getElementById('import-error');
      errorEl.classList.add('hidden');
      errorEl.textContent = '';

      var parsedData;
      try {
        parsedData = parseImportedBackup(reader.result);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
        event.target.value = '';
        return;
      }

      var confirmed = window.confirm('Импорт заменит все текущие данные. Продолжить?');
      if (!confirmed) {
        event.target.value = '';
        return;
      }

      appState.data = parsedData;
      saveData(appState.data);
      renderBothProfileLists();
      event.target.value = '';
    };
    reader.readAsText(file);
  });
}

function showStorageWarning() {
  document.getElementById('storage-warning-banner').classList.remove('hidden');
}

function wireDismissBanner() {
  document.getElementById('btn-dismiss-storage-warning').addEventListener('click', function () {
    document.getElementById('storage-warning-banner').classList.add('hidden');
  });
}
