(() => {
  'use strict';

  function svgSearch() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.2 15.2L20 20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
  }

  function svgLegend() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="7" cy="7" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="17" cy="17" r="1.4" fill="currentColor"/></svg>';
  }

  function svgInfo() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 10.5v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg>';
  }

  function closeFlyouts(except) {
    if (except !== 'search') document.body.classList.remove('concept-search-open');
    if (except !== 'legend') document.body.classList.remove('concept-legend-open');
    syncButtons();
  }

  function syncButtons() {
    const rail = document.getElementById('desktopUtilityRail');
    if (!rail) return;
    rail.querySelector('[data-concept="search"]')?.setAttribute('aria-pressed', String(document.body.classList.contains('concept-search-open')));
    rail.querySelector('[data-concept="legend"]')?.setAttribute('aria-pressed', String(document.body.classList.contains('concept-legend-open')));
  }

  function createUtilityRail() {
    if (document.getElementById('desktopUtilityRail')) return;
    const rail = document.createElement('nav');
    rail.id = 'desktopUtilityRail';
    rail.setAttribute('aria-label', 'Utilitas peta');
    rail.innerHTML = `
      <button type="button" data-concept="search" data-tooltip="Cari Lokasi" aria-label="Cari lokasi" aria-pressed="false" title="Cari Lokasi">${svgSearch()}</button>
      <button type="button" data-concept="legend" data-tooltip="Legenda" aria-label="Buka legenda" aria-pressed="false" title="Legenda">${svgLegend()}</button>
      <button type="button" data-concept="info" data-tooltip="Informasi & Catatan" aria-label="Informasi dan catatan" title="Informasi & Catatan">${svgInfo()}</button>
    `;
    document.body.appendChild(rail);

    rail.querySelector('[data-concept="search"]')?.addEventListener('click', () => {
      const willOpen = !document.body.classList.contains('concept-search-open');
      closeFlyouts('search');
      document.body.classList.toggle('concept-search-open', willOpen);
      if (willOpen) setTimeout(() => document.getElementById('globalSearchInput')?.focus(), 30);
      syncButtons();
    });

    rail.querySelector('[data-concept="legend"]')?.addEventListener('click', () => {
      const willOpen = !document.body.classList.contains('concept-legend-open');
      closeFlyouts('legend');
      document.body.classList.toggle('concept-legend-open', willOpen);
      syncButtons();
    });

    rail.querySelector('[data-concept="info"]')?.addEventListener('click', () => {
      closeFlyouts();
      document.getElementById('rightInfoAboutButton')?.click();
    });
  }

  let lastObservedRouteValue = null;

  function updateRouteState() {
    const routeSelect = document.getElementById('routeSelect');
    const routeValue = routeSelect ? String(routeSelect.value || 'ALL') : 'ALL';
    const selected = routeValue !== 'ALL';
    const changed = routeValue !== lastObservedRouteValue;

    document.body.classList.toggle('concept-route-selected', selected);

    if (changed && selected && window.innerWidth >= 1600) {
      document.querySelectorAll('details.legend-collapsible-section').forEach((details) => {
        details.open = false;
      });
    }

    /*
      map.js melakukan fit saat rute dipilih. Layout adaptif kemudian
      mengubah tinggi/lebar workspace beberapa frame setelahnya.
      Jalankan fit kedua yang ringan setelah layout stabil agar trase
      benar-benar pas pada area peta yang tersisa.
    */
    if (changed && selected) {
      window.setTimeout(() => {
        if (typeof window.fitRouteToScreen === 'function') {
          window.fitRouteToScreen({ animate: false });
        }
      }, 240);
    }

    lastObservedRouteValue = routeValue;
    return selected;
  }

  function updateViewportState() {
    const medium = window.innerWidth >= 761 && window.innerWidth < 1600;
    if (!medium) closeFlyouts();
  }

  document.addEventListener('DOMContentLoaded', () => {
    createUtilityRail();
    updateRouteState();
    updateViewportState();

    document.getElementById('routeSelect')?.addEventListener('change', () => {
      updateRouteState();
      closeFlyouts();
    });

    document.addEventListener('click', (event) => {
      if (window.innerWidth < 761 || window.innerWidth >= 1600) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('#desktopUtilityRail, #globalSearchPanel, #rightInfoPanel')) return;
      closeFlyouts();
    });

    window.addEventListener('resize', () => {
      updateViewportState();
      updateRouteState();
    });

    // map.js also changes routeSelect programmatically (search, badges, URL state).
    // Keep the layout state in sync without modifying the network logic.
    window.setInterval(() => {
      const routeSelect = document.getElementById('routeSelect');
      const value = routeSelect ? String(routeSelect.value || 'ALL') : 'ALL';
      if (value !== lastObservedRouteValue) {
        updateRouteState();
      }
    }, 250);
  });
})();
