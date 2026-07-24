// DOM-only screen-switching helper. Browser global, loaded after
// game-logic.js/profiles.js/storage.js and before script.js.

function showScreen(screenId) {
  var screens = document.querySelectorAll('.screen');
  screens.forEach(function (screen) {
    if (screen.id === screenId) {
      screen.classList.remove('hidden');
    } else {
      screen.classList.add('hidden');
    }
  });
}
