# Архитектура: Feature-Sliced Design

Смежные темы: [code-style.md](code-style.md), [state-and-async.md](state-and-async.md).

## 1. Принцип

FSD — ментальная модель зависимостей, а не повод для церемонии. Цель: по пути файла понятно, что он делает и от чего зависит.

**Против оверинжиниринга** (вакансия: «без избыточного усложнения»):

- Слайс, сегмент и папка создаются, когда появляется код. Пустые заготовки не заводим — steiger их отклоняет.
- Абстракции «на вырост» запрещены. Обобщаем со второго использования (правило двух, [README §2](README.md#2-правила-для-ai-агента)).
- Папка ради одного файла не нужна: `ui/layer-row.tsx`, а не `ui/layer-row/index.tsx`.
- Тестов в `src` нет: они лежат в `tests/`, структура `tests/unit` повторяет `src` ([testing.md](testing.md)).
- Файл больше 200–300 строк — сигнал делить.

## 2. Слои и направление импортов

`app → pages → widgets → features → entities → shared`. Слой импортирует только слои **правее** себя. Слой `processes` не используется.

| Слой | Что лежит | Может импортировать |
|---|---|---|
| `app` | Точка входа, провайдеры (тема, роутер, стор), глобальные стили | всё ниже |
| `pages` | Страница: композиция виджетов, раскладка десктоп/мобильный | widgets, features, entities, shared |
| `widgets` | Крупные самостоятельные блоки UI (`layer-panel`, `map-view`, `chaos-panel`) | features, entities, shared |
| `features` | Действие пользователя: команда + её UI (`layer-control`, `bulk-actions`) | entities, shared |
| `entities` | Бизнес-сущность: типы, реестр, стор, хуки чтения, чистые функции (`layer`) | shared |
| `shared` | Без предметной области: API-клиент, привязки vedro, dev-утилиты, UI-кит, конфиг | shared |

Импорт между слайсами **одного** слоя запрещён. Если слайсу A нужна реакция на слайс B — связку делает слой выше (widget или page). Для `entities` при крайней необходимости — `@x`-нотация, только через ADR.

Проверка: `eslint-plugin-boundaries` (`boundaries/dependencies`) и steiger (`yarn lint:fsd`).

## 3. Слайс и public API

```
entities/layer/
  api/           createLayerApi: запрос к mock API по конфигу слоя
  config/
    layers/      описания слоёв: реальные и синтетические
    registry/    реестр и branded LayerId
    render-kind-traits.ts  свойства вида отрисовки (Record-карта)
  model/
    state/       типы, начальное состояние, переходы машины состояний
    store/       стор vedro и активный набор слоёв
    selectors/   сводка, статус на карте, хуки чтения
    loading/     кэш, лог событий
      layer-service/  движок команд, пачки событий и ответов
    runtime.ts   сборка экземпляров: API, кэш, лог, команды
  lib/           чистые хелперы слайса
  ui/            легенда и статус слоя
  index.ts       public API — единственная точка входа снаружи
```

- **В папке не больше трёх файлов.** Четвёртый — сигнал сгруппировать файлы по назначению во вложенные папки (`model/loading/`, `ui/list/`). `index.ts` считается.
- Имена вложенных папок — по назначению, как у сегментов. Зарезервированные имена сегментов (`ui`, `model`, `api`, `lib`, `config`) внутри сегмента не используются — steiger их отклоняет.

- Снаружи слайс доступен **только** через `index.ts`. Глубокий импорт (`@/entities/layer/model/store`) запрещён.
- `index.ts` — только на уровне слайса и сегмента `shared` (`shared/api`, `shared/ui`). `shared/lib` — набор независимых модулей, у каждого свой `index.ts` (`shared/lib/vedro`, `shared/lib/dev`). `index.ts` на уровне слоя (`src/entities/index.ts`) и внутри сегментов слайса запрещён.
- `index.ts` содержит только реэкспорты. Ориентир — до ~10 имён; распух → слайс пора делить.
- Экспортируем минимум: то, что реально используют снаружи.

Сегменты — по назначению, а не по типу файла:

| Сегмент | Что внутри |
|---|---|
| `ui` | Компоненты. Только презентация и вызов команд |
| `model` | Состояние, команды, хуки, бизнес-правила |
| `api` | Работа с внешним источником данных |
| `lib` | Чистые утилиты слайса |
| `config` | Константы и статические реестры |

❌ `hooks/`, `types/`, `components/`, `utils/`, `helpers/` как сегменты.

## 4. Импорты

- Между слайсами и слоями — алиас `@/`: `import { useLayerRow } from '@/entities/layer'`.
- Внутри своего слайса — относительный путь: `import { layerCache } from './cache'`.
- Алиас на собственный слайс запрещён (он же — импорт в обход своего `index.ts` по кругу).
- Типы — `import { type LayerId } from '@/entities/layer'` (правило `consistent-type-imports`).
- Порядок групп задаёт `simple-import-sort` и правится автоматически: React → внешние → `@/app` … `@/shared` → `../` → `./` → side-effect.

## 5. Куда что класть (на примерах проекта)

| Код | Куда | Почему не в другое место |
|---|---|---|
| `LayerId`, `LayerState`, `LoadState` | `entities/layer/model` | Тип сущности, нужен командам, виджетам и карте |
| Реестр трёх слоёв | `entities/layer/config` | Статика сущности, не меняется в рантайме |
| `enable`, `disable`, `retry`, `enableAll` | `entities/layer/model/loading/layer-service/layer-service.ts` | Движок команд делят несколько фич: один набор abort-контроллеров и `requestId` ([ADR 008](../adr/008-command-engine-in-entity.md)) |
| Пачки событий лога и ответов массовой загрузки | `entities/layer/model/loading/layer-service/{event-batch,response-batch}.ts` | Части движка команд, отдельно от него не используются |
| `createLayerApi({ findConfig })` | `entities/layer/api`, собирается в `model/runtime.ts` | API не знает про стор: поиск конфигурации передаётся зависимостью (DIP) |
| `RENDER_KIND_TRAITS` — свойства вида отрисовки для запроса | `entities/layer/config` | Статика сущности; `Record` по `LayerRenderKind` не даёт забыть вид ([ADR 010](../adr/010-render-strategies.md)) |
| Кнопки и тумблеры, вызывающие команды | `features/layer-control/ui`, `features/bulk-actions/ui` | Действие пользователя — UI фичи |
| `useLayerRow(id)`, `useLayersSummary()` | `entities/layer/model/selectors` | Чтение состояния сущности через `useSelector`, нужно нескольким фичам и виджетам |
| `toLayerRowView` — вид строки без данных слоя | `entities/layer/lib` | Чистая функция сущности, её вызывает селектор ([ADR 009](../adr/009-standard-vedro-api.md)) |
| `LayerStoresProvider` | `entities/layer/ui` | Провайдеры сторов слайса; собираются в `app/state/store-providers.tsx` |
| `createVedroStore`, `bindVedroStore` (штатный `createVedro` + страховка V4) | `shared/lib/vedro` | Не знает о слоях, переиспользуется для любого стора; единственное место импорта `vedro` |
| `fetchLayerData` | `shared/api/mock-layer-api` | Транспорт. Единственное место в `shared`, где допустимо слово «layer» |
| `MapSync` | `widgets/map-view/model/sync` | Мост «стор → MapLibre», живёт рядом с картой |
| `RENDER_STRATEGIES` — слой MapLibre, прозрачность, стиль, порядок, данные источника | `widgets/map-view/model/sync` | Знание о MapLibre не нужно сущности ([ADR 010](../adr/010-render-strategies.md)) |
| `cellCentroids` — точки для heatmap | `widgets/map-view/lib` | Чистая функция, нужна только карте |
| `startBrowserUrlSync` — связка фичи `url-sync` с `window.history` | `app/routing/url-sync.ts`, вызов в `main.tsx` | Браузерные API и связка слайсов — забота `app`; запуск явный, не побочный эффект импорта |
| Тема, миксины (`touchArea`, фокус), общие поля формы (`Field`) | `shared/ui/theme`, `shared/ui/layout` | Без домена, нужны нескольким фичам |
| Проценты ↔ доли, форматирование чисел и времени | `shared/lib/format` | Без домена |
| Счётчик рендеров | `shared/lib/dev` | Dev-инструмент без домена |

## 6. Текущее состояние

| Слой | Слайсы |
|---|---|
| `app` | провайдеры (тема, сторы vedro — `state/store-providers.tsx`), роутер (чтение URL в загрузчике), запись в URL (`routing/url-sync.ts`, запуск в `main.tsx`), глобальные стили |
| `pages` | `map-page` |
| `widgets` | `layer-panel`, `chaos-panel`, `map-view` |
| `features` | `layer-control`, `bulk-actions`, `chaos-settings`, `stress-mode`, `url-sync` |
| `entities` | `layer` — модель, реестр, стор, хуки, кэш, движок команд ([ADR 008](../adr/008-command-engine-in-entity.md)) |
| `shared` | `api` (mock API), `lib/vedro`, `lib/dev` (счётчик рендеров), `lib/format` (числа, время, проценты), `lib/time`, `ui` (контролы, `layout/field`, тема и миксины) |

Правило steiger `fsd/insignificant-slice` отключено: слайсы появлялись раньше потребителей (логика раньше UI), а фича с одним потребителем — нормальный случай. Остальные правила `recommended` включены.

## Что запрещено

- ❌ Импорт вверх по слоям и между слайсами одного слоя — `boundaries/dependencies`, steiger.
- ❌ Импорт в обход `index.ts` чужого слайса — `boundaries/dependencies`.
- ❌ `index.ts` на уровне слоя, сегменты-по-типу (`hooks/`, `types/`) — steiger, ревью.
- ❌ Слово «layer» и предметная логика в `shared` (кроме `shared/api/mock-layer-api`) — ревью.
- ❌ Пустые слайсы и сегменты «на будущее» — steiger.
