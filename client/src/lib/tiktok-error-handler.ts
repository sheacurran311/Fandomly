// Global error handler for TikTok sandbox environment issues

/**
 * Initialize global error handling for TikTok-related errors
 * This helps catch and handle TikTok's internal JavaScript errors gracefully
 */
export function initTikTokErrorHandler(): void {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (isTikTokError(error)) {
      console.warn('[TikTok Error Handler] Caught TikTok-related promise rejection:', error);
      
      // Prevent the error from being logged as unhandled
      event.preventDefault();
      
      // Show user-friendly message
      showTikTokErrorNotification('TikTok authentication may have issues due to sandbox environment limitations.');
    }
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    
    if (isTikTokError(error) || isTikTokScriptError(event)) {
      console.warn('[TikTok Error Handler] Caught TikTok-related error:', error);
      
      // Prevent the error from bubbling up
      event.preventDefault();
      
      // Show user-friendly message
      showTikTokErrorNotification('TikTok authentication encountered a known sandbox environment issue.');
      
      return false;
    }
  });

  console.log('[TikTok Error Handler] Global error handling initialized');
}

/**
 * Check if an error is related to TikTok
 */
function isTikTokError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  const errorStack = error.stack || '';
  
  return (
    errorMessage.includes('atob') ||
    errorMessage.includes('InvalidCharacterError') ||
    errorStack.includes('webapp-login-page') ||
    errorStack.includes('tiktok.com') ||
    errorStack.includes('npm-async-') ||
    errorStack.includes('webmssdk.js')
  );
}

/**
 * Check if a script error is from TikTok
 */
function isTikTokScriptError(event: ErrorEvent): boolean {
  const filename = event.filename || '';
  const message = event.message || '';
  
  return (
    filename.includes('tiktok.com') ||
    filename.includes('webapp-login-page') ||
    filename.includes('webmssdk.js') ||
    message.includes('Cross-Origin-Opener-Policy') ||
    message.includes('InvalidCharacterError')
  );
}

/**
 * Show a user-friendly notification about TikTok errors
 */
function showTikTokErrorNotification(message: string): void {
  // Only show notification if we haven't shown one recently
  const lastShown = localStorage.getItem('tiktok_error_notification_last_shown');
  const now = Date.now();
  
  if (lastShown && (now - parseInt(lastShown)) < 30000) {
    // Don't spam notifications - wait at least 30 seconds between them
    return;
  }
  
  localStorage.setItem('tiktok_error_notification_last_shown', now.toString());
  
  // Create a simple toast-like notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    color: #92400e;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    max-width: 400px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.4;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 8px;">
      <div style="color: #f59e0b; font-size: 16px;">⚠️</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">TikTok Integration Notice</div>
        <div>${message}</div>
        <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
          This is a known issue with TikTok's sandbox environment and does not affect your application.
        </div>
      </div>
      <button 
        onclick="this.parentElement.parentElement.remove()" 
        style="background: none; border: none; color: #92400e; font-size: 18px; cursor: pointer; padding: 0; margin-left: auto;"
      >×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Clean up error handler (for testing or unmounting)
 */
export function cleanupTikTokErrorHandler(): void {
  // Remove notification timestamp
  localStorage.removeItem('tiktok_error_notification_last_shown');
  
  console.log('[TikTok Error Handler] Cleaned up');
}
