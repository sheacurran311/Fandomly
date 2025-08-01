import { useEffect } from "react";

interface DynamicThemeInjectorProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily?: string;
  customCSS?: string;
  backgroundImage?: string;
  gradientDirection?: string;
}

export default function DynamicThemeInjector({
  primaryColor,
  secondaryColor,
  accentColor,
  fontFamily,
  customCSS,
  backgroundImage,
  gradientDirection = "to-bottom-right"
}: DynamicThemeInjectorProps) {
  
  useEffect(() => {
    // Create or update dynamic theme styles
    let styleElement = document.getElementById('dynamic-tenant-theme') as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'dynamic-tenant-theme';
      document.head.appendChild(styleElement);
    }

    // Convert hex to RGB for various uses
    const hexToRgb = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return "139, 92, 246";
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    };

    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);
    const accentRgb = hexToRgb(accentColor);

    // Generate comprehensive CSS
    const dynamicCSS = `
      :root {
        /* Brand Colors */
        --brand-primary: ${primaryColor};
        --brand-primary-rgb: ${primaryRgb};
        --brand-primary-50: rgba(${primaryRgb}, 0.05);
        --brand-primary-100: rgba(${primaryRgb}, 0.1);
        --brand-primary-200: rgba(${primaryRgb}, 0.2);
        --brand-primary-500: rgba(${primaryRgb}, 0.5);
        --brand-primary-800: rgba(${primaryRgb}, 0.8);

        --brand-secondary: ${secondaryColor};
        --brand-secondary-rgb: ${secondaryRgb};
        --brand-secondary-50: rgba(${secondaryRgb}, 0.05);
        --brand-secondary-100: rgba(${secondaryRgb}, 0.1);
        --brand-secondary-200: rgba(${secondaryRgb}, 0.2);
        --brand-secondary-500: rgba(${secondaryRgb}, 0.5);
        --brand-secondary-800: rgba(${secondaryRgb}, 0.8);

        --brand-accent: ${accentColor};
        --brand-accent-rgb: ${accentRgb};
        --brand-accent-50: rgba(${accentRgb}, 0.05);
        --brand-accent-100: rgba(${accentRgb}, 0.1);
        --brand-accent-200: rgba(${accentRgb}, 0.2);
        --brand-accent-500: rgba(${accentRgb}, 0.5);
        --brand-accent-800: rgba(${accentRgb}, 0.8);

        /* Typography */
        ${fontFamily ? `--font-family-brand: ${fontFamily};` : ''}

        /* Gradients */
        --gradient-primary: linear-gradient(${gradientDirection}, ${primaryColor}, ${secondaryColor});
        --gradient-secondary: linear-gradient(${gradientDirection}, ${secondaryColor}, ${accentColor});
        --gradient-accent: linear-gradient(${gradientDirection}, ${accentColor}, ${primaryColor});

        /* Background */
        ${backgroundImage ? `--background-brand: url(${backgroundImage});` : ''}
      }

      /* Dynamic theme overrides */
      .gradient-primary {
        background: var(--gradient-primary) !important;
      }

      .gradient-secondary {
        background: var(--gradient-secondary) !important;
      }

      .gradient-accent {
        background: var(--gradient-accent) !important;
      }

      .gradient-text {
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* Button overrides with tenant colors */
      .btn-primary {
        background-color: var(--brand-primary) !important;
        border-color: var(--brand-primary) !important;
      }

      .btn-primary:hover {
        background-color: var(--brand-primary-800) !important;
        border-color: var(--brand-primary-800) !important;
      }

      .btn-secondary {
        background-color: var(--brand-secondary) !important;
        border-color: var(--brand-secondary) !important;
      }

      .btn-accent {
        background-color: var(--brand-accent) !important;
        border-color: var(--brand-accent) !important;
      }

      /* Text color overrides */
      .text-brand-primary {
        color: var(--brand-primary) !important;
      }

      .text-brand-secondary {
        color: var(--brand-secondary) !important;
      }

      .text-brand-accent {
        color: var(--brand-accent) !important;
      }

      /* Background color overrides */
      .bg-brand-primary {
        background-color: var(--brand-primary) !important;
      }

      .bg-brand-secondary {
        background-color: var(--brand-secondary) !important;
      }

      .bg-brand-accent {
        background-color: var(--brand-accent) !important;
      }

      /* Border color overrides */
      .border-brand-primary {
        border-color: var(--brand-primary) !important;
      }

      .border-brand-secondary {
        border-color: var(--brand-secondary) !important;
      }

      .border-brand-accent {
        border-color: var(--brand-accent) !important;
      }

      /* Component-specific styling */
      .card-branded {
        border: 1px solid var(--brand-primary-200);
        background: var(--brand-primary-50);
      }

      .badge-branded {
        background-color: var(--brand-primary);
        color: white;
      }

      .progress-branded {
        background-color: var(--brand-primary);
      }

      /* Focus states */
      .focus-brand:focus {
        outline-color: var(--brand-primary) !important;
        box-shadow: 0 0 0 2px var(--brand-primary-200) !important;
      }

      /* Custom scrollbar */
      .scrollbar-branded::-webkit-scrollbar-thumb {
        background-color: var(--brand-primary);
      }

      .scrollbar-branded::-webkit-scrollbar-track {
        background-color: var(--brand-primary-100);
      }

      /* Font family application */
      ${fontFamily ? `
      .font-brand, .font-brand * {
        font-family: var(--font-family-brand) !important;
      }
      ` : ''}

      /* Background patterns */
      ${backgroundImage ? `
      .bg-brand-pattern {
        background-image: var(--background-brand);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
      ` : ''}

      /* Custom CSS injection */
      ${customCSS || ''}
    `;

    styleElement.textContent = dynamicCSS;

    // Cleanup on unmount
    return () => {
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [primaryColor, secondaryColor, accentColor, fontFamily, customCSS, backgroundImage, gradientDirection]);

  return null; // This component doesn't render anything visible
}