// Прототип десктопного UI wastech-learn. Ванильный JS без сборки: проверяем
// компоновку и сценарии, а не стек. Данные — golden sample (data.js);
// интервалы, R, статистика и прогнозы — демонстрационные.
(() => {
  'use strict';

  const DATA = window.LEARN_DATA;
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const store = {
    get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
  };

  // ---------- i18n ----------
  const PLURAL = {
    ru: { one: 'карточка', few: 'карточки', many: 'карточек', other: 'карточки' },
    en: { one: 'card', other: 'cards' },
    pl: { one: 'karta', few: 'karty', many: 'kart', other: 'karty' },
  };
  const T = {
    ru: {
      nav_home: 'Главная', nav_review: 'Повторение', nav_topics: 'Темы', nav_cards: 'Карточки', nav_stats: 'Статистика', nav_settings: 'Настройки',
      search: 'Поиск по темам и карточкам', today: 'Сегодня', min: 'мин', d: 'дн', mo: 'мес',
      new_of: 'Новые: {a} из {b} · польский: {c}', b5: '5 минут', b15: '15 минут', ball: 'Вся очередь',
      demo: 'Демо-состояние', demo_normal: 'Обычный день', demo_back: 'После перерыва',
      back_title: 'С возвращением! Накопилось {cards} ≈ {m} мин', back_plan: 'Предлагаю 3 дня по 15 минут — новые карточки пока на паузе. Расписание не сдвигаю: FSRS сам учтёт перерыв.',
      forecast: 'Прогноз на 7 дней', topics: 'Темы', cards: 'Карточек', due: 'Сегодня', mastery: 'Освоение',
      capture_t: 'Новая тема', capture: 'Разбери её в Claude Code: «разберём …» запустит learn-capture. Из ChatGPT — положи learning package в inbox/ и вызови learn-import.',
      quiz_t: 'Квиз в чате', quiz: 'Без браузера: в Claude Code скажи «погоняй меня 10 минут» — ИИ проверит ответы по рубрике, оценку подтверждаешь ты.',
      show: 'Показать ответ', conf: 'Уверенность до ответа', c1: 'не уверен', c2: 'скорее да', c3: 'точно',
      again: 'Не вспомнил', hard: 'С трудом', good: 'Вспомнил', easy: 'Легко', hard_hint: 'Hard — это зачёт: вспомнил, но с усилием',
      answer: 'Ответ', expl: 'Пояснение', rubric: 'Рубрика: отметь, что назвал', req: 'обяз.', suggested: 'Предложено по рубрике: {r}',
      sc_topic: 'тема', sc_undo: 'отменить', sc_susp: 'отложить', sc_end: 'завершить',
      ctx: 'Контекст', ctx_key: 'Суть темы', ctx_sum: 'Открыть раздел summary', ctx_state: 'Состояние FSRS (демо)', r_now: 'R сейчас',
      lapses: 'Провалы', last: 'Последний повтор', is_new: 'новая карточка', file: 'Файл', vscode: 'Открыть в VS Code', changed: 'изменена после прошлого повтора',
      days_ago: '{n} дн назад', session: 'Сессия', end_t: 'Готово: {cards} за {m} мин', end_rec: 'Вспомнил {a} из {b}',
      end_hc: 'Ошибки при уверенности «точно» — кандидаты на карточку различения', end_none: 'Нет — калибровка в порядке', end_tom: 'Завтра ≈ {cards}',
      home: 'На главную', more: 'Ещё 5 минут', t_undo: 'Оценка отменена', t_vscode: 'Открылось бы в VS Code: {f}', t_susp: 'Карточка отложена (suspend)',
      t_cram: 'Тренировка по теме без влияния на расписание — позже (FR-212)', cram: 'Повторить тему', open_topic: 'Открыть тему', close: 'Закрыть',
      col_title: 'Карточка', col_type: 'Тип', col_topic: 'Тема', col_status: 'Статус', all_domains: 'Все домены', all_types: 'Все типы', found: 'Найдено: {n}',
      pretest: 'Pretest', materials: 'Материалы', key: 'Суть', show_q: 'Показать вопросы самопроверки', map_later: 'Карта знаний (связи тем) — позже, FR-308',
      st_young: 'True retention · молодые', st_mature: 'True retention · зрелые', st_reviews: 'Повторений за 30 дней', st_time: 'Медиана сессии',
      st_fc: 'Прогноз нагрузки на 30 дней', st_hard: 'Hard в 9% ответов — в норме: его не путают с провалом', st_cal: 'Калибровка и Bloom — после MVP (FR-404, FR-407)', st_leech: 'Leech: 0 — fix list пуст',
      s_lang: 'Язык интерфейса', s_lang_h: 'Контент тем остаётся на своём языке', s_dr: 'Desired retention', s_dr_h: 'Выше — больше повторений в день',
      s_limits: 'Новых в день', s_limits_h: 'Отдельно для языковых доменов', s_sess: 'Длина сессии', s_tts: 'Озвучка pl-PL', s_tts_btn: 'Проверить голос',
      s_heat: 'Heatmap активности', s_heat_h: 'По умолчанию выключен — без стриков', s_dev: 'Устройство', per_day: '≈ {m} мин в день',
      tts_ok: 'Голос найден: {v}', tts_no: 'Польского голоса нет — кнопка 🔊 скрыта', theme_dark: 'Тёмная тема', theme_light: 'Светлая тема',
      sync: 'git · desk1 · 2 новых события', proto: 'Прототип: данные — golden sample; интервалы, R и статистика — демо.',
    },
    en: {
      nav_home: 'Home', nav_review: 'Review', nav_topics: 'Topics', nav_cards: 'Cards', nav_stats: 'Statistics', nav_settings: 'Settings',
      search: 'Search topics and cards', today: 'Today', min: 'min', d: 'd', mo: 'mo',
      new_of: 'New: {a} of {b} · Polish: {c}', b5: '5 minutes', b15: '15 minutes', ball: 'Whole queue',
      demo: 'Demo state', demo_normal: 'Normal day', demo_back: 'After a break',
      back_title: 'Welcome back! {cards} piled up ≈ {m} min', back_plan: 'Plan: 3 days × 15 minutes — new cards are paused for now. The schedule is not shifted: FSRS accounts for the break.',
      forecast: '7-day forecast', topics: 'Topics', cards: 'Cards', due: 'Due', mastery: 'Mastery',
      capture_t: 'New topic', capture: 'Study it in Claude Code: “let’s study …” starts learn-capture. From ChatGPT, drop a learning package into inbox/ and run learn-import.',
      quiz_t: 'Quiz in chat', quiz: 'No browser needed: tell Claude Code “quiz me for 10 minutes” — the AI checks answers against the rubric, you confirm the rating.',
      show: 'Show answer', conf: 'Confidence before the answer', c1: 'unsure', c2: 'probably', c3: 'certain',
      again: 'Forgot', hard: 'With effort', good: 'Recalled', easy: 'Easy', hard_hint: 'Hard is a pass: recalled with effort',
      answer: 'Answer', expl: 'Explanation', rubric: 'Rubric: tick what you covered', req: 'req.', suggested: 'Suggested by rubric: {r}',
      sc_topic: 'topic', sc_undo: 'undo', sc_susp: 'suspend', sc_end: 'finish',
      ctx: 'Context', ctx_key: 'Key idea', ctx_sum: 'Open summary section', ctx_state: 'FSRS state (demo)', r_now: 'R now',
      lapses: 'Lapses', last: 'Last review', is_new: 'new card', file: 'File', vscode: 'Open in VS Code', changed: 'edited since last review',
      days_ago: '{n} d ago', session: 'Session', end_t: 'Done: {cards} in {m} min', end_rec: 'Recalled {a} of {b}',
      end_hc: 'Mistakes made with high confidence — candidates for a contrast card', end_none: 'None — calibration looks good', end_tom: 'Tomorrow ≈ {cards}',
      home: 'Home', more: '5 more minutes', t_undo: 'Rating undone', t_vscode: 'Would open in VS Code: {f}', t_susp: 'Card suspended',
      t_cram: 'Topic practice without rescheduling — later (FR-212)', cram: 'Practice topic', open_topic: 'Open topic', close: 'Close',
      col_title: 'Card', col_type: 'Type', col_topic: 'Topic', col_status: 'Status', all_domains: 'All domains', all_types: 'All types', found: 'Found: {n}',
      pretest: 'Pretest', materials: 'Materials', key: 'Key idea', show_q: 'Show self-check questions', map_later: 'Knowledge map (topic links) — later, FR-308',
      st_young: 'True retention · young', st_mature: 'True retention · mature', st_reviews: 'Reviews in 30 days', st_time: 'Median session',
      st_fc: '30-day workload forecast', st_hard: 'Hard in 9% of answers — fine: not used as a fail', st_cal: 'Calibration and Bloom — after MVP (FR-404, FR-407)', st_leech: 'Leeches: 0 — fix list is empty',
      s_lang: 'Interface language', s_lang_h: 'Topic content stays in its own language', s_dr: 'Desired retention', s_dr_h: 'Higher means more reviews per day',
      s_limits: 'New per day', s_limits_h: 'Separate for language domains', s_sess: 'Session length', s_tts: 'pl-PL voice', s_tts_btn: 'Check voice',
      s_heat: 'Activity heatmap', s_heat_h: 'Off by default — no streaks', s_dev: 'Device', per_day: '≈ {m} min per day',
      tts_ok: 'Voice found: {v}', tts_no: 'No Polish voice — the 🔊 button is hidden', theme_dark: 'Dark theme', theme_light: 'Light theme',
      sync: 'git · desk1 · 2 new events', proto: 'Prototype: data is the golden sample; intervals, R and stats are demo values.',
    },
    pl: {
      nav_home: 'Start', nav_review: 'Powtórka', nav_topics: 'Tematy', nav_cards: 'Fiszki', nav_stats: 'Statystyki', nav_settings: 'Ustawienia',
      search: 'Szukaj w tematach i fiszkach', today: 'Dzisiaj', min: 'min', d: 'dni', mo: 'mies.',
      new_of: 'Nowe: {a} z {b} · polski: {c}', b5: '5 minut', b15: '15 minut', ball: 'Cała kolejka',
      demo: 'Stan demo', demo_normal: 'Zwykły dzień', demo_back: 'Po przerwie',
      back_title: 'Witaj z powrotem! Zebrało się {cards} ≈ {m} min', back_plan: 'Plan: 3 dni po 15 minut — nowe karty na razie wstrzymane. Harmonogram się nie przesuwa: FSRS uwzględni przerwę.',
      forecast: 'Prognoza na 7 dni', topics: 'Tematy', cards: 'Karty', due: 'Dzisiaj', mastery: 'Opanowanie',
      capture_t: 'Nowy temat', capture: 'Omów go w Claude Code: „omówmy …” uruchamia learn-capture. Z ChatGPT — wrzuć learning package do inbox/ i uruchom learn-import.',
      quiz_t: 'Quiz w czacie', quiz: 'Bez przeglądarki: powiedz w Claude Code „przepytaj mnie przez 10 minut” — AI sprawdzi odpowiedzi według rubryki, ocenę zatwierdzasz ty.',
      show: 'Pokaż odpowiedź', conf: 'Pewność przed odpowiedzią', c1: 'niepewny', c2: 'raczej tak', c3: 'na pewno',
      again: 'Nie pamiętam', hard: 'Z trudem', good: 'Pamiętam', easy: 'Łatwe', hard_hint: 'Hard to zaliczenie: pamiętam, ale z wysiłkiem',
      answer: 'Odpowiedź', expl: 'Wyjaśnienie', rubric: 'Rubryka: zaznacz, co podałeś', req: 'wym.', suggested: 'Sugestia z rubryki: {r}',
      sc_topic: 'temat', sc_undo: 'cofnij', sc_susp: 'zawieś', sc_end: 'zakończ',
      ctx: 'Kontekst', ctx_key: 'Sedno tematu', ctx_sum: 'Otwórz sekcję summary', ctx_state: 'Stan FSRS (demo)', r_now: 'R teraz',
      lapses: 'Wpadki', last: 'Ostatnia powtórka', is_new: 'nowa karta', file: 'Plik', vscode: 'Otwórz w VS Code', changed: 'zmieniona od ostatniej powtórki',
      days_ago: '{n} dni temu', session: 'Sesja', end_t: 'Gotowe: {cards} w {m} min', end_rec: 'Pamiętam {a} z {b}',
      end_hc: 'Błędy przy pewności „na pewno” — kandydaci na kartę rozróżniającą', end_none: 'Brak — kalibracja w porządku', end_tom: 'Jutro ≈ {cards}',
      home: 'Strona główna', more: 'Jeszcze 5 minut', t_undo: 'Ocena cofnięta', t_vscode: 'Otworzyłoby się w VS Code: {f}', t_susp: 'Karta zawieszona',
      t_cram: 'Ćwiczenie tematu bez wpływu na harmonogram — później (FR-212)', cram: 'Powtórz temat', open_topic: 'Otwórz temat', close: 'Zamknij',
      col_title: 'Fiszka', col_type: 'Typ', col_topic: 'Temat', col_status: 'Status', all_domains: 'Wszystkie dziedziny', all_types: 'Wszystkie typy', found: 'Znaleziono: {n}',
      pretest: 'Pretest', materials: 'Materiały', key: 'Sedno', show_q: 'Pokaż pytania kontrolne', map_later: 'Mapa wiedzy (powiązania tematów) — później, FR-308',
      st_young: 'True retention · młode', st_mature: 'True retention · dojrzałe', st_reviews: 'Powtórek w 30 dni', st_time: 'Mediana sesji',
      st_fc: 'Prognoza obciążenia na 30 dni', st_hard: 'Hard w 9% odpowiedzi — w normie: nie myli się go z porażką', st_cal: 'Kalibracja i Bloom — po MVP (FR-404, FR-407)', st_leech: 'Leech: 0 — lista do poprawy pusta',
      s_lang: 'Język interfejsu', s_lang_h: 'Treść tematów zostaje w swoim języku', s_dr: 'Desired retention', s_dr_h: 'Wyżej — więcej powtórek dziennie',
      s_limits: 'Nowych dziennie', s_limits_h: 'Osobno dla dziedzin językowych', s_sess: 'Długość sesji', s_tts: 'Głos pl-PL', s_tts_btn: 'Sprawdź głos',
      s_heat: 'Heatmapa aktywności', s_heat_h: 'Domyślnie wyłączona — bez serii', s_dev: 'Urządzenie', per_day: '≈ {m} min dziennie',
      tts_ok: 'Znaleziono głos: {v}', tts_no: 'Brak polskiego głosu — przycisk 🔊 ukryty', theme_dark: 'Ciemny motyw', theme_light: 'Jasny motyw',
      sync: 'git · desk1 · 2 nowe zdarzenia', proto: 'Prototyp: dane to golden sample; interwały, R i statystyki są demonstracyjne.',
    },
  };
  let lang = store.get('wl-lang', 'ru');
  const t = (k, vars = {}) => (T[lang][k] ?? T.ru[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
  const nCards = (n) => {
    const forms = PLURAL[lang];
    return `${n} ${forms[new Intl.PluralRules(lang).select(n)] ?? forms.other}`;
  };
  const days = (n) => (n < 30 ? `${n} ${t('d')}` : `${Math.round(n / 30)} ${t('mo')}`);

  // ---------- демо-состояние FSRS ----------
  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const topicBy = Object.fromEntries(DATA.topics.map((tp) => [tp.path, tp]));
  const cardBy = Object.fromEntries(DATA.cards.map((c) => [c.id, c]));
  const NEW_IDS = new Set(['e4ej1s8e', 'egpne135', 'g1bv5c7y', 'hnxyjtjj', 'mmwv3t5h', 'y446nd00', 'z75gbez7']);
  for (const c of DATA.cards) {
    const r = rng(hash(c.id));
    c.isNew = NEW_IDS.has(c.id);
    c.S = c.isNew ? 0 : Math.round(1 + r() * 30);
    c.R = c.isNew ? null : 0.8 + r() * 0.17;
    c.lapses = c.isNew ? 0 : Math.floor(r() * 2.4);
    c.lastAgo = c.isNew ? null : 1 + Math.floor(r() * 12);
    c.dueIn = c.isNew ? 0 : Math.floor(r() * 9);
    c.changed = c.id === '5fdbzzng';
    c.plain = (c.questionText + ' ' + c.answerHtml.replace(/<[^>]+>/g, ' ')).toLowerCase();
  }
  const QUEUE = ['0d1gjcys', '7388t2qp', 'e4ej1s8e:fwd', '1rd53181', 'capexe3a', 'y446nd00', '5fdbzzng',
    'gj7gzc7q:rev', '73y2xbmz', '2by9881r', 'z75gbez7', '647aga38'];
  const EST = { basic: 8, cloze: 8, vocab: 7, 'grammar-cloze': 9, reversed: 7, why: 18, compare: 20, scenario: 45 };
  const estMin = (ids) => Math.max(1, Math.round(ids.reduce((s, q) => s + (EST[cardBy[q.split(':')[0]].type] ?? 10), 0) / 60));
  const intervals = (c) => (c.isNew
    ? [`1 ${t('min')}`, `6 ${t('min')}`, `10 ${t('min')}`, days(3)]
    : [`10 ${t('min')}`, days(Math.max(1, Math.round(c.S * 1.2))), days(Math.round(c.S * 2.5)), days(Math.round(c.S * 4))]);

  // ---------- общие куски ----------
  const ICON = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    review: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/>',
    topics: '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/>',
    cards: '<rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v10"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  };
  const domainLabel = { architecture: 'Architecture', dotnet: '.NET', angular: 'Angular', 'lang-pl': 'Polski' };
  const langChip = (l) => `<span class="chip ${l === 'pl' ? 'amber' : l === 'ru' ? 'blue' : 'violet'}">${esc(l.toUpperCase())}</span>`;
  const typeChip = (c) => `<span class="chip primary">${esc(c.type)} · ${esc(c.bloom)}</span>`;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9а-яё\s-]/gi, '').trim().replace(/\s+/g, '-');
  const cloze = (html, open) => html.replace(/\{\{c\d+::(.+?)\}\}/g, (_, x) => (open ? `<span class="cloze open">${x}</span>` : '<span class="cloze">[…]</span>'));
  let toastTimer;
  const toast = (msg) => {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  };
  const vscode = (c) => toast(t('t_vscode', { f: `wastech-learn-content/${c.file}` }));
  let plVoice = null;
  const loadVoices = () => { plVoice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('pl')) ?? null; };
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (route().name === 'review') render(); }; }
  const speak = (text) => {
    if (!plVoice) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pl-PL';
    u.voice = plVoice;
    speechSynthesis.speak(u);
  };

  // ---------- состояние ----------
  // Hash — только простые имена экранов (#home, #review, …): так требует просмотрщик Artifact.
  // Открытая тема, якорь и сессия живут в state.
  const state = { demo: 'normal', session: null, filters: { q: '', domain: '', type: '' }, drawer: null, topicPath: null, anchor: null };
  const VIEWS = ['home', 'review', 'topics', 'cards', 'stats', 'prefs'];
  const route = () => {
    const h = location.hash.replace(/^#/, '');
    return { name: VIEWS.includes(h) ? h : 'home' };
  };
  const go = (view) => { if (location.hash === `#${view}`) render(); else location.hash = `#${view}`; };
  const isDark = () => document.documentElement.dataset.theme === 'dark'
    || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

  // ---------- sidebar ----------
  function renderChrome(name) {
    document.documentElement.lang = lang;
    const items = [['home', 'nav_home'], ['review', 'nav_review'], ['topics', 'nav_topics'], ['cards', 'nav_cards'], ['stats', 'nav_stats'], ['prefs', 'nav_settings']];
    $('#nav').innerHTML = items.map(([id, key]) => `
      <a class="nav-item ${name === id ? 'active' : ''}" href="#${id}" data-nav="${id}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICON[id === 'prefs' ? 'settings' : id]}</svg>${esc(t(key))}
        ${id === 'review' ? `<span class="badge">${QUEUE.length}</span>` : ''}
      </a>`).join('');
    $('#lang-switch').innerHTML = ['ru', 'en', 'pl'].map((l) => `<button type="button" data-lang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</button>`).join('');
    const dark = isDark();
    $('#theme-toggle').textContent = dark ? `☀ ${t('theme_light')}` : `☾ ${t('theme_dark')}`;
    $('#sync').innerHTML = `<span class="dot"></span>${esc(t('sync'))}`;
    $('#proto-note').textContent = t('proto');
    $('#search').placeholder = t('search');
  }

  // ---------- главная ----------
  function topicCard(tp) {
    const cs = DATA.cards.filter((c) => c.topic === tp.path);
    const due = QUEUE.filter((q) => cardBy[q.split(':')[0]].topic === tp.path).length;
    const rev = cs.filter((c) => !c.isNew);
    const mastery = Math.round((rev.reduce((s, c) => s + c.R, 0) / Math.max(1, cs.length)) * 100);
    return `<article class="card topic-card" data-topic="${tp.path}">
      <div class="row"><span class="chip">${esc(domainLabel[tp.domain] ?? tp.domain)}</span>${langChip(tp.lang)}</div>
      <h3>${esc(tp.title)}</h3>
      <p>${inline(tp.keyIdea)}</p>
      <div class="topic-stats"><span>${esc(t('cards'))}: <b>${cs.length}</b></span><span>${esc(t('due'))}: <b>${due}</b></span><span>${esc(t('mastery'))}: <b>${mastery}%</b></span></div>
      <div class="progress"><span style="width:${mastery}%"></span></div>
    </article>`;
  }

  function viewHome() {
    const min = estMin(QUEUE);
    const newCount = QUEUE.filter((q) => cardBy[q.split(':')[0]].isNew).length;
    const plCount = QUEUE.filter((q) => cardBy[q.split(':')[0]].topic.startsWith('lang-')).length;
    const fc = [QUEUE.length, 18, 9, 14, 21, 6, 11];
    const dayNames = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 10, 25 + i)).toLocaleDateString(lang, { weekday: 'short', timeZone: 'UTC' }));
    const max = Math.max(...fc);
    const hero = state.demo === 'back'
      ? `<section class="card hero back">
          <div class="big">${esc(t('back_title', { cards: nCards(180), m: 45 }))}</div>
          <div class="muted">${esc(t('back_plan'))}</div>
          <div class="row"><a class="btn primary" href="#review" data-mode="5">${esc(t('b5'))}</a><a class="btn" href="#review" data-mode="15">${esc(t('b15'))}</a><a class="btn" href="#review" data-mode="all">${esc(t('ball'))}</a></div>
        </section>`
      : `<section class="card hero">
          <div class="muted">${esc(t('today'))}</div>
          <div class="big">${esc(nCards(QUEUE.length))} ≈ ${min} ${esc(t('min'))}</div>
          <div class="muted">${esc(t('new_of', { a: newCount, b: 10, c: plCount }))}</div>
          <div class="row"><a class="btn primary" href="#review" data-mode="5">${esc(t('b5'))} <kbd>Enter</kbd></a><a class="btn" href="#review" data-mode="15">${esc(t('b15'))}</a><a class="btn" href="#review" data-mode="all">${esc(t('ball'))}</a></div>
        </section>`;
    return `
      <div class="row" style="justify-content:flex-end;margin-bottom:12px">
        <span class="muted" style="font-size:13px">${esc(t('demo'))}</span>
        <div class="segmented" role="group">
          <button type="button" data-demo="normal" class="${state.demo === 'normal' ? 'active' : ''}">${esc(t('demo_normal'))}</button>
          <button type="button" data-demo="back" class="${state.demo === 'back' ? 'active' : ''}">${esc(t('demo_back'))}</button>
        </div>
      </div>
      <div class="grid-2">
        ${hero}
        <section class="card">
          <div class="section-title" style="margin-top:0">${esc(t('forecast'))}</div>
          <div class="forecast">${fc.map((v, i) => `<div class="bar ${i === 0 ? 'today' : ''}"><small>${v}</small><span style="height:${Math.round((v / max) * 80)}%"></span><small>${esc(dayNames[i])}</small></div>`).join('')}</div>
        </section>
      </div>
      <div class="section-title">${esc(t('topics'))}</div>
      <div class="grid-3">${DATA.topics.map(topicCard).join('')}</div>
      <div class="grid-2 even" style="margin-top:20px">
        <section class="card tip"><span class="chip violet">Claude Code</span><div><b>${esc(t('capture_t'))}</b><div class="muted">${esc(t('capture'))}</div></div></section>
        <section class="card tip"><span class="chip violet">learn-quiz</span><div><b>${esc(t('quiz_t'))}</b><div class="muted">${esc(t('quiz'))}</div></div></section>
      </div>`;
  }

  // ---------- повторение ----------
  function startSession(mode) {
    let ids = QUEUE.slice();
    if (mode === '5') {
      let budget = 300;
      ids = ids.filter((q) => { const s = EST[cardBy[q.split(':')[0]].type] ?? 10; if (budget <= 0) return false; budget -= s; return true; });
    }
    state.session = { mode, items: ids.map((q) => { const [id, v] = q.split(':'); return { card: cardBy[id], variant: v ?? 'main' }; }), i: 0, phase: 'q', conf: null, checks: new Set(), results: [], start: Date.now() };
  }

  function questionHtml(it, open) {
    const c = it.card;
    if (c.type === 'vocab' && it.variant === 'rev') {
      const ru = c.answerHtml.replace(/<[^>]+>/g, '').split(' — ')[0];
      return `<p><span class="muted">[ru → pl]</span> ${esc(ru)}</p>${open ? `<p class="muted" style="font-size:18px">→ <b>${esc(c.title)}</b></p>` : ''}`;
    }
    return cloze(c.questionHtml, open);
  }

  function viewReview() {
    const s = state.session;
    if (s.i >= s.items.length) return viewEnd();
    const it = s.items[s.i];
    const c = it.card;
    const tp = topicBy[c.topic];
    const open = s.phase === 'a';
    const iv = intervals(c);
    const isPl = c.langPair || tp.lang === 'pl';
    const ttsText = c.type === 'vocab' ? c.title : (c.questionText.match(/\]\s*(.+)$/) ?? [, ''])[1].replace(/\{\{c\d+::(.+?)\}\}/g, '$1');
    // озвучка не должна подсказывать ответ: rev и cloze озвучиваются только после показа ответа
    const showTts = isPl && plVoice && (c.type === 'vocab' ? it.variant !== 'rev' || open : open);
    const req = c.rubric.filter((r) => r.required).length;
    const reqChecked = c.rubric.filter((r, i) => r.required && s.checks.has(i)).length;
    const suggested = c.rubric.length && open ? (reqChecked === req ? 3 : 1) : 0;
    const names = [t('again'), t('hard'), t('good'), t('easy')];
    const elapsed = Math.floor((Date.now() - s.start) / 1000);
    const lastRule = c.lastAgo ? t('days_ago', { n: c.lastAgo }) : t('is_new');
    return `
      <div class="session-bar">
        <span class="chip green">${esc(t('session'))} · ${s.mode === 'all' ? esc(t('ball')) : esc(t(s.mode === '5' ? 'b5' : 'b15'))}</span>
        <div class="progress"><span style="width:${Math.round((s.i / s.items.length) * 100)}%"></span></div>
        <b style="color:var(--ink)">${s.i + 1} / ${s.items.length}</b>
        <span class="muted" id="timer">${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}</span>
        <button class="btn" type="button" data-act="end">${esc(t('sc_end'))} <kbd>Esc</kbd></button>
      </div>
      <div class="review-wrap">
        <section class="card review-card">
          <div class="review-meta">
            <span class="crumb">${esc(domainLabel[tp.domain] ?? tp.domain)} / ${esc(tp.title)}</span>
            <span class="row">${c.changed ? `<span class="chip amber">${esc(t('changed'))}</span>` : ''}${typeChip(c)}${showTts ? `<button class="tts" type="button" data-act="tts" data-text="${esc(ttsText)}">🔊 <kbd>p</kbd></button>` : ''}</span>
          </div>
          <div class="question">${questionHtml(it, open)}</div>
          ${open ? `
            ${c.rubric.length ? `<div class="rubric"><div class="hint" style="margin-bottom:4px">${esc(t('rubric'))}</div>${c.rubric.map((r, i) => `<label><input type="checkbox" data-check="${i}" ${s.checks.has(i) ? 'checked' : ''}> <span>${esc(r.text)}${r.required ? `<span class="req">${esc(t('req'))}</span>` : ''}</span></label>`).join('')}</div>` : ''}
            <div class="answer">${c.answerHtml}</div>
            ${c.explanationHtml ? `<div class="explanation">${c.explanationHtml}</div>` : ''}
            ${suggested ? `<div class="hint">${esc(t('suggested', { r: names[suggested - 1] }))}</div>` : ''}
            <div class="ratings">${['again', 'hard', 'good', 'easy'].map((k, i) => `
              <button type="button" class="rate ${k} ${suggested === i + 1 ? 'suggested' : ''}" data-rate="${i + 1}" ${k === 'hard' ? `title="${esc(t('hard_hint'))}"` : ''}>
                <span>${i + 1} · ${esc(names[i])}</span><span class="iv">${esc(iv[i])}</span>
              </button>`).join('')}</div>
            <div class="hint">${esc(t('hard_hint'))} · <kbd>Space</kbd> = ${esc(names[2])}</div>`
          : `
            <div class="confidence"><span class="hint">${esc(t('conf'))}</span>
              ${[t('c1'), t('c2'), t('c3')].map((l, i) => `<button type="button" data-conf="${i + 1}" class="${s.conf === i + 1 ? 'active' : ''}">${i + 1} · ${esc(l)}</button>`).join('')}
            </div>
            <button type="button" class="btn primary reveal" data-act="reveal">${esc(t('show'))} <kbd>Space</kbd></button>`}
          <div class="shortcuts">
            <span><kbd>o</kbd>${esc(t('sc_topic'))}</span><span><kbd>e</kbd>VS Code</span><span><kbd>u</kbd>${esc(t('sc_undo'))}</span><span><kbd>!</kbd>${esc(t('sc_susp'))}</span>
          </div>
        </section>
        <aside class="context">
          <section class="card">
            <h4>${esc(t('ctx_key'))}</h4>
            <div style="color:var(--ink)">${inline(tp.keyIdea)}</div>
            <div style="margin-top:10px"><a href="#topics" data-topic="${tp.path}">${esc(t('ctx_sum'))} →</a></div>
          </section>
          <section class="card">
            <h4>${esc(t('ctx_state'))}</h4>
            <dl class="kv">
              <dt>${esc(t('r_now'))}</dt><dd>${c.isNew ? '—' : `${Math.round(c.R * 100)}%`}</dd>
              <dt>Stability</dt><dd>${c.isNew ? '—' : days(c.S)}</dd>
              <dt>${esc(t('lapses'))}</dt><dd>${c.lapses}</dd>
              <dt>${esc(t('last'))}</dt><dd>${esc(lastRule)}</dd>
            </dl>
          </section>
          <section class="card">
            <h4>${esc(t('file'))}</h4>
            <div style="font:12.5px var(--mono);word-break:break-all;color:var(--body)">${esc(c.file)}</div>
            <button class="btn" type="button" data-act="vscode" style="margin-top:10px">${esc(t('vscode'))} <kbd>e</kbd></button>
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
    return `<section class="card end">
      <div class="big">${esc(t('end_t', { cards: nCards(rated.length), m }))}</div>
      <div style="font-size:18px">${esc(t('end_rec', { a: ok, b: rated.length }))}</div>
      <div class="card" style="width:100%;text-align:left;box-shadow:none">
        <h4 style="margin:0 0 8px">${esc(t('end_hc'))}</h4>
        ${hc.length ? hc.map((r) => `<div><a href="#topics" data-topic="${r.card.topic}">${esc(r.card.title)}</a></div>`).join('') : `<div class="muted">${esc(t('end_none'))}</div>`}
      </div>
      <div class="muted">${esc(t('end_tom', { cards: nCards(18) }))}</div>
      <div class="row"><a class="btn primary" href="#home">${esc(t('home'))}</a><a class="btn" href="#review" data-act="restart">${esc(t('more'))}</a></div>
    </section>`;
  }

  // ---------- тема ----------
  function viewTopic(path, anchor) {
    const tp = topicBy[path];
    if (!tp) return `<div class="card">Topic not found</div>`;
    const cs = DATA.cards.filter((c) => c.topic === path);
    setTimeout(() => {
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
      else $('main').scrollTop = 0;
      state.anchor = null;
    }, 0);
    return `
      <div class="topic-head">
        <div>
          <div class="row"><span class="chip">${esc(domainLabel[tp.domain] ?? tp.domain)}</span>${langChip(tp.lang)}<span class="chip">${esc(tp.familiarity)}</span><span class="muted" style="font-size:13px">updated ${esc(tp.updated)}</span></div>
          <h2>${esc(tp.title)}</h2>
          <div style="font-size:17px;color:var(--ink);max-width:760px">${inline(tp.keyIdea)}</div>
        </div>
        <div class="row"><button class="btn" type="button" data-act="cram">${esc(t('cram'))}</button><button class="btn" type="button" data-act="vscode-topic" data-path="${esc(path)}">${esc(t('vscode'))}</button></div>
      </div>
      <div class="topic-layout">
        <nav class="toc">${tp.summary.map((sec) => `<a href="#topics" data-topic="${path}" data-anchor="${slug(sec.title)}">${esc(sec.title)}</a>`).join('')}</nav>
        <article class="card md">${tp.summary.map((sec) => {
          const id = slug(sec.title);
          const body = sec.title === 'Self-check'
            ? `<div class="selfcheck-hidden" id="selfcheck">${sec.html}</div><button class="btn" type="button" data-act="selfcheck" style="margin-top:8px">${esc(t('show_q'))}</button>`
            : sec.html;
          return `<h2 id="${id}">${esc(sec.title)}</h2>${body}`;
        }).join('')}</article>
        <aside class="context">
          <section class="card"><h4>${esc(t('pretest'))}</h4><ol style="margin:0;padding-left:18px">${tp.pretest.map((q) => `<li>${esc(q)}</li>`).join('')}</ol></section>
          <section class="card"><h4>${esc(t('cards'))} · ${cs.length}</h4><div class="side-list">${cs.map((c) => `
            <div class="item" data-card="${c.id}"><span>${esc(c.title)}<br><span class="muted" style="font-size:12px">${esc(c.type)}</span></span>
            <span class="rbar" title="R"><span style="width:${c.isNew ? 0 : Math.round(c.R * 100)}%"></span></span></div>`).join('')}</div></section>
          <section class="card md"><h4>${esc(t('materials'))}</h4>${tp.materialsHtml}</section>
        </aside>
      </div>`;
  }

  function viewTopics() {
    return `<div class="grid-3">${DATA.topics.map(topicCard).join('')}</div><p class="muted" style="margin-top:18px">${esc(t('map_later'))}</p>`;
  }

  // ---------- карточки ----------
  function filteredCards() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase();
    return DATA.cards.filter((c) => (!f.domain || c.topic.startsWith(`${f.domain}/`)) && (!f.type || c.type === f.type) && (!q || c.plain.includes(q) || c.title.toLowerCase().includes(q)));
  }

  function viewCards() {
    const f = state.filters;
    const list = filteredCards();
    const types = [...new Set(DATA.cards.map((c) => c.type))];
    return `
      <div class="toolbar">
        <input id="card-q" type="search" placeholder="${esc(t('search'))}" value="${esc(f.q)}" style="width:320px">
        <select id="f-domain"><option value="">${esc(t('all_domains'))}</option>${DATA.topics.map((tp) => tp.domain).filter((d, i, a) => a.indexOf(d) === i).map((d) => `<option value="${d}" ${f.domain === d ? 'selected' : ''}>${esc(domainLabel[d] ?? d)}</option>`).join('')}</select>
        <select id="f-type"><option value="">${esc(t('all_types'))}</option>${types.map((ty) => `<option ${f.type === ty ? 'selected' : ''}>${ty}</option>`).join('')}</select>
        <span class="muted">${esc(t('found', { n: list.length }))}</span>
      </div>
      <div class="card table-wrap" style="padding:6px 10px">
        <table class="list"><thead><tr><th>${esc(t('col_title'))}</th><th>${esc(t('col_type'))}</th><th>${esc(t('col_topic'))}</th><th>R</th><th>Due</th><th>${esc(t('lapses'))}</th><th>${esc(t('col_status'))}</th></tr></thead>
        <tbody>${list.map((c) => `<tr data-card="${c.id}">
          <td class="title">${esc(c.title)}</td><td><span class="chip">${esc(c.type)}</span></td><td>${esc(topicBy[c.topic].title)}</td>
          <td>${c.isNew ? '—' : `${Math.round(c.R * 100)}%`}</td><td>${c.isNew ? 'new' : c.dueIn === 0 ? esc(t('today')) : `+${days(c.dueIn)}`}</td><td>${c.lapses}</td>
          <td>${c.changed ? `<span class="chip amber">${esc(t('changed'))}</span>` : `<span class="chip green">${esc(c.status)}</span>`}</td></tr>`).join('')}</tbody></table>
      </div>`;
  }

  function renderDrawer() {
    const el = $('#drawer');
    const c = state.drawer && cardBy[state.drawer];
    if (!c) { el.hidden = true; return; }
    const tp = topicBy[c.topic];
    el.hidden = false;
    el.innerHTML = `
      <div class="row" style="justify-content:space-between"><span class="crumb">${esc(tp.title)}</span><button class="btn" type="button" data-act="close-drawer">${esc(t('close'))} <kbd>Esc</kbd></button></div>
      <div class="row">${typeChip(c)}<span class="chip">${esc(c.id)}</span></div>
      <h3 style="margin:0;color:var(--ink)">${esc(c.title)}</h3>
      <div class="question" style="font-size:19px">${cloze(c.questionHtml, true)}</div>
      ${c.rubric.length ? `<div class="rubric">${c.rubric.map((r) => `<div>• ${esc(r.text)}${r.required ? `<span class="req">${esc(t('req'))}</span>` : ''}</div>`).join('')}</div>` : ''}
      <div class="answer">${c.answerHtml}</div>
      ${c.explanationHtml ? `<div class="explanation">${c.explanationHtml}</div>` : ''}
      <div class="row"><button class="btn" type="button" data-act="vscode-card" data-id="${c.id}">${esc(t('vscode'))}</button><a class="btn" href="#topics" data-topic="${c.topic}">${esc(t('open_topic'))}</a></div>`;
  }

  // ---------- статистика и настройки ----------
  function viewStats() {
    const r = rng(42);
    const bars = Array.from({ length: 30 }, (_, i) => Math.round(8 + r() * 22 + (i % 7 === 5 ? -6 : 0)));
    const max = Math.max(...bars);
    return `
      <div class="grid-4">
        <div class="card kpi"><span class="v">88%</span><span class="l">${esc(t('st_young'))}</span></div>
        <div class="card kpi"><span class="v">92%</span><span class="l">${esc(t('st_mature'))}</span></div>
        <div class="card kpi"><span class="v">412</span><span class="l">${esc(t('st_reviews'))}</span></div>
        <div class="card kpi"><span class="v">9 ${esc(t('min'))}</span><span class="l">${esc(t('st_time'))}</span></div>
      </div>
      <section class="card" style="margin-top:20px">
        <div class="section-title" style="margin-top:0">${esc(t('st_fc'))}</div>
        <div class="bars30">${bars.map((v, i) => `<span class="${i % 7 === 5 || i % 7 === 6 ? 'wknd' : ''}" style="height:${Math.round((v / max) * 100)}%" title="${v}"></span>`).join('')}</div>
      </section>
      <div class="grid-3" style="margin-top:20px">
        <div class="card"><span class="chip green">Hard</span><p>${esc(t('st_hard'))}</p></div>
        <div class="card"><span class="chip amber">Leech</span><p>${esc(t('st_leech'))}</p></div>
        <div class="card"><span class="chip">Later</span><p class="muted">${esc(t('st_cal'))}</p></div>
      </div>`;
  }

  function viewSettings() {
    const dr = Number(store.get('wl-dr', '0.9'));
    const perDay = (x) => Math.round((9 * (1 / (1 - x))) / 10);
    return `<section class="card">
      <div class="setting"><div><b>${esc(t('s_lang'))}</b><small>${esc(t('s_lang_h'))}</small></div>
        <div class="segmented">${['ru', 'en', 'pl'].map((l) => `<button type="button" data-lang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</button>`).join('')}</div></div>
      <div class="setting"><div><b>${esc(t('s_dr'))}</b><small>${esc(t('s_dr_h'))}</small></div>
        <div class="row"><input id="dr" type="range" min="0.8" max="0.97" step="0.01" value="${dr}"><b id="dr-v" style="color:var(--ink)">${dr.toFixed(2)}</b><span class="muted" id="dr-load">${esc(t('per_day', { m: perDay(dr) }))}</span></div></div>
      <div class="setting"><div><b>${esc(t('s_limits'))}</b><small>${esc(t('s_limits_h'))}</small></div>
        <div class="row"><span class="chip">architecture · dotnet · angular: 10</span><span class="chip amber">lang-pl: 10</span></div></div>
      <div class="setting"><div><b>${esc(t('s_sess'))}</b></div>
        <div class="segmented"><button type="button">5</button><button type="button">10</button><button type="button" class="active">15 ${esc(t('min'))}</button></div></div>
      <div class="setting"><div><b>${esc(t('s_tts'))}</b></div>
        <div class="row"><button class="btn" type="button" data-act="tts-check">${esc(t('s_tts_btn'))}</button><span class="muted" id="tts-res"></span></div></div>
      <div class="setting"><div><b>${esc(t('s_heat'))}</b><small>${esc(t('s_heat_h'))}</small></div><label class="row"><input type="checkbox"> off</label></div>
      <div class="setting"><div><b>${esc(t('s_dev'))}</b></div><div class="row"><span class="chip">desk1</span><span class="muted" style="font:13px var(--mono)">~/Projects/wastech-learn-content</span></div></div>
    </section>`;
  }

  // ---------- рендер и события ----------
  let timer;
  function render() {
    const r = route();
    renderChrome(r.name);
    const titles = { home: 'today', review: 'nav_review', topics: 'nav_topics', cards: 'nav_cards', stats: 'nav_stats', prefs: 'nav_settings' };
    $('#page-title').textContent = t(titles[r.name] ?? 'nav_home');
    clearInterval(timer);
    let html;
    switch (r.name) {
      case 'review':
        if (!state.session) startSession('all');
        html = viewReview();
        timer = setInterval(() => {
          const el = $('#timer');
          if (!el || !state.session) return;
          const s = Math.floor((Date.now() - state.session.start) / 1000);
          el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        }, 1000);
        break;
      case 'topics': html = state.topicPath ? viewTopic(state.topicPath, state.anchor) : viewTopics(); break;
      case 'cards': html = viewCards(); break;
      case 'stats': html = viewStats(); break;
      case 'prefs': html = viewSettings(); break;
      default: html = viewHome();
    }
    $('#view').innerHTML = html;
    renderDrawer();
  }

  const s = () => state.session;
  function reveal() { if (s() && s().phase === 'q') { s().phase = 'a'; render(); } }
  function rate(n) {
    const se = s();
    if (!se || se.phase !== 'a') return;
    se.results.push({ card: se.items[se.i].card, rating: n, conf: se.conf });
    se.i += 1; se.phase = 'q'; se.conf = null; se.checks = new Set();
    render();
  }
  function undo() {
    const se = s();
    if (!se || !se.results.length) return;
    se.results.pop();
    se.i -= 1; se.phase = 'q'; se.conf = null; se.checks = new Set();
    toast(t('t_undo'));
    render();
  }
  function endSession() { const se = s(); if (se) { se.items = se.items.slice(0, se.i); render(); } }

  document.addEventListener('click', (e) => {
    const topicEl = e.target.closest('[data-topic]');
    if (topicEl) {
      e.preventDefault();
      const anchor = topicEl.dataset.anchor;
      if (anchor && state.topicPath === topicEl.dataset.topic && route().name === 'topics') {
        document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
        return;
      }
      state.topicPath = topicEl.dataset.topic;
      state.anchor = anchor ?? null;
      state.drawer = null;
      go('topics');
      return;
    }
    const modeEl = e.target.closest('[data-mode]');
    if (modeEl) { e.preventDefault(); startSession(modeEl.dataset.mode); go('review'); return; }
    const navEl = e.target.closest('[data-nav]');
    if (navEl) {
      e.preventDefault();
      state.drawer = null;
      if (navEl.dataset.nav === 'topics') state.topicPath = null;
      if (navEl.dataset.nav === 'review' && state.session && state.session.i >= state.session.items.length) state.session = null;
      go(navEl.dataset.nav);
      return;
    }
    const langBtn = e.target.closest('[data-lang]');
    if (langBtn) { lang = langBtn.dataset.lang; store.set('wl-lang', lang); render(); return; }
    const demo = e.target.closest('[data-demo]');
    if (demo) { state.demo = demo.dataset.demo; render(); return; }
    const conf = e.target.closest('[data-conf]');
    if (conf) { s().conf = Number(conf.dataset.conf); render(); return; }
    const rt = e.target.closest('[data-rate]');
    if (rt) { rate(Number(rt.dataset.rate)); return; }
    const chk = e.target.closest('[data-check]');
    if (chk) { const i = Number(chk.dataset.check); s().checks.has(i) ? s().checks.delete(i) : s().checks.add(i); render(); return; }
    const cardEl = e.target.closest('[data-card]');
    if (cardEl) { state.drawer = cardEl.dataset.card; renderDrawer(); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'reveal') reveal();
    else if (a === 'end') endSession();
    else if (a === 'restart') { e.preventDefault(); startSession('5'); go('review'); }
    else if (a === 'tts') speak(act.dataset.text);
    else if (a === 'vscode') vscode(s().items[s().i].card);
    else if (a === 'vscode-card') vscode(cardBy[act.dataset.id]);
    else if (a === 'vscode-topic') toast(t('t_vscode', { f: `wastech-learn-content/content/${act.dataset.path}/summary.md` }));
    else if (a === 'close-drawer') { state.drawer = null; renderDrawer(); }
    else if (a === 'cram') toast(t('t_cram'));
    else if (a === 'selfcheck') { $('#selfcheck')?.classList.toggle('selfcheck-hidden'); }
    else if (a === 'tts-check') { loadVoices(); $('#tts-res').textContent = plVoice ? t('tts_ok', { v: plVoice.name }) : t('tts_no'); }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'card-q') { state.filters.q = e.target.value; const pos = e.target.selectionStart; render(); const el = $('#card-q'); el.focus(); el.setSelectionRange(pos, pos); }
    if (e.target.id === 'dr') {
      const x = Number(e.target.value);
      store.set('wl-dr', String(x));
      $('#dr-v').textContent = x.toFixed(2);
      $('#dr-load').textContent = t('per_day', { m: Math.round((9 * (1 / (1 - x))) / 10) });
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'f-domain') { state.filters.domain = e.target.value; render(); }
    if (e.target.id === 'f-type') { state.filters.type = e.target.value; render(); }
  });
  $('#search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { state.filters.q = e.target.value; go('cards'); }
  });
  $('#theme-toggle').addEventListener('click', () => {
    const dark = !isDark();
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    store.set('wl-theme', dark ? 'dark' : 'light');
    render();
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox';
    if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === '/') { e.preventDefault(); $('#search').focus(); return; }
    if (e.key === 'Escape' && state.drawer) { state.drawer = null; renderDrawer(); return; }
    const r = route();
    if (r.name === 'home' && e.key === 'Enter') { startSession('5'); go('review'); return; }
    if (r.name !== 'review' || !s()) return;
    const se = s();
    if (se.i >= se.items.length) return;
    const c = se.items[se.i].card;
    if (e.key === ' ') { e.preventDefault(); se.phase === 'q' ? reveal() : rate(3); }
    else if (/^[1-4]$/.test(e.key)) {
      const n = Number(e.key);
      if (se.phase === 'q' && n <= 3) { se.conf = n; render(); }
      else if (se.phase === 'a') rate(n);
    }
    else if (e.key === 'u' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) undo();
    else if (e.key === 'o') { state.topicPath = c.topic; go('topics'); }
    else if (e.key === 'e') vscode(c);
    else if (e.key === 'p') { const b = $('[data-act="tts"]'); if (b) speak(b.dataset.text); }
    else if (e.key === '!') { se.results.push({ card: c, rating: 0 }); se.i += 1; se.phase = 'q'; toast(t('t_susp')); render(); }
    else if (e.key === 'Escape') endSession();
  });

  // Тема: без явного выбора следуем prefers-color-scheme (и data-theme, если его ставит хост).
  const savedTheme = store.get('wl-theme', '');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => renderChrome(route().name));
  window.addEventListener('hashchange', render);
  render();
})();
