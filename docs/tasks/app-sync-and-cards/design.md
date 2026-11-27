# Дизайн — приложение: синхронизация с git и действия над карточками

[⌂ index](index.md) · реализует [requirements.md](requirements.md)

## Обзор

Логика git и новых записей ложится в `content-fs` рядом с путём записи M3: разбор `git status`, сообщение коммита, синхронизация, смена статуса и удаление карточки, статус темы. Сервер получает несколько тонких маршрутов и рабочее пространство (`openWorkspace`), как у MCP. Приложение — сервис состояния git, индикатор и панель в оболочке, блоки на Topic и в Cards, клавиша архива на Review, напоминание на итогах. Сервер приложения впервые пишет Markdown и запускает git — это фиксирует новый ADR-0017 и правила в [.rules/security.md](../../../.rules/security.md).

## Ключевые решения

| # | Решение | Почему | Отвергнуто |
| --- | --- | --- | --- |
| D1 | Модуль `content-fs/src/git/`: `run.ts` (запуск), `status.ts` (разбор и классификация, чистые функции), `message.ts` (сообщение коммита), `sync.ts` (commit, pull, push). Сервер только вызывает | Правило headless: логика в пакетах, хосты тонкие; `content-fs` уже запускает git (`git-baseline.ts`) | Git в `server`; библиотека `isomorphic-git` (новая зависимость, другое поведение, чем у git владельца) |
| D2 | Git через `execFile("git", ["-C", root, ...args])` без оболочки, с `GIT_TERMINAL_PROMPT=0`, таймаутом 60 с и `ssh -o BatchMode=yes`, если у владельца не задан свой `core.sshCommand` или `GIT_SSH_COMMAND`. Сообщение коммита — отдельный аргумент после `-m` | AS-N01: пароль не может подвесить сервер, ввод пользователя не становится командой | Оболочка; запрос пароля через приложение |
| D3 | Состояние: `git status --porcelain=v2 --branch -z --untracked-files=all`. Путь классифицируется по форме: `content/<domain>/<topic>/…` → тема, `…/cards/<id>.md` → карточка, `reviews/…` → журнал, `inbox/…` → входящие, остальное — «другое» | Не нужен bundle: удалённая карточка тоже узнаётся; один разбор для сервера и тестов | Классификация в приложении по `card.file` (не видит удалённые) |
| D4 | «Синхронизировать»: `git add --all -- content reviews inbox` → `git commit -m <msg>` (если индекс не пуст) → `git -c rebase.autoStash=true pull --rebase` → `git push`. «Получить» — только pull той же командой. Хуки git владельца не отключаются | Журнал не конфликтует (`merge=union`), rebase даёт линейную историю; autostash не мешает «другим» незакоммиченным файлам | Merge-коммиты; `git add -A` всего репозитория; `--no-verify` |
| D5 | Конфликт при rebase → `git rebase --abort` (возвращает и autostash), ответ `conflict` со списком файлов. Начатые снаружи rebase или merge, detached HEAD, нет upstream, нет git → `blocked` с причиной, кнопки недоступны | AS-F08: ни одна кнопка не оставляет репозиторий в середине операции | Продолжение rebase из UI (вне рамок) |
| D6 | Одна операция за раз: очередь операций в процессе сервера (запись контента и git идут через неё). Чужой процесс (MCP, терминал) ловится иначе: `index.lock` → `busy`, правленный снаружи файл → `content-changed` из `applyWrite` | AS-N02; межпроцессной блокировки у git, кроме `index.lock`, нет | Файловая блокировка поверх git |
| D7 | Архив и возврат карточки — существующий `updateCard` с `fields.status` (`retired` ↔ `active`) и `requestId`, проверка `validateOverlay` и сверка файла, как у MCP | AS-F14 без нового пути записи; MCP и приложение ведут себя одинаково | Отдельный патч front matter в сервере |
| D8 | Удаление: новый `deleteCard` в `content-fs` — удаляет файл и ссылку из `index.md` темы одной транзакцией (`commitFiles` учится удалять). Отмена до коммита — `restoreCard`: текст из `HEAD` (`git show`) и ссылка обратно, через тот же `applyWrite`. Есть ли у карточки история, знает приложение (replay), оно выбирает текст подтверждения | AS-F12; `git restore` затёр бы другие правки `index.md` | Удаление без транзакции; запрет удаления с историей (владелец разрешил, AS-Q3) |
| D9 | Статус темы — новый `setTopicStatus` (`active` ↔ `archived`) в `content-fs`. Карточки архивной темы исключают из очереди мосты `session` (`toQueueCards`, `bundleQueueCards`) | AS-F13; квиз MCP и приложение видят одну очередь | Фильтр только в приложении |
| D10 | Сообщение по умолчанию собирает `message.ts` из классификации: `chore: reviews and 1 topic from desk1`, `chore: reviews from desk1`, `chore: 2 cards archived`… — на английском, как Conventional Commits контента | AS-F05; предсказуемо и тестируемо | Генерация моделью (ключей нет) |
| D11 | Обновление: после изменения файлов (наблюдатель M4) и после своих операций сервер шлёт по SSE `git-changed`; приложение перечитывает `/api/git` и при `visibilitychange`. Внутренние изменения `.git/` не наблюдаются | AS-F02 за 2 с; коммит из терминала виден при возврате на вкладку | Наблюдение за `.git/`; опрос по таймеру |
| D12 | Новые маршруты принимают тела, разобранные Zod-схемами из `core` (`schema/app.ts`); ответы ошибок — `{ code, … }` с текстами в каталоге приложения | Правило «validate at the edge» | Разбор в сервере руками |
| D13 | На Review архив — клавиша `a`, без подтверждения: действие обратимо, тост «В архиве» с кнопкой «Вернуть». Удаление на Review не предлагается | Не прерывать сессию; удаление — осознанное действие в Cards | Меню на `!` (сейчас `!` сразу откладывает) |

## Пакеты и модули

| Пакет | Что добавляется |
| --- | --- |
| `core` | `schema/app.ts`: тела `/api/git/sync`, `/api/cards/:id/status`, `/api/topics/:domain/:topic/status`; коды ошибок и сообщения для `git-*` и `card-*` на ru/en/pl в каталоге |
| `session` | `toQueueCards` и `bundleQueueCards` пропускают карточки тем со статусом `archived` |
| `content-fs` | `git/run.ts`, `git/status.ts`, `git/message.ts`, `git/sync.ts`; `write/cards.ts`: `deleteCard`, `restoreCard`; `write/topic.ts`: `setTopicStatus`; `transaction.ts`: удаление файла в транзакции |
| `server` | `openWorkspace` на старте; очередь операций; маршруты `GET /api/git`, `POST /api/git/sync`, `POST /api/git/pull`, `POST /api/cards/:id/status`, `DELETE /api/cards/:id`, `POST /api/cards/:id/restore`, `POST /api/topics/:domain/:topic/status`; событие SSE `git-changed` |
| `app` | `data/git-state.ts` (signal состояния, обновление по SSE и видимости), API-вызовы в `data/api.ts`; `shell`: индикатор вместо `shell.saved` и панель синхронизации (CDK dialog); `screens/topic`: блок «Не закоммичено» и архив темы; `screens/browser`: пометка, фильтр «не закоммичено», кнопки «В архив», «Вернуть», «Удалить», «Отменить удаление»; `screens/review`: `a`; `screens/session-end`: напоминание; ключи i18n ru/en/pl |

## Контракты

- `GET /api/git` → `{ branch, upstream, ahead, behind, blocked?: { reason }, entries: [{ path, change, area, topic?, card? }], suggestedMessage }`; `change` — `added | modified | deleted | renamed | untracked`, `area` — `topic | card | reviews | inbox | other`.
- `POST /api/git/sync { message }` и `POST /api/git/pull {}` → `{ committed, pulled, pushed }` или `{ code }`: `conflict` (с `files`), `auth-required`, `no-upstream`, `busy`, `blocked`, `push-rejected`, `git-failed`.
- `POST /api/cards/:id/status { status: "active" | "retired" }`, `DELETE /api/cards/:id {}`, `POST /api/cards/:id/restore {}`, `POST /api/topics/:domain/:topic/status { status: "active" | "archived" }` → `{ status: "written" }` или `{ status: "blocked", findings }`, `content-changed`, `card-not-found`.
- Все не-GET — через существующий `guard` (свой `Origin`, JSON, лимит тела).

## Ошибки и пограничные случаи

- **Нечего коммитить** — синхронизация сразу идёт к pull и push; итог «Нового нет».
- **Push отклонён** (кто-то отправил раньше) — после rebase это не ожидается; если всё же — `push-rejected`, предложение синхронизировать ещё раз.
- **Autostash не вернулся** (удалённые правки в тех же «других» файлах) — ответ `conflict` с этими файлами; stash остаётся в `git stash list`, это сказано в сообщении.
- **Хук `pre-commit` владельца упал** — коммита нет, ответ `git-failed` с первой строкой вывода; индекс оставлен как есть.
- **Архив карточки, которую сейчас показывают** — сессия переходит к следующей; после пересборки bundle очередь её не вернёт.
- **Удаление карточки с историей** — события остаются в журнале; replay их пропускает, потому что карточки нет в bundle (как сейчас для карточек вне bundle).
- **Несколько вкладок** — операции встают в очередь сервера; вторая получает актуальное состояние по SSE.

## Тестирование

- `content-fs`: разбор porcelain v2 и классификация на строках-фикстурах; синхронизация на временных репозиториях с локальным bare-удалённым: обычный путь, нечего коммитить, конфликт с откатом, «другие» файлы не попадают в коммит, отсутствие upstream, detached HEAD; `deleteCard` и `restoreCard`, `setTopicStatus` с проверкой и `content-changed`.
- `session`: архивная тема не даёт карточек в очередь, обе функции согласованы.
- `server`: маршруты через `app.request()`, отказы `guard`, очередь операций.
- `app`: Vitest для `git-state` и сообщений; Playwright на копии golden, превращённой в git-репозиторий с bare-удалённым во временной папке: индикатор, панель, синхронизация, архив с Review и из Cards, удаление и отмена, напоминание на итогах; axe в обеих темах; сеть наружу не открывается.

## Документы вне спеки, которые меняются

- Новый ADR-0017 «Сервер приложения пишет контент и запускает git»; [.rules/security.md](../../../.rules/security.md) — раздел о локальном сервере.
- [components](../../architecture/components.md), [data-flows](../../architecture/data-flows.md), [sync](../../architecture/sync.md): маршруты, `git-changed`, кнопка вместо ручных команд.
- [screens](../../ux/screens.md), [interaction](../../ux/interaction.md): индикатор, панель, клавиша `a`.
- Требования: FR-214 (retire) и FR-311 — статусы по итогам.
