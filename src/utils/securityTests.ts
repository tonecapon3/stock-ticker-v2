/**
 * Security Testing Utilities
 * Helper functions to test HTTPS enforcement and security features
 */

export interface SecurityTestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Run comprehensive security tests
 */
export async function runSecurityTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = [];

  // Test 1: HTTPS Protocol
  results.push(testHttpsProtocol());

  // Test 2: Secure Context
  results.push(testSecureContext());

  // Test 3: Security Headers
  results.push(await testSecurityHeaders());

  // Test 4: CSP Compliance
  results.push(testCSPCompliance());

  // Test 5: HSTS Header
  results.push(await testHSTSHeader());

  // Test 6: Mixed Content
  results.push(testMixedContent());

  return results;
}

/**
 * Test if the current connection uses HTTPS
 */
function testHttpsProtocol(): SecurityTestResult {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'unknown';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isHttps = protocol === 'https:';
  
  // Allow HTTP for localhost development
  const passed = isHttps || isLocalhost;
  
  return {
    test: 'HTTPS Protocol',
    passed,
    message: passed 
      ? `✅ Using secure protocol: ${protocol}` 
      : `❌ Insecure protocol detected: ${protocol}`,
    details: { protocol, hostname, isLocalhost }
  };
}

/**
 * Test if running in a secure context
 */
function testSecureContext(): SecurityTestResult {
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;
  
  return {
    test: 'Secure Context',
    passed: isSecureContext,
    message: isSecureContext 
      ? '✅ Running in secure context' 
      : '❌ Not running in secure context',
    details: { isSecureContext }
  };
}

/**
 * Test for security headers (limited to what we can check client-side)
 */
async function testSecurityHeaders(): Promise<SecurityTestResult> {
  try {
    // We can only check headers that are accessible via JavaScript
    const hasCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
    const hasHSTS = document.querySelector('meta[http-equiv="Strict-Transport-Security"]') !== null;
    
    const headerChecks = {
      csp: hasCSP,
      hsts: hasHSTS,
    };
    
    const passedCount = Object.values(headerChecks).filter(Boolean).length;
    const passed = passedCount > 0;
    
    return {
      test: 'Security Headers',
      passed,
      message: `${passedCount > 0 ? '✅' : '❌'} Found ${passedCount} security headers`,
      details: headerChecks
    };
  } catch (error) {
    return {
      test: 'Security Headers',
      passed: false,
      message: '❌ Error checking security headers',
      details: { error: error.message }
    };
  }
}

/**
 * Test CSP compliance
 */
function testCSPCompliance(): SecurityTestResult {
  try {
    // Check if CSP meta tag exists
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    
    if (!cspMeta) {
      return {
        test: 'CSP Compliance',
        passed: false,
        message: '❌ No CSP meta tag found',
        details: { hasCspMeta: false }
      };
    }
    
    const cspContent = cspMeta.getAttribute('content') || '';
    const hasDefaultSrc = cspContent.includes("default-src 'self'");
    const hasScriptSrc = cspContent.includes('script-src');
    const hasStyleSrc = cspContent.includes('style-src');
    
    const cspChecks = {
      hasCspMeta: true,
      hasDefaultSrc,
      hasScriptSrc,
      hasStyleSrc,
    };
    
    const passed = hasDefaultSrc && hasScriptSrc && hasStyleSrc;
    
    return {
      test: 'CSP Compliance',
      passed,
      message: passed 
        ? '✅ CSP policy configured correctly' 
        : '❌ CSP policy incomplete',
      details: cspChecks
    };
  } catch (error) {
    return {
      test: 'CSP Compliance',
      passed: false,
      message: '❌ Error checking CSP compliance',
      details: { error: error.message }
    };
  }
}

/**
 * Test HSTS header (limited client-side check)
 */
async function testHSTSHeader(): Promise<SecurityTestResult> {
  try {
    const hstsMeta = document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
    const hasHSTSMeta = hstsMeta !== null;
    
    // Check if we're on HTTPS (HSTS only works over HTTPS)
    const isHttps = window.location.protocol === 'https:';
    
    const passed = hasHSTSMeta && isHttps;
    
    return {
      test: 'HSTS Header',
      passed,
      message: passed 
        ? '✅ HSTS configured for HTTPS' 
        : hasHSTSMeta 
          ? '⚠️ HSTS meta found but not on HTTPS' 
          : '❌ No HSTS configuration found',
      details: { hasHSTSMeta, isHttps }
    };
  } catch (error) {
    return {
      test: 'HSTS Header',
      passed: false,
      message: '❌ Error checking HSTS header',
      details: { error: error.message }
    };
  }
}

/**
 * Test for mixed content issues
 */
function testMixedContent(): SecurityTestResult {
  try {
    if (typeof window === 'undefined') {
      return {
        test: 'Mixed Content',
        passed: true,
        message: '✅ Mixed content check skipped (SSR)',
        details: { reason: 'Server-side rendering' }
      };
    }
    
    const isHttps = window.location.protocol === 'https:';
    
    if (!isHttps) {
      return {
        test: 'Mixed Content',
        passed: true,
        message: '⚠️ Mixed content check skipped (not HTTPS)',
        details: { protocol: window.location.protocol }
      };
    }
    
    // Check for insecure resources (basic check)
    const images = Array.from(document.images);
    const scripts = Array.from(document.scripts);
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    const insecureImages = images.filter(img => img.src.startsWith('http://'));
    const insecureScripts = scripts.filter(script => script.src.startsWith('http://'));
    const insecureStyles = stylesheets.filter(link => 
      (link as HTMLLinkElement).href.startsWith('http://')
    );
    
    const totalInsecure = insecureImages.length + insecureScripts.length + insecureStyles.length;
    const passed = totalInsecure === 0;
    
    return {
      test: 'Mixed Content',
      passed,
      message: passed 
        ? '✅ No mixed content detected' 
        : `❌ Found ${totalInsecure} insecure resources`,
      details: {
        insecureImages: insecureImages.length,
        insecureScripts: insecureScripts.length,
        insecureStyles: insecureStyles.length,
        total: totalInsecure
      }
    };
  } catch (error) {
    return {
      test: 'Mixed Content',
      passed: false,
      message: '❌ Error checking mixed content',
      details: { error: error.message }
    };
  }
}

/**
 * Format test results for display
 */
export function formatTestResults(results: SecurityTestResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  let output = `\n🔒 Security Test Results: ${passed}/${total} (${percentage}%)\n`;
  output += '='.repeat(50) + '\n\n';
  
  results.forEach(result => {
    output += `${result.message}\n`;
    if (result.details && typeof result.details === 'object') {
      const detailsStr = JSON.stringify(result.details, null, 2);
      output += `   Details: ${detailsStr}\n`;
    }
    output += '\n';
  });
  
  return output;
}

/**
 * Run tests and log results to console
 */
export async function runAndLogSecurityTests(): Promise<void> {
  console.group('🔒 Security Tests');
  
  try {
    const results = await runSecurityTests();
    const formattedResults = formatTestResults(results);
    
    console.log(formattedResults);
    
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.warn(`⚠️ ${failedTests.length} security tests failed`);
      failedTests.forEach(test => {
        console.warn(`❌ ${test.test}: ${test.message}`);
      });
    } else {
      console.log('✅ All security tests passed!');
    }
  } catch (error) {
    console.error('❌ Security test suite failed:', error);
  } finally {
    console.groupEnd();
  }
}
