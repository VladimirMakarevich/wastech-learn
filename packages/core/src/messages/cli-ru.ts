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
    "{file} — не валидный JSON, исправь синтаксис и запусти снова",
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
  ].join("\n"),
};
