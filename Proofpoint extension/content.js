// Proof - Content Script
// Injects sidebar overlay into Facebook pages

(function () {
  'use strict';

  // Prevent double injection
  if (window.__proofpointInjected) return;
  window.__proofpointInjected = true;

  // ─── Constants ───────────────────────────────────────────────────────────────

  const COLORS = {
    fake: {
      border: '#EF4444',
      bg: '#FFFFFF',
      text: '#374151',
      keyword: '#EF4444',
      pillBg: '#EF4444',
      pillText: '#FFFFFF',
      gauge: '#EF4444',
      ghost: 'red',
      barColors: ['#EF4444', '#EF4444', '#F7A1A1', '#E5E7EB'],
      blurbBg: '#FDECEC',
      blurbHeaderColor: '#EF4444'
    },
    ai: {
      border: '#E0B000',
      bg: '#FFFFFF',
      text: '#374151',
      keyword: '#E0B000',
      pillBg: '#E0B000',
      pillText: '#FFFFFF',
      gauge: '#FBCB19',
      ghost: 'yellow',
      barColors: ['#E0B000', '#E0B000', '#FCD853', '#E5E7EB'],
      blurbBg: '#FEF9E8',
      blurbHeaderColor: '#B8860B'
    },
    factual: {
      border: '#1C9448',
      bg: '#FFFFFF',
      text: '#374151',
      keyword: '#25C560',
      pillBg: '#1C9448',
      pillText: '#FFFFFF',
      gauge: '#25C560',
      ghost: 'green',
      barColors: ['#25C560', '#25C560', '#25C560', '#E5E7EB'],
      blurbBg: '#E9F9EF',
      blurbHeaderColor: '#1C9448'
    },
    human_art: {
      border: '#49D0E7',
      bg: '#FFFFFF',
      text: '#374151',
      keyword: '#49D0E7',
      pillBg: '#49D0E7',
      pillText: '#FFFFFF',
      gauge: '#49D0E7',
      ghost: 'turquoise',
      barColors: ['#49D0E7', '#49D0E7', '#49D0E7', '#49D0E7'],
      blurbBg: '#E6F8FB',
      blurbHeaderColor: '#0E7490'
    }
  };

  const TITLES = {
    fake: { before: 'THIS POST COULD', keyword: 'NOT', after: 'BE VERIFIED' },
    ai: { before: 'THIS POST CONTAINS SOME', keyword: 'DECEPTIVE', after: 'CONTENT.' },
    factual: { before: 'THIS CONTENT IS VERIFIED AS', keyword: 'FACTUAL', after: '' },
    human_art: { before: 'THIS POST IS PURELY', keyword: 'HUMAN', after: '' }
  };

  // ─── Load Google Fonts ────────────────────────────────────────────────────────

  function loadFonts() {
    if (!document.getElementById('pp-fonts')) {
      const link = document.createElement('link');
      link.id = 'pp-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap';
      document.head.appendChild(link);
    }
  }

  // ─── Inline Styles ────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('pp-styles')) return;

    const style = document.createElement('style');
    style.id = 'pp-styles';
    style.textContent = `
      #pp-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        width: 320px;
        height: 100vh;
        background: #ffffff;
        box-shadow: -4px 0 24px rgba(0,0,0,0.12);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        overflow: hidden;
        border-left: 2px solid #e5e7eb;
      }

      #pp-sidebar.pp-open {
        transform: translateX(0);
      }

      #pp-sidebar * {
        box-sizing: border-box;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      #pp-sidebar-inner {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 0 0 0;
        scrollbar-width: thin;
        scrollbar-color: #e5e7eb transparent;
      }

      #pp-sidebar-inner::-webkit-scrollbar {
        width: 4px;
      }

      #pp-sidebar-inner::-webkit-scrollbar-track {
        background: transparent;
      }

      #pp-sidebar-inner::-webkit-scrollbar-thumb {
        background: #e5e7eb;
        border-radius: 2px;
      }

      .pp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px 8px;
        background: #ffffff;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .pp-header-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 700;
        color: #8c52ff;
        letter-spacing: -0.3px;
      }

      .pp-close-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: background 0.2s ease, color 0.2s ease;
        padding: 0;
        flex-shrink: 0;
      }

      .pp-close-btn:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .pp-content {
        padding: 16px 16px 0;
      }

      .pp-result-flow {
        padding: 0 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* ─── Gauge ─── */
      .pp-gauge-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin: 16px 0 8px;
        position: relative;
      }

      .pp-gauge-svg {
        overflow: visible;
        display: block;
      }

      .pp-gauge-label {
        font-size: 40px;
        font-weight: 800;
        margin-top: -65px;
        margin-bottom: 12px;
        color: #111827;
        line-height: 1;
        position: relative;
        z-index: 1;
      }

      /* ─── Top color bar (full sidebar width) ─── */
      .pp-topbar {
        height: 6px;
        width: 100%;
        flex-shrink: 0;
        transition: background 0.3s ease;
      }

      .pp-card-title {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.2px;
        color: #374151;
        margin-bottom: 14px;
        line-height: 1.35;
        text-align: center;
        padding: 0 8px;
      }

      .pp-card-keyword {
        font-weight: 800;
      }

      /* ─── Segmented Progress Bar ─── */
      .pp-progress-bar {
        display: flex;
        gap: 4px;
        margin-bottom: 14px;
        padding: 0 4px;
      }

      .pp-progress-segment {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        transition: background 0.4s ease;
      }

      /* ─── Source Pills ─── */
      .pp-sources {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 14px;
      }

      .pp-source-pill {
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        border: 1.5px solid;
        text-decoration: none;
        transition: opacity 0.15s ease;
      }

      .pp-source-pill:hover {
        opacity: 0.8;
      }

      /* ─── Blurb Box ─── */
      .pp-blurb-box {
        border-radius: 12px;
        padding: 14px;
        background: transparent;
        border: 1.5px solid #e5e7eb;
      }

      .pp-blurb-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }

      .pp-blurb-header-text {
        font-size: 13px;
        font-weight: 700;
        color: #374151;
      }

      .pp-rationale {
        font-size: 12.5px;
        color: #4b5563;
        line-height: 1.55;
        margin-bottom: 10px;
      }

      .pp-claims {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .pp-claim {
        display: flex;
        gap: 7px;
        align-items: flex-start;
        font-size: 12px;
        line-height: 1.45;
      }

      .pp-claim-icon {
        flex-shrink: 0;
        margin-top: 1px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 700;
      }

      .pp-claim-icon.wrong {
        background: #FEE2E2;
        color: #DC2626;
      }

      .pp-claim-icon.misleading {
        background: #FEF3C7;
        color: #D97706;
      }

      .pp-claim-icon.true {
        background: #D1FAE5;
        color: #059669;
      }

      .pp-claim-body {
        color: #4b5563;
      }

      .pp-claim-label {
        font-weight: 600;
        color: #374151;
      }

      /* ─── Human Art Star ─── */
      .pp-star-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin: 12px 0;
      }

      .pp-star-msg {
        font-size: 12.5px;
        color: #0E7490;
        text-align: center;
        line-height: 1.5;
        font-weight: 500;
        font-style: italic;
      }

      /* ─── Scan Button ─── */
      .pp-scan-btn {
        display: block;
        width: calc(100% - 40px);
        margin: 16px 20px 16px;
        padding: 12px;
        background: #8c52ff;
        color: #ffffff;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
        letter-spacing: 0.2px;
        box-shadow: 0 2px 8px rgba(140, 82, 255, 0.3);
      }

      .pp-scan-btn:hover {
        background: #7c3aed;
        box-shadow: 0 4px 14px rgba(140, 82, 255, 0.45);
      }

      .pp-scan-btn:active {
        transform: scale(0.98);
      }

      .pp-scan-btn:disabled {
        background: #c4b5fd;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }

      /* ─── API Key Form ─── */
      .pp-apikey-form {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .pp-apikey-title {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .pp-apikey-desc {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.5;
      }

      .pp-apikey-input {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #e5e7eb;
        border-radius: 8px;
        font-size: 13px;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        outline: none;
        color: #374151;
        transition: border-color 0.2s ease;
      }

      .pp-apikey-input:focus {
        border-color: #8c52ff;
      }

      .pp-apikey-save-btn {
        padding: 10px;
        background: #8c52ff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        transition: background 0.2s ease;
      }

      .pp-apikey-save-btn:hover {
        background: #7c3aed;
      }

      /* ─── Empty/Error States ─── */
      .pp-state-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 20px;
        gap: 12px;
        text-align: center;
      }

      .pp-state-title {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .pp-state-msg {
        font-size: 12.5px;
        color: #6b7280;
        line-height: 1.55;
      }

      /* ─── Loading ─── */
      @keyframes pp-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(0.95); }
      }

      @keyframes pp-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .pp-loading-ghost {
        animation: pp-pulse 1.4s ease-in-out infinite;
      }

      .pp-loading-dots span {
        display: inline-block;
        animation: pp-pulse 1.2s ease-in-out infinite;
      }

      .pp-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
      .pp-loading-dots span:nth-child(3) { animation-delay: 0.4s; }

      /* ─── Toggle Button ─── */
      #pp-toggle {
        position: fixed;
        bottom: 80px;
        right: 12px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #8c52ff;
        border: none;
        cursor: pointer;
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(140, 82, 255, 0.4);
        transition: transform 0.2s ease, box-shadow 0.2s ease, right 0.3s ease;
      }

      #pp-toggle:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 20px rgba(140, 82, 255, 0.55);
      }

      #pp-toggle.pp-sidebar-active {
        right: 332px;
      }

      .pp-no-post-msg {
        font-size: 12px;
        color: #9ca3af;
        text-align: center;
        padding: 0 16px 10px;
        font-style: italic;
      }

      .pp-divider {
        height: 1px;
        background: #f3f4f6;
        margin: 10px 0;
      }

      /* ─── Image Analysis Section ─── */
      .pp-img-analysis {
        margin: 10px 14px 4px;
        border: 1.5px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
      }

      .pp-img-analysis-header {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 8px 12px;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #6b7280;
      }

      .pp-img-verdict {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px 7px;
      }

      .pp-img-verdict-label {
        font-size: 12px;
        font-weight: 600;
        color: #374151;
      }

      .pp-img-badge {
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 20px;
        letter-spacing: 0.3px;
      }

      .pp-img-badge.ai { background: #FEF3C7; color: #92400E; }
      .pp-img-badge.real { background: #D1FAE5; color: #065F46; }
      .pp-img-badge.unknown { background: #F3F4F6; color: #6B7280; }

      .pp-img-confidence {
        padding: 0 12px 8px;
        font-size: 11px;
        color: #9ca3af;
      }

      .pp-img-indicators {
        padding: 0 12px 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .pp-img-indicator {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        font-size: 11.5px;
        color: #4b5563;
        line-height: 1.4;
      }

      .pp-img-indicator-dot {
        flex-shrink: 0;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #E0B000;
        margin-top: 5px;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── SVG Icons ────────────────────────────────────────────────────────────────

  function ghostSVG(color = '#8c52ff', size = 40) {
    const colors = {
      red: { body: '#EF4444', bg: '#FDECEC', dot: '#B91C1C' },
      yellow: { body: '#F59E0B', bg: '#FEF9E8', dot: '#92400E' },
      green: { body: '#22C55E', bg: '#E9F9EF', dot: '#15803D' },
      turquoise: { body: '#22D3EE', bg: '#E6F8FB', dot: '#0E7490' },
      purple: { body: '#8c52ff', bg: '#F3EEFF', dot: '#6D28D9' }
    };

    const c = typeof color === 'string' && colors[color] ? colors[color] : { body: color, bg: 'transparent', dot: '#fff' };

    return `<svg width="${size}" height="${size}" viewBox="270 130 490 490" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Ghost body outline -->
      <path d="M644.86,410.55c10.67,0,20.69,2.92,29.42,8.02.7.41,1.61.1,1.89-.66,7.58-20.69,11.8-43.01,11.95-66.3.71-109.29-90.01-199.31-199.29-197.78-107.24,1.49-193.71,88.89-193.71,196.48,0,24.04,4.32,47.08,12.22,68.37,9.08,24.48-29.67,91.41-12.22,110.17,17.45,18.76,91.09-10.65,114.67.16,24.91,11.43,52.63,17.8,81.84,17.8,38.38,0,74.19-11.01,104.44-30.03.64-.4.79-1.26.35-1.87-7.94-10.94-12.66-24.64-12.66-39.51,0-35.82,27.36-64.85,61.11-64.85Z"
            fill="none" stroke="${c.body}" stroke-width="36" stroke-miterlimit="10"/>
      <!-- Speech bubble C-curve -->
      <path d="M584.14,466.28c-2.21,11.43-1.14,23.45,3.8,34.69,13.57,30.9,51.16,44.28,83.95,29.88,13.18-5.79,23.57-15.18,30.41-26.35"
            fill="none" stroke="${c.body}" stroke-width="36" stroke-linecap="round" stroke-miterlimit="10"/>
      <!-- Right eye -->
      <path d="M594.85,422.34h0c-6.06,0-11.66-2.05-16.15-5.5-6.34-4.87-10.44-12.53-10.44-21.09v-36.36c0-14.63,11.97-26.59,26.59-26.59h0c14.63,0,26.59,11.97,26.59,26.59v36.36c0,14.63-11.97,26.59-26.59,26.59Z"
            fill="${c.body}"/>
      <!-- Left eye -->
      <rect x="455.28" y="337.66" width="53.18" height="89.54" rx="21.16" ry="21.16" fill="${c.body}"/>
      <!-- Trailing dot -->
      <circle cx="713.92" cy="454.01" r="19.54" fill="${c.body}"/>
      <!-- Arrow indicator -->
      <path d="M709.6,581.73c-4.71,0-9.37-2.07-12.53-6.03l-24.93-31.31c-5.5-6.91-4.36-16.98,2.55-22.48,6.91-5.51,16.98-4.36,22.48,2.55l24.93,31.31c5.5,6.91,4.36,16.98-2.55,22.48-2.95,2.35-6.46,3.48-9.96,3.48Z"
            fill="${c.body}"/>
    </svg>`;
  }

  function starSVG(color = '#49D0E7', size = 48) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L28.8 16.8L42 18.3L32.4 27.2L35.4 40L24 33.3L12.6 40L15.6 27.2L6 18.3L19.2 16.8L24 4Z" fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
  }

  function closeSVG() {
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  function logoSVG(size = 20) {
    return ghostSVG('purple', size);
  }

  // ─── Half-Circle Gauge ─────────────────────────────────────────────────────

  function buildGauge(score, color) {
    // Thick donut gauge — 180° upper semicircle (speedometer style)
    // stroke-width = 34, radius = 68 (midpoint of 51–85 band)
    const R = 75;
    const strokeW = 37;
    const size = 220;
    const cx = size / 2, cy = size / 2;

    const circumference = 2 * Math.PI * R;
    const arcFraction = 180 / 360; // 180° half-circle
    const arcLen = circumference * arcFraction;
    const gapLen = circumference - arcLen;

    // Fill = score% of the 180° arc
    const fillLen = (score / 100) * arcLen;
    const fillGap = circumference - fillLen;

    // rotation = 180 → stroke starts at 9 o'clock (left), sweeps clockwise
    // through 12 o'clock (top) to 3 o'clock (right) = upper semicircle ∩
    const rotation = 180;

    // Show only the upper half: clip viewBox at cy + strokeW/2 + 6 padding
    const viewH = cy + strokeW / 2 + 6; // 110 + 18 + 6 = 135 (approx)

    return `<svg class="pp-gauge-svg" width="${size}" height="${viewH}" viewBox="0 0 ${size} ${viewH}">
      <!-- Grey background arc (180°) -->
      <circle cx="${cx}" cy="${cy}" r="${R}"
        fill="none" stroke="#E3E3E3" stroke-width="${strokeW}"
        stroke-dasharray="${arcLen.toFixed(2)} ${gapLen.toFixed(2)}"
        stroke-linecap="round"
        transform="rotate(${rotation} ${cx} ${cy})"
      />
      <!-- Colored fill arc -->
      ${score > 0 ? `<circle cx="${cx}" cy="${cy}" r="${R}"
        fill="none" stroke="${color}" stroke-width="${strokeW}"
        stroke-dasharray="${fillLen.toFixed(2)} ${fillGap.toFixed(2)}"
        stroke-linecap="round"
        transform="rotate(${rotation} ${cx} ${cy})"
      />` : ''}
    </svg>`;
  }

  // ─── Sidebar HTML Builder ─────────────────────────────────────────────────

  function buildIdleContent() {
    return `
      <div class="pp-state-wrap">
        ${ghostSVG('purple', 56)}
        <div class="pp-state-title">Ready to fact-check</div>
        <div class="pp-state-msg">Click "Scan Post" to analyze the most visible post in your feed.</div>
      </div>
    `;
  }

  function buildLoadingContent() {
    return `
      <div class="pp-state-wrap">
        <div class="pp-loading-ghost">${ghostSVG('purple', 56)}</div>
        <div class="pp-state-title">Analyzing post<span class="pp-loading-dots"><span>.</span><span>.</span><span>.</span></span></div>
        <div class="pp-state-msg">Checking sources and verifying claims.</div>
      </div>
    `;
  }

  function buildErrorContent(message, type) {
    const isApiKey = type === 'no_api_key' || type === 'invalid_api_key';

    if (isApiKey) {
      return buildApiKeyPrompt();
    }

    return `
      <div class="pp-state-wrap">
        <div style="opacity:0.7">${ghostSVG('red', 48)}</div>
        <div class="pp-state-title" style="color:#DC2626">Analysis Failed</div>
        <div class="pp-state-msg">${message}</div>
      </div>
    `;
  }

  function buildApiKeyPrompt() {
    return `
      <div class="pp-apikey-form">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          ${ghostSVG('purple', 32)}
          <div class="pp-apikey-title">Connect your API key</div>
        </div>
        <div class="pp-apikey-desc">
          Proof uses the Anthropic Claude API to fact-check posts. Enter your API key to get started.
        </div>
        <input
          class="pp-apikey-input"
          id="pp-apikey-input"
          type="password"
          placeholder="sk-ant-..."
          autocomplete="off"
          spellcheck="false"
        />
        <button class="pp-apikey-save-btn" id="pp-apikey-save">Save API Key</button>
        <div style="font-size:11px;color:#9ca3af;text-align:center;">
          Get your key at <span style="color:#8c52ff;">console.anthropic.com</span>
        </div>
      </div>
    `;
  }

  function buildResultContent(result) {
    const type = result.type || 'factual';
    const c = COLORS[type] || COLORS.factual;
    const score = result.score || 0;
    const titleData = TITLES[type] || TITLES.factual;
    const isHumanArt = type === 'human_art';

    // Build title with colored keyword
    const titleHTML = `${titleData.before} <span class="pp-card-keyword" style="color:${c.keyword};">${titleData.keyword}</span>${titleData.after ? ' ' + titleData.after : ''}`;

    // Gauge section
    const gaugeSection = isHumanArt
      ? `<div class="pp-star-wrap">
          ${starSVG(c.border, 64)}
        </div>`
      : `<div class="pp-gauge-wrap">
          ${buildGauge(score, c.gauge)}
          <div class="pp-gauge-label" style="color:${c.gauge}">${score}%</div>
        </div>`;

    // Segmented progress bar (4 segments)
    const barSegments = c.barColors.map(color =>
      `<div class="pp-progress-segment" style="background:${color};"></div>`
    ).join('');

    // Source pills
    const sourcePills = result.sources && result.sources.length > 0
      ? `<div class="pp-sources">
          ${result.sources.map(s =>
            `<a class="pp-source-pill" href="https://www.google.com/search?q=${encodeURIComponent(s)}" target="_blank" rel="noopener noreferrer" style="background:${c.pillBg};color:${c.pillText};border-color:${c.pillBg};">${s}</a>`
          ).join('')}
        </div>`
      : '';

    // Claims list
    const claimsHTML = result.claims && result.claims.length > 0
      ? result.claims.map(claim => {
          const iconMap = { wrong: '✕', misleading: '!', true: '✓' };
          const icon = iconMap[claim.verdict] || '•';
          return `<div class="pp-claim">
            <div class="pp-claim-icon ${claim.verdict || 'true'}">${icon}</div>
            <div class="pp-claim-body">
              <span class="pp-claim-label">${claim.label || 'Claim'}:</span> ${claim.explanation || ''}
            </div>
          </div>`;
        }).join('')
      : '';

    // Human art special message
    const humanArtMsg = isHumanArt
      ? `<div class="pp-star-msg">Someone took the time to make this, show them some <span style="color:${c.keyword};">love</span>.</div>`
      : '';

    // Blurb content differs for human_art
    const blurbContent = isHumanArt
      ? `<div class="pp-blurb-header">
            ${ghostSVG(c.ghost, 28)}
            <span class="pp-blurb-header-text" style="color:${c.blurbHeaderColor};">This is great!</span>
          </div>`
      : `<div class="pp-blurb-header">
            ${ghostSVG(c.ghost, 28)}
            <span class="pp-blurb-header-text" style="color:${c.blurbHeaderColor};">Here's what I found:</span>
          </div>
          <div class="pp-rationale">${result.rationale || ''}</div>
          ${claimsHTML ? `<div class="pp-divider"></div><div class="pp-claims">${claimsHTML}</div>` : ''}`;

    // Image analysis section
    const imgAnalysis = result.image_analysis;
    let imageAnalysisHTML = '';
    if (imgAnalysis && imgAnalysis.has_image) {
      const isAI = imgAnalysis.is_ai_generated;
      const badgeClass = isAI === true ? 'ai' : isAI === false ? 'real' : 'unknown';
      const badgeLabel = isAI === true ? 'AI GENERATED' : isAI === false ? 'APPEARS REAL' : 'UNKNOWN';
      const confidenceText = imgAnalysis.confidence
        ? `Detection confidence: ${imgAnalysis.confidence.charAt(0).toUpperCase() + imgAnalysis.confidence.slice(1)}`
        : '';
      const indicatorsHTML = imgAnalysis.indicators && imgAnalysis.indicators.length > 0
        ? `<div class="pp-img-indicators">
            ${imgAnalysis.indicators.map(ind =>
              `<div class="pp-img-indicator">
                <div class="pp-img-indicator-dot"></div>
                <span>${ind}</span>
              </div>`
            ).join('')}
          </div>`
        : '';

      imageAnalysisHTML = `
        <div class="pp-img-analysis">
          <div class="pp-img-analysis-header">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Image Analysis
          </div>
          <div class="pp-img-verdict">
            <span class="pp-img-verdict-label">AI Generation</span>
            <span class="pp-img-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          ${confidenceText ? `<div class="pp-img-confidence">${confidenceText}</div>` : ''}
          ${indicatorsHTML}
        </div>`;
    }

    return `
      <div class="pp-topbar" style="background:${c.border};"></div>
      <div class="pp-result-flow" data-accent="${c.border}">
        ${gaugeSection}
        <div class="pp-card-title">${titleHTML}</div>
        <div class="pp-progress-bar">${barSegments}</div>
        ${sourcePills}
        ${humanArtMsg}
        <div class="pp-blurb-box" style="border-color:${c.border};background:${c.blurbBg};">
          ${blurbContent}
        </div>
        ${imageAnalysisHTML}
      </div>
    `;
  }

  function buildNoPostContent() {
    return `
      <div class="pp-state-wrap">
        <div style="opacity:0.6">${ghostSVG('purple', 48)}</div>
        <div class="pp-state-title">No post detected</div>
        <div class="pp-state-msg">Scroll to a post in your feed, then click Scan Post.</div>
      </div>
    `;
  }

  // ─── Sidebar Creation ─────────────────────────────────────────────────────

  function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'pp-sidebar';
    sidebar.innerHTML = `
      <div class="pp-header">
        <div class="pp-header-brand">
          ${logoSVG(22)}
          Proof
        </div>
        <button class="pp-close-btn" id="pp-close" title="Close sidebar">
          ${closeSVG()}
        </button>
      </div>
      <div id="pp-sidebar-inner">
        <div id="pp-result-area">
          ${buildIdleContent()}
        </div>
      </div>
      <button class="pp-scan-btn" id="pp-scan-btn">Scan Post</button>
    `;
    document.body.appendChild(sidebar);

    // Bind close button
    sidebar.querySelector('#pp-close').addEventListener('click', closeSidebar);

    // Bind scan button
    sidebar.querySelector('#pp-scan-btn').addEventListener('click', handleScan);

    // Delegate for API key save
    sidebar.addEventListener('click', (e) => {
      if (e.target.id === 'pp-apikey-save') {
        handleSaveApiKey();
      }
    });

    return sidebar;
  }

  function createToggleButton() {
    const btn = document.createElement('button');
    btn.id = 'pp-toggle';
    btn.title = 'Toggle Proof';
    btn.innerHTML = logoSVG(26);
    btn.addEventListener('click', toggleSidebar);
    document.body.appendChild(btn);
    return btn;
  }

  // ─── Sidebar State ─────────────────────────────────────────────────────────

  let sidebarEl = null;
  let toggleEl = null;
  let isOpen = false;

  function openSidebar() {
    if (!sidebarEl) return;
    isOpen = true;
    sidebarEl.classList.add('pp-open');
    toggleEl && toggleEl.classList.add('pp-sidebar-active');
  }

  function closeSidebar() {
    isOpen = false;
    sidebarEl && sidebarEl.classList.remove('pp-open');
    toggleEl && toggleEl.classList.remove('pp-sidebar-active');
  }

  function toggleSidebar() {
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function setResultArea(html) {
    const area = document.getElementById('pp-result-area');
    if (area) {
      area.innerHTML = html;
      // Apply accent border to sidebar when result is shown
      const sidebar = document.getElementById('pp-sidebar');
      const flow = area.querySelector('.pp-result-flow');
      if (sidebar && flow) {
        const accent = flow.dataset.accent;
        sidebar.style.borderLeftColor = accent;
      } else if (sidebar) {
        sidebar.style.borderLeftColor = '#e5e7eb';
      }
    }
  }

  function setScanBtnDisabled(disabled) {
    const btn = document.getElementById('pp-scan-btn');
    if (btn) {
      btn.disabled = disabled;
      btn.textContent = disabled ? 'Scanning...' : 'Scan Post';
    }
  }

  // ─── Post Extraction ──────────────────────────────────────────────────────

  const isInstagram = window.location.hostname.includes('instagram.com');

  function getMostVisiblePost() {
    let candidates = [];

    // ── Instagram ──────────────────────────────────────────────────────────
    if (isInstagram) {
      candidates = Array.from(document.querySelectorAll('article'));
      if (candidates.length === 0) return null;
      const viewportH = window.innerHeight;
      let best = null, bestScore = -1;
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.height < 100 || rect.width < 200) continue;
        const visibleH = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0));
        const score = visibleH / rect.height;
        if (score > bestScore) { bestScore = score; best = el; }
      }
      return best;
    }

    // ── Facebook ───────────────────────────────────────────────────────────
    // Step 1: Find top-level feed post containers (NOT comments)
    // Facebook wraps each feed post in a [data-pagelet*="FeedUnit"] container
    // Inside each post, comments are also div[role="article"], so we must
    // only pick the OUTERMOST article or feed unit.

    // Primary: feed unit pagelets (most reliable, each is one post)
    // Extract the inner div[role="article"] from each FeedUnit — if we returned
    // the FeedUnit itself, extractPostContent would remove ALL nested articles
    // (including the main post) when stripping comments.
    const feedUnits = document.querySelectorAll('[data-pagelet*="FeedUnit"]');
    if (feedUnits.length > 0) {
      for (const unit of feedUnits) {
        const article = unit.querySelector('div[role="article"]');
        candidates.push(article || unit);
      }
    } else {
      // Fallback: top-level articles that are NOT nested inside another article
      const allArticles = document.querySelectorAll('div[role="article"]');
      for (const art of allArticles) {
        // Only pick if this article is NOT inside another article (i.e., it's a post, not a comment)
        const parentArticle = art.parentElement?.closest('div[role="article"]');
        if (!parentArticle) {
          candidates.push(art);
        }
      }
    }

    // Also try legacy selectors
    if (candidates.length === 0) {
      const legacy = document.querySelectorAll('[data-testid="fbfeed_story"], [data-testid="Keystone_Feed_Story"]');
      candidates = Array.from(legacy);
    }

    candidates = [...new Set(candidates)];
    if (candidates.length === 0) return null;

    // Find the post with most viewport overlap
    const viewportH = window.innerHeight;
    let bestEl = null;
    let bestScore = -1;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.height < 100 || rect.width < 200) continue; // Skip tiny elements

      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, viewportH);
      const visibleH = Math.max(0, visibleBottom - visibleTop);
      const score = visibleH / rect.height;

      if (score > bestScore) {
        bestScore = score;
        bestEl = el;
      }
    }

    return bestEl;
  }

  function extractPostContent(el) {
    if (isInstagram) return extractInstagramContent(el);
    const content = { text: '', author: '', imageAlt: '', linkTitle: '', imageUrls: [], imageData: [], timestamp: '' };

    // ── Author ──
    for (const sel of ['h3 a[role="link"]', 'h4 a[role="link"]', 'h3 a', 'h4 a', 'strong a']) {
      const authorEl = el.querySelector(sel);
      if (authorEl && authorEl.textContent.trim().length > 1) {
        content.author = authorEl.textContent.trim().substring(0, 100);
        break;
      }
    }

    // ── Timestamp ── (Facebook stores the exact date in <abbr> or <a> title attributes)
    const timeEl = el.querySelector('abbr[data-utime], a[role="link"] abbr, abbr');
    if (timeEl) {
      content.timestamp = timeEl.getAttribute('title') || timeEl.getAttribute('data-utime') || timeEl.textContent.trim();
    }

    // ── IMAGE POST path ──
    // data-visualcompletion="media-vc-image" is Facebook's canonical marker for post media.
    // Query directly on el (no cloning) — zero risk of picking up comment text.
    const mediaImgEls = Array.from(
      el.querySelectorAll('img[data-visualcompletion="media-vc-image"]')
    ).filter(img => img.src && img.src.startsWith('http'));

    if (mediaImgEls.length > 0) {
      content.imageUrls = mediaImgEls.map(img => img.src).slice(0, 3);
      // Facebook's AI alt text is the richest description we have
      // e.g. "Ms. Rachel posted a video of an interview with a child being detained..."
      content.imageAlt = mediaImgEls
        .map(img => img.alt)
        .filter(a => a && a.length > 5)
        .join('\n\n');
      // Grab caption only from a tight selector — no fallback that can bleed comment text
      for (const sel of ['[data-ad-comet-preview="message"]', '[data-testid="post_message"]', '[data-ad-preview="message"]']) {
        const msgEl = el.querySelector(sel);
        if (msgEl) { content.text = msgEl.innerText.trim().substring(0, 3000); break; }
      }
      return content; // ← return early; never touch innerText
    }

    // ── TEXT-ONLY POST path ──
    // Clone + strip comments before extracting text.
    const clone = el.cloneNode(true);
    clone.querySelectorAll([
      'div[role="article"]',
      'div[role="feed"]',
      'div[role="list"]',
      'form',
      '[contenteditable]',
      '[data-testid*="comment"]',
      '[data-pagelet*="Comment"]',
    ].join(', ')).forEach(c => c.remove());

    for (const sel of ['[data-ad-comet-preview="message"]', '[data-testid="post_message"]', '[data-ad-preview="message"]']) {
      const candidates = clone.querySelectorAll(sel);
      if (candidates.length > 0) {
        content.text = Array.from(candidates).map(e => e.innerText).join('\n').trim();
        break;
      }
    }

    if (!content.text) {
      const lines = (clone.innerText || '').split('\n').map(l => l.trim()).filter(l => {
        if (!l || l.length < 4) return false;
        if (/^(Like|Comment|Share|Send|Save|Follow|Following|Unfollow|See more|See less|More)$/i.test(l)) return false;
        if (/^\d[\d.,KMB]* (like|comment|share|reaction|view|answer)s?$/i.test(l)) return false;
        if (/^(Just now|\d+ (minute|hour|day|week|month|year)s? ago|Yesterday|Today|[A-Z][a-z]+ \d+)$/.test(l)) return false;
        return true;
      });
      content.text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim().substring(0, 3000);
    }

    const linkTitleEl = el.querySelector('[data-testid="story-text"]') ||
                        el.querySelector('a[target="_blank"] span[dir="auto"]') ||
                        el.querySelector('a[target="_blank"] span');
    if (linkTitleEl) content.linkTitle = linkTitleEl.textContent.trim().substring(0, 300);

    const linkEl = el.querySelector('a[target="_blank"][href*="l.facebook.com"]') ||
                   el.querySelector('a[target="_blank"]:not([href*="facebook.com"])');
    if (linkEl) content.linkUrl = linkEl.href;

    return content;
  }

  // ─── Instagram Post Extractor ─────────────────────────────────────────────

  function extractInstagramContent(el) {
    const content = { text: '', author: '', imageAlt: '', linkTitle: '', imageUrls: [], imageData: [] };

    // Author: username link in the post header
    const authorEl = el.querySelector('header a[role="link"]') ||
                     el.querySelector('header a');
    if (authorEl) content.author = authorEl.textContent.trim().substring(0, 100);

    // Images — Instagram CDN (cdninstagram.com or fbcdn.net)
    const imgs = Array.from(el.querySelectorAll('img')).filter(img => {
      const src = img.src || '';
      return src.includes('cdninstagram.com') || src.includes('fbcdn.net');
    });

    // Alt text: Instagram auto-generates descriptive accessibility alt text
    const alts = imgs
      .map(img => img.alt)
      .filter(alt => alt && alt.length > 5 &&
        !alt.toLowerCase().includes('profile picture') &&
        !alt.toLowerCase().includes('profile photo'));
    content.imageAlt = alts.join('\n\n');
    content.imageUrls = imgs.map(img => img.src).filter(Boolean).slice(0, 3);

    // Caption text — try stable structural selectors
    const captionSelectors = [
      'ul li span[dir="auto"]',
      'article div[dir="auto"] span',
      'h1',
      '[data-testid="post-caption"] span',
    ];
    for (const sel of captionSelectors) {
      const captionEl = el.querySelector(sel);
      if (captionEl && captionEl.textContent.trim().length > 5) {
        content.text = captionEl.textContent.trim().substring(0, 3000);
        break;
      }
    }

    // Fallback: use the descriptive alt text as content
    if (!content.text && content.imageAlt) {
      content.text = content.imageAlt;
    }

    return content;
  }

  // ─── Image → Base64 ───────────────────────────────────────────────────────
  // Fetch images in the content-script context (has page cookies) and convert
  // to base64 so the Anthropic API can receive them reliably.

  async function fetchImagesAsBase64(imageUrls) {
    const results = [];
    for (const url of imageUrls.slice(0, 2)) {
      try {
        const resp = await fetch(url, { credentials: 'include' });
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        results.push({ data: base64, mediaType: blob.type || 'image/jpeg' });
      } catch (_) {
        // CORS or network failure — skip; URL fallback handled in background.js
      }
    }
    return results;
  }

  // ─── Scan Handler ─────────────────────────────────────────────────────────

  async function handleScan() {
    // Check for API key first
    const keyResp = await new Promise(resolve =>
      chrome.runtime.sendMessage({ type: 'getApiKey' }, resolve)
    );
    if (!keyResp || !keyResp.apiKey) {
      setResultArea(buildApiKeyPrompt());
      return;
    }

    const postEl = getMostVisiblePost();
    if (!postEl) {
      setResultArea(buildNoPostContent());
      return;
    }

    const content = extractPostContent(postEl);

    // A post is valid if it has text OR images
    const hasContent = (content.text && content.text.length > 3) ||
                       (content.imageUrls && content.imageUrls.length > 0) ||
                       (content.imageAlt && content.imageAlt.length > 10);
    if (!hasContent) {
      setResultArea(buildNoPostContent());
      return;
    }

    setResultArea(buildLoadingContent());
    setScanBtnDisabled(true);

    // Try to fetch images as base64 (content script has page cookies)
    if (content.imageUrls && content.imageUrls.length > 0) {
      content.imageData = await fetchImagesAsBase64(content.imageUrls);
    }

    const response = await new Promise(resolve =>
      chrome.runtime.sendMessage({ type: 'factcheck', content }, resolve)
    );

    setScanBtnDisabled(false);

    if (!response) {
      setResultArea(buildErrorContent('Extension error. Please reload the page.', 'unknown'));
      return;
    }

    if (response.error) {
      setResultArea(buildErrorContent(response.message, response.errorType));
      return;
    }

    if (response.success && response.result) {
      setResultArea(buildResultContent(response.result));
    }
  }

  // ─── API Key Handler ───────────────────────────────────────────────────────

  function handleSaveApiKey() {
    const input = document.getElementById('pp-apikey-input');
    if (!input) return;
    const key = input.value.trim();
    if (!key || !key.startsWith('sk-')) {
      input.style.borderColor = '#EF4444';
      input.placeholder = 'Must start with sk-ant-...';
      setTimeout(() => {
        input.style.borderColor = '';
        input.placeholder = 'sk-ant-...';
      }, 2500);
      return;
    }

    chrome.runtime.sendMessage({ type: 'saveApiKey', apiKey: key }, () => {
      setResultArea(buildIdleContent());
    });
  }

  // ─── Initialize ───────────────────────────────────────────────────────────

  function init() {
    loadFonts();
    injectStyles();

    sidebarEl = createSidebar();
    toggleEl = createToggleButton();

    // Check if API key is stored; if not, show the prompt
    chrome.runtime.sendMessage({ type: 'getApiKey' }, (response) => {
      if (!response || !response.apiKey) {
        setResultArea(buildApiKeyPrompt());
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
