// Force cache invalidation and reload - v0.1.3
(function() {
  const currentVersion = '0.1.3';
  const deploymentTime = '1735116687';
  const cacheKey = 'stock-ticker-version';
  
  console.log('🔄 Force-reload script loaded - version:', currentVersion);
  
  // Check if we need to force reload due to new version
  const storedVersion = localStorage.getItem(cacheKey);
  
  if (storedVersion !== currentVersion) {
    console.log('🚀 New version detected:', currentVersion, 'Previous:', storedVersion);
    console.log('🧹 Clearing all caches and forcing reload...');
    
    // Clear all caches
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear service worker cache if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    // Clear browser cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Store new version
    localStorage.setItem(cacheKey, currentVersion);
    
    // Force reload with cache busting
    setTimeout(() => {
      window.location.href = window.location.href.split('?')[0] + '?v=' + currentVersion + '&t=' + deploymentTime + '&cb=' + Date.now();
    }, 500);
  } else {
    console.log('✅ Version check passed - no reload needed:', currentVersion);
  }
})();