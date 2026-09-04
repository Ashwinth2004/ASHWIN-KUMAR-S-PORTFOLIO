/* ============================================================
   ASHWIN KUMAR S — PORTFOLIO INTERACTIONS
   ============================================================ */
(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine    = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- preloader ---------- */
  // Hold the intro for ~2s so the animation reads, but never wait on a
  // stalled font or image request beyond the hard cap.
  const MIN_SHOW = 2400;
  const HARD_CAP = 4000;
  const started  = performance.now();

  const preloader = $('#preloader');
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    preloader.classList.add('is-done');
  };
  const finish = () => setTimeout(dismiss, Math.max(0, MIN_SHOW - (performance.now() - started)));

  window.addEventListener('load', finish);
  setTimeout(finish, MIN_SHOW);   // in case `load` already fired or never does
  setTimeout(dismiss, HARD_CAP);

  /* ---------- collapsible social rail ---------- */
  const rail       = $('#rail');
  const railToggle = $('#railToggle');

  const setRail = collapsed => {
    rail.classList.toggle('is-collapsed', collapsed);
    railToggle.setAttribute('aria-expanded', String(!collapsed));
    railToggle.setAttribute('aria-label', collapsed ? 'Show social links' : 'Hide social links');
    try { localStorage.setItem('railCollapsed', collapsed ? '1' : '0'); } catch (e) { /* private mode */ }
  };

  try {
    if (localStorage.getItem('railCollapsed') === '1') setRail(true);
  } catch (e) { /* storage unavailable — start expanded */ }

  railToggle.addEventListener('click', () => setRail(!rail.classList.contains('is-collapsed')));

  /* ---------- header + scroll progress ---------- */
  const header   = $('#header');
  const progress = $('#progressBar');

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-stuck', y > 40);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  };

  /* ---------- mobile menu ---------- */
  const burger = $('#burger');
  const nav    = $('#nav');

  const NAV_BREAKPOINT = 1150;   // must match the CSS media query

  const setMenu = open => {
    burger.classList.toggle('is-open', open);
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('is-locked', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  };
  const closeMenu = () => setMenu(false);

  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // Rotating a phone past the breakpoint would otherwise leave the body
  // scroll-locked with the overlay hidden.
  window.addEventListener('resize', () => {
    if (window.innerWidth > NAV_BREAKPOINT) closeMenu();
  });

  /* ---------- smooth scroll with header offset ---------- */
  const headerOffset = () => (window.innerWidth > NAV_BREAKPOINT ? 76 : 64);

  $$('[data-scroll]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      closeMenu();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - headerOffset(),
        behavior: reduced ? 'auto' : 'smooth'
      });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- deep links ---------- */
  // The browser resolves #hash before webfonts reflow the page, which lands the
  // viewport hundreds of pixels short. Re-align once fonts have settled.
  const realignHash = () => {
    const target = location.hash && document.querySelector(location.hash);
    if (!target) return;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - headerOffset(),
      behavior: 'auto'
    });
  };
  if (location.hash) {
    window.addEventListener('load', realignHash);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(realignHash);
    setTimeout(realignHash, 400);
  }

  /* ---------- on-enter effects ----------
     Driven by getBoundingClientRect rather than IntersectionObserver: an
     observer reports nothing while the page renders in a hidden/background
     surface, which would leave the whole site permanently invisible. */
  const runCounter = el => {
    const target   = parseFloat(el.dataset.count);
    const decimals = el.dataset.decimal ? parseInt(el.dataset.decimal, 10) : 0;
    const start    = performance.now();

    const step = now => {
      const p = Math.min((now - start) / 1500, 1);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals);
    };
    requestAnimationFrame(step);
  };

  const pending = [
    { els: $$('.reveal, .reveal-photo'), margin: 60,  run: el => el.classList.add('is-in') },
    { els: $$('[data-count]'),           margin: 40,  run: runCounter },
    { els: $$('.meter i'),               margin: 40,  run: el => el.style.setProperty('--w', el.dataset.val + '%') }
  ];

  const sweep = () => {
    const vh = window.innerHeight;
    pending.forEach(group => {
      group.els = group.els.filter(el => {
        const r = el.getBoundingClientRect();
        if (r.top >= vh - group.margin || r.bottom <= 0) return true;
        group.run(el);
        return false;
      });
    });
  };

  /* ---------- scroll-spy nav linking ---------- */
  const links    = $$('.nav__link');
  const sections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

  const spy = () => {
    const line = window.scrollY + window.innerHeight * 0.3;
    let current = sections[0];
    sections.forEach(sec => { if (sec.offsetTop <= line) current = sec; });

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
      current = sections[sections.length - 1];
    }
    links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + current.id));
  };

  let ticking = false;
  const frame = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); spy(); sweep(); ticking = false; });
  };

  window.addEventListener('scroll', frame, { passive: true });
  window.addEventListener('resize', frame);
  window.addEventListener('load', frame);
  frame();
  // catch anything laid out after webfonts settle
  setTimeout(frame, 300);
  setTimeout(frame, 1200);

  $('#year').textContent = new Date().getFullYear();

  /* ============================================================
     POINTER-DRIVEN INTERACTIONS (desktop only)
     ============================================================ */
  if (!fine || reduced) return;

  /* ---------- magnetic buttons ---------- */
  $$('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.28;
      const y = (e.clientY - r.top - r.height / 2) * 0.34;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  /* ---------- 3D tilt cards + cursor-following glow ---------- */
  $$('.tilt').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', px * 100 + '%');
      el.style.setProperty('--my', py * 100 + '%');
      el.style.transform =
        `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-5px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  /* ---------- parallax background pattern ---------- */
  const layers = $$('[data-parallax]');
  window.addEventListener('mousemove', e => {
    const cx = e.clientX / window.innerWidth  - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    layers.forEach(l => {
      const d = parseFloat(l.dataset.parallax);
      l.style.transform = `translate3d(${cx * d}px, ${cy * d}px, 0)`;
    });
  }, { passive: true });

  /* ---------- hero scene follows the pointer ---------- */
  const scene = $('#scene');
  if (scene) {
    scene.addEventListener('mousemove', e => {
      const r = scene.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      scene.style.transform = `rotateY(${px * 13}deg) rotateX(${-py * 9}deg)`;
    });
    scene.addEventListener('mouseleave', () => { scene.style.transform = ''; });
  }
})();
