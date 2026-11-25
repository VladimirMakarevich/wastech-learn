# Исследование: наука обучения

Сжатые итоги. Как это реализовано в продукте — в [principles.md](../learning/principles.md).

## Make It Stick: принципы и данные

| Принцип | Данные | Что это значит для продукта |
| --- | --- | --- |
| Retrieval practice | Roediger & Karpicke 2006: через неделю 61% (учёба + 3 теста) против 40% (4 раза учёба); перечитывание *повышало уверенность*. Karpicke & Blunt 2011: retrieval 67%, concept mapping 45% | «Попытка → ответ» везде; brain dump до перечитывания summary |
| Spacing | Cepeda et al. 2008: оптимальный перерыв ≈20–40% от срока хранения при сроке в неделю и ≈5–10% при сроке в год | FSRS с DR 0.90 |
| Interleaving | Kornell & Bjork 2008: ≈80% участников считали блоки не хуже, хотя чередование выигрывало. Rohrer et al. 2014: 72% против 38%, d=1.05 | Общая очередь из всех доменов; смешанные сессии сценариев |
| Varied practice | В книге — эксперимент с бросками на 2 и 4 фута против 3 футов | 3+ карточки на идею, сценарии с разными параметрами |
| Elaboration | Связь с известным, объяснение своими словами | Карточки why и «связь с X»; вопросы «где это у тебя» |
| Generation | Попытка до объяснения улучшает усвоение, даже если ответ неверный. Pan et al. 2022: свои карточки лучше готовых, d=0.45 | Pre-questions; пользователь правит кандидатов ИИ |
| Reflection | «Learning paragraphs» | Журнал рефлексии |
| Calibration | Беглость и знакомость текста создают иллюзию знания | Уверенность до показа ответа; кривая калибровки |
| Mnemonics | Помогает найти факт, но не даёт понимания. Wozniak применяет к 1–5% элементов | Только для leech и аббревиатур |
| Structure building | Сильные ученики строят каркас, «rule learners» выводят правило | TL;DR + ментальная модель в summary |
| Desirable difficulties | Bjork: storage strength и retrieval strength — разные вещи. Трудность должна быть посильной | DR около 0.9, а не 0.97; подсказки скрыты |
| Growth mindset | **[вывод]** У мета-анализов эффект интервенций небольшой (Sisk et al., 2018) | UI не наказывает за Again |

## Дополнительные источники

- **Dunlosky et al. 2013** — высокая полезность: practice testing и distributed practice. Средняя: elaborative interrogation, self-explanation, interleaving. Низкая: summarization, highlighting, keyword mnemonic, imagery, rereading.
- **Wozniak, 20 rules** — понимать до запоминания; minimum information; cloze; избегать множеств (больше 5 элементов «очень трудно»); интерференция — главная причина забывания; контекстные префиксы; личные примеры (0 забываний за 5 лет против 20 за год); источники и даты.
- **Matuschak** — prompt должен быть focused, precise, consistent, tractable, effortful; без yes/no; длинный prompt ведёт к pattern matching; писать больше prompts, чем кажется нужным; salience prompts.
- **Nielsen** — около 8 с на повторение, 4–7 мин за жизнь карточки; добавлять, если карточка стоит ~10 мин будущего времени; 15–20 мин в день; меньше 5 хороших вопросов — не добавлять ничего.
- **Successive relearning (Rawson, Dunlosky)** — 68% против 26% через неделю: по одному правильному вспоминанию в трёх сессиях против трёх в одной.
- **Dual coding / Mayer** — слова + изображение, d≈1.4–1.7; coherence, signaling, segmenting, pretraining; подписи на схеме (spatial contiguity).
- **Cognitive load** — рабочая память ~3–5 chunks (Cowan). **Expertise reversal:** worked examples помогают новичкам, опытным лучше задача.
- **Pretesting** — Richland et al. 2009: польза даже при неверных ответах. На концептуальных вопросах эффект слабее (Hausman & Rhodes 2018).
- **Hypercorrection** — ошибки при высокой уверенности исправляются лучше (Butterfield & Metcalfe).
- **Bastani et al. (PNAS 2025)** — ChatGPT, который даёт ответы, дал −17% на экзамене относительно контроля; версия-тьютор с подсказками — на уровне контроля.
- **Feynman technique** — **[вывод]** популярная эвристика, а не исследовательский протокол. По сути это retrieval и self-explanation.

## Метрики эффективности (из исследования)

True retention против DR, RMSE модели, калибровка (Brier), leech rate, прогноз нагрузки, **[вывод]** mastery темы и распределение по Bloom. Подробно — в [metrics.md](../scheduling/metrics.md).

## Источники

- Make It Stick — <https://www.hup.harvard.edu/books/9780674729018>
- Dunlosky et al. — <https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html>
- Wozniak — <https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge>
- Matuschak — <https://andymatuschak.org/prompts/>
- Nielsen — <http://augmentingcognition.com/ltm.html>
- Bjork — <https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-introducing-desirable-difficulties-into-practice-and-instruction-bjork-and-bjork.pdf>
- Successive relearning — <https://journals.sagepub.com/doi/full/10.1177/09637214221100484>
- Cepeda 2008 — <https://pubmed.ncbi.nlm.nih.gov/19076480/>
- Roediger & Karpicke — <https://source.washu.edu/2006/03/repeated-testtaking-better-for-retention-than-repeated-studying-research-shows/>
- Karpicke & Blunt — <https://pubmed.ncbi.nlm.nih.gov/21252317/>
- Kornell & Bjork — <https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Kornell_Bjork_2008_PsychScience.pdf>
- Rohrer et al. 2014 — <https://link.springer.com/article/10.3758/s13423-014-0588-3>
- Mayer — <https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf>
- Cowan — <https://pubmed.ncbi.nlm.nih.gov/11515286/>
- Pretesting — <https://learninglab.uchicago.edu/Pre-Testing_files/RichlandKornellKao.pdf>
- Pan et al. 2022 — <https://sc-pan.github.io/pdf/ZIP_2022.pdf>
- Bastani et al. — <https://papers.ssrn.com/abstract=4895486>
- Collector's fallacy — <https://www.zettelkasten.de/posts/collectors-fallacy>
- Progressive summarization — <https://fortelabs.com/blog/progressive-summarization-iii-guidelines-and-principles/>
