# Установка с чистого листа

Как поднять wastech-learn на новом компьютере: фреймворк, контент-репозиторий, агенты и приложение. Гайд можно пройти самому или отдать агенту: «Установи wastech-learn по <ссылка на этот файл>». Платформы - Linux и macOS, Windows - через WSL2.

```text
~/Projects/
├── wastech-learn/           # фреймворк: код, приложение, CLI, MCP, skills, шаблон контента
└── wastech-learn-content/   # темы, карточки и журнал повторений (приватный)
```

Папки лежат рядом, а папка фреймворка называется `wastech-learn`: контент ссылается на его сборку путём `file:../wastech-learn/...`, пока пакеты не опубликованы в npm.

## Для агента

1. Прочитай гайд целиком. Потом одним сообщением спроси у пользователя:
   - есть ли уже контент-репозиторий (его URL) или нужен новый;
   - имя этого компьютера для журнала: `desk1`, `laptop1` - строчные латинские буквы, цифры, дефис;
   - часовой пояс IANA и язык интерфейса (`ru`, `en`, `pl`); по умолчанию берутся системные;
   - какие агенты нужны: Claude Code, Codex или оба;
   - создать ли приватный репозиторий на GitHub и отправить ли туда контент.
2. Перед каждым шагом проверь, не сделан ли он уже. Команды можно повторять, но не перезаписывай существующие папки, `git config` и `learn.local.json`.
3. Шаги с пометкой **Человек** делает только пользователь: вход в GitHub и доверие к папке в агенте. Объясни, что нажать, и продолжи после ответа.
4. Не коммить и не пушь без согласия пользователя.
5. Установка закончена, когда `npx wastech-learn doctor` в контент-репозитории завершается с кодом 0.

## 1. Инструменты

Проверь, что уже стоит: `git --version`, `node -v` (нужен ≥ 24.17), `gh --version`. Недостающее поставь:

| Что | Как |
| --- | --- |
| git | Linux: `sudo apt install git`; macOS: `xcode-select --install` |
| Node 24 | [nvm](https://github.com/nvm-sh/nvm#installing-and-updating), затем `nvm install 24 && nvm alias default 24` |
| GitHub CLI `gh` | [cli.github.com](https://cli.github.com/); нужен для приватного репозитория и push из приложения |
| Claude Code и/или Codex | Захват тем и квиз через MCP и skills |
| VS Code (по желанию) | Кнопки «Открыть в VS Code» и `Shift+E` |

`nvm alias default 24` обязателен: Claude Code и Codex запускают MCP-серверы через `npx` того Node, который видят сами. У агента в неинтерактивной оболочке `nvm` может не загрузиться - тогда в начале команды `. "$HOME/.nvm/nvm.sh"`.

**Человек:** `gh auth login` (вход через браузер), затем `gh auth setup-git`. Если `git config --global user.name` пуст, задай имя и почту - без них «Синхронизировать» не сделает коммит:

```bash
git config --global user.name "Имя"
git config --global user.email "почта@example.com"
```

## 2. Фреймворк

```bash
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/VladimirMakarevich/wastech-learn.git
cd wastech-learn
npm ci
npm run build
```

`npm ci` предупреждает `npm warn install-scripts …` - так и задумано, одобрять ничего не нужно: сборка работает без этих скриптов. Линтеры, тесты и e2e нужны только для разработки фреймворка - в [README](../README.md#разработка).

## 3а. Новый контент-репозиторий

```bash
cd ~/Projects/wastech-learn
npx wastech-learn init --content ../wastech-learn-content --device desk1 --timezone Europe/Warsaw --ui-language ru
cd ../wastech-learn-content
git init -b main
npm install
```

`init` создаёт папку из шаблона `templates/content-repo/`: конфиги, MCP для Claude Code и Codex, hook, CI, пустые `content/`, `inbox/`, `journal/`, `reviews/`. Он вписывает пояс и язык в `learn.config.json`, имя компьютера в `learn.local.json` (он в `.gitignore`), кладёт skills `learn-capture`, `learn-import` и `learn-quiz` в `.claude/skills/` и `.agents/skills/` и фиксирует их в `skills-lock.json`. Существующие файлы `init` не перезаписывает, а в папку с посторонними файлами не пишет вовсе. Остальные параметры конфига - в [repo-layout](content/repo-layout.md).

Посмотреть приложение на готовых темах можно, скопировав эталон: `cp -r ../wastech-learn/fixtures/golden/content/. content/`.

С согласия пользователя - первый коммит и приватный репозиторий на GitHub:

```bash
git add .
git commit -m "chore: start the content repository"
gh repo create wastech-learn-content --private --source . --push
```

После push GitHub сам запускает CI из шаблона: mdlint, `wastech-learn check` и свежесть диаграмм. Фреймворк для `check` он берёт из публичного репозитория, ветка `main`; другая ветка или тег задаётся в начале `.github/workflows/content-lint.yml`.

## 3б. Контент-репозиторий уже есть

Второй компьютер того же человека: клонировать свой репозиторий и назвать компьютер по-новому.

```bash
cd ~/Projects
git clone <URL контент-репозитория> wastech-learn-content
cd wastech-learn-content
npm ci
npx wastech-learn init --device laptop1
```

Здесь `init` пишет `learn.local.json` и обновляет skills, если фреймворк новее. По имени устройства журнал пишется в `reviews/<device>/`, поэтому у каждого компьютера оно своё.

## 4. Проверка

```bash
npx wastech-learn doctor
```

`doctor` проверяет Node, сборку фреймворка, конфиг, устройство, зависимости, skills, файлы шаблона и git. Строка с `✗` - ошибка, рядом сказано, что сделать; `!` - предупреждение, оно не мешает. Например, «нет удалённой ветки» держится до первого push. Код выхода 0 - установка закончена.

Приложение агент проверяет без браузера:

```bash
./node_modules/.bin/wastech-learn serve --no-open --port 4799 & SERVE=$!
curl -s --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:4799/api/status
kill "$SERVE"
```

В ответе - `"deviceSource":"local"` и `"build":{"ok":true`.

## 5. Агенты

**Человек**, Claude Code: открой сессию в папке `wastech-learn-content` и разреши серверы `wastech-learn` и `wastech-mdlint` из `.mcp.json`. Команда `/mcp` показывает оба в статусе connected; hook и skills подхватываются сами.

**Человек**, Codex: открой папку и выдай ей доверие, иначе Codex не прочитает `.codex/config.toml`. Hook в Codex не работает: после ручной правки файлов запускай `npm run lint` и `npx wastech-learn check --content .`.

Как захватывать темы и проходить квиз - в [capture](ai/capture.md) и [learning-package](ai/learning-package.md).

## 6. Каждый день

- **Приложение:** `npx wastech-learn serve` в папке контента. Сервер слушает только `127.0.0.1:4747` и сам открывает браузер; другой порт - `--port 4848`.
- **Несколько компьютеров:** в начале «Получить», в конце «Синхронизировать» - коммит `content/`, `reviews/`, `inbox/`, `pull --rebase` и push. Остальное (`AGENTS.md`, `.claude/`, `skills-lock.json`) коммитишь сам. Подробности - в [sync](architecture/sync.md).
- **Обновить фреймворк:** `git pull && npm ci && npm run build` в `wastech-learn`, затем `npx wastech-learn init` и `doctor` в контенте. Перезапусти `serve` и сессии агентов: MCP-сервер и hook читают новую сборку только при старте. Обновлённые skills и `skills-lock.json` закоммить.

## Частые проблемы

| Симптом | Что делать |
| --- | --- |
| `npm ci` пишет `Unsupported engine` | Node старше 24.17: `nvm install 24 && nvm alias default 24`, новый терминал |
| `nvm: command not found` у агента | В начале команды `. "$HOME/.nvm/nvm.sh"` |
| `doctor` чист, а MCP-серверов нет в `/mcp` | Агент запущен не из терминала и видит другой Node: запусти его из терминала или поставь Node 24 системно; серверы нужно разрешить |
| `ENOSPC: System limit for number of file watchers reached` | Linux: `echo fs.inotify.max_user_watches=524288 \| sudo tee /etc/sysctl.d/60-inotify.conf && sudo sysctl --system` |
| Порт 4747 занят | Уже запущен другой `serve`: закрой его или `--port 4848` |
| «Синхронизировать» просит закончить в терминале | git ждёт пароль или идёт чужой rebase: `gh auth setup-git` или закончи rebase вручную |

## См. также

- [Контент-репозиторий](content/repo-layout.md) · [Синхронизация](architecture/sync.md) · [Захват](ai/capture.md)
