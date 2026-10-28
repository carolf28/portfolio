// If someone lands on ".../index.html", rewrite the address bar to ".../"
// without reloading the page (keeps any #section or ?query).
(function cleanIndexFromUrl() {
  const { pathname, search, hash } = window.location;
  if (window.location.protocol !== 'file:' && pathname.endsWith('/index.html')) {
    const cleanPath = pathname.slice(0, -'index.html'.length);
    window.history.replaceState(null, '', cleanPath + search + hash);
  }
})();

// Info overlay: "Info" opens a frosted-glass panel, "Close" (or Esc) closes it.
(function infoOverlay() {
  const toggle = document.querySelector('.info-toggle');
  const panel = document.getElementById('info');
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Info';

    if (open) {
      panel.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open'))); // render first, then fade in
    } else {
      panel.classList.remove('open');
      panel.addEventListener('transitionend', () => {
        if (!panel.classList.contains('open')) panel.hidden = true;
      }, { once: true });
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
  });
})();

// Brand box: the + button expands/collapses the extra info.
(function brandBox() {
  const toggle = document.querySelector('.brand-toggle');
  const more = document.getElementById('brand-more');
  if (!toggle || !more) return;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Show less' : 'Show more');
    more.classList.toggle('open', open);
    toggle.closest('.brand').classList.toggle('is-open', open);
  });
})();

// Mobile menu: "Menu" reveals the Works / Info buttons underneath.
(function mobileMenu() {
  const menu = document.querySelector('.menu');
  const toggle = document.querySelector('.menu-toggle');
  if (!menu || !toggle) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();

// Local preview only (opening the file directly, not on the live site):
// links like "/" and "/works/" point at the root of your computer, so swap
// them for the matching index.html files. On www.webcarolf.com this does nothing.
(function fixLinksForLocalPreview() {
  if (window.location.protocol !== 'file:') return;
  document.querySelectorAll('a[href^="/"]').forEach((link) => {
    const path = link.getAttribute('href').replace(/^\//, '');
    link.setAttribute('href', (path.endsWith('/') || path === '' ? path : path + '/') + 'index.html');
  });
})();
