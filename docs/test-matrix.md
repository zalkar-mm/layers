# Матрица трассируемости ТЗ → тесты

Ведёт test-automator. Статусы: ✅ проходит · ❌ падает · ⚠️ нет автотеста · ⏸ заблокирован (нужна точка тестопригодности).
Последний прогон: 28.09.2026, после рефакторинга по внешнему своду правил (AI_LOG, этапы 22–23): 296 тестов прошли, 4 пропущены; e2e 24/24 — 12 сценариев на desktop и mobile, замеры и снимок карты запускаются вручную. Node 22, Vitest 5.0.1, Playwright 1.63.

Все юнит- и компонентные тесты лежат в `tests/unit`, структура повторяет `src`. Короткие пути в таблицах — относительно `tests/unit/entities/layer`, e2e — в `tests/e2e`.

Как считаются рендеры: dev-счётчик `shared/lib/dev` (`RenderCount`, layout-эффект на каждый коммит). Тесты рендерят через `renderWithStores` (`tests/support`: тема, провайдеры сторов, `StrictMode`): монтирование даёт +2, поэтому счётчики сбрасываются после монтирования и проверяется **прирост** на действие.

## §4 Модель, API, хуки

| Пункт ТЗ | Тест | Статус |
|---|---|---|
| §4.1 Реестр 3 слоёв, порядок, branded `LayerId` | `tests/unit/entities/layer/config/layers/base-layers.test.ts`, `model/state/types.test.ts` | ✅ |
| §4.1 Добавить слой = одна запись (синтетические через тот же реестр) | `config/layers/synthetic-layers.test.ts`, `config/registry/layer-registry.test.ts` | ✅ |
| §4.2 Discriminated union, невозможные состояния не компилируются | `model/state/types.test.ts` | ✅ |
| §4.2 Structural sharing (R9, I6) | `model/store/store.test.ts`, `layer-service.test.ts` › R9, `layer-service.invariants.test.ts` › I6 | ✅ |
| §4.3/1 (ADR 009) Штатный `useSelector` + страховка, V4 без потерь | `model/selectors/hooks/hooks.test.tsx` › «V4: обновление между рендером и подпиской», `tests/unit/shared/lib/vedro/create-store.test.tsx` › V4, `tests/unit/widgets/layer-panel/ui/list/layer-row.test.tsx` › «V4 без act» | ✅ |
| §4.3/2 (ADR 009) Селектор — маленький вид без данных слоя (V3), перерисовка только при его изменении | `lib/row-view.test.ts`, `model/selectors/hooks/hooks.test.tsx` › «перерисовывает только…», «отдаёт плоский вид строки…», «смена requestId без смены вида…» | ✅ |
| §4.3/3 `useLayersSummary`, `useMapOverlay` — стабильный объект, в том числе при чередовании prev/next | `model/selectors/hooks/hooks.test.tsx`, `model/selectors/summary.test.ts`, `model/selectors/map-status.test.ts` › `selectMapOverlay` | ✅ |
| §4.3/4 Идемпотентный unsubscribe (V6) | `tests/unit/shared/lib/vedro/subscribe.test.ts`, `model/selectors/hooks/hooks.leaks.test.tsx` › V6 | ✅ |
| ADR 009 `Provider` получает стор-синглтон: команды и UI делят экземпляр | `tests/unit/shared/lib/vedro/create-store.test.tsx`, `model/selectors/hooks/hooks.test.tsx` › «Provider и команды» | ✅ |
| ADR 006, 009 Статистика кэша через vedro-стор | `model/loading/cache.test.ts` › `onStatsChange`, `model/selectors/hooks/hooks.test.tsx` › `useCacheStats` | ✅ |
| §4.3 Утечки подписок: размонтирование и повторное монтирование в StrictMode | `model/selectors/hooks/hooks.leaks.test.tsx` | ✅ |
| §4.1 Вид отрисовки → запрос к mock API: направление только у `arrows`; неполная карта `RENDER_KIND_TRAITS` не компилируется (ADR 010) | `api/layer-api.test.ts`, `config/render-kind-traits.test.ts` | ✅ |
| ADR 010 `createLayerApi` описывает слой через переданный `findConfig` (DIP) | `api/layer-api.test.ts` › `createLayerApi` | ✅ |
| §4.4 Mock API: сетка, диапазоны, ветер, плавность, задержка, доля ошибок | `tests/unit/shared/api/mock-layer-api/mock-layer-api.test.ts` | ✅ |
| §4.4 Abort → `AbortError` сразу, таймер очищен | `mock-layer-api.test.ts` › «mock API: отмена» | ✅ |
| §4.4 Детерминизм по seed | `mock-layer-api.test.ts` › «детерминизм» | ✅ |
| §0 V1–V7, N1 | `docs/vedro-findings/*.test.ts(x)` | ✅ |

## §5 Команды, машина состояний, кэш

| Пункт ТЗ | Тест | Статус |
|---|---|---|
| §5.2/1–13 — каждая строка таблицы | `tests/unit/entities/layer/model/loading/layer-service/layer-service.state-machine.test.ts` › «§5.2/N» | ✅ |
| §5.1 Две защиты: abort + requestId | R1, R2, R8, R12 + мутации M1–M3 | ✅ |
| §5.1 `AbortError` — не ошибка (I5) | `layer-service.test.ts` › «AbortError — не ошибка», `state-machine.test.ts` › I5 | ✅ |
| §5 `enableAll`/`disableAll` — один dispatch | `layer-service.test.ts` › «массовые команды» | ✅ |
| §5 `retryFailed` — только слои в error | `layer-service.test.ts` | ✅ |
| §5 `setOpacity` клампит в [0, 1] | `layer-service.test.ts`, `state-machine.test.ts` › §5.2/13 | ✅ |
| §5.3 TTL: ровно TTL — свежая, TTL + 1 мс — удалена | `model/loading/cache.test.ts` › TTL | ✅ |
| §5.3 LRU 50: 50-я и 51-я запись | `cache.test.ts` › LRU, R14 | ✅ |
| §5.3 Выключение слоя не чистит кэш | `layer-service.test.ts`, §5.2/11 | ✅ |
| Инварианты I1–I7 на 500 случайных последовательностях | `layer-service.invariants.test.ts` | ✅ |

## §6 Сценарии гонок R1–R15

| # | Тест | Статус |
|---|---|---|
| R1–R9 | `tests/unit/entities/layer/model/loading/layer-service/layer-service.test.ts` › «сценарии гонок» | ✅ |
| R10–R15 | `tests/unit/entities/layer/model/loading/layer-service/layer-service.test.ts` › «кэш» | ✅ |
| R2 — «ни на один кадр» | проверка по истории состояний (`recordHistory`) | ✅ |

## §7 Интерфейс

| Пункт ТЗ | Тест | Статус |
|---|---|---|
| §7.2 Бейджи статусов, тексты (по `LayerRowView`) | `tests/unit/entities/layer/lib/status.test.ts`, E1, E2, E5 | ✅ |
| §7.2 Тик «N мин назад» только в строках с кэшем | `layer-panel.test.tsx` › тик, `layer-panel.leaks.test.tsx` | ✅ |
| §7.3 `LayerRow` в `memo` (реально нужен при перерисовке списка) | `layer-panel.test.tsx` › «§8/1, §7.3: прокрутка…» | ✅ |
| §7.1 Мобильная раскладка: карта 55 % высоты, без горизонтальной прокрутки | ручная проверка 360 × 800: карта 440 из 800 px, `scrollWidth = 360` | ⚠️ |

## §8 Бюджет рендеров

| Строка | Тест (`tests/unit/widgets/layer-panel/ui/layer-panel.test.tsx`, `tests/unit/widgets/map-view/ui/map-view.test.tsx`) | Статус |
|---|---|---|
| §8/1 Слайдер A → только `LayerRow A`; карта — 0 рендеров | «движение слайдера A…», «движение слайдера — 0 React-рендеров карты и легенды» | ✅ |
| §8/2 Вкл A → строка A + шапка | «включение A — строка A и шапка» (3 и 1000) | ✅ |
| §8/3 Ответ API A | «ответ API для A…» (3 и 1000) | ✅ |
| §8/4 Ошибка A → retry | «ошибка A → retry…» | ✅ |
| §8/5 Попадание в кэш: ровно 2 рендера строки | «включение A с попаданием в кэш…» | ✅ |
| §8/6 Тик в строке A | «тик «N мин назад»…» | ✅ |
| §8/7 `enableAll` — каждая строка ровно 1 раз | «enableAll…» (3 и 1000); шапка при трёх ответах в одном `act` — 2 рендера (было 4 до ADR 009) | ✅ |
| §8/8 1000 слоёв — как при 3 | describe «режим 1000 слоёв» | ✅ |
| Счётчики рендеров в демо: флаг видимости и тумблер «Показать рендеры» | `tests/unit/shared/lib/dev/render-counts.test.ts`, `tests/unit/shared/lib/dev/overlay/render-counts-toggle.test.tsx` | ✅ |

## §9 Карта

| Пункт ТЗ | Тест | Статус |
|---|---|---|
| §9.1 MapSync вне React: opacity → 1 `setPaintProperty`, 0 рендеров | `tests/unit/widgets/map-view/model/sync/map-sync.test.ts`, `ui/map-view.test.tsx` | ✅ |
| §9 stale → свежие через `setData` без удаления | `map-sync.test.ts` | ✅ |
| §9 Ветер поверх заливок, лимит 10 слоёв | `map-sync.test.ts` | ✅ |
| ADR 010 Стратегия на каждый вид отрисовки: тип слоя MapLibre, свойство прозрачности; неполная карта не компилируется | `tests/unit/widgets/map-view/model/sync/render-strategies.test.ts`, `map-sync.test.ts` › «MapSync: виды отрисовки» | ✅ |
| ADR 010 Порядок на карте: заливки → heatmap → стрелки при любом порядке включения | `render-strategies.test.ts` › «порядок…», `map-sync.test.ts` › «порядок слоёв…» | ✅ |
| ADR 010 `heatmap`: источник из центроидов с исходными properties, свежие данные тоже центроидами, подсказка по полигонам; вес, палитра, радиус, интенсивность | `tests/unit/widgets/map-view/lib/cell-centroids.test.ts`, `map-sync.test.ts` › heatmap, `render-strategies.test.ts` › heatmap | ✅ |
| ADR 010 `heatmap` в реальном MapLibre | вручную в браузере на временном конфиге (AI_LOG, этап 22); в базовом наборе heatmap-слоёв нет | ⚠️ |
| §9 Размонтирование освобождает карту | `map-view.test.tsx`, `map-sync.test.ts` › dispose | ✅ |
| §9 Реальная отрисовка, подсказка по клику | `tests/e2e/measurements/map-screenshot.spec.ts` (вручную, `SCREENSHOT=1`) | ✅ |
| §9 Начальный вид, атрибуция подложки | только визуально | ⚠️ |

## §10–§11 Chaos, стресс, URL, доступность, e2e

| Пункт ТЗ | Тест | Статус |
|---|---|---|
| §10.1 Chaos: настройки, спам-клик 20 за 500 мс, `stopSpam`, повторный запуск | `tests/unit/features/chaos-settings/model/chaos-settings.test.ts`, E3 | ✅ |
| §10.1 Chaos UI: слайдеры в проценты и мс, тумблеры, seed по Enter, спам-клик блокирует кнопку, размонтирование останавливает серию | `tests/unit/features/chaos-settings/ui/chaos-controls.test.tsx` | ✅ |
| §10.1 Лог событий: последние 20, пачкой | `tests/unit/entities/layer/model/loading/event-log.test.ts` | ✅ |
| §10.2 Стресс-режим 3/100/1000, bulk на всех слоях | `tests/unit/features/stress-mode/model/stress-mode.test.ts` | ✅ |
| §10.2, §11.1 Возврат из стресс-режима: слои, прозрачность и ссылка на месте (БАГ-1) | `stress-mode.test.ts`, `stress-mode.restore.test.ts` (запрос в полёте, кэш, серия переключений), `url-sync.test.ts`, E6 | ✅ |
| §10.3 Замеры | `tests/e2e/measurements/perf.spec.ts` (вручную, `PERF=1`) | ✅ |
| §11.1 URL: чтение, debounce + replace, невалидное молча | `features/url-sync/model/*.test.ts`, E4 | ✅ |
| §11.2 Доступность: switch, aria-valuetext, aria-live, Tab | `layer-panel.a11y.test.tsx`, `tests/e2e/scenarios/a11y.spec.ts` | ✅ |
| §11.2 Проценты ↔ доли, `aria-valuetext` слайдера | `tests/unit/shared/lib/format/percent.test.ts` | ✅ |
| ui §1.1 Тач-зоны 44 px не перекрывают соседние контролы: исходное состояние, ошибка, успех, спам-клик (desktop + mobile) | `tests/e2e/scenarios/touch-targets.spec.ts` | ✅ |
| §11.2 Группа «Число слоёв» у переключателя режима (БАГ-2) | `tests/e2e/scenarios/a11y.spec.ts` › «переключатель «3 · 100 · 1000»…» | ✅ |
| §10.1 Лог показывает срабатывание защиты от гонок («отброшен (устаревший)») | `chaos-settings.test.ts` (с переключателем и без), `mock-layer-api.test.ts` › ignoreAbort, E3b | ✅ |
| §11.3 E1–E5 (desktop + mobile) + E6 | `tests/e2e/scenarios/layers.spec.ts` | ✅ |

## Мутационная проверка

Каждая мутация — в отдельной копии проекта, после прогона откатывается.

| Мутация | Упавшие тесты | Итог |
|---|---|---|
| M1 Нет проверки `requestId` | I1–I7, §5.2/7, R1, R8, R12 | убита |
| M2 Нет `abort()` в `disable` | I1–I7, §5.2/4, R5, disable, cancelAll, отложенный старт, утечки таймеров (10) | убита |
| M3 Запись в кэш до проверки `requestId` | I1–I7, §5.2/7, R12 | убита |
| M4 `AbortError` как обычная ошибка | I5 (лог) | убита — добавлен тест |
| M5 Новый объект `byId[B]` при изменении A | R7, R9, §8/1–8, I6 (15) | убита |
| M6 `LayerRow` без `memo` | «§8/1, §7.3: прокрутка…» | убита — добавлен тест |
| M7 Просроченная запись не удаляется | TTL, §5.2/3, R13 | убита |
| M8 Сводка — новый объект на каждый вызов | useLayersSummary, a11y, утечки (24) | убита |
| M9 MapSync без сравнения слоя по ссылке | — | выжила: эквивалентная мутация, вызовы карты те же, теряется только оптимизация |
| M10 `enableAll` — dispatch на каждый слой | «одним dispatch» | убита |
| M11 `retry` разрешён из loading | §5.2/12, R3, retryFailed | убита |
| M12 LRU без обновления позиции при чтении | LRU | убита |
| M13 Тик бейджа всегда включён | утечки таймеров (3) | убита |
| M14 `attempt` не сбрасывается при `disable` | §5.2/9, «disable из error…» | убита |
| M15 Возврат в режим без восстановления | БАГ-1: stress-mode, restore, url-sync (6) | убита |
| M16 Восстановление без прозрачности | БАГ-1 (3) | убита |
| M17 Переключатель «Сервер отвечает…» не действует | chaos-settings › БАГ-4, mock API › ignoreAbort | убита |

## Баги

| # | Суть | Статус |
|---|---|---|
| БАГ-1 | Возврат из стресс-режима терял слои и ссылку | исправлен, перепроверен (unit, e2e E6, мутации M15–M16, вручную на localhost) |
| БАГ-2 | Нет имени группы у «3 · 100 · 1000» | ложное срабатывание аудита: `fieldset` + `legend` были; добавленный `role="radiogroup"` не вредит |
| БАГ-3 | `retries: 1` в CI | исправлен: `retries: 0` |
| БАГ-4 | «отброшен (устаревший)» в логе недостижим, README обещает его после спам-клика | исправлен: переключатель «Сервер отвечает, несмотря на отмену», README п. 3 переписан; перепроверен (unit, E3b ×5, мутации M1/M3/M4/M17, вручную на localhost) |
