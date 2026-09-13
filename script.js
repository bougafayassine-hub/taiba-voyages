document.documentElement.classList.add('js');

const toggle = document.querySelector('.menu-toggle');
const panel = document.querySelector('.mobile-panel');

if (toggle && panel) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
  });

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
  };
  panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  // Clic en dehors du menu ou touche Échap : le menu se referme.
  document.addEventListener('click', (event) => {
    if (panel.hidden) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) close();
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

// ---------- Chiffres clés sur mobile : chaque ligne glisse à son entrée dans l'écran ----------
(() => {
  const rows = [...document.querySelectorAll('.v-mix .stat')];
  if (!rows.length) return;
  const mobile = window.matchMedia('(max-width: 900px)');
  let batchStart = 0;
  let batchCount = 0;
  const show = (row) => {
    if (row.classList.contains('is-in')) return;
    const now = performance.now();
    if (now - batchStart > 800) { batchStart = now; batchCount = 0; }
    row.style.transitionDelay = `${batchCount * 450}ms`;
    batchCount += 1;
    row.classList.add('is-in');
  };
  if (!mobile.matches || !('IntersectionObserver' in window)) { rows.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.7 });
  rows.forEach((r) => io.observe(r));
  const check = () => rows.forEach((r) => {
    const b = r.getBoundingClientRect();
    if (b.top < window.innerHeight * 0.72 && b.bottom > 0) show(r);
  });
  window.addEventListener('scroll', check, { passive: true });
  check();
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
    if (now - batchStart > 800) { batchStart = now; batchCount = 0; }
    const delay = batchCount * 400;
    batchCount += 1;
    card.style.transitionDelay = `${delay}ms`;
    card.classList.add('is-in');
    setTimeout(() => {
      card.style.transitionDelay = '';
      card.classList.add('is-done');
    }, 1500 + delay);
  };

  const inView = (card) => {
    const r = card.getBoundingClientRect();
    return r.top < window.innerHeight * 0.72 && r.bottom > 0;
  };

  if (!('IntersectionObserver' in window)) { cards.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  cards.forEach((c) => io.observe(c));

  // Secours si l'observateur ne se déclenche pas.
  const check = () => cards.forEach((c) => { if (inView(c)) show(c); });
  window.addEventListener('scroll', check, { passive: true });
  check();

  // Clic sur « Facilités de paiement » : aller à la section et surligner la carte paiement.
  document.querySelectorAll('[data-highlight]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.dataset.highlight);
      if (!target) return;
      // Téléphone : le titre juste sous l'en-tête pour que la carte soit visible.
      // Ordinateur : l'accroche « Nos engagements » à 40 px sous l'en-tête.
      const mobile = window.matchMedia('(max-width: 900px)').matches;
      const anchor = mobile
        ? document.getElementById('pledges-title')
        : document.querySelector('.pledges-copy .eyebrow');
      const navH = document.querySelector('.site-header')?.offsetHeight || 0;
      if (anchor) {
        event.preventDefault();
        const top = anchor.getBoundingClientRect().top + window.scrollY - navH - (mobile ? 6 : 40);
        window.scrollTo({ top, behavior: 'smooth' });
        if (history.replaceState) history.replaceState(null, '', '#engagements');
      }
      setTimeout(() => cards.forEach(show), 600);
      setTimeout(() => {
        target.classList.add('is-highlight');
        setTimeout(() => target.classList.remove('is-highlight'), 3400);
      }, 2600);
    });
  });
})();

// ---------- Citation du gérant : effet machine à écrire à l'entrée dans l'écran ----------
(() => {
  const el = document.querySelector('.typewriter');
  if (!el) return;
  const text = el.dataset.text || el.textContent.trim();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { el.textContent = text; return; }
  el.style.minHeight = `${el.offsetHeight}px`;
  el.textContent = '';
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');
  el.setAttribute('aria-label', text);
  el.appendChild(caret);
  let started = false;
  const type = () => {
    if (started) return;
    started = true;
    let i = 0;
    const step = () => {
      if (i >= text.length) { setTimeout(() => caret.remove(), 2500); return; }
      caret.before(document.createTextNode(text[i]));
      const ch = text[i];
      i += 1;
      const pause = /[.,،؛!?]/.test(ch) ? 260 : 34;
      setTimeout(step, pause);
    };
    setTimeout(step, 350);
  };
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { type(); io.disconnect(); }
  }, { threshold: 0.6 });
  io.observe(el);
})();


// ---------- Avis Google : deux colonnes qui défilent en sens inverse ----------
const REVIEWS = [
  { name: 'hamza', rating: 5, when: '11m', text: 'Excellente expérience avec cette agence ! Six membres de ma famille ont voyagé pour une Omra et tout s’est déroulé parfaitement. Organisation impeccable, communication claire et service irréprochable. Nous recommandons vivement leurs services.' },
  { name: 'SALMA ARABI', rating: 5, when: '11m', text: 'Excellente agence ! Un service irréprochable, des conseils précis et adaptés, et une organisation parfaite du voyage. Je recommande vivement.' },
  { name: 'Nada Faragh', rating: 5, when: '2y', text: 'Expérience exceptionnelle avec cette agence de voyage ! Leur équipe dévouée a su créer un itinéraire parfait, alliant découvertes authentiques et confort optimal. Un service client attentif et des souvenirs inoubliables font de cette agence notre choix numéro un pour les prochaines aventures. Merci pour cette expérience mémorable !' },
  { name: 'Brahim Jawhar', rating: 5, when: '3m', text: 'Je remerci tout le groupe pour l organisation sans faute de l omra' },
  { name: 'Hajar BenYacoub', rating: 5, when: '1y', text: 'Mes parents ont eu la chance de faire le voyage de leur vie (Omrah) avec l’agence Taiba Voyages et c’était exceptionnel ils étaient plus que satisfaits des différents services et de l’accompagnement et l’encadré ainsi que l’équipe sur place. Un grand merci à Monsieur Kettani Mohamed pour ce merveilleux voyage !' },
  { name: 'Abderrahmane Ibnelrhazi', rating: 5, when: '2y', text: 'Je suis absolument ravi de mon expérience avec Taiba voyages. Dès le début, leur équipe a été extrêmement professionnelle et attentive à mes besoins et préférences. Ils ont pris en charge chaque détail de mon voyage, ce qui m’a permis de profiter pleinement de mes vacances. je recommande vivement' },
  { name: 'oumari loubna', rating: 5, when: '11m', text: 'Une agence de voyage professionnelle qui tient a ses promesses .et qui accompagne ses clients jusqu’à leurs retours.omra avec cet agence a faire et a refaire .' },
  { name: 'Med Ezzaher', rating: 4, when: '2y', text: 'Je partage ma perception vis-à-vis d’une prestation de service en Arabie Saoudite dans un cadre professionnel et spirituel il y a 2 ans, tout s’est bien passé. Aucune réclamation signalée. et Mr Kettani est une personne aimable et coopérante. je n’hésiterai pas à faire appel à ses services dans le futur.' },
  { name: 'Rais Hamza', rating: 5, when: '11m', text: 'Taiba voyages by kettani est une agence de voyage exceptionnelle, toujours à l’écoute et qui offre des services impeccables' },
  { name: 'Youssef Bennani', rating: 5, when: '1y', text: 'Une agence pas comme les autres, j’ai eux l’occasion de côtoyer le personnel au sein de l’établissement et aussi pendant un voyage, des gens professionnels avec une grande maitrise du domaine. Je recommande !!' },
  { name: 'Leila Gharibi', rating: 5, when: '2y', text: 'Agence très sérieuse, des gens réactifs, honnêtes, à la hauteur de leur promesses. Haut niveau de professionnalisme. Je recommande vivement d après mes expériences avec eux.' },
  { name: 'Blend TV', rating: 5, when: '1y', text: 'Nous avons passe une omra extraordinaire avec lagence taiba, je ne remercierai jamais autant les accompagnateurs de l’agence pour leur aide et assistance. Mille fois merci' },
  { name: 'Karim Tlemcani', rating: 5, when: '1y', text: 'Ravi de mon expérience OMRA en famille en compagnie de cette agence. Accompagnement au top service parfait rien à dire je recommande vivement.' },
  { name: 'badr abbassi', rating: 5, when: '2y', text: 'Tres bon service, j’ai offert omra a mes parents ils etaient tres satisfait, tres bon accompagnement, hotels merveilleux je recommande vivement.' },
  { name: 'Dalam Tech', rating: 5, when: '2y', text: 'Agence de voyage avec un service impeccable,une explication des offres approfondie,et bien-sûr réactivité dans tout ce qu’il font,bravo continuez ainsi...' },
  { name: 'Aicha IDRISSI KAITOUNI', rating: 5, when: '2y', text: 'Tres bonne agence, jamais déçue, ils sont professionnels et tres bien organisés, je recommande vivement 👍' },
  { name: 'Ismail Benchaaboune', rating: 5, when: '2y', text: 'La meilleure agence sur Fès à des pas d’avance sur leurs concurrents , Monsieur Hamid est l’incarnation de la gentillesse , il est très serviable aussi , je recommande vivement' },
  { name: 'el mousalame zineb', rating: 5, when: '1y', text: 'Meilleure compagnie tbarkellah. Agence bien organisée un très bon service. Je vous souhaite beaucoup de succés et réussite' },
  { name: 'Ghita Andaloussi', rating: 5, when: '1y', text: 'Très satisfaite des prestations de l’agence de voyage Taiba voyages by kettani, Excellent service, je la recommande vivement' },
];
const WHEN = {
  fr: { '2w': 'il y a 2 semaines', '3m': 'il y a 3 mois', '11m': 'il y a 11 mois', '1y': 'il y a un an', '2y': 'il y a 2 ans' },
  ar: { '2w': 'منذ أسبوعين', '3m': 'منذ 3 أشهر', '11m': 'منذ 11 شهرًا', '1y': 'منذ سنة', '2y': 'منذ سنتين' },
};
const AVATARS = ['#0c5a45', '#8fb8a8', '#064b39', '#b9895a', '#1b4f43', '#c9a24a'];

(() => {
  const section = document.querySelector('#avis');
  if (!section) return;
  const lang = section.dataset.lang === 'ar' ? 'ar' : 'fr';
  const labels = { google: section.dataset.labelGoogle, more: section.dataset.labelMore, less: section.dataset.labelLess };
  const colUp = section.querySelector('.reviews-col-up');
  const colDown = section.querySelector('.reviews-col-down');
  const mobile = window.matchMedia('(max-width: 900px)');
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const card = (r, i) => {
    const el = document.createElement('article');
    el.className = 'review';
    el.setAttribute('lang', 'fr');
    el.setAttribute('dir', 'ltr');
    el.innerHTML = `
      <header class="review-head">
        <span class="review-avatar" style="background:${AVATARS[i % AVATARS.length]}">${r.name.trim().charAt(0).toUpperCase()}</span>
        <span class="review-who"><strong>${r.name}</strong><small>${labels.google} · ${WHEN[lang][r.when] || ''}</small></span>
      </header>
      <span class="review-stars" aria-label="${r.rating}/5">${stars(r.rating)}</span>
      <p class="review-text">${r.text}</p>
      <button class="review-more" type="button" hidden>${labels.more}</button>`;
    return el;
  };

  const fill = (col, items, offset) => {
    col.innerHTML = '';
    const track = document.createElement('div');
    track.className = 'reviews-track';
    // Contenu doublé pour une boucle sans couture.
    [...items, ...items].forEach((r, i) => track.appendChild(card(r, (i + offset) % REVIEWS.length)));
    col.appendChild(track);
  };

  const build = () => {
    if (mobile.matches) {
      fill(colUp, REVIEWS, 0);
      colDown.innerHTML = '';
    } else {
      const a = REVIEWS.filter((_, i) => i % 2 === 0);
      const b = REVIEWS.filter((_, i) => i % 2 === 1);
      fill(colUp, a, 0);
      fill(colDown, b, 1);
    }
    // « Lire plus » seulement si le texte est coupé.
    section.querySelectorAll('.review').forEach((el) => {
      const text = el.querySelector('.review-text');
      const btn = el.querySelector('.review-more');
      btn.hidden = !(text.scrollHeight > text.clientHeight + 2);
    });
  };

  const wall = section.querySelector('.reviews-wall');
  const syncPause = () => wall.classList.toggle('has-open', !!section.querySelector('.review.is-open'));
  const closeAll = () => {
    section.querySelectorAll('.review.is-open').forEach((el) => {
      el.classList.remove('is-open');
      el.querySelector('.review-more').textContent = labels.more;
    });
    syncPause();
  };
  section.addEventListener('click', (event) => {
    const btn = event.target.closest('.review-more');
    if (!btn) return;
    const el = btn.closest('.review');
    const open = el.classList.toggle('is-open');
    btn.textContent = open ? labels.less : labels.more;
    syncPause();
  });
  // Tactile : toucher en dehors d'une carte referme l'avis déployé et relance le défilement.
  document.addEventListener('click', (event) => {
    if (!section.querySelector('.review.is-open')) return;
    if (event.target.closest('.review')) return;
    closeAll();
  });
  // La souris quitte la carte : retour au format court.
  section.addEventListener('mouseout', (event) => {
    const el = event.target.closest('.review');
    if (!el || el.contains(event.relatedTarget)) return;
    if (el.classList.contains('is-open')) {
      el.classList.remove('is-open');
      el.querySelector('.review-more').textContent = labels.more;
      syncPause();
    }
  });

  build();
  mobile.addEventListener('change', build);
  window.addEventListener('load', build);
})();
