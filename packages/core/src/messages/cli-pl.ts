import type { CliMessageKey } from "./cli-en.js";
import type { Message } from "./types.js";

export const cliPl: Readonly<Record<CliMessageKey, Message>> = {
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

  "cli.init.done": "Repozytorium treści gotowe w {root}",
  "cli.init.refused":
    "W {root} są pliki, których repozytorium treści nie ma ({entries}): wybierz pusty folder albo samo repozytorium treści",
  "cli.init.created": "Utworzono z szablonu: {files}",
  "cli.init.kept":
    "{file} zostaje bez zmian: różni się od szablonu, porównaj je, jeśli zmiana nie była celowa",
  "cli.init.config":
    "learn.config.json: strefa czasowa {timezone}, język interfejsu {language}",
  "cli.init.config-kept": "learn.config.json już istnieje i zostaje bez zmian",
  "cli.init.device":
    "Ten komputer zapisuje powtórki jako urządzenie {device} (learn.local.json)",
  "cli.init.device-kept":
    "learn.local.json już nazywa ten komputer {device} i zostaje bez zmian",
  "cli.init.skills-installed":
    "Skills zainstalowane dla Claude Code i Codex: {skills}",
  "cli.init.skills-updated":
    "Skills zaktualizowane do wersji frameworka: {skills}",
  "cli.init.skills-current": "Skills są aktualne: {skills}",
  "cli.init.skill-kept":
    "{dir}/{skill} zostaje bez zmian: zmieniono go ręcznie; usuń folder i uruchom init ponownie, aby dostać wersję frameworka",
  "cli.init.next": "Dalej:",
  "cli.doctor.node": "Node {version}",
  "cli.doctor.node-old":
    "Node {version} jest starszy niż {required}: zainstaluj Node 24 (nvm install 24) i uruchom ponownie",
  "cli.doctor.build": "Framework zbudowany",
  "cli.doctor.build-missing":
    "Framework nie jest zbudowany ({packages}): uruchom npm run build w {dir}",
  "cli.doctor.build-stale":
    "Źródła frameworka zmieniły się po ostatnim budowaniu ({packages}): uruchom npm run build w {dir} i zrestartuj serve oraz sesje agentów",
  "cli.doctor.config":
    "learn.config.json: strefa czasowa {timezone}, język interfejsu {language}",
  "cli.doctor.config-missing":
    "W {root} nie ma learn.config.json: utwórz repozytorium poleceniem wastech-learn init albo wskaż je przez --content",
  "cli.doctor.config-invalid":
    "learn.config.json: nieprawidłowa wartość {field}, popraw ją",
  "cli.doctor.config-json":
    "learn.config.json nie jest poprawnym JSON-em, popraw składnię",
  "cli.doctor.device":
    "Urządzenie {device}: powtórki trafiają do reviews/{device}/",
  "cli.doctor.device-hostname":
    "Brak learn.local.json: powtórki trafiają do reviews/{device}/ według nazwy hosta; nazwij ten komputer poleceniem wastech-learn init --device <nazwa>",
  "cli.doctor.device-invalid":
    "learn.local.json: nieprawidłowa wartość {field}, użyj małych liter łacińskich, cyfr i myślników",
  "cli.doctor.device-json":
    "learn.local.json nie jest poprawnym JSON-em, popraw składnię",
  "cli.doctor.deps": "Zależności treści zainstalowane",
  "cli.doctor.deps-missing":
    "W repozytorium treści brakuje {bins}: uruchom tam npm install",
  "cli.doctor.deps-other-framework":
    "Repozytorium treści używa frameworka z {dir}, nie tego: sprawdź ścieżki file: w package.json i uruchom npm install",
  "cli.doctor.skills": "Skills zgadzają się z frameworkiem: {skills}",
  "cli.doctor.skill-missing": "Brak {dir}/{skill}: uruchom wastech-learn init",
  "cli.doctor.skill-differs":
    "{dir}/{skill} różni się od frameworka: wastech-learn init go zaktualizuje, jeśli nie był zmieniany ręcznie",
  "cli.doctor.template":
    "Pliki repozytorium zgadzają się z szablonem frameworka",
  "cli.doctor.template-missing": "Brak {file}: wastech-learn init go doda",
  "cli.doctor.template-differs":
    "{file} różni się od szablonu {template}: porównaj je, jeśli zmiana nie była celowa",
  "cli.doctor.git": "git: gałąź {branch} śledzi {upstream}",
  "cli.doctor.git-missing":
    "git nie jest zainstalowany: jest potrzebny do synchronizacji między komputerami",
  "cli.doctor.git-none":
    "To nie jest repozytorium git: uruchom git init -b main",
  "cli.doctor.git-identity":
    "W git nie ustawiono user.name lub user.email: bez nich „Synchronizuj” nie zrobi commita, ustaw je przez git config --global",
  "cli.doctor.git-upstream":
    "Gałąź {branch} nie ma gałęzi zdalnej: „Synchronizuj” jej potrzebuje, wypchnij gałąź raz poleceniem git push -u origin {branch}",
  "cli.doctor.passed": "Wszystko gotowe",
  "cli.doctor.summary": "{errors}, {warnings}",

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
    "  init       Utwórz repozytorium treści z szablonu albo uzupełnij je i zaktualizuj skills",
    "  doctor     Sprawdź instalację na tym komputerze: Node, build, repozytorium treści, skills, git",
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
    "init:     --device <nazwa>, --timezone <strefa IANA>, --ui-language <ru|en|pl> (domyślnie: nazwa hosta, strefa i język systemu)",
  ].join("\n"),
};
