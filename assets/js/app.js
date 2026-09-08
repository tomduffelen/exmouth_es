/* ==========================================================================
   Exmouth Spaces
   Loads every space from data/spaces/, then runs the list, the filters
   and the detail pages. No build step and no framework — this file is the
   whole application.
   ========================================================================== */

(function () {
  'use strict';

  /* --- Filter vocabulary ------------------------------------------------
     Add an occasion here and it appears in the filter sheet automatically.
     It must match the wording used in each space file's "occasions" list. */

  var OCCASIONS = [
    'Wedding',
    'Party',
    'Meeting',
    'Community event',
    'Wake',
    'Class or workshop',
    'Performance'
  ];

  var GUEST_STEPS = [
    { value: 0,   label: 'any number of guests', short: 'any number' },
    { value: 20,  label: '20 guests or more',    short: '20 or more' },
    { value: 50,  label: '50 guests or more',    short: '50 or more' },
    { value: 100, label: '100 guests or more',   short: '100 or more' },
    { value: 200, label: '200 guests or more',   short: '200 or more' }
  ];

  var SETTINGS = [
    { value: 'Any',     label: 'indoors or out' },
    { value: 'Indoor',  label: 'indoors' },
    { value: 'Outdoor', label: 'outdoors' }
  ];

  var BUDGETS = [
    { value: 1, label: 'Modest' },
    { value: 2, label: 'Mid-range' },
    { value: 3, label: 'Premium' }
  ];

  var PRICE_WORD = { 1: 'modest', 2: 'mid-range', 3: 'premium' };

  /* --- State ----------------------------------------------------------- */

  var SPACES = [];

  var filters = {
    occasion: null,
    guests: 0,
    setting: 'Any',
    budgets: []
  };

  var el = {};
  var currentSpaceId = null;
  var detailMapInstance = null;
  var overviewMapInstance = null;

  /* --- Helpers --------------------------------------------------------- */

  function $(id) { return document.getElementById(id); }

  /* Everything from the data files goes through this before it reaches the
     page, so an apostrophe or stray bracket in a venue description can never
     break the layout. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function capacityText(space) {
    return (space.capacityApprox ? 'up to about ' : 'up to ') + space.capacity;
  }

  function metaLine(space) {
    var parts = [];
    parts.push(space.setting === 'Outdoor' ? 'Outdoors' : 'Indoors');
    parts.push('for ' + capacityText(space));
    if (space.priceFrom) parts.push(space.priceFrom.toLowerCase());
    return parts.join(', ');
  }

  /* A space with no photograph yet gets its name set on a short deep-navy
     banner rather than a broken image or a grey hole. This is deliberately
     NOT the same height as a real photo, so it can never be mistaken for a
     heading belonging to the next space down. */
  function shotHTML(space, kind) {
    var images = space.images || [];

    if (kind === 'card') {
      if (images.length) {
        return '<div class="shot">' +
          '<img src="' + esc(images[0]) + '" alt="' + esc(space.name) + '" data-org="' + esc(space.org) + '" loading="lazy" ' +
          'onerror="window.exmouthImageFallback(this, \'card\')">' +
        '</div>';
      }
      return emptyShotMarkupRaw(space, 'card');
    }

    // Detail page: no gallery chrome for the common single-photo case —
    // the swipe strip and dots only appear once there's something to swipe.
    if (images.length === 0) return emptyShotMarkupRaw(space, 'detail');

    if (images.length === 1) {
      return '<div class="detail-shot">' +
        '<img src="' + esc(images[0]) + '" alt="' + esc(space.name) + '" data-org="' + esc(space.org) + '" loading="lazy" ' +
        'onerror="window.exmouthImageFallback(this, \'detail\')">' +
      '</div>';
    }

    return '<div class="detail-shot">' +
      '<div class="gallery" id="detailGallery">' +
        images.map(function (src, i) {
          return '<div class="gallery-slide" data-slide="' + i + '">' +
            '<img src="' + esc(src) + '" alt="' + esc(space.name) + ' — photo ' + (i + 1) + '" data-org="' + esc(space.org) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" ' +
            'onerror="window.exmouthGalleryImageError(this)">' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="gallery-dots">' +
        images.map(function (src, i) {
          return '<button type="button" class="dot' + (i === 0 ? ' active' : '') + '" data-goto="' + i + '" aria-label="Photo ' + (i + 1) + ' of ' + images.length + '"></button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* The banner shows the venue (org), not the specific room name — "Ocean
     Exmouth" means something to a visitor even without a photo; "The Ocean
     Suite" on its own doesn't. The room's own name still shows properly as
     the heading right below it. */
  function emptyShotMarkupRaw(space, kind) {
    var cls = kind === 'detail' ? 'shot-empty detail-media' : 'shot-empty';
    return '<div class="' + cls + '"><span>' + esc(space.org) + '</span></div>';
  }

  /* If a photo link is missing or broken, swap in the navy banner.
     This mutates the DOM directly rather than building an HTML string, so a
     name with a quote mark or apostrophe can never break the markup around
     it — and on the detail page, it preserves the back button that sits
     alongside the image rather than deleting it. */
  window.exmouthImageFallback = function (imgEl, kind) {
    var wrapper = imgEl.parentNode;
    if (!wrapper) return;
    var backBtn = wrapper.querySelector('[data-back]');
    wrapper.className = kind === 'detail' ? 'shot-empty detail-media' : 'shot-empty';
    wrapper.innerHTML = '';
    if (backBtn) wrapper.appendChild(backBtn);
    var span = document.createElement('span');
    span.textContent = imgEl.dataset.org || imgEl.alt;
    wrapper.appendChild(span);
  };

  /* If one photo in a gallery is broken, remove just that slide and its dot
     rather than losing every other working photo along with it. Only if
     every photo has now failed does it fall back to the navy banner. */
  window.exmouthGalleryImageError = function (imgEl) {
    var wrap = imgEl.closest('.detail-shot');
    if (!wrap) return;
    var galleryEl = wrap.querySelector('.gallery');
    var dotsEl = wrap.querySelector('.gallery-dots');
    var slide = imgEl.closest('.gallery-slide');
    var idx = slide ? Array.prototype.indexOf.call(galleryEl.children, slide) : -1;

    if (slide) slide.remove();
    if (dotsEl && idx > -1 && dotsEl.children[idx]) dotsEl.children[idx].remove();

    if (!galleryEl.children.length) {
      var backBtn = wrap.querySelector('[data-back]');
      var org = imgEl.dataset.org || imgEl.alt;
      wrap.className = 'shot-empty detail-media';
      wrap.innerHTML = '';
      if (backBtn) wrap.appendChild(backBtn);
      var span = document.createElement('span');
      span.textContent = org;
      wrap.appendChild(span);
    } else if (galleryEl.children.length === 1 && dotsEl) {
      dotsEl.hidden = true;
    }
  };

  /* Keeps the active dot in sync as someone swipes, and lets a tapped dot
     scroll straight to that photo. Native scroll-snap does the actual
     swipe physics — this just watches and reflects it. */
  function wireGallery() {
    var gallery = document.getElementById('detailGallery');
    if (!gallery) return;
    var dotsEl = gallery.parentNode.querySelector('.gallery-dots');
    if (!dotsEl) return;

    var syncTimer = null;
    gallery.addEventListener('scroll', function () {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        var index = Math.round(gallery.scrollLeft / gallery.clientWidth);
        var dots = dotsEl.children;
        for (var i = 0; i < dots.length; i++) {
          dots[i].classList.toggle('active', i === index);
        }
      }, 80);
    });
  }

  /* --- Loading the data ------------------------------------------------ */

  function loadSpaces() {
    return fetch('data/spaces/index.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Could not read data/spaces/index.json');
        return r.json();
      })
      .then(function (ids) {
        return Promise.all(ids.map(function (id) {
          return fetch('data/spaces/' + id + '.json')
            .then(function (r) {
              if (!r.ok) throw new Error('Missing file: data/spaces/' + id + '.json');
              return r.json();
            });
        }));
      });
  }

  /* --- Filtering ------------------------------------------------------- */

  function matching() {
    return SPACES.filter(function (s) {
      if (filters.occasion && (s.occasions || []).indexOf(filters.occasion) === -1) return false;
      if (filters.guests > 0 && s.capacity < filters.guests) return false;
      if (filters.setting !== 'Any' && s.setting !== filters.setting) return false;
      if (filters.budgets.length && filters.budgets.indexOf(s.priceTier) === -1) return false;
      return true;
    });
  }

  function guestStep() {
    for (var i = 0; i < GUEST_STEPS.length; i++) {
      if (GUEST_STEPS[i].value === filters.guests) return GUEST_STEPS[i];
    }
    return GUEST_STEPS[0];
  }

  function settingOption() {
    for (var i = 0; i < SETTINGS.length; i++) {
      if (SETTINGS[i].value === filters.setting) return SETTINGS[i];
    }
    return SETTINGS[0];
  }

  /* --- Rendering the sentence ------------------------------------------ */

  function renderSentence() {
    var occLabel = filters.occasion ? filters.occasion.toLowerCase() : 'any occasion';
    var chev = '<span class="chev" aria-hidden="true">▾</span>';

    el.sentence.innerHTML =
      '<button type="button" class="slot" data-sheet="occasion" data-set="' + (!!filters.occasion) + '">' +
        esc(occLabel) + chev +
      '</button>, for ' +
      '<button type="button" class="slot" data-sheet="guests" data-set="' + (filters.guests > 0) + '">' +
        esc(guestStep().label) + chev +
      '</button>, ' +
      '<button type="button" class="slot" data-sheet="setting" data-set="' + (filters.setting !== 'Any') + '">' +
        esc(settingOption().label) + chev +
      '</button>';
  }

  /* --- Rendering the list ---------------------------------------------- */

  function renderList() {
    var list = matching();

    renderSentence();
    el.count.textContent = list.length === SPACES.length
      ? SPACES.length + ' spaces'
      : list.length + ' of ' + SPACES.length + ' spaces';

    if (!list.length) {
      el.spaces.innerHTML = '';
      el.empty.hidden = false;
      return;
    }

    el.empty.hidden = true;
    el.spaces.innerHTML = list.map(function (s) {
      return '<button type="button" class="space" data-space="' + esc(s.id) + '">' +
        shotHTML(s, 'card') +
        '<div class="space-text">' +
          '<h2 class="space-name">' + esc(s.name) + '</h2>' +
          '<p class="space-org">' + esc(s.org) + ', ' + esc(s.area.toLowerCase()) + '</p>' +
          '<p class="space-meta">' + esc(metaLine(s)) + '</p>' +
        '</div>' +
      '</button>';
    }).join('');
  }

  /* --- Rendering a detail page ----------------------------------------- */

  function renderDetail(s) {
    var contact = s.contact || {};
    var action;

    if (contact.type === 'email') {
      action = '<button type="button" class="contact-btn" data-enquire="' + esc(s.id) + '">Email to enquire</button>';
    } else if (contact.type === 'phone') {
      action = '<a class="contact-btn" href="tel:' + esc(String(contact.value).replace(/\s+/g, '')) + '">Call ' + esc(contact.value) + '</a>';
    } else {
      action = '<a class="contact-btn" href="' + esc(contact.value) + '" target="_blank" rel="noopener">View booking details</a>';
    }

    var specs = [
      ['Setting',  s.setting === 'Outdoor' ? 'Outdoors' : 'Indoors'],
      ['Capacity', capacityText(s) + ' guests'],
      ['Hire',     s.priceFrom || PRICE_WORD[s.priceTier] || ''],
      ['Phone',    s.phone || ''],
      ['Email',    s.email || ''],
      ['Suited to', (s.occasions || []).join(', ')],
      ['Facilities', (s.features || []).join(', ')]
    ];

    var hasCoords = typeof s.lat === 'number' && typeof s.lng === 'number';
    var directionsUrl = hasCoords
      ? 'https://www.google.com/maps/search/?api=1&query=' + s.lat + ',' + s.lng
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + s.org + ' Exmouth');

    el.detail.innerHTML =
      shotHTML(s, 'detail').replace('">', '"><button type="button" class="back" data-back aria-label="Back to all spaces">←</button>') +
      '<div class="detail-head">' +
        '<p class="label">' + (s.setting === 'Outdoor' ? 'Outdoor space' : 'Indoor space') + '</p>' +
        '<h1 class="detail-name">' + esc(s.name) + '</h1>' +
        '<p class="detail-org">' + esc(s.org) + ', ' + esc(s.area.toLowerCase()) + '</p>' +
        '<div class="quickfacts">' +
          '<span class="fact">' + esc(s.setting === 'Outdoor' ? 'Outdoors' : 'Indoors') + '</span>' +
          '<span class="fact">' + esc(capacityText(s)) + '</span>' +
          (s.priceFrom ? '<span class="fact">' + esc(s.priceFrom) + '</span>' : '') +
        '</div>' +
        '<p class="detail-desc desc-collapsed" data-desc>' + esc(s.description || s.summary) + '</p>' +
        '<button type="button" class="read-more" data-read-more>Read more</button>' +
      '</div>' +
      '<dl class="specs">' +
        specs.filter(function (row) { return row[1]; }).map(function (row) {
          return '<div class="spec"><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>';
        }).join('') +
      '</dl>' +
      (hasCoords ? '<div class="mini-map" id="detailMap"></div>' : '<p class="map-note">A map for this space hasn\'t been added yet.</p>') +
      '<a class="directions-link" href="' + directionsUrl + '" target="_blank" rel="noopener">Get directions</a>' +
      '<p class="checked">Details checked ' + esc(formatChecked(s.checked)) +
        (s.source ? ' · <a href="' + esc(s.source) + '" target="_blank" rel="noopener">source</a>' : '') +
        '. Please confirm availability and price with the venue.' +
        (s.imageCredit ? ' Photograph: ' + esc(s.imageCredit) + '.' : '') +
      '</p>' +
      '<div class="contact-bar"><div class="contact-bar-inner">' + action + '</div></div>';

    if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
    if (hasCoords && window.L) {
      detailMapInstance = L.map('detailMap', {
        zoomControl: false, dragging: false, scrollWheelZoom: false,
        doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false
      }).setView([s.lat, s.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(detailMapInstance);
      L.marker([s.lat, s.lng]).addTo(detailMapInstance);
    }

    wireGallery();
  }

  function formatChecked(value) {
    if (!value) return 'recently';
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    var bits = String(value).split('-');
    var m = parseInt(bits[1], 10);
    if (!bits[0] || !m || !months[m - 1]) return value;
    return months[m - 1] + ' ' + bits[0];
  }

  /* --- Sheets ---------------------------------------------------------- */

  function optionRow(label, checked, attrs) {
    return '<button type="button" class="opt" role="checkbox" aria-checked="' + checked + '" ' + attrs + '>' +
      '<span>' + esc(label) + '</span>' +
      (checked ? '<span class="tick" aria-hidden="true">✓</span>' : '') +
    '</button>';
  }

  function openSheet(which) {
    var title = '';
    var body = '';

    if (which === 'occasion') {
      title = 'What are you planning?';
      body = optionRow('Any occasion', !filters.occasion, 'data-pick="occasion" data-value=""') +
        OCCASIONS.map(function (o) {
          return optionRow(o, filters.occasion === o, 'data-pick="occasion" data-value="' + esc(o) + '"');
        }).join('');

    } else if (which === 'guests') {
      title = 'How many guests?';
      body = GUEST_STEPS.map(function (g) {
        return optionRow(g.label.charAt(0).toUpperCase() + g.label.slice(1),
          filters.guests === g.value, 'data-pick="guests" data-value="' + g.value + '"');
      }).join('');

    } else if (which === 'setting') {
      title = 'Indoors or outdoors?';
      body = SETTINGS.map(function (s) {
        return optionRow(s.label.charAt(0).toUpperCase() + s.label.slice(1),
          filters.setting === s.value, 'data-pick="setting" data-value="' + esc(s.value) + '"');
      }).join('');

    } else if (which === 'refine') {
      title = 'Refine';
      body = '<div class="sheet-group"><p class="label">Budget</p>' +
        BUDGETS.map(function (b) {
          return optionRow(b.label, filters.budgets.indexOf(b.value) !== -1,
            'data-pick="budget" data-value="' + b.value + '"');
        }).join('') +
        '</div>' +
        '<div class="sheet-group"><p class="label">Setting</p>' +
        SETTINGS.map(function (s) {
          return optionRow(s.label.charAt(0).toUpperCase() + s.label.slice(1),
            filters.setting === s.value, 'data-pick="setting" data-value="' + esc(s.value) + '"');
        }).join('') +
        '</div>' +
        '<button type="button" class="sheet-done" data-clear>Clear all filters</button>';
    }

    el.sheet.innerHTML =
      '<div class="sheet-head">' +
        '<h2>' + esc(title) + '</h2>' +
        '<button type="button" class="sheet-close" data-close-sheet aria-label="Close">✕</button>' +
      '</div>' + body;

    el.sheetBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = el.sheet.querySelector('.opt, .sheet-close');
    if (first) first.focus();
  }

  /* The enquiry form lives in a sheet too, so there is one overlay pattern
     on the whole site rather than two. */
  function openEnquiry(s) {
    currentSpaceId = s.id;
    var contact = s.contact || {};

    el.sheet.innerHTML =
      '<div class="sheet-head">' +
        '<h2>Enquire about ' + esc(s.name) + '</h2>' +
        '<button type="button" class="sheet-close" data-close-sheet aria-label="Close">✕</button>' +
      '</div>' +
      '<form id="enquiryForm" novalidate>' +
        '<div class="field"><label for="fName">Your name</label>' +
          '<input type="text" id="fName" autocomplete="name"></div>' +
        '<div class="pair">' +
          '<div class="field"><label for="fDate">Date</label><input type="date" id="fDate"></div>' +
          '<div class="field"><label for="fGuests">Guests</label><input type="number" id="fGuests" min="1" inputmode="numeric"></div>' +
        '</div>' +
        '<div class="field"><label for="fMessage">Message</label>' +
          '<textarea id="fMessage">I would like to find out more about hiring ' + esc(s.name) + '.</textarea></div>' +
        '<button type="submit" class="sheet-done" style="margin-top:8px">Open in your email app</button>' +
        '<p class="form-note">This opens your own email app with the message ready to send to ' +
          esc(contact.name || contact.value) + '. Nothing is sent automatically and nothing is stored by this site.</p>' +
      '</form>';

    el.sheetBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    var nameField = $('fName');
    if (nameField) nameField.focus();
  }

  function closeSheet() {
    el.sheetBackdrop.hidden = true;
    document.body.style.overflow = '';
  }

  function sendEnquiry() {
    var s = SPACES.filter(function (x) { return x.id === currentSpaceId; })[0];
    if (!s) return;

    var name = ($('fName') || {}).value || '';
    var date = ($('fDate') || {}).value || '';
    var guests = ($('fGuests') || {}).value || '';
    var message = ($('fMessage') || {}).value || '';

    var lines = ['Hello,', '', message.trim(), ''];
    if (date) lines.push('Preferred date: ' + date);
    if (guests) lines.push('Number of guests: ' + guests);
    lines.push('');
    lines.push(name.trim() ? name.trim() : 'Sent via Exmouth Spaces');

    window.location.href = 'mailto:' + s.contact.value +
      '?subject=' + encodeURIComponent('Enquiry about ' + s.name) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  /* --- Routing ---------------------------------------------------------
     Buttons rather than links, so that changing view never looks like
     leaving the site. The URL still updates, so a space can be shared. */

  function route() {
    var hash = window.location.hash;
    var match = hash.match(/^#\/space\/(.+)$/);
    var space = null;

    if (match) {
      var wanted = decodeURIComponent(match[1]);
      space = SPACES.filter(function (s) { return s.id === wanted; })[0] || null;
    }

    if (space) {
      el.listView.hidden = true;
      el.mapView.hidden = true;
      el.detail.hidden = false;
      renderDetail(space);
      document.title = space.name + ' — Exmouth Spaces';
    } else if (hash === '#/map') {
      el.listView.hidden = true;
      el.detail.hidden = true;
      el.detail.innerHTML = '';
      el.mapView.hidden = false;
      renderMapOverview();
      document.title = 'Map — Exmouth Spaces';
    } else {
      el.detail.hidden = true;
      el.detail.innerHTML = '';
      el.mapView.hidden = true;
      el.listView.hidden = false;
      document.title = 'Exmouth Spaces — find a space to hire in Exmouth';
    }
    window.scrollTo(0, 0);
  }

  /* All nine spaces on one map. The overview map is created once and reused
     — Leaflet errors if you initialise a second map into the same element —
     and invalidateSize() runs after showing it, since Leaflet measured a
     zero-size container while the view was hidden. */
  function renderMapOverview() {
    if (!window.L) return;
    var withCoords = SPACES.filter(function (s) { return typeof s.lat === 'number' && typeof s.lng === 'number'; });
    if (!withCoords.length) return;

    if (!overviewMapInstance) {
      overviewMapInstance = L.map('overviewMap');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(overviewMapInstance);

      withCoords.forEach(function (s) {
        var popup = '<div class="map-popup"><strong>' + esc(s.name) + '</strong>' +
          esc(s.org) + '<br><a href="#/space/' + esc(s.id) + '">Open this space</a></div>';
        L.marker([s.lat, s.lng]).addTo(overviewMapInstance).bindPopup(popup);
      });
    }

    var bounds = L.latLngBounds(withCoords.map(function (s) { return [s.lat, s.lng]; }));
    setTimeout(function () {
      overviewMapInstance.invalidateSize();
      overviewMapInstance.fitBounds(bounds, { padding: [30, 30] });
    }, 0);
  }

  /* --- Events ---------------------------------------------------------- */

  function wire() {
    document.body.addEventListener('click', function (e) {
      var t = e.target;

      var space = t.closest('[data-space]');
      if (space) { window.location.hash = '#/space/' + space.dataset.space; return; }

      if (t.closest('[data-back]')) { window.location.hash = ''; return; }

      var dot = t.closest('[data-goto]');
      if (dot) {
        var gallery = document.getElementById('detailGallery');
        var i = Number(dot.dataset.goto);
        if (gallery && typeof gallery.scrollTo === 'function') {
          try { gallery.scrollTo({ left: i * gallery.clientWidth, behavior: 'smooth' }); } catch (err) {}
        }
        var dots = dot.parentNode.children;
        for (var d = 0; d < dots.length; d++) dots[d].classList.toggle('active', d === i);
        return;
      }

      var readMore = t.closest('[data-read-more]');
      if (readMore) {
        var desc = document.querySelector('[data-desc]');
        if (desc) {
          var collapsed = desc.classList.toggle('desc-collapsed');
          readMore.textContent = collapsed ? 'Read more' : 'Show less';
        }
        return;
      }

      var slot = t.closest('[data-sheet]');
      if (slot) { openSheet(slot.dataset.sheet); return; }

      if (t.closest('[data-refine]')) { openSheet('refine'); return; }

      var enquire = t.closest('[data-enquire]');
      if (enquire) {
        var s = SPACES.filter(function (x) { return x.id === enquire.dataset.enquire; })[0];
        if (s) openEnquiry(s);
        return;
      }

      if (t.closest('[data-close-sheet]')) { closeSheet(); return; }

      if (t.closest('[data-clear]')) {
        filters = { occasion: null, guests: 0, setting: 'Any', budgets: [] };
        renderList();
        closeSheet();
        return;
      }

      var pick = t.closest('[data-pick]');
      if (pick) {
        var kind = pick.dataset.pick;
        var value = pick.dataset.value;

        if (kind === 'occasion') {
          filters.occasion = value || null;
        } else if (kind === 'guests') {
          filters.guests = parseInt(value, 10) || 0;
        } else if (kind === 'setting') {
          filters.setting = value;
        } else if (kind === 'budget') {
          var tier = parseInt(value, 10);
          var at = filters.budgets.indexOf(tier);
          if (at === -1) filters.budgets.push(tier); else filters.budgets.splice(at, 1);
        }

        renderList();
        if (kind === 'budget') openSheet('refine'); else closeSheet();
        return;
      }

      if (t === el.sheetBackdrop) closeSheet();
    });

    document.body.addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'enquiryForm') {
        e.preventDefault();
        sendEnquiry();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !el.sheetBackdrop.hidden) closeSheet();
    });

    window.addEventListener('hashchange', route);
  }

  /* --- Start ----------------------------------------------------------- */

  function start() {
    el.sentence = $('sentence');
    el.count = $('count');
    el.spaces = $('spaces');
    el.empty = $('empty');
    el.listView = $('listView');
    el.detail = $('detailView');
    el.mapView = $('mapView');
    el.sheet = $('sheet');
    el.sheetBackdrop = $('sheetBackdrop');

    wire();

    loadSpaces()
      .then(function (spaces) {
        SPACES = spaces;
        renderList();
        route();
      })
      .catch(function (err) {
        el.spaces.innerHTML = '<p class="empty">The list of spaces could not be loaded. ' +
          'If you are previewing this on your own machine, run it through a local web server ' +
          'rather than opening the file directly — see the README.</p>';
        if (window.console) window.console.error(err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
