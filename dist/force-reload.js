// DEBUG VERSION v0.1.6 - Find bulk operations issue
(function() {
  const currentVersion = '0.1.6';
  const deploymentTime = '1758805799848';
  const cacheKey = 'stock-ticker-version';
  
  console.log('🐛 DEBUG force-reload script loaded - version:', currentVersion);
  
  // Check if we need to force reload due to new version
  const storedVersion = localStorage.getItem(cacheKey);
  
  if (storedVersion !== currentVersion) {
    console.log('🚀 New DEBUG version detected:', currentVersion, 'Previous:', storedVersion);
    console.log('🧹 Clearing all caches for debugging...');
    
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
    
    // Force reload with debug parameters
    setTimeout(() => {
      const newUrl = window.location.href.split('?')[0] + 
        '?v=' + currentVersion + 
        '&t=' + deploymentTime + 
        '&debug=true' +
        '&cb=' + Date.now();
      
      console.log('🔄 DEBUG RELOAD:', newUrl);
      window.location.href = newUrl;
    }, 1000);
  } else {
    console.log('✅ DEBUG version check passed - no reload needed:', currentVersion);
  }
})();