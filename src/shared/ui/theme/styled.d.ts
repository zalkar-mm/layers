import type { Theme } from './theme'

import 'styled-components'

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
