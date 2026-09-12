const toggle = document.querySelector('.menu-toggle');
const panel = document.querySelector('.mobile-panel');

if (toggle && panel) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
  });

  panel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    });
  });
}

// Vidéo de fond : lecture unique, ralenti progressif sur la fin puis arrêt
// en douceur sur la dernière image (pas de replay brusque).
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  const SLOW_WINDOW = 1.6; // secondes avant la fin où le ralenti commence
  const MIN_RATE = 0.15;   // vitesse minimale juste avant l'arrêt
  let rafId = null;
  let frozen = false;

  heroVideo.loop = false;
  heroVideo.removeAttribute('loop');

  const freeze = () => {
    if (frozen) return;
    frozen = true;
    cancelAnimationFrame(rafId);
    heroVideo.pause();
    heroVideo.classList.add('is-frozen');
  };

  const easeRate = () => {
    const remaining = heroVideo.duration - heroVideo.currentTime;
    if (Number.isFinite(remaining)) {
      if (remaining <= 0.08) { freeze(); return; }
      if (remaining <= SLOW_WINDOW) {
        const t = Math.max(remaining / SLOW_WINDOW, 0); // 1 → 0
        heroVideo.playbackRate = MIN_RATE + (1 - MIN_RATE) * t * t;
      }
    }
    if (!heroVideo.paused && !heroVideo.ended) rafId = requestAnimationFrame(easeRate);
  };

  heroVideo.addEventListener('play', () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(easeRate);
  });

  heroVideo.addEventListener('ended', freeze);

  const tryPlay = () => {
    if (frozen || heroVideo.ended) return;
    heroVideo.play().catch(() => {});
  };
  tryPlay();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryPlay();
  });
}

// Compteurs animés de la barre de chiffres clés.
const counters = document.querySelectorAll('.counter[data-count]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const formatNumber = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/ | /g, ' ');

const renderCounter = (el, value) => {
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  el.textContent = `${prefix}${formatNumber(value)}${suffix}`;
};

const animateCounter = (el) => {
  const target = Number(el.dataset.count);
  if (reduceMotion || !Number.isFinite(target)) {
    renderCounter(el, target);
    return;
  }
  const duration = 1800;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    renderCounter(el, Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

if (counters.length) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    counters.forEach((el) => {
      renderCounter(el, 0);
      observer.observe(el);
    });
  } else {
    counters.forEach(animateCounter);
  }
}

// ---------- Langue : FR / AR ----------
const translations = {
  fr: {
    'meta.title': 'Agence de voyage à Fès spécialisée en Omra & Hajj | TAIBA Voyages',
    'nav.agency': 'Notre agence',
    'nav.packs': 'Nos packs',
    'nav.location': 'Notre localisation',
    'nav.contact': 'Nous contacter',
    'nav.whatsappLong': 'Nous contacter sur WhatsApp',
    'badge.count': '+ 200 avis vérifiés',
    'hero.eyebrow': 'TAIBA VOYAGES · FÈS',
    'hero.title1': 'Agence de voyage à Fès',
    'hero.title2': 'spécialisée en Omra & Hajj',
    'hero.lead': 'Depuis Fès, nous accompagnons les pèlerins avec des formules fiables,<br class="desktop-break" /> un encadrement sérieux et un suivi humain pour vivre une Omra sereine<br class="desktop-break" /> et bien organisée.',
    'stats.years': 'd’expérience',
    'stats.yearsSuffix': ' ans',
    'stats.pilgrims': 'pèlerins',
    'stats.satisfaction': 'de satisfaction',
  },
  ar: {
    'meta.title': 'وكالة أسفار في فاس متخصصة في العمرة والحج | طيبة للأسفار',
    'nav.agency': 'وكالتنا',
    'nav.packs': 'عروضنا',
    'nav.location': 'موقعنا',
    'nav.contact': 'تواصل معنا',
    'nav.whatsappLong': 'تواصل معنا عبر واتساب',
    'badge.count': '+ 200 تقييم موثّق',
    'hero.eyebrow': 'طيبة للأسفار · فاس',
    'hero.title1': 'وكالة أسفار في فاس',
    'hero.title2': 'متخصصة في العمرة والحج',
    'hero.lead': 'من فاس، نرافق المعتمرين بعروض موثوقة وتأطير جاد<br class="desktop-break" /> ومتابعة إنسانية لعيش عمرة هادئة ومنظّمة بإتقان.',
    'stats.years': 'من الخبرة',
    'stats.yearsSuffix': ' سنة',
    'stats.pilgrims': 'معتمر',
    'stats.satisfaction': 'نسبة الرضا',
  },
};

const applyLanguage = (lang) => {
  const dict = translations[lang] || translations.fr;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });
  document.querySelectorAll('[data-i18n-suffix]').forEach((el) => {
    const key = el.dataset.i18nSuffix;
    if (dict[key] === undefined) return;
    el.dataset.suffix = dict[key];
    if (el.dataset.count && el.classList.contains('counter')) {
      // Réaffiche la valeur finale avec le bon suffixe (sans relancer l'animation).
      const match = el.textContent.replace(/[^0-9]/g, '');
      const shown = match ? Number(match) : Number(el.dataset.count);
      el.textContent = `${el.dataset.prefix || ''}${new Intl.NumberFormat('fr-FR').format(shown).replace(/ | /g, ' ')}${el.dataset.suffix || ''}`;
    }
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const active = btn.dataset.lang === lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  try { localStorage.setItem('taiba-lang', lang); } catch (e) { /* stockage indisponible */ }
};

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

(() => {
  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem('taiba-lang'); } catch (e) { /* ignore */ }
  const initial = ['fr', 'ar'].includes(fromQuery) ? fromQuery : (['fr', 'ar'].includes(saved) ? saved : 'fr');
  if (initial !== 'fr') applyLanguage(initial);
})();
