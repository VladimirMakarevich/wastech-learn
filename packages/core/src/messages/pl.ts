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
  "finding.cloze-unclosed": {
    count: "count",
    one: "{count} luka cloze nie jest zamknięta }}: zamknij ją",
    few: "{count} luki cloze nie są zamknięte }}: zamknij je",
    many: "{count} luk cloze nie jest zamkniętych }}: zamknij je",
    other: "{count} luki cloze nie jest zamkniętej }}: zamknij je",
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

  "finding.diagram-render":
    "Mermaid nie zdołał wyrenderować tego źródła: {detail}",
  "finding.package-card":
    "Kandydat {card} nie ma pola {field} albo jest ono niepoprawne: popraw je w pakiecie",
  "finding.package-material":
    "Wiersz materiałów nie ma pola {field} albo jest ono niepoprawne: popraw wiersz tabeli",
  "finding.package-summary-section":
    "Sekcji summary {section} nie ma w szablonie: zmień jej nazwę albo ją usuń",
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

  "error.path-outside-content": "{subject} leży poza repozytorium treści",
  "error.request-id-reused":
    "requestId {subject} został już użyty dla innego wywołania",
  "error.item-not-active": "{subject} nie jest review item aktywnej karty",
  "error.topic-exists": "Temat {subject} już istnieje",
  "error.topic-not-found": "Temat {subject} nie istnieje",
  "error.card-not-found": "Nie ma karty o id {subject}",
  "error.package-not-found": "Pod ścieżką {subject} nie ma learning package",
  "error.nothing-to-undo": "Nie ma oceny z tego urządzenia do cofnięcia",
  "error.nothing-to-restore":
    "Karta {subject} nie została usunięta od ostatniego commitu — nie ma czego przywracać",
  "error.content-changed":
    "{subject} zmienił się podczas przygotowania zapisu; nic nie zapisano",
  "error.search-index-invalid":
    "Indeks wyszukiwania w content bundle jest nieczytelny dla tej wersji",
  "error.id-unavailable":
    "Nie udało się utworzyć nowego id: źródło losowości lub zegar dały {subject}",
  "error.input-invalid": "Pole wejścia {field} jest niepoprawne",
  "error.tool-unknown": "Nie ma narzędzia o nazwie {subject}",
  "error.config-invalid": "{file}: pole {field} jest niepoprawne",
  "error.config-json": "{file} to niepoprawny JSON",
  "hint.config-json": "Popraw składnię pliku i wywołaj ponownie",
  "error.event-invalid":
    "Zdarzenie powtórki ma niepoprawne pole {field}; nic nie zapisano",
  "error.repository-not-found":
    "W folderze treści, z którym uruchomiono serwer, nie ma {file}",
  "error.io-failed": "Nie można odczytać ani zapisać {file}",
  "error.render-failed": "Renderowanie {file} nie powiodło się",
  "error.scheduler-unsupported":
    "learn.config.json wskazuje inny scheduler niż {expected}",
  "error.unexpected": "Nieoczekiwany błąd: {detail}",

  "hint.path-outside-content":
    "Podaj ścieżkę względem katalogu głównego repozytorium, bez .. i linków prowadzących na zewnątrz",
  "hint.request-id-reused":
    "Dla zmienionego wywołania użyj nowego requestId; powtarzaj id tylko z tym samym wejściem",
  "hint.item-not-active":
    "Bierz review items z quiz_next: szkice i karty retired nie są powtarzane",
  "hint.topic-exists":
    "Uzupełniaj go przez add_cards, save_summary i save_materials",
  "hint.topic-not-found":
    "Najpierw utwórz go przez create_topic albo znajdź jego <domain>/<topic> przez search",
  "hint.card-not-found": "Znajdź id karty przez search",
  "hint.package-not-found":
    "Podaj ścieżkę pliku w inbox/, na przykład inbox/topic.md",
  "hint.nothing-to-undo":
    "Tu można cofnąć tylko oceny zapisane przez record_review na tym urządzeniu",
  "hint.nothing-to-restore":
    "Usunięcie można cofnąć tylko przed commitem; potem plik zostaje w historii git",
  "hint.content-changed":
    "Ktoś w tym czasie zapisał plik: wywołaj narzędzie ponownie, by oprzeć się na nowym tekście",
  "hint.search-index-invalid":
    "Przebuduj bundle poleceniem wastech-learn build albo uruchom ponownie wastech-learn serve",
  "hint.id-unavailable":
    "Sprawdź zegar komputera i wywołaj ponownie; jeśli to się powtórzy, to błąd wastech-learn",
  "hint.input-invalid": "Popraw to pole i wywołaj narzędzie ponownie",
  "hint.tool-unknown": "Pobierz listę narzędzi, by zobaczyć, co oferuje serwer",
  "hint.config-invalid": "Popraw wartość w pliku i wywołaj ponownie",
  "hint.event-invalid": "Sprawdź ocenę i review item, potem wywołaj ponownie",
  "hint.repository-not-found":
    "Uruchom serwer z --content wskazującym repozytorium treści",
  "hint.io-failed": "Sprawdź, czy plik istnieje i można do niego pisać",
  "hint.render-failed":
    "Sprawdź, czy npx może uruchomić mermaid-cli na tym komputerze, i wywołaj ponownie",
  "hint.scheduler-unsupported":
    "Ustaw srs.scheduler na wersję dostarczaną z frameworkiem albo zaktualizuj framework",
  "hint.unexpected":
    "Nic nie zapisano; opisz autorowi frameworka, co do tego doprowadziło",

  "cli.check.summary": "{files}, {errors}, {warnings}",
  "cli.check.clean": "Sprawdzono: {cards}, bez uwag",
  "cli.build.written": "Bundle zapisany w {file}: {topics}, {cards}",
  "cli.build.blocked":
    "Bundle nie został zapisany: popraw błędy powyżej i uruchom ponownie",
  "cli.serve.listening":
    "wastech-learn działa pod adresem {url}; Ctrl+C zatrzymuje serwer",
  "cli.serve.built": "Bundle zbudowany w {ms} ms: {topics}, {cards}",
  "cli.serve.build-failed":
    "Bundle nie został przebudowany ({errors}); aplikacja działa na poprzednim i pokazuje, gdzie jest błąd",
  "cli.serve.watch-failed":
    "Aktualizacje na żywo zatrzymały się: {detail}. Uruchom ponownie wastech-learn serve, aby je przywrócić",
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
  "cli.error.port-in-use":
    "Port {port} jest już zajęty: uruchom z --port <inny port> albo zatrzymaj program, który go zajmuje",
  "cli.error.missing-command": "Podaj polecenie: wastech-learn --help",
  "cli.error.unknown-command":
    "Nieznane polecenie {command}: wastech-learn --help",
  "cli.error.unknown-option": "Nieznana opcja {option}: wastech-learn --help",
  "cli.error.bad-value":
    "Niepoprawna wartość {value} dla {option}: wastech-learn --help",
  "cli.error.unexpected": "Nieoczekiwany błąd: {detail}",
  "cli.error.scheduler-unsupported":
    "learn.config.json wskazuje inny scheduler: ustaw srs.scheduler na {expected} lub użyj pasującej wersji frameworka",

  "cli.hook.findings": "{file} ma uwagi: popraw je, zanim pójdziesz dalej",
  "cli.hook.failed": "Sprawdzenie treści nie zostało uruchomione: {detail}",
  "cli.hook.bad-event":
    "Brak zdarzenia narzędzia na stdin: uruchamiaj to polecenie z hooka PostToolUse",

  "cli.help": [
    "Użycie: wastech-learn <polecenie> [opcje]",
    "",
    "Polecenia:",
    "  check      Sprawdź treść ponad mdlint: limity, cloze, id, diagramy, preset",
    "  build      Zbuduj content bundle dla aplikacji (--out <plik>)",
    "  render     Wyrenderuj diagrams/*.mmd do SVG; --check tylko pokaże nieaktualne",
    "  simulate   Zasymuluj przerwę i sesje, które rozładują zaległości",
    "  new-id     Wypisz nowe id kart (--count <n>, domyślnie 1)",
    "  hook       post-tool-use: sprawdź plik, który agent właśnie zapisał (JSON zdarzenia na stdin)",
    "  serve      Otwórz aplikację w przeglądarce przez lokalny serwer na 127.0.0.1",
    "",
    "Opcje:",
    "  --content <folder> Repozytorium treści (domyślnie bieżący folder)",
    "  --lang <ru|en|pl>  Język komunikatów (domyślnie uiLanguage z learn.config.json)",
    "  --help             Pokaż tę pomoc",
    "",
    "build:    --out <plik> (domyślnie .cache/content-bundle.json), --built-at <data ISO>",
    "render:   --check",
    "simulate: --cards, --warmup-days, --break-days, --session-minutes, --seed, --runs",
    "serve:    --port <n> (domyślnie 4747), --no-open",
  ].join("\n"),
};
