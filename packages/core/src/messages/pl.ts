import type { MessageKey } from "./en.js";
import type { Message } from "./types.js";

export const pl: Readonly<Record<MessageKey, Message>> = {
  "finding.front-matter-missing":
    "Brak front matter: zacznij plik od bloku ---",
  "finding.front-matter-yaml":
    "Front matter to niepoprawny YAML: popraw składnię",
  "finding.front-matter-schema":
    "Pole front matter {field} jest puste lub niepoprawne",
  "finding.section-missing": "Brak sekcji ## {section}: dodaj ją",
  "finding.topic-file-missing":
    "Temat nie ma pliku {name}: dodaj go obok index.md",
  "finding.topic-missing":
    "Karta jest poza tematem: brak content/{topic}/index.md lub jest niepoprawny",
  "finding.question-words": {
    count: "count",
    one: "Pytanie ma {count} słowo, limit dla {type} to {limit}",
    few: "Pytanie ma {count} słowa, limit dla {type} to {limit}",
    many: "Pytanie ma {count} słów, limit dla {type} to {limit}",
    other: "Pytanie ma {count} słowa, limit dla {type} to {limit}",
  },
  "finding.answer-words": {
    count: "count",
    one: "Odpowiedź ma {count} słowo, limit dla {type} to {limit}",
    few: "Odpowiedź ma {count} słowa, limit dla {type} to {limit}",
    many: "Odpowiedź ma {count} słów, limit dla {type} to {limit}",
    other: "Odpowiedź ma {count} słowa, limit dla {type} to {limit}",
  },
  "finding.answer-points": {
    count: "count",
    one: "Odpowiedź ma {count} punkt, limit dla {type} to {limit}",
    few: "Odpowiedź ma {count} punkty, limit dla {type} to {limit}",
    many: "Odpowiedź ma {count} punktów, limit dla {type} to {limit}",
    other: "Odpowiedź ma {count} punktu, limit dla {type} to {limit}",
  },
  "finding.rubric-missing": "Karta {type} potrzebuje sekcji ## Rubric",
  "finding.rubric-items": {
    count: "count",
    one: "Rubryka ma {count} punkt, limit to {limit}",
    few: "Rubryka ma {count} punkty, limit to {limit}",
    many: "Rubryka ma {count} punktów, limit to {limit}",
    other: "Rubryka ma {count} punktu, limit to {limit}",
  },
  "finding.rubric-required":
    "Rubryka nie ma punktu obowiązkowego: oznacz co najmniej jeden znakiem (!)",
  "finding.code-lines": {
    count: "count",
    one: "Blok kodu ma {count} linię, limit to {limit}",
    few: "Blok kodu ma {count} linie, limit to {limit}",
    many: "Blok kodu ma {count} linii, limit to {limit}",
    other: "Blok kodu ma {count} linii, limit to {limit}",
  },
  "finding.code-width": {
    count: "count",
    one: "Linia kodu ma {count} znak, limit to {limit}",
    few: "Linia kodu ma {count} znaki, limit to {limit}",
    many: "Linia kodu ma {count} znaków, limit to {limit}",
    other: "Linia kodu ma {count} znaku, limit to {limit}",
  },
  "finding.cloze-gaps":
    "Cloze {variant} ukrywa fragmentów: {count}; zostaw jeden na wariant",
  "finding.cloze-variants": {
    count: "count",
    one: "Karta cloze ma {count} wariant, oczekiwano od 1 do {limit}",
    few: "Karta cloze ma {count} warianty, oczekiwano od 1 do {limit}",
    many: "Karta cloze ma {count} wariantów, oczekiwano od 1 do {limit}",
    other: "Karta cloze ma {count} wariantu, oczekiwano od 1 do {limit}",
  },
  "finding.vocab-lang-pair": "Karta vocab potrzebuje langPair we front matter",
  "finding.vocab-example":
    "W odpowiedzi brak przykładowego zdania: dodaj je kursywą",
  "finding.id-unique": "id {id} jest już użyte w {other}",
  "finding.diagram-svg-missing":
    "Obok źródła nie ma SVG: uruchom wastech-learn render",
  "finding.diagram-stale":
    "SVG jest starsze niż {source}: uruchom wastech-learn render",
  "finding.summary-link":
    "W Sources brak linku do sekcji ../summary.md#: dodaj go",
  "finding.active-edit":
    "{section} aktywnej karty zmieniono w {percent}%: jeśli zmienił się sens, przenieś ją do retired i dodaj nową",
  "finding.preset-invalid":
    "To nie jest poprawny config wastech-mdlint: skopiuj preset z CLI",
  "finding.preset-drift":
    "Reguła presetu {rule} (nr {position}) zniknęła lub się zmieniła: przywróć ją z presetu CLI",

  "count.files": {
    count: "count",
    one: "{count} plik",
    few: "{count} pliki",
    many: "{count} plików",
    other: "{count} pliku",
  },
  "count.errors": {
    count: "count",
    one: "{count} błąd",
    few: "{count} błędy",
    many: "{count} błędów",
    other: "{count} błędu",
  },
  "count.warnings": {
    count: "count",
    one: "{count} ostrzeżenie",
    few: "{count} ostrzeżenia",
    many: "{count} ostrzeżeń",
    other: "{count} ostrzeżenia",
  },
  "count.topics": {
    count: "count",
    one: "{count} temat",
    few: "{count} tematy",
    many: "{count} tematów",
    other: "{count} tematu",
  },
  "count.cards": {
    count: "count",
    one: "{count} karta",
    few: "{count} karty",
    many: "{count} kart",
    other: "{count} karty",
  },

  "cli.check.summary": "{files}, {errors}, {warnings}",
  "cli.check.clean": "Sprawdzono: {cards}, bez uwag",
  "cli.build.written": "Bundle zapisany w {file}: {topics}, {cards}",
  "cli.build.blocked":
    "Bundle nie został zapisany: popraw błędy powyżej i uruchom ponownie",
  "cli.render.rendered": "Wyrenderowano: {file}",
  "cli.render.stale": "Nieaktualny: {file}",
  "cli.render.summary": "Diagramy: {total}, wyrenderowane: {rendered}",
  "cli.render.check-summary": "Diagramy: {total}, nieaktualne: {stale}",

  "cli.simulate.header":
    "Przerwa {breakDays} dni, sesje po {sessionMinutes} min, {cards} ({items} review items) po {warmupDays} dniach codziennej nauki, ziarna {seeds}",
  "cli.simulate.col.order": "Kolejność",
  "cli.simulate.col.median": "Mediana sesji",
  "cli.simulate.col.cleared": "Rozładowane w ≤ {target}",
  "cli.simulate.col.recall": "Przypomniane",
  "cli.simulate.default": "{order} (domyślna)",
  "cli.simulate.never": "nie w {days}",
  "cli.simulate.days-title": "Dzień po dniu, {order}, ziarno {seed}:",
  "cli.simulate.col.day": "Dzień",
  "cli.simulate.col.backlog": "Zaległości",
  "cli.simulate.col.reviews": "Powtórki",
  "cli.simulate.col.minutes": "Minuty",
  "cli.simulate.col.new": "Nowe karty",
  "cli.simulate.new-offered": "są",
  "cli.simulate.new-paused": "pauza",
  "cli.simulate.cleared": {
    count: "count",
    one: "Zaległości ({backlog} review items) rozładowane po {count} sesji.",
    few: "Zaległości ({backlog} review items) rozładowane po {count} sesjach.",
    many: "Zaległości ({backlog} review items) rozładowane po {count} sesjach.",
    other: "Zaległości ({backlog} review items) rozładowane po {count} sesji.",
  },
  "cli.simulate.not-cleared":
    "Zaległości ({backlog} review items) nie zostały rozładowane w {days} sesji.",

  "cli.error.config-invalid":
    "{file}: pole {field} jest niepoprawne, popraw wartość i uruchom ponownie",
  "cli.error.config-json":
    "{file} to niepoprawny JSON, popraw składnię i uruchom ponownie",
  "cli.error.event-invalid":
    "Zdarzenie powtórki ma niepoprawne pole {field}; nic nie zapisano",
  "cli.error.repository-not-found":
    "W {root} nie ma {file}: wskaż w --content repozytorium treści",
  "cli.error.io-failed":
    "Nie można odczytać ani zapisać {file}: sprawdź ścieżkę i uprawnienia",
  "cli.error.render-failed":
    "Renderowanie {file} nie powiodło się: sprawdź źródło Mermaid",
  "cli.error.missing-command": "Podaj polecenie: wastech-learn --help",
  "cli.error.unknown-command":
    "Nieznane polecenie {command}: wastech-learn --help",
  "cli.error.unknown-option": "Nieznana opcja {option}: wastech-learn --help",
  "cli.error.bad-value":
    "Niepoprawna wartość {value} dla {option}: wastech-learn --help",
  "cli.error.unexpected": "Nieoczekiwany błąd: {detail}",
  "cli.error.scheduler-unsupported":
    "learn.config.json wskazuje inny scheduler: ustaw srs.scheduler na {expected} lub użyj pasującej wersji frameworka",

  "cli.help": [
    "Użycie: wastech-learn <polecenie> [opcje]",
    "",
    "Polecenia:",
    "  check      Sprawdź treść ponad mdlint: limity, cloze, id, diagramy, preset",
    "  build      Zbuduj content bundle dla aplikacji (--out <plik>)",
    "  render     Wyrenderuj diagrams/*.mmd do SVG; --check tylko pokaże nieaktualne",
    "  simulate   Zasymuluj przerwę i sesje, które rozładują zaległości",
    "",
    "Opcje:",
    "  --content <folder> Repozytorium treści (domyślnie bieżący folder)",
    "  --lang <ru|en|pl>  Język komunikatów (domyślnie uiLanguage z learn.config.json)",
    "  --help             Pokaż tę pomoc",
    "",
    "build:    --out <plik> (domyślnie .cache/content-bundle.json), --built-at <data ISO>",
    "render:   --check",
    "simulate: --cards, --warmup-days, --break-days, --session-minutes, --seed, --runs",
  ].join("\n"),
};
