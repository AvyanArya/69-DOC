/* Eikon Luxury Salon — interactions
   Vanilla JS, no dependencies. */

(function () {
  'use strict';

  /* ── sticky nav shadow ─────────────────────────────── */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    nav.classList.toggle('is-stuck', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── mobile menu ───────────────────────────────────── */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  var closeMenu = function () {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  };

  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });

  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ── service filters ───────────────────────────────── */
  var chips = document.querySelectorAll('.chip');
  var cards = document.querySelectorAll('#serviceGrid .card');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var cat = chip.dataset.cat;

      chips.forEach(function (c) {
        var active = c === chip;
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-selected', String(active));
      });

      cards.forEach(function (card) {
        card.classList.toggle('is-hidden', cat !== 'all' && card.dataset.cat !== cat);
      });
    });
  });

  /* ── scroll reveal ─────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 6) * 60 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ── booking form ──────────────────────────────────── */
  var form = document.getElementById('bookingForm');
  var status = document.getElementById('formStatus');
  var PHONE = '919650117701';

  var setStatus = function (msg, ok) {
    status.textContent = msg;
    status.className = 'book__status ' + (ok ? 'is-ok' : 'is-err');
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var data = new FormData(form);
    var name = (data.get('name') || '').trim();
    var phone = (data.get('phone') || '').trim();
    var service = data.get('service') || '';

    // clear previous errors
    form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('is-invalid'); });

    var invalid = [];
    if (name.length < 2) invalid.push('f-name');
    if (!/^[0-9+\-\s()]{10,15}$/.test(phone)) invalid.push('f-phone');
    if (!service) invalid.push('f-service');

    if (invalid.length) {
      invalid.forEach(function (id) {
        document.getElementById(id).closest('.field').classList.add('is-invalid');
      });
      document.getElementById(invalid[0]).focus();
      setStatus('Please add your name, a valid phone number, and the service you\'d like.', false);
      return;
    }

    // No backend on a static site — hand the request to WhatsApp, prefilled.
    var lines = [
      'Hello Eikon! I\'d like to book an appointment.',
      '',
      'Name: ' + name,
      'Phone: ' + phone,
      'Service: ' + service
    ];
    if (data.get('date')) lines.push('Preferred date: ' + data.get('date'));
    if (data.get('time')) lines.push('Preferred time: ' + data.get('time'));
    if ((data.get('note') || '').trim()) lines.push('Note: ' + data.get('note').trim());

    var url = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(lines.join('\n'));
    window.open(url, '_blank', 'noopener');

    setStatus('Opening WhatsApp with your request — hit send and we\'ll confirm shortly.', true);
    form.reset();
  });

  /* ── footer year ───────────────────────────────────── */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
