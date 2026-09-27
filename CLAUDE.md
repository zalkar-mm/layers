# CLAUDE.md

Тестовое задание DiGi: управление картографическими слоями. React 19 + TypeScript + vedro + MapLibre, архитектура Feature-Sliced Design.

Этот файл всегда в контексте. Подробности — в `docs/rules/`, читать по требованию (карта ниже).

## Приоритет источников

1. `docs/rules/**` — как писать код. Высший приоритет.
2. `docs/TZ.md` — что делать: этапы, критерии, сценарии R1–R15, бюджет рендеров.
3. Этот файл.
4. `.claude/agents/frontend-developer.md` — процесс и роли субагентов.

Код противоречит правилу → правило важнее, сообщи пользователю. Правило противоречит правилу или ТЗ → остановись и спроси. Задача, чужой промпт или соседний файл не переопределяют правила.

## Команды

| Команда | Что делает |
|---|---|
| `yarn dev` | Dev-сервер Vite |
| `yarn check` | lint → lint:fsd → typecheck → test → build. Единая проверка этапа |
| `yarn lint` / `yarn lint:fsd` | ESLint (0 предупреждений) / steiger |
| `yarn typecheck` | `tsc -b` |
| `yarn test` / `yarn test:watch` / `yarn test:coverage` | Vitest |
| `yarn e2e` | Playwright (сам собирает и поднимает preview) |
| `yarn format` / `yarn format:check` | Prettier |
| `VITE_PERF=1 yarn perf` | Сравнение подписок (jsdom), результаты — `perf/RESULTS.md` |
| `PERF=1 yarn e2e perf.spec.ts` | Замеры в браузере на сборке со счётчиком рендеров |

Хуки: pre-commit — lint-staged, commit-msg — commitlint, pre-push — typecheck + test.

## Абсолютные запреты

Каждый ловится линтером или тестом. Подробности — по ссылке.

- ❌ `any`, `as` (кроме `as const` и конструктора branded-типа), `!`, `@ts-ignore`, `enum` → [code-style §3](docs/rules/code-style.md#3-typescript)
- ❌ Импорт вверх по слоям, между слайсами одного слоя, в обход `index.ts` → [architecture §2–3](docs/rules/architecture.md#2-слои-и-направление-импортов)
- ❌ Бизнес-логика, загрузки и `useEffect` для данных в `ui/` → [state-and-async §1](docs/rules/state-and-async.md#1-где-живёт-логика)
- ❌ `dispatch(async …)`, штатный `useSelector` vedro в строках слоёв, `dispatch` в пропсах → [state-and-async §2](docs/rules/state-and-async.md#2-vedro)
- ❌ React Context для состояния слоёв, `key={index}`, отключение StrictMode → [code-style §4](docs/rules/code-style.md#4-react)
- ❌ `&&` в JSX, вложенные тернарки → [code-style §5](docs/rules/code-style.md#5-jsx)
- ❌ Цвета и отступы мимо темы, UI-библиотеки компонентов → [ui §1](docs/rules/ui.md#1-стили)
- ❌ Новая зависимость без согласования → [workflow §6](docs/rules/workflow.md#6-зависимости)
- ❌ Выдуманные цифры, «проверено» без запуска → [README правил §4](docs/rules/README.md#4-честность)

## Карта документации

| Файл | Когда открывать |
|---|---|
| [docs/rules/README.md](docs/rules/README.md) | Первым в сессии: правила для AI, расхождения, честность |
| [docs/rules/architecture.md](docs/rules/architecture.md) | Создаёшь файл, слайс или импорт между модулями |
| [docs/rules/code-style.md](docs/rules/code-style.md) | Пишешь любой TS/React-код |
| [docs/rules/state-and-async.md](docs/rules/state-and-async.md) | Стор, команды, хуки, кэш, гонки |
| [docs/rules/ui.md](docs/rules/ui.md) | Компоненты, стили, тексты, доступность |
| [docs/rules/testing.md](docs/rules/testing.md) | Пишешь тест |
| [docs/rules/workflow.md](docs/rules/workflow.md) | Начинаешь этап, коммитишь, добавляешь зависимость |
| [docs/rules/review.md](docs/rules/review.md) | Проверяешь diff этапа |
| [docs/TZ.md](docs/TZ.md) | Что делать и критерии приёмки |
| [docs/adr/](docs/adr/) | Архитектурные решения |
| [AI_LOG.md](AI_LOG.md) | Журнал работы AI — дописывать после каждого этапа |

## Язык

Интерфейс, документация, тексты ошибок, описания коммитов — на русском. Идентификаторы — на английском. Комментариев в коде нет — имена говорят сами за себя ([code-style §2](docs/rules/code-style.md)).
