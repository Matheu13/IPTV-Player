/**
 * UI Design System Tokens (Cinematic Command OS - Hybrid A + B)
 *
 * Theme hierarchy:
 * Background -> Primary Surface -> Secondary Surface -> Elevated Surface -> Focus / Active
 */

/**
 * UI Design System Tokens (Cinematic Command OS - Hybrid A + B)
 *
 * Theme hierarchy:
 * Background -> Primary Surface -> Secondary Surface -> Elevated Surface -> Focus / Active
 *
 * Performance-first: Large scrolling surfaces use solid opaque layers.
 * Backdrop blur is restrained strictly to floating OSD bars, modal dialogs, and elevated controls.
 */

export const UI_THEME = {
  colors: {
    // Canvas & Backdrops (Deep Obsidian / Slate neutrals <5% sat)
    background: '#080b11',
    backgroundSubtle: '#0c1018',
    surfacePrimary: '#111722',
    surfaceSecondary: '#161e2c',
    surfaceElevated: '#1e293b',
    surfaceOpaqueList: '#0f1420',
    surfaceGlass: 'rgba(17, 23, 34, 0.88)',
    surfaceGlassElevated: 'rgba(30, 41, 59, 0.92)',

    // Accents & Signals
    accentPrimary: '#38bdf8', // Sky 400
    accentSecondary: '#6366f1', // Indigo 500
    accentHover: '#0ea5e9',
    focusRing: '#38bdf8',
    focusGlow: 'rgba(56, 189, 248, 0.40)',

    // Status & Semantic
    liveBadge: '#ef4444',
    liveGlow: 'rgba(239, 68, 68, 0.35)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e',

    // Text Tiers
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textInverted: '#090d16',

    // Borders & Dividers
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderMedium: 'rgba(255, 255, 255, 0.12)',
    borderFocus: '#38bdf8',
  },

  typography: {
    fontDisplay: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    sizes: {
      display: 'text-2xl lg:text-3xl font-extrabold tracking-tight',
      screenTitle: 'text-xl lg:text-2xl font-bold tracking-tight',
      sectionTitle: 'text-xs lg:text-sm font-semibold tracking-wider uppercase text-slate-400',
      channelTitle: 'text-sm lg:text-base font-bold',
      programmeTitle: 'text-xs lg:text-sm font-medium',
      body: 'text-sm font-normal',
      meta: 'text-xs font-mono',
      smallMeta: 'text-[11px] font-mono',
    },
  },

  density: {
    compact: {
      rowHeight: 'h-10',
      rowPadding: 'py-1.5 px-2.5',
      logoSize: 'w-7 h-7',
      titleSize: 'text-xs font-semibold',
      programmeSize: 'text-[11px]',
      gap: 'gap-2',
    },
    comfortable: {
      rowHeight: 'h-14',
      rowPadding: 'py-2.5 px-3.5',
      logoSize: 'w-10 h-10',
      titleSize: 'text-sm font-bold',
      programmeSize: 'text-xs',
      gap: 'gap-3',
    },
    spacious: {
      rowHeight: 'h-18',
      rowPadding: 'py-3.5 px-4',
      logoSize: 'w-12 h-12',
      titleSize: 'text-base font-bold',
      programmeSize: 'text-sm',
      gap: 'gap-4',
    },
  },

  radius: {
    sm: 'rounded-md', // 6px
    md: 'rounded-lg', // 8px
    lg: 'rounded-xl', // 12px
    xl: 'rounded-2xl', // 16px
    pill: 'rounded-full',
  },

  elevation: {
    flat: 'shadow-none',
    card: 'shadow-md shadow-black/40',
    elevated: 'shadow-xl shadow-black/60',
    glass: 'backdrop-blur-md bg-opacity-90 shadow-2xl shadow-black/70',
    focusGlow: 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#080b11] shadow-[0_0_18px_rgba(56,189,248,0.40)]',
  },

  transitions: {
    fast: 'transition-all duration-150 ease-out',
    snappy: 'transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: 'transition-all duration-300 ease-in-out',
  },
};
