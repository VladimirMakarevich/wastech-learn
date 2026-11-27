import type { MessageKey } from "./en";
import type { Message } from "./message";

export const ru: Readonly<Record<MessageKey, Message>> = {
  "app.name": "wastech-learn",
  "nav.main": "Основная навигация",
  "nav.home": "Главная",
  "nav.review": "Повторение",
  "nav.browser": "Карточки",
  "nav.stats": "Статистика",
  "nav.settings": "Настройки",
  "title.home": "Главная",
  "title.review": "Повторение",
  "title.session-end": "Итоги сессии",
  "title.topic": "Тема",
  "title.browser": "Карточки",
  "title.stats": "Статистика",
  "title.settings": "Настройки",
  "shell.search": "Поиск по темам и карточкам",
  "shell.search-short": "Поиск",
  "shell.language": "Язык интерфейса",
  "shell.theme-dark": "Тёмная тема",
  "shell.theme-light": "Светлая тема",
  "shell.refresh": "Обновить контент",
  "shell.refreshed": "Контент обновлён",
  "shell.saved": "{device} · всё сохранено",
  "shell.pending": "{device} · {events} ждут сервер",
  "shell.offline":
    "Нет связи с локальным сервером: показано то, что уже загружено. Запусти wastech-learn serve снова",
  "shell.loading": "Загружаю контент…",
  "shell.unavailable":
    "Контент пока не собирается: исправь ошибки ниже и сохрани файл",
  "toast.offline": "Оценки сохранятся, когда сервер вернётся",
  "toast.refused": "Сервер не принял {events}; в журнал они не попали",
  "banner.build-failed":
    "Последняя правка не собралась, поэтому показана последняя собранная версия",
  "banner.build-error":
    "Bundle не пересобрался ({code}); показана последняя собранная версия",
  "banner.open": "Открыть в VS Code",
  "count.cards": {
    one: "{count} карточка",
    few: "{count} карточки",
    many: "{count} карточек",
    other: "{count} карточки",
  },
  "count.minutes": {
    one: "{count} минута",
    few: "{count} минуты",
    many: "{count} минут",
    other: "{count} минуты",
  },
  "count.events": {
    one: "{count} оценка",
    few: "{count} оценки",
    many: "{count} оценок",
    other: "{count} оценки",
  },
  "count.errors": {
    one: "{count} ошибка",
    few: "{count} ошибки",
    many: "{count} ошибок",
    other: "{count} ошибки",
  },
};
