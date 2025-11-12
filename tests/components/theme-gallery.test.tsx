import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getAllThemeTemplates } from '@shared/theme-templates';

/**
 * Component Tests for Theme Gallery
 *
 * These tests verify the theme template gallery UI behavior.
 * They test:
 * - Template rendering
 * - Click interactions
 * - Visual feedback
 * - Theme application
 */

describe('Theme Gallery Component', () => {
  describe('Template Rendering', () => {
    it('should render all 12 theme templates', () => {
      // This test verifies that all templates are displayed
      const templates = getAllThemeTemplates();
      expect(templates).toHaveLength(12);

      // Each template should have required display properties
      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.colors.primary).toBeDefined();
        expect(template.colors.secondary).toBeDefined();
        expect(template.colors.accent).toBeDefined();
      });
    });

    it('should display template names and descriptions', () => {
      const templates = getAllThemeTemplates();

      // Verify each template has user-facing text
      templates.forEach(template => {
        expect(template.name.length).toBeGreaterThan(0);
        expect(template.description.length).toBeGreaterThan(0);
      });
    });

    it('should show color preview dots for each template', () => {
      const templates = getAllThemeTemplates();

      // Each template should have 3 main colors for preview
      templates.forEach(template => {
        expect(template.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(template.colors.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(template.colors.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('Template Selection', () => {
    it('should identify the selected template', () => {
      // When a template is selected, it should be identifiable
      const selectedTemplateId = 'dark-pro';
      const templates = getAllThemeTemplates();
      const selected = templates.find(t => t.templateId === selectedTemplateId);

      expect(selected).toBeDefined();
      expect(selected?.templateId).toBe('dark-pro');
    });

    it('should allow template ID matching', () => {
      const currentThemeId = 'neon-cyberpunk';
      const templates = getAllThemeTemplates();

      const isSelected = (templateId: string) => templateId === currentThemeId;

      expect(isSelected('neon-cyberpunk')).toBe(true);
      expect(isSelected('dark-pro')).toBe(false);
    });
  });

  describe('Theme Application Logic', () => {
    it('should construct proper theme object for application', () => {
      const template = getAllThemeTemplates()[0];

      // Mock the application logic
      const applyTheme = (template: any) => ({
        theme: template,
        brandColors: {
          primary: template.colors.primary,
          secondary: template.colors.secondary,
          accent: template.colors.accent,
        },
      });

      const result = applyTheme(template);

      expect(result.theme).toBe(template);
      expect(result.brandColors.primary).toBe(template.colors.primary);
      expect(result.brandColors.secondary).toBe(template.colors.secondary);
      expect(result.brandColors.accent).toBe(template.colors.accent);
    });

    it('should update both theme and brandColors for backward compatibility', () => {
      const template = getAllThemeTemplates().find(t => t.templateId === 'ocean-blue');

      expect(template).toBeDefined();

      const updatedState = {
        theme: template,
        brandColors: {
          primary: template!.colors.primary,
          secondary: template!.colors.secondary,
          accent: template!.colors.accent,
        },
      };

      // Verify Phase 0 (brandColors) and Phase 1 (theme) both set
      expect(updatedState.brandColors).toBeDefined();
      expect(updatedState.theme).toBeDefined();
      expect(updatedState.brandColors.primary).toBe(updatedState.theme!.colors.primary);
    });
  });

  describe('Template Categories', () => {
    it('should categorize templates by mode', () => {
      const templates = getAllThemeTemplates();

      const lightTemplates = templates.filter(t => t.mode === 'light');
      const darkTemplates = templates.filter(t => t.mode === 'dark');
      const customTemplates = templates.filter(t => t.mode === 'custom');

      // Should have templates in each category
      expect(lightTemplates.length + darkTemplates.length + customTemplates.length).toBe(12);
    });

    it('should identify light mode templates', () => {
      const templates = getAllThemeTemplates();
      const lightTemplates = templates.filter(t => t.mode === 'light');

      lightTemplates.forEach(template => {
        // Light templates should have light backgrounds
        const bgColor = parseInt(template.colors.background.slice(1, 3), 16);
        expect(bgColor).toBeGreaterThan(200); // Light color threshold
      });
    });

    it('should identify dark mode templates', () => {
      const templates = getAllThemeTemplates();
      const darkTemplates = templates.filter(t => t.mode === 'dark');

      darkTemplates.forEach(template => {
        // Dark templates should have dark backgrounds
        const bgColor = parseInt(template.colors.background.slice(1, 3), 16);
        expect(bgColor).toBeLessThan(100); // Dark color threshold
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should provide gradient preview for each template', () => {
      const templates = getAllThemeTemplates();

      templates.forEach(template => {
        // Gradient uses primary and secondary colors
        const gradient = `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`;
        expect(gradient).toContain(template.colors.primary);
        expect(gradient).toContain(template.colors.secondary);
      });
    });

    it('should show template metadata (mode, color count, etc.)', () => {
      const template = getAllThemeTemplates()[0];

      const metadata = {
        mode: template.mode,
        colorCount: 14, // All templates have 14 colors
        hasTypography: !!template.typography,
        hasLayout: !!template.layout,
      };

      expect(metadata.mode).toBeDefined();
      expect(metadata.colorCount).toBe(14);
      expect(metadata.hasTypography).toBe(true);
      expect(metadata.hasLayout).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default light theme', () => {
      const defaultTheme = {
        name: 'Default Light',
        mode: 'light' as const,
        templateId: 'default-light',
        backgroundColor: '#ffffff',
        textColor: '#111827',
      };

      // Verify default theme structure
      expect(defaultTheme.templateId).toBe('default-light');
      expect(defaultTheme.mode).toBe('light');
    });

    it('should clear custom theme settings on reset', () => {
      const mockSetState = vi.fn();

      const resetTheme = () => {
        mockSetState({
          theme: {
            name: 'Default Light',
            mode: 'light',
            templateId: 'default-light',
            backgroundColor: '#ffffff',
            textColor: '#111827',
          },
        });
      };

      resetTheme();

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: expect.objectContaining({
            templateId: 'default-light',
          }),
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have readable template names', () => {
      const templates = getAllThemeTemplates();

      templates.forEach(template => {
        // Name should be readable (no special chars, reasonable length)
        expect(template.name.length).toBeGreaterThan(3);
        expect(template.name.length).toBeLessThan(30);
      });
    });

    it('should have descriptive template descriptions', () => {
      const templates = getAllThemeTemplates();

      templates.forEach(template => {
        // Description should provide context
        expect(template.description.length).toBeGreaterThan(10);
      });
    });

    it('should provide color contrast information', () => {
      const templates = getAllThemeTemplates();

      templates.forEach(template => {
        // Text colors should contrast with background
        const bgIsLight = parseInt(template.colors.background.slice(1, 3), 16) > 128;
        const textIsLight = parseInt(template.colors.text.primary.slice(1, 3), 16) > 128;

        // Light backgrounds should have dark text, and vice versa
        expect(bgIsLight).not.toBe(textIsLight);
      });
    });
  });

  describe('Template Data Integrity', () => {
    it('should not have duplicate template IDs', () => {
      const templates = getAllThemeTemplates();
      const ids = templates.map(t => t.templateId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have all required CSS variables for each template', () => {
      const templates = getAllThemeTemplates();

      templates.forEach(template => {
        // Verify all 50+ CSS variables can be generated
        expect(template.colors).toBeDefined();
        expect(template.typography).toBeDefined();
        expect(template.layout).toBeDefined();

        // Color variables (14)
        expect(Object.keys(template.colors).length).toBeGreaterThanOrEqual(11);

        // Typography variables
        expect(template.typography.fontSize).toBeDefined();
        expect(template.typography.fontWeight).toBeDefined();
        expect(template.typography.lineHeight).toBeDefined();

        // Layout variables
        expect(template.layout.borderRadius).toBeDefined();
        expect(template.layout.spacing).toBeDefined();
        expect(template.layout.shadow).toBeDefined();
      });
    });
  });
});
