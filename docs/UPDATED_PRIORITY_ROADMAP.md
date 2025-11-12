# 🎨 UPDATED PRIORITY: White-Label & Customization First!

**Date:** November 12, 2025
**Status:** 🔴 **CRITICAL PRIORITY SHIFT**
**Feedback:** User wants customization/white-labeling enhanced FIRST for all users

---

## 🎯 Revised Strategic Priority

### What We Have Now ✅
- ✅ Dedicated unique URLs (e.g., `aerial-ace.fandomly.com`)
- ✅ Banner/program images upload
- ✅ Widget activation toggles
- ✅ Profile data activation/deactivation toggles
- ✅ Basic branding colors in database

### What's Broken/Missing 🔴
- ❌ **Frontend-backend connections not complete** (toggles exist but don't control what's shown)
- ❌ **Limited customization options** (only basic colors, need full theme control)
- ❌ **No widget embedding** for external sites
- ❌ **No custom domain support** for brands/agencies
- ❌ **No white-label tiers** (everyone gets the same limited options)

---

## 🚀 NEW PHASE ORDER (Customization-First Approach)

### **PHASE 0: Foundation Fixes (Week 1)** 🔴 URGENT
Connect existing frontend toggles to backend, fix what's broken

### **PHASE 1: Enhanced Branding for All (Weeks 2-3)** 🔴 CRITICAL
Give EVERYONE powerful customization tools

### **PHASE 2: Tiered White-Labeling (Weeks 4-5)** 🔴 CRITICAL
- **Tier 1 (Creators)**: Full white-label on our domain
- **Tier 2 (Brands)**: Embeddable widgets
- **Tier 3 (Agencies)**: Custom domains + full white-label

### **PHASE 3: Webhooks & Integration (Weeks 6-7)** 🔴 CRITICAL
Enable brands to integrate loyalty into their existing systems

### **PHASE 4-6: Everything else** (Task templates, segmentation, Web3, etc.)

---

## 🔴 PHASE 0: Foundation Fixes (Week 1)

**Goal:** Fix existing frontend-backend disconnections so current features work properly

### 0.1 Audit Current Disconnections

**What to check:**

```typescript
// Current state in schema.ts - branding exists!
branding: jsonb("branding").$type<{
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customCSS?: string;
  favicon?: string;
  fontFamily?: string;
}>()

// Settings exist but may not be connected!
settings: jsonb("settings").$type<{
  // ... lots of settings
  publicProfile: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  enableSocialLogin: boolean;
  // etc
}>()
```

**Current Issues to Fix:**

1. **Profile Data Toggles Not Working**
   - Frontend has toggles for showing/hiding fan data fields
   - Backend doesn't filter based on these toggles
   - Need to connect `settings.visibleFields` to actual field rendering

2. **Widget Activation Not Functional**
   - Widget toggle exists
   - But widget embed code not generated
   - Need to create embeddable widget with privacy controls

3. **Branding Not Applied Consistently**
   - Colors saved in database
   - But not applied across all pages
   - Need CSS variable injection

### 0.2 Fix Priority Issues

**Issue #1: Profile Data Display Controls**

```typescript
// server/routes.ts - Add to program/campaign endpoints

app.get('/api/programs/:slug/public', async (req, res) => {
  const { slug } = req.params;

  const program = await db.query.loyaltyPrograms.findFirst({
    where: eq(loyaltyPrograms.slug, slug),
    with: { tenant: true }
  });

  if (!program) {
    return res.status(404).json({ error: 'Program not found' });
  }

  // Get visible fields configuration
  const settings = program.tenant.settings as any;
  const visibleFields = settings?.visibleFields || {
    showName: true,
    showAvatar: true,
    showLocation: true,
    showBio: true,
    showSocialLinks: true,
    showPoints: true,
    showTaskCount: true,
    showJoinDate: true,
    showLeaderboard: true
  };

  // Get fans with only visible fields
  const fans = await db.query.fanPrograms.findMany({
    where: eq(fanPrograms.programId, program.id),
    with: { fan: true },
    limit: 50
  });

  // Filter fan data based on visibility settings
  const filteredFans = fans.map(fp => {
    const fan = fp.fan;
    const profileData = fan.profileData as any;

    return {
      id: fan.id,
      username: fan.username,
      // Only include fields if they're visible
      ...(visibleFields.showName && { name: profileData?.name }),
      ...(visibleFields.showAvatar && { avatar: fan.avatar }),
      ...(visibleFields.showLocation && { location: profileData?.location }),
      ...(visibleFields.showBio && { bio: profileData?.bio }),
      ...(visibleFields.showSocialLinks && { socialLinks: profileData?.socialLinks }),
      ...(visibleFields.showPoints && { points: fp.currentPoints }),
      ...(visibleFields.showTaskCount && { tasksCompleted: fp.totalTasksCompleted }),
      ...(visibleFields.showJoinDate && { joinedAt: fp.joinedAt })
    };
  });

  res.json({
    program,
    fans: filteredFans,
    visibleFields
  });
});
```

**Issue #2: Branding Applied Everywhere**

```typescript
// client/src/components/program/ProgramThemeProvider.tsx

import React, { useEffect } from 'react';

export function ProgramThemeProvider({
  program,
  children
}: {
  program: any;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!program?.tenant?.branding) return;

    const branding = program.tenant.branding;

    // Inject CSS variables
    const root = document.documentElement;

    if (branding.primaryColor) {
      root.style.setProperty('--color-primary', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--color-secondary', branding.secondaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty('--color-accent', branding.accentColor);
    }
    if (branding.fontFamily) {
      root.style.setProperty('--font-family', branding.fontFamily);
    }

    // Inject custom CSS
    if (branding.customCSS) {
      const styleEl = document.createElement('style');
      styleEl.id = 'program-custom-css';
      styleEl.textContent = branding.customCSS;
      document.head.appendChild(styleEl);
    }

    // Update favicon
    if (branding.favicon) {
      const faviconEl = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (faviconEl) {
        faviconEl.href = branding.favicon;
      }
    }

    // Cleanup on unmount
    return () => {
      const customCSS = document.getElementById('program-custom-css');
      if (customCSS) {
        customCSS.remove();
      }
    };
  }, [program]);

  return <>{children}</>;
}
```

**Issue #3: Settings Management UI**

```typescript
// client/src/pages/creator-dashboard/program-settings.tsx

export function ProgramSettingsPage() {
  const { programId } = useParams();

  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => apiClient.get(`/api/programs/${programId}`).then(res => res.data)
  });

  const updateSettings = useMutation({
    mutationFn: (settings: any) =>
      apiClient.patch(`/api/programs/${programId}/settings`, settings),
    onSuccess: () => {
      toast.success('Settings updated!');
      queryClient.invalidateQueries(['program', programId]);
    }
  });

  const [visibleFields, setVisibleFields] = useState({
    showName: true,
    showAvatar: true,
    showLocation: true,
    showBio: true,
    showSocialLinks: true,
    showPoints: true,
    showTaskCount: true,
    showJoinDate: true,
    showLeaderboard: true
  });

  useEffect(() => {
    if (program?.tenant?.settings?.visibleFields) {
      setVisibleFields(program.tenant.settings.visibleFields);
    }
  }, [program]);

  const handleToggleField = (field: string) => {
    const updated = {
      ...visibleFields,
      [field]: !visibleFields[field]
    };
    setVisibleFields(updated);

    // Save immediately
    updateSettings.mutate({
      visibleFields: updated
    });
  };

  return (
    <div className="program-settings">
      <h2>Program Settings</h2>

      <section className="settings-section">
        <h3>Fan Profile Visibility</h3>
        <p className="description">
          Control what information is visible on your public program page
        </p>

        <div className="toggle-grid">
          {Object.entries({
            showName: 'Show Fan Names',
            showAvatar: 'Show Profile Pictures',
            showLocation: 'Show Location',
            showBio: 'Show Bio',
            showSocialLinks: 'Show Social Links',
            showPoints: 'Show Points Balance',
            showTaskCount: 'Show Tasks Completed',
            showJoinDate: 'Show Join Date',
            showLeaderboard: 'Show Leaderboard'
          }).map(([key, label]) => (
            <div key={key} className="toggle-item">
              <label>
                <input
                  type="checkbox"
                  checked={visibleFields[key]}
                  onChange={() => handleToggleField(key)}
                />
                <span>{label}</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>Program Access</h3>

        <div className="toggle-item">
          <label>
            <input
              type="checkbox"
              checked={program?.tenant?.settings?.publicProfile}
              onChange={(e) => updateSettings.mutate({
                publicProfile: e.target.checked
              })}
            />
            <span>Public Program Page</span>
          </label>
          <p className="hint">Allow anyone to view your program page</p>
        </div>

        <div className="toggle-item">
          <label>
            <input
              type="checkbox"
              checked={program?.tenant?.settings?.allowRegistration}
              onChange={(e) => updateSettings.mutate({
                allowRegistration: e.target.checked
              })}
            />
            <span>Allow Fan Sign-ups</span>
          </label>
          <p className="hint">Let new fans join your program</p>
        </div>
      </section>
    </div>
  );
}
```

**Deliverables for Phase 0:**
- ✅ Profile data visibility controls working
- ✅ Branding applied consistently across all pages
- ✅ Settings management UI functional
- ✅ All existing toggles connected to backend
- ✅ Documentation of current branding capabilities

---

## 🎨 PHASE 1: Enhanced Branding for All (Weeks 2-3)

**Goal:** Give EVERY user (creator, brand, agency) powerful customization tools to make their program feel uniquely theirs

### 1.1 Enhanced Branding Schema

**Expand current branding capabilities:**

```sql
-- migrations/0028_enhance_branding_system.sql

-- Update tenants table with expanded branding
ALTER TABLE tenants DROP COLUMN IF EXISTS branding;

-- Recreate with comprehensive branding options
ALTER TABLE tenants ADD COLUMN branding jsonb DEFAULT '{
  "theme": {
    "mode": "light",
    "colors": {
      "primary": "#6366f1",
      "secondary": "#8b5cf6",
      "accent": "#ec4899",
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "background": "#ffffff",
      "surface": "#f9fafb",
      "text": {
        "primary": "#111827",
        "secondary": "#6b7280",
        "muted": "#9ca3af"
      }
    },
    "typography": {
      "fontFamily": {
        "heading": "Inter, system-ui, sans-serif",
        "body": "Inter, system-ui, sans-serif",
        "mono": "Menlo, monospace"
      },
      "fontSize": {
        "xs": "0.75rem",
        "sm": "0.875rem",
        "base": "1rem",
        "lg": "1.125rem",
        "xl": "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem"
      },
      "fontWeight": {
        "normal": "400",
        "medium": "500",
        "semibold": "600",
        "bold": "700"
      }
    },
    "spacing": {
      "scale": "comfortable",
      "borderRadius": {
        "none": "0px",
        "sm": "0.25rem",
        "md": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "full": "9999px"
      }
    },
    "layout": {
      "cardStyle": "elevated",
      "buttonStyle": "rounded",
      "inputStyle": "outlined"
    }
  },
  "assets": {
    "logo": {
      "primary": null,
      "secondary": null,
      "icon": null,
      "favicon": null,
      "watermark": null
    },
    "images": {
      "banner": null,
      "background": null,
      "ogImage": null
    }
  },
  "customization": {
    "customCSS": null,
    "customJS": null,
    "headHTML": null,
    "footerHTML": null
  },
  "whiteLabel": {
    "level": "basic",
    "hideFandomlyBranding": false,
    "customDomain": null,
    "customSubdomain": null,
    "sslEnabled": false,
    "customTermsUrl": null,
    "customPrivacyUrl": null,
    "customSupportEmail": null,
    "customFooterText": null
  },
  "seo": {
    "metaTitle": null,
    "metaDescription": null,
    "metaKeywords": [],
    "ogTitle": null,
    "ogDescription": null,
    "ogImage": null,
    "twitterCard": "summary_large_image"
  }
}'::jsonb;

COMMENT ON COLUMN tenants.branding IS 'Comprehensive branding and white-label configuration';
```

### 1.2 Visual Theme Builder UI

**Create comprehensive theme customizer:**

```typescript
// client/src/components/branding/ThemeBuilder.tsx

import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

export function ThemeBuilder({ program, onUpdate }: any) {
  const [theme, setTheme] = useState(program?.tenant?.branding?.theme || {});
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  // Update local state when program changes
  useEffect(() => {
    if (program?.tenant?.branding?.theme) {
      setTheme(program.tenant.branding.theme);
    }
  }, [program]);

  // Live preview - update CSS variables immediately
  useEffect(() => {
    const root = document.documentElement;

    if (theme.colors?.primary) {
      root.style.setProperty('--color-primary', theme.colors.primary);
    }
    if (theme.colors?.secondary) {
      root.style.setProperty('--color-secondary', theme.colors.secondary);
    }
    if (theme.colors?.accent) {
      root.style.setProperty('--color-accent', theme.colors.accent);
    }
    if (theme.colors?.background) {
      root.style.setProperty('--color-background', theme.colors.background);
    }
    if (theme.typography?.fontFamily?.heading) {
      root.style.setProperty('--font-heading', theme.typography.fontFamily.heading);
    }
    if (theme.typography?.fontFamily?.body) {
      root.style.setProperty('--font-body', theme.typography.fontFamily.body);
    }
    if (theme.spacing?.borderRadius?.md) {
      root.style.setProperty('--border-radius', theme.spacing.borderRadius.md);
    }
  }, [theme]);

  const updateColor = (path: string, color: string) => {
    const newTheme = { ...theme };
    const pathParts = path.split('.');
    let current = newTheme;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    current[pathParts[pathParts.length - 1]] = color;
    setTheme(newTheme);
  };

  const handleSave = () => {
    onUpdate({
      branding: {
        ...program.tenant.branding,
        theme
      }
    });
  };

  const colorGroups = [
    {
      label: 'Brand Colors',
      colors: [
        { key: 'colors.primary', label: 'Primary', description: 'Main brand color' },
        { key: 'colors.secondary', label: 'Secondary', description: 'Secondary brand color' },
        { key: 'colors.accent', label: 'Accent', description: 'Accent highlights' }
      ]
    },
    {
      label: 'Feedback Colors',
      colors: [
        { key: 'colors.success', label: 'Success', description: 'Success states' },
        { key: 'colors.warning', label: 'Warning', description: 'Warning states' },
        { key: 'colors.error', label: 'Error', description: 'Error states' }
      ]
    },
    {
      label: 'Background Colors',
      colors: [
        { key: 'colors.background', label: 'Background', description: 'Page background' },
        { key: 'colors.surface', label: 'Surface', description: 'Cards and panels' }
      ]
    },
    {
      label: 'Text Colors',
      colors: [
        { key: 'colors.text.primary', label: 'Primary Text', description: 'Main text' },
        { key: 'colors.text.secondary', label: 'Secondary Text', description: 'Subtext' },
        { key: 'colors.text.muted', label: 'Muted Text', description: 'Disabled text' }
      ]
    }
  ];

  return (
    <div className="theme-builder">
      <div className="theme-builder-sidebar">
        <h2>Theme Customization</h2>

        <div className="tabs">
          <button className="tab active">Colors</button>
          <button className="tab">Typography</button>
          <button className="tab">Layout</button>
          <button className="tab">Advanced</button>
        </div>

        <div className="color-groups">
          {colorGroups.map(group => (
            <div key={group.label} className="color-group">
              <h3>{group.label}</h3>

              {group.colors.map(({ key, label, description }) => {
                const color = key.split('.').reduce((obj, k) => obj?.[k], theme) || '#000000';

                return (
                  <div key={key} className="color-item">
                    <div className="color-label">
                      <span className="label">{label}</span>
                      <span className="description">{description}</span>
                    </div>

                    <button
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => setActiveColorPicker(
                        activeColorPicker === key ? null : key
                      )}
                    >
                      <span className="color-value">{color}</span>
                    </button>

                    {activeColorPicker === key && (
                      <div className="color-picker-popover">
                        <HexColorPicker
                          color={color}
                          onChange={(newColor) => updateColor(key, newColor)}
                        />
                        <button
                          className="close-picker"
                          onClick={() => setActiveColorPicker(null)}
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Typography Section */}
        <div className="typography-section">
          <h3>Typography</h3>

          <div className="form-group">
            <label>Heading Font</label>
            <select
              value={theme.typography?.fontFamily?.heading || 'Inter'}
              onChange={(e) => setTheme({
                ...theme,
                typography: {
                  ...theme.typography,
                  fontFamily: {
                    ...theme.typography?.fontFamily,
                    heading: e.target.value
                  }
                }
              })}
            >
              <option value="Inter, system-ui, sans-serif">Inter</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="Montserrat, sans-serif">Montserrat</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
            </select>
          </div>

          <div className="form-group">
            <label>Body Font</label>
            <select
              value={theme.typography?.fontFamily?.body || 'Inter'}
              onChange={(e) => setTheme({
                ...theme,
                typography: {
                  ...theme.typography,
                  fontFamily: {
                    ...theme.typography?.fontFamily,
                    body: e.target.value
                  }
                }
              })}
            >
              <option value="Inter, system-ui, sans-serif">Inter</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="Montserrat, sans-serif">Montserrat</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
            </select>
          </div>
        </div>

        {/* Layout Section */}
        <div className="layout-section">
          <h3>Layout Style</h3>

          <div className="form-group">
            <label>Card Style</label>
            <div className="radio-group">
              {['flat', 'elevated', 'outlined'].map(style => (
                <label key={style} className="radio-option">
                  <input
                    type="radio"
                    name="cardStyle"
                    value={style}
                    checked={theme.layout?.cardStyle === style}
                    onChange={(e) => setTheme({
                      ...theme,
                      layout: { ...theme.layout, cardStyle: e.target.value }
                    })}
                  />
                  <span className="capitalize">{style}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Border Radius</label>
            <select
              value={theme.spacing?.borderRadius?.md || '0.5rem'}
              onChange={(e) => setTheme({
                ...theme,
                spacing: {
                  ...theme.spacing,
                  borderRadius: {
                    ...theme.spacing?.borderRadius,
                    md: e.target.value
                  }
                }
              })}
            >
              <option value="0px">None (Square)</option>
              <option value="0.25rem">Small</option>
              <option value="0.5rem">Medium</option>
              <option value="1rem">Large</option>
              <option value="1.5rem">Extra Large</option>
              <option value="9999px">Full (Pill)</option>
            </select>
          </div>
        </div>

        <div className="actions">
          <button className="btn-secondary" onClick={() => {
            // Reset to defaults
            setTheme(program?.tenant?.branding?.theme || {});
          }}>
            Reset
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Theme
          </button>
        </div>
      </div>

      <div className="theme-builder-preview">
        <div className="preview-header">
          <h3>Live Preview</h3>
          <div className="device-toggles">
            <button className="device-btn active">Desktop</button>
            <button className="device-btn">Tablet</button>
            <button className="device-btn">Mobile</button>
          </div>
        </div>

        <div className="preview-iframe-container">
          <iframe
            src={`/programs/${program.slug}/preview`}
            className="preview-iframe"
            title="Theme Preview"
          />
        </div>
      </div>
    </div>
  );
}
```

### 1.3 Pre-Built Theme Templates

**Give users starting points:**

```typescript
// shared/themeTemplates.ts

export const THEME_TEMPLATES = [
  {
    id: 'modern-purple',
    name: 'Modern Purple',
    description: 'Vibrant purple theme with smooth gradients',
    preview: '/themes/modern-purple.png',
    theme: {
      mode: 'light',
      colors: {
        primary: '#8b5cf6',
        secondary: '#6366f1',
        accent: '#ec4899',
        background: '#ffffff',
        surface: '#f9fafb',
        text: {
          primary: '#111827',
          secondary: '#6b7280',
          muted: '#9ca3af'
        }
      },
      typography: {
        fontFamily: {
          heading: 'Poppins, sans-serif',
          body: 'Inter, system-ui, sans-serif'
        }
      },
      spacing: {
        borderRadius: { md: '1rem' }
      },
      layout: {
        cardStyle: 'elevated'
      }
    }
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Sleek dark theme perfect for gaming',
    preview: '/themes/dark-mode.png',
    theme: {
      mode: 'dark',
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#10b981',
        background: '#0f172a',
        surface: '#1e293b',
        text: {
          primary: '#f1f5f9',
          secondary: '#cbd5e1',
          muted: '#64748b'
        }
      },
      typography: {
        fontFamily: {
          heading: 'Montserrat, sans-serif',
          body: 'Inter, system-ui, sans-serif'
        }
      },
      spacing: {
        borderRadius: { md: '0.5rem' }
      },
      layout: {
        cardStyle: 'outlined'
      }
    }
  },
  {
    id: 'sports-energy',
    name: 'Sports Energy',
    description: 'Bold and energetic for athletes',
    preview: '/themes/sports-energy.png',
    theme: {
      mode: 'light',
      colors: {
        primary: '#ef4444',
        secondary: '#f97316',
        accent: '#fbbf24',
        background: '#ffffff',
        surface: '#fef3c7',
        text: {
          primary: '#1f2937',
          secondary: '#4b5563',
          muted: '#9ca3af'
        }
      },
      typography: {
        fontFamily: {
          heading: 'Montserrat, sans-serif',
          body: 'Roboto, sans-serif'
        }
      },
      spacing: {
        borderRadius: { md: '0.25rem' }
      },
      layout: {
        cardStyle: 'flat'
      }
    }
  },
  {
    id: 'elegant-minimal',
    name: 'Elegant Minimal',
    description: 'Clean and professional for brands',
    preview: '/themes/elegant-minimal.png',
    theme: {
      mode: 'light',
      colors: {
        primary: '#111827',
        secondary: '#6b7280',
        accent: '#3b82f6',
        background: '#ffffff',
        surface: '#f9fafb',
        text: {
          primary: '#111827',
          secondary: '#6b7280',
          muted: '#d1d5db'
        }
      },
      typography: {
        fontFamily: {
          heading: 'Georgia, serif',
          body: 'Inter, system-ui, sans-serif'
        }
      },
      spacing: {
        borderRadius: { md: '0px' }
      },
      layout: {
        cardStyle: 'outlined'
      }
    }
  }
];
```

**Deliverables for Phase 1:**
- ✅ Enhanced branding schema with theme system
- ✅ Visual theme builder UI with live preview
- ✅ Color picker for all brand colors
- ✅ Typography customization
- ✅ Layout style options
- ✅ 10+ pre-built theme templates
- ✅ Import/export theme JSON
- ✅ Theme applied across all pages

---

## 🏢 PHASE 2: Tiered White-Labeling (Weeks 4-5)

**Goal:** Create 3 tiers of white-labeling based on user type

### 2.1 White-Label Tier Definitions

**Tier 1: Creator White-Label** (Hosted on `creator.fandomly.com`)
- ✅ Full theme customization
- ✅ Custom subdomain (aerial-ace.fandomly.com)
- ✅ Logo/favicon replacement
- ✅ Remove "Powered by Fandomly" (optional upgrade)
- ✅ Custom footer text
- ❌ No custom domain
- ❌ No embeddable widgets

**Tier 2: Brand White-Label** (Embeddable widgets)
- ✅ Everything in Tier 1
- ✅ Embeddable widget for external sites
- ✅ Widget customization (size, theme, features)
- ✅ JavaScript SDK for integration
- ✅ Webhook integrations
- ❌ No custom domain (yet)

**Tier 3: Agency White-Label** (Custom domain + full control)
- ✅ Everything in Tier 1 + 2
- ✅ Custom domain (loyalty.yourbrand.com)
- ✅ SSL certificate management
- ✅ Full white-label (zero Fandomly branding)
- ✅ Custom CSS/JS injection
- ✅ Multi-brand management
- ✅ Agency dashboard

### 2.2 Embeddable Widget System

**Widget for brands to embed on their site:**

```typescript
// client/src/components/widgets/LoyaltyWidget.tsx

export function generateWidgetCode(program: any, options: any) {
  const config = {
    programId: program.id,
    theme: options.theme || 'light',
    features: options.features || ['tasks', 'points', 'leaderboard'],
    size: options.size || 'medium',
    position: options.position || 'bottom-right'
  };

  return `
<!-- Fandomly Loyalty Widget -->
<div id="fandomly-widget-${program.id}"></div>
<script src="https://cdn.fandomly.com/widget.js"></script>
<script>
  FandomlyWidget.init({
    programId: '${config.programId}',
    theme: '${config.theme}',
    features: ${JSON.stringify(config.features)},
    size: '${config.size}',
    position: '${config.position}'
  });
</script>
  `.trim();
}

// Widget SDK
// public/widget.js

(function() {
  window.FandomlyWidget = {
    init: function(config) {
      // Create widget container
      const container = document.getElementById(`fandomly-widget-${config.programId}`);
      if (!container) {
        console.error('Fandomly Widget: Container not found');
        return;
      }

      // Create iframe for isolation
      const iframe = document.createElement('iframe');
      iframe.src = `https://app.fandomly.com/widget/${config.programId}?theme=${config.theme}&features=${config.features.join(',')}&size=${config.size}`;
      iframe.style.border = 'none';
      iframe.style.width = config.size === 'small' ? '300px' : config.size === 'large' ? '600px' : '400px';
      iframe.style.height = '500px';
      iframe.style.borderRadius = '12px';
      iframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';

      container.appendChild(iframe);

      // Setup postMessage communication
      window.addEventListener('message', function(event) {
        if (event.origin !== 'https://app.fandomly.com') return;

        // Handle widget events
        if (event.data.type === 'fandomly-widget') {
          switch (event.data.action) {
            case 'task-completed':
              // Trigger custom event for parent site
              window.dispatchEvent(new CustomEvent('fandomly:task-completed', {
                detail: event.data.payload
              }));
              break;
            case 'points-earned':
              window.dispatchEvent(new CustomEvent('fandomly:points-earned', {
                detail: event.data.payload
              }));
              break;
          }
        }
      });
    }
  };
})();
```

### 2.3 Custom Domain Support (Agency Tier)

**DNS Configuration & SSL:**

```typescript
// server/services/custom-domain-service.ts

import dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);

export class CustomDomainService {

  /**
   * Verify custom domain DNS configuration
   */
  async verifyDomain(domain: string, tenantId: string): Promise<{
    verified: boolean;
    errors: string[];
    records: any[];
  }> {
    const errors: string[] = [];
    const records: any[] = [];

    try {
      // Check CNAME record
      const cnames = await resolveCname(domain);

      const expectedCname = `${tenantId}.fandomly.com`;
      const hasFandomlyCname = cnames.some(cname =>
        cname.toLowerCase() === expectedCname.toLowerCase()
      );

      if (!hasFandomlyCname) {
        errors.push(`CNAME record must point to ${expectedCname}`);
      } else {
        records.push({
          type: 'CNAME',
          value: cnames[0],
          status: 'valid'
        });
      }

      return {
        verified: errors.length === 0,
        errors,
        records
      };
    } catch (error: any) {
      errors.push(`DNS lookup failed: ${error.message}`);
      return {
        verified: false,
        errors,
        records
      };
    }
  }

  /**
   * Setup SSL certificate for custom domain
   */
  async setupSSL(domain: string, tenantId: string): Promise<boolean> {
    // In production, integrate with Let's Encrypt or AWS Certificate Manager
    // For now, return success if domain is verified

    const verification = await this.verifyDomain(domain, tenantId);

    if (!verification.verified) {
      throw new Error(`Domain not verified: ${verification.errors.join(', ')}`);
    }

    // TODO: Integrate with Let's Encrypt
    // const acme = require('acme-client');
    // Generate certificate...

    return true;
  }

  /**
   * Get instructions for DNS setup
   */
  getDNSInstructions(tenantId: string, customDomain: string): {
    provider: string;
    steps: string[];
    records: any[];
  } {
    const targetCname = `${tenantId}.fandomly.com`;

    return {
      provider: 'generic',
      steps: [
        'Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)',
        'Navigate to DNS settings',
        'Add a CNAME record:',
        `  - Name/Host: ${customDomain.split('.')[0] === 'www' ? 'www' : '@'}`,
        `  - Type: CNAME`,
        `  - Value/Points to: ${targetCname}`,
        `  - TTL: 3600 (or default)`,
        'Save changes and wait 5-10 minutes for propagation',
        'Come back here and click "Verify Domain"'
      ],
      records: [
        {
          type: 'CNAME',
          name: customDomain.split('.')[0] === 'www' ? 'www' : '@',
          value: targetCname,
          ttl: 3600
        }
      ]
    };
  }
}

export const customDomainService = new CustomDomainService();
```

**Custom Domain Setup UI:**

```typescript
// client/src/components/branding/CustomDomainSetup.tsx

export function CustomDomainSetup({ program }: any) {
  const [domain, setDomain] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<any>(null);

  const verifyDomain = async () => {
    setVerifying(true);
    try {
      const response = await apiClient.post(`/api/programs/${program.id}/verify-domain`, {
        domain
      });
      setVerification(response.data);
    } catch (error) {
      toast.error('Failed to verify domain');
    } finally {
      setVerifying(false);
    }
  };

  const setupDomain = async () => {
    try {
      await apiClient.post(`/api/programs/${program.id}/setup-domain`, {
        domain
      });
      toast.success('Custom domain configured!');
    } catch (error) {
      toast.error('Failed to setup domain');
    }
  };

  const instructions = customDomainService.getDNSInstructions(
    program.tenant.id,
    domain
  );

  return (
    <div className="custom-domain-setup">
      <h2>Custom Domain</h2>
      <p>Host your loyalty program on your own domain</p>

      <div className="form-group">
        <label>Your Domain</label>
        <input
          type="text"
          placeholder="loyalty.yourbrand.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
      </div>

      {domain && (
        <div className="dns-instructions">
          <h3>DNS Configuration Instructions</h3>
          <ol>
            {instructions.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <div className="dns-records">
            <h4>DNS Records to Add:</h4>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Value</th>
                  <th>TTL</th>
                </tr>
              </thead>
              <tbody>
                {instructions.records.map((record, i) => (
                  <tr key={i}>
                    <td><code>{record.type}</code></td>
                    <td><code>{record.name}</code></td>
                    <td><code>{record.value}</code></td>
                    <td>{record.ttl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {verification && (
        <div className={`verification-result ${verification.verified ? 'success' : 'error'}`}>
          {verification.verified ? (
            <>
              <p className="success-message">✅ Domain verified successfully!</p>
              <button className="btn-primary" onClick={setupDomain}>
                Complete Setup & Enable SSL
              </button>
            </>
          ) : (
            <>
              <p className="error-message">❌ Domain verification failed</p>
              <ul>
                {verification.errors.map((error: string, i: number) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="actions">
        <button
          className="btn-primary"
          onClick={verifyDomain}
          disabled={!domain || verifying}
        >
          {verifying ? 'Verifying...' : 'Verify Domain'}
        </button>
      </div>
    </div>
  );
}
```

**Deliverables for Phase 2:**
- ✅ White-label tier system (Basic, Brand, Agency)
- ✅ Embeddable widget with JavaScript SDK
- ✅ Widget customization options
- ✅ Custom domain support for Agency tier
- ✅ DNS verification system
- ✅ SSL certificate automation
- ✅ White-label settings UI
- ✅ Widget embed code generator

---

## 🔗 PHASE 3: Webhooks & Integration (Weeks 6-7)

**Goal:** Enable brands/agencies to integrate loyalty into their existing systems

*(Keep the webhooks implementation from the original roadmap - it's perfect!)*

**Why webhooks come AFTER white-labeling:**
- Brands need to see their program fully customized first
- Then they want to integrate it into their existing systems
- Webhooks enable real-time sync with their CRM, email tools, analytics, etc.
- Widget + webhooks = seamless external embedding

---

## 🎯 Updated Success Metrics

### Phase 0 (Foundation Fixes)
- [ ] All existing toggles functional
- [ ] Settings management UI working
- [ ] Branding applied across 100% of pages
- [ ] Zero frontend-backend disconnections

### Phase 1 (Enhanced Branding)
- [ ] Theme builder with live preview
- [ ] 10+ theme templates available
- [ ] 90%+ of creators customize their theme
- [ ] Average time to brand: < 10 minutes

### Phase 2 (White-Labeling)
- [ ] Widget embed code working on external sites
- [ ] Custom domain setup < 15 minutes
- [ ] SSL certificates auto-generated
- [ ] 50%+ of brands use embeddable widget

### Phase 3 (Webhooks)
- [ ] Webhook delivery success rate > 95%
- [ ] Average webhook response time < 500ms
- [ ] 30%+ of brands use webhooks
- [ ] Zero security vulnerabilities

---

## 💰 Updated Cost Estimate

**Phase 0-2 Focus (Weeks 1-5):**
- 1 Frontend Engineer (5 weeks) - Theme builder, widget, UI
- 1 Backend Engineer (5 weeks) - Settings endpoints, custom domain, DNS
- 1 Designer (2 weeks) - Theme templates, widget designs

**Infrastructure:**
- No additional costs for Phase 0-1
- Phase 2: SSL cert management (~$50/mo for Let's Encrypt automation)
- Phase 2: CDN for widget.js hosting (~$20/mo)

---

## ✅ Immediate Action Items

1. **Phase 0 Sprint Planning (This Week)**
   - Audit all frontend toggles
   - Document what's connected vs disconnected
   - Create tickets for each disconnection

2. **Design Phase 1 (This Week)**
   - Design theme builder UI mockups
   - Create 5 theme templates
   - Design widget appearance options

3. **Architecture Phase 2 (Next Week)**
   - Design widget architecture (iframe vs SDK)
   - Plan custom domain DNS flow
   - Design Agency tier features

---

**This revised roadmap puts customization FIRST** - exactly what you need to make every creator/brand/agency feel like the platform is truly theirs! 🎨

Then webhooks come in to complete the integration story for brands who want to embed on external sites.

Perfect alignment with your vision! 🚀
