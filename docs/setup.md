# Установка с чистого листа

Как поднять систему на новом компьютере: фреймворк, контент-репозиторий, приложение и захват через Claude Code и Codex. Обе папки лежат рядом, потому что контент ссылается на локальную сборку фреймворка (`file:../wastech-learn/...`), пока пакеты не опубликованы в npm.

```text
~/Projects/
├── wastech-learn/           # фреймворк: код, приложение, CLI, MCP, skills, шаблон контента
└── wastech-learn-content/   # твои темы, карточки и журнал повторений (приватный)
```

## 1. Что поставить

| Что | Зачем |
| --- | --- |
| git | Оба репозитория и синхронизация между компьютерами |
| Node ≥ 24.17 (удобно через nvm) | Всё остальное. В обоих репозиториях `engine-strict`, со старым Node `npm ci` откажется |
| GitHub CLI `gh` | Клонирование приватного репозитория, push из приложения |
| VS Code | Кнопки «Открыть в VS Code» и `Shift+E` открывают файл по ссылке `vscode://` |
| Claude Code и/или Codex | Захват тем и квиз через MCP и skills |
| Браузер на Chromium | Приложение; для e2e-тестов фреймворка — Playwright |

```bash
nvm install 24
gh auth login          # HTTPS и токен; дальше git берёт его сам
gh auth setup-git
git config --global user.name "Твоё имя"
git config --global user.email "почта@example.com"
```

Без имени и почты в git кнопка «Синхронизировать» не сможет сделать коммит.

## 2. Фреймворк

```bash
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/VladimirMakarevich/wastech-learn.git
cd wastech-learn
nvm use                # версия из .nvmrc
npm ci
npm run build          # пакеты в dist/ и приложение; без этого контент не запустится
npm run lint && npm test
```

Для e2e один раз: `npx playwright install chromium`, затем `npm run test:e2e`. Если Chromium скачать нельзя, подойдёт установленный Chrome: `PW_CHANNEL=chrome npm run test:e2e`.

## 3а. Контент уже есть: клонировать

```bash
cd ~/Projects
git clone https://github.com/VladimirMakarevich/wastech-learn-content.git
cd wastech-learn-content
npm ci
echo '{ "device": "laptop1" }' > learn.local.json
npm run lint
npx wastech-learn check --content .
```

Имя устройства у каждого компьютера **своё** (`desk1`, `laptop1`): по нему журнал пишется в `reviews/<device>/`, и два компьютера не правят один файл. Без `learn.local.json` берётся hostname. Файл в `.gitignore`.

Дальше — [шаг 4](#4-агенты-claude-code-и-codex).

## 3б. Контента ещё нет: создать новый репозиторий

Шаблон лежит во фреймворке, в `templates/content-repo/`: та же инфраструктура, что у рабочего контента, только без тем и журналов.

```bash
cd ~/Projects
mkdir wastech-learn-content && cd wastech-learn-content
git init -b main
cp -r ../wastech-learn/templates/content-repo/. .
```

Что приехало из шаблона:

| Файл | Что делает |
| --- | --- |
| `package.json`, `.npmrc`, `.nvmrc` | CLI и MCP-сервер из `../wastech-learn`, wastech-mdlint, Node ≥ 24.17 |
| `learn.config.json` | Часовой пояс, начало дня, язык интерфейса, параметры FSRS и лимиты |
| `wastech-mdlint.config.json` | Пресет проверки контента |
| `.mcp.json`, `.codex/config.toml` | MCP-серверы `wastech-learn` и `wastech-mdlint` для Claude Code и Codex |
| `.claude/settings.json` | Hook: каждая правка под `content/` проверяется сразу |
| `AGENTS.md`, `CLAUDE.md` | Правила для ИИ в этом репозитории |
| `.gitattributes`, `.gitignore` | `merge=union` для журналов, `eol=lf`; кэш и `learn.local.json` не коммитятся |
| `scripts/render-diagrams.mjs`, `.github/workflows/content-lint.yml` | Рендер Mermaid в SVG и CI: lint и свежесть диаграмм |
| `content/`, `inbox/`, `journal/`, `reviews/` | Пустые папки под темы, пакеты, журнал рефлексии и повторения |

Поправь `learn.config.json` под себя: `timezone` (IANA, например `Europe/Warsaw`), `dayStartsAt`, `uiLanguage` (`ru`, `en`, `pl`), лимиты новых карточек. Остальные параметры описаны в [repo-layout](content/repo-layout.md).

```bash
echo '{ "device": "desk1" }' > learn.local.json
npm install            # создаст package-lock.json, его тоже коммитим
npx skills add ../wastech-learn/skills --skill '*' --agent claude-code codex --copy -y
npm run lint
npx wastech-learn check --content .
```

`npx skills add` копирует `learn-capture`, `learn-import` и `learn-quiz` в `.claude/skills/` и `.agents/skills/` и фиксирует их хэши в `skills-lock.json`.

Хочешь сразу посмотреть приложение на живых данных — скопируй эталонные темы:

```bash
cp -r ../wastech-learn/fixtures/golden/content/. content/
```

Первый коммит и приватный репозиторий на GitHub:

```bash
git add .
git commit -m "chore: start the content repository"
gh repo create wastech-learn-content --private --source . --push
```

`learn.local.json`, `node_modules/` и `.cache/` в коммит не попадут: они в `.gitignore`.

## 4. Агенты: Claude Code и Codex

**Claude Code.** Открой сессию в папке `wastech-learn-content`. При первом запуске он спросит, доверять ли серверам из `.mcp.json`: разреши `wastech-learn` и `wastech-mdlint`. Проверка — команда `/mcp`: оба сервера в статусе connected. Hook из `.claude/settings.json` и skills из `.claude/skills/` подхватываются сами.

**Codex.** Открой папку и выдай ей доверие, когда приложение спросит: без этого Codex не читает `.codex/config.toml`. Skills он берёт из `.agents/skills/`. Hook в Codex не работает, поэтому после ручной правки файлов запускай `npm run lint` и `npx wastech-learn check --content .`.

Как пользоваться захватом и квизом — в [capture](ai/capture.md) и [learning-package](ai/learning-package.md).

## 5. Приложение

Из папки контента:

```bash
npx wastech-learn serve
```

Сервер слушает только `127.0.0.1:4747` и сам открывает браузер. Другой порт — `--port 4848`, без браузера — `--no-open`. Из любой папки:

```bash
node ~/Projects/wastech-learn/packages/cli/bin/wastech-learn.mjs serve --content ~/Projects/wastech-learn-content
```

## 6. Работа на нескольких компьютерах

1. Начало работы: «Получить» в панели синхронизации приложения (или `git pull`).
2. Конец работы: «Синхронизировать» — коммит `content/`, `reviews/`, `inbox/`, `pull --rebase` и push.
3. Остальные файлы (`AGENTS.md`, `.claude/`, `skills-lock.json`) коммитишь сам.

Подробности и что будет, если забыть pull, — в [sync](architecture/sync.md).

## 7. Обновить фреймворк

```bash
cd ~/Projects/wastech-learn
git pull
npm ci
npm run build
```

После сборки перезапусти `serve` и сессии Claude Code и Codex: MCP-сервер и hook читают новый `dist/` только при старте. Если менялись skills в `skills/`, повтори в контенте `npx skills add …` из шага 3б и закоммить обновлённые `.claude/skills/`, `.agents/skills/` и `skills-lock.json`.

## Проверить, что всё работает

- [ ] `npm run lint` и `npm test` во фреймворке — без ошибок.
- [ ] `npm run lint` и `npx wastech-learn check --content .` в контенте — без ошибок.
- [ ] `npx wastech-learn serve` открывает главную, в боковой панели — имя этого устройства.
- [ ] В Claude Code `/mcp` показывает `wastech-learn` и `wastech-mdlint`.
- [ ] После сессии повторения в `reviews/<device>/` появился файл, а «Синхронизировать» отправляет его на GitHub.

## Частые проблемы

| Симптом | Причина и что делать |
| --- | --- |
| `npm ci` пишет `Unsupported engine` | Старый Node: `nvm use` в папке репозитория |
| `Cannot find module …/dist/…` при `npx wastech-learn` | Фреймворк не собран или лежит не рядом: `npm run build` в `../wastech-learn` |
| `ENOSPC: System limit for number of file watchers reached` (Linux) | Сервер следит за файлами, а лимит inotify мал: `echo fs.inotify.max_user_watches=524288 \| sudo tee /etc/sysctl.d/60-inotify.conf && sudo sysctl --system` |
| Порт 4747 занят | Уже запущен другой `serve`: закрой его или `--port 4848` |
| MCP-серверов нет в `/mcp` | Сессия открыта не в папке контента, серверы не разрешены или не выполнен `npm ci` в контенте |
| «Синхронизировать» просит закончить в терминале | git ждёт пароль или ключ, либо идёт чужой rebase: `gh auth setup-git` или закончи rebase вручную |

## См. также

- [Контент-репозиторий](content/repo-layout.md) · [Синхронизация](architecture/sync.md) · [Захват](ai/capture.md)
