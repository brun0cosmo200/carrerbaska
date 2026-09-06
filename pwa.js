(() => {
  // O app Android recebe os arquivos pelo pacote; o cache PWA é só do site.
  if (window.Capacitor?.isNativePlatform()) return;
  const button = document.getElementById('instalar-app');
  let installPrompt;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    button.disabled = true;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      installPrompt = null;
      button.hidden = true;
      button.disabled = false;
    }
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.warn('Não foi possível preparar o modo offline.', error);
      });
    });
  }
})();
