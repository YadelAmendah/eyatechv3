(() => {
  'use strict';

  /* ---------- Theme toggle ---------- */
  const body = document.body;
  const themeToggle = document.getElementById('theme-toggle');

  /* ---------- Calendly: lazy-loaded, theme-matched ----------
     Performance: Calendly's widget.js + its 700px-tall iframe used to load
     eagerly with the rest of the page, even for visitors who never scroll
     down to the booking section. It's now only fetched once the section
     actually scrolls into view.

     Theming note: Calendly only honors the background_color / text_color /
     primary_color URL parameters on paid Calendly plans. On the free plan
     the widget stays Calendly's default white, but the parameters are
     harmless either way, and this will "just start working" automatically
     if the account is ever upgraded, with no code changes needed. */
  const CALENDLY_URLS = {
    dark: 'https://calendly.com/contact-eyatech?background_color=10151f&text_color=e8edf4&primary_color=00f5b0',
    light: 'https://calendly.com/contact-eyatech?background_color=ffffff&text_color=0d1b2a&primary_color=0087f5',
  };
  let calendlyLoaded = false;

  function updateCalendlyTheme(theme) {
    // Not loaded yet: nothing to update — it will simply init with
    // whatever theme is active at the moment it does load.
    if (!calendlyLoaded) return;
    const container = document.getElementById('calendly-widget');
    if (!container) return;
    const targetUrl = CALENDLY_URLS[theme] || CALENDLY_URLS.dark;
    const iframe = container.querySelector('iframe');
    if (iframe) iframe.src = targetUrl;
  }

  function loadCalendly() {
    if (calendlyLoaded) return;
    calendlyLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onload = () => {
      const container = document.getElementById('calendly-widget');
      if (container && window.Calendly) {
        window.Calendly.initInlineWidget({
          url: CALENDLY_URLS[currentTheme] || CALENDLY_URLS.dark,
          parentElement: container,
        });
      }
    };
    document.body.appendChild(script);
  }

  const calendlyTrigger = document.getElementById('calendly-widget');
  if (calendlyTrigger && 'IntersectionObserver' in window) {
    const calendlyIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadCalendly();
          calendlyIo.disconnect();
        }
      });
    }, { rootMargin: '300px 0px' });
    calendlyIo.observe(calendlyTrigger);
  } else if (calendlyTrigger) {
    // No IntersectionObserver support: fall back to loading it right away.
    loadCalendly();
  }

  function applyTheme(theme){
    body.setAttribute('data-theme', theme);
    updateCalendlyTheme(theme);
  }

  // Respect system preference on first load; no persistence across
  // sessions is required, but we keep it in-memory for this session.
  let currentTheme = 'dark';
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    currentTheme = 'light';
  }
  applyTheme(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme);
    });
  }

  /* ---------- Mobile nav ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
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
  }

  /* ---------- Custom eased smooth scroll ---------- */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY, duration) {
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    const startTime = performance.now();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      window.scrollTo(0, targetY);
      return;
    }

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Smooth scroll on nav / anchor links
     (accounts for the sticky header offset) ---------- */
  const header = document.querySelector('.site-header');
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = header ? header.offsetHeight + 12 : 0;
      const top = id === '#top' ? 0 : Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - offset);
      const distance = Math.abs(top - window.pageYOffset);
      const duration = Math.min(1400, Math.max(500, distance * 0.6));
      smoothScrollTo(top, duration);
    });
  });

  /* ---------- Project filters (with keyboard a11y) ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach((btn, idx) => {
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

    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      let nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if (nextIdx >= filterBtns.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = filterBtns.length - 1;
      filterBtns[nextIdx].focus();
      filterBtns[nextIdx].click();
    });
  });

  /* ---------- Scroll reveal ---------- */
  const revealTargets = document.querySelectorAll(
    '.about__story, .about__timeline li, .spec-sheet, .schematic-wrap, .status-card, .service-card, .skills__group, .process__step, .project-card, .certs__row, .testimonial-card, .faq__item, .cta-card, .calendly-block'
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

  /* ---------- Project card detail toggle ---------- */
  document.querySelectorAll('.project-card__toggle').forEach(btn => {
    const detail = btn.nextElementSibling;
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      detail.style.maxHeight = isOpen ? null : detail.scrollHeight + 'px';
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq__item').forEach(item => {
    const question = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');
    question.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      question.setAttribute('aria-expanded', String(isOpen));
      answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : null;
    });
  });

  /* ---------- Hero terminal: looping typed/erased commands ---------- */
  const typedEl = document.getElementById('terminal-typed');
  const historyEl = document.getElementById('terminal-history');
  const bodyEl = document.getElementById('terminal-body');

  if (typedEl && historyEl) {
    const commands = [
      { cmd: 'kubectl get pods --namespace prod', out: ['NAME                  READY   STATUS    RESTARTS', 'api-gateway-7f9c4d     3/3     Running   0'] },
      { cmd: 'python3 audit_secu.py --target banking-api', out: ['[✓] Aucune faille critique détectée'] },
      { cmd: 'terraform apply -auto-approve', out: ['Apply complete! Resources: 12 added, 0 destroyed'] },
      { cmd: 'php artisan migrate --force', out: ['Migrating: 2026_01_create_transactions_table', 'Migrated:  2026_01_create_transactions_table'] },
      { cmd: 'aws s3 sync ./dist s3://eya-tech-prod', out: ['upload: dist/index.html to s3://eya-tech-prod'] },
      { cmd: 'npm run build', out: ['✓ built in 2.41s'] },
      { cmd: 'git commit -m "fix: durcissement des accès IAM"', out: ['1 file changed, 14 insertions(+)'] },
    ];

    const MAX_HISTORY = 3;
    const TYPE_SPEED = 42;     // ms per character while typing
    const ERASE_SPEED = 22;    // ms per character while erasing
    const HOLD_AFTER_TYPE = 650;
    const HOLD_AFTER_OUTPUT = 1100;
    const HOLD_AFTER_ERASE = 280;

    let cmdIndex = 0;
    let charIndex = 0;
    let timerId = null;

    function pushHistory(command, outLines) {
      const cmdLine = document.createElement('div');
      cmdLine.className = 'terminal__line';
      cmdLine.innerHTML =
        '<span class="terminal__prompt">eya@eya-tech<span class="terminal__prompt-sep">:</span>' +
        '<span class="terminal__prompt-path">~</span><span class="terminal__prompt-sep">$</span></span>' +
        '<span class="terminal__typed">' + escapeHtml(command) + '</span>';
      historyEl.appendChild(cmdLine);

      outLines.forEach(line => {
        const outLine = document.createElement('div');
        outLine.className = 'terminal__line';
        outLine.innerHTML = '<span class="terminal__typed t-ok">' + escapeHtml(line) + '</span>';
        historyEl.appendChild(outLine);
      });

      while (historyEl.children.length > MAX_HISTORY * 2) {
        historyEl.removeChild(historyEl.firstChild);
      }
      if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function typeStep() {
      const current = commands[cmdIndex];
      if (charIndex <= current.cmd.length) {
        typedEl.textContent = current.cmd.slice(0, charIndex);
        charIndex++;
        timerId = setTimeout(typeStep, TYPE_SPEED);
      } else {
        timerId = setTimeout(() => {
          pushHistory(current.cmd, current.out);
          timerId = setTimeout(eraseStep, HOLD_AFTER_OUTPUT);
        }, HOLD_AFTER_TYPE);
      }
    }

    function eraseStep() {
      const current = commands[cmdIndex];
      if (charIndex > 0) {
        charIndex--;
        typedEl.textContent = current.cmd.slice(0, charIndex);
        timerId = setTimeout(eraseStep, ERASE_SPEED);
      } else {
        cmdIndex = (cmdIndex + 1) % commands.length;
        timerId = setTimeout(typeStep, HOLD_AFTER_ERASE);
      }
    }

    // Pause the animation off-screen to save cycles, resume when visible.
    let isRunning = false;
    function start() {
      if (isRunning) return;
      isRunning = true;
      charIndex = 0;
      typeStep();
    }
    function stop() {
      isRunning = false;
      clearTimeout(timerId);
    }

    if ('IntersectionObserver' in window) {
      const termIo = new IntersectionObserver((entries) => {
        entries.forEach(entry => entry.isIntersecting ? start() : stop());
      }, { threshold: 0.2 });
      termIo.observe(document.querySelector('.hero__terminal'));
    } else {
      start();
    }
  }

  /* ---------- Language toggle (FR / EN) & SEO meta updates ---------- */
  const pageTitles = {
    fr: 'EYA Tech — Eklou Yadel AMENDAH | Full-Stack, DevOps & Cybersécurité',
    en: 'EYA Tech — Eklou Yadel AMENDAH | Full-Stack, DevOps & Cybersecurity',
  };
  const pageDescriptions = {
    fr: 'Portfolio d\u2019Eklou Yadel AMENDAH (EYA Tech) — Développeur Full-Stack, ingénieur DevOps et consultant en cybersécurité bancaire basé à Lomé, Togo.',
    en: 'Portfolio of Eklou Yadel AMENDAH (EYA Tech) — Full-Stack Developer, DevOps Engineer, and Banking Cybersecurity Consultant based in Lomé, Togo.',
  };

  const translations = {
    fr: {
      'nav.about': 'À propos', 'nav.services': 'Services', 'nav.skills': 'Compétences',
      'nav.experience': 'Expériences', 'nav.testimonials': 'Avis', 'nav.contact': 'Contact',
      'hero.eyebrow': 'Lomé, Togo — Disponible pour vos projets',
      'hero.title1': 'Je construis des systèmes',
      'hero.title2': 'qui tiennent la charge',
      'hero.subtitle': 'Développeur <strong>Full-Stack</strong>, ingénieur <strong>DevOps</strong> et consultant en <strong>cybersécurité bancaire</strong>. Cinq ans à faire dialoguer le code, l\u2019infrastructure et la sécurité — sans jamais perdre le signal dans le bruit.',
      'hero.cta.whatsapp': 'Me contacter sur WhatsApp',
      'hero.cta.projects': 'Découvrir mes projets',
      'hero.stack.orchestration': 'Orchestration',
      'stats.years': 'Années d\u2019expérience terrain',
      'stats.projects': 'Projets menés de bout en bout',
      'stats.domains': 'Domaines d\u2019expertise couverts',
      'stats.delivery': 'Livraisons documentées &amp; testées',
      'about.eyebrow.num': '01', 'about.eyebrow.text': 'Profil',
      'about.title': 'De la résistance au routeur, du routeur au repo',
      'about.p1': 'Tout commence au lycée, derrière un fer à souder et une plaque de circuits imprimés : l\u2019électronique m\u2019apprend à lire un système avant de le juger, à suivre un courant du composant à l\u2019effet. Cette rigueur me suit jusqu\u2019à l\u2019université, en licence <strong>Systèmes, Réseaux &amp; Sécurité</strong>, où le circuit devient réseau et la panne devient vulnérabilité.',
      'about.p2': 'À l\u2019<strong>Académie ADN</strong>, à Lomé, ce langage électrique se traduit en code : développement web et mobile, puis très vite DevOps, parce qu\u2019un bon développeur qui ignore l\u2019infrastructure ne voit qu\u2019une moitié du circuit. Aujourd\u2019hui, cette double lecture — développement et sécurité — me sert notamment auprès d\u2019acteurs du secteur bancaire, où chaque ligne de code porte un enjeu de confiance.',
      'about.p3': 'En dehors des terminaux : la <strong>musique</strong> pour l\u2019oreille et la précision du rythme, la <strong>salle de sport</strong> et le <strong>taekwondo</strong> pour la discipline — la même discipline qui fait qu\u2019un déploiement se prépare, se répète, et ne s\u2019improvise pas.',
      'about.tl1.title': 'Électronique', 'about.tl1.text': 'Lycée — bases en circuits, composants et logique matérielle.',
      'about.tl2.title': 'Systèmes, Réseaux &amp; Sécurité', 'about.tl2.text': 'Licence universitaire — infrastructures et sécurité des systèmes.',
      'about.tl3.title': 'Dev &amp; DevOps', 'about.tl3.text': 'Académie ADN, Togo — développement web/mobile et pratiques DevOps.',
      'about.tl4.title': 'Consultant Sécurité Bancaire', 'about.tl4.text': '+5 ans de projets concrets, du code à l\u2019infrastructure sécurisée.',
      'spec.header': 'FICHE_TECHNIQUE',
      'spec.id.role': '« EYA » — Full-Stack · DevOps · Sécurité',
      'spec.name.label': 'Nom', 'spec.base.label': 'Base à',
      'spec.domain.label': 'Domaine', 'spec.domain.value': 'Full-Stack · DevOps · Sécurité',
      'spec.exp.label': 'Expérience', 'spec.exp.value': '5+ ans',
      'spec.edu1.label': 'Formation initiale', 'spec.edu1.value': 'Électronique (lycée)',
      'spec.edu2.label': 'Formation sup.', 'spec.edu2.value': 'Info · Réseaux · Télécom',
      'spec.spec.label': 'Spécialisation', 'spec.spec.value': 'Dev Web &amp; Mobile — Académie ADN',
      'spec.cert.label': 'Certification', 'spec.cert.value': 'Licence Systèmes Réseaux &amp; Sécurité',
      'spec.sector.label': 'Secteur cible', 'spec.sector.value': 'Banque &amp; Finance',
      'spec.status.label': 'Statut', 'spec.status.value': 'Disponible pour projets',
      'schematic.cap': 'SCHEMA — PARCOURS.EYA',
      'schematic.n1.top': 'Lycée', 'schematic.n1.bottom': 'Électronique',
      'schematic.n2.top': 'Université', 'schematic.n2.bottom': 'Réseaux · Sécurité',
      'schematic.n3.top': 'Académie ADN', 'schematic.n3.bottom': 'Dev Web · Mobile',
      'schematic.n4.top': '5+ ans terrain', 'schematic.n4.bottom': 'Dev · Full-Stack',
      'schematic.n6.bottom': '→ Consultant &amp; Freelance',
      'status.cap': 'STATUS — AVAILABILITY.EYA',
      'status.city': 'Lomé, Togo',
      'status.overlap.label': 'Chevauchement horaire — Europe (Paris/Londres)',
      'status.available': 'Disponible pour projets',
      'services.eyebrow.num': '02', 'services.eyebrow.text': 'Services',
      'services.title': 'Trois modules, un seul ingénieur',
      'services.lead': 'Du code à la production, jusqu\u2019à la sécurisation du système : une couverture complète du cycle de vie applicatif.',
      'services.m1.title': 'Développement Full-Stack',
      'services.m1.desc': 'Conception d\u2019applications web et mobiles, du backend à l\u2019interface, pensées pour tenir en production.',
      'services.m1.li1': 'APIs &amp; backends en PHP / Python', 'services.m1.li2': 'Interfaces React performantes',
      'services.m1.li3': 'Applications mobiles', 'services.m1.li4': 'Architecture de bases de données',
      'services.m2.title': 'DevOps &amp; Infrastructure',
      'services.m2.desc': 'Automatisation du déploiement et industrialisation de l\u2019infrastructure pour des livraisons fiables et rapides.',
      'services.m2.li1': 'Conteneurisation &amp; Kubernetes', 'services.m2.li2': 'Infrastructure sur AWS',
      'services.m2.li3': 'Pipelines CI/CD', 'services.m2.li4': 'Supervision &amp; scalabilité',
      'services.m3.title': 'Consulting Sécurité',
      'services.m3.desc': 'Audit et renforcement de la sécurité des systèmes et réseaux, avec une attention particulière aux exigences du secteur bancaire.',
      'services.m3.li1': 'Audit de sécurité systèmes &amp; réseaux', 'services.m3.li2': 'Recommandations pour le secteur bancaire',
      'services.m3.li3': 'Durcissement des infrastructures', 'services.m3.li4': 'Accompagnement conformité',
      'skills.eyebrow.num': '03', 'skills.eyebrow.text': 'Composants',
      'skills.title': 'La stack, pièce par pièce',
      'skills.g1': 'Développement', 'skills.g3': 'Sécurité', 'skills.g4': 'Savoir-être',
      'skills.badge.sec': 'Sécurité Bancaire', 'skills.badge.audit': 'Audit Systèmes',
      'skills.soft1': 'Rigueur', 'skills.soft2': 'Créativité', 'skills.soft3': 'Ténacité',
      'process.eyebrow.num': '04', 'process.eyebrow.text': 'Méthodologie',
      'process.title': 'Une méthode, pas une improvisation',
      'process.s1.title': 'Cadrage', 'process.s1.text': 'Comprendre le besoin métier, les contraintes techniques et les enjeux de sécurité avant la première ligne de code.',
      'process.s2.title': 'Développement', 'process.s2.text': 'Construction itérative, revues de code et tests continus pour avancer sans dette cachée.',
      'process.s3.title': 'Déploiement', 'process.s3.text': 'Pipelines CI/CD, conteneurisation et mise en production maîtrisée, sans surprise.',
      'process.s4.title': 'Suivi &amp; sécurisation', 'process.s4.text': 'Supervision, audits réguliers et accompagnement dans la montée en charge.',
      'experience.eyebrow.num': '05', 'experience.eyebrow.text': 'Journal de bord',
      'experience.title': 'Projets &amp; réalisations',
      'experience.filter.all': 'Tout', 'experience.filter.security': 'Sécurité',
      'experience.p1.tag': 'Sécurité', 'experience.p1.title': 'Durcissement d\u2019une plateforme bancaire',
      'experience.p1.desc': 'Audit de sécurité et mise en conformité d\u2019une application critique pour un acteur du secteur bancaire.',
      'experience.p1.m1': 'Sécurité', 'experience.p1.m2': 'Audit', 'experience.p1.m3': 'Conformité',
      'experience.p2.title': 'Orchestration de microservices',
      'experience.p2.desc': 'Déploiement et supervision d\u2019une architecture microservices sur Kubernetes, avec pipelines CI/CD automatisés.',
      'experience.p3.tag': 'Web', 'experience.p3.title': 'Application Full-Stack React &amp; PHP',
      'experience.p3.desc': 'Conception et développement d\u2019une application web complète, du back-end PHP à l\u2019interface React.',
      'experience.p3.m3': 'API REST',
      'experience.p4.tag': 'Web · DevOps', 'experience.p4.title': 'Automatisation d\u2019infrastructure cloud',
      'experience.p4.desc': 'Scripts Python pour l\u2019automatisation du provisioning d\u2019infrastructures sur AWS, intégrés à une interface de suivi.',
      'experience.p4.m3': 'Automatisation',
      'experience.p5.tag': 'Sécurité · DevOps', 'experience.p5.title': 'Supervision &amp; détection d\u2019incidents',
      'experience.p5.desc': 'Mise en place d\u2019un système de supervision et d\u2019alertes pour anticiper les incidents de sécurité en production.',
      'experience.p5.m1': 'Monitoring', 'experience.p5.m2': 'Sécurité',
      'experience.p6.tag': 'Web', 'experience.p6.title': 'Application mobile compagnon',
      'experience.p6.desc': 'Développement d\u2019une application mobile connectée à l\u2019API d\u2019un service existant, pensée mobile-first.',
      'experience.p6.m1': 'Mobile',
      'detail.toggle': 'Voir le détail',
      'detail.approach': 'Approche',
      'detail.result': 'Résultat',
      'experience.p1.approach': 'Audit initial des accès et de la surface d’attaque, priorisation des risques identifiés, puis plan de remédiation mis en œuvre en coordination avec les équipes internes.',
      'experience.p1.result': 'Détails disponibles sur demande.',
      'experience.p2.approach': 'Conteneurisation des services existants, définition des manifestes Kubernetes, puis mise en place de pipelines CI/CD pour des déploiements automatisés et traçables.',
      'experience.p2.result': 'Détails disponibles sur demande.',
      'experience.p3.approach': 'Conception de l’architecture back-end (API REST en PHP), puis développement de l’interface React consommant cette API, avec tests à chaque étape.',
      'experience.p3.result': 'Détails disponibles sur demande.',
      'experience.p4.approach': 'Scripts Python pour automatiser le provisioning des ressources AWS, avec une interface de suivi permettant de visualiser l’état de l’infrastructure en temps réel.',
      'experience.p4.result': 'Détails disponibles sur demande.',
      'experience.p5.approach': 'Mise en place d’outils de supervision et de règles d’alerte adaptées, pour détecter les anomalies avant qu’elles n’impactent la production.',
      'experience.p5.result': 'Détails disponibles sur demande.',
      'experience.p6.approach': 'Développement mobile-first connecté à l’API existante, avec une attention particulière portée à la fluidité et à la fiabilité de la synchronisation des données.',
      'experience.p6.result': 'Détails disponibles sur demande.',
      'certs.eyebrow.num': '06', 'certs.eyebrow.text': 'Certifications &amp; veille',
      'certs.title': 'Formation continue',
      'certs.lead': 'Les technologies bougent vite ; le secteur bancaire encore plus vite sur ses exigences. Une veille active fait partie du métier.',
      'certs.watch1': 'Veille AWS &amp; Kubernetes', 'certs.watch2': 'Veille OWASP &amp; sécurité applicative', 'certs.watch3': 'Veille écosystème React',
      'testimonials.eyebrow.num': '07', 'testimonials.eyebrow.text': 'Retours',
      'testimonials.title': 'Ce qu\u2019on retient de travailler avec EYA',
      'testimonials.t1.quote': '« Une rigueur rare sur les sujets de sécurité, et une capacité à expliquer des choix techniques complexes en termes simples pour nos équipes métier. »',
      'testimonials.t1.name': 'Responsable IT', 'testimonials.t1.role': 'Secteur bancaire',
      'testimonials.t2.quote': '« Le déploiement Kubernetes a été livré propre, documenté, et sans surprise en production. Exactement ce qu\u2019on attend d\u2019un profil DevOps. »',
      'testimonials.t2.name': 'Chef de projet', 'testimonials.t2.role': 'Plateforme cloud',
      'testimonials.t3.quote': '« Réactif, créatif, et toujours prêt à relever un défi technique supplémentaire. Un vrai profil full-stack au sens propre du terme. »',
      'testimonials.t3.name': 'Fondateur', 'testimonials.t3.role': 'Startup Web',
      'faq.eyebrow.num': '08', 'faq.eyebrow.text': 'Questions fréquentes', 'faq.title': 'Avant de m\u2019écrire',
      'faq.q1.q': 'Travaillez-vous à distance ou uniquement au Togo ?',
      'faq.q1.a': 'Principalement à distance, avec la possibilité d\u2019un déplacement selon la nature et la durée du projet.',
      'faq.q2.q': 'Quels sont vos délais habituels ?',
      'faq.q2.a': 'Ça dépend du périmètre. Un premier échange de cadrage permet d\u2019estimer un délai réaliste, sans surprise ensuite.',
      'faq.q3.q': 'Travaillez-vous avec des clients hors du secteur bancaire ?',
      'faq.q3.a': 'Oui. L\u2019exigence acquise dans le secteur bancaire — rigueur, sécurité, documentation — se transpose à tout projet.',
      'faq.q4.q': 'Proposez-vous un accompagnement après la mise en production ?',
      'faq.q4.a': 'Oui, supervision, corrections et évolutions peuvent être incluses selon les besoins définis ensemble.',
      'faq.q5.q': 'Comment se passe la prise de contact ?',
      'faq.q5.a': 'Un premier échange par WhatsApp ou email pour cadrer le besoin, suivi d\u2019une proposition adaptée.',
      'contact.eyebrow.num': '09', 'contact.eyebrow.text': 'Connexion',
      'contact.title': 'Établissons le contact',
      'contact.lead': 'Un projet web, une infrastructure à sécuriser, un audit à mener ? Le canal est ouvert.',
      'contact.location': 'Basé à Lomé, Togo — disponible à distance',
      'contact.form.name': 'Nom', 'contact.form.name.ph': 'Votre nom',
      'contact.form.message': 'Message', 'contact.form.message.ph': 'Décrivez votre projet...',
      'contact.form.submit': 'Envoyer le message',
      'contact.calendly.title': 'Ou réservez directement un créneau',
      'cta.title': 'Prêt à sécuriser et faire évoluer votre système ?',
      'cta.text': 'Rejoignez les acteurs qui font confiance à EYA Tech pour concevoir, déployer et sécuriser leurs projets, du code à l\u2019infrastructure.',
      'cta.btn1': 'Écrire sur WhatsApp',
      'cta.btn2': 'Envoyer un email',
      'cta.response': 'Réponse généralement sous 24h',
      'footer.rights': 'Tous droits réservés.',
      'footer.tags.title': 'Explorez mes domaines d\u2019expertise',
      'footer.tags.t1': 'Développeur Full-Stack Togo',
      'footer.tags.t2': 'DevOps &amp; Infrastructure Cloud',
      'footer.tags.t3': 'Développeur React &amp; PHP',
      'footer.tags.t4': 'Expert Kubernetes &amp; AWS',
      'footer.tags.t5': 'Audit Sécurité Systèmes',
      'footer.tags.t6': 'Pipelines CI/CD',
      'footer.tags.t7': 'Freelance Tech Lomé',
      'footer.tags.t8': 'Applications Mobiles',
      'footer.tags.t9': 'Architecture &amp; Bases de données',
      'footer.tags.t10': 'Consulting Sécurité Bancaire',
      'footer.tags.t11': 'Architecture Cloud AWS',
      'footer.tags.t12': 'Conformité &amp; Durcissement',
      'footer.tags.t13': 'Consultant DevSecOps',
      'footer.tags.t14': 'Développement Web &amp; Mobile',
      'footer.credits': 'Conçu &amp; développé par Eklou Yadel AMENDAH.',
      'mobile.cta': 'Écrire sur WhatsApp',
      'footer.privacy': 'Politique de confidentialité',
      'skip.link': 'Aller au contenu principal',
    },
    en: {
      'nav.about': 'About', 'nav.services': 'Services', 'nav.skills': 'Skills',
      'nav.experience': 'Experience', 'nav.testimonials': 'Reviews', 'nav.contact': 'Contact',
      'hero.eyebrow': 'Lomé, Togo — Available for new projects',
      'hero.title1': 'I build systems',
      'hero.title2': 'that hold up under load',
      'hero.subtitle': '<strong>Full-Stack</strong> developer, <strong>DevOps</strong> engineer and <strong>banking cybersecurity</strong> consultant. Five years making code, infrastructure and security talk to each other — without losing the signal in the noise.',
      'hero.cta.whatsapp': 'Message me on WhatsApp',
      'hero.cta.projects': 'See my projects',
      'hero.stack.orchestration': 'Orchestration',
      'stats.years': 'Years of hands-on experience',
      'stats.projects': 'Projects delivered end-to-end',
      'stats.domains': 'Areas of expertise covered',
      'stats.delivery': 'Deliveries documented &amp; tested',
      'about.eyebrow.num': '01', 'about.eyebrow.text': 'Profile',
      'about.title': 'From resistors to routers, from routers to repos',
      'about.p1': 'It all starts in high school, behind a soldering iron and a circuit board: electronics taught me to read a system before judging it, to trace a current from the component to its effect. That rigor followed me to university, in a <strong>Systems, Networks &amp; Security</strong> degree, where the circuit became a network and the fault became a vulnerability.',
      'about.p2': 'At <strong>ADN Academy</strong>, in Lomé, that electrical language turned into code: web and mobile development, then very quickly DevOps — because a good developer who ignores infrastructure only sees half the circuit. Today, that dual lens — development and security — serves me especially with clients in the banking sector, where every line of code carries a matter of trust.',
      'about.p3': 'Away from the terminal: <strong>music</strong> for the ear and precision of rhythm, the <strong>gym</strong> and <strong>taekwondo</strong> for discipline — the same discipline that means a deployment is prepared, rehearsed, and never improvised.',
      'about.tl1.title': 'Electronics', 'about.tl1.text': 'High school — fundamentals in circuits, components and hardware logic.',
      'about.tl2.title': 'Systems, Networks &amp; Security', 'about.tl2.text': 'University degree — infrastructure and systems security.',
      'about.tl3.title': 'Dev &amp; DevOps', 'about.tl3.text': 'ADN Academy, Togo — web/mobile development and DevOps practices.',
      'about.tl4.title': 'Banking Security Consultant', 'about.tl4.text': '5+ years of hands-on projects, from code to secured infrastructure.',
      'spec.header': 'TECH_SHEET',
      'spec.id.role': '\u201cEYA\u201d — Full-Stack · DevOps · Security',
      'spec.name.label': 'Name', 'spec.base.label': 'Based in',
      'spec.domain.label': 'Field', 'spec.domain.value': 'Full-Stack · DevOps · Security',
      'spec.exp.label': 'Experience', 'spec.exp.value': '5+ years',
      'spec.edu1.label': 'Early education', 'spec.edu1.value': 'Electronics (high school)',
      'spec.edu2.label': 'Higher education', 'spec.edu2.value': 'IT · Networks · Telecom',
      'spec.spec.label': 'Specialization', 'spec.spec.value': 'Web &amp; Mobile Dev — ADN Academy',
      'spec.cert.label': 'Certification', 'spec.cert.value': 'Bachelor\u2019s, Systems, Networks &amp; Security',
      'spec.sector.label': 'Target sector', 'spec.sector.value': 'Banking &amp; Finance',
      'spec.status.label': 'Status', 'spec.status.value': 'Available for projects',
      'schematic.cap': 'SCHEMATIC — EYA.PATH',
      'schematic.n1.top': 'High school', 'schematic.n1.bottom': 'Electronics',
      'schematic.n2.top': 'University', 'schematic.n2.bottom': 'Networks · Security',
      'schematic.n3.top': 'ADN Academy', 'schematic.n3.bottom': 'Web · Mobile Dev',
      'schematic.n4.top': '5+ years in the field', 'schematic.n4.bottom': 'Dev · Full-Stack',
      'schematic.n6.bottom': '→ Consultant &amp; Freelance',
      'status.cap': 'STATUS — AVAILABILITY.EYA',
      'status.city': 'Lomé, Togo',
      'status.overlap.label': 'Time overlap — Europe (Paris/London)',
      'status.available': 'Available for projects',
      'services.eyebrow.num': '02', 'services.eyebrow.text': 'Services',
      'services.title': 'Three modules, one engineer',
      'services.lead': 'From code to production, all the way to securing the system: full coverage of the application lifecycle.',
      'services.m1.title': 'Full-Stack Development',
      'services.m1.desc': 'Designing web and mobile applications, from backend to interface, built to hold up in production.',
      'services.m1.li1': 'APIs &amp; backends in PHP / Python', 'services.m1.li2': 'High-performance React interfaces',
      'services.m1.li3': 'Mobile applications', 'services.m1.li4': 'Database architecture',
      'services.m2.title': 'DevOps &amp; Infrastructure',
      'services.m2.desc': 'Deployment automation and infrastructure industrialization for reliable, fast releases.',
      'services.m2.li1': 'Containerization &amp; Kubernetes', 'services.m2.li2': 'Infrastructure on AWS',
      'services.m2.li3': 'CI/CD pipelines', 'services.m2.li4': 'Monitoring &amp; scalability',
      'services.m3.title': 'Security Consulting',
      'services.m3.desc': 'Auditing and strengthening system and network security, with particular attention to banking-sector requirements.',
      'services.m3.li1': 'Systems &amp; network security audits', 'services.m3.li2': 'Recommendations for the banking sector',
      'services.m3.li3': 'Infrastructure hardening', 'services.m3.li4': 'Compliance support',
      'skills.eyebrow.num': '03', 'skills.eyebrow.text': 'Components',
      'skills.title': 'The stack, piece by piece',
      'skills.g1': 'Development', 'skills.g3': 'Security', 'skills.g4': 'Soft skills',
      'skills.badge.sec': 'Banking Security', 'skills.badge.audit': 'Systems Audit',
      'skills.soft1': 'Rigor', 'skills.soft2': 'Creativity', 'skills.soft3': 'Tenacity',
      'process.eyebrow.num': '04', 'process.eyebrow.text': 'Methodology',
      'process.title': 'A method, not an improvisation',
      'process.s1.title': 'Scoping', 'process.s1.text': 'Understanding the business need, technical constraints and security concerns before the first line of code.',
      'process.s2.title': 'Development', 'process.s2.text': 'Iterative builds, code reviews and continuous testing to move forward without hidden debt.',
      'process.s3.title': 'Deployment', 'process.s3.text': 'CI/CD pipelines, containerization and controlled production releases, with no surprises.',
      'process.s4.title': 'Monitoring &amp; hardening', 'process.s4.text': 'Monitoring, regular audits and support as the system scales.',
      'experience.eyebrow.num': '05', 'experience.eyebrow.text': 'Field log',
      'experience.title': 'Projects &amp; achievements',
      'experience.filter.all': 'All', 'experience.filter.security': 'Security',
      'experience.p1.tag': 'Security', 'experience.p1.title': 'Hardening a banking platform',
      'experience.p1.desc': 'Security audit and compliance work on a critical application for a banking-sector client.',
      'experience.p1.m1': 'Security', 'experience.p1.m2': 'Audit', 'experience.p1.m3': 'Compliance',
      'experience.p2.title': 'Microservices orchestration',
      'experience.p2.desc': 'Deployment and monitoring of a microservices architecture on Kubernetes, with automated CI/CD pipelines.',
      'experience.p3.tag': 'Web', 'experience.p3.title': 'Full-Stack React &amp; PHP application',
      'experience.p3.desc': 'Design and development of a complete web application, from the PHP backend to the React interface.',
      'experience.p3.m3': 'REST API',
      'experience.p4.tag': 'Web · DevOps', 'experience.p4.title': 'Cloud infrastructure automation',
      'experience.p4.desc': 'Python scripts to automate infrastructure provisioning on AWS, integrated into a monitoring interface.',
      'experience.p4.m3': 'Automation',
      'experience.p5.tag': 'Security · DevOps', 'experience.p5.title': 'Incident monitoring &amp; detection',
      'experience.p5.desc': 'Set up a monitoring and alerting system to anticipate security incidents in production.',
      'experience.p5.m1': 'Monitoring', 'experience.p5.m2': 'Security',
      'experience.p6.tag': 'Web', 'experience.p6.title': 'Companion mobile app',
      'experience.p6.desc': 'Development of a mobile app connected to an existing service\u2019s API, built mobile-first.',
      'experience.p6.m1': 'Mobile',
      'detail.toggle': 'See details',
      'detail.approach': 'Approach',
      'detail.result': 'Result',
      'experience.p1.approach': 'Initial audit of access rights and attack surface, risk prioritization, then a remediation plan carried out in coordination with the internal teams.',
      'experience.p1.result': 'Details available on request.',
      'experience.p2.approach': 'Containerized the existing services, defined the Kubernetes manifests, then set up CI/CD pipelines for automated, traceable deployments.',
      'experience.p2.result': 'Details available on request.',
      'experience.p3.approach': 'Designed the back-end architecture (REST API in PHP), then built the React interface consuming that API, with testing at every step.',
      'experience.p3.result': 'Details available on request.',
      'experience.p4.approach': 'Python scripts to automate AWS resource provisioning, with a monitoring interface to track infrastructure status in real time.',
      'experience.p4.result': 'Details available on request.',
      'experience.p5.approach': 'Set up monitoring tools and tailored alert rules to catch anomalies before they affect production.',
      'experience.p5.result': 'Details available on request.',
      'experience.p6.approach': 'Mobile-first development connected to the existing API, with close attention paid to smooth, reliable data synchronization.',
      'experience.p6.result': 'Details available on request.',
      'certs.eyebrow.num': '06', 'certs.eyebrow.text': 'Certifications &amp; learning',
      'certs.title': 'Continuous learning',
      'certs.lead': 'Technology moves fast; the banking sector moves even faster on its requirements. Staying current is part of the job.',
      'certs.watch1': 'Following AWS &amp; Kubernetes', 'certs.watch2': 'Following OWASP &amp; application security', 'certs.watch3': 'Following the React ecosystem',
      'testimonials.eyebrow.num': '07', 'testimonials.eyebrow.text': 'Reviews',
      'testimonials.title': 'What people say about working with EYA',
      'testimonials.t1.quote': '\u201cRare rigor on security topics, and a real ability to explain complex technical choices in simple terms for our business teams.\u201d',
      'testimonials.t1.name': 'IT Manager', 'testimonials.t1.role': 'Banking sector',
      'testimonials.t2.quote': '\u201cThe Kubernetes rollout was delivered clean, documented, and with no surprises in production. Exactly what you\u2019d want from a DevOps profile.\u201d',
      'testimonials.t2.name': 'Project Manager', 'testimonials.t2.role': 'Cloud platform',
      'testimonials.t3.quote': '\u201cResponsive, creative, and always ready to take on one more technical challenge. A true full-stack profile in every sense.\u201d',
      'testimonials.t3.name': 'Founder', 'testimonials.t3.role': 'Web startup',
      'faq.eyebrow.num': '08', 'faq.eyebrow.text': 'FAQ', 'faq.title': 'Before you write to me',
      'faq.q1.q': 'Do you work remotely, or only in Togo?',
      'faq.q1.a': 'Mainly remote, with the possibility of travel depending on the nature and length of the project.',
      'faq.q2.q': 'What are your usual turnaround times?',
      'faq.q2.a': 'It depends on the scope. An initial scoping conversation makes it possible to give a realistic estimate, with no surprises later.',
      'faq.q3.q': 'Do you work with clients outside the banking sector?',
      'faq.q3.a': 'Yes. The rigor built in the banking sector — security, documentation, discipline — carries over to any project.',
      'faq.q4.q': 'Do you offer support after going live?',
      'faq.q4.a': 'Yes, monitoring, fixes and further development can be included depending on what\u2019s agreed together.',
      'faq.q5.q': 'How does getting in touch work?',
      'faq.q5.a': 'A first conversation over WhatsApp or email to scope the need, followed by a tailored proposal.',
      'contact.eyebrow.num': '09', 'contact.eyebrow.text': 'Get in touch',
      'contact.title': 'Let\u2019s connect',
      'contact.lead': 'A web project, infrastructure to secure, an audit to run? The line is open.',
      'contact.location': 'Based in Lomé, Togo — available remotely',
      'contact.form.name': 'Name', 'contact.form.name.ph': 'Your name',
      'contact.form.message': 'Message', 'contact.form.message.ph': 'Describe your project...',
      'contact.form.submit': 'Send message',
      'contact.calendly.title': 'Or book a slot directly',
      'cta.title': 'Ready to secure and scale your system?',
      'cta.text': 'Join the teams who trust EYA Tech to design, deploy and secure their projects, from code to infrastructure.',
      'cta.btn1': 'Message on WhatsApp',
      'cta.btn2': 'Send an email',
      'cta.response': 'Usually replies within 24h',
      'footer.rights': 'All rights reserved.',
      'footer.tags.title': 'Explore my areas of expertise',
      'footer.tags.t1': 'Full-Stack Developer Togo',
      'footer.tags.t2': 'DevOps &amp; Cloud Infrastructure',
      'footer.tags.t3': 'React &amp; PHP Developer',
      'footer.tags.t4': 'Kubernetes &amp; AWS Expert',
      'footer.tags.t5': 'Systems Security Audit',
      'footer.tags.t6': 'CI/CD Pipelines',
      'footer.tags.t7': 'Freelance Tech Lomé',
      'footer.tags.t8': 'Mobile Applications',
      'footer.tags.t9': 'Architecture &amp; Databases',
      'footer.tags.t10': 'Banking Security Consulting',
      'footer.tags.t11': 'AWS Cloud Architecture',
      'footer.tags.t12': 'Compliance &amp; Hardening',
      'footer.tags.t13': 'DevSecOps Consultant',
      'footer.tags.t14': 'Web &amp; Mobile Development',
      'footer.credits': 'Designed &amp; built by Eklou Yadel AMENDAH.',
      'mobile.cta': 'Message on WhatsApp',
      'footer.privacy': 'Privacy Policy',
      'skip.link': 'Skip to main content',
    }
  };

  const langToggle = document.getElementById('lang-toggle');
  let currentLang = 'fr';

  function applyLanguage(lang) {
    const dict = translations[lang];
    if (!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
    });
    document.documentElement.setAttribute('lang', lang);

    if (pageTitles[lang]) document.title = pageTitles[lang];
    const metaDesc = document.getElementById('site-meta-desc');
    if (metaDesc && pageDescriptions[lang]) metaDesc.setAttribute('content', pageDescriptions[lang]);

    ['og-title', 'twitter-title'].forEach(id => {
      const el = document.getElementById(id);
      if (el && pageTitles[lang]) el.setAttribute('content', pageTitles[lang]);
    });
    ['og-description', 'twitter-description'].forEach(id => {
      const el = document.getElementById(id);
      if (el && pageDescriptions[lang]) el.setAttribute('content', pageDescriptions[lang]);
    });

    if (langToggle) {
      langToggle.classList.toggle('is-en', lang === 'en');
      langToggle.querySelectorAll('.lang-toggle__opt').forEach(opt => {
        opt.classList.toggle('is-active', opt.dataset.lang === lang);
      });
    }
    const footerLangLabel = document.getElementById('footer-lang-label');
    if (footerLangLabel) footerLangLabel.textContent = lang === 'en' ? 'English' : 'Français';
  }

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      currentLang = currentLang === 'fr' ? 'en' : 'fr';
      applyLanguage(currentLang);
    });
  }

  /* ---------- Scroll progress bar + back-to-top ---------- */
  const progressBar = document.getElementById('scroll-progress-bar');
  const backToTop = document.getElementById('back-to-top');

  function updateScrollUI() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
    if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 480);
  }

  window.addEventListener('scroll', updateScrollUI, { passive: true });
  updateScrollUI();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      const distance = window.pageYOffset;
      const duration = Math.min(1400, Math.max(600, distance * 0.6));
      smoothScrollTo(0, duration);
    });
  }

  /* ---------- CTA card photo: irregular color-reveal blob follows the cursor ---------- */
  const photoWrap = document.getElementById('cta-photo-wrap');
  const blobPath = document.getElementById('cta-blob-path');

  if (photoWrap && blobPath) {
    photoWrap.addEventListener('mousemove', (e) => {
      const rect = photoWrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      blobPath.style.translate = `${x}px ${y}px`;
      blobPath.style.scale = '1';
    });

    photoWrap.addEventListener('mouseleave', () => {
      blobPath.style.scale = '0';
    });
  }

  /* ---------- Status card: live Lomé clock + overlap marker ---------- */
  const statusClock = document.getElementById('status-clock');
  const statusNowMarker = document.getElementById('status-now-marker');

  function updateStatusClock() {
    // Lomé, Togo is GMT+0 year-round (no daylight saving), so UTC time
    // doubles directly as local Lomé time — no timezone conversion needed.
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();

    if (statusClock) {
      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      statusClock.textContent = `${hh}:${mm}`;
    }

    if (statusNowMarker) {
      const pct = ((hours + minutes / 60) / 24) * 100;
      statusNowMarker.style.left = pct + '%';
    }
  }

  if (statusClock || statusNowMarker) {
    updateStatusClock();
    setInterval(updateStatusClock, 30000);
  }

  /* ---------- Contact link protection (WhatsApp + email) ----------
     Neither the phone number nor the email address is ever written in
     clear in the HTML — both are base64-encoded and only assembled into
     a real href once this script runs. Simple bots that just download
     and text-scan the raw HTML for "wa.me/", "mailto:", or contact-info
     patterns (the vast majority of scrapers) won't see them; real visitors
     with JS enabled get normal, instantly clickable links. */
  document.querySelectorAll('[data-link-b64]').forEach(el => {
    try {
      el.href = atob(el.getAttribute('data-link-b64'));
    } catch (e) {
      // If decoding fails for any reason, fail silently rather than break the button.
    }
  });

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
