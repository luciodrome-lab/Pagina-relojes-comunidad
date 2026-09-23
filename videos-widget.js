/* =====================================================================
   WIDGET FLOTANTE — Últimos videos de YouTube (The Watch Community)
   =====================================================================
   CÓMO USARLO:
   1) Completá YT_API_KEY y CHANNEL_IDS acá abajo.
   2) Pegá este archivo en tu sitio (ej: /videos-widget.js).
   3) En tu HTML, justo antes de </body>, agregá:
        <script src="videos-widget.js"></script>
   Eso es todo — el widget se inyecta solo, no necesitás tocar el HTML
   ni el CSS de tu página.
   ===================================================================== */
(function () {
  'use strict';

  // ======================= CONFIGURACIÓN =======================
  // Pegá acá tu API key de YouTube Data v3 (restringida a tu dominio).
  const YT_API_KEY = 'AIzaSyCqmr0wjvVEZ2UbPTZy4mSnMCJvIc7aHY8';

  // Lista cerrada de canales a seguir. Agregá o sacá los que quieras.
  // El ID de canal es el que empieza con "UC..." (no el @usuario).
  // Se consigue en la página del canal → "..." → "Copiar ID de canal",
  // o viendo el código fuente del canal y buscando "channelId".
  const CHANNEL_IDS = [
    'UClg9uJw6IXIstKUDo_FCXaw', // Lautaro Kadar Watches
    'UCspjTwAyewTxbrp6sRhqLjw', // In The Loupe
    'UC_uGAseuZ1gEcT_ZGrADP6A', // Ferlazzo Watches
    'UCLGp7H4XuzA9TLJ0L4PUx8w', // Teddy Baldassarre
    'UC6Z2nOo9e6oISYR7DzTp_fw', // Atrapando el Tiempo
    'UCPmCyr_HcOKgfcGCTbJ0lsA', // Dando la Hora con Alfredo
    'UCRvgMP3jFsglzztu2r2HhWA', // El Club de los Relojancios
    'UCs0RH5r_b98QfHzRsMep1Lg', // MasterCollectionsClub
  ];

  const MAX_VIDEOS = 5;         // Cuántos videos mostrar en total (3 a 5 recomendado)
  const CACHE_MINUTES = 60;     // Minutos que se guarda la lista en caché del navegador
  const SCROLL_HIDE_PX = 40;    // Píxeles de scroll hacia abajo para ocultar el widget
  // ===============================================================

  const CACHE_KEY = 'twc_widget_videos_v1';
  const PLAYLIST_CACHE_KEY = 'twc_widget_uploads_playlists_v1';

  // ------------------------- ESTILOS -------------------------
  function injectStyles() {
    const css = `
      #twc-video-widget {
        position: fixed;
        top: 50%;
        right: 18px;
        transform: translateY(-50%);
        width: 290px;
        max-width: calc(100vw - 36px);
        background: #F9F9F7;
        border: 1px solid rgba(26,26,26,0.08);
        border-radius: 4px;
        box-shadow: 0 16px 40px -12px rgba(18,18,18,0.28), 0 2px 8px rgba(18,18,18,0.06);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        z-index: 9999;
        overflow: hidden;
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
      }
      #twc-video-widget.twc-hidden-scroll {
        transform: translateY(-50%) translateX(120%);
        opacity: 0;
        pointer-events: none;
      }
      #twc-video-widget.twc-minimized .twc-widget-body {
        display: none;
      }
      #twc-widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 13px 16px;
        background: #121212;
        color: #F9F9F7;
        border-bottom: 1px solid #C9A86A;
      }
      #twc-widget-header span.twc-title {
        font-family: 'Playfair Display', serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.03em;
        display: flex;
        align-items: center;
        gap: 7px;
        color: #F9F9F7;
      }
      #twc-widget-header span.twc-title i {
        color: #C9A86A;
        font-size: 15px;
      }
      #twc-widget-header .twc-controls {
        display: flex;
        gap: 6px;
      }
      #twc-widget-header button {
        background: transparent;
        border: 1px solid rgba(249,249,247,0.25);
        color: #F9F9F7;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
      }
      #twc-widget-header button:hover {
        background: #C9A86A;
        border-color: #C9A86A;
        color: #121212;
      }
      .twc-widget-body {
        max-height: 360px;
        overflow-y: auto;
        padding: 6px;
      }
      .twc-widget-body::-webkit-scrollbar { width: 5px; }
      .twc-widget-body::-webkit-scrollbar-thumb { background: #C9A86A; border-radius: 4px; }

      .twc-video-item {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 9px 8px;
        border-radius: 2px;
        text-decoration: none;
        color: inherit;
        border-bottom: 1px solid rgba(26,26,26,0.06);
        transition: background 0.25s ease, transform 0.25s ease;
      }
      .twc-video-item:last-child { border-bottom: none; }
      .twc-video-item:hover {
        background: rgba(201,168,106,0.10);
        transform: translateX(-2px);
      }
      .twc-video-thumb {
        width: 88px;
        height: 50px;
        border-radius: 2px;
        object-fit: cover;
        flex-shrink: 0;
        background: #e5e5e5;
      }
      .twc-video-title {
        font-size: 12.5px;
        line-height: 1.4;
        font-weight: 400;
        color: #121212;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .twc-widget-loading, .twc-widget-empty {
        padding: 22px 12px;
        text-align: center;
        font-size: 12px;
        color: #4A4A4A;
      }
      #twc-widget-reopen {
        position: fixed;
        top: 50%;
        right: 18px;
        transform: translateY(-50%);
        z-index: 9999;
        width: 46px;
        height: 46px;
        border-radius: 9999px;
        background: #121212;
        color: #C9A86A;
        border: 1px solid rgba(201,168,106,0.4);
        cursor: pointer;
        box-shadow: 0 10px 24px -8px rgba(18,18,18,0.4);
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.25s ease;
      }
      #twc-widget-reopen:hover { transform: translateY(-50%) scale(1.08); background: #C9A86A; color: #121212; }
      #twc-widget-reopen.twc-visible { display: flex; }

      @media (max-width: 640px) {
        #twc-video-widget {
          top: auto;
          bottom: 16px;
          right: 12px;
          transform: none;
          width: 78vw;
          max-width: 300px;
        }
        #twc-video-widget.twc-hidden-scroll {
          transform: translateY(140%);
        }
        .twc-widget-body { max-height: 260px; }
        #twc-widget-reopen {
          top: auto;
          bottom: 16px;
          right: 12px;
          transform: none;
        }
        #twc-widget-reopen:hover { transform: scale(1.08); }
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------- MARKUP -------------------------
  function injectMarkup() {
    const widget = document.createElement('div');
    widget.id = 'twc-video-widget';
    widget.innerHTML = `
      <div id="twc-widget-header">
        <span class="twc-title"><i class="ph ph-play-circle"></i> Últimos videos</span>
        <div class="twc-controls">
          <button type="button" id="twc-btn-minimize" title="Minimizar"><i class="ph ph-minus"></i></button>
          <button type="button" id="twc-btn-close" title="Cerrar"><i class="ph ph-x"></i></button>
        </div>
      </div>
      <div class="twc-widget-body" id="twc-widget-body">
        <div class="twc-widget-loading">Cargando videos…</div>
      </div>
    `;
    document.body.appendChild(widget);

    const reopenBtn = document.createElement('button');
    reopenBtn.id = 'twc-widget-reopen';
    reopenBtn.type = 'button';
    reopenBtn.title = 'Ver videos';
    reopenBtn.innerHTML = '<i class="ph ph-play-circle"></i>';
    document.body.appendChild(reopenBtn);

    return { widget, reopenBtn };
  }

  // ------------------------- DATOS (YouTube API) -------------------------
  function getCachedVideos() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp > CACHE_MINUTES * 60 * 1000) return null;
      return data.videos;
    } catch (e) {
      return null;
    }
  }

  function setCachedVideos(videos) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), videos }));
    } catch (e) { /* localStorage lleno o bloqueado: seguimos sin cachear */ }
  }

  function getCachedPlaylistId(channelId) {
    try {
      const raw = localStorage.getItem(PLAYLIST_CACHE_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw);
      return map[channelId] || null;
    } catch (e) {
      return null;
    }
  }

  function setCachedPlaylistId(channelId, playlistId) {
    try {
      const raw = localStorage.getItem(PLAYLIST_CACHE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[channelId] = playlistId;
      localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify(map));
    } catch (e) { /* no pasa nada, se resuelve de nuevo la próxima vez */ }
  }

  // channels.list cuesta 1 unidad de cuota. El resultado (uploads playlist)
  // no cambia nunca para un canal, así que se guarda para siempre.
  async function getUploadsPlaylistId(channelId) {
    const cached = getCachedPlaylistId(channelId);
    if (cached) return cached;

    const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;
    const playlistId = data.items[0].contentDetails.relatedPlaylists.uploads;
    setCachedPlaylistId(channelId, playlistId);
    return playlistId;
  }

  // playlistItems.list cuesta 1 unidad de cuota (vs. 100 de search.list).
  async function getLatestVideosFromChannel(channelId) {
    const playlistId = await getUploadsPlaylistId(channelId);
    if (!playlistId) return [];

    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${MAX_VIDEOS}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: (item.snippet.thumbnails.medium || item.snippet.thumbnails.default).url,
      publishedAt: item.snippet.publishedAt
    }));
  }

  async function fetchLatestVideos() {
    const cached = getCachedVideos();
    if (cached) return cached;

    const results = await Promise.all(
      CHANNEL_IDS.map(id => getLatestVideosFromChannel(id).catch(() => []))
    );

    const merged = results
      .flat()
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, MAX_VIDEOS);

    setCachedVideos(merged);
    return merged;
  }

  // ------------------------- RENDER -------------------------
  function renderVideos(videos, bodyEl) {
    if (!videos || videos.length === 0) {
      bodyEl.innerHTML = '<div class="twc-widget-empty">No se encontraron videos recientes.</div>';
      return;
    }
    bodyEl.innerHTML = videos.map(v => `
      <a class="twc-video-item" href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener">
        <img class="twc-video-thumb" src="${v.thumbnail}" alt="" loading="lazy">
        <span class="twc-video-title">${escapeHtml(v.title)}</span>
      </a>
    `).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ------------------------- COMPORTAMIENTO -------------------------
  function setupControls(widget, reopenBtn) {
    const minimizeBtn = widget.querySelector('#twc-btn-minimize');
    const closeBtn = widget.querySelector('#twc-btn-close');

    minimizeBtn.addEventListener('click', () => {
      widget.classList.toggle('twc-minimized');
      const isMin = widget.classList.contains('twc-minimized');
      minimizeBtn.innerHTML = isMin ? '<i class="ph ph-plus"></i>' : '<i class="ph ph-minus"></i>';
    });

    closeBtn.addEventListener('click', () => {
      widget.style.display = 'none';
      reopenBtn.classList.add('twc-visible');
    });

    reopenBtn.addEventListener('click', () => {
      widget.style.display = '';
      reopenBtn.classList.remove('twc-visible');
    });
  }

  function setupScrollHide(widget) {
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const scrolledEnough = Math.abs(currentScrollY - lastScrollY) > 4;

      if (scrolledEnough) {
        if (scrollingDown && currentScrollY > SCROLL_HIDE_PX) {
          widget.classList.add('twc-hidden-scroll');
        } else if (!scrollingDown) {
          widget.classList.remove('twc-hidden-scroll');
        }
        lastScrollY = currentScrollY;
      }
    }, { passive: true });
  }

  // ------------------------- INIT -------------------------
  async function init() {
    if (!YT_API_KEY || YT_API_KEY === 'TU_API_KEY_AQUI') {
      console.warn('[Widget videos] Falta configurar YT_API_KEY en videos-widget.js');
      return;
    }
    if (!CHANNEL_IDS.length || CHANNEL_IDS.some(id => id.includes('xxxxxxxx'))) {
      console.warn('[Widget videos] Falta configurar CHANNEL_IDS en videos-widget.js');
      return;
    }

    injectStyles();
    const { widget, reopenBtn } = injectMarkup();
    setupControls(widget, reopenBtn);
    setupScrollHide(widget);

    const bodyEl = widget.querySelector('#twc-widget-body');
    try {
      const videos = await fetchLatestVideos();
      renderVideos(videos, bodyEl);
    } catch (e) {
      bodyEl.innerHTML = '<div class="twc-widget-empty">No se pudieron cargar los videos.</div>';
      console.error('[Widget videos] Error al cargar videos:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
