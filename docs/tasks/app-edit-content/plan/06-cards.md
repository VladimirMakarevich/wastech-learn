# Фаза 06 - Правка в Cards

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 05
- **Даёт:** Редактор в боковой панели, `e` и `Shift+E`

## Цель

Первый экран с правкой и первые e2e-сценарии всего пути: от карандаша до нового текста на экране (AE-F01, AE-F05…AE-F15).

## Шаги

1. `packages/app/src/app/screens/browser/browser.html` и `browser.ts`: кнопка с карандашом «Править» и `e` в панели; на время правки панель шире и показывает редактор вместо карточки; закрытие возвращает карточку и фокус.
2. Ссылка VS Code в панели - по `Shift+E`, подсказка клавиши обновлена.
3. Маршрут Cards получает `canDeactivate` из фазы 05.
4. `packages/app/e2e/`: сценарии Cards на golden-копии - сохранение и новый текст в панели; удалённый `## Answer` → находка → курсор на строке; правка файла на диске во время правки → конфликт и свежая версия; `Esc` и переход с изменённым текстом → подтверждение.

## Затронутые файлы

- `packages/app/src/app/screens/browser/`
- `packages/app/src/app/app.routes.ts`
- `packages/app/e2e/` (сценарии правки в Cards)

## Правила

Работа с экраном начинается с [PRODUCT.md](../../../../PRODUCT.md) и skill `impeccable`; e2e - только копия golden, без сети ([testing](../../../../.rules/testing.md)).

## Тесты

Playwright на `serve` над golden-копией: сценарии шага 4.

## Приёмка фазы

- [ ] AC-F01, AC-F05 (Cards), AC-F06, AC-F07, AC-F08a, AC-F09, AC-F14, AC-F15a (e2e) проходят.
- [ ] `npm run lint`, `npm test`, `npm run build` и `npm run test:e2e` зелёные.
