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

// ---------- Langue : détection du navigateur + choix mémorisé ----------
// Chaque langue a sa propre page (FR : /, AR : /ar/). Ici on ne fait que
// rediriger vers la bonne page à l'arrivée et retenir le choix du visiteur.
(() => {
  const STORAGE_KEY = 'taiba-lang';
  const pageLang = document.documentElement.lang === 'ar' ? 'ar' : 'fr';
  const targets = {
    fr: document.querySelector('link[rel="alternate"][hreflang="fr"]')?.href,
    ar: document.querySelector('link[rel="alternate"][hreflang="ar"]')?.href,
  };

  const readSaved = () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  };
  const save = (lang) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* stockage indisponible */ }
  };

  // Clic sur FR / AR : on mémorise puis on suit le lien normalement.
  document.querySelectorAll('.lang-btn[data-lang]').forEach((link) => {
    link.addEventListener('click', () => save(link.dataset.lang));
  });

  // La détection ne joue qu'à l'arrivée sur la page d'accueil française :
  // un lien direct vers /ar/ (résultat Google, partage) est toujours respecté.
  if (pageLang !== 'fr') return;

  const saved = readSaved();
  let wanted = ['fr', 'ar'].includes(saved) ? saved : null;

  if (!wanted) {
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    const first = String(prefs[0] || '').toLowerCase();
    wanted = first.startsWith('ar') ? 'ar' : 'fr';
  }

  if (wanted !== pageLang && targets[wanted]) {
    save(wanted);
    window.location.replace(targets[wanted] + window.location.hash);
  }
})();
