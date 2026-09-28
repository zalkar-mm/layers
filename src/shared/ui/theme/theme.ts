export const theme = {
  colors: {
    background: '#f6f7f9',
    surface: '#ffffff',
    border: '#d9dde3',
    text: '#1c2230',
    textMuted: '#5d6675',
    accent: '#2563eb',
    danger: '#c62828',
    success: '#2e7d32',
    warning: '#8a5300',
    surfaceMuted: '#eef1f5',
    focus: '#1d4ed8',
    accentText: '#ffffff',
    debug: '#7c3aed',
  },
  space: {
    xxs: '2px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radii: {
    sm: '4px',
    md: '8px',
  },
  fontWeights: {
    regular: 400,
    semibold: 600,
  },
  fontSizes: {
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '20px',
  },
  breakpoints: {
    desktop: '1024px',
  },
  sizes: {
    control: '32px',
    touchTarget: '44px',
    focusRing: '2px',
    sidebar: '360px',
  },
  shadows: {
    floating: '0 1px 4px rgb(0 0 0 / 15%)',
  },
} as const

export type Theme = typeof theme
