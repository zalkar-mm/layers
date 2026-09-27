import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
    margin: 0;
  }

  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: ${({ theme }) => theme.fontSizes.md};
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.background};
  }
`
