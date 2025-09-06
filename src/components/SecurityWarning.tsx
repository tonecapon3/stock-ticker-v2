import React, { useState } from 'react';
import { SecurityState } from '../hooks/useSecurity';

interface SecurityWarningProps {
  securityState: SecurityState;
}

export default function SecurityWarning({ securityState }: SecurityWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show warning if loading or no warnings
  if (securityState.isLoading || (!securityState.warnings.length && securityState.isSecure)) {
    return null;
  }

  // Don't show if user dismissed it
  if (dismissed) {
    return null;
  }

  const hasSecurityIssues = !securityState.isSecure || securityState.warnings.length > 0;

  if (!hasSecurityIssues) {
    return null;
  }

  return (
    <div className="bg-red-600 border-b border-red-700 text-white">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Warning Icon */}
            <svg 
              className="w-5 h-5 text-red-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>

            <div>
              <div className="font-semibold">
                🔒 Security Warning
              </div>
              <div className="text-sm text-red-100">
                {!securityState.isSecure && (
                  <span className="block">
                    ⚠️ Connection is not secure. Please use HTTPS for safe data transmission.
                  </span>
                )}
                {securityState.warnings.map((warning, index) => (
                  <span key={index} className="block">
                    • {warning}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {!securityState.isSecure && typeof window !== 'undefined' && (
              <button
                onClick={() => {
                  const httpsUrl = window.location.href.replace('http://', 'https://');
                  window.location.href = httpsUrl;
                }}
                className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Switch to HTTPS
              </button>
            )}

            {/* Dismiss Button */}
            <button
              onClick={() => setDismissed(true)}
              className="text-red-200 hover:text-white transition-colors"
              aria-label="Dismiss security warning"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
