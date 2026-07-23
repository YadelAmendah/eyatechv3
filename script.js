(() => {
  'use strict';

  /* ---------- Theme toggle ---------- */
  const body = document.body;
  const themeToggle = document.getElementById('theme-toggle');
  const THEME_KEY = 'eya-theme';

  function applyTheme(theme){
    body.setAttribute('data-theme', theme);
  }

  // Respect system preference on first load; no persistence across
  // sessions is required, but we keep it in-memory for this session.
  let currentTheme = 'dark';
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    currentTheme = 'light';
  }
  applyTheme(currentTheme);

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
  });

  /* ---------- Mobile nav ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Smooth scroll (native CSS handles most, this
     accounts for the sticky header offset) ---------- */
  const header = document.querySelector('.site-header');
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = header ? header.offsetHeight + 12 : 0;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- Project filters ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;
      projectCards.forEach(card => {
        const cats = (card.dataset.category || '').split(' ');
        const show = filter === 'all' || cats.includes(filter);
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  /* ---------- Scroll reveal ---------- */
  const revealTargets = document.querySelectorAll(
    '.about__story, .about__timeline li, .skills__group, .project-card, .testimonial-card, .contact__grid > *'
  );
  revealTargets.forEach(el => el.setAttribute('data-reveal', ''));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Contact form (visual only, no backend) ---------- */
  const form = document.getElementById('contact-form');
  const formNote = document.getElementById('form-note');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      formNote.textContent = 'Merci de renseigner tous les champs.';
      return;
    }
    formNote.textContent = 'Message prêt — pensez à connecter ce formulaire à un service d\u2019envoi (Formspree, EmailJS, etc.) ou contactez directement via WhatsApp.';
    form.reset();
  });

  /* ---------- Footer year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
