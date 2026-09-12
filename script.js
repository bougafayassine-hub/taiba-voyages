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

// Vidéo de fond : relance systématique (secours si l'attribut loop est ignoré).
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  heroVideo.addEventListener('ended', () => {
    heroVideo.currentTime = 0;
    heroVideo.play();
  });
  const tryPlay = () => heroVideo.play().catch(() => {});
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
