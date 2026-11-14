# Tester spraw — pełne pliki

## Instalacja

1. Zamknij uruchomioną grę. Zrób kopię istniejącego `admin/panel.js`.
2. Skopiuj katalogi `admin` i `tests` z paczki do katalogu głównego gry.
3. Zastąp istniejący `admin/panel.js` plikiem z paczki. To kompletny plik, nie patch.
4. Otwórz admina przez dotychczasowy serwer HTTP/HTTPS i odśwież panel.
5. Wybierz zakładkę „Tester spraw”. Nie otwieraj plików przez file://.

Nie podmieniaj main.js, game.html, GameData.js ani gameSetup.js.
Nie jest potrzebna migracja bazy ani nowa funkcja Supabase.

## Obsługa

Wybierz numer misji, konkretną sprawę (artefakt), złodzieja, miasto i punkt startowy.
Wybór miasta przestępstwa ogranicza listę spraw do zgodnych z nim misji.
Numer misji zaczyna się od 1; wewnętrzny caseIndex od 0.
Wybór numeru 12 nie rozgrywa jedenastu wcześniejszych misji: adapter uruchamia generator nowej gry i jedną konfigurację docelowej misji.

Etap fabuły ustawia etapy i odblokowania MainStoryManager. Nie wypełnia automatycznie całej historii szczegółowych zagadek, dowodów, prezentów i relacji.
Dodatkowe flagi przyjmują JSON z wartościami true/false.
Tryby oznaczone „podgląd” korzystają z istniejącego preview sceny — pozwalają obejrzeć rozmowę/minigrę, lecz nie sprawdzają jej dostępności w prawdziwej kampanii.
Podglądy: AlexRecoveryInquiryScene, HollyChapterOneFinaleScene, GordonSearchScene, MargeHRScene, OfficeDustScene, RadioSpliceScene.

Starty zwykłej sprawy: biuro, archiwum, magazyn, crime city, hidden objects, CSI, lista podejrzanych, mieszkanie, swobodny podgląd miasta.
W tej wersji nie ma bezpośredniego startu alibi, pościgu ani rozprawy. Wymagają osobnych, spójnych danych wejściowych; adapter nie oznacza ich automatycznie jako zaliczone.
Restart uruchamia czystą sesję z poprzednimi ustawieniami; elementy pozostawione jako losowe są losowane ponownie.
Zakończenie testu niszczy iframe i całą jego pamięć. Nie ma trwałego slotu testowego ani przywracania testu po odświeżeniu.
Zmiana zakładki admina wstrzymuje pętlę Phasera; część natywnych operacji asynchronicznych może nadal się kończyć.

## Izolacja

Gra działa w osobnym iframe, z osobnymi instancjami modułów i gameState.
Przed importem kodu gry uruchamiacz zastępuje localStorage i sessionStorage magazynami w RAM.
Nie odczytuje ani nie kopiuje normalnych zapisów lub tokenów logowania do sesji testowej.
Wyłącza BroadcastChannel i propagację zdarzeń storage w runnerze, żeby nie dziedziczyć sesji Supabase z panelu.
Uruchamia grę jako gość. Blokuje żądania fetch/XHR inne niż GET/HEAD, endpointy auth/functions/RPC, sendBeacon oraz WebSocket.
Blokuje Worker/SharedWorker i dostęp do IndexedDB w runnerze. Normalny panel pozostaje zalogowany.
Jeśli instalacja izolacji się nie powiedzie, kod gry nie zostaje zaimportowany przez runner.
`startTestGame` dodatkowo wymaga aktywnej izolacji.
W razie próby wysłania wyników lub zapisu w chmurze operacja jest odrzucana i trafia do dziennika — nie udajemy udanego zapisu.

To izolacja narzędzia deweloperskiego dla kodu tej gry, nie granica bezpieczeństwa dla złośliwego kodu z tej samej domeny. Nie uruchamiaj w runnerze obcych skryptów. Nowe mechanizmy zapisu w grze wymagają ponownego sprawdzenia izolacji.

## Weryfikacja

Przeprowadzono kontrolę składni JavaScript i osiem grup testów Node (RAM storage, reguły sieci, walidacja, brak dostępu do oryginalnego storage, blokowanie wysyłki, adapter numeru misji, dane hidden objects, niezgodne wybory).
Testy adaptera stosują atrapy zależności gry. Nie zastępują testu w przeglądarce z rzeczywistymi assetami.
Pełnej gry w przeglądarce nie uruchomiono w środowisku przygotowania paczki.

Uruchom testy z katalogu głównego gry:

```sh
node tests/admin-case-tester.test.mjs
```

Przed wdrożeniem produkcyjnym sprawdź na kopii środowiska:
- istniejący autosave i sloty lokalne są identyczne przed testem i po nim;
- sloty w chmurze i wyniki na koncie nie zmieniają się;
- po zakończeniu testu zwykła gra wczytuje poprzedni stan;
- zmiana zakładki admina wstrzymuje test;
- każdy używany start wczytuje właściwe assety;
- wylogowanie w adminie usuwa aktywny tester.

## Pliki

- admin/panel.js — pełny panel z dodaną sekcją i sygnałem wstrzymania testu.
- admin/case-tester/index.html — formularz testera.
- admin/case-tester/tester.css — wygląd panelu.
- admin/case-tester/editor.js — katalog danych, kontrola dostępu, sesje iframe.
- admin/case-tester/presets.js — dostępne starty i walidacja.
- admin/case-tester/runner.html — osobna strona gry testowej.
- admin/case-tester/runner.js — instalacja izolacji i uruchomienie gry.
- admin/case-tester/isolation.js — magazyny RAM i blokada wysyłania danych.
- admin/case-tester/runtime.js — adapter istniejącego generatora i scen.
- tests/admin-case-tester.test.mjs — testy izolacji i adaptera.

Punktem wyjścia jest panel.js o SHA 159ffa4bea241b257576124a48ef4b5899561bfd oraz API generatora z odczytanej wersji repozytorium. Jeśli panel zmienił się od tego czasu, nie nadpisuj jego nowych funkcji bez porównania plików.
