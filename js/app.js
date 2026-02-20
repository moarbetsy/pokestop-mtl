(function () {
  'use strict';

  const CART_KEY = 'pokestop-cart';
  const LANG_KEY = 'pokestop-lang';

  let lang = (localStorage.getItem(LANG_KEY) || (navigator.language.startsWith('fr') ? 'fr' : 'en'));
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

  function t(key) {
    return (translations[lang] && translations[lang][key]) || (translations.en && translations.en[key]) || key;
  }

  function setLang(newLang) {
    lang = newLang;
    localStorage.setItem(LANG_KEY, newLang);
    document.documentElement.lang = newLang;
    document.querySelector('.lang-label').textContent = lang === 'en' ? 'FR' : 'EN';
    updateI18n();
    renderHowItWorks();
    renderContactInfo();
    renderFAQ();
    renderCartSummary();
    renderAccountSections();
    renderNotFound();
    document.getElementById('search-input').placeholder = t('nav.search');
    document.getElementById('footer-email').placeholder = t('footer.email_placeholder');
    document.getElementById('password-label').textContent = lang === 'fr' ? 'Mot de passe' : 'Password';
  }

  function updateI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-opt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-opt');
      if (key) el.textContent = t(key);
    });
  }

  function getPageFromHash() {
    var h = window.location.hash.slice(1) || 'home';
    if (['home', 'shop', 'pokemon-cards', 'mystery-packs', 'about', 'contact', 'faq', 'cart', 'account', 'privacy', 'terms', 'shipping'].indexOf(h) >= 0) return h;
    if (h === '') return 'home';
    return '404';
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var el = document.getElementById('page-' + pageId);
    if (el) el.classList.add('active');

    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === '#' + pageId || (pageId === 'home' && (href === '#' || href === ''))) a.classList.add('active');
      else a.classList.remove('active');
    });

    if (pageId === 'shop') { renderShopFilters(); renderShopGrid(); }
    if (pageId === 'pokemon-cards') renderProductGrid('pokemon-cards-grid', products.filter(function (p) { return p.category === 'pokemon-cards'; }));
    if (pageId === 'mystery-packs') renderMysteryGrid('mystery-packs-grid', mysteryPacks);
    if (pageId === 'cart') renderCartPage();
    if (pageId === 'faq') renderFAQ();
    if (pageId === 'account') renderAccountSections();
    if (pageId === 'privacy' || pageId === 'terms' || pageId === 'shipping') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function addToCart(item) {
    var existing = cart.find(function (x) { return x.id === item.id; });
    if (existing) existing.quantity = (existing.quantity || 1) + 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, quantity: 1 });
    saveCart();
    updateCartBadge();
  }

  function removeFromCart(id) {
    cart = cart.filter(function (x) { return x.id !== id; });
    saveCart();
    updateCartBadge();
  }

  function updateCartQuantity(id, delta) {
    var item = cart.find(function (x) { return x.id === id; });
    if (!item) return;
    item.quantity = Math.max(0, (item.quantity || 1) + delta);
    if (item.quantity <= 0) removeFromCart(id);
    else saveCart();
    updateCartBadge();
    renderCartPage();
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function totalCartItems() {
    return cart.reduce(function (sum, x) { return sum + (x.quantity || 1); }, 0);
  }

  function updateCartBadge() {
    var badge = document.getElementById('cart-badge');
    var n = totalCartItems();
    if (badge) { badge.textContent = n; badge.style.display = n > 0 ? 'flex' : 'none'; }
  }

  var currentPopupProduct = null;

  function openProductPopup(product) {
    currentPopupProduct = product;
    var overlay = document.getElementById('product-popup-overlay');
    var imgEl = document.getElementById('product-popup-image');
    var titleEl = document.getElementById('product-popup-title');
    var priceEl = document.getElementById('product-popup-price');
    var statusEl = document.getElementById('product-popup-status');
    var buyBtn = document.getElementById('product-popup-buy');
    if (!overlay || !imgEl || !titleEl || !priceEl || !statusEl || !buyBtn) return;
    var name = lang === 'fr' ? product.nameFr : product.name;
    imgEl.src = product.image || '';
    imgEl.alt = name;
    titleEl.textContent = name;
    priceEl.textContent = product.price === 0 ? (lang === 'fr' ? 'Contact' : 'Contact') : '$' + product.price.toFixed(2);
    statusEl.textContent = product.stock === 0 ? (lang === 'fr' ? 'Vendu' : 'Sold') : (lang === 'fr' ? 'Disponible' : 'Available');
    buyBtn.textContent = product.stock === 0 ? (lang === 'fr' ? 'Indisponible' : 'Unavailable') : (lang === 'fr' ? 'Ajouter au panier' : 'Add to Cart');
    buyBtn.disabled = product.stock === 0;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.getElementById('product-popup-close').focus();
  }

  function closeProductPopup() {
    var overlay = document.getElementById('product-popup-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }
    currentPopupProduct = null;
  }

  function productCard(product, showAdded) {
    var name = lang === 'fr' ? product.nameFr : product.name;
    var badge = product.badge ? '<span class="badge ' + product.badge + '" data-i18n="featured.' + product.badge + '">' + t('featured.' + product.badge) + '</span>' : '';
    var priceStr = product.price === 0 ? (lang === 'fr' ? 'Contact' : 'Contact') : '$' + product.price.toFixed(2);
    var addedHtml = showAdded ? '<span class="added-msg">' + t('shop.added') + '</span>' : '';
    var disabled = product.stock === 0 ? ' disabled' : '';
    var rawGrade = product.grade || (name.match(/(?:PSA|Psa|BGS|CGC)\s*\d+/i) && name.match(/(?:PSA|Psa|BGS|CGC)\s*\d+/i)[0]) || '';
    var grade = rawGrade.replace(/^Psa\s*/i, 'PSA ');
    var condition = product.condition ? t('condition.' + product.condition) : '';
    var rarity = product.rarity ? t('rarity.' + product.rarity) : '';
    var stripeParts = [grade, condition, rarity].filter(Boolean);
    var stripeHtml = stripeParts.length ? '<div class="card-info-stripe">' + stripeParts.join(' · ') + '</div>' : '';
    return (
      '<div class="group vault-card product-card holo-shimmer rounded-lg" data-product-id="' + product.id + '" role="button" tabindex="0">' +
        '<div class="img-wrap">' +
          '<img src="' + product.image + '" alt="' + name + '" loading="lazy" />' +
          '<div class="overlay"></div>' + stripeHtml + badge +
          '<button type="button" class="add-cart" data-product-id="' + product.id + '"' + disabled + ' aria-label="Add to cart">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="info">' +
          '<h3>' + name + '</h3>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto">' +
            '<span class="price">' + priceStr + '</span>' + addedHtml +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderProductGrid(containerId, list) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = list.map(function (p) { return productCard(p, false); }).join('');
    el.querySelectorAll('.add-cart').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-product-id');
        var product = products.find(function (p) { return p.id === id; });
        if (product) {
          addToCart({ id: product.id, name: lang === 'fr' ? product.nameFr : product.name, price: product.price, image: product.image });
          var card = btn.closest('.product-card');
          var addedSpan = card.querySelector('.added-msg');
          if (addedSpan) addedSpan.remove();
          var wrap = card.querySelector('.info > div');
          if (wrap) {
            var add = document.createElement('span');
            add.className = 'added-msg';
            add.textContent = t('shop.added');
            wrap.appendChild(add);
            setTimeout(function () { add.remove(); }, 1500);
          }
        }
      });
    });
    el.querySelectorAll('.product-card').forEach(function (card) {
      var id = card.getAttribute('data-product-id');
      var product = products.find(function (p) { return p.id === id; });
      if (!product) return;
      function openPopup(e) {
        if (e.target.closest('.add-cart')) return;
        e.preventDefault();
        openProductPopup(product);
      }
      card.addEventListener('click', openPopup);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPopup(e);
        }
      });
    });
  }

  var featuredList = products.filter(function (p) { return p.badge; }).length ? products.filter(function (p) { return p.badge; }).slice(0, 8) : products.slice(0, 8);
  var newArrivalsList = products.filter(function (p) { return p.badge === 'new'; }).length ? products.filter(function (p) { return p.badge === 'new'; }).slice(0, 4) : products.slice(0, 4);

  function renderHome() {
    renderProductGrid('featured-products', featuredList);
    renderProductGrid('new-arrivals', newArrivalsList);
    var mpEl = document.getElementById('mystery-packs-home');
    if (mpEl) {
      if (mysteryPacks.length) renderMysteryGrid('mystery-packs-home', mysteryPacks);
      else mpEl.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-soft)">' + (lang === 'fr' ? 'Aucun pack mystère pour le moment.' : 'No mystery packs at the moment.') + '</p>';
    }
  }

  var shopFilters = { game: '', rarity: '', condition: '' };
  var shopSort = 'newest';

  function getFilteredProducts() {
    var list = products.slice();
    if (shopFilters.game) list = list.filter(function (p) { return p.category === shopFilters.game; });
    if (shopFilters.rarity) list = list.filter(function (p) { return p.rarity === shopFilters.rarity; });
    if (shopFilters.condition) list = list.filter(function (p) { return p.condition === shopFilters.condition; });
    if (shopSort === 'price_low') list.sort(function (a, b) { return a.price - b.price; });
    else if (shopSort === 'price_high') list.sort(function (a, b) { return b.price - a.price; });
    else if (shopSort === 'name') list.sort(function (a, b) { return (lang === 'fr' ? a.nameFr : a.name).localeCompare(lang === 'fr' ? b.nameFr : b.name); });
    return list;
  }

  function renderShopFilters() {
    var catMap = { 'pokemon-cards': 'cat.pokemon_cards', 'yugioh': 'cat.yugioh', 'mtg': 'cat.mtg', 'n64': 'cat.n64', 'marketplace': 'cat.marketplace' };
    function section(titleKey, options, key, prefix) {
      var opts = options.map(function (opt) {
        var labelKey = prefix === 'cat' ? (catMap[opt] || prefix + '.' + opt) : prefix + '.' + opt;
        var active = shopFilters[key] === opt ? ' active' : '';
        return '<button type="button" class="filter-opt' + active + '" data-filter="' + key + '" data-value="' + opt + '">' + t(labelKey) + '</button>';
      }).join('');
      return '<div class="filter-section"><h4>' + t(titleKey) + '</h4>' + opts + '</div>';
    }
    document.getElementById('filter-game').innerHTML = section('shop.game', gameFilters, 'game', 'cat');
    document.getElementById('filter-rarity').innerHTML = section('shop.rarity', rarityFilters, 'rarity', 'rarity');
    document.getElementById('filter-condition').innerHTML = section('shop.condition', conditionFilters, 'condition', 'condition');

    var clearBtn = document.getElementById('clear-filters');
    var hasFilters = shopFilters.game || shopFilters.rarity || shopFilters.condition;
    if (clearBtn) { clearBtn.style.display = hasFilters ? 'block' : 'none'; clearBtn.onclick = function () { shopFilters = { game: '', rarity: '', condition: '' }; renderShopFilters(); renderShopGrid(); }; }

    document.getElementById('shop-sidebar').querySelectorAll('.filter-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-filter');
        var v = btn.getAttribute('data-value');
        shopFilters[k] = shopFilters[k] === v ? '' : v;
        renderShopFilters();
        renderShopGrid();
      });
    });
  }

  function renderShopGrid() {
    var list = getFilteredProducts();
    document.getElementById('shop-results-count').textContent = list.length + ' ' + t('shop.results');
    document.getElementById('shop-no-results').style.display = list.length ? 'none' : 'block';
    document.getElementById('shop-grid').style.display = list.length ? 'grid' : 'none';
    renderProductGrid('shop-grid', list);
    var clearBtn = document.querySelector('#shop-no-results button');
    if (clearBtn) clearBtn.onclick = function () { shopFilters = { game: '', rarity: '', condition: '' }; renderShopFilters(); renderShopGrid(); };
  }

  function renderMysteryGrid(containerId, list) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!list.length) { el.innerHTML = ''; return; }
    var tierLabels = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD', platinum: 'PLATINUM' };
    el.innerHTML = list.map(function (pack) {
      var name = lang === 'fr' ? pack.nameFr : pack.name;
      var oddsHtml = pack.odds && pack.odds.length ? pack.odds.map(function (o) {
        return '<div><span>' + (lang === 'fr' ? o.itemFr : o.item) + '</span><span class="countdown">' + o.chance + '%</span></div>';
      }).join('') : '';
      return (
        '<div class="vault-card mystery-card">' +
          '<div class="tier-header ' + pack.tier + '">' +
            '<span class="tier-label">' + tierLabels[pack.tier] + '</span>' +
            '<img src="' + pack.image + '" alt="" class="pack-img" />' +
          '</div>' +
          '<div class="pack-info">' +
            '<h3>' + name + '</h3>' +
            '<p class="guaranteed">' + t('mystery.guaranteed') + ': $' + pack.guaranteedValue + '+</p>' +
            '<div class="price">$' + pack.price.toFixed(2) + '</div>' +
            (oddsHtml ? '<div class="odds-list">' + oddsHtml + '</div>' : '') +
            '<button type="button" class="buy-btn" data-pack-id="' + pack.id + '">' + t('mystery.buy') + '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    el.querySelectorAll('.buy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pack = mysteryPacks.find(function (p) { return p.id === btn.getAttribute('data-pack-id'); });
        if (pack) addToCart({ id: pack.id, name: lang === 'fr' ? pack.nameFr : pack.name, price: pack.price, image: pack.image });
      });
    });
  }

  var howSteps = [
    { step: '01', title: 'Choose Your Tier', titleFr: 'Choisissez votre niveau', desc: 'Select from Bronze, Silver, Gold, or Platinum packs based on your budget and desired rarity.', descFr: 'Sélectionnez parmi les packs Bronze, Argent, Or ou Platine selon votre budget et la rareté souhaitée.' },
    { step: '02', title: 'Review the Odds', titleFr: 'Consultez les probabilités', desc: 'Every pack has transparent odds clearly displayed. Know exactly what you might get.', descFr: 'Chaque pack a des probabilités transparentes clairement affichées.' },
    { step: '03', title: 'Open & Collect', titleFr: 'Ouvrez et collectionnez', desc: 'Purchase your pack and receive your randomized cards. Every pack has a guaranteed minimum value.', descFr: 'Achetez votre pack et recevez vos cartes aléatoires. Chaque pack a une valeur minimale garantie.' }
  ];

  function renderHowItWorks() {
    var titleEl = document.getElementById('how-it-works-title');
    if (titleEl) titleEl.textContent = lang === 'fr' ? 'Comment ça marche' : 'How It Works';
    var cont = document.getElementById('how-it-works-steps');
    if (!cont) return;
    cont.innerHTML = howSteps.map(function (s) {
      return '<div class="how-step"><span class="num">' + s.step + '</span><h3>' + (lang === 'fr' ? s.titleFr : s.title) + '</h3><p>' + (lang === 'fr' ? s.descFr : s.desc) + '</p></div>';
    }).join('');
  }

  var valueKeys = ['auth', 'trust', 'community', 'quality'];
  var valueIcons = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  ];

  function renderAboutValues() {
    var cont = document.getElementById('about-values');
    if (!cont) return;
    cont.innerHTML = valueKeys.map(function (key, i) {
      return '<div class="vault-card value-card"><div class="icon-wrap">' + valueIcons[i] + '</div><h3 data-i18n="about.' + key + '">' + t('about.' + key) + '</h3><p data-i18n="about.' + key + '_desc">' + t('about.' + key + '_desc') + '</p></div>';
    }).join('');
  }

  function renderContactInfo() {
    var details = [
      { titleKey: 'contact.address', detail: '1234 Rue Sainte-Catherine O, Montréal, QC H3G 1P1' },
      { titleKey: 'contact.hours', detail: lang === 'fr' ? 'Lun-Ven: 10h - 18h HNE\nSam: 11h - 17h\nDim: Fermé' : 'Mon-Fri: 10am - 6pm EST\nSat: 11am - 5pm\nSun: Closed' },
      { titleKey: 'Email', detail: 'info@pokestopmtl.com\nsupport@pokestopmtl.com' }
    ];
    var icons = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
    ];
    var html = details.map(function (d, i) {
      var title = d.titleKey.indexOf('.') >= 0 ? t(d.titleKey) : d.titleKey;
      return '<div class="vault-card contact-info-card"><div class="icon-wrap">' + icons[i] + '</div><div><h3>' + title + '</h3><p>' + d.detail.replace(/\n/g, '<br/>') + '</p></div></div>';
    }).join('');
    var cont = document.getElementById('contact-info-cards');
    if (cont) cont.innerHTML = html;
  }

  function renderFAQ() {
    var cont = document.getElementById('faq-list');
    if (!cont) return;
    cont.innerHTML = faqItems.map(function (item, i) {
      var q = lang === 'fr' ? item.questionFr : item.question;
      var a = lang === 'fr' ? item.answerFr : item.answer;
      return '<div class="faq-item vault-card rounded-lg" data-faq-index="' + i + '"><button type="button"><span>' + q + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="6 9 12 15 18 9"/></svg></button><div class="content" style="display:none"><p>' + a + '</p></div></div>';
    }).join('');
    cont.querySelectorAll('.faq-item').forEach(function (item) {
      var btn = item.querySelector('button');
      var content = item.querySelector('.content');
      btn.addEventListener('click', function () {
        var open = content.style.display === 'block';
        cont.querySelectorAll('.faq-item').forEach(function (x) { x.classList.remove('open'); x.querySelector('.content').style.display = 'none'; });
        if (!open) { item.classList.add('open'); content.style.display = 'block'; }
      });
    });
  }

  function renderCartPage() {
    var emptyEl = document.getElementById('cart-empty');
    var contentEl = document.getElementById('cart-content');
    if (cart.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (contentEl) contentEl.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    var itemsEl = document.getElementById('cart-items');
    itemsEl.innerHTML = cart.map(function (item) {
      return (
        '<div class="vault-card rounded-lg cart-item" data-cart-id="' + item.id + '">' +
          '<img src="' + item.image + '" alt="" />' +
          '<div class="details">' +
            '<h3>' + item.name + '</h3>' +
            '<p class="price">$' + item.price.toFixed(2) + '</p>' +
            '<div class="qty-wrap">' +
              '<button type="button" class="qty-minus" aria-label="Decrease">−</button>' +
              '<span class="qty">' + (item.quantity || 1) + '</span>' +
              '<button type="button" class="qty-plus" aria-label="Increase">+</button>' +
              '<button type="button" class="cart-remove" aria-label="Remove">🗑</button>' +
            '</div>' +
          '</div>' +
          '<div class="price">$' + ((item.price || 0) * (item.quantity || 1)).toFixed(2) + '</div>' +
        '</div>'
      );
    }).join('');

    itemsEl.querySelectorAll('.qty-minus').forEach(function (btn) {
      btn.onclick = function () { updateCartQuantity(btn.closest('[data-cart-id]').getAttribute('data-cart-id'), -1); };
    });
    itemsEl.querySelectorAll('.qty-plus').forEach(function (btn) {
      btn.onclick = function () { updateCartQuantity(btn.closest('[data-cart-id]').getAttribute('data-cart-id'), 1); };
    });
    itemsEl.querySelectorAll('.cart-remove').forEach(function (btn) {
      btn.onclick = function () { removeFromCart(btn.closest('[data-cart-id]').getAttribute('data-cart-id')); renderCartPage(); };
    });

    renderCartSummary();
  }

  function renderCartSummary() {
    var subtotal = cart.reduce(function (s, x) { return s + (x.price || 0) * (x.quantity || 1); }, 0);
    var shipping = subtotal >= 100 ? 0 : 12.99;
    var taxRate = 0.14975;
    var tax = subtotal * taxRate;
    var total = subtotal + shipping + tax;

    var freeLabel = t('free');
    document.getElementById('cart-summary-title').textContent = t('order_summary');
    document.getElementById('cart-summary-lines').innerHTML =
      '<div class="line"><span>' + t('cart.subtotal') + '</span><span class="font-mono">$' + subtotal.toFixed(2) + '</span></div>' +
      '<div class="line"><span>' + t('cart.shipping') + '</span><span class="font-mono">' + (shipping === 0 ? freeLabel : '$' + shipping.toFixed(2)) + '</span></div>' +
      '<div class="line"><span>' + t('cart.tax') + '</span><span class="font-mono">$' + tax.toFixed(2) + '</span></div>' +
      '<div class="divider"></div>' +
      '<div class="total"><span>' + t('cart.total') + '</span><span class="amount">$' + total.toFixed(2) + '</span></div>';

    var checkoutBtn = document.getElementById('cart-checkout');
    if (checkoutBtn) checkoutBtn.onclick = function () { alert(t('general.coming_soon')); };
  }

  function renderAccountSections() {
    var sections = [
      { key: 'account.orders', descKey: 'orders_desc' },
      { key: 'account.bids', descKey: 'bids_desc' },
      { key: 'account.bets', descKey: 'bets_desc' },
      { key: 'account.settings', descKey: 'settings_desc' }
    ];
    var descs = {
      orders_desc: { en: 'View and track your orders', fr: "Voir et suivre vos commandes" },
      bids_desc: { en: 'Monitor your active bids', fr: "Suivre vos enchères actives" },
      bets_desc: { en: 'See your mystery pack history', fr: "Voir l'historique de vos packs mystère" },
      settings_desc: { en: 'Manage your account settings', fr: "Gérer les paramètres de votre compte" }
    };
    var icons = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
    ];
    var html = sections.map(function (s, i) {
      var desc = descs[s.descKey] ? descs[s.descKey][lang] : '';
      return '<button type="button" class="vault-card account-section"><div class="icon-wrap">' + icons[i] + '</div><div><h3>' + t(s.key) + '</h3><p>' + desc + '</p></div></button>';
    }).join('');
    var cont = document.getElementById('account-sections');
    if (cont) { cont.innerHTML = html; cont.querySelectorAll('button').forEach(function (b) { b.onclick = function () { alert(t('general.coming_soon')); }; }); }

    document.querySelectorAll('.account-form .btn-primary, .account-form .btn-outline').forEach(function (btn) {
      btn.onclick = function () { alert(t('general.coming_soon')); };
    });
  }

  function renderNotFound() {
    var title = document.getElementById('notfound-title');
    var desc = document.getElementById('notfound-desc');
    var back = document.getElementById('notfound-back');
    if (title) title.textContent = lang === 'fr' ? 'Page Non Trouvée' : 'Page Not Found';
    if (desc) desc.textContent = lang === 'fr' ? "La page que vous recherchez n'existe pas ou a été déplacée." : "The page you're looking for doesn't exist or has been moved.";
    if (back) back.textContent = lang === 'fr' ? 'Retour à l\'Accueil' : 'Back to Home';
  }

  function renderFooter() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    var quickLinks = [
      { href: '#shop', key: 'nav.shop' },
      { href: '#mystery-packs', key: 'nav.mystery' },
      { href: '#about', key: 'nav.about' },
      { href: '#contact', key: 'nav.contact' },
      { href: '#faq', key: 'nav.faq' }
    ];
    document.getElementById('footer-quick-links').innerHTML = quickLinks.map(function (l) { return '<li><a href="' + l.href + '">' + t(l.key) + '</a></li>'; }).join('');
    document.getElementById('footer-categories').innerHTML = categories.map(function (c) {
      var href = c.id === 'pokemon-cards' ? '#pokemon-cards' : '#shop';
      return '<li><a href="' + href + '">' + t(c.labelKey) + '</a></li>';
    }).join('');
  }

  document.getElementById('shop-sort').addEventListener('change', function () {
    shopSort = this.value;
    renderShopGrid();
  });

  document.getElementById('filter-toggle-mobile').addEventListener('click', function () {
    document.getElementById('shop-sidebar').classList.add('mobile-open');
  });
  document.getElementById('close-sidebar-mobile').addEventListener('click', function () {
    document.getElementById('shop-sidebar').classList.remove('mobile-open');
  });

  document.querySelector('.search-toggle').addEventListener('click', function () {
    var bar = document.getElementById('search-bar');
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) document.getElementById('search-input').focus();
  });
  document.getElementById('search-input').placeholder = t('nav.search');

  document.querySelector('.lang-btn').addEventListener('click', function () {
    setLang(lang === 'en' ? 'fr' : 'en');
  });
  document.querySelector('.lang-label').textContent = lang === 'en' ? 'FR' : 'EN';

  document.querySelector('.menu-toggle').addEventListener('click', function () {
    var menu = document.getElementById('mobile-menu');
    var open = menu.classList.toggle('open');
    var openIcon = document.querySelector('.menu-icon-open');
    var closeIcon = document.querySelector('.menu-icon-close');
    if (openIcon && closeIcon) { openIcon.style.display = open ? 'none' : ''; closeIcon.style.display = open ? '' : 'none'; }
  });
  document.getElementById('menu-backdrop').addEventListener('click', function () {
    document.getElementById('mobile-menu').classList.remove('open');
    var openIcon = document.querySelector('.menu-icon-open');
    var closeIcon = document.querySelector('.menu-icon-close');
    if (openIcon && closeIcon) { openIcon.style.display = ''; closeIcon.style.display = 'none'; }
  });

    var newsletterBtn = document.querySelector('.newsletter-form button');
  if (newsletterBtn) {
    newsletterBtn.addEventListener('click', function () {
      var emailInput = document.getElementById('footer-email');
      var toast = document.getElementById('newsletter-toast');
      var toastText = document.getElementById('newsletter-toast-text');
      if (!toast || !toastText) return;
      var email = (emailInput && emailInput.value) ? emailInput.value.trim() : '';
      if (!email) return;
      var isValid = email.indexOf('@') !== -1 && email.indexOf('.com') !== -1;
      toastText.textContent = isValid ? t('footer.subscribed') : t('footer.invalid_email');
      toast.classList.remove('toast-error');
      if (!isValid) toast.classList.add('toast-error');
      toast.classList.add('show');
      window.clearTimeout(window._newsletterToastTimeout);
      window._newsletterToastTimeout = window.setTimeout(function () {
        toast.classList.remove('show');
      }, 3500);
    });
  }
  document.getElementById('contact-form').addEventListener('submit', function (e) {
    e.preventDefault();
    alert(t('contact.sent'));
  });

  var productPopupOverlay = document.getElementById('product-popup-overlay');
  var productPopupClose = document.getElementById('product-popup-close');
  var productPopupBuy = document.getElementById('product-popup-buy');
  if (productPopupClose) {
    productPopupClose.addEventListener('click', closeProductPopup);
  }
  if (productPopupBuy) {
    productPopupBuy.addEventListener('click', function () {
      if (currentPopupProduct && currentPopupProduct.stock > 0) {
        addToCart({
          id: currentPopupProduct.id,
          name: lang === 'fr' ? currentPopupProduct.nameFr : currentPopupProduct.name,
          price: currentPopupProduct.price,
          image: currentPopupProduct.image
        });
        updateCartBadge();
      }
      closeProductPopup();
    });
  }
  if (productPopupOverlay) {
    productPopupOverlay.addEventListener('click', function (e) {
      if (e.target === productPopupOverlay) closeProductPopup();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && productPopupOverlay && !productPopupOverlay.classList.contains('hidden')) {
      closeProductPopup();
    }
  });

  window.addEventListener('hashchange', function () { showPage(getPageFromHash()); });
  window.addEventListener('load', function () {
    document.documentElement.lang = lang;
    updateI18n();
    document.getElementById('footer-email').placeholder = t('footer.email_placeholder');
    renderHome();
    renderAboutValues();
    renderContactInfo();
    renderFooter();
    renderHowItWorks();
    renderAccountSections();
    renderNotFound();
    updateCartBadge();
    showPage(getPageFromHash());

    function closeMobileMenu() {
      document.getElementById('mobile-menu').classList.remove('open');
      var openIcon = document.querySelector('.menu-icon-open');
      var closeIcon = document.querySelector('.menu-icon-close');
      if (openIcon && closeIcon) { openIcon.style.display = ''; closeIcon.style.display = 'none'; }
    }
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var h = a.getAttribute('href');
        if (h === '#') { window.location.hash = ''; closeMobileMenu(); return; }
        window.location.hash = h.slice(1);
        closeMobileMenu();
      });
    });
  });
})();
