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
  },
  space: {
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
    touchTarget: '44px',
    sidebar: '360px',
  },
} as const

export type Theme = typeof theme
