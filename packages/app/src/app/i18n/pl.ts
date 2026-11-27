import type { MessageKey } from "./en";
import type { Message } from "./message";

export const pl: Readonly<Record<MessageKey, Message>> = {
  "app.name": "wastech-learn",
  "nav.main": "Główna nawigacja",
  "nav.home": "Start",
  "nav.review": "Powtórka",
  "nav.browser": "Karty",
  "nav.stats": "Statystyki",
  "nav.settings": "Ustawienia",
  "title.home": "Start",
  "title.review": "Powtórka",
  "title.session-end": "Podsumowanie sesji",
  "title.topic": "Temat",
  "title.browser": "Karty",
  "title.stats": "Statystyki",
  "title.settings": "Ustawienia",
  "shell.search": "Szukaj w tematach i kartach",
  "shell.search-short": "Szukaj",
  "shell.language": "Język interfejsu",
  "shell.theme-dark": "Ciemny motyw",
  "shell.theme-light": "Jasny motyw",
  "shell.refresh": "Odśwież treści",
  "shell.refreshed": "Treści odświeżone",
  "shell.saved": "{device} · wszystko zapisane",
  "shell.pending": "{device} · {events} czeka na serwer",
  "shell.offline":
    "Brak połączenia z lokalnym serwerem: widać to, co już wczytano. Uruchom ponownie wastech-learn serve",
  "shell.loading": "Wczytuję treści…",
  "shell.unavailable":
    "Treści nie dają się jeszcze zbudować: popraw błędy poniżej i zapisz plik",
  "toast.offline": "Oceny zapiszą się, gdy serwer wróci",
  "toast.refused": "Serwer nie przyjął: {events}; nie trafiły do dziennika",
  "banner.build-failed":
    "Ostatnia zmiana się nie zbudowała, więc widać ostatnią zbudowaną wersję",
  "banner.build-error":
    "Bundle się nie przebudował ({code}); widać ostatnią zbudowaną wersję",
  "banner.open": "Otwórz w VS Code",
  "count.cards": {
    one: "{count} karta",
    few: "{count} karty",
    many: "{count} kart",
    other: "{count} karty",
  },
  "count.minutes": {
    one: "{count} minuta",
    few: "{count} minuty",
    many: "{count} minut",
    other: "{count} minuty",
  },
  "count.events": {
    one: "{count} ocena",
    few: "{count} oceny",
    many: "{count} ocen",
    other: "{count} oceny",
  },
  "count.errors": {
    one: "{count} błąd",
    few: "{count} błędy",
    many: "{count} błędów",
    other: "{count} błędu",
  },
};
