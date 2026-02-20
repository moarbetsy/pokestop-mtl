(function () {
  'use strict';

  var EXCLUDED_IDS = { 1: true, 20: true, 40: true };

  var gridEl = document.getElementById('grid');
  var searchEl = document.getElementById('search');
  var countEl = document.getElementById('results-count');
  var emptyEl = document.getElementById('empty-state');
  var popupOverlay = document.getElementById('popup-overlay');
  var popup = document.getElementById('popup');
  var popupClose = document.getElementById('popup-close');
  var popupImage = document.getElementById('popup-image');
  var popupTitle = document.getElementById('popup-title');
  var popupPrice = document.getElementById('popup-price');
  var popupStatus = document.getElementById('popup-status');
  var popupBuy = document.getElementById('popup-buy');

  var items = [];
  var currentPopupItem = null;

  function loadItems() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'marketplace_items.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            items = JSON.parse(xhr.responseText);
          } catch (e) {
            items = [];
          }
        }
        if (items.length === 0 && typeof FALLBACK_ITEMS !== 'undefined') {
          items = FALLBACK_ITEMS.slice();
        }
        items = items.filter(function (item) {
          return !EXCLUDED_IDS[item.id] && item.status !== 'Sold';
        });
        render();
      }
    };
    xhr.onerror = function () {
      if (typeof FALLBACK_ITEMS !== 'undefined') {
        items = FALLBACK_ITEMS.filter(function (item) {
          return !EXCLUDED_IDS[item.id] && item.status !== 'Sold';
        });
      }
      render();
    };
    xhr.send();
  }

  function getQuery() {
    return (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
  }

  function filterItems() {
    var query = getQuery();
    return items.filter(function (item) {
      return !query || (item.title && item.title.toLowerCase().indexOf(query) !== -1);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCard(item) {
    var title = escapeHtml(item.title || 'Untitled');
    var price = escapeHtml(item.price || '—');
    var imgUrl = item.imageUrl || '';
    var imgAlt = escapeHtml(item.title || 'Item image');

    return (
      '<article class="card" data-id="' + escapeHtml(String(item.id)) + '" tabindex="0" role="button">' +
        '<div class="card-image-wrap">' +
          '<img class="card-image" src="' + escapeHtml(imgUrl) + '" alt="' + imgAlt + '" loading="lazy" decoding="async">' +
          '<span class="card-badge">Available</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<h2 class="card-title">' + title + '</h2>' +
          '<p class="card-price">' + price + '</p>' +
        '</div>' +
      '</article>'
    );
  }

  function openPopup(item) {
    if (!popupOverlay || !popup) return;
    currentPopupItem = item;
    popupImage.src = item.imageUrl || '';
    popupImage.alt = item.title || 'Item';
    popupTitle.textContent = item.title || 'Untitled';
    popupPrice.textContent = item.price || '—';
    popupStatus.textContent = item.status || 'Available';
    popupOverlay.classList.remove('hidden');
    popupOverlay.setAttribute('aria-hidden', 'false');
    popupClose.focus();
  }

  function closePopup() {
    if (!popupOverlay) return;
    popupOverlay.classList.add('hidden');
    popupOverlay.setAttribute('aria-hidden', 'true');
  }

  function render() {
    var list = filterItems();
    var html = list.map(renderCard).join('');
    gridEl.innerHTML = html;

    if (countEl) {
      countEl.textContent = list.length === 1 ? '1 item' : list.length + ' items';
    }
    if (emptyEl) {
      emptyEl.classList.toggle('hidden', list.length > 0);
    }

    gridEl.querySelectorAll('.card').forEach(function (card) {
      var id = parseInt(card.getAttribute('data-id'), 10);
      var item = items.find(function (i) { return i.id === id; });
      if (!item) return;
      card.addEventListener('click', function () {
        openPopup(item);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPopup(item);
        }
      });
    });
  }

  if (popupClose) {
    popupClose.addEventListener('click', closePopup);
  }
  if (popupBuy) {
    popupBuy.addEventListener('click', function () {
      if (currentPopupItem) {
        alert('Buy: ' + (currentPopupItem.title || 'Item') + ' — ' + (currentPopupItem.price || ''));
      }
      closePopup();
    });
  }
  if (popupOverlay) {
    popupOverlay.addEventListener('click', function (e) {
      if (e.target === popupOverlay) closePopup();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popupOverlay && !popupOverlay.classList.contains('hidden')) {
      closePopup();
    }
  });

  if (searchEl) {
    searchEl.addEventListener('input', render);
    searchEl.addEventListener('keyup', function (e) {
      if (e.key === 'Escape') {
        searchEl.value = '';
        render();
      }
    });
  }

  loadItems();
})();
