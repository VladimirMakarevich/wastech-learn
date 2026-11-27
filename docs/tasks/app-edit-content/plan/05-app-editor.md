# Фаза 05 - Основа редактора в приложении

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 04
- **Даёт:** API-клиент, модель и компонент редактора, диалог, защита несохранённого, тексты

## Цель

Один редактор для трёх экранов: экраны в фазах 06-08 только встраивают его (design D10-D12).

## Шаги

1. `packages/app/src/app/data/api.ts`: `fetchSource(path)` и `saveSource(body)`; ответы разбираются схемами `core` на краю, сбой - `ApiError` с кодом.
2. `packages/app/src/app/edit/editor-model.ts`: чистый модуль на signals - состояния `loading`, `editing`, `saving`, `blocked`, `decision`, `conflict`; признак «текст изменён»; находки с признаком «в этом файле» и строкой; повтор с `meaning`; «загрузить свежую версию».
3. `packages/app/src/app/edit/source-editor.ts` с шаблоном: `<textarea>` моноширинным шрифтом, кнопки «Сохранить» и «Отмена», `Ctrl/Cmd+S` и `Esc`, список находок с переходом к строке (`setSelectionRange` и прокрутка), «Сохранено», вход `section` для позиции курсора. Фокус в поле при открытии, на кнопке-источнике после закрытия.
4. `packages/app/src/app/ui/confirm-dialog.ts` на `@angular/cdk/dialog`: «та же или новая», «закрыть без сохранения», «заменить черновик свежей версией».
5. `packages/app/src/app/edit/unsaved-guard.ts`: `canDeactivate` для маршрутов и `beforeunload`, пока текст изменён.
6. Ключи в `i18n/ru.ts`, `en.ts`, `pl.ts` по [tone-of-voice](../../../../.rules/tone-of-voice.md); находки `check` - через `formatFinding`.

## Затронутые файлы

- `packages/app/src/app/data/api.ts`
- `packages/app/src/app/edit/`
- `packages/app/src/app/ui/confirm-dialog.ts`
- `packages/app/src/app/i18n/`
- `packages/app/test/editor-model.test.ts`, `packages/app/test/api.test.ts`

## Правила

Компоненты тонкие, логика в чистых модулях; `app` импортирует только `core`, `srs`, `session`; пользовательский текст - только как текст, никогда как HTML; токены [DESIGN.md](../../../../DESIGN.md); без новых зависимостей.

## Тесты

Vitest: переходы `editor-model` (сохранение, `blocked`, `decision` → повтор с `meaning`, `conflict` → свежая версия, признак изменённого текста); разбор каждого ответа `/api/source` в `api.ts`; паритет ключей и аудит литералов.

## Приёмка фазы

- [ ] Unit-тесты модели и API зелёные; AC-F16 по новым ключам проходит.
- [ ] `npm run lint`, `npm test` и `npm run build` зелёные, бюджет `initial` не превышен.
