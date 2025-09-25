// NUCLEAR CACHE-BUSTING v0.1.5 - timestamp-based build hashes
(function() {
  const currentVersion = '0.1.5';
  const deploymentTime = '1758803012067';
  const cacheKey = 'stock-ticker-version';
  
  console.log('💥 NUCLEAR force-reload script loaded - version:', currentVersion);
  
  // Check if we need to force reload due to new version
  const storedVersion = localStorage.getItem(cacheKey);
  
  if (storedVersion !== currentVersion) {
    console.log('🚀 New version detected:', currentVersion, 'Previous:', storedVersion);
    console.log('🧹 NUCLEAR CACHE CLEARING - all storage, service workers, and browser cache...');
    
    // NUCLEAR OPTION: Clear ALL possible caches
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage  
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(dbs => {
          dbs.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      
      // Clear service worker cache
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }
      
      // Clear browser cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Clear cookies related to the app
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
      console.log('✅ Nuclear cache clearing completed');
      
    } catch (error) {
      console.warn('⚠️ Some cache clearing failed:', error);
    }
    
    // Store new version FIRST to prevent infinite reload
    localStorage.setItem(cacheKey, currentVersion);
    
    // Force reload with MAXIMUM cache busting
    setTimeout(() => {
      const newUrl = window.location.href.split('?')[0] + 
        '?v=' + currentVersion + 
        '&t=' + deploymentTime + 
        '&cb=' + Date.now() + 
        '&nuclear=true' +
        '&random=' + Math.random().toString(36).substr(2, 9);
      
      console.log('🔄 NUCLEAR RELOAD:', newUrl);
      window.location.href = newUrl;
    }, 1000); // Longer timeout to ensure cache clearing
  } else {
    console.log('✅ Version check passed - no reload needed:', currentVersion);
  }
})();