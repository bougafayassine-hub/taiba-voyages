document.documentElement.classList.add('js');

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

const formatNumber = (n, decimals = 0) => new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(n).replace(/ | /g, ' ');

const renderCounter = (el, value) => {
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const decimals = Number(el.dataset.decimals || 0);
  el.textContent = `${prefix}${formatNumber(value, decimals)}${suffix}`;
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
    const decimals = Number(el.dataset.decimals || 0);
    const factor = 10 ** decimals;
    renderCounter(el, Math.round(target * eased * factor) / factor);
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
    }, { threshold: 0.15 });
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

// ---------- Cartes de chiffres sur mobile : points de navigation et défilement doux ----------
(() => {
  const bar = document.querySelector('.stats-bar');
  const hero = document.querySelector('.hero');
  if (!bar || !hero) return;
  const cards = [...bar.querySelectorAll('.stat')];
  const mobile = window.matchMedia('(max-width: 900px)');
  let dots = null;
  let timer = null;
  let pausedUntil = 0;

  // Carte la plus proche du centre du conteneur (valable en LTR comme en RTL).
  const index = () => {
    const mid = bar.getBoundingClientRect().left + bar.clientWidth / 2;
    let best = 0, dist = Infinity;
    cards.forEach((c, k) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < dist) { dist = d; best = k; }
    });
    return best;
  };
  const goTo = (i) => {
    const card = cards[(i + cards.length) % cards.length];
    const r = card.getBoundingClientRect();
    const mid = bar.getBoundingClientRect().left + bar.clientWidth / 2;
    bar.scrollBy({ left: r.left + r.width / 2 - mid, behavior: 'smooth' });
  };
  const paint = () => {
    if (!dots) return;
    const i = index();
    dots.querySelectorAll('button').forEach((b, k) => b.classList.toggle('is-active', k === i));
  };
  const place = () => {};

  const start = () => {
    if (dots) return;
    dots = document.createElement('div');
    dots.className = 'stats-dots';
    dots.setAttribute('aria-hidden', 'true');
    cards.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.addEventListener('click', () => { pausedUntil = Date.now() + 9000; goTo(i); });
      dots.appendChild(b);
    });
    (document.querySelector('.stats-anchor') || hero).appendChild(dots);
    place(); paint();
    bar.addEventListener('scroll', paint, { passive: true });
    bar.addEventListener('touchstart', () => { pausedUntil = Date.now() + 9000; }, { passive: true });
    window.addEventListener('resize', place);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      // Une carte toutes les 7 secondes, seulement quand les cartes sont visibles.
      timer = setInterval(() => {
        if (Date.now() < pausedUntil || document.hidden) return;
        const r = bar.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        goTo(index() + 1);
      }, 7000);
    }
  };
  const stop = () => {
    if (!dots) return;
    dots.remove(); dots = null;
    clearInterval(timer); timer = null;
    bar.removeEventListener('scroll', paint);
    window.removeEventListener('resize', place);
  };

  const sync = () => (mobile.matches ? start() : stop());
  sync();
  mobile.addEventListener('change', sync);
})();

// ---------- Paiement en 3 fois : calcul selon la formule choisie ----------
document.querySelectorAll('.pay-card').forEach((card) => {
  const select = card.querySelector('.pay-select');
  const total = card.querySelector('.pay-total .num');
  const each = card.querySelector('.pay-each .num');
  const steps = card.querySelectorAll('.pay-step .num');
  if (!select || !total || !each) return;
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/[\u202f\u00a0]/g, ' ');
  const update = () => {
    const price = Number(select.value) || 0;
    total.textContent = fmt(price);
    each.textContent = fmt(Math.round(price / 3));
    steps.forEach((el) => { el.textContent = fmt(Math.round(price / 3)); });
  };
  select.addEventListener('change', update);
  update();
});

// ---------- Engagements : chaque carte apparaît quand elle entre dans l'écran,
// en cascade si plusieurs arrivent ensemble (desktop), une à une au défilement (mobile) ----------
(() => {
  const cards = [...document.querySelectorAll('.pledge-grid .pledge')];
  if (!cards.length) return;
  let batchStart = 0;
  let batchCount = 0;

  const show = (card) => {
    if (card.classList.contains('is-in')) return;
    const now = performance.now();
    if (now - batchStart > 500) { batchStart = now; batchCount = 0; }
    const delay = batchCount * 160;
    batchCount += 1;
    card.style.transitionDelay = `${delay}ms`;
    card.classList.add('is-in');
    setTimeout(() => {
      card.style.transitionDelay = '';
      card.classList.add('is-done');
    }, 700 + delay);
  };

  const inView = (card) => {
    const r = card.getBoundingClientRect();
    return r.top < window.innerHeight * 0.9 && r.bottom > 0;
  };

  if (!('IntersectionObserver' in window)) { cards.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.2 });
  cards.forEach((c) => io.observe(c));

  // Secours si l'observateur ne se déclenche pas.
  const check = () => cards.forEach((c) => { if (inView(c)) show(c); });
  window.addEventListener('scroll', check, { passive: true });
  check();
})();
