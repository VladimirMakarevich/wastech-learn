import { cliRu } from "./cli-ru.js";
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
  "finding.card-id-changed":
    "id остаётся {id}: под ним хранится история повторений карточки",
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
  "error.nothing-to-restore":
    "Карточка {subject} не удалена после последнего коммита — возвращать нечего",
  "error.content-changed":
    "{subject} изменился, пока готовилась запись; ничего не записано",
  "error.source-not-found":
    "{subject} — не файл темы или карточки, который можно править в приложении",
  "error.search-index-invalid":
    "Индекс поиска в content bundle не читается этой версией",
  "error.id-unavailable":
    "Не удалось создать новый id: источник случайности или часы дали {subject}",
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
  "hint.nothing-to-restore":
    "Удаление отменяется только до коммита; после него файл остаётся в истории git",
  "hint.content-changed":
    "Файл сохранили в это время: вызови инструмент снова, чтобы опереться на новый текст",
  "hint.source-not-found":
    "Открой файл из темы или карточки, которые показывает приложение",
  "hint.search-index-invalid":
    "Пересобери bundle командой wastech-learn build или перезапусти wastech-learn serve",
  "hint.id-unavailable":
    "Проверьте часы компьютера и повторите вызов; если это повторится, это ошибка wastech-learn",
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
  ...cliRu,
};
