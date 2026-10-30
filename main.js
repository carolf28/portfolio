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

// "View project" pill: appears while hovering a project and follows the mouse.
(function viewProjectCursor() {
  const pill = document.querySelector('.view-cursor');
  if (!pill) return;

  document.addEventListener('pointermove', (event) => {
    pill.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`; // just below-right of the pointer
  });

  // Watches the whole page so it also works on the collage's copied cards
  document.addEventListener('pointerover', (event) => {
    const overWork = event.pointerType === 'mouse' && event.target.closest('.work');
    pill.classList.toggle('visible', Boolean(overWork) && !document.body.classList.contains('panel-open'));
  });
})();

// Works collage: the scattered projects drift slowly upwards forever, pausing
// while a project is hovered. Scrolling or dragging moves them too, with a
// little momentum, then the drift carries on.
(function worksCollage() {
  const layer = document.querySelector('.works');
  const feed = document.querySelector('.works-feed');
  const set = document.querySelector('.works-set');
  if (!layer || !feed || !set) return;

  const originals = [...set.querySelectorAll('.work')];

  // A copy of the set above and below, so the loop never shows a gap or cuts
  // off an image that hangs over a set's edge. Copies are hidden from screen
  // readers and keyboard; clicking one opens the original
  const makeCopy = () => {
    const copy = set.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('.work').forEach((work) => {
      work.classList.add('work-copy');
      work.tabIndex = -1;
    });
    return copy;
  };
  feed.prepend(makeCopy());
  feed.append(makeCopy());

  const driftSpeed = 50; // px per second; 0 turns the drift off
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let target = 0;
  let velocity = 0;
  let dragging = false;
  let dragDistance = 0;
  let lastY = 0;
  let lastTime = performance.now();
  let hovering = false;

  const tick = (now) => {
    const seconds = Math.min((now - lastTime) / 1000, 0.1); // capped so a hidden tab doesn't jump
    lastTime = now;
    if (!dragging) {
      velocity *= 0.94;
      target += velocity;
      if (!reduceMotion && !hovering && !document.body.classList.contains('panel-open')) {
        target += driftSpeed * seconds;
      }
    }
    current += (target - current) * 0.1;

    // Wrap within one set's height, always showing the middle (original) set
    // area so there's a copy above and below to fill in seamlessly
    const height = set.offsetHeight;
    let y = current % height;
    if (y < 0) y += height;
    feed.style.transform = `translateY(${-(height + y)}px)`;
    requestAnimationFrame(tick);
  };

  // Hovering a project stops the drift so it's easy to read and click
  layer.addEventListener('pointerover', (event) => {
    hovering = event.pointerType === 'mouse' && Boolean(event.target.closest('.work'));
  });
  layer.addEventListener('pointerleave', () => { hovering = false; });

  layer.addEventListener('wheel', (event) => {
    event.preventDefault();
    target += event.deltaY;
    velocity = 0;
  }, { passive: false });

  layer.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragDistance = 0;
    lastY = event.clientY;
    velocity = 0;
  });

  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dy = event.clientY - lastY;
    lastY = event.clientY;
    dragDistance += Math.abs(dy);
    target -= dy;
    velocity = -dy * 0.6;
  });

  const endDrag = () => { dragging = false; };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Runs before the project panel's click handler: a drag doesn't open a
  // project, and a copied card opens its original
  layer.addEventListener('click', (event) => {
    const work = event.target.closest('.work');
    if (!work) return;
    if (dragDistance > 6 || work.classList.contains('work-copy')) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (dragDistance <= 6 && work.classList.contains('work-copy')) {
      originals[[...work.parentElement.children].indexOf(work)].click();
    }
  }, true);

  requestAnimationFrame(tick);
})();

// Pixelated reveal: each project image starts as big blocky pixels and
// sharpens step by step once it's mostly on screen, then resets when it leaves.
// A project and its copies in the collage loop share one state, so when the
// loop swaps one for another in the same spot nothing visibly changes.
(function pixelatedReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const steps = [40, 20, 10, 5, 2]; // block sizes in px, coarse to fine
  const stepTime = 150; // ms per step
  const delay = 200; // ms before it starts sharpening

  const works = [...document.querySelectorAll('.work')];
  const count = document.querySelectorAll('.work:not(.work-copy)').length || 1;
  const small = document.createElement('canvas');

  // One group per project: its image, and a pixel canvas over every copy
  const groups = [];
  works.forEach((work, index) => {
    const key = index % count; // same position in every set = same project
    if (!groups[key]) {
      groups[key] = { image: work.querySelector('.work-image'), canvases: [], showing: 0, timer: null };
    }
    const canvas = document.createElement('canvas');
    canvas.className = 'work-pixels';
    canvas.setAttribute('aria-hidden', 'true');
    work.append(canvas);
    work.dataset.pixelKey = key;
    groups[key].canvases.push(canvas);
  });

  // Draws the project at a given block size onto all of its canvases at once
  const draw = (group, blockSize) => {
    const { image } = group;
    const ratio = window.devicePixelRatio || 1;
    const width = image.offsetWidth;
    const height = image.offsetHeight;
    if (!width || !height || !(image.naturalWidth || image.videoWidth)) return;
    // Shrink the image to one pixel per block, then blow it back up without smoothing
    small.width = Math.max(1, Math.ceil(width / blockSize));
    small.height = Math.max(1, Math.ceil(height / blockSize));
    small.getContext('2d').drawImage(image, 0, 0, small.width, small.height);
    group.canvases.forEach((canvas) => {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(small, 0, 0, canvas.width, canvas.height);
      canvas.style.opacity = 1;
    });
  };

  const reset = (group) => {
    clearTimeout(group.timer);
    draw(group, steps[0]);
  };

  const reveal = (group) => {
    clearTimeout(group.timer);
    let index = 0;
    const next = () => {
      if (index < steps.length) {
        draw(group, steps[index]);
        index += 1;
        group.timer = setTimeout(next, stepTime);
      } else {
        // Fully sharp: show the real image underneath
        group.canvases.forEach((canvas) => { canvas.style.opacity = 0; });
      }
    };
    group.timer = setTimeout(next, delay);
  };

  // One observer for everything, so a loop swap (one copy leaving, another
  // arriving) lands in the same batch and the project counts as still showing
  const observer = new IntersectionObserver((entries) => {
    const before = groups.map((group) => group.showing);
    entries.forEach((entry) => {
      const group = groups[entry.target.dataset.pixelKey];
      const wasIn = entry.target.dataset.pixelIn === '1';
      if (entry.isIntersecting && !wasIn) group.showing += 1;
      if (!entry.isIntersecting && wasIn) group.showing -= 1;
      entry.target.dataset.pixelIn = entry.isIntersecting ? '1' : '0';
    });
    groups.forEach((group, key) => {
      if (before[key] === 0 && group.showing > 0) reveal(group);
      if (before[key] > 0 && group.showing === 0) reset(group);
    });
  }, { threshold: 0.4 });

  groups.forEach((group, key) => {
    const start = () => {
      reset(group);
      works.filter((work) => work.dataset.pixelKey === String(key)).forEach((work) => observer.observe(work));
    };
    const ready = group.image.tagName === 'VIDEO' ? group.image.readyState >= 2 : group.image.complete && group.image.naturalWidth;
    if (ready) start();
    else group.image.addEventListener(group.image.tagName === 'VIDEO' ? 'loadeddata' : 'load', start, { once: true });
  });
})();

// Pixel seal: clicking it fills the background with a pattern of seals (and back)
(function sealPattern() {
  const seal = document.querySelector('.seal');
  if (!seal) return;

  seal.addEventListener('click', () => {
    const on = document.body.classList.toggle('seal-pattern');
    seal.setAttribute('aria-pressed', String(on));
  });
})();

// Project panel: clicking a project opens its details in a lavender card.
// The card's title, tags, image and data-date fill the top; its <template> fills the rest.
(function projectPanel() {
  const panel = document.getElementById('project');
  const works = [...document.querySelectorAll('.work:not(.work-copy)')];
  if (!panel || !works.length) return;

  const meta = panel.querySelector('.project-meta');
  const image = panel.querySelector('img.project-image');
  const video = panel.querySelector('video.project-image');
  const title = panel.querySelector('.project-title');
  const tags = panel.querySelector('.project-tags');
  const body = panel.querySelector('.project-body');
  const closeButton = panel.querySelector('.project-close');
  const pill = document.querySelector('.view-cursor');
  let current = 0;
  let lastFocus = null;

  const show = (index) => {
    current = (index + works.length) % works.length; // wraps around at either end
    const work = works[current];
    const workImage = work.querySelector('img');
    const workVideo = work.querySelector('video');
    const details = work.querySelector('.work-details');

    meta.textContent = `(No.${String(current + 1).padStart(2, '0')}) ${work.dataset.date || ''}`;
    image.src = workImage ? workImage.src : '';
    image.alt = workImage ? workImage.alt : '';
    image.hidden = !workImage;
    // Projects with a video play it in the panel instead of an image
    video.hidden = !workVideo;
    if (workVideo) {
      video.src = workVideo.src;
      video.play().catch(() => {});
    } else {
      video.removeAttribute('src');
    }
    title.textContent = work.querySelector('.work-title')?.textContent || '';
    tags.textContent = work.querySelector('.work-tags')?.textContent || '';
    body.replaceChildren(details ? details.content.cloneNode(true) : '');
    panel.scrollTop = 0;
  };

  const isOpen = () => panel.classList.contains('open');

  const open = (index) => {
    lastFocus = document.activeElement;
    show(index);
    panel.hidden = false;
    document.body.classList.add('panel-open');
    if (pill) pill.classList.remove('visible');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open'))); // render first, then fade in
    closeButton.focus({ preventScroll: true });
  };

  const close = () => {
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    panel.addEventListener('transitionend', function hide(event) {
      if (event.target !== panel) return; // ignore the card's own transition
      panel.removeEventListener('transitionend', hide);
      if (!isOpen()) {
        panel.hidden = true;
        video.pause();
      }
    });
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  works.forEach((work, index) => {
    work.addEventListener('click', (event) => {
      event.preventDefault();
      open(index);
    });
  });

  panel.querySelector('.project-prev').addEventListener('click', () => show(current - 1));
  panel.querySelector('.project-next').addEventListener('click', () => show(current + 1));
  closeButton.addEventListener('click', close);

  // Clicking the blurred background (not the card or buttons) closes it
  panel.addEventListener('click', (event) => {
    if (event.target === panel || event.target.classList.contains('project-wrap')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
})();
