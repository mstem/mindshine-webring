/* Web Ring Widget — embed with: <script src="https://your-ring.example.com/widget.js"></script> */
(function () {
  const script = document.currentScript;
  if (!script) return; // must not be deferred/async

  const RING_URL = new URL(script.src).origin;
  const FROM = encodeURIComponent(window.location.origin);

  // Allow embedding into a specific container: <div id="webring-widget"></div>
  // Falls back to a fixed footer bar.
  const TARGET_ID = 'webring-widget';

  const CSS = `
    #webring-widget {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.72rem;
      letter-spacing: 0.01em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      padding: 0.45rem 1rem;
      background: rgba(10, 10, 20, 0.88);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border-top: 1px solid rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.55);
    }
    #webring-widget.wring-fixed {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
    }
    #webring-widget a {
      color: #818cf8;
      text-decoration: none;
      transition: color 0.15s;
    }
    #webring-widget a:hover { color: #fff; }
    #webring-widget .wring-name { color: rgba(255,255,255,0.75); }
    #webring-widget .wring-sep { opacity: 0.25; user-select: none; }
    #webring-widget .wring-join { opacity: 0.6; }
    #webring-widget .wring-join:hover { opacity: 1; }
  `;

  function inject(ring) {
    // Add stylesheet
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Determine mount point
    let el = document.getElementById(TARGET_ID);
    const fixed = !el;
    if (!el) {
      el = document.createElement('div');
      el.id = TARGET_ID;
      document.body.appendChild(el);
    }
    if (fixed) el.classList.add('wring-fixed');

    const joinLink = ring.join?.enabled
      ? `<span class="wring-sep">·</span>
         <a class="wring-join" href="${RING_URL}/join">+ ${ring.join.label || 'Add your project'}</a>`
      : '';

    el.innerHTML =
      `<a href="${RING_URL}/prev?from=${FROM}" title="Previous site">←</a>` +
      `<span class="wring-sep">|</span>` +
      `<a class="wring-name" href="${RING_URL}" title="Browse the ring">${ring.name}</a>` +
      `<span class="wring-sep">|</span>` +
      `<a href="${RING_URL}/next?from=${FROM}" title="Next site">→</a>` +
      `<span class="wring-sep">·</span>` +
      `<a href="${RING_URL}/random?from=${FROM}" title="Random site">?</a>` +
      joinLink;
  }

  fetch(`${RING_URL}/api/ring`)
    .then(r => r.json())
    .then(inject)
    .catch(() => {
      // Fail silently — don't break member sites
    });
})();
