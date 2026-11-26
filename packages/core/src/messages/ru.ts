import type { MessageKey } from "./en.js";
import type { Message } from "./types.js";

export const ru: Readonly<Record<MessageKey, Message>> = {
  "finding.front-matter-missing": "Нет front matter: начни файл с блока ---",
  "finding.front-matter-yaml":
    "Front matter — не валидный YAML: исправь синтаксис",
  "finding.front-matter-schema":
    "Поле front matter {field} отсутствует или неверно",
  "finding.section-missing": "Нет секции ## {section}: добавь её",
  "finding.topic-file-missing":
    "В теме нет {name}: добавь его рядом с index.md",
  "finding.topic-missing":
    "Карточка вне темы: content/{topic}/index.md нет или он неверен",
  "finding.question-words": {
    count: "count",
    one: "Вопрос {count} слово, для {type} не больше {limit}",
    few: "Вопрос {count} слова, для {type} не больше {limit}",
    many: "Вопрос {count} слов, для {type} не больше {limit}",
    other: "Вопрос {count} слова, для {type} не больше {limit}",
  },
  "finding.answer-words": {
    count: "count",
    one: "Ответ {count} слово, для {type} не больше {limit}",
    few: "Ответ {count} слова, для {type} не больше {limit}",
    many: "Ответ {count} слов, для {type} не больше {limit}",
    other: "Ответ {count} слова, для {type} не больше {limit}",
  },
  "finding.answer-points": {
    count: "count",
    one: "В ответе {count} пункт, для {type} не больше {limit}",
    few: "В ответе {count} пункта, для {type} не больше {limit}",
    many: "В ответе {count} пунктов, для {type} не больше {limit}",
    other: "В ответе {count} пункта, для {type} не больше {limit}",
  },
  "finding.rubric-missing": "Карточке {type} нужна секция ## Rubric",
  "finding.rubric-items": {
    count: "count",
    one: "В рубрике {count} пункт, не больше {limit}",
    few: "В рубрике {count} пункта, не больше {limit}",
    many: "В рубрике {count} пунктов, не больше {limit}",
    other: "В рубрике {count} пункта, не больше {limit}",
  },
  "finding.rubric-required":
    "В рубрике нет обязательного пункта: отметь хотя бы один знаком (!)",
  "finding.code-lines": {
    count: "count",
    one: "В блоке кода {count} строка, не больше {limit}",
    few: "В блоке кода {count} строки, не больше {limit}",
    many: "В блоке кода {count} строк, не больше {limit}",
    other: "В блоке кода {count} строки, не больше {limit}",
  },
  "finding.code-width": {
    count: "count",
    one: "Строка кода — {count} символ, не больше {limit}",
    few: "Строка кода — {count} символа, не больше {limit}",
    many: "Строка кода — {count} символов, не больше {limit}",
    other: "Строка кода — {count} символа, не больше {limit}",
  },
  "finding.cloze-gaps":
    "Cloze {variant} скрывает фрагментов: {count}; оставь один на вариант",
  "finding.cloze-variants": {
    count: "count",
    one: "У cloze-карточки {count} вариант, нужно от 1 до {limit}",
    few: "У cloze-карточки {count} варианта, нужно от 1 до {limit}",
    many: "У cloze-карточки {count} вариантов, нужно от 1 до {limit}",
    other: "У cloze-карточки {count} варианта, нужно от 1 до {limit}",
  },
  "finding.cloze-unclosed": {
    count: "count",
    one: "{count} пропуск cloze не закрыт }}: закрой его",
    few: "{count} пропуска cloze не закрыты }}: закрой их",
    many: "{count} пропусков cloze не закрыты }}: закрой их",
    other: "{count} пропуска cloze не закрыты }}: закрой их",
  },
  "finding.vocab-lang-pair": "Карточке vocab нужен langPair во front matter",
  "finding.vocab-example":
    "В ответе нет примера предложения: добавь его курсивом",
  "finding.id-unique": "id {id} уже есть в {other}",
  "finding.diagram-svg-missing":
    "Рядом с источником нет SVG: запусти wastech-learn render",
  "finding.diagram-stale":
    "SVG старше, чем {source}: запусти wastech-learn render",
  "finding.summary-link":
    "В Sources нет ссылки на секцию ../summary.md#: добавь её",
  "finding.active-edit":
    "{section} активной карточки изменён на {percent}%: если смысл другой, переведи её в retired и заведи новую",
  "finding.preset-invalid":
    "Это не валидный конфиг wastech-mdlint: скопируй пресет из CLI",
  "finding.preset-drift":
    "Правило пресета {rule} (№{position}) пропало или изменилось: верни его из пресета CLI",

  "finding.diagram-render":
    "Mermaid не смог отрисовать этот источник: {detail}",
  "finding.package-card":
    "У кандидата {card} нет поля {field} или оно неверно: исправь его в пакете",
  "finding.package-material":
    "В строке материалов нет поля {field} или оно неверно: исправь строку таблицы",
  "finding.package-summary-section":
    "Секции summary {section} нет в шаблоне: переименуй её или убери",
  "count.files": {
    count: "count",
    one: "{count} файл",
    few: "{count} файла",
    many: "{count} файлов",
    other: "{count} файла",
  },
  "count.errors": {
    count: "count",
    one: "{count} ошибка",
    few: "{count} ошибки",
    many: "{count} ошибок",
    other: "{count} ошибки",
  },
  "count.warnings": {
    count: "count",
    one: "{count} предупреждение",
    few: "{count} предупреждения",
    many: "{count} предупреждений",
    other: "{count} предупреждения",
  },
  "count.topics": {
    count: "count",
    one: "{count} тема",
    few: "{count} темы",
    many: "{count} тем",
    other: "{count} темы",
  },
  "count.cards": {
    count: "count",
    one: "{count} карточка",
    few: "{count} карточки",
    many: "{count} карточек",
    other: "{count} карточки",
  },

  "error.path-outside-content": "{subject} — вне контент-репозитория",
  "error.request-id-reused":
    "requestId {subject} уже использован для другого вызова",
  "error.item-not-active": "{subject} — не review item активной карточки",
  "error.topic-exists": "Тема {subject} уже есть",
  "error.topic-not-found": "Темы {subject} нет",
  "error.card-not-found": "Карточки с id {subject} нет",
  "error.package-not-found": "По пути {subject} нет learning package",
  "error.nothing-to-undo":
    "Нет оценки с этого устройства, которую можно отменить",
  "error.content-changed":
    "{subject} изменился, пока готовилась запись; ничего не записано",
  "error.search-index-invalid":
    "Индекс поиска в content bundle не читается этой версией",
  "error.input-invalid": "Поле входа {field} неверно",
  "error.tool-unknown": "Инструмента {subject} нет",
  "error.config-invalid": "{file}: поле {field} неверно",
  "error.config-json": "{file} — не валидный JSON",
  "hint.config-json": "Исправь синтаксис файла и вызови снова",
  "error.event-invalid":
    "У события повторения неверное поле {field}; ничего не записано",
  "error.repository-not-found":
    "В папке контента, с которой запущен сервер, нет {file}",
  "error.io-failed": "Не удаётся прочитать или записать {file}",
  "error.render-failed": "Не удалось отрисовать {file}",
  "error.scheduler-unsupported":
    "learn.config.json указывает не тот планировщик, что {expected}",
  "error.unexpected": "Непредвиденный сбой: {detail}",

  "hint.path-outside-content":
    "Передай путь от корня репозитория, без .. и ссылок, ведущих наружу",
  "hint.request-id-reused":
    "Для изменённого вызова возьми новый requestId; повторяй id только с тем же входом",
  "hint.item-not-active":
    "Бери review items из quiz_next: черновики и карточки в retired не повторяются",
  "hint.topic-exists":
    "Дополняй её через add_cards, save_summary и save_materials",
  "hint.topic-not-found":
    "Сначала создай её через create_topic или найди её <domain>/<topic> через search",
  "hint.card-not-found": "Найди id карточки через search",
  "hint.package-not-found":
    "Передай путь к файлу в inbox/, например inbox/topic.md",
  "hint.nothing-to-undo":
    "Здесь отменяются только оценки, записанные через record_review на этом устройстве",
  "hint.content-changed":
    "Файл сохранили в это время: вызови инструмент снова, чтобы опереться на новый текст",
  "hint.search-index-invalid":
    "Пересобери bundle командой wastech-learn build или перезапусти wastech-learn serve",
  "hint.input-invalid": "Исправь это поле и вызови инструмент снова",
  "hint.tool-unknown":
    "Запроси список инструментов, чтобы увидеть, что есть у сервера",
  "hint.config-invalid": "Исправь значение в файле и вызови снова",
  "hint.event-invalid": "Проверь оценку и review item и вызови снова",
  "hint.repository-not-found":
    "Запусти сервер с --content, указывающим на контент-репозиторий",
  "hint.io-failed": "Проверь, что файл существует и доступен для записи",
  "hint.render-failed":
    "Проверь, что npx может запустить mermaid-cli на этой машине, и вызови снова",
  "hint.scheduler-unsupported":
    "Укажи в srs.scheduler версию, с которой идёт фреймворк, или обнови фреймворк",
  "hint.unexpected":
    "Ничего не записано; расскажи автору фреймворка, что к этому привело",

  "cli.check.summary": "{files}, {errors}, {warnings}",
  "cli.check.clean": "Проверено: {cards}, замечаний нет",
  "cli.build.written": "Bundle записан в {file}: {topics}, {cards}",
  "cli.build.blocked": "Bundle не записан: исправь ошибки выше и запусти снова",
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
    "",
    "Параметры:",
    "  --content <папка>  Контент-репозиторий (по умолчанию текущая папка)",
    "  --lang <ru|en|pl>  Язык сообщений (по умолчанию uiLanguage из learn.config.json)",
    "  --help             Показать эту справку",
    "",
    "build:    --out <файл> (по умолчанию .cache/content-bundle.json), --built-at <дата ISO>",
    "render:   --check",
    "simulate: --cards, --warmup-days, --break-days, --session-minutes, --seed, --runs",
  ].join("\n"),
};
