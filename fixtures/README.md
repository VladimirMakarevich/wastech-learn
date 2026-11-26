# Фикстуры тестов

## `golden/` — копия golden sample

Копия golden sample из приватного репозитория `wastech-learn-content`: 3 темы, 30 карточек, языки en, ru и pl. На ней работают golden-тесты разбора, `check` и `build`, а также CLI-тесты на временной копии.

- **Что входит:** `content/`, `learn.config.json`, `wastech-mdlint.config.json`.
- **Чего нет намеренно:** `learn.local.json` — тест проверяет, что без него имя устройства берётся из hostname; `reviews/` — журналы тесты строят сами во временной папке.
- **Источник:** `wastech-learn-content`, коммит `4db2e0b` и правка карточки `rb9cs4q3`: в ответ добавлен пример предложения, которого требует `check`.

Копия не правится руками. Ошибка в golden исправляется в `wastech-learn-content` отдельным коммитом, затем копия обновляется целиком:

```bash
rm -rf fixtures/golden && mkdir -p fixtures/golden
```

```bash
cp -r ../wastech-learn-content/content ../wastech-learn-content/learn.config.json ../wastech-learn-content/wastech-mdlint.config.json fixtures/golden/
```

После обновления — `npm test`. Если изменился снимок bundle, его пересобирают осознанно (`npx vitest run -u`) и проверяют diff перед коммитом. Новый коммит источника записывается в этот файл.
