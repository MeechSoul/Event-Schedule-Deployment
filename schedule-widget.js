/**
 * ATX ROX & SOUL STUDIOS NATIVE SCHEDULE EMBED WIDGET
 * Drop-in zero-iframe widget for WordPress, Squarespace, Wix & custom websites.
 */
(function() {
  const currentScript = document.currentScript;
  const sheetUrl = currentScript ? currentScript.getAttribute('data-sheet') : '';
  const targetId = currentScript ? (currentScript.getAttribute('data-target') || 'atx-schedule-widget') : 'atx-schedule-widget';
  const theme = currentScript ? (currentScript.getAttribute('data-theme') || 'atx-rox') : 'atx-rox';

  const scriptSrc = currentScript ? currentScript.src : '';
  const baseUrl = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) : '';
  const iframeSrc = `${baseUrl}/index.html?sheet=${encodeURIComponent(sheetUrl)}&theme=${encodeURIComponent(theme)}&mode=public`;

  function initWidget() {
    let container = document.getElementById(targetId);
    if (!container) {
      container = document.createElement('div');
      container.id = targetId;
      if (currentScript && currentScript.parentNode) {
        currentScript.parentNode.insertBefore(container, currentScript);
      } else {
        document.body.appendChild(container);
      }
    }

    container.innerHTML = `
      <div style="width:100%; overflow:hidden; border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.3); background:#0d0b1a;">
        <iframe 
          src="${iframeSrc}" 
          width="100%" 
          height="850px" 
          frameborder="0" 
          style="border:none; width:100%; min-height:750px; display:block;"
          title="Event Schedule">
        </iframe>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
