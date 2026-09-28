# Стиль кода

Смежные темы: [architecture.md](architecture.md), [ui.md](ui.md), [state-and-async.md](state-and-async.md).

Форматирование — Prettier (`semi: false`, одинарные кавычки, 100 символов). О форматировании не спорим и не пишем правил: `yarn format`.

## 1. Нейминг

| Что | Как | Пример |
|---|---|---|
| Файлы и папки | kebab-case | `layer-row.tsx`, `mock-layer-api/` |
| Компоненты | PascalCase, именованный экспорт | `export function LayerRow` |
| Хуки | `use` + PascalCase, файл `use-x.ts` | `useNow` в `use-now.ts` |
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
- **Исчерпывающий `switch`** по дискриминанту union без `default` — `switch-exhaustiveness-check` — там, где ветке нужно сужение типа (`transitions.ts`, `row-view.ts`, `status.ts`). Если нужен `default`, в нём `assertNever(value)` c типом `never`. Справочник значений без сужения — `Record`-карта ([§5](#5-jsx)).
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
- **React Context для состояния слоёв запрещён** — перерисовывает всех потребителей. Context — только для статики: тема и `Provider` vedro из `bindVedroStore`. Последний держит экземпляр стора, а не состояние: его значение не меняется, подписку держит `useSelector` ([ADR 009](../adr/009-standard-vedro-api.md)).
- **StrictMode не отключается.** Двойной рендер в dev учитывается в тестах явно.
- **React Compiler не используется** ([ADR 007](../adr/007-no-react-compiler.md)): бюджет рендеров доказывается ручным контролем.

### Мемоизация

`memo`, `useMemo`, `useCallback` — **только там, где этого требует бюджет рендеров** (ТЗ §8), и каждый такой случай подтверждён тестом счётчика рендеров. Профилактическая мемоизация запрещена.

Компонент в `memo` получает стабильные пропсы: `id`, примитивы, стабильные ссылки. Новый объект, массив или стрелка в пропсах `memo`-компонента ломают мемоизацию — такое ловится тестом рендеров и на ревью.

## 5. JSX

Разметка без JS: в JSX — только чтение переменных и полей. Всё остальное считается в теле компонента.

- ❌ **Условный рендер в разметке** — ни `&&` (`0` и `""` рендерятся текстом), ни тернарка. Условие уходит в компонент с говорящим именем и ранним `return`:
  ```tsx
  // ❌
  {error && <ErrorText />}
  {error === null ? null : <ErrorText error={error} />}
  // ✅
  <LoadErrorText error={error} />

  function LoadErrorText({ error }: LoadErrorTextProps) {
    if (error === null) return null

    return <ErrorText>{error.message}</ErrorText>
  }
  ```
- ❌ **Тернарки в JSX запрещены совсем**, даже когда обе ветки что-то рендерят, в том числе внутри `.map` и шаблонных строк. Значение — в константу тела (`const spamText = spamming ? 'Спам-клик…' : 'Спам-клик'`), выбор компонента — через `Record`-карту или ранний `return`.
- ❌ **Справочники `switch`/`if`-цепочкой.** Соответствие «статус/`kind` → подпись, цвет, компонент» — карта `Record<LoadState['kind'], …>`: новое значение справочника ломает компиляцию там, где карта неполна. Исчерпывающий `switch` остаётся, только когда ветке нужно сужение union ([§3](#3-typescript)). Вложенные тернарки запрещены и вне JSX.
- ❌ **Вычисления в атрибутах и разметке.** Шаблонные строки, вызовы функций, сравнения, `!x`, объекты `style` — в локальные константы тела: `` const label = `Слой «${title}»` ``, затем `aria-label={label}`. Чтение поля (`view.opacity`, `ids[item.index]`) — не вычисление.
- ❌ **Инлайн-функции и вызовы в обработчиках** (`onClick={() => …}`, `onClick={open.bind(null, id)}`, `onClick={makeHandler(id)}`) — и в DOM-элементах, и в компонентах. Пропы — `onX`, локальная реализация в теле — `handleX`:
  ```tsx
  // ❌
  <button onClick={() => onOpen(id)}>Открыть</button>
  // ✅
  const handleClick = () => {
    onOpen(id)
  }

  return <button onClick={handleClick}>Открыть</button>
  ```
  Обработчик без своей логики не оборачиваем ([§1](#1-нейминг)) — передаём функцию напрямую: `onChange={setMinDelayMs}`, `onToggle={toggleCache}`. Поэтому команды в `model` принимают одно значение: `(value) => void`. В `.map` обработчик с аргументом — повод вынести подкомпонент (`StressModeOption` с `handleChange`).
- Пропсы компонента — именованный тип `type XProps`, а не литерал в параметрах.

## 6. Ошибки

- Ошибки домена — типизированные значения (`{ kind: 'network' | 'server' | 'timeout'; message }`), а не `throw new Error` со строкой.
- `AbortError` — не ошибка, отдельная ветка ([state-and-async §4](state-and-async.md#4-гонки)).
- `catch (error)` — `error: unknown`, сужаем перед использованием.
- `console.log` запрещён, `console.warn/error` — только осмысленно.

## Что запрещено

- ❌ `any`, `as` (кроме `as const` и branded), `!`, `@ts-ignore`, `@ts-nocheck`, `enum` — ESLint.
- ❌ Неисчерпывающий `switch` по union — ESLint.
- ❌ `&&` и тернарки в JSX, инлайн-функции и вызовы в обработчиках `onX` — ESLint (`no-restricted-syntax`); вложенные тернарки — ESLint (`no-nested-ternary`).
- ❌ Справочник `switch`/`if`-цепочкой вместо `Record`, вычисления в атрибутах, пропсы без `XProps` — ревью.
- ❌ `fetch`/загрузка внутри `useEffect` — ESLint (селектор) + ревью.
- ❌ `console.log` — ESLint.
- ❌ Экспорт по умолчанию, `key={index}`, Context для состояния слоёв, профилактическая мемоизация — ревью.
