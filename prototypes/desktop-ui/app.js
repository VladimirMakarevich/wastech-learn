// Прототип десктопного UI wastech-learn. Ванильный JS без сборки: проверяем
// компоновку и сценарии, а не стек. Данные — golden sample (data.js);
// интервалы, R, статистика и прогнозы — демонстрационные.
(() => {
  "use strict";

  const DATA = window.LEARN_DATA;
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  const store = {
    get: (k, d) => {
      try {
        return localStorage.getItem(k) ?? d;
      } catch {
        return d;
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* В приватном режиме хранилище недоступно: прототип работает и без запомненных настроек. */
      }
    },
  };

  const PLURAL = {
    ru: {
      one: "карточка",
      few: "карточки",
      many: "карточек",
      other: "карточки",
    },
    en: { one: "card", other: "cards" },
    pl: { one: "karta", few: "karty", many: "kart", other: "karty" },
  };
  const T = {
    ru: {
      nav_home: "Главная",
      nav_review: "Повторение",
      nav_topics: "Темы",
      nav_cards: "Карточки",
      nav_stats: "Статистика",
      nav_settings: "Настройки",
      search: "Поиск по темам и карточкам",
      today: "Сегодня",
      min: "мин",
      d: "дн",
      mo: "мес",
      new_of: "Новые: {a} из {b} · польский: {c}",
      b5: "5 минут",
      b15: "15 минут",
      ball: "Вся очередь",
      demo: "Демо-состояние",
      demo_normal: "Обычный день",
      demo_back: "После перерыва",
      back_title: "С возвращением! Накопилось {cards} ≈ {m} мин",
      back_plan:
        "Предлагаю 3 дня по 15 минут — новые карточки пока на паузе. Расписание не сдвигаю: FSRS сам учтёт перерыв.",
      forecast: "Прогноз на 7 дней",
      topics: "Темы",
      cards: "Карточек",
      due: "Сегодня",
      mastery: "Освоение",
      capture_t: "Новая тема",
      capture:
        "Разбери её в Claude Code: «разберём …» запустит `learn-capture`. Из ChatGPT — положи learning package в `inbox/` и вызови `learn-import`.",
      quiz_t: "Квиз в чате",
      quiz: "Без браузера: в Claude Code скажи «погоняй меня 10 минут» — ИИ проверит ответы по рубрике, оценку подтверждаешь ты.",
      show: "Показать ответ",
      conf: "Уверенность до ответа",
      c1: "не уверен",
      c2: "скорее да",
      c3: "точно",
      again: "Не вспомнил",
      hard: "С трудом",
      good: "Вспомнил",
      easy: "Легко",
      hard_hint: "Hard — это зачёт. Если не вспомнил, жми «Не вспомнил»",
      answer: "Ответ",
      expl: "Пояснение",
      rubric: "Рубрика: отметь, что назвал",
      req: "обяз.",
      suggested: "Предложено по рубрике: {r}",
      sc_topic: "тема",
      sc_undo: "отменить",
      sc_susp: "отложить",
      ctx: "Контекст",
      ctx_key: "Суть темы",
      ctx_sum: "Открыть раздел summary",
      ctx_state: "Состояние FSRS (демо)",
      r_now: "R сейчас",
      lapses: "Провалы",
      last: "Последний повтор",
      is_new: "новая карточка",
      file: "Файл",
      vscode: "Открыть в VS Code",
      changed: "изменена после прошлого повтора",
      days_ago: "{n} дн назад",
      left: "Осталось ≈ {m} мин",
      listen: "Прослушать",
      mem_title: "Память сессии (демо)",
      end: "Завершить",
      demo_iv: "интервалы — демо",
      mem_new: "новая",
      mem_aria: "{cards} в сессии, средний R {r}%",
      mem_aria_new: "{cards} в сессии, все новые",
      sr_card: "Карточка {i} из {n}",
      today_l: "сегодня",
      end_t: "Готово: {cards} за {m} мин",
      end_rec: "Вспомнил {a} из {b}",
      end_hc:
        "Ошибки при уверенности «точно» — кандидаты на карточку различения",
      end_none: "Нет — калибровка в порядке",
      end_tom: "Завтра ≈ {cards}",
      home: "На главную",
      more: "Ещё 5 минут",
      t_undo: "Оценка отменена",
      t_vscode: "Открылось бы в VS Code: {f}",
      t_susp: "Карточка отложена (suspend)",
      t_cram: "Тренировка по теме без влияния на расписание — позже",
      cram: "Повторить тему",
      open_topic: "Открыть тему",
      close: "Закрыть",
      col_title: "Карточка",
      col_type: "Тип",
      col_topic: "Тема",
      col_status: "Статус",
      all_domains: "Все домены",
      all_types: "Все типы",
      found: "Найдено: {n}",
      col_due: "Срок",
      st_leech_l: "Трудные (leech)",
      search_short: "Поиск",
      updated: "обновлено {d}",
      chat_t: "Из чата",
      mem_topic: "{cards}, средний R {r}%",
      due_n: "{n} сегодня",
      toc: "Разделы",
      st_active: "активна",
      changed_s: "изменена",
      f_domain: "Домен",
      all: "Все",
      none_found:
        "Ничего не нашлось — попробуй другое слово или сбрось фильтры",
      st_fc_aria:
        "Прогноз на 30 дней: до {max} карточек в день, в среднем {avg}",
      st_avg: "В среднем {n} в день; выходные приглушены",
      st_act: "Активность",
      st_ret: "Удержание (true retention)",
      st_young_r: "Молодые карточки",
      st_mature_r: "Зрелые карточки",
      st_ret_f: "Доля вспомненных за 30 дней. Цель — {dr} из настроек",
      st_grades: "Оценки",
      st_hard_l: "Доля Hard",
      g_ui: "Интерфейс",
      g_pl: "Польский",
      s_tech: "Технические домены",
      less: "Меньше",
      more_n: "Больше",
      s_dev_name: "Имя",
      pretest: "Pretest",
      materials: "Материалы",
      key: "Суть",
      show_q: "Показать вопросы самопроверки",
      map_later: "Карта знаний (связи тем) — позже",
      st_young: "True retention · молодые",
      st_mature: "True retention · зрелые",
      st_reviews: "Повторений за 30 дней",
      st_time: "Медиана сессии",
      st_fc: "Прогноз нагрузки на 30 дней",
      st_hard: "Hard в 9% ответов — в норме: его не путают с провалом",
      st_cal: "Калибровка и Bloom — после MVP",
      st_leech: "Трудных карточек (leech) нет — исправлять нечего",
      s_lang: "Язык интерфейса",
      s_lang_h: "Контент тем остаётся на своём языке",
      s_dr: "Целевое удержание (DR)",
      s_dr_h: "Выше — больше повторений в день",
      s_limits: "Новых в день",
      s_limits_h: "Отдельно для языковых доменов",
      s_sess: "Длина сессии",
      s_tts: "Озвучка pl-PL",
      s_tts_btn: "Проверить голос",
      s_heat: "Карта активности",
      s_heat_h: "По умолчанию выключен — без стриков",
      s_dev: "Устройство",
      per_day: "≈ {m} мин в день",
      tts_ok: "Голос найден: {v}",
      tts_no: "Польского голоса нет — кнопка 🔊 скрыта",
      theme_dark: "Тёмная тема",
      theme_light: "Светлая тема",
      sync: "git · desk1 · 2 новых события",
      proto:
        "Прототип: данные — golden sample; интервалы, R и статистика — демо.",
    },
    en: {
      nav_home: "Home",
      nav_review: "Review",
      nav_topics: "Topics",
      nav_cards: "Cards",
      nav_stats: "Statistics",
      nav_settings: "Settings",
      search: "Search topics and cards",
      today: "Today",
      min: "min",
      d: "d",
      mo: "mo",
      new_of: "New: {a} of {b} · Polish: {c}",
      b5: "5 minutes",
      b15: "15 minutes",
      ball: "Whole queue",
      demo: "Demo state",
      demo_normal: "Normal day",
      demo_back: "After a break",
      back_title: "Welcome back! {cards} piled up ≈ {m} min",
      back_plan:
        "Plan: 3 days × 15 minutes — new cards are paused for now. The schedule is not shifted: FSRS accounts for the break.",
      forecast: "7-day forecast",
      topics: "Topics",
      cards: "Cards",
      due: "Due",
      mastery: "Mastery",
      capture_t: "New topic",
      capture:
        "Study it in Claude Code: “let’s study …” starts `learn-capture`. From ChatGPT, drop a learning package into `inbox/` and run `learn-import`.",
      quiz_t: "Quiz in chat",
      quiz: "No browser needed: tell Claude Code “quiz me for 10 minutes” — the AI checks answers against the rubric, you confirm the rating.",
      show: "Show answer",
      conf: "Confidence before the answer",
      c1: "unsure",
      c2: "probably",
      c3: "certain",
      again: "Forgot",
      hard: "With effort",
      good: "Recalled",
      easy: "Easy",
      hard_hint: "Hard is a pass. If you did not recall it, press “Forgot”",
      answer: "Answer",
      expl: "Explanation",
      rubric: "Rubric: tick what you covered",
      req: "req.",
      suggested: "Suggested by rubric: {r}",
      sc_topic: "topic",
      sc_undo: "undo",
      sc_susp: "suspend",
      ctx: "Context",
      ctx_key: "Key idea",
      ctx_sum: "Open summary section",
      ctx_state: "FSRS state (demo)",
      r_now: "R now",
      lapses: "Lapses",
      last: "Last review",
      is_new: "new card",
      file: "File",
      vscode: "Open in VS Code",
      changed: "edited since last review",
      days_ago: "{n} d ago",
      left: "≈ {m} min left",
      listen: "Listen",
      mem_title: "Session memory (demo)",
      end: "Finish",
      demo_iv: "intervals are demo",
      mem_new: "new",
      mem_aria: "{cards} in the session, mean R {r}%",
      mem_aria_new: "{cards} in the session, all new",
      sr_card: "Card {i} of {n}",
      today_l: "today",
      end_t: "Done: {cards} in {m} min",
      end_rec: "Recalled {a} of {b}",
      end_hc:
        "Mistakes made with high confidence — candidates for a contrast card",
      end_none: "None — calibration looks good",
      end_tom: "Tomorrow ≈ {cards}",
      home: "Home",
      more: "5 more minutes",
      t_undo: "Rating undone",
      t_vscode: "Would open in VS Code: {f}",
      t_susp: "Card suspended",
      t_cram: "Topic practice without rescheduling — later",
      cram: "Practice topic",
      open_topic: "Open topic",
      close: "Close",
      col_title: "Card",
      col_type: "Type",
      col_topic: "Topic",
      col_status: "Status",
      all_domains: "All domains",
      all_types: "All types",
      found: "Found: {n}",
      col_due: "Due",
      st_leech_l: "Leeches",
      search_short: "Search",
      updated: "updated {d}",
      chat_t: "From the chat",
      mem_topic: "{cards}, mean R {r}%",
      due_n: "{n} today",
      toc: "Sections",
      st_active: "active",
      changed_s: "changed",
      f_domain: "Domain",
      all: "All",
      none_found: "Nothing found — try another word or clear the filters",
      st_fc_aria: "30-day forecast: up to {max} cards a day, {avg} on average",
      st_avg: "{n} a day on average; weekends are muted",
      st_act: "Activity",
      st_ret: "Retention (true retention)",
      st_young_r: "Young cards",
      st_mature_r: "Mature cards",
      st_ret_f: "Share recalled over 30 days. Target: {dr} from Settings",
      st_grades: "Ratings",
      st_hard_l: "Hard share",
      g_ui: "Interface",
      g_pl: "Polish",
      s_tech: "Technical domains",
      less: "Fewer",
      more_n: "More",
      s_dev_name: "Name",
      pretest: "Pretest",
      materials: "Materials",
      key: "Key idea",
      show_q: "Show self-check questions",
      map_later: "Knowledge map (topic links) — later",
      st_young: "True retention · young",
      st_mature: "True retention · mature",
      st_reviews: "Reviews in 30 days",
      st_time: "Median session",
      st_fc: "30-day workload forecast",
      st_hard: "Hard in 9% of answers — fine: not used as a fail",
      st_cal: "Calibration and Bloom — after MVP",
      st_leech: "No leeches — nothing to fix",
      s_lang: "Interface language",
      s_lang_h: "Topic content stays in its own language",
      s_dr: "Desired retention",
      s_dr_h: "Higher means more reviews per day",
      s_limits: "New per day",
      s_limits_h: "Separate for language domains",
      s_sess: "Session length",
      s_tts: "pl-PL voice",
      s_tts_btn: "Check voice",
      s_heat: "Activity heatmap",
      s_heat_h: "Off by default — no streaks",
      s_dev: "Device",
      per_day: "≈ {m} min per day",
      tts_ok: "Voice found: {v}",
      tts_no: "No Polish voice — the 🔊 button is hidden",
      theme_dark: "Dark theme",
      theme_light: "Light theme",
      sync: "git · desk1 · 2 new events",
      proto:
        "Prototype: data is the golden sample; intervals, R and stats are demo values.",
    },
    pl: {
      nav_home: "Start",
      nav_review: "Powtórka",
      nav_topics: "Tematy",
      nav_cards: "Fiszki",
      nav_stats: "Statystyki",
      nav_settings: "Ustawienia",
      search: "Szukaj w tematach i fiszkach",
      today: "Dzisiaj",
      min: "min",
      d: "dni",
      mo: "mies.",
      new_of: "Nowe: {a} z {b} · polski: {c}",
      b5: "5 minut",
      b15: "15 minut",
      ball: "Cała kolejka",
      demo: "Stan demo",
      demo_normal: "Zwykły dzień",
      demo_back: "Po przerwie",
      back_title: "Witaj z powrotem! Zebrało się {cards} ≈ {m} min",
      back_plan:
        "Plan: 3 dni po 15 minut — nowe karty na razie wstrzymane. Harmonogram się nie przesuwa: FSRS uwzględni przerwę.",
      forecast: "Prognoza na 7 dni",
      topics: "Tematy",
      cards: "Karty",
      due: "Dzisiaj",
      mastery: "Opanowanie",
      capture_t: "Nowy temat",
      capture:
        "Omów go w Claude Code: „omówmy …” uruchamia `learn-capture`. Z ChatGPT — wrzuć learning package do `inbox/` i uruchom `learn-import`.",
      quiz_t: "Quiz w czacie",
      quiz: "Bez przeglądarki: powiedz w Claude Code „przepytaj mnie przez 10 minut” — AI sprawdzi odpowiedzi według rubryki, ocenę zatwierdzasz ty.",
      show: "Pokaż odpowiedź",
      conf: "Pewność przed odpowiedzią",
      c1: "niepewny",
      c2: "raczej tak",
      c3: "na pewno",
      again: "Nie pamiętam",
      hard: "Z trudem",
      good: "Pamiętam",
      easy: "Łatwe",
      hard_hint:
        "Hard to zaliczenie. Jeśli nie pamiętasz, wybierz „Nie pamiętam”",
      answer: "Odpowiedź",
      expl: "Wyjaśnienie",
      rubric: "Rubryka: zaznacz, co podałeś",
      req: "wym.",
      suggested: "Sugestia z rubryki: {r}",
      sc_topic: "temat",
      sc_undo: "cofnij",
      sc_susp: "zawieś",
      ctx: "Kontekst",
      ctx_key: "Sedno tematu",
      ctx_sum: "Otwórz sekcję summary",
      ctx_state: "Stan FSRS (demo)",
      r_now: "R teraz",
      lapses: "Wpadki",
      last: "Ostatnia powtórka",
      is_new: "nowa karta",
      file: "Plik",
      vscode: "Otwórz w VS Code",
      changed: "zmieniona od ostatniej powtórki",
      days_ago: "{n} dni temu",
      left: "Zostało ≈ {m} min",
      listen: "Odsłuchaj",
      mem_title: "Pamięć sesji (demo)",
      end: "Zakończ",
      demo_iv: "interwały demonstracyjne",
      mem_new: "nowa",
      mem_aria: "{cards} w sesji, średnie R {r}%",
      mem_aria_new: "{cards} w sesji, wszystkie nowe",
      sr_card: "Karta {i} z {n}",
      today_l: "dziś",
      end_t: "Gotowe: {cards} w {m} min",
      end_rec: "Pamiętam {a} z {b}",
      end_hc:
        "Błędy przy pewności „na pewno” — kandydaci na kartę rozróżniającą",
      end_none: "Brak — kalibracja w porządku",
      end_tom: "Jutro ≈ {cards}",
      home: "Strona główna",
      more: "Jeszcze 5 minut",
      t_undo: "Ocena cofnięta",
      t_vscode: "Otworzyłoby się w VS Code: {f}",
      t_susp: "Karta zawieszona",
      t_cram: "Ćwiczenie tematu bez wpływu na harmonogram — później",
      cram: "Powtórz temat",
      open_topic: "Otwórz temat",
      close: "Zamknij",
      col_title: "Fiszka",
      col_type: "Typ",
      col_topic: "Temat",
      col_status: "Status",
      all_domains: "Wszystkie dziedziny",
      all_types: "Wszystkie typy",
      found: "Znaleziono: {n}",
      col_due: "Termin",
      st_leech_l: "Trudne (leech)",
      search_short: "Szukaj",
      updated: "zaktualizowano {d}",
      chat_t: "Z czatu",
      mem_topic: "{cards}, średnie R {r}%",
      due_n: "{n} dziś",
      toc: "Sekcje",
      st_active: "aktywna",
      changed_s: "zmieniona",
      f_domain: "Domena",
      all: "Wszystkie",
      none_found:
        "Nic nie znaleziono — spróbuj innego słowa albo wyczyść filtry",
      st_fc_aria: "Prognoza na 30 dni: do {max} kart dziennie, średnio {avg}",
      st_avg: "Średnio {n} dziennie; weekendy są przygaszone",
      st_act: "Aktywność",
      st_ret: "Retencja (true retention)",
      st_young_r: "Młode karty",
      st_mature_r: "Dojrzałe karty",
      st_ret_f: "Odsetek przypomnianych z 30 dni. Cel: {dr} z ustawień",
      st_grades: "Oceny",
      st_hard_l: "Udział Hard",
      g_ui: "Interfejs",
      g_pl: "Polski",
      s_tech: "Domeny techniczne",
      less: "Mniej",
      more_n: "Więcej",
      s_dev_name: "Nazwa",
      pretest: "Pretest",
      materials: "Materiały",
      key: "Sedno",
      show_q: "Pokaż pytania kontrolne",
      map_later: "Mapa wiedzy (powiązania tematów) — później",
      st_young: "True retention · młode",
      st_mature: "True retention · dojrzałe",
      st_reviews: "Powtórek w 30 dni",
      st_time: "Mediana sesji",
      st_fc: "Prognoza obciążenia na 30 dni",
      st_hard: "Hard w 9% odpowiedzi — w normie: nie myli się go z porażką",
      st_cal: "Kalibracja i Bloom — po MVP",
      st_leech: "Brak trudnych kart (leech) — nie ma czego poprawiać",
      s_lang: "Język interfejsu",
      s_lang_h: "Treść tematów zostaje w swoim języku",
      s_dr: "Docelowa retencja (DR)",
      s_dr_h: "Wyżej — więcej powtórek dziennie",
      s_limits: "Nowych dziennie",
      s_limits_h: "Osobno dla dziedzin językowych",
      s_sess: "Długość sesji",
      s_tts: "Głos pl-PL",
      s_tts_btn: "Sprawdź głos",
      s_heat: "Mapa aktywności",
      s_heat_h: "Domyślnie wyłączona — bez serii",
      s_dev: "Urządzenie",
      per_day: "≈ {m} min dziennie",
      tts_ok: "Znaleziono głos: {v}",
      tts_no: "Brak polskiego głosu — przycisk 🔊 ukryty",
      theme_dark: "Ciemny motyw",
      theme_light: "Jasny motyw",
      sync: "git · desk1 · 2 nowe zdarzenia",
      proto:
        "Prototyp: dane to golden sample; interwały, R i statystyki są demonstracyjne.",
    },
  };
  let lang = store.get("wl-lang", "ru");
  const t = (k, vars = {}) =>
    (T[lang][k] ?? T.ru[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "");
  const nCards = (n) => {
    const forms = PLURAL[lang];
    return `${n} ${forms[new Intl.PluralRules(lang).select(n)] ?? forms.other}`;
  };
  // Месяцы — с одним знаком после запятой: целые месяцы сливают интервалы Good и Easy в одно
  // «2 мес», и выбор между ними теряет смысл.
  const days = (n) =>
    n < 30
      ? `${n} ${t("d")}`
      : `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(n / 30)} ${t("mo")}`;

  // R, stability и интервалы выводятся из хэша id карточки: прототип показывает, где живёт состояние
  // FSRS и как оно читается, а настоящее планирование появится только в пакете srs.
  const hash = (s) => {
    let h = 2166136261;
    for (const c of s) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const topicBy = Object.fromEntries(DATA.topics.map((tp) => [tp.path, tp]));
  const cardBy = Object.fromEntries(DATA.cards.map((c) => [c.id, c]));
  const NEW_IDS = new Set([
    "e4ej1s8e",
    "egpne135",
    "g1bv5c7y",
    "hnxyjtjj",
    "mmwv3t5h",
    "y446nd00",
    "z75gbez7",
  ]);
  for (const c of DATA.cards) {
    const r = rng(hash(c.id));
    c.isNew = NEW_IDS.has(c.id);
    c.S = c.isNew ? 0 : Math.round(1 + r() * 30);
    c.R = c.isNew ? null : 0.8 + r() * 0.17;
    c.lapses = c.isNew ? 0 : Math.floor(r() * 2.4);
    c.lastAgo = c.isNew ? null : 1 + Math.floor(r() * 12);
    c.dueIn = c.isNew ? 0 : Math.floor(r() * 9);
    c.changed = c.id === "5fdbzzng";
    c.plain = (
      c.questionText +
      " " +
      c.answerHtml.replace(/<[^>]+>/g, " ")
    ).toLowerCase();
  }
  const QUEUE = [
    "0d1gjcys",
    "7388t2qp",
    "e4ej1s8e:fwd",
    "1rd53181",
    "capexe3a",
    "y446nd00",
    "5fdbzzng",
    "gj7gzc7q:rev",
    "73y2xbmz",
    "2by9881r",
    "z75gbez7",
    "647aga38",
  ];
  const EST = {
    basic: 8,
    cloze: 8,
    vocab: 7,
    "grammar-cloze": 9,
    reversed: 7,
    why: 18,
    compare: 20,
    scenario: 45,
  };
  const estMin = (ids) =>
    Math.max(
      1,
      Math.round(
        ids.reduce((s, q) => s + (EST[cardBy[q.split(":")[0]].type] ?? 10), 0) /
          60,
      ),
    );
  const intervals = (c) =>
    c.isNew
      ? [`1 ${t("min")}`, `6 ${t("min")}`, `10 ${t("min")}`, days(3)]
      : [
          `10 ${t("min")}`,
          days(Math.max(1, Math.round(c.S * 1.2))),
          days(Math.round(c.S * 2.5)),
          days(Math.round(c.S * 4)),
        ];

  const ICON = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    review:
      '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/>',
    topics: '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/>',
    cards:
      '<rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v10"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings:
      '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    speaker:
      '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
  };
  const ico = (name) =>
    `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  const domainLabel = {
    architecture: "Architecture",
    dotnet: ".NET",
    angular: "Angular",
    "lang-pl": "Polski",
  };
  const typeChip = (c) =>
    `<span class="chip">${esc(c.type)} · ${esc(c.bloom)}</span>`;
  const slug = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9а-яё\s-]/gi, "")
      .trim()
      .replace(/\s+/g, "-");
  const cloze = (html, open) =>
    html.replace(/\{\{c\d+::(.+?)\}\}/g, (_, x) =>
      open
        ? `<span class="cloze open">${x}</span>`
        : '<span class="cloze">[…]</span>',
    );
  let toastTimer;
  const toast = (msg) => {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 2600);
  };
  const vscode = (c) =>
    toast(t("t_vscode", { f: `wastech-learn-content/${c.file}` }));
  let plVoice = null;
  const loadVoices = () => {
    plVoice =
      speechSynthesis
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith("pl")) ?? null;
  };
  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = () => {
      loadVoices();
      if (route().name === "review") render();
    };
  }
  const speak = (text) => {
    if (!plVoice) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pl-PL";
    u.voice = plVoice;
    speechSynthesis.speak(u);
  };

  // Просмотрщик Artifact пропускает в hash только простые имена (#home, #review), поэтому открытая тема,
  // якорь и сессия хранятся в state, а не в адресе.
  const state = {
    demo: "normal",
    session: null,
    filters: { q: "", domain: "", type: "" },
    drawer: null,
    topicPath: null,
    anchor: null,
    flash: null,
    focusSel: null,
    viaPointer: false,
  };
  const VIEWS = ["home", "review", "topics", "cards", "stats", "prefs"];
  const route = () => {
    const h = location.hash.replace(/^#/, "");
    return { name: VIEWS.includes(h) ? h : "home" };
  };
  const go = (view) => {
    if (location.hash === `#${view}`) render();
    else location.hash = `#${view}`;
  };
  const isDark = () =>
    document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme &&
      matchMedia("(prefers-color-scheme: dark)").matches);

  function renderChrome(name) {
    document.documentElement.lang = lang;
    const items = [
      ["home", "nav_home"],
      ["review", "nav_review"],
      ["topics", "nav_topics"],
      ["cards", "nav_cards"],
      ["stats", "nav_stats"],
      ["prefs", "nav_settings"],
    ];
    $("#nav").innerHTML = items
      .map(
        ([id, key]) => `
      <a class="nav-item nav-${id} ${name === id ? "active" : ""}" href="#${id}" data-nav="${id}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICON[id === "prefs" ? "settings" : id]}</svg>${esc(t(key))}
        ${id === "review" ? `<span class="badge">${QUEUE.length}</span>` : ""}
      </a>`,
      )
      .join("");
    $("#lang-switch").innerHTML = ["ru", "en", "pl"]
      .map(
        (l) =>
          `<button type="button" data-lang="${l}" class="${l === lang ? "active" : ""}">${l.toUpperCase()}</button>`,
      )
      .join("");
    const dark = isDark();
    const themeLabel = t(dark ? "theme_light" : "theme_dark");
    $("#theme-toggle").innerHTML =
      `${ico(dark ? "sun" : "moon")}<span class="label">${esc(themeLabel)}</span>`;
    $("#theme-toggle").setAttribute("aria-label", themeLabel);
    const prefsLink = $("#prefs-link");
    prefsLink.innerHTML = ico("settings");
    prefsLink.setAttribute("aria-label", t("nav_settings"));
    prefsLink.classList.toggle("active", name === "prefs");
    $("#sync").innerHTML = `<span class="dot"></span>${esc(t("sync"))}`;
    $("#proto-note").textContent = t("proto");
    $("#search").placeholder = t("search_short");
    $("#search").setAttribute("aria-label", t("search"));
  }

  // Строка точек — тот же язык памяти, что и в сессии: одна точка на карточку темы, яркость — R.
  function memStrip(cards) {
    const rev = cards.filter((c) => !c.isNew);
    const label = rev.length
      ? t("mem_topic", {
          cards: nCards(cards.length),
          r: Math.round((rev.reduce((a, c) => a + c.R, 0) / rev.length) * 100),
        })
      : t("mem_aria_new", { cards: nCards(cards.length) });
    return `<span class="memstrip" role="img" aria-label="${esc(label)}">${cards
      .map(
        (c) =>
          `<span class="pt sm${c.isNew ? " new" : ""}" style="--r:${memOpacity(c).toFixed(2)}"></span>`,
      )
      .join("")}</span>`;
  }

  const rCell = (c) =>
    c.isNew
      ? `<span class="r-cell"><span class="r-dot new"></span>${esc(t("mem_new"))}</span>`
      : `<span class="r-cell"><span class="r-dot" style="--r:${memOpacity(c).toFixed(2)}"></span>${pct(c.R)}</span>`;

  function topicRow(tp, withIdea) {
    const cs = DATA.cards.filter((c) => c.topic === tp.path);
    const due = QUEUE.filter(
      (q) => cardBy[q.split(":")[0]].topic === tp.path,
    ).length;
    // На странице тем домен уже стоит в заголовке группы, повторять его в строке незачем.
    const meta = [
      withIdea ? null : (domainLabel[tp.domain] ?? tp.domain),
      tp.lang.toUpperCase(),
      nCards(cs.length),
    ]
      .filter(Boolean)
      .join(" · ");
    return `<a class="t-row" href="#topics" data-topic="${tp.path}">
      <span class="t-main"><span class="t-title">${esc(tp.title)}</span><span class="t-meta">${esc(meta)}</span>${withIdea ? `<span class="t-idea">${inline(tp.keyIdea)}</span>` : ""}</span>
      ${memStrip(cs)}
      <span class="t-due${due ? "" : " none"}">${esc(t("due_n", { n: due }))}</span>
      ${ico("chevron")}
    </a>`;
  }

  function viewHome() {
    const min = estMin(QUEUE);
    const newCount = QUEUE.filter((q) => cardBy[q.split(":")[0]].isNew).length;
    const plCount = QUEUE.filter((q) =>
      cardBy[q.split(":")[0]].topic.startsWith("lang-"),
    ).length;
    const fc = [QUEUE.length, 18, 9, 14, 21, 6, 11];
    const dayNames = Array.from({ length: 7 }, (_, i) =>
      new Date(Date.UTC(2026, 10, 25 + i)).toLocaleDateString(lang, {
        weekday: "short",
        timeZone: "UTC",
      }),
    );
    const max = Math.max(...fc);
    const back = state.demo === "back";
    const title = back
      ? t("back_title", { cards: nCards(180), m: 45 })
      : `${nCards(QUEUE.length)} ≈ ${min} ${t("min")}`;
    const sub = back
      ? t("back_plan")
      : t("new_of", { a: newCount, b: 10, c: plCount });
    return `
      <div class="home-top">
        <section class="card today" aria-labelledby="today-h">
          <h2 class="today-big" id="today-h">${esc(title)}</h2>
          <p class="today-sub">${esc(sub)}</p>
          <div class="row start-row"><a class="btn primary" href="#review" data-mode="5">${esc(t("b5"))} <kbd>Enter</kbd></a><a class="btn" href="#review" data-mode="15">${esc(t("b15"))}</a><a class="btn" href="#review" data-mode="all">${esc(t("ball"))}</a></div>
        </section>
        <section class="card forecast-card" aria-labelledby="fc-h">
          <h2 class="card-h" id="fc-h">${esc(t("forecast"))}</h2>
          <div class="forecast">${fc.map((v, i) => `<div class="bar ${i === 0 ? "today" : ""}"><small class="tnum">${v}</small><span class="bar-fill" style="height:${Math.round((v / max) * 80)}%"></span><small>${esc(dayNames[i])}</small></div>`).join("")}</div>
        </section>
      </div>
      <section class="glist">
        <h2 class="group-h">${esc(t("topics"))}<span class="tnum">${DATA.topics.length}</span></h2>
        <div class="group-body">${DATA.topics.map((tp) => topicRow(tp, false)).join("")}</div>
      </section>
      <section class="glist">
        <h2 class="group-h">${esc(t("chat_t"))}</h2>
        <div class="group-body">
          <div class="g-row chat-row"><div><b>${esc(t("capture_t"))}</b><p>${inline(t("capture"))}</p></div><span class="chat-tool">Claude Code</span></div>
          <div class="g-row chat-row"><div><b>${esc(t("quiz_t"))}</b><p>${inline(t("quiz"))}</p></div><span class="chat-tool">learn-quiz</span></div>
        </div>
      </section>`;
  }

  function startSession(mode) {
    let ids = QUEUE.slice();
    if (mode === "5") {
      let budget = 300;
      ids = ids.filter((q) => {
        const s = EST[cardBy[q.split(":")[0]].type] ?? 10;
        if (budget <= 0) return false;
        budget -= s;
        return true;
      });
    }
    state.session = {
      mode,
      items: ids.map((q) => {
        const [id, v] = q.split(":");
        return { card: cardBy[id], variant: v ?? "main" };
      }),
      i: 0,
      phase: "q",
      conf: null,
      checks: new Set(),
      results: [],
      start: Date.now(),
    };
  }

  function questionHtml(it, open) {
    const c = it.card;
    if (c.type === "vocab" && it.variant === "rev") {
      const ru = c.answerHtml.replace(/<[^>]+>/g, "").split(" — ")[0];
      return `<p><span class="muted">[ru → pl]</span> ${esc(ru)}</p>${open ? `<p class="muted" style="font-size:18px">→ <b>${esc(c.title)}</b></p>` : ""}`;
    }
    return cloze(c.questionHtml, open);
  }

  // Яркость точки памяти: R прототипа лежит в 0.80–0.97, поэтому шкала растянута на этот диапазон,
  // иначе все точки выглядели бы одинаково яркими.
  const memOpacity = (c) =>
    c.isNew ? 0.55 : Math.min(1, Math.max(0.16, (c.R - 0.55) / 0.42));
  const pct = (x) => `${Math.round(x * 100)}%`;

  function memField(se) {
    const cards = se.items.map((it) => it.card);
    const rev = cards.filter((c) => !c.isNew);
    const n = nCards(cards.length);
    const label = rev.length
      ? t("mem_aria", {
          cards: n,
          r: Math.round((rev.reduce((a, c) => a + c.R, 0) / rev.length) * 100),
        })
      : t("mem_aria_new", { cards: n });
    const pts = cards
      .map((c, i) => {
        const flash = state.flash?.id === c.id ? state.flash : null;
        const r = flash ? flash.from : memOpacity(c);
        const tip = `${c.title} · ${c.isNew ? t("is_new") : `R ${pct(c.R)}`}`;
        return `<span class="pt${c.isNew ? " new" : ""}${i === se.i ? " cur" : ""}" style="--r:${r.toFixed(2)}"${flash ? ` data-to="${memOpacity(c).toFixed(2)}"` : ""} title="${esc(tip)}"></span>`;
      })
      .join("");
    // Колонки делят точки на ровные ряды, чтобы последняя точка не повисала одна на новой строке.
    const cols = Math.ceil(cards.length / Math.ceil(cards.length / 10));
    return `<div class="memfield" style="--cols:${cols}" role="img" aria-label="${esc(label)}">${pts}</div>`;
  }

  function sessionBar() {
    const s = state.session;
    // Переключатель демо-состояния — управление прототипом, а не контент: ему место в тулбаре.
    if (route().name === "home")
      return `<span class="demo-label">${esc(t("demo"))}</span><div class="segmented" role="group" aria-label="${esc(t("demo"))}">${["normal", "back"].map((d) => `<button type="button" data-demo="${d}" aria-pressed="${state.demo === d}" class="${state.demo === d ? "active" : ""}">${esc(t(`demo_${d}`))}</button>`).join("")}</div>`;
    if (route().name !== "review" || !s || s.i >= s.items.length) return "";
    const rest = s.items.slice(s.i).map((it) => it.card.id);
    const mode = t(s.mode === "all" ? "ball" : s.mode === "5" ? "b5" : "b15");
    const elapsed = Math.floor((Date.now() - s.start) / 1000);
    return `<span class="session-mode">${esc(mode)}</span>
      <span class="session-count">${s.i + 1} / ${s.items.length}</span>
      <span class="tnum">${esc(t("left", { m: estMin(rest) }))}</span>
      <span class="tnum" id="timer">${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}</span>
      <button class="btn sm session-end" type="button" data-act="end" aria-keyshortcuts="Escape">${esc(t("end"))} <kbd>Esc</kbd></button>`;
  }

  function viewReview() {
    const s = state.session;
    if (s.i >= s.items.length) return viewEnd();
    const it = s.items[s.i];
    const c = it.card;
    const tp = topicBy[c.topic];
    const open = s.phase === "a";
    const iv = intervals(c);
    const isPl = c.langPair || tp.lang === "pl";
    const ttsText =
      c.type === "vocab"
        ? c.title
        : (c.questionText.match(/\]\s*(.+)$/)?.[1] ?? "").replace(
            /\{\{c\d+::(.+?)\}\}/g,
            "$1",
          );
    // озвучка не должна подсказывать ответ: rev и cloze озвучиваются только после показа ответа
    const showTts =
      isPl &&
      plVoice &&
      (c.type === "vocab" ? it.variant !== "rev" || open : open);
    const req = c.rubric.filter((r) => r.required).length;
    const reqChecked = c.rubric.filter(
      (r, i) => r.required && s.checks.has(i),
    ).length;
    const suggested =
      c.rubric.length && open ? (reqChecked === req ? 3 : 1) : 0;
    const names = [t("again"), t("hard"), t("good"), t("easy")];
    const lastRule =
      c.lastAgo === 0
        ? t("today_l")
        : c.lastAgo
          ? t("days_ago", { n: c.lastAgo })
          : t("is_new");
    // Анимация входа — только при смене фазы: выбор уверенности или пункт рубрики тоже
    // перерисовывают экран, и повторный fade выглядел бы как мигание.
    const phaseKey = `${s.i}:${s.phase}`;
    const enter = s.shownKey !== phaseKey;
    s.shownKey = phaseKey;

    const answer = open
      ? `<section class="answer-block${enter ? " enter" : ""}">
          ${c.rubric.length ? `<div class="rubric"><div class="rubric-h">${esc(t("rubric"))}</div>${c.rubric.map((r, i) => `<label><input type="checkbox" data-check="${i}" ${s.checks.has(i) ? "checked" : ""}> <span>${esc(r.text)}${r.required ? `<span class="req">${esc(t("req"))}</span>` : ""}</span></label>`).join("")}</div>` : ""}
          <div class="answer">${c.answerHtml}</div>
          ${c.explanationHtml ? `<div class="explanation">${c.explanationHtml}</div>` : ""}
          ${suggested ? `<div class="hint">${esc(t("suggested", { r: names[suggested - 1] }))}</div>` : ""}
        </section>`
      : "";

    const tray = open
      ? `<div class="ratings">${["again", "hard", "good", "easy"]
          .map(
            (k, i) => `
          <button type="button" class="rate ${k}${suggested === i + 1 ? " suggested" : ""}" data-rate="${i + 1}" aria-keyshortcuts="${i + 1}" aria-label="${esc(`${i + 1} · ${names[i]} · ${iv[i]}`)}"${k === "hard" ? ` title="${esc(t("hard_hint"))}"` : ""}>
            <span class="rate-top"><kbd>${i + 1}</kbd>${esc(names[i])}</span><span class="iv">${esc(iv[i])}</span>
          </button>`,
          )
          .join("")}</div>
        <div class="tray-hint">${esc(t("hard_hint"))}<span class="kb-hint"> · <kbd>Space</kbd> = ${esc(names[2])}</span><span class="demo-hint">${esc(t("demo_iv"))}</span></div>`
      : `<div class="tray-row">
          <div class="conf"><span class="tray-label" id="conf-l">${esc(t("conf"))}</span>
            <div class="seg" role="radiogroup" aria-labelledby="conf-l">${[
              t("c1"),
              t("c2"),
              t("c3"),
            ]
              .map(
                (l, i) =>
                  `<button type="button" role="radio" aria-checked="${s.conf === i + 1}" tabindex="${(s.conf ?? 1) === i + 1 ? 0 : -1}" aria-keyshortcuts="${i + 1}" data-conf="${i + 1}" class="${s.conf === i + 1 ? "active" : ""}"><kbd>${i + 1}</kbd>${esc(l)}</button>`,
              )
              .join("")}</div>
          </div>
          <button type="button" class="btn primary reveal" data-act="reveal" aria-keyshortcuts="Space">${esc(t("show"))} <kbd>Space</kbd></button>
        </div>`;

    return `
      <div class="review-wrap">
        <div class="review-col">
          <article class="review-card ${open ? "is-a" : "is-q"}" aria-labelledby="q-text">
            <header class="review-meta">
              <span class="crumb">${esc(domainLabel[tp.domain] ?? tp.domain)}${ico("chevron")}${esc(tp.title)}</span>
              <span class="meta-tags">${c.changed ? `<span class="chip">${ico("pencil")}${esc(t("changed"))}</span>` : ""}${typeChip(c)}${showTts ? `<button class="icon-btn" type="button" data-act="tts" data-text="${esc(ttsText)}" aria-label="${esc(t("listen"))}" aria-keyshortcuts="p">${ico("speaker")}<kbd>p</kbd></button>` : ""}</span>
            </header>
            <div class="q-body">
              <div class="question" id="q-text">${questionHtml(it, open)}</div>
              ${answer}
            </div>
            <footer class="shortcuts">
              <span><kbd>o</kbd>${esc(t("sc_topic"))}</span><span><kbd>e</kbd>VS Code</span><span><kbd>u</kbd>${esc(t("sc_undo"))}</span><span><kbd>!</kbd>${esc(t("sc_susp"))}</span>
            </footer>
          </article>
          <div class="tray"><div class="tray-inner${enter ? " enter" : ""}">${tray}</div></div>
        </div>
        <aside class="context">
          <section>
            <h2 class="group-h">${esc(t("mem_title"))}<span class="tnum">${nCards(s.items.length)}</span></h2>
            <div class="group-body mem">
              ${memField(s)}
              <p class="mem-legend"><span class="mem-scale" aria-hidden="true"><i style="opacity:.2"></i><i style="opacity:.55"></i><i></i></span>${esc(t("r_now"))}<span class="mem-new" aria-hidden="true"></span>${esc(t("mem_new"))}</p>
            </div>
          </section>
          <section>
            <h2 class="group-h">${esc(t("ctx_state"))}</h2>
            <dl class="group-body">
              <div class="g-row"><dt>${esc(t("r_now"))}</dt><dd>${c.isNew ? "—" : `<span class="r-dot" style="--r:${memOpacity(c).toFixed(2)}" aria-hidden="true"></span>${pct(c.R)}`}</dd></div>
              <div class="g-row"><dt>Stability</dt><dd>${c.isNew ? "—" : esc(days(c.S))}</dd></div>
              <div class="g-row"><dt>${esc(t("lapses"))}</dt><dd>${c.lapses}</dd></div>
              <div class="g-row"><dt>${esc(t("last"))}</dt><dd>${esc(lastRule)}</dd></div>
            </dl>
          </section>
          <section>
            <h2 class="group-h">${esc(t("ctx_key"))}</h2>
            <div class="group-body pad">
              <p class="key-idea">${inline(tp.keyIdea)}</p>
              <a class="ctx-link" href="#topics" data-topic="${tp.path}">${esc(t("ctx_sum"))}${ico("chevron")}</a>
            </div>
          </section>
          <section>
            <h2 class="group-h">${esc(t("file"))}</h2>
            <div class="group-body">
              <div class="g-row path">${esc(c.file)}</div>
              <button class="g-row g-action" type="button" data-act="vscode" aria-keyshortcuts="e">${esc(t("vscode"))}<kbd>e</kbd></button>
            </div>
          </section>
        </aside>
      </div>`;
  }

  function viewEnd() {
    const s = state.session;
    const rated = s.results.filter((r) => r.rating);
    const ok = rated.filter((r) => r.rating >= 2).length;
    const m = Math.max(1, Math.round((Date.now() - s.start) / 60000));
    const hc = rated.filter((r) => r.rating === 1 && r.conf === 3);
    return `<section class="end">
      <h2 class="today-big">${esc(t("end_t", { cards: nCards(rated.length), m }))}</h2>
      <p class="today-sub">${esc(t("end_rec", { a: ok, b: rated.length }))} · ${esc(t("end_tom", { cards: nCards(18) }))}</p>
      <section class="glist">
        <h3 class="group-h">${esc(t("end_hc"))}</h3>
        <div class="group-body">${
          hc.length
            ? hc
                .map(
                  (r) =>
                    `<a class="g-row g-action" href="#topics" data-topic="${r.card.topic}">${esc(r.card.title)}${ico("chevron")}</a>`,
                )
                .join("")
            : `<div class="g-row muted">${esc(t("end_none"))}</div>`
        }</div>
      </section>
      <div class="row"><a class="btn primary" href="#home">${esc(t("home"))}</a><a class="btn" href="#review" data-act="restart">${esc(t("more"))}</a></div>
    </section>`;
  }

  function viewTopic(path, anchor) {
    const tp = topicBy[path];
    if (!tp) return `<div class="card">Topic not found</div>`;
    const cs = DATA.cards.filter((c) => c.topic === path);
    setTimeout(() => {
      if (anchor)
        document.getElementById(anchor)?.scrollIntoView({ block: "start" });
      else $("main").scrollTop = 0;
      state.anchor = null;
    }, 0);
    return `
      <div class="topic-head">
        <div>
          <div class="row topic-tags"><span class="chip">${esc(domainLabel[tp.domain] ?? tp.domain)}</span><span class="chip">${esc(tp.lang.toUpperCase())}</span><span class="chip">${esc(tp.familiarity)}</span><span class="muted">${esc(t("updated", { d: tp.updated }))}</span></div>
          <h2>${esc(tp.title)}</h2>
          <p class="topic-idea">${inline(tp.keyIdea)}</p>
        </div>
        <div class="row"><button class="btn" type="button" data-act="cram">${esc(t("cram"))}</button><button class="btn" type="button" data-act="vscode-topic" data-path="${esc(path)}">${esc(t("vscode"))}</button></div>
      </div>
      <div class="topic-layout">
        <nav class="toc" aria-label="${esc(t("toc"))}">${tp.summary.map((sec) => `<a href="#topics" data-topic="${path}" data-anchor="${slug(sec.title)}">${esc(sec.title)}</a>`).join("")}</nav>
        <article class="card md summary">${tp.summary
          .map((sec) => {
            const id = slug(sec.title);
            const body =
              sec.title === "Self-check"
                ? `<div class="selfcheck-hidden" id="selfcheck">${sec.html}</div><button class="btn" type="button" data-act="selfcheck" style="margin-top:8px">${esc(t("show_q"))}</button>`
                : sec.html;
            return `<h2 id="${id}">${esc(sec.title)}</h2>${body}`;
          })
          .join("")}</article>
        <aside class="context">
          <section>
            <h3 class="group-h">${esc(t("pretest"))}</h3>
            <ol class="group-body pad pretest">${tp.pretest.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
          </section>
          <section>
            <h3 class="group-h">${esc(t("nav_cards"))}<span class="tnum">${cs.length}</span></h3>
            <div class="group-body">${cs
              .map(
                (c) =>
                  `<button type="button" class="g-row g-action card-row" data-card="${c.id}"><span class="cr-main"><span>${esc(c.title)}</span><small>${esc(c.type)}</small></span>${rCell(c)}</button>`,
              )
              .join("")}</div>
          </section>
          <section>
            <h3 class="group-h">${esc(t("materials"))}</h3>
            <div class="group-body pad md materials">${tp.materialsHtml}</div>
          </section>
        </aside>
      </div>`;
  }

  function viewTopics() {
    const domains = DATA.topics
      .map((tp) => tp.domain)
      .filter((d, i, a) => a.indexOf(d) === i);
    return `${domains
      .map((d, i) => {
        const tps = DATA.topics.filter((tp) => tp.domain === d);
        return `<section class="glist${i === 0 ? " first" : ""}">
        <h2 class="group-h">${esc(domainLabel[d] ?? d)}<span class="tnum">${tps.length}</span></h2>
        <div class="group-body">${tps.map((tp) => topicRow(tp, true)).join("")}</div>
      </section>`;
      })
      .join("")}<p class="group-f later-map">${esc(t("map_later"))}</p>`;
  }

  function filteredCards() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase();
    return DATA.cards.filter(
      (c) =>
        (!f.domain || c.topic.startsWith(`${f.domain}/`)) &&
        (!f.type || c.type === f.type) &&
        (!q || c.plain.includes(q) || c.title.toLowerCase().includes(q)),
    );
  }

  function viewCards() {
    const f = state.filters;
    const list = filteredCards();
    const types = [...new Set(DATA.cards.map((c) => c.type))];
    const domains = DATA.topics
      .map((tp) => tp.domain)
      .filter((d, i, a) => a.indexOf(d) === i);
    const seg = (key, cur, items) =>
      items
        .map(
          ([v, label]) =>
            `<button type="button" data-${key}="${v}" aria-pressed="${cur === v}" class="${cur === v ? "active" : ""}">${esc(label)}</button>`,
        )
        .join("");
    return `
      <div class="cards-tools">
        <label class="field-search">${ico("search")}<input id="card-q" type="search" placeholder="${esc(t("search"))}" value="${esc(f.q)}" autocomplete="off"></label>
        <div class="segmented" role="group" aria-label="${esc(t("f_domain"))}">${seg("fdomain", f.domain, [["", t("all")], ...domains.map((d) => [d, domainLabel[d] ?? d])])}</div>
        <span class="found tnum" aria-live="polite">${esc(t("found", { n: list.length }))}</span>
      </div>
      <div class="segmented tokens" role="group" aria-label="${esc(t("col_type"))}">${seg("ftype", f.type, [["", t("all")], ...types.map((ty) => [ty, ty])])}</div>
      <div class="group-body table-wrap">
        <table class="list"><thead><tr><th>${esc(t("col_title"))}</th><th>${esc(t("col_type"))}</th><th>${esc(t("col_topic"))}</th><th>R</th><th>${esc(t("col_due"))}</th><th class="num">${esc(t("lapses"))}</th><th>${esc(t("col_status"))}</th></tr></thead>
        <tbody>${
          list.length
            ? list
                .map(
                  (c) => `<tr data-card="${c.id}" tabindex="0">
          <td class="title">${esc(c.title)}</td><td class="type">${esc(c.type)}</td><td class="topic">${esc(topicBy[c.topic].title)}</td>
          <td class="r">${rCell(c)}</td><td class="due">${c.isNew ? esc(t("mem_new")) : c.dueIn === 0 ? esc(t("today_l")) : `+${days(c.dueIn)}`}</td><td class="num">${c.lapses}</td>
          <td class="status${c.changed ? " is-changed" : ""}">${c.changed ? `<span class="status-changed" title="${esc(t("changed"))}">${ico("pencil")}${esc(t("changed_s"))}</span>` : `<span class="muted">${esc(t("st_active"))}</span>`}</td></tr>`,
                )
                .join("")
            : `<tr><td colspan="7" class="empty">${esc(t("none_found"))}</td></tr>`
        }</tbody></table>
      </div>`;
  }

  function renderDrawer() {
    const el = $("#drawer");
    const c = state.drawer && cardBy[state.drawer];
    if (!c) {
      el.hidden = true;
      return;
    }
    const tp = topicBy[c.topic];
    el.hidden = false;
    el.innerHTML = `
      <div class="row" style="justify-content:space-between"><span class="crumb">${esc(tp.title)}</span><button class="btn" type="button" data-act="close-drawer">${esc(t("close"))} <kbd>Esc</kbd></button></div>
      <div class="row">${typeChip(c)}<span class="chip">${esc(c.id)}</span></div>
      <h3 style="margin:0;color:var(--ink)">${esc(c.title)}</h3>
      <div class="question" style="font-size:19px">${cloze(c.questionHtml, true)}</div>
      ${c.rubric.length ? `<div class="rubric">${c.rubric.map((r) => `<div>• ${esc(r.text)}${r.required ? `<span class="req">${esc(t("req"))}</span>` : ""}</div>`).join("")}</div>` : ""}
      <div class="answer">${c.answerHtml}</div>
      ${c.explanationHtml ? `<div class="explanation">${c.explanationHtml}</div>` : ""}
      <div class="row"><button class="btn" type="button" data-act="vscode-card" data-id="${c.id}">${esc(t("vscode"))}</button><a class="btn" href="#topics" data-topic="${c.topic}">${esc(t("open_topic"))}</a></div>`;
  }

  function viewStats() {
    const r = rng(42);
    const bars = Array.from({ length: 30 }, (_, i) =>
      Math.round(8 + r() * 22 + (i % 7 === 5 ? -6 : 0)),
    );
    const max = Math.max(...bars);
    const avg = Math.round(bars.reduce((a, b) => a + b, 0) / bars.length);
    const dr = Number(store.get("wl-dr", "0.9")).toFixed(2);
    const ticks = [0, 7, 14, 21, 29];
    return `
      <div class="stats-layout">
        <div class="stats-col">
          <section>
            <h2 class="group-h">${esc(t("st_fc"))}</h2>
            <div class="group-body chart">
              <div class="chart-y"><span class="tnum">${max}</span><span class="tnum">0</span></div>
              <div class="bars30" role="img" aria-label="${esc(t("st_fc_aria", { max, avg }))}">${bars.map((v, i) => `<span class="${i === 0 ? "today" : i % 7 === 5 || i % 7 === 6 ? "wknd" : ""}" style="height:${Math.round((v / max) * 100)}%" title="${v}"></span>`).join("")}</div>
              <div class="chart-x">${ticks.map((d) => `<span${d === 29 ? ' class="tick-end"' : ""} style="--at:${d}">${esc(d === 0 ? t("today_l") : `+${days(d)}`)}</span>`).join("")}</div>
            </div>
            <p class="group-f">${esc(t("st_avg", { n: nCards(avg) }))}</p>
          </section>
          <section>
            <h2 class="group-h">${esc(t("st_act"))}</h2>
            <dl class="group-body">
              <div class="g-row"><dt>${esc(t("st_reviews"))}</dt><dd>412</dd></div>
              <div class="g-row"><dt>${esc(t("st_time"))}</dt><dd>9 ${esc(t("min"))}</dd></div>
            </dl>
          </section>
        </div>
        <div class="stats-col">
          <section>
            <h2 class="group-h">${esc(t("st_ret"))}</h2>
            <dl class="group-body">
              <div class="g-row"><dt>${esc(t("st_young_r"))}</dt><dd>88%</dd></div>
              <div class="g-row"><dt>${esc(t("st_mature_r"))}</dt><dd>92%</dd></div>
            </dl>
            <p class="group-f">${esc(t("st_ret_f", { dr }))}</p>
          </section>
          <section>
            <h2 class="group-h">${esc(t("st_grades"))}</h2>
            <dl class="group-body">
              <div class="g-row"><dt>${esc(t("st_hard_l"))}</dt><dd>9%</dd></div>
              <div class="g-row"><dt>${esc(t("st_leech_l"))}</dt><dd>0</dd></div>
            </dl>
            <p class="group-f">${esc(t("st_hard"))}. ${esc(t("st_leech"))}.</p>
          </section>
          <p class="group-f later">${esc(t("st_cal"))}</p>
        </div>
      </div>`;
  }

  function viewSettings() {
    const dr = Number(store.get("wl-dr", "0.9"));
    const sess = store.get("wl-sess", "15");
    const heat = store.get("wl-heat", "0") === "1";
    const lim = {
      tech: Number(store.get("wl-new-tech", "10")),
      pl: Number(store.get("wl-new-pl", "10")),
    };
    const stepper = (k, label, sub) =>
      `<div class="g-row"><span class="g-label">${esc(label)}<small>${esc(sub)}</small></span>
        <span class="stepper" role="group" aria-label="${esc(label)}"><button type="button" data-step="${k}:-1" aria-label="${esc(t("less"))}">${ico("minus")}</button><output class="tnum" id="lim-${k}">${lim[k]}</output><button type="button" data-step="${k}:1" aria-label="${esc(t("more_n"))}">${ico("plus")}</button></span></div>`;
    return `<div class="settings">
      <section>
        <h2 class="group-h">${esc(t("g_ui"))}</h2>
        <div class="group-body">
          <div class="g-row"><span class="g-label">${esc(t("s_lang"))}</span>
            <div class="segmented" role="group" aria-label="${esc(t("s_lang"))}">${["ru", "en", "pl"].map((l) => `<button type="button" data-lang="${l}" aria-pressed="${l === lang}" class="${l === lang ? "active" : ""}">${l.toUpperCase()}</button>`).join("")}</div></div>
        </div>
        <p class="group-f">${esc(t("s_lang_h"))}</p>
      </section>
      <section>
        <h2 class="group-h">${esc(t("nav_review"))}</h2>
        <div class="group-body">
          <div class="g-row stack">
            <div class="g-line"><label class="g-label" for="dr">${esc(t("s_dr"))}<small>${esc(t("s_dr_h"))}</small></label><b class="tnum" id="dr-v">${dr.toFixed(2)}</b></div>
            <input id="dr" class="slider" type="range" min="0.8" max="0.97" step="0.01" value="${dr}" style="--p:${(((dr - 0.8) / 0.17) * 100).toFixed(1)}%">
            <div class="g-line small"><span class="tnum">0.80</span><span class="tnum" id="dr-load">${esc(t("per_day", { m: Math.round((9 * (1 / (1 - dr))) / 10) }))}</span><span class="tnum">0.97</span></div>
          </div>
          <div class="g-row"><span class="g-label">${esc(t("s_sess"))}</span>
            <div class="segmented" role="group" aria-label="${esc(t("s_sess"))}">${["5", "10", "15"].map((m) => `<button type="button" data-sess="${m}" aria-pressed="${m === sess}" class="${m === sess ? "active" : ""}">${m} ${esc(t("min"))}</button>`).join("")}</div></div>
        </div>
      </section>
      <section>
        <h2 class="group-h">${esc(t("s_limits"))}</h2>
        <div class="group-body">
          ${stepper("tech", t("s_tech"), "architecture · dotnet · angular")}
          ${stepper("pl", t("g_pl"), "lang-pl")}
        </div>
        <p class="group-f">${esc(t("s_limits_h"))}</p>
      </section>
      <section>
        <h2 class="group-h">${esc(t("s_tts"))}</h2>
        <div class="group-body">
          <button type="button" class="g-row g-action tint" data-act="tts-check">${esc(t("s_tts_btn"))}<span class="muted" id="tts-res"></span></button>
        </div>
      </section>
      <section>
        <h2 class="group-h">${esc(t("nav_stats"))}</h2>
        <div class="group-body">
          <label class="g-row"><span class="g-label">${esc(t("s_heat"))}</span><input type="checkbox" role="switch" class="switch" id="heat"${heat ? " checked" : ""}></label>
        </div>
        <p class="group-f">${esc(t("s_heat_h"))}</p>
      </section>
      <section>
        <h2 class="group-h">${esc(t("s_dev"))}</h2>
        <dl class="group-body">
          <div class="g-row"><dt>${esc(t("s_dev_name"))}</dt><dd>desk1</dd></div>
          <div class="g-row path">~/Projects/wastech-learn-content</div>
        </dl>
      </section>
    </div>`;
  }

  let timer;
  // Фокус возвращается после перерисовки только при работе с клавиатуры: после клика мышью
  // фокус на кнопке перехватил бы Space, а Space в сессии означает «показать ответ».
  const focusSelector = () => {
    const el = document.activeElement;
    if (state.viaPointer || !el || el === document.body) return null;
    for (const k of ["conf", "rate", "act", "check"])
      if (el.dataset?.[k] !== undefined)
        return `[data-${k}="${el.dataset[k]}"]`;
    return null;
  };

  function render() {
    const focusSel = state.focusSel ?? focusSelector();
    state.focusSel = null;
    const r = route();
    renderChrome(r.name);
    const titles = {
      home: "today",
      review: "nav_review",
      topics: "nav_topics",
      cards: "nav_cards",
      stats: "nav_stats",
      prefs: "nav_settings",
    };
    $("#page-title").textContent = t(titles[r.name] ?? "nav_home");
    clearInterval(timer);
    let html;
    switch (r.name) {
      case "review":
        if (!state.session) startSession("all");
        html = viewReview();
        timer = setInterval(() => {
          const el = $("#timer");
          if (!el || !state.session) return;
          const s = Math.floor((Date.now() - state.session.start) / 1000);
          el.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
        }, 1000);
        break;
      case "topics":
        html = state.topicPath
          ? viewTopic(state.topicPath, state.anchor)
          : viewTopics();
        break;
      case "cards":
        html = viewCards();
        break;
      case "stats":
        html = viewStats();
        break;
      case "prefs":
        html = viewSettings();
        break;
      default:
        html = viewHome();
    }
    document.body.dataset.view = r.name;
    const view = $("#view");
    view.classList.toggle("is-review", r.name === "review");
    view.innerHTML = html;
    $("#topbar-session").innerHTML = sessionBar();
    const se = state.session;
    const inSession = r.name === "review" && se && se.i < se.items.length;
    const prog = $("#topbar-progress");
    prog.hidden = !inSession;
    if (inSession)
      prog.style.setProperty(
        "--p",
        `${Math.round((se.i / se.items.length) * 100)}%`,
      );
    // Точка только что оценённой карточки рисуется со старой яркостью и плавно переходит к новой:
    // так оценка видна как изменение памяти, а не как перерисовка.
    if (focusSel)
      document.querySelector(focusSel)?.focus({ preventScroll: true });
    if (inSession && se.announced !== se.i) {
      se.announced = se.i;
      $("#sr-live").textContent = t("sr_card", {
        i: se.i + 1,
        n: se.items.length,
      });
    }
    const flashed = view.querySelector(".pt[data-to]");
    if (flashed)
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          flashed.style.setProperty("--r", flashed.dataset.to),
        ),
      );
    state.flash = null;
    renderDrawer();
  }

  const s = () => state.session;
  function reveal() {
    if (s() && s().phase === "q") {
      s().phase = "a";
      render();
    }
  }
  function rate(n) {
    const se = s();
    if (!se || se.phase !== "a") return;
    const c = se.items[se.i].card;
    se.results.push({
      card: c,
      rating: n,
      conf: se.conf,
      prev: { R: c.R, S: c.S, isNew: c.isNew, lastAgo: c.lastAgo },
    });
    // Сразу после повтора R = 1 при любой оценке; оценка меняет stability, а не текущую память.
    state.flash = { id: c.id, from: memOpacity(c) };
    c.R = 1;
    c.S = Math.max(c.S, 1);
    c.isNew = false;
    c.lastAgo = 0;
    se.i += 1;
    se.phase = "q";
    se.conf = null;
    se.checks = new Set();
    render();
  }
  function undo() {
    const se = s();
    if (!se || !se.results.length) return;
    const last = se.results.pop();
    if (last.prev) Object.assign(last.card, last.prev);
    se.i -= 1;
    se.phase = "q";
    se.conf = last.conf ?? null;
    se.checks = new Set();
    toast(t("t_undo"));
    render();
  }
  function endSession() {
    const se = s();
    if (se) {
      se.items = se.items.slice(0, se.i);
      render();
    }
  }

  document.addEventListener("click", (e) => {
    const topicEl = e.target.closest("[data-topic]");
    if (topicEl) {
      e.preventDefault();
      const anchor = topicEl.dataset.anchor;
      if (
        anchor &&
        state.topicPath === topicEl.dataset.topic &&
        route().name === "topics"
      ) {
        document.getElementById(anchor)?.scrollIntoView({ block: "start" });
        return;
      }
      state.topicPath = topicEl.dataset.topic;
      state.anchor = anchor ?? null;
      state.drawer = null;
      go("topics");
      return;
    }
    const modeEl = e.target.closest("[data-mode]");
    if (modeEl) {
      e.preventDefault();
      startSession(modeEl.dataset.mode);
      go("review");
      return;
    }
    const navEl = e.target.closest("[data-nav]");
    if (navEl) {
      e.preventDefault();
      state.drawer = null;
      if (navEl.dataset.nav === "topics") state.topicPath = null;
      if (
        navEl.dataset.nav === "review" &&
        state.session &&
        state.session.i >= state.session.items.length
      )
        state.session = null;
      go(navEl.dataset.nav);
      return;
    }
    const langBtn = e.target.closest("[data-lang]");
    if (langBtn) {
      lang = langBtn.dataset.lang;
      store.set("wl-lang", lang);
      render();
      return;
    }
    const demo = e.target.closest("[data-demo]");
    if (demo) {
      state.demo = demo.dataset.demo;
      state.focusSel = `[data-demo="${demo.dataset.demo}"]`;
      render();
      return;
    }
    const conf = e.target.closest("[data-conf]");
    if (conf) {
      s().conf = Number(conf.dataset.conf);
      render();
      return;
    }
    const rt = e.target.closest("[data-rate]");
    if (rt) {
      rate(Number(rt.dataset.rate));
      return;
    }
    const chk = e.target.closest("[data-check]");
    if (chk) {
      const i = Number(chk.dataset.check);
      s().checks.has(i) ? s().checks.delete(i) : s().checks.add(i);
      render();
      return;
    }
    const fd = e.target.closest("[data-fdomain], [data-ftype]");
    if (fd) {
      if (fd.dataset.fdomain !== undefined)
        state.filters.domain = fd.dataset.fdomain;
      else state.filters.type = fd.dataset.ftype;
      state.focusSel =
        fd.dataset.fdomain !== undefined
          ? `[data-fdomain="${fd.dataset.fdomain}"]`
          : `[data-ftype="${fd.dataset.ftype}"]`;
      render();
      return;
    }
    const step = e.target.closest("[data-step]");
    if (step) {
      const [k, d] = step.dataset.step.split(":");
      const v = Math.min(
        30,
        Math.max(0, Number(store.get(`wl-new-${k}`, "10")) + Number(d)),
      );
      store.set(`wl-new-${k}`, String(v));
      $(`#lim-${k}`).textContent = v;
      return;
    }
    const sessBtn = e.target.closest("[data-sess]");
    if (sessBtn) {
      store.set("wl-sess", sessBtn.dataset.sess);
      state.focusSel = `[data-sess="${sessBtn.dataset.sess}"]`;
      render();
      return;
    }
    const cardEl = e.target.closest("[data-card]");
    if (cardEl) {
      state.drawer = cardEl.dataset.card;
      renderDrawer();
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const a = act.dataset.act;
    if (a === "reveal") reveal();
    else if (a === "end") endSession();
    else if (a === "restart") {
      e.preventDefault();
      startSession("5");
      go("review");
    } else if (a === "tts") speak(act.dataset.text);
    else if (a === "vscode") vscode(s().items[s().i].card);
    else if (a === "vscode-card") vscode(cardBy[act.dataset.id]);
    else if (a === "vscode-topic")
      toast(
        t("t_vscode", {
          f: `wastech-learn-content/content/${act.dataset.path}/summary.md`,
        }),
      );
    else if (a === "close-drawer") {
      state.drawer = null;
      renderDrawer();
    } else if (a === "cram") toast(t("t_cram"));
    else if (a === "selfcheck") {
      $("#selfcheck")?.classList.toggle("selfcheck-hidden");
    } else if (a === "tts-check") {
      loadVoices();
      $("#tts-res").textContent = plVoice
        ? t("tts_ok", { v: plVoice.name })
        : t("tts_no");
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "card-q") {
      state.filters.q = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const el = $("#card-q");
      el.focus();
      el.setSelectionRange(pos, pos);
    }
    if (e.target.id === "dr") {
      const x = Number(e.target.value);
      store.set("wl-dr", String(x));
      $("#dr-v").textContent = x.toFixed(2);
      e.target.style.setProperty(
        "--p",
        `${(((x - 0.8) / 0.17) * 100).toFixed(1)}%`,
      );
      $("#dr-load").textContent = t("per_day", {
        m: Math.round((9 * (1 / (1 - x))) / 10),
      });
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "heat")
      store.set("wl-heat", e.target.checked ? "1" : "0");
  });
  $("#search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.filters.q = e.target.value;
      go("cards");
    }
  });
  $("#theme-toggle").addEventListener("click", () => {
    const dark = !isDark();
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    store.set("wl-theme", dark ? "dark" : "light");
    render();
  });

  document.addEventListener("pointerdown", () => {
    state.viaPointer = true;
  });
  document.addEventListener("keydown", (e) => {
    state.viaPointer = false;
    const typing =
      /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) &&
      e.target.type !== "checkbox";
    if (typing) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      $("#search").focus();
      return;
    }
    if (e.key === "Enter" && e.target.matches?.("tr[data-card]")) {
      state.drawer = e.target.dataset.card;
      renderDrawer();
      return;
    }
    if (e.key === "Escape" && state.drawer) {
      state.drawer = null;
      renderDrawer();
      return;
    }
    const r = route();
    if (
      r.name === "home" &&
      e.key === "Enter" &&
      !e.target.closest?.("button, a")
    ) {
      startSession("5");
      go("review");
      return;
    }
    if (r.name !== "review" || !s()) return;
    const se = s();
    if (se.i >= se.items.length) return;
    const c = se.items[se.i].card;
    const radio = e.target.closest?.('[role="radio"]');
    if (radio && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
      e.preventDefault();
      const step = /Right|Down/.test(e.key) ? 1 : -1;
      const next = ((Number(radio.dataset.conf) - 1 + step + 3) % 3) + 1;
      se.conf = next;
      state.focusSel = `[data-conf="${next}"]`;
      render();
      return;
    }
    // Space на кнопке или ссылке, до которой дошли с клавиатуры, нажимает её саму.
    if (e.key === " " && e.target.closest?.("button, a, input")) return;
    if (e.key === " ") {
      e.preventDefault();
      se.phase === "q" ? reveal() : rate(3);
    } else if (/^[1-4]$/.test(e.key)) {
      const n = Number(e.key);
      if (se.phase === "q" && n <= 3) {
        se.conf = n;
        render();
      } else if (se.phase === "a") rate(n);
    } else if (e.key === "u" || (e.key === "z" && (e.ctrlKey || e.metaKey)))
      undo();
    else if (e.key === "o") {
      state.topicPath = c.topic;
      go("topics");
    } else if (e.key === "e") vscode(c);
    else if (e.key === "p") {
      const b = $('[data-act="tts"]');
      if (b) speak(b.dataset.text);
    } else if (e.key === "!") {
      se.results.push({ card: c, rating: 0 });
      se.i += 1;
      se.phase = "q";
      toast(t("t_susp"));
      render();
    } else if (e.key === "Escape") endSession();
  });

  // data-theme ставится только по явному выбору пользователя: иначе страница перебила бы тему,
  // которую задают система или хост.
  const savedTheme = store.get("wl-theme", "");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () =>
    renderChrome(route().name),
  );
  window.addEventListener("hashchange", render);
  render();
})();
