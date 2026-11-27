# Исследование: алгоритмы интервального повторения

Сжатые итоги. Принятые параметры - в [srs.md](../scheduling/srs.md).

## Сравнение алгоритмов

| | Leitner | SM-2 (старый Anki) | FSRS |
| --- | --- | --- | --- |
| Модель | Коробки; провал возвращает в первую | Ease factor (старт 250%), интервал × ease | Модель памяти DSR с обучаемыми весами |
| Предсказывает P(recall) | нет | нет | да |
| Персонализация | нет | нет | оптимизатор по журналу |
| Проблемы | Грубые интервалы | «Ease hell» | Нужна история для оптимизации |

## FSRS кратко

- **D, S, R** - difficulty (1-10), stability (дни до R = 90%), retrievability.
- **Кривая забывания FSRS-6:** `R(t,S) = (1 + f·t/S)^(−w20)`, где `f = 0.9^(−1/w20) − 1`. При DR = 0.9 интервал I = S.
- **Успешный ответ** увеличивает S, и тем сильнее, чем ниже была R. Hard даёт штраф, Easy - бонус. **Провал** уменьшает S.
- **FSRS-7:** две стабильности, 34 веса, дробные интервалы, нативные повторы в тот же день. Автор называет его «final version».
- **DR** по умолчанию 0.9, разумный диапазон 0.70-0.97. Выше 0.9 нагрузка растёт круто.

## Бенчмарк (srs-benchmark, ~350 млн повторений, 10k коллекций Anki)

| Модель | Log loss ↓ | RMSE(bins) ↓ | AUC ↑ |
| --- | --- | --- | --- |
| FSRS-7 | 0.3401 | 0.0634 | 0.7167 |
| FSRS-7, веса по умолчанию | 0.3620 | 0.0910 | 0.7029 |
| FSRS-6 | 0.3460 | 0.0653 | 0.7034 |
| FSRS-5 | 0.3561 | 0.0742 | 0.7010 |
| FSRS-4.5 | 0.3625 | 0.0764 | 0.6891 |

- FSRS-6 лучше SM-2 у 99.6% пользователей, оптимизированный FSRS-6 лучше варианта с весами по умолчанию у 84.3%.
- Оговорка: SM-2 не выдаёт вероятности, поэтому прямое сравнение условно.
- **[вывод]** FSRS-7 с весами по умолчанию примерно равен оптимизированному FSRS-4.5. Для персональной системы с малым числом повторений это важнее оптимизации.

## Оптимизатор

- В Anki начиная с 24.06 нет минимума повторений: оптимизатор сам выбирает режим - веса по умолчанию, pretrain первых 4 весов или полное обучение. Health check предупреждает, если повторений меньше нескольких сотен.
- Переоптимизировать раз в месяц или когда число повторений удвоилось. RemNote советует от 1000 повторений.
- **[вывод]** До ~1000 повторений - веса по умолчанию. Новые веса принимаются, только если log loss стал ниже.

## Шкала оценок

- Мануал Anki: Again в 5-20% ответов, Good в 80-95%. Hard - это зачёт. FSRS выдерживает любые привычки, кроме Hard вместо провала. Допускает режим «только Again и Good».
- 8-9% пользователей на форуме Anki считали Hard провалом.
- Mochi использует только 2 оценки: «FSRS works fine with binary grades».
- Исследование рекомендовало 2 кнопки, пользователь выбрал 4 → [ADR-0005](../adr/0005-four-button-rating.md).

## Параметры

- **Learning steps** укладываются в один день, их мало: py-fsrs - `[1m, 10m]`, relearning - `[10m]`.
- **Максимальный интервал:** в Anki по умолчанию 36 500 дней. **[вывод]** Для инженерных знаний - 1-2 года.
- **Fuzz** в ts-fsrs 6 детерминирован (FNV-1a + Mulberry32), поэтому replay воспроизводим.
- **Load balancing** (Anki 24.11) выбирает внутри fuzz-окна день с меньшей нагрузкой.
- **Leech:** порог 8 провалов, дальше каждые 4. По умолчанию - тег и suspend.
- **Граница дня** в Anki - 4:00. Оптимизатору нужны час начала дня и IANA-таймзона.

## Библиотеки

| Библиотека | Версия (ноябрь 2026) | Лицензия | Примечание |
| --- | --- | --- | --- |
| ts-fsrs | 6.0.1 | MIT | По умолчанию FSRS-7, Node ≥24; API изменился (`DefaultScheduler`, frozen `Rating`/`State`) |
| @open-spaced-repetition/binding | 0.6.3 (beta) | - | fsrs-rs через napi-rs: `computeParameters`, `computeOptimalSteps`; в браузере - WASI + COOP/COEP |
| fsrs-rs | 7.0.0 | BSD-3 | Эталон и оптимизатор |
| py-fsrs | 6.3.3 | MIT | Оптимизатор через `fsrs[optimizer]` |
| .NET (FsrsSharp и др.) | 5.1.3 / 1.0.x | community | Официальной реализации нет, порты незрелые |

## Источники

- <https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm>
- <https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS>
- <https://github.com/open-spaced-repetition/srs-benchmark> · <https://expertium.github.io/Benchmark.html>
- <https://docs.ankiweb.net/deck-options.html> · <https://docs.ankiweb.net/studying.html> · <https://docs.ankiweb.net/leeches.html>
- <https://forums.ankiweb.net/t/how-to-prevent-users-from-misusing-hard-ideas-are-welcome/49092>
- <https://mochi.cards/docs/reviewing/fsrs/>
- <https://github.com/open-spaced-repetition/ts-fsrs/releases> · <https://github.com/open-spaced-repetition/fsrs-optimizer>
