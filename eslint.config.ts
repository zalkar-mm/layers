import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import boundaries from 'eslint-plugin-boundaries'
import playwright from 'eslint-plugin-playwright'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import testingLibrary from 'eslint-plugin-testing-library'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] as const
const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities']

const RESTRICTED_SYNTAX = [
  {
    selector: 'TSEnumDeclaration',
    message: 'enum запрещён. Используй объект `as const` и тип из него (code-style.md §3).',
  },
  {
    selector: "JSXExpressionContainer > LogicalExpression[operator='&&']",
    message:
      '`&&` в JSX запрещён: `0` и `""` рендерятся текстом. Используй тернарку или ранний return (code-style.md §5).',
  },
  {
    selector:
      'CallExpression[callee.name=/^(useEffect|useLayoutEffect)$/] CallExpression[callee.name=/^fetch/]',
    message:
      'Загрузка в useEffect запрещена. Загрузку запускают команды из model (state-and-async.md §1).',
  },
]

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', '.yarn']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // конструктор branded-типа, с eslint-disable-next-line и комментарием (code-style.md §3).
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: false }],

      'no-restricted-syntax': ['error', ...RESTRICTED_SYNTAX],
      'no-nested-ternary': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'object-shorthand': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],

      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react$', '^react-dom', '^react/'],
            ['^node:', '^@?\\w'],
            ...LAYERS.map((layer) => [`^@/${layer}(/.*|$)`]),
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^\\u0000'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      ...reactHooks.configs.flat.recommended.plugins,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        ...SLICED_LAYERS.map((layer) => ({
          type: layer,
          pattern: `src/${layer}/*`,
          capture: ['slice'],
        })),
        { type: 'shared', pattern: 'src/shared/lib/*', capture: ['segment'] },
        { type: 'shared', pattern: 'src/shared/*', capture: ['segment'] },
      ],
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vedro',
              importNames: ['default'],
              message:
                'Стор создаётся через createVedroStore из @/shared/lib/vedro (CJS-interop прод-сборки).',
            },
            {
              name: 'vedro',
              importNames: ['useVedroSelector'],
              message:
                'Штатный селектор vedro не используем: подписка через хуки entities/layer (ТЗ §4.3).',
            },
          ],
        },
      ],

      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'Нарушена граница FSD: {{from.element.type}} не может импортировать {{to.element.type}}{{#if to.element.captured.slice}}/{{to.element.captured.slice}}{{/if}} (docs/rules/architecture.md §2).',
          policies: [
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            { allow: { dependency: { relationship: { to: 'internal' } } } },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: { element: { type: ['pages', 'widgets', 'features', 'entities', 'shared'] } },
              },
            },
            {
              from: { element: { type: 'pages' } },
              allow: { to: { element: { type: ['widgets', 'features', 'entities', 'shared'] } } },
            },
            {
              from: { element: { type: 'widgets' } },
              allow: { to: { element: { type: ['features', 'entities', 'shared'] } } },
            },
            {
              from: { element: { type: 'features' } },
              allow: { to: { element: { type: ['entities', 'shared'] } } },
            },
            {
              from: { element: { type: 'entities' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              disallow: {
                to: {
                  element: {
                    type: ['pages', 'widgets', 'features', 'entities', 'shared'],
                    fileInternalPath: '!index.ts',
                  },
                },
              },
              message:
                'Импорт в обход public API: из чужого слайса можно брать только его index.ts (architecture.md §3).',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/shared/lib/vedro/**'],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    files: [
      'src/**/*.test.{ts,tsx}',
      'docs/vedro-findings/**/*.test.{ts,tsx}',
      'perf/**/*.test.{ts,tsx}',
    ],
    extends: [vitest.configs.recommended, testingLibrary.configs['flat/react']],
    rules: {
      'vitest/consistent-test-it': ['error', { fn: 'it' }],
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'expect*'] }],
      'vitest/no-focused-tests': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': false }],
    },
  },
  {
    files: ['e2e/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
    },
  },

  {
    files: ['*.config.ts', 'vitest.setup.ts'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
  },

  prettier,
])
