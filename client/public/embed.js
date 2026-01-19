(function() {
  const SCRIPT_ID = 'sdac-assistant-script';
  if (document.getElementById(SCRIPT_ID)) return;

  // Configuration
  const WIDGET_URL = new URL(document.currentScript.src).origin + '/#/widget';
  
  // Create Launcher Button
  const launcher = document.createElement('div');
  launcher.id = 'sdac-launcher';
  launcher.innerHTML = `
    <div class="sdac-launcher-content">
      <div class="sdac-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </div>
      <span class="sdac-label">SDAC Assistant</span>
    </div>
  `;

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #sdac-launcher {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #0f172a; /* Slate 900 */
      color: white;
      padding: 12px 20px;
      border-radius: 9999px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 99999;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    #sdac-launcher:hover {
      transform: scale(1.05);
      background-color: #1e293b;
    }
    .sdac-launcher-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sdac-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sdac-label {
      font-weight: 600;
      font-size: 14px;
    }
    #sdac-iframe-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 700px;
      max-height: calc(100vh - 40px);
      max-width: calc(100vw - 40px);
      z-index: 99999;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px) scale(0.95);
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 16px;
      overflow: hidden;
    }
    #sdac-iframe-container.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    #sdac-iframe-container iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    }
    @media (max-width: 480px) {
      #sdac-iframe-container {
        width: 100%;
        height: 100%;
        bottom: 0;
        right: 0;
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Iframe Container
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'sdac-iframe-container';
  const iframe = document.createElement('iframe');
  iframe.src = WIDGET_URL;
  iframe.setAttribute('allow', 'clipboard-write'); // Allow clipboard access for copy button
  iframeContainer.appendChild(iframe);

  document.body.appendChild(launcher);
  document.body.appendChild(iframeContainer);

  // Event Handlers
  launcher.addEventListener('click', () => {
    iframeContainer.classList.add('open');
    launcher.style.opacity = '0';
    launcher.style.pointerEvents = 'none';
  });

  window.addEventListener('message', (event) => {
    if (event.data.type === 'close-widget') {
      iframeContainer.classList.remove('open');
      launcher.style.opacity = '1';
      launcher.style.pointerEvents = 'auto';
    }
  });

})();
