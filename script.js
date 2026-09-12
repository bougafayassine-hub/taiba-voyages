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

// Vidéo de fond : lecture unique à vitesse normale, puis arrêt sur la
// dernière image. Elle repart du début à chaque chargement de la page.
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  heroVideo.loop = false;
  heroVideo.removeAttribute('loop');

  const tryPlay = () => {
    if (heroVideo.ended) return;
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

// ---------- Formulaire : ouverture de WhatsApp avec le message prérempli ----------
document.querySelectorAll('.contact-form[data-whatsapp]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const fields = {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      pack: String(data.get('pack') || '').trim(),
      message: String(data.get('message') || '').trim(),
    };
    const text = (form.dataset.template || '{name} {phone} {pack} {message}')
      .replace(/\{(\w+)\}/g, (_, key) => fields[key] || '')
      .replace(/\s+/g, ' ')
      .trim();
    const url = `https://wa.me/${form.dataset.whatsapp}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  });
});
