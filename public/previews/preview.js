// Width switcher for the preview frame.
document.querySelectorAll('.pv-sizes button').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('.pv-sizes button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    document.getElementById('pv').style.width = b.getAttribute('data-w');
  });
});
