# Стиль кода

Смежные темы: [architecture.md](architecture.md), [ui.md](ui.md), [state-and-async.md](state-and-async.md).

Форматирование — Prettier (`semi: false`, одинарные кавычки, 100 символов). О форматировании не спорим и не пишем правил: `yarn format`.

## 1. Нейминг

| Что | Как | Пример |
|---|---|---|
| Файлы и папки | kebab-case | `layer-row.tsx`, `mock-layer-api/` |
| Компоненты | PascalCase, именованный экспорт | `export function LayerRow` |
| Хуки | `use` + PascalCase, файл `use-x.ts` | `useLayer` в `use-layer.ts` |
| Константы-реестры | SCREAMING_SNAKE или `as const`-объект | `LAYER_REGISTRY` |
| Типы | PascalCase, без префиксов `I`/`T` | `LayerState` |
| Проп-обработчик | `on[Action]` | `onToggle` |
| Локальный обработчик | `handle[Action]` | `handleToggle` |
| Булевы | `is/has/can/should` | `isEnabled` |

Экспорт по умолчанию не используем — только именованные.

Обработчик, который просто пробрасывается, не оборачиваем: `onChange={onChange}`, а не `handleChange = (v) => onChange(v)`.

## 2. Комментарии

Комментариев в коде нет. Имя файла, функции, переменной и теста должно само говорить, что происходит. Если без комментария непонятно — переименовать или вынести кусок в функцию с говорящим именем.

Исключения — директивы, которые меняют поведение инструментов: `// eslint-disable-next-line <правило>`, `// @ts-expect-error` в тестах типов, `/// <reference …>`. Без пояснений.

Обоснования решений живут в ADR, `AI_LOG.md` и названиях тестов, а не в коде.

## 3. TypeScript

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — не ослаблять.
- **Вместо `any`** — `unknown` и сужение.
- **Вместо `as`** — type guard, discriminated union, `satisfies`. Разрешены только `as const` и конструктор branded-типа:
  ```ts
  export type LayerId = string & { readonly __brand: 'LayerId' }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const toLayerId = (value: string): LayerId => value as LayerId
  ```
- **Вместо `!`** — явная проверка и понятная ошибка.
- **Вместо `enum`** — объект `as const`:
  ```ts
  const RENDER_KIND = { fill: 'fill', arrows: 'arrows' } as const
  type RenderKind = (typeof RENDER_KIND)[keyof typeof RENDER_KIND]
  ```
- **Невозможные состояния непредставимы в типах.** Состояние загрузки — discriminated union по `kind`, а не набор опциональных полей.
- **Исчерпывающий `switch`** по union без `default` — `switch-exhaustiveness-check`. Если нужен `default`, в нём `assertNever(value)` c типом `never`.
- Поле, которое «может отсутствовать», — `T | null` и обязательное, если читатель обязан проверить (как `stale` в ТЗ §4.2). Опциональное `?:` — только для действительно необязательного.
- `type`, а не `interface` (`consistent-type-definitions`). Исключение — расширение чужих интерфейсов (`DefaultTheme`).
- Данные только для чтения — `readonly T[]`, `Readonly<Record<…>>`.

## 4. React

- Компоненты — функции. Хуки — только на верхнем уровне, **хук после раннего `return` запрещён**.
- **Загрузки в `useEffect` запрещены** — загрузку запускают команды ([state-and-async §1](state-and-async.md#1-где-живёт-логика)).
- `useEffect` — только для синхронизации с внешней системой (MapLibre, таймер, подписка) и всегда с очисткой.
- Производное значение считается при рендере, а не кладётся в `useState` через `useEffect`.
- Сброс состояния при смене сущности — `key`, а не эффект.
- `key` — стабильный id (`layerId`), никогда не индекс.
- **React Context для состояния слоёв запрещён** — перерисовывает всех потребителей. Context — только для статики (тема, экземпляр стора).
- **StrictMode не отключается.** Двойной рендер в dev учитывается в тестах явно.
- **React Compiler не используется** ([ADR 007](../adr/007-no-react-compiler.md)): бюджет рендеров доказывается ручным контролем.

### Мемоизация

`memo`, `useMemo`, `useCallback` — **только там, где этого требует бюджет рендеров** (ТЗ §8), и каждый такой случай подтверждён тестом счётчика рендеров. Профилактическая мемоизация запрещена.

Компонент в `memo` получает стабильные пропсы: `id`, примитивы, стабильные ссылки. Новый объект, массив или стрелка в пропсах `memo`-компонента ломают мемоизацию — такое ловится тестом рендеров и на ревью.

## 5. JSX

- ❌ **`&&` в JSX** — `0` и `""` рендерятся текстом. Одиночная тернарка или ранний `return`:
  ```tsx
  // ❌
  {error && <ErrorText />}
  // ✅
  {error === null ? null : <ErrorText error={error} />}
  ```
- ❌ **Вложенные тернарки.** Больше двух веток — карта `Record<LoadState['kind'], …>` или ранний `return`.
- Вычисления сложнее чтения переменной — в тело компонента, не в атрибут.
- Инлайн-стрелки в пропсах `memo`-компонентов запрещены (на ревью). В обычных DOM-элементах допустимы.

## 6. Ошибки

- Ошибки домена — типизированные значения (`{ kind: 'network' | 'server' | 'timeout'; message }`), а не `throw new Error` со строкой.
- `AbortError` — не ошибка, отдельная ветка ([state-and-async §4](state-and-async.md#4-гонки)).
- `catch (error)` — `error: unknown`, сужаем перед использованием.
- `console.log` запрещён, `console.warn/error` — только осмысленно.

## Что запрещено

- ❌ `any`, `as` (кроме `as const` и branded), `!`, `@ts-ignore`, `@ts-nocheck`, `enum` — ESLint.
- ❌ Неисчерпывающий `switch` по union — ESLint.
- ❌ `&&` в JSX, вложенные тернарки — ESLint.
- ❌ `fetch`/загрузка внутри `useEffect` — ESLint (селектор) + ревью.
- ❌ `console.log` — ESLint.
- ❌ Экспорт по умолчанию, `key={index}`, Context для состояния слоёв, профилактическая мемоизация — ревью.
