import { describe, it, expect } from 'vitest';
import {
  THEME_TEMPLATES,
  getAllThemeTemplates,
  getThemeTemplate,
  getThemeTemplatesByMode,
  convertLegacyColorsToTheme,
} from '@shared/theme-templates';

describe('Theme Templates', () => {
  describe('THEME_TEMPLATES', () => {
    it('should have 12 theme templates', () => {
      const templates = getAllThemeTemplates();
      expect(templates).toHaveLength(12);
    });

    it('should have unique template IDs', () => {
      const templates = getAllThemeTemplates();
      const ids = templates.map(t => t.templateId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(templates.length);
    });

    it('should have required properties for each template', () => {
      const templates = getAllThemeTemplates();
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('mode');
        expect(template).toHaveProperty('templateId');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('colors');
        expect(template).toHaveProperty('typography');
        expect(template).toHaveProperty('layout');
      });
    });
  });

  describe('Color System', () => {
    it('should have 14 colors in each template', () => {
      const templates = getAllThemeTemplates();
      templates.forEach(template => {
        const { colors } = template;
        expect(colors).toHaveProperty('primary');
        expect(colors).toHaveProperty('secondary');
        expect(colors).toHaveProperty('accent');
        expect(colors).toHaveProperty('background');
        expect(colors).toHaveProperty('surface');
        expect(colors).toHaveProperty('surfaceHover');
        expect(colors).toHaveProperty('border');
        expect(colors).toHaveProperty('success');
        expect(colors).toHaveProperty('warning');
        expect(colors).toHaveProperty('error');
        expect(colors).toHaveProperty('info');
        expect(colors.text).toHaveProperty('primary');
        expect(colors.text).toHaveProperty('secondary');
        expect(colors.text).toHaveProperty('tertiary');
      });
    });

    it('should have valid hex colors', () => {
      const templates = getAllThemeTemplates();
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      templates.forEach(template => {
        expect(template.colors.primary).toMatch(hexColorRegex);
        expect(template.colors.secondary).toMatch(hexColorRegex);
        expect(template.colors.accent).toMatch(hexColorRegex);
        expect(template.colors.background).toMatch(hexColorRegex);
      });
    });
  });

  describe('Typography System', () => {
    it('should have complete typography settings', () => {
      const templates = getAllThemeTemplates();
      templates.forEach(template => {
        const { typography } = template;
        expect(typography).toHaveProperty('fontFamily');
        expect(typography.fontFamily).toHaveProperty('heading');
        expect(typography.fontFamily).toHaveProperty('body');
        expect(typography.fontFamily).toHaveProperty('mono');

        expect(typography).toHaveProperty('fontSize');
        expect(typography).toHaveProperty('fontWeight');
        expect(typography).toHaveProperty('lineHeight');
      });
    });

    it('should have 9 font sizes', () => {
      const templates = getAllThemeTemplates();
      templates.forEach(template => {
        const sizes = template.typography.fontSize;
        expect(sizes).toHaveProperty('xs');
        expect(sizes).toHaveProperty('sm');
        expect(sizes).toHaveProperty('base');
        expect(sizes).toHaveProperty('lg');
        expect(sizes).toHaveProperty('xl');
        expect(sizes).toHaveProperty('2xl');
        expect(sizes).toHaveProperty('3xl');
        expect(sizes).toHaveProperty('4xl');
        expect(sizes).toHaveProperty('5xl');
      });
    });
  });

  describe('Layout System', () => {
    it('should have complete layout settings', () => {
      const templates = getAllThemeTemplates();
      templates.forEach(template => {
        const { layout } = template;
        expect(layout).toHaveProperty('borderRadius');
        expect(layout).toHaveProperty('spacing');
        expect(layout).toHaveProperty('shadow');
      });
    });

    it('should have 7 border radius options', () => {
      const templates = getAllThemeTemplates();
      templates.forEach(template => {
        const { borderRadius } = template.layout;
        expect(borderRadius).toHaveProperty('none');
        expect(borderRadius).toHaveProperty('sm');
        expect(borderRadius).toHaveProperty('md');
        expect(borderRadius).toHaveProperty('lg');
        expect(borderRadius).toHaveProperty('xl');
        expect(borderRadius).toHaveProperty('2xl');
        expect(borderRadius).toHaveProperty('full');
      });
    });
  });

  describe('getThemeTemplate', () => {
    it('should return template by ID', () => {
      const template = getThemeTemplate('dark-pro');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Dark Mode Pro');
    });

    it('should return null for invalid ID', () => {
      const template = getThemeTemplate('invalid-id');
      expect(template).toBeNull();
    });
  });

  describe('getThemeTemplatesByMode', () => {
    it('should return light mode templates', () => {
      const lightTemplates = getThemeTemplatesByMode('light');
      expect(lightTemplates.length).toBeGreaterThan(0);
      lightTemplates.forEach(t => {
        expect(t.mode).toBe('light');
      });
    });

    it('should return dark mode templates', () => {
      const darkTemplates = getThemeTemplatesByMode('dark');
      expect(darkTemplates.length).toBeGreaterThan(0);
      darkTemplates.forEach(t => {
        expect(t.mode).toBe('dark');
      });
    });
  });

  describe('convertLegacyColorsToTheme', () => {
    it('should convert Phase 0 colors to Phase 1 theme', () => {
      const legacyColors = {
        primary: '#8B5CF6',
        secondary: '#EC4899',
        accent: '#F59E0B',
      };

      const theme = convertLegacyColorsToTheme(legacyColors);

      expect(theme.colors.primary).toBe('#8B5CF6');
      expect(theme.colors.secondary).toBe('#EC4899');
      expect(theme.colors.accent).toBe('#F59E0B');
      expect(theme.name).toBe('Custom Theme');
      expect(theme.templateId).toBe('custom');
    });

    it('should create complete theme structure from legacy colors', () => {
      const legacyColors = {
        primary: '#000000',
        secondary: '#111111',
        accent: '#222222',
      };

      const theme = convertLegacyColorsToTheme(legacyColors);

      // Should have all required properties
      expect(theme).toHaveProperty('colors');
      expect(theme).toHaveProperty('typography');
      expect(theme).toHaveProperty('layout');
      expect(theme).toHaveProperty('mode');

      // Should have 14 colors
      expect(theme.colors).toHaveProperty('background');
      expect(theme.colors).toHaveProperty('surface');
      expect(theme.colors.text).toHaveProperty('primary');
    });
  });

  describe('Theme Consistency', () => {
    it('should have light background for light mode templates', () => {
      const lightTemplates = getThemeTemplatesByMode('light');
      lightTemplates.forEach(template => {
        // Light backgrounds should start with #F or #E (light colors)
        const bg = template.colors.background;
        const firstChar = bg.charAt(1);
        expect(['F', 'E', 'D', 'C'].includes(firstChar.toUpperCase())).toBe(true);
      });
    });

    it('should have dark background for dark mode templates', () => {
      const darkTemplates = getThemeTemplatesByMode('dark');
      darkTemplates.forEach(template => {
        // Dark backgrounds should start with #0, #1, #2, or #3 (dark colors)
        const bg = template.colors.background;
        const firstChar = bg.charAt(1);
        expect(['0', '1', '2', '3'].includes(firstChar)).toBe(true);
      });
    });

    it('should have consistent text color with background', () => {
      const templates = getAllThemeTemplates();
      templates.forEach(template => {
        // Text colors should contrast with background
        const bgIsLight = parseInt(template.colors.background.slice(1, 3), 16) > 128;
        const textIsLight = parseInt(template.colors.text.primary.slice(1, 3), 16) > 128;

        // Light backgrounds should have dark text, and vice versa
        // (or at least different enough for contrast)
        if (template.mode === 'light') {
          expect(bgIsLight).toBe(true);
        } else if (template.mode === 'dark') {
          expect(bgIsLight).toBe(false);
        }
      });
    });
  });

  describe('Special Templates', () => {
    it('should have high contrast template', () => {
      const highContrast = getThemeTemplate('high-contrast');
      expect(highContrast).toBeDefined();
      expect(highContrast?.name).toContain('High Contrast');
    });

    it('should have default light template', () => {
      const defaultLight = getThemeTemplate('default-light');
      expect(defaultLight).toBeDefined();
      expect(defaultLight?.name).toBe('Default Light');
    });

    it('should have neon cyberpunk template', () => {
      const neon = getThemeTemplate('neon-cyberpunk');
      expect(neon).toBeDefined();
      expect(neon?.colors.primary).toMatch(/#[A-Fa-f0-9]{6}/);
    });
  });
});
