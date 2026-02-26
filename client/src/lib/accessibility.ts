/**
 * Accessibility Utilities
 * Sprint 8: Provides accessibility helpers and patterns
 */

/**
 * Screen reader only text class
 * Visually hidden but accessible to screen readers
 */
export const srOnly = "sr-only absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0";

/**
 * Create aria-label for data visualizations
 */
export function createChartAriaLabel(
  chartType: string,
  title: string,
  dataDescription: string
): string {
  return `${chartType} chart titled "${title}". ${dataDescription}`;
}

/**
 * Create description for chart data
 */
export function describeChartData(
  data: { label: string; value: number }[],
  valueSuffix: string = ''
): string {
  if (data.length === 0) return 'No data available.';
  
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const maxItem = data.find(d => d.value === max);
  const minItem = data.find(d => d.value === min);
  
  return `Data ranges from ${min}${valueSuffix} to ${max}${valueSuffix}. ` +
    `Highest: ${maxItem?.label} at ${max}${valueSuffix}. ` +
    `Lowest: ${minItem?.label} at ${min}${valueSuffix}.`;
}

/**
 * Create skip link for keyboard navigation
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed top-0 left-0 p-2 bg-primary text-primary-foreground z-[100] transform -translate-y-full focus:translate-y-0 transition-transform"
    >
      Skip to main content
    </a>
  );
}

/**
 * Focus trap hook for modals
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  };

  if (typeof window !== 'undefined' && isActive) {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = srOnly;
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Handle list keyboard navigation
 */
export function handleListNavigation(
  e: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onSelect: (index: number) => void
) {
  switch (e.key) {
    case KeyboardKeys.ARROW_DOWN:
      e.preventDefault();
      onSelect(currentIndex < itemCount - 1 ? currentIndex + 1 : 0);
      break;
    case KeyboardKeys.ARROW_UP:
      e.preventDefault();
      onSelect(currentIndex > 0 ? currentIndex - 1 : itemCount - 1);
      break;
    case KeyboardKeys.HOME:
      e.preventDefault();
      onSelect(0);
      break;
    case KeyboardKeys.END:
      e.preventDefault();
      onSelect(itemCount - 1);
      break;
  }
}

/**
 * Color contrast check
 * Returns true if contrast ratio is at least 4.5:1 (WCAG AA)
 */
export function hasAdequateContrast(foreground: string, background: string): boolean {
  const getLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return ratio >= 4.5;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Get accessible text color for a given background
 */
export function getAccessibleTextColor(backgroundColor: string): 'white' | 'black' {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return 'black';
  
  // Calculate perceived brightness
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? 'black' : 'white';
}
