// Force cache invalidation and reload
(function() {
  const currentVersion = '0.1.2';
  const deploymentTime = '1735115289';
  const cacheKey = 'stock-ticker-version';
  
  // Check if we need to force reload due to new version
  const storedVersion = localStorage.getItem(cacheKey);
  
  if (storedVersion !== currentVersion) {
    console.log('🚀 New version detected:', currentVersion, 'Previous:', storedVersion);
    
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
    window.location.href = window.location.href + '?v=' + currentVersion + '&t=' + deploymentTime;
  }
})();