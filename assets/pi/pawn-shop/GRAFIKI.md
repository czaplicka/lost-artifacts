# Honest Ziggy's Pawn – lista grafik

Wszystko w formacie **.webp** w tym folderze (`assets/pi/pawn-shop/`).
Styl: taki jak `assets/pi/city/spyshop.webp`, czyli ciepły pixel art (16-bit), noir, przytulnie i trochę brudno.
Po wrzuceniu pliku odkomentuj odpowiedni wpis w `config/lombardConfig.js`. Dopóki pliku nie ma, gra rysuje grafikę zastępczą (canvas + emoji).

## A. Scena (priorytet)

| # | Plik | Rozmiar | Tło | Gdzie trafia |
|---|------|---------|-----|--------------|
| 1 | `pawnshop_bg.webp` | 1920×1080 | pełne | tło całej sceny (bez Ziggy'ego i bez przedniej kraty) |
| 2 | `ziggy.webp` | 600×660 | przezroczyste | Ziggy za ladą, wyświetlany jako 300×330, środek dołu w punkcie (960, 780) |
| 3 | `cage_front.webp` | 1080×480 | przezroczyste | mosiężna krata i front lady przed Ziggym, wyświetlana jako 540×240 w (690, 560) |

**Hotspoty są ustawione na stałe pod układ poniżej**, więc tło powinno trzymać te pozycje (współrzędne środka w skali 1920×1080). Jeśli coś się przesunie, poprawię hotspoty w `LombardScene.buildHotspots()`.

- trzy złote kule (szyld lombardu), środek u góry: 960, 140
- neon OPEN po lewej: 540, 150
- tablica z kartką „NO REFUNDS” po prawej: 1585, 205 (ok. 290×150, kartka pusta, bo tekst dokłada gra)
- górna półka (y ≈ 275): trąbka 440, zegar ścienny 600, wypchana ryba na tabliczce 800, globus 1030, hełm rycerski 1220, stary aparat 1400
- dolna półka (y ≈ 465): maszyna do pisania 400, mały telewizor 585, boombox 800, lampa nad ladą 960, miś z kokardą 1200, mikrofalówka 1400
- saksofon: 1400, 630
- zegar stojący (dziadek) przy lewej krawędzi: 185, 550 (wysoki, ok. 160×520)
- wielki sejf po prawej: 1795, 685 (ok. 190×250)
- szklana gablota z biżuterią po lewej przy ladzie: 465, 735 (ok. 340×110)
- dzwonek na ladzie: 1420, 688
- środek: puste okienko kasy za kratą, x 690–1230, y 560–800 (tu stoi Ziggy)
- dół (y ≈ 1045): podłoga lub wycieraczka przy wyjściu

### Prompt 1: tło
```
16-bit pixel art interior of a cramped, cluttered 1980s city pawn shop at night, front view, game background 1920x1080, warm amber lamp light, dusty green wallpaper, dark wooden shelves. Top center: hanging pawnbroker sign of three golden balls. Upper left: red neon "OPEN" sign. Upper right: cork board with a blank paper notice. Two long wall shelves full of junk: trumpet, round wall clock, stuffed fish on a plaque, globe, knight helmet, vintage camera (top shelf); typewriter, small CRT TV, boombox, teddy bear with red ribbon, microwave (lower shelf). Saxophone on a stand right of center. Tall grandfather clock at the far left edge, huge iron safe at the far right edge. Long wooden counter across the lower third with a glass jewelry display case on the left and a brass service bell on the right. Center of the counter: an EMPTY cashier window with no person and no bars. Moody noir detective game, cozy and seedy, limited palette, crisp pixels, no text, no characters.
```

### Prompt 2: Ziggy
```
16-bit pixel art character sprite, transparent background, waist-up view of "Honest Ziggy", a sly middle-aged pawnbroker leaning on a counter edge (cut off flat at the bottom). Green celluloid visor eyeshade, round wire spectacles, a jeweler's loupe on a chain, big bushy moustache, one gold tooth in a knowing grin, rolled shirt sleeves with sleeve garters, brown knitted vest, hands resting forward. Warm amber key light from above, noir detective game style matching a cozy seedy pawn shop, crisp pixels, 600x660, no text.
```

### Prompt 3: krata i lada
```
16-bit pixel art foreground overlay, transparent background, 1080x480: an ornate brass teller cage with vertical bars and a small arched pass-through slot at the bottom, mounted on the front of a dark wooden pawn shop counter. The area between the bars is fully transparent (a character stands behind it). Worn brass, warm amber highlights, noir game style, crisp pixels, no text.
```

## B. Katalog zastawu: miniatury przedmiotów (opcjonalnie)

Pokazują się w ramce nad panelem rozmowy (tak jak w Spy Shopie). Bez nich gra pokazuje emoji z ekwipunku.

- Rozmiar: **512×512**, przezroczyste tło, przedmiot na środku, ok. 80% kadru.
- Plik: `items/<id>.webp`, wpis w `config/lombardConfig.js` → `itemImages`, np.
  `camera: { key: 'pi_pawn_item_camera', url: 'assets/pi/pawn-shop/items/camera.webp' }`

**Wspólny prompt** (w miejsce `{SUBJECT}` wstaw opis z tabeli):
```
16-bit pixel art game item icon, single object, {SUBJECT}, centered, three-quarter view, soft warm amber light, subtle dark outline, transparent background, 512x512, noir detective game style, crisp pixels, no text, no shadow box.
```

Przedmioty, które Ziggy skupuje (te mają cenę w sklepach):

| id | {SUBJECT} |
|----|-----------|
| `camera` | compact black 1980s film camera |
| `video_camera` | chunky shoulder VHS camcorder |
| `mobile_phone` | brick-style 1980s mobile phone with antenna |
| `cool_spy_gadget` | mysterious handheld spy device with blinking red and green lights |
| `evidence_lockpick` | open leather roll with five lockpicks |
| `pi_badge` | private investigator badge in a leather wallet |
| `rubber_duck` | yellow rubber duck |
| `detective_monthly` | pulp detective magazine with a magnifying glass on the cover |
| `inflatable_alibi` | deflated inflatable human-shaped doll, folded *(Ziggy go nie kupi, ale gracz go zobaczy)* |
| `postcard` | travel postcard with a city skyline |
| `souvenir_snow_globe` | snow globe with a tiny landmark inside |
| `souvenir_paris_tower` | tiny cheap metal lattice tower souvenir |
| `souvenir_london_guard_hat` | miniature fuzzy black guard bearskin hat |
| `souvenir_berlin_wall_chunk` | small painted concrete chunk with a certificate tag |
| `souvenir_nyc_foam_crown` | green foam spiked crown |
| `souvenir_warsaw_mermaid` | fridge magnet of a mermaid holding a sword and shield |
| `souvenir_delhi_spice_sachet` | small colorful cloth spice sachet tied with string |
| `souvenir_kotte_elephant` | small hand-carved wooden elephant with trunk raised |
| `souvenir_toronto_maple` | tiny maple-leaf-shaped bottle of maple syrup |
| `souvenir_nairobi_giraffe` | tall hand-carved wooden giraffe |
| `souvenir_islamabad_truck` | keychain of a brightly painted decorated truck |
| `souvenir_tokyo_lucky_cat` | white beckoning lucky cat figurine with raised paw |
| `souvenir_singapore_merlion` | tiny white merlion statue souvenir (lion head, fish body) |
| `coffee` | paper cup of steaming black coffee |
| `energy_drink` | neon green energy drink can |
| `sandwich` | thick deli sandwich cut in half |
| `mystery_pie` | suspicious golden meat pie with a steam vent |

Ziggy **nie** kupuje: wskazówek, dowodów, kluczy, dokumentów ze spraw, notesu detektywa ani dmuchanego alibi. Dla nich miniatury nie są potrzebne.
