# Тесты

Смежные темы: [state-and-async.md](state-and-async.md), [workflow.md](workflow.md).

## 1. Что и где

| Что | Инструмент | Где лежит |
|---|---|---|
| Чистые функции, машина состояний, кэш | Vitest | `tests/unit/entities/layer/model/loading/cache.test.ts` |
| Команды и гонки R1–R15 | Vitest + фейковые таймеры | `tests/unit/entities/layer/model/loading/layer-service/` |
| Компоненты, бюджет рендеров §8 | Vitest + RTL + счётчик рендеров | `tests/unit/widgets/layer-panel/ui/layer-panel.test.tsx` |
| Карта: `MapSync`, стратегии отрисовки, центроиды heatmap | Vitest + фейковый порт карты | `tests/unit/widgets/map-view/` |
| Полнота `Record`-карт по union (новый вид не забыт) | Vitest + `@ts-expect-error` | `render-strategies.test.ts`, `render-kind-traits.test.ts` |
| Пользовательские сценарии E1–E6, доступность | Playwright | `tests/e2e/scenarios/` |
| Тач-зоны не перекрывают соседей | Playwright, зонд `elementFromPoint` | `tests/e2e/scenarios/touch-targets.spec.ts` |
| Замеры производительности | Vitest, Playwright | `tests/perf/`, `tests/e2e/measurements/` |
| Находки vedro V1–V7, N1 | Vitest | `docs/vedro-findings/` |

Тесты не лежат рядом с кодом: `src` — только продакшн-код. Структура `tests/unit` повторяет `src`: тест файла `src/X/y.ts` — `tests/unit/X/y.test.ts`. Импорт тестируемого кода — по алиасу `@/…`, можно в обход public API слайса.

Новая чистая функция или команда — тест в том же коммите. Для логики (этапы 2–4, 6, 10) тест пишется **раньше** реализации и сначала падает.

Имена тестов — на русском, описывают поведение: `it('отбрасывает ответ устаревшего запроса')`. Сценарий из ТЗ — номер в имени: `it('R1: …')`.

## 2. Unit-тесты команд и гонок

- `vi.useFakeTimers()` и фиксированный seed mock API — иначе тесты гонок нестабильны.
- Время двигаем явно: `await vi.advanceTimersByTimeAsync(ms)`.
- Команды тестируются **без рендера**: вызвать команду → проверить состояние стора и число запросов в полёте.
- Состояние между тестами не течёт: свежий стор и `cache.reset()` в `beforeEach`.
- Проверяем не только итог, но и отсутствие промежуточных состояний (R2: `success` не появляется ни на один кадр) — через подписку на стор и запись истории.

## 3. Тесты рендеров

- Счётчик рендеров из `shared/lib/dev` [этап 6], проверки по таблице §8 ТЗ, одна строка таблицы — один тест.
- Компонент рендерится через `renderWithStores` из `@tests/render-with-stores` (`tests/support`): тема, провайдеры сторов vedro и StrictMode. Без провайдеров `useSelector` не работает.
- **StrictMode включён и в тестах.** Двойной рендер учитывается в ожидаемых числах явно, и это видно из названия теста или константы.
- Действия — через `userEvent`. Исключение — тесты на фейковых таймерах Vitest: `userEvent` после действия ждёт `setTimeout(0)` через RTL, а RTL прокручивает его только для таймеров Jest, и тест зависает. Там — `fireEvent`.
- Счётчик рендеров считает коммиты компонента; бейдж статуса со своим тиком — отдельный компонент, его тик строку не перерисовывает.

## 4. Селекторы

Приоритет RTL и Playwright одинаковый:

1. `getByRole` с `name` — основной способ.
2. `getByLabelText`.
3. `getByText` — для статичного текста.
4. `data-testid` — только когда у элемента нет роли (canvas карты, dev-оверлей).

Селекторы по CSS-классам и структуре DOM запрещены — styled-components генерирует классы.

## 5. E2E

- `yarn e2e` сам собирает проект и поднимает `vite preview`.
- Проекты: `desktop` (1440×900) и `mobile` (360×740). Локаль `ru-RU`, пояс `Asia/Bishkek`.
- Сценарии управляют mock API через Chaos-панель (доля ошибок, seed), а не через моки сети. Общие шаги — `tests/e2e/helpers.ts`.
- Зонд `touch-targets.spec.ts` обходит все контролы обеих вкладок и проверяет, что их не перекрывают тач-зоны соседей ([ui §1.1](ui.md#11-тач-цели)). Контролы зонд находит сам; новое состояние панели, в котором появляются кнопки, — повод добавить его в сценарий зонда.
- `test.only` запрещён (`forbidOnly` в CI, правило ESLint).

## Что запрещено

- ❌ Тест без проверки (`expect`) — ESLint (`vitest/expect-expect`).
- ❌ `it.only` / `test.only` — ESLint, Playwright в CI.
- ❌ Реальные таймеры и случайный seed в тестах гонок — ревью.
- ❌ Селекторы по классам и `container.querySelector` — ESLint (testing-library).
- ❌ Отключение StrictMode ради «красивых» чисел — ревью.
