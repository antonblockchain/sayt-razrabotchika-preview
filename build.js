'use strict';
// Static site generator: reads content/*.json, renders pages into dist/.
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const site = readJSON('content/site.json');
const brand = site.company.brandName;
const year = new Date().getFullYear();
// Content hash for cache busting of static assets.
const assetVersion = (file) =>
  require('crypto').createHash('md5').update(fs.readFileSync(path.join(ROOT, file))).digest('hex').slice(0, 8);
const cssVer = assetVersion('assets/css/styles.css');
const jsVer = assetVersion('assets/js/main.js');

// ---------- helpers ----------

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Preview builds (e.g. GitHub Pages): SITE_URL=https://user.github.io BASE_PATH=/repo DEMO=1 node build.js
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const ORIGIN = (process.env.SITE_URL || site.baseUrl).replace(/\/$/, '');
const SITE_ROOT = ORIGIN + BASE;
const DEMO = process.env.DEMO === '1';

const langPrefix = (lang) => (lang === site.defaultLanguage ? '' : '/' + lang);
const href = (lang, route) => BASE + langPrefix(lang) + route;
const asset = (p) => BASE + p;
const absUrl = (lang, route) => ORIGIN + href(lang, route);

const featureOn = (item) => !item.feature || site.features[item.feature];

const icons = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  cycle: '<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"/>',
  api: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
  support: '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-2 2.5-5 2.5"/>',
  mobile: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  web: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M2.5 8.5h19M6 6.3h.01M8.5 6.3h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>',
  admin: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><path d="M13.5 15.5h7.5M13.5 19h5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  design: '<path d="M3 21l3.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11z"/><path d="M13 7.5l3 3M15 21h6"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5"/>',
  doc: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h7"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.7"/>',
  id: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16c.6-1.6 2-2.3 3.5-2.3s2.9.7 3.5 2.3M14.5 10h4M14.5 13.5h3"/>',
  flow: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.5 6H14a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-4a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h6.5"/>',
  team: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5M15.5 14.6c3 0 5.5 1.7 5.5 4.9"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  phone: '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.5a11 11 0 0 0 6.5 6.5l1.5-2.3 4.5 1.8V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
};

const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[name] || ''}</svg>`;

const logoMark = `<svg class="logo__mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="8" fill="#0B1624"/><path d="M9 11h8M9 16h14M15 21h8" stroke="#5EEAD4" stroke-width="2.4" stroke-linecap="round"/><circle cx="21" cy="11" r="2" fill="#A5B4FC"/><circle cx="11" cy="21" r="2" fill="#A5B4FC"/></svg>`;

const sectionHead = ({ eyebrow, title, lead, id, center = false, level = 2 }) => `
  <div class="section-head${center ? ' section-head--center' : ''}">
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <h${level} class="section-title"${id ? ` id="${id}"` : ''}>${esc(title)}</h${level}>
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  </div>`;

const btn = (label, url, { variant = 'primary', track, trackLabel, cls = '' } = {}) =>
  `<a class="btn btn--${variant}${cls ? ' ' + cls : ''}" href="${url}"${track ? ` data-track="${track}" data-track-label="${esc(trackLabel || '')}"` : ''}>${esc(label)}${variant === 'link' ? icon('arrow', 'icon icon--sm') : ''}</a>`;

const formatDate = (iso, locale) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString(locale.replace('_', '-'), { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// ---------- shared visuals ----------

const heroVisual = () => {
  const left = [
    { y: 40, label: 'Mobile app' },
    { y: 140, label: 'Web portal' },
    { y: 240, label: 'Back-office' },
    { y: 340, label: 'Chatbot' },
  ];
  const right = [
    { y: 70, label: 'Core services' },
    { y: 190, label: 'Processing' },
    { y: 310, label: 'KYC / CRM' },
  ];
  const cy = 216;
  const node = (x, y, w, label, cls) =>
    `<g class="dg-node ${cls}"><rect x="${x}" y="${y}" width="${w}" height="52" rx="12"/><circle cx="${x + 22}" cy="${y + 26}" r="5"/><text x="${x + 38}" y="${y + 31}">${label}</text></g>`;
  const paths = [
    ...left.map((n) => `M170 ${n.y + 26} C 205 ${n.y + 26}, 205 ${cy}, 236 ${cy}`),
    ...right.map((n) => `M356 ${cy} C 387 ${cy}, 387 ${n.y + 26}, 420 ${n.y + 26}`),
  ];
  return `
  <div class="hero-visual" aria-hidden="true">
    <svg class="diagram" viewBox="0 0 580 432" width="580" height="432" focusable="false">
      <g class="dg-links">${paths.map((d) => `<path d="${d}"/>`).join('')}</g>
      <g class="dg-flow">${paths.map((d, i) => `<path d="${d}" style="animation-delay:-${(i * 0.45).toFixed(2)}s"/>`).join('')}</g>
      ${left.map((n) => node(0, n.y, 170, n.label, 'dg-node--ui')).join('')}
      <g class="dg-core">
        <rect x="236" y="${cy - 70}" width="120" height="140" rx="16"/>
        <text x="296" y="${cy - 34}" text-anchor="middle" class="dg-core__title">Integration</text>
        <text x="296" y="${cy - 16}" text-anchor="middle" class="dg-core__title">layer</text>
        <rect class="dg-core__bar" x="256" y="${cy + 4}" width="80" height="8" rx="4"/>
        <rect class="dg-core__bar" x="256" y="${cy + 20}" width="60" height="8" rx="4"/>
        <rect class="dg-core__bar" x="256" y="${cy + 36}" width="70" height="8" rx="4"/>
      </g>
      ${right.map((n) => node(420, n.y, 160, n.label, 'dg-node--sys')).join('')}
    </svg>
    <div class="ui-card hero-visual__card">
      <div class="ui-card__head"><span class="ui-card__title">Operations</span><span class="ui-dots"><i></i><i></i><i></i></span></div>
      <ul class="ui-rows">
        <li><span class="ui-bar" style="--w:62%"></span><span class="chip chip--ok">Completed</span></li>
        <li><span class="ui-bar" style="--w:48%"></span><span class="chip chip--wait">In review</span></li>
        <li><span class="ui-bar" style="--w:70%"></span><span class="chip chip--info">Pending</span></li>
      </ul>
    </div>
  </div>`;
};

const uiSkeleton = (variant = 0) => {
  const rows = [
    ['72%', 'ok'], ['54%', 'info'], ['64%', 'wait'],
  ];
  const r = rows.map((_, i) => rows[(i + variant) % rows.length]);
  return `
  <div class="ui-skeleton ui-skeleton--v${variant % 3}" aria-hidden="true">
    <div class="ui-skeleton__side"><i></i><i></i><i></i><i></i></div>
    <div class="ui-skeleton__main">
      <div class="ui-skeleton__top"><span></span><span></span></div>
      ${r.map(([w, c]) => `<div class="ui-skeleton__row"><span class="ui-bar" style="--w:${w}"></span><span class="dot dot--${c}"></span></div>`).join('')}
    </div>
  </div>`;
};

const layersVisual = () => `
  <div class="layers" aria-hidden="true">
    <div class="layers__item layers__item--1"><span>Interfaces</span><small>Mobile · Web · Accounts · Bots</small></div>
    <div class="layers__item layers__item--2"><span>Integration layer</span><small>API · Events · Monitoring</small></div>
    <div class="layers__item layers__item--3"><span>Systems and providers</span><small>Core services · Processing · KYC · CRM</small></div>
  </div>`;

// ---------- components ----------

const languageSelector = (ctx, idSuffix) => {
  const { lang, t, route } = ctx;
  const current = site.languages.find((l) => l.code === lang);
  const id = `lang-menu-${idSuffix}`;
  return `
  <div class="lang" data-lang>
    <button class="lang__btn" type="button" aria-expanded="false" aria-controls="${id}" aria-label="${esc(t.ui.language)}: ${esc(current.label)}">
      ${icon('globe', 'icon icon--sm')}<span>${esc(current.short)}</span>${icon('chevron', 'icon icon--xs')}
    </button>
    <ul class="lang__menu" id="${id}" hidden>
      ${site.languages
        .map(
          (l) =>
            `<li><a href="${href(l.code, route)}" lang="${l.code}" hreflang="${l.code}"${l.code === lang ? ' aria-current="true"' : ''}>${esc(l.label)}</a></li>`
        )
        .join('')}
    </ul>
  </div>`;
};

const header = (ctx) => {
  const { lang, t, route } = ctx;
  const nav = t.nav.filter(featureOn);
  const isCurrent = (r) => (r === route || (r !== '/' && route.startsWith(r)) ? ' aria-current="page"' : '');
  const link = (n) =>
    `<li><a href="${href(lang, n.route)}"${isCurrent(n.route)}${n.route === '/contact/' ? ' data-track="contact_nav" data-track-label="header"' : ''}>${esc(n.label)}</a></li>`;
  return `
<header class="site-header" data-header>
  <div class="container site-header__inner">
    <a class="logo" href="${href(lang, '/')}" aria-label="${esc(brand)} — ${esc(t.ui.home)}">${logoMark}<span class="logo__text">${esc(brand)}</span></a>
    <nav class="nav" aria-label="Main">
      <ul class="nav__list">${nav.filter((n) => n.route !== '/contact/').map(link).join('')}</ul>
    </nav>
    <div class="site-header__actions">
      ${languageSelector(ctx, 'desktop')}
      ${btn(t.ui.cta, href(lang, '/contact/'), { variant: 'primary', track: 'cta_click', trackLabel: 'header', cls: 'btn--sm site-header__cta' })}
      <button class="burger" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
        <span class="burger__lines" aria-hidden="true"></span>
        <span class="sr-only" data-label-open="${esc(t.ui.menu)}" data-label-close="${esc(t.ui.closeMenu)}">${esc(t.ui.menu)}</span>
      </button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden data-mobile-menu>
    <nav class="mobile-menu__nav" aria-label="Mobile">
      <ul>${nav.map(link).join('')}</ul>
    </nav>
    <div class="mobile-menu__footer">
      ${languageSelector(ctx, 'mobile')}
      ${btn(t.ui.cta, href(lang, '/contact/'), { variant: 'primary', track: 'cta_click', trackLabel: 'mobile_menu', cls: 'btn--block' })}
    </div>
  </div>
</header>`;
};

const footer = (ctx) => {
  const { lang, t } = ctx;
  const c = site.company;
  return `
<footer class="site-footer">
  <div class="container">
    <div class="site-footer__grid">
      <div class="site-footer__brand">
        <a class="logo logo--light" href="${href(lang, '/')}">${logoMark}<span class="logo__text">${esc(brand)}</span></a>
        <p>${esc(t.footer.about)}</p>
        <p class="site-footer__disclaimer">${esc(t.footer.disclaimer)}</p>
      </div>
      <nav class="site-footer__col" aria-labelledby="f-nav">
        <h2 class="site-footer__title" id="f-nav">${esc(t.footer.navTitle)}</h2>
        <ul>${t.nav
          .filter(featureOn)
          .map((n) => `<li><a href="${href(lang, n.route)}"${n.route === '/contact/' ? ' data-track="contact_nav" data-track-label="footer"' : ''}>${esc(n.label)}</a></li>`)
          .join('')}</ul>
      </nav>
      <div class="site-footer__col">
        <h2 class="site-footer__title">${esc(t.footer.contactTitle)}</h2>
        <ul>
          <li><a href="mailto:${esc(c.email)}" data-track="contact_nav" data-track-label="footer_email">${esc(c.email)}</a></li>
          ${c.phone ? `<li><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></li>` : ''}
          ${c.channels.map((ch) => `<li><a href="${esc(ch.url)}" rel="noopener" target="_blank">${esc(ch.label)}</a></li>`).join('')}
        </ul>
      </div>
      <div class="site-footer__col">
        <h2 class="site-footer__title">${esc(t.footer.legalTitle)}</h2>
        <address class="site-footer__legal">${esc(c.legalName)}<br>${esc(c.registration)}<br>${esc(c.address)}</address>
        <ul>
          ${t.footer.legal.map((l) => `<li><a href="${href(lang, l.route)}">${esc(l.label)}</a></li>`).join('')}
          <li><button class="link-button" type="button" data-cookie-open>${esc(t.footer.cookieSettings)}</button></li>
        </ul>
      </div>
    </div>
    <div class="site-footer__bottom">
      <p>© ${year} ${esc(c.legalName)}. ${esc(t.footer.rights)}</p>
    </div>
  </div>
</footer>`;
};

const cookieBanner = (ctx) => {
  const { lang, t } = ctx;
  return `
<div class="cookie" data-cookie hidden role="region" aria-labelledby="cookie-title">
  <div class="cookie__inner">
    <div class="cookie__text">
      <h2 class="cookie__title" id="cookie-title">${esc(t.cookie.title)}</h2>
      <p>${esc(t.cookie.text)} <a href="${href(lang, '/cookie-policy/')}">${esc(t.cookie.more)}</a></p>
    </div>
    <div class="cookie__actions">
      <button class="btn btn--secondary btn--sm" type="button" data-cookie-choice="necessary">${esc(t.cookie.reject)}</button>
      <button class="btn btn--primary btn--sm" type="button" data-cookie-choice="all">${esc(t.cookie.accept)}</button>
    </div>
  </div>
</div>`;
};

const contactForm = (ctx, { id, source, compact = false }) => {
  const { lang, t } = ctx;
  const f = t.form;
  const fid = (name) => `${id}-${name}`;
  const field = ({ name, label, type = 'text', required = true, autocomplete, maxlength, hint, full = false }) => `
      <div class="field${full ? ' field--full' : ''}" data-field>
        <label class="field__label" for="${fid(name)}">${esc(label)}${required ? '' : ` <span class="field__optional">(${esc(f.optional)})</span>`}</label>
        ${
          type === 'textarea'
            ? `<textarea class="field__control" id="${fid(name)}" name="${name}" rows="5" ${required ? 'required ' : ''}minlength="10" maxlength="${maxlength}" aria-describedby="${fid(name)}-hint ${fid(name)}-error"></textarea>`
            : `<input class="field__control" id="${fid(name)}" name="${name}" type="${type}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${required ? ' required' : ''} maxlength="${maxlength}" aria-describedby="${fid(name)}-error">`
        }
        ${hint ? `<p class="field__hint" id="${fid(name)}-hint">${esc(hint)}</p>` : ''}
        <p class="field__error" id="${fid(name)}-error" data-error></p>
      </div>`;
  return `
  <div class="form-wrap" data-form-wrap>
    <form class="form" id="${id}" action="${asset('/api/contact')}" method="post" novalidate data-form${DEMO ? ' data-demo' : ''}data-source="${esc(source)}" data-messages='${esc(JSON.stringify(f.errors))}'>
      <div class="form__alert" role="alert" data-form-alert hidden></div>
      <div class="form__grid">
        ${field({ name: 'name', label: f.name, autocomplete: 'name', maxlength: 100 })}
        ${field({ name: 'email', label: f.email, type: 'email', autocomplete: 'email', maxlength: 150 })}
        ${field({ name: 'company', label: f.company, autocomplete: 'organization', maxlength: 150 })}
        ${compact ? '' : field({ name: 'phone', label: f.phone, type: 'tel', autocomplete: 'tel', required: false, maxlength: 40 })}
        <div class="field${compact ? '' : ' field--full'}" data-field>
          <label class="field__label" for="${fid('type')}">${esc(f.type)}</label>
          <div class="select">
            <select class="field__control" id="${fid('type')}" name="type" aria-describedby="${fid('type')}-error">
              ${f.types.map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join('')}
            </select>
            ${icon('chevron', 'icon icon--sm select__icon')}
          </div>
          <p class="field__error" id="${fid('type')}-error" data-error></p>
        </div>
        ${field({ name: 'message', label: f.message, type: 'textarea', maxlength: 3000, hint: f.messageHint, full: true })}
        ${
          site.features.consentCheckbox
            ? `<div class="field field--full field--check" data-field>
          <div class="check">
            <input class="check__input" id="${fid('consent')}" name="consent" type="checkbox" value="yes" required aria-describedby="${fid('consent')}-error">
            <label class="check__label" for="${fid('consent')}">${esc(f.consentBefore)} <a href="${href(lang, '/privacy-policy/')}" target="_blank">${esc(f.consentLink)}</a>.</label>
          </div>
          <p class="field__error" id="${fid('consent')}-error" data-error></p>
        </div>`
            : ''
        }
      </div>
      <div class="hp" aria-hidden="true">
        <label for="${fid('website')}">Website</label>
        <input id="${fid('website')}" name="website" type="text" tabindex="-1" autocomplete="off">
      </div>
      <input type="hidden" name="ts" value="" data-ts>
      <input type="hidden" name="lang" value="${lang}">
      <input type="hidden" name="source" value="${esc(source)}">
      <div class="form__actions">
        <button class="btn btn--primary btn--lg" type="submit" data-submit data-label-sending="${esc(f.sending)}">
          <span class="btn__spinner" aria-hidden="true"></span><span data-submit-label>${esc(f.submit)}</span>
        </button>
      </div>
    </form>
    <div class="form-success" data-form-success hidden tabindex="-1">
      ${icon('check', 'icon icon--xl')}
      <h3 class="form-success__title">${esc(f.successTitle)}</h3>
      <p>${esc(f.successText)}</p>
      ${DEMO ? `<p class="note">${esc(f.demoNote)}</p>` : ''}
      <button class="btn btn--secondary" type="button" data-form-reset>${esc(f.successAgain)}</button>
    </div>
  </div>`;
};

const ctaBand = (ctx, label) => {
  const { lang, t } = ctx;
  return `
  <section class="section section--tight">
    <div class="container">
      <div class="cta-band">
        <div>
          <h2 class="cta-band__title">${esc(t.ui.ctaBandTitle)}</h2>
          <p>${esc(t.ui.ctaBandText)}</p>
        </div>
        ${btn(t.ui.cta, href(lang, '/contact/'), { variant: 'on-dark', track: 'cta_click', trackLabel: label, cls: 'btn--lg' })}
      </div>
    </div>
  </section>`;
};

const pageHero = ({ eyebrow, title, lead }, extra = '') => `
  <section class="page-hero">
    <div class="container">
      ${extra}
      <p class="eyebrow eyebrow--light">${esc(eyebrow)}</p>
      <h1 class="page-hero__title">${esc(title)}</h1>
      ${lead ? `<p class="page-hero__lead">${esc(lead)}</p>` : ''}
    </div>
  </section>`;

const breadcrumbs = (ctx, items) => {
  const { lang, t } = ctx;
  const all = [{ label: t.ui.home, route: '/' }, ...items];
  return `<nav class="breadcrumbs" aria-label="${esc(t.ui.breadcrumbs)}"><ol>${all
    .map((it, i) =>
      i === all.length - 1
        ? `<li><span aria-current="page">${esc(it.label)}</span></li>`
        : `<li><a href="${href(lang, it.route)}">${esc(it.label)}</a></li>`
    )
    .join('')}</ol></nav>`;
};

const caseCard = (ctx, c, i, headingLevel = 3) => {
  const { lang, t } = ctx;
  const url = href(lang, `/case-studies/${c.slug}/`);
  return `
  <article class="case-card">
    <div class="case-card__visual">${uiSkeleton(i)}</div>
    <div class="case-card__body">
      <div class="case-card__meta">
        <p class="case-card__client">${esc(c.client)}</p>
        ${c.placeholder ? `<span class="badge">${esc(t.ui.placeholderBadge)}</span>` : ''}
      </div>
      <h${headingLevel} class="case-card__title"><a href="${url}" class="stretched-link" data-track="case_open" data-track-label="${esc(c.slug)}">${esc(c.title)}</a></h${headingLevel}>
      <p>${esc(c.summary)}</p>
      <ul class="tags">${c.tags.map((tag) => `<li>${esc(tag)}</li>`).join('')}</ul>
      <span class="link-arrow" aria-hidden="true">${esc(t.ui.readCase)}${icon('arrow', 'icon icon--sm')}</span>
    </div>
  </article>`;
};

const featureCard = (it, { headingLevel = 3, link } = {}) => `
  <article class="card${link ? ' card--link' : ''}">
    <span class="card__icon">${icon(it.icon)}</span>
    <h${headingLevel} class="card__title">${link ? `<a href="${link}" class="stretched-link">${esc(it.title)}</a>` : esc(it.title)}</h${headingLevel}>
    <p>${esc(it.text)}</p>
    ${link ? `<span class="card__arrow" aria-hidden="true">${icon('arrow', 'icon icon--sm')}</span>` : ''}
  </article>`;

const processSteps = (steps) => `
  <ol class="steps">
    ${steps
      .map(
        (s, i) => `
      <li class="steps__item">
        <span class="steps__num">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="steps__title">${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
      </li>`
      )
      .join('')}
  </ol>`;

// ---------- layout ----------

const layout = (ctx, { title, description, body, page, ogType = 'website', noindex = false, jsonLd = [] }) => {
  const { lang, route } = ctx;
  const langInfo = site.languages.find((l) => l.code === lang);
  const fullTitle = route === '/' ? `${brand} — ${title}` : `${title} | ${brand}`;
  const canonical = absUrl(lang, route);
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand,
    legalName: site.company.legalName,
    url: SITE_ROOT,
    email: site.company.email,
    logo: SITE_ROOT + '/assets/img/favicon.svg',
    sameAs: site.company.channels.map((c) => c.url),
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex || DEMO ? '<meta name="robots" content="noindex">' : ''}
${noindex ? '' : `<link rel="canonical" href="${canonical}">`}
${noindex ? '' : site.languages.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${absUrl(l.code, route)}">`).join('\n')}
${noindex ? '' : `<link rel="alternate" hreflang="x-default" href="${absUrl(site.defaultLanguage, route)}">`}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(brand)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${langInfo.locale}">
<meta property="og:image" content="${SITE_ROOT}/assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0B1624">
<link rel="icon" href="${asset('/assets/img/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${asset('/assets/css/styles.css')}?v=${cssVer}">
<script src="${asset('/assets/js/main.js')}?v=${jsVer}" defer></script>
${[org, ...jsonLd].map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n')}
</head>
<body data-page="${page}">
<a class="skip-link" href="#main">${esc(ctx.t.ui.skipLink)}</a>
${header(ctx)}
<main id="main" tabindex="-1">
${body}
</main>
${footer(ctx)}
${cookieBanner(ctx)}
</body>
</html>
`;
};

// ---------- pages ----------

const pages = {
  home(ctx) {
    const { lang, t, cases } = ctx;
    const p = t.pages.home;
    const featured = cases.filter((c) => c.featured).slice(0, 4);
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  <section class="hero">
    <div class="container hero__inner">
      <div class="hero__content">
        <p class="eyebrow eyebrow--light">${esc(p.hero.eyebrow)}</p>
        <h1 class="hero__title">${esc(p.hero.title)}</h1>
        <p class="hero__lead">${esc(p.hero.lead)}</p>
        <div class="hero__actions">
          ${btn(t.ui.cta, href(lang, '/contact/'), { variant: 'primary', track: 'cta_click', trackLabel: 'hero', cls: 'btn--lg' })}
          ${btn(p.hero.secondary, href(lang, '/expertise/'), { variant: 'ghost-light', cls: 'btn--lg' })}
        </div>
      </div>
      ${heroVisual()}
    </div>
  </section>

  <section class="trust" aria-labelledby="trust-title">
    <div class="container">
      <h2 class="sr-only" id="trust-title">${esc(p.trust.title)}</h2>
      <ul class="trust__list">
        ${p.trust.items
          .map((it) => `<li class="trust__item">${icon(it.icon)}<div><h3 class="trust__title">${esc(it.title)}</h3><p>${esc(it.text)}</p></div></li>`)
          .join('')}
      </ul>
    </div>
  </section>

  <section class="section" aria-labelledby="directions-title">
    <div class="container">
      ${sectionHead({ ...p.directions, id: 'directions-title' })}
      <div class="grid grid--3">
        ${p.directions.items.map((it) => featureCard(it, { link: href(lang, `/expertise/#${it.anchor}`) })).join('')}
      </div>
    </div>
  </section>

  <section class="section section--alt" aria-labelledby="tasks-title">
    <div class="container split">
      ${sectionHead({ ...p.tasks, id: 'tasks-title' })}
      <ol class="task-list">
        ${p.tasks.items.map((it, i) => `<li><span class="task-list__num">${i + 1}</span><div><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div></li>`).join('')}
      </ol>
    </div>
  </section>

  <section class="section" aria-labelledby="industries-title">
    <div class="container split split--center">
      <div>
        ${sectionHead({ eyebrow: p.industries.eyebrow, title: p.industries.title, id: 'industries-title' })}
        <p>${esc(p.industries.text)}</p>
        <ul class="list-check">${p.industries.points.map((x) => `<li>${icon('check', 'icon icon--sm')}${esc(x)}</li>`).join('')}</ul>
        <p class="note">${esc(p.industries.note)}</p>
        ${btn(p.industries.link, href(lang, '/industries/'), { variant: 'link' })}
      </div>
      ${layersVisual()}
    </div>
  </section>

  <section class="section section--dark" aria-labelledby="process-title">
    <div class="container">
      ${sectionHead({ eyebrow: p.process.eyebrow, title: p.process.title, id: 'process-title' })}
      ${processSteps(t.process)}
      <div class="section-foot">${btn(p.process.link, href(lang, '/how-we-work/'), { variant: 'link-light' })}</div>
    </div>
  </section>

  <section class="section" aria-labelledby="cases-title">
    <div class="container">
      <div class="section-head-row">
        ${sectionHead({ ...p.cases, id: 'cases-title' })}
        ${btn(t.ui.allCases, href(lang, '/case-studies/'), { variant: 'link' })}
      </div>
      <div class="grid grid--3">${featured.map((c, i) => caseCard(ctx, c, i)).join('')}</div>
    </div>
  </section>

  <section class="section section--alt" aria-labelledby="principles-title">
    <div class="container">
      ${sectionHead({ ...p.principles, id: 'principles-title' })}
      <ul class="principles">
        ${t.principles.map((it) => `<li>${icon(it.icon)}<h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></li>`).join('')}
      </ul>
    </div>
  </section>

  <section class="section final-cta" id="discuss" aria-labelledby="final-title">
    <div class="container split">
      <div class="final-cta__intro">
        <h2 class="section-title" id="final-title">${esc(p.finalCta.title)}</h2>
        <p class="lead">${esc(p.finalCta.text)}</p>
        <p class="final-cta__mail">${icon('mail', 'icon icon--sm')}<a href="mailto:${esc(site.company.email)}" data-track="contact_nav" data-track-label="home_email">${esc(site.company.email)}</a></p>
      </div>
      ${contactForm(ctx, { id: 'home-form', source: 'home', compact: true })}
    </div>
  </section>`,
    };
  },

  expertise(ctx) {
    const { lang, t } = ctx;
    const p = t.pages.expertise;
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  ${pageHero(p.hero, breadcrumbs(ctx, [{ label: p.hero.eyebrow }]))}
  <section class="section">
    <div class="container">
      <nav class="chips-nav" aria-label="${esc(p.listTitle)}">
        <ul>${p.items.map((it) => `<li><a href="#${it.id}">${esc(it.title)}</a></li>`).join('')}</ul>
      </nav>
      <div class="service-list">
        ${p.items
          .map(
            (it, i) => `
        <article class="service" id="${it.id}">
          <div class="service__head">
            <span class="service__num">${String(i + 1).padStart(2, '0')}</span>
            <span class="card__icon">${icon(it.icon)}</span>
          </div>
          <div class="service__body">
            <h2 class="service__title">${esc(it.title)}</h2>
            <p>${esc(it.text)}</p>
          </div>
          <ul class="list-check service__points">${it.points.map((x) => `<li>${icon('check', 'icon icon--sm')}${esc(x)}</li>`).join('')}</ul>
        </article>`
          )
          .join('')}
      </div>
    </div>
  </section>
  <section class="section section--alt">
    <div class="container split split--center">
      ${sectionHead({ title: p.combine.title, lead: p.combine.text })}
      ${layersVisual()}
    </div>
  </section>
  ${ctaBand(ctx, 'expertise')}`,
    };
  },

  industries(ctx) {
    const { t } = ctx;
    const p = t.pages.industries;
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  ${pageHero(p.hero, breadcrumbs(ctx, [{ label: p.hero.eyebrow }]))}
  <section class="section">
    <div class="container">
      <div class="grid grid--2">
        ${p.items
          .map(
            (it) => `
        <article class="card card--row">
          <span class="card__icon">${icon(it.icon)}</span>
          <div>
            <h2 class="card__title">${esc(it.title)}</h2>
            <p>${esc(it.text)}</p>
            <ul class="tags">${it.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </article>`
          )
          .join('')}
      </div>
      <p class="note note--block">${esc(p.note)}</p>
    </div>
  </section>
  <section class="section section--alt">
    <div class="container narrow">
      ${sectionHead({ title: p.beyond.title, lead: p.beyond.text })}
    </div>
  </section>
  ${ctaBand(ctx, 'industries')}`,
    };
  },

  howWeWork(ctx) {
    const { t } = ctx;
    const p = t.pages.howWeWork;
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  ${pageHero(p.hero, breadcrumbs(ctx, [{ label: p.hero.eyebrow }]))}
  <section class="section" aria-labelledby="stages-title">
    <div class="container">
      ${sectionHead({ title: p.stagesTitle, id: 'stages-title' })}
      <ol class="timeline">
        ${p.stages
          .map(
            (s, i) => `
        <li class="timeline__item">
          <span class="timeline__num">${i + 1}</span>
          <div class="timeline__body">
            <h3 class="timeline__title">${esc(s.title)}</h3>
            <ul class="tags tags--soft">${s.result.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </li>`
          )
          .join('')}
      </ol>
    </div>
  </section>
  <section class="section section--alt" aria-labelledby="control-title">
    <div class="container">
      ${sectionHead({ title: p.controlTitle, id: 'control-title' })}
      <div class="grid grid--4">${p.control.map((it) => featureCard(it)).join('')}</div>
    </div>
  </section>
  <section class="section" aria-labelledby="roles-title">
    <div class="container split">
      ${sectionHead({ title: p.rolesTitle, lead: p.rolesLead, id: 'roles-title' })}
      <ul class="roles">${p.roles.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    </div>
  </section>
  <section class="section section--dark" aria-labelledby="formats-title">
    <div class="container">
      ${sectionHead({ title: p.formatsTitle, id: 'formats-title' })}
      <div class="grid grid--4">${p.formats.map((it) => featureCard(it)).join('')}</div>
    </div>
  </section>
  ${ctaBand(ctx, 'how_we_work')}`,
    };
  },

  cases(ctx) {
    const { t, cases } = ctx;
    const p = t.pages.cases;
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  ${pageHero(p.hero, breadcrumbs(ctx, [{ label: p.hero.eyebrow }]))}
  <section class="section">
    <div class="container">
      <div class="grid grid--2">${cases.map((c, i) => caseCard(ctx, c, i, 2)).join('')}</div>
    </div>
  </section>
  <section class="section section--alt">
    <div class="container split">
      ${sectionHead({ title: p.structureTitle })}
      <ol class="structure-list">${Object.values(p.sections).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    </div>
  </section>
  ${ctaBand(ctx, 'cases')}`,
    };
  },

  caseDetail(ctx, c) {
    const { lang, t, cases } = ctx;
    const p = t.pages.cases;
    const s = p.sections;
    const idx = cases.indexOf(c);
    const next = cases[(idx + 1) % cases.length];
    const block = (key, content) => `
        <section class="case-section" aria-labelledby="cs-${key}">
          <h2 class="case-section__title" id="cs-${key}">${esc(s[key])}</h2>
          ${Array.isArray(content) ? `<ul class="list-check">${content.map((x) => `<li>${icon('check', 'icon icon--sm')}${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(content)}</p>`}
        </section>`;
    return {
      title: c.title,
      description: c.summary,
      ogType: 'article',
      body: `
  ${pageHero({ eyebrow: c.client, title: c.title, lead: c.summary }, breadcrumbs(ctx, [{ label: p.hero.eyebrow, route: '/case-studies/' }, { label: c.title }]))}
  <section class="section">
    <div class="container case-layout">
      <div class="case-layout__main">
        ${c.placeholder ? `<p class="note note--block">${esc(t.ui.placeholderNote)}</p>` : ''}
        ${block('context', c.context)}
        ${block('challenge', c.challenge)}
        ${block('constraints', c.constraints)}
        ${block('work', c.work)}
        ${block('solution', c.solution)}
        ${block('result', c.result)}
        ${c.tech ? block('tech', c.tech) : ''}
      </div>
      <aside class="case-layout__aside">
        <div class="aside-card">
          ${uiSkeleton(idx)}
          <ul class="tags">${c.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          ${btn(t.ui.cta, href(lang, '/contact/'), { variant: 'primary', track: 'cta_click', trackLabel: 'case_aside', cls: 'btn--block' })}
        </div>
      </aside>
    </div>
  </section>
  <section class="section section--alt section--tight">
    <div class="container next-link">
      <span class="eyebrow">${esc(t.ui.nextStep)}</span>
      <a class="next-link__a" href="${href(lang, `/case-studies/${next.slug}/`)}">${esc(next.title)}${icon('arrow')}</a>
    </div>
  </section>
  ${ctaBand(ctx, 'case_detail')}`,
    };
  },

  about(ctx) {
    const { lang, t } = ctx;
    const p = t.pages.about;
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  ${pageHero(p.hero, breadcrumbs(ctx, [{ label: p.hero.eyebrow }]))}
  <section class="section">
    <div class="container split">
      ${sectionHead({ title: p.storyTitle })}
      <div class="prose">${p.story.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
    </div>
  </section>
  <section class="section section--dark">
    <div class="container narrow">
      <p class="eyebrow eyebrow--light">${esc(p.missionTitle)}</p>
      <p class="mission">${esc(p.mission)}</p>
    </div>
  </section>
  <section class="section" aria-labelledby="ab-principles">
    <div class="container">
      ${sectionHead({ title: p.principlesTitle, id: 'ab-principles' })}
      <ul class="principles">${p.principles.map((it) => `<li>${icon(it.icon)}<h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></li>`).join('')}</ul>
    </div>
  </section>
  <section class="section section--alt" aria-labelledby="ab-team">
    <div class="container">
      ${sectionHead({ title: p.teamTitle, lead: p.teamLead, id: 'ab-team' })}
      <div class="grid grid--4">${p.team.map((it) => `<article class="card"><h3 class="card__title">${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join('')}</div>
    </div>
  </section>
  <section class="section" aria-labelledby="ab-geo">
    <div class="container split">
      ${sectionHead({ title: p.geographyTitle, id: 'ab-geo' })}
      <p class="lead">${esc(p.geography)}</p>
    </div>
  </section>
  ${
    site.features.careers
      ? `<section class="section section--alt"><div class="container narrow">${sectionHead({ title: p.careers.title, lead: p.careers.text })}<a class="btn btn--secondary" href="mailto:${esc(site.company.email)}">${esc(p.careers.link)}</a></div></section>`
      : ''
  }
  ${ctaBand(ctx, 'about')}`,
    };
  },

  insights(ctx) {
    const { lang, t, insights } = ctx;
    const p = t.pages.insights;
    const locale = site.languages.find((l) => l.code === lang).locale;
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  ${pageHero(p.hero, breadcrumbs(ctx, [{ label: p.hero.eyebrow }]))}
  <section class="section">
    <div class="container">
      <div class="grid grid--3">
        ${insights
          .map(
            (a) => `
        <article class="card card--link article-card">
          <p class="article-card__meta"><span class="tag">${esc(a.topic)}</span><time datetime="${a.date}">${formatDate(a.date, locale)}</time></p>
          <h2 class="card__title"><a class="stretched-link" href="${href(lang, `/insights/${a.slug}/`)}">${esc(a.title)}</a></h2>
          <p>${esc(a.summary)}</p>
          <span class="link-arrow" aria-hidden="true">${esc(t.ui.readArticle)}${icon('arrow', 'icon icon--sm')}</span>
        </article>`
          )
          .join('')}
      </div>
    </div>
  </section>
  ${ctaBand(ctx, 'insights')}`,
    };
  },

  article(ctx, a) {
    const { lang, t } = ctx;
    const p = t.pages.insights;
    const locale = site.languages.find((l) => l.code === lang).locale;
    return {
      title: a.title,
      description: a.summary,
      ogType: 'article',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.date, publisher: { '@type': 'Organization', name: brand } }],
      body: `
  ${pageHero({ eyebrow: a.topic, title: a.title, lead: a.summary }, breadcrumbs(ctx, [{ label: p.hero.eyebrow, route: '/insights/' }, { label: a.title }]))}
  <section class="section">
    <div class="container narrow">
      <p class="article-meta"><time datetime="${a.date}">${formatDate(a.date, locale)}</time> · ${a.minutes} ${esc(t.ui.minRead)}</p>
      <div class="prose">${a.body.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
      <p class="section-foot">${btn(t.ui.allArticles, href(lang, '/insights/'), { variant: 'link' })}</p>
    </div>
  </section>
  ${ctaBand(ctx, 'article')}`,
    };
  },

  contact(ctx) {
    const { t } = ctx;
    const p = t.pages.contact;
    const c = site.company;
    return {
      title: p.seo.title,
      description: p.seo.description,
      body: `
  ${pageHero(p.hero, breadcrumbs(ctx, [{ label: p.hero.eyebrow }]))}
  <section class="section">
    <div class="container contact-layout">
      <div class="contact-layout__form">
        <h2 class="section-title section-title--sm">${esc(t.form.title)}</h2>
        ${contactForm(ctx, { id: 'contact-form', source: 'contact' })}
      </div>
      <aside class="contact-layout__aside">
        <div class="aside-card">
          <h2 class="aside-card__title">${esc(p.nextTitle)}</h2>
          <ol class="mini-steps">${p.next.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        </div>
        <div class="aside-card">
          <h2 class="aside-card__title">${esc(p.detailsTitle)}</h2>
          <dl class="details">
            <dt>${esc(p.emailLabel)}</dt><dd><a href="mailto:${esc(c.email)}" data-track="contact_nav" data-track-label="contact_email">${esc(c.email)}</a></dd>
            ${c.phone ? `<dt>${esc(p.phoneLabel)}</dt><dd><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></dd>` : ''}
            <dt>${esc(p.legalLabel)}</dt><dd>${esc(c.legalName)}</dd>
            <dt>${esc(p.registrationLabel)}</dt><dd>${esc(c.registration)}</dd>
            <dt>${esc(p.addressLabel)}</dt><dd>${esc(c.address)}</dd>
          </dl>
          <ul class="channels">${c.channels.map((ch) => `<li><a href="${esc(ch.url)}" rel="noopener" target="_blank">${icon('link', 'icon icon--sm')}${esc(ch.label)}</a></li>`).join('')}</ul>
        </div>
      </aside>
    </div>
  </section>`,
    };
  },

  thankYou(ctx) {
    const { lang, t } = ctx;
    const p = t.pages.thankYou;
    return {
      title: p.seo.title,
      description: p.seo.description,
      noindex: true,
      body: `
  <section class="section status-page">
    <div class="container narrow">
      ${icon('check', 'icon icon--xl')}
      <h1 class="section-title">${esc(p.title)}</h1>
      <p class="lead">${esc(p.text)}</p>
      ${btn(p.back, href(lang, '/'), { variant: 'secondary' })}
    </div>
  </section>`,
    };
  },

  notFound(ctx) {
    const { lang, t } = ctx;
    const p = t.pages.notFound;
    return {
      title: p.seo.title,
      description: p.seo.description,
      noindex: true,
      body: `
  <section class="section status-page">
    <div class="container narrow">
      <p class="status-page__code">404</p>
      <h1 class="section-title">${esc(p.title)}</h1>
      <p class="lead">${esc(p.text)}</p>
      <div class="hero__actions">
        ${btn(p.back, href(lang, '/'), { variant: 'secondary' })}
        ${btn(t.ui.cta, href(lang, '/contact/'), { variant: 'primary', track: 'cta_click', trackLabel: '404' })}
      </div>
    </div>
  </section>`,
    };
  },

  legal(ctx, doc) {
    const { t } = ctx;
    const l = t.pages.legal;
    return {
      title: doc.title,
      description: doc.description,
      body: `
  ${pageHero({ eyebrow: t.footer.legalTitle, title: doc.title }, breadcrumbs(ctx, [{ label: doc.title }]))}
  <section class="section">
    <div class="container narrow">
      <p class="note note--block">${esc(l.draftNote)}</p>
      <div class="prose">
        ${doc.sections.map((s) => `<h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>`).join('')}
      </div>
    </div>
  </section>`,
    };
  },
};

// ---------- build ----------

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function writePage(lang, route, html) {
  const file = route === '/404.html' ? path.join(OUT, langPrefix(lang), '404.html') : path.join(OUT, langPrefix(lang), route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));

  const sitemap = [];

  for (const { code: lang } of site.languages) {
    const t = readJSON(`content/${lang}/copy.json`);
    const cases = readJSON(`content/${lang}/cases.json`);
    const insights = readJSON(`content/${lang}/insights.json`);

    const routes = [
      ['/', 'home'],
      ['/expertise/', 'expertise'],
      ['/industries/', 'industries'],
      ['/how-we-work/', 'howWeWork'],
      ['/case-studies/', 'cases'],
      ...cases.map((c) => [`/case-studies/${c.slug}/`, 'caseDetail', c]),
      ['/about/', 'about'],
      ...(site.features.insights ? [['/insights/', 'insights'], ...insights.map((a) => [`/insights/${a.slug}/`, 'article', a])] : []),
      ['/contact/', 'contact'],
      ['/contact/thank-you/', 'thankYou'],
      ...t.pages.legal.pages.map((d) => [d.route, 'legal', d]),
      ['/404.html', 'notFound'],
    ];

    for (const [route, name, item] of routes) {
      const ctx = { lang, t, route, cases, insights };
      const page = pages[name](ctx, item);
      writePage(lang, route, layout(ctx, { ...page, page: name }));
      if (!page.noindex) sitemap.push(absUrl(lang, route));
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(
    path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
      .map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`
  );
  fs.writeFileSync(
    path.join(OUT, 'robots.txt'),
    DEMO ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nDisallow: /api/\nDisallow: /contact/thank-you/\n\nSitemap: ${SITE_ROOT}/sitemap.xml\n`
  );
  // GitHub Pages: serve files as is, without Jekyll processing.
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  console.log(`Built ${sitemap.length} indexable pages into dist/`);
}

build();
