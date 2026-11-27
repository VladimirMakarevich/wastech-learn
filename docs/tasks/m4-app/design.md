# Дизайн — M4, приложение

[⌂ index](index.md) · требования — [requirements.md](requirements.md) · ядро — [дизайн M2](../m2-core/design.md) · захват — [дизайн M3](../m3-capture/design.md)

## Обзор

Три новых пакета и одна команда CLI. `session` — чистая логика сессии, общая для квиза MCP и приложения. `server` — тонкий Hono-хост над `content-fs`, его запускает `wastech-learn serve`. `app` — Angular-клиент: bundle и события получает с сервера, replay, очередь и метрики считает сам через `session` и `srs`. `core` получает индекс поиска в bundle, `srs` — метрики, `content-fs` — наблюдение за файлами.

## Ключевые решения

| # | Решение | Почему | Отвергнуто |
| --- | --- | --- | --- |
| D1 | Новый чистый пакет `@wastech-learn/session` (`core` + `srs`, без Node API): маппинг в порты `srs` (из `content-fs/load.ts`), событие оценки, правило leech, прогноз интервалов, движок и итоги сессии. Его импортируют `content-fs` и `app`; сначала ADR-0015 (M4-Q9) | Логика сейчас в `content-fs/study.ts` и `load.ts`, браузеру недоступна; логика второго хоста — в общем пакете | Копия в `app`; `srs` импортирует `core` |
| D2 | Пакет `server`: `createServer` возвращает Hono-приложение, `startServer` вешает его на `127.0.0.1` через `@hono/node-server`; CLI `serve` разбирает аргументы и открывает браузер | Хост тонкий; маршруты тестируются `app.request()` без сокетов | Сервер внутри `cli` |
| D3 | `Host` только `127.0.0.1:<port>` или `localhost:<port>`; `POST` только с `Content-Type: application/json` и своим `Origin`; без CORS-заголовков; тело ≤ 256 KB | Без аутентификации чужая страница иначе читала бы контент через DNS rebinding или писала в журнал | Токен в URL; открытый CORS |
| D4 | `watchRepository` в `content-fs` на `fs.watch` (recursive), задержка 200 мс, изменения делятся на `content`, `reviews`, `config`. Свою дозапись сервер не объявляет: запоминает размер своего файла | Иначе каждая оценка вызывала бы полный replay в клиенте | chokidar; опрос |
| D5 | Bundle пересобирается целиком (`buildBundle` M2); при ошибке остаётся последний рабочий и уходит `build-failed`. Дольше 1.5 с на реальном репозитории — инкрементальная сборка отдельной фазой | Простой путь, пока укладывается в 2 с M4-N02 | Инкрементальная сразу |
| D6 | Replay в клиенте: полный при загрузке и после `events-changed`, дальше по событию через `createReplayer`; очередь пересчитывается после каждой оценки. Кэша `node:sqlite` нет (M4-Q4) | Бенчмарк NFR-05 в `srs` проходит без кэша; один путь для UI и Capacitor | Состояние с сервера |
| D7 | `now` даёт оболочка приложения, ULID — `core.newUlid` с `crypto.getRandomValues`. Неотправленные события `ReviewStore` держит в памяти и `localStorage` и досылает; повтор безопасен по `event.id` | Детерминизм; оценка не теряется при перезапуске сервера | Запись только после ответа |
| D8 | Angular 22 (точная версия), standalone, signals, zoneless, `@angular/build`; CDK `a11y` и `overlay`. Логика экранов — чистые TS-модули на signals, компоненты тонкие | ADR-0006; модули тестируются Vitest без TestBed | Material, Ionic, NgModules |
| D9 | HTML bundle вставляет только директива `bundleHtml` — единственное место с `bypassSecurityTrustHtml`; она же скрывает пропуски cloze по `data-cloze` | HTML уже санитизирован в `core`; санитайзер Angular вырезал бы SVG и классы Shiki | `innerHTML` в каждом компоненте |
| D10 | Тёмная тема схем: `core.prepareSvg` уже убирает `<style>` и белый фон, цвета задают токены (Q-10, M4-Q6) | Сделано в M2 | Два SVG на тему |
| D11 | i18n из `wastechlab-mobile-template`: сервис на signals, pipe `t`, словари ru/en/pl, `Intl.PluralRules`, паритет ключей, аудит литералов. Находки сборки форматирует каталог `core` | ADR-0006 | Angular i18n со сборкой на язык |
| D12 | Язык, тема и длительность «5 минут» — в `localStorage`; DR, лимиты и устройство — только показ из `/api/status` (M4-Q1) | Не попадают в git; в фазе 2 так же | `learn.local.json` через сервер |
| D13 | `core/search` сериализует индекс MiniSearch в `bundle.searchIndex` и загружает его; без стемминга (M4-Q8) | ADR-0014; одна функция для MCP и UI | Поиск на сервере |
| D14 | Vitest для чистых модулей `app`; Playwright (Chromium) с `@axe-core/playwright` для сценариев на `serve` над копией golden, время — `page.clock` (M4-Q5) | Главный критерий — клавиатура в настоящем браузере; axe и аудит сети там же | Karma; только компонентные тесты |

## Пакеты и модули

| Пакет | Что добавляется |
| --- | --- |
| `session` (новый) | `ports.ts` (маппинг из `content-fs/load.ts`), `event.ts` (событие `review`, `undo`, `suspend`, `unsuspend`, `reset`; `durMs` ≤ 120 000), `leech.ts`, `preview.ts` (интервалы 4 кнопок), `engine.ts` (сессия: режим, очередь, текущая карточка, отложенные `b`, отмена), `summary.ts` (итоги) |
| `srs` | `metrics.ts`: true retention young и mature за окно, прогноз нагрузки по дням, дата последней сессии для плана возврата |
| `core` | `search/` — сериализация и загрузка индекса; поле `searchIndex` в `ContentBundle` |
| `content-fs` | `watch.ts`; `study.ts` и `load.ts` переходят на `session` |
| `server` (новый) | `server.ts` (маршруты), `guard.ts` (D3), `changes.ts` (SSE), `start.ts` |
| `cli` | `serve --content <path> [--port] [--no-open]` |
| `app` (новый) | `data/` (`ReviewStore`, `HttpReviewStore`, bundle, status, SSE), `session/`, `screens/` (по экрану), `ui/` (компоненты Evening Glass), `i18n/`, `keys/` (клавиши и `g h`), `tts/`; стили и Inter из прототипа, CSS KaTeX локально |

`eslint.config.js`: `session` — как `core` и `srs` (без Node API), может импортировать `core` и `srs`; `app` — `core`, `srs`, `session`; `server` не импортирует код `app`, а раздаёт его сборку как файлы.

## Контракты

- **HTTP** (все под `/api`, ответы JSON): `GET /status` — устройство, абсолютный путь контента для `vscode://`, разобранный `learn.config.json`, версия планировщика, состояние сборки; `GET /bundle` с `ETag`; `GET /events` — события всех устройств и находки по битым строкам; `POST /events` — массив событий v1, каждое разбирается схемой `core`, `writer` = `web`, `device` = своё, дубли по `id` пропускаются, ответ `{ appended, duplicates }`; `GET /changes` — SSE `content-changed`, `events-changed`, `build-failed`. Остальные пути отдают сборку `app` с возвратом к `index.html`.
- **`ReviewStore`** — как в [components](../../architecture/components.md): `loadEvents`, `append` (идемпотентно по `event.id`), `onExternalChange`; плюс сигнал числа неотправленных событий для тоста.
- **Движок сессии** — чистые функции над `(state, now)`: `start(mode)`, `rate(rating, confidence, durMs)` → события, `undo()` → события `undo`, `bury()`, `suspend()`, `reset()`, `refresh(bundle, replayState)` при внешнем изменении без потери текущей карточки.

## Ошибки и пограничные случаи

- Событие не проходит схему, чужие `writer` или `device`, тело больше лимита → `400` с кодом, ничего не дописано; повтор `id` → `200` с `duplicates`.
- Сервер недоступен → оценки копятся в `ReviewStore`, спокойный тост «Оценки сохранятся, когда сервер вернётся»; сессия продолжается.
- Оценка вызвала автоматический `suspend` → `u` отменяет оба события.
- Карточка исчезла или стала не `active` после правки → сессия переходит к следующей без ошибки.
- `build-failed` → баннер с файлом и строкой, работа идёт на последнем рабочем bundle.
- Битая строка журнала → пропускается с предупреждением в `GET /events` (NFR-08).
- Нет голоса `pl-PL` → нет кнопки 🔊, `p` молчит.

## Тестирование

- **Unit:** `session` (событие, leech, прогноз, движок, итоги; инкрементальный replay равен полному — property-тест); `srs/metrics` против ручного подсчёта на golden-журнале; сериализация индекса туда-обратно; чистые модули `app`, паритет ключей i18n.
- **Контракт `server`:** каждый маршрут на временной копии golden через `app.request()`: валидация, чужой writer, идемпотентность, лимит тела, `Host` и `Origin`, SSE от подменённого наблюдателя.
- **E2E (Playwright):** сессия из 20 review items только с клавиатуры, отмена, итоги; правка файла видна < 2 с; axe на всех экранах; ни одного запроса за пределы `127.0.0.1`; смена языка; следующая карточка < 50 мс; replay синтетических 50k событий < 5 с.

## Документы вне спеки, которые меняет M4

ADR-0015 (пакет `session`), [components](../../architecture/components.md), [data-flows](../../architecture/data-flows.md), [.rules/architecture.md](../../../.rules/architecture.md) и [.rules/testing.md](../../../.rules/testing.md), [interaction](../../ux/interaction.md) (смысл `b`), статусы FR, Q-10…Q-12 в [risks-and-questions](../../risks-and-questions.md), AGENTS.md и roadmap.
