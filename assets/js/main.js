(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var CONSENT_KEY = 'cookie-consent'; // "all" | "necessary"
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------
  // Analytics: events go to window.dataLayer. Never include personal data.
  // ---------------------------------------------------------------------
  window.dataLayer = window.dataLayer || [];

  function track(event, params) {
    var payload = Object.assign({ event: event, page: document.body.dataset.page, path: location.pathname }, params || {});
    window.dataLayer.push(payload);
  }

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* storage unavailable */ }
    window.dataLayer.push({ event: 'consent_update', analytics: value === 'all' ? 'granted' : 'denied' });
    if (value === 'all') loadAnalytics();
  }

  function loadAnalytics() {
    // Connect the approved analytics/tag manager here, e.g. inject its script.
    // It is called only after the visitor accepts analytics cookies.
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track], a[download]');
    if (!el) return;
    if (el.hasAttribute('download')) {
      track('file_download', { file: el.getAttribute('href') });
    } else {
      track(el.dataset.track, { label: el.dataset.trackLabel || '' });
    }
  });

  if (document.body.dataset.page === 'caseDetail') {
    track('case_view', { case: location.pathname.split('/').filter(Boolean).pop() });
  }

  // ---------------------------------------------------------------------
  // Cookie banner
  // ---------------------------------------------------------------------
  var banner = document.querySelector('[data-cookie]');
  if (banner) {
    var consent = getConsent();
    if (!consent) banner.hidden = false;
    else if (consent === 'all') loadAnalytics();

    banner.addEventListener('click', function (e) {
      var choice = e.target.closest('[data-cookie-choice]');
      if (!choice) return;
      setConsent(choice.dataset.cookieChoice);
      banner.hidden = true;
    });

    document.querySelectorAll('[data-cookie-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        banner.hidden = false;
        var first = banner.querySelector('button');
        if (first) first.focus();
      });
    });
  }

  // ---------------------------------------------------------------------
  // Header: shadow on scroll, mobile menu, language selector
  // ---------------------------------------------------------------------
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-mobile-menu]');
  if (toggle && menu) {
    var label = toggle.querySelector('.sr-only');

    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      label.textContent = open ? label.dataset.labelClose : label.dataset.labelOpen;
      if (open) {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    };

    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a[href]') && !e.target.closest('[data-lang]')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        setMenu(false);
        toggle.focus();
      }
    });

    // Keep keyboard focus inside the open menu (header toggle + menu).
    document.addEventListener('focusin', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== toggle) toggle.focus();
    });

    window.matchMedia('(min-width: 1101px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  document.querySelectorAll('[data-lang]').forEach(function (wrap) {
    var btn = wrap.querySelector('.lang__btn');
    var list = wrap.querySelector('.lang__menu');

    var setOpen = function (open) {
      btn.setAttribute('aria-expanded', String(open));
      list.hidden = !open;
    };

    btn.addEventListener('click', function () { setOpen(list.hidden); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !list.hidden) {
        e.stopPropagation();
        setOpen(false);
        btn.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) setOpen(false);
    });
    wrap.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) setOpen(false);
    });
  });

  // ---------------------------------------------------------------------
  // Reveal on scroll (subtle, disabled for reduced motion)
  // ---------------------------------------------------------------------
  if (!reducedMotion && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.section-head, .card, .case-card, .steps__item, .principles li, .task-list li, .service, .timeline__item, .layers, .cta-band');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('reveal');
        io.observe(el);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Contact forms
  // ---------------------------------------------------------------------
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  document.querySelectorAll('[data-form]').forEach(function (form) {
    var wrap = form.closest('[data-form-wrap]');
    var success = wrap.querySelector('[data-form-success]');
    var alertBox = form.querySelector('[data-form-alert]');
    var submit = form.querySelector('[data-submit]');
    var submitLabel = submit.querySelector('[data-submit-label]');
    var defaultLabel = submitLabel.textContent;
    var msg = JSON.parse(form.dataset.messages);
    var started = false;

    form.querySelector('[data-ts]').value = String(Date.now());

    function fieldOf(input) { return input.closest('[data-field]'); }

    function validateInput(input) {
      var v = input.type === 'checkbox' ? input.checked : input.value.trim();
      var error = '';
      if (input.required && !v) error = input.type === 'checkbox' ? msg.consent : msg.required;
      else if (input.type === 'email' && v && !EMAIL_RE.test(v)) error = msg.email;
      else if (input.name === 'message' && v && v.length < 10) error = msg.tooShort;
      else if (input.maxLength > 0 && typeof v === 'string' && v.length > input.maxLength) error = msg.tooLong;
      setError(input, error);
      return !error;
    }

    function setError(input, error) {
      var field = fieldOf(input);
      if (!field) return;
      var box = field.querySelector('[data-error]');
      field.classList.toggle('is-invalid', !!error);
      field.classList.toggle('is-valid', !error && input.type !== 'checkbox' && input.tagName !== 'SELECT' && !!input.value.trim());
      input.setAttribute('aria-invalid', error ? 'true' : 'false');
      if (box) box.textContent = error;
    }

    function controls() {
      return Array.prototype.filter.call(form.elements, function (el) {
        return el.name && el.type !== 'hidden' && el.name !== 'website' && fieldOf(el);
      });
    }

    function showAlert(text) {
      alertBox.textContent = text;
      alertBox.hidden = !text;
    }

    function setLoading(on) {
      submit.disabled = on;
      submit.classList.toggle('is-loading', on);
      submitLabel.textContent = on ? submit.dataset.labelSending : defaultLabel;
      form.setAttribute('aria-busy', String(on));
    }

    form.addEventListener('focusin', function () {
      if (!started) {
        started = true;
        track('form_start', { form: form.dataset.source });
      }
    });

    // Validate on blur; once a field is invalid, re-check while typing.
    form.addEventListener('focusout', function (e) {
      if (e.target.name && fieldOf(e.target) && (e.target.value || e.target.type === 'checkbox')) validateInput(e.target);
    });
    form.addEventListener('input', function (e) {
      var field = e.target.name && fieldOf(e.target);
      if (field && field.classList.contains('is-invalid')) validateInput(e.target);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showAlert('');

      var invalid = controls().filter(function (el) { return !validateInput(el); });
      if (invalid.length) {
        showAlert(msg.summary);
        invalid[0].focus();
        return;
      }

      setLoading(true);
      var data = Object.fromEntries(new FormData(form).entries());

      // Static preview (e.g. GitHub Pages): no backend, show the success state only.
      if ('demo' in form.dataset) {
        setTimeout(function () {
          setLoading(false);
          form.hidden = true;
          success.hidden = false;
          success.focus();
        }, 600);
        return;
      }

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) { return { status: res.status, body: body }; });
        })
        .then(function (r) {
          if (r.status >= 200 && r.status < 300 && r.body.ok) {
            track('form_submit', { form: form.dataset.source, request_type: data.type });
            form.hidden = true;
            success.hidden = false;
            success.focus();
            return;
          }
          if (r.status === 422 && r.body.errors) {
            Object.keys(r.body.errors).forEach(function (name) {
              var input = form.elements[name];
              if (input) setError(input, msg[r.body.errors[name]] || msg.required);
            });
            showAlert(msg.summary);
            return;
          }
          showAlert(r.status === 429 ? msg.rateLimit : msg.server);
          track('form_error', { form: form.dataset.source, status: r.status });
        })
        .catch(function () {
          showAlert(msg.server);
          track('form_error', { form: form.dataset.source, status: 0 });
        })
        .finally(function () { setLoading(false); });
    });

    var reset = wrap.querySelector('[data-form-reset]');
    if (reset) {
      reset.addEventListener('click', function () {
        form.reset();
        controls().forEach(function (el) { setError(el, ''); fieldOf(el).classList.remove('is-valid'); });
        form.querySelector('[data-ts]').value = String(Date.now());
        success.hidden = true;
        form.hidden = false;
        form.querySelector('input, textarea').focus();
      });
    }
  });
})();
