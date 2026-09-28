# Архитектурные решения (ADR)

Формат: «Контекст → Варианты → Решение → Последствия». Шаблон — [000-template.md](000-template.md). Одно решение — один файл, номер не переиспользуется. Отменённое решение не удаляется: статус «Заменено ADR NNN».

| № | Решение | Статус |
|---|---|---|
| [001](001-normalized-store.md) | Нормализованный стор `ids + byId` вместо ключа на слой | Принято |
| [002](002-use-sync-external-store.md) | Свой хук на `useSyncExternalStore` вместо штатного `useSelector` | Заменено ADR 009 |
| [003](003-single-store.md) | Один стор, а не стор на слой | Принято |
| [004](004-race-protection.md) | Двойная защита от гонок: abort + requestId | Принято |
| [005](005-map-sync-outside-react.md) | Синхронизация карты вне React | Принято |
| [006](006-swr-cache.md) | Кэш stale-while-revalidate вне стора | Принято |
| [007](007-no-react-compiler.md) | React Compiler не используется | Принято |
| [008](008-command-engine-in-entity.md) | Движок команд в `entities/layer`, фичи — UI | Принято |
| [009](009-standard-vedro-api.md) | Штатный API vedro: Provider + `useSelector`, страховка от V4, селекторы без данных слоя | Принято |
| [010](010-render-strategies.md) | Вид отрисовки — карты `Record<LayerRenderKind, …>`: свойства в сущности, стратегии MapLibre в виджете карты; heatmap по центроидам | Принято |
