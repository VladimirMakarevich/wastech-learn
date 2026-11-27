import type { CliMessageKey } from "./cli-en.js";
import type { Message } from "./types.js";

export const cliRu: Readonly<Record<CliMessageKey, Message>> = {
  "cli.check.summary": "{files}, {errors}, {warnings}",
  "cli.check.clean": "Проверено: {cards}, замечаний нет",
  "cli.build.written": "Bundle записан в {file}: {topics}, {cards}",
  "cli.build.blocked": "Bundle не записан: исправь ошибки выше и запусти снова",
  "cli.serve.listening":
    "wastech-learn открыт на {url}; Ctrl+C останавливает сервер",
  "cli.serve.built": "Bundle собран за {ms} мс: {topics}, {cards}",
  "cli.serve.build-failed":
    "Bundle не пересобран ({errors}); приложение работает на прежнем и показывает, где ошибка",
  "cli.serve.watch-failed":
    "Живые обновления остановились: {detail}. Перезапусти wastech-learn serve, чтобы вернуть их",
  "cli.render.rendered": "Отрендерено: {file}",
  "cli.render.stale": "Устарел: {file}",
  "cli.render.summary": "Диаграмм: {total}, отрендерено: {rendered}",
  "cli.render.check-summary": "Диаграмм: {total}, устаревших: {stale}",

  "cli.simulate.header":
    "Перерыв {breakDays} дн., сессии по {sessionMinutes} мин, {cards} ({items} review items) после {warmupDays} дн. ежедневной практики, сиды {seeds}",
  "cli.simulate.col.order": "Порядок",
  "cli.simulate.col.median": "Медиана сессий",
  "cli.simulate.col.cleared": "Разобран за ≤ {target}",
  "cli.simulate.col.recall": "Вспомнил",
  "cli.simulate.default": "{order} (по умолчанию)",
  "cli.simulate.never": "не за {days}",
  "cli.simulate.days-title": "По дням, {order}, сид {seed}:",
  "cli.simulate.col.day": "День",
  "cli.simulate.col.backlog": "Бэклог",
  "cli.simulate.col.reviews": "Повторений",
  "cli.simulate.col.minutes": "Минут",
  "cli.simulate.col.new": "Новые",
  "cli.simulate.new-offered": "есть",
  "cli.simulate.new-paused": "пауза",
  "cli.simulate.cleared": {
    count: "count",
    one: "Бэклог из {backlog} review items разобран за {count} сессию.",
    few: "Бэклог из {backlog} review items разобран за {count} сессии.",
    many: "Бэклог из {backlog} review items разобран за {count} сессий.",
    other: "Бэклог из {backlog} review items разобран за {count} сессии.",
  },
  "cli.simulate.not-cleared":
    "Бэклог из {backlog} review items не разобран за {days} сессий.",

  "cli.error.config-invalid":
    "{file}: поле {field} неверно, исправь значение и запусти снова",
  "cli.error.config-json":
    "{file} - не валидный JSON, исправь синтаксис и запусти снова",
  "cli.error.event-invalid":
    "В событии повторения неверно поле {field}; ничего не записано",
  "cli.error.repository-not-found":
    "В {root} нет {file}: укажи в --content контент-репозиторий",
  "cli.error.io-failed":
    "Не удалось прочитать или записать {file}: проверь путь и права",
  "cli.error.render-failed":
    "Рендер {file} не удался: проверь исходник Mermaid",
  "cli.error.port-in-use":
    "Порт {port} уже занят: запусти с --port <другой порт> или останови программу, которая его держит",
  "cli.error.missing-command": "Укажи команду: wastech-learn --help",
  "cli.error.unknown-command":
    "Неизвестная команда {command}: wastech-learn --help",
  "cli.error.unknown-option":
    "Неизвестный параметр {option}: wastech-learn --help",
  "cli.error.bad-value":
    "Неверное значение {value} для {option}: wastech-learn --help",
  "cli.error.unexpected": "Непредвиденный сбой: {detail}",
  "cli.error.scheduler-unsupported":
    "В learn.config.json другой планировщик: укажи srs.scheduler = {expected} или поставь подходящую версию фреймворка",

  "cli.hook.findings":
    "В {file} есть замечания: исправь их, прежде чем идти дальше",
  "cli.hook.failed": "Проверка контента не запустилась: {detail}",
  "cli.hook.bad-event":
    "На stdin нет события инструмента: запускай команду из hook PostToolUse",

  "cli.init.done": "Контент-репозиторий готов в {root}",
  "cli.init.refused":
    "В {root} есть файлы, которых нет в контент-репозитории ({entries}): выбери пустую папку или сам контент-репозиторий",
  "cli.init.created": "Создано из шаблона: {files}",
  "cli.init.kept":
    "{file} остаётся как есть: он отличается от шаблона, сравни их, если изменение не намеренное",
  "cli.init.config":
    "learn.config.json: часовой пояс {timezone}, язык интерфейса {language}",
  "cli.init.config-kept": "learn.config.json уже есть и остаётся как есть",
  "cli.init.device":
    "Этот компьютер пишет повторения как устройство {device} (learn.local.json)",
  "cli.init.device-kept":
    "В learn.local.json этот компьютер уже назван {device}, файл остаётся как есть",
  "cli.init.skills-installed":
    "Skills установлены для Claude Code и Codex: {skills}",
  "cli.init.skills-updated": "Skills обновлены до версии фреймворка: {skills}",
  "cli.init.skills-current": "Skills актуальны: {skills}",
  "cli.init.skill-kept":
    "{dir}/{skill} остаётся как есть: его меняли вручную; удали папку и запусти init снова, чтобы получить версию фреймворка",
  "cli.init.next": "Дальше:",
  "cli.doctor.node": "Node {version}",
  "cli.doctor.node-old":
    "Node {version} старше {required}: поставь Node 24 (nvm install 24) и запусти снова",
  "cli.doctor.build": "Фреймворк собран",
  "cli.doctor.build-missing":
    "Фреймворк не собран ({packages}): запусти npm run build в {dir}",
  "cli.doctor.build-stale":
    "Исходники фреймворка менялись после сборки ({packages}): запусти npm run build в {dir} и перезапусти serve и сессии агентов",
  "cli.doctor.config":
    "learn.config.json: часовой пояс {timezone}, язык интерфейса {language}",
  "cli.doctor.config-missing":
    "В {root} нет learn.config.json: создай репозиторий командой wastech-learn init или укажи его в --content",
  "cli.doctor.config-invalid":
    "learn.config.json: неверное значение {field}, исправь его",
  "cli.doctor.config-json":
    "learn.config.json - не валидный JSON, исправь синтаксис",
  "cli.doctor.device":
    "Устройство {device}: повторения пишутся в reviews/{device}/",
  "cli.doctor.device-hostname":
    "Нет learn.local.json: повторения пишутся в reviews/{device}/ по имени хоста; назови компьютер командой wastech-learn init --device <имя>",
  "cli.doctor.device-invalid":
    "learn.local.json: неверное значение {field}, используй строчные латинские буквы, цифры и дефисы",
  "cli.doctor.device-json":
    "learn.local.json - не валидный JSON, исправь синтаксис",
  "cli.doctor.deps": "Зависимости контента установлены",
  "cli.doctor.deps-missing":
    "В контент-репозитории не установлены {bins}: запусти там npm install",
  "cli.doctor.deps-other-framework":
    "Контент-репозиторий использует фреймворк из {dir}, а не этот: проверь пути file: в package.json и запусти npm install",
  "cli.doctor.skills": "Skills совпадают с фреймворком: {skills}",
  "cli.doctor.skill-missing": "Нет {dir}/{skill}: запусти wastech-learn init",
  "cli.doctor.skill-differs":
    "{dir}/{skill} отличается от фреймворка: wastech-learn init обновит его, если его не меняли вручную",
  "cli.doctor.template": "Файлы репозитория совпадают с шаблоном фреймворка",
  "cli.doctor.template-missing": "Нет {file}: wastech-learn init добавит его",
  "cli.doctor.template-differs":
    "{file} отличается от шаблона {template}: сравни их, если изменение не намеренное",
  "cli.doctor.git": "git: ветка {branch} связана с {upstream}",
  "cli.doctor.git-missing":
    "git не установлен: он нужен для синхронизации между компьютерами",
  "cli.doctor.git-none": "Это не git-репозиторий: запусти git init -b main",
  "cli.doctor.git-identity":
    "В git не заданы user.name или user.email: без них «Синхронизировать» не сделает коммит, задай их через git config --global",
  "cli.doctor.git-upstream":
    "У ветки {branch} нет удалённой ветки: она нужна «Синхронизировать», отправь ветку один раз командой git push -u origin {branch}",
  "cli.doctor.passed": "Всё настроено",
  "cli.doctor.summary": "{errors}, {warnings}",

  "cli.help": [
    "Использование: wastech-learn <команда> [параметры]",
    "",
    "Команды:",
    "  check      Проверить контент сверх mdlint: лимиты, cloze, id, диаграммы, пресет",
    "  build      Собрать content bundle для приложения (--out <файл>)",
    "  render     Отрендерить diagrams/*.mmd в SVG; --check только покажет устаревшие",
    "  simulate   Проиграть перерыв и сессии, которые разбирают бэклог",
    "  new-id     Вывести новые id карточек (--count <n>, по умолчанию 1)",
    "  hook       post-tool-use: проверить файл, который только что записал агент (JSON события на stdin)",
    "  serve      Открыть приложение в браузере через локальный сервер на 127.0.0.1",
    "  init       Создать контент-репозиторий из шаблона или дополнить его и обновить skills",
    "  doctor     Проверить установку на этом компьютере: Node, сборку, контент-репозиторий, skills, git",
    "",
    "Параметры:",
    "  --content <папка>  Контент-репозиторий (по умолчанию текущая папка)",
    "  --lang <ru|en|pl>  Язык сообщений (по умолчанию uiLanguage из learn.config.json)",
    "  --help             Показать эту справку",
    "",
    "build:    --out <файл> (по умолчанию .cache/content-bundle.json), --built-at <дата ISO>",
    "render:   --check",
    "simulate: --cards, --warmup-days, --break-days, --session-minutes, --seed, --runs",
    "serve:    --port <n> (по умолчанию 4747), --no-open",
    "init:     --device <имя>, --timezone <зона IANA>, --ui-language <ru|en|pl> (по умолчанию: имя хоста, пояс и язык системы)",
  ].join("\n"),
};
