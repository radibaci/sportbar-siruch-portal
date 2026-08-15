# Sportbar Siruch - mobilni klubovy portal

Mobilni PWA portal pro tenisove kluby se sdilenym viceklubovym API. Frontend je staticky a API bezi na Cloudflare Workers/D1/R2.

## Bezpecne jadro v2

Produkcni kandidat pouziva viceklubove API v `worker-v2`, normalizovana data,
serverove relace, klubova clenstvi a moduly. Parametr `platformApi` urcuje cilove API
pro lokalni test, staging nebo produkci.

```powershell
npm run v2:typegen
npm run v2:typecheck
npm run v2:test
npm run v2:seed
npm run v2:dev
```

V druhem terminalu spust staticky web na portu 4173 a otevri:

```text
http://localhost:4173/?platformApi=http://localhost:8788&v=123
```

V tomto rezimu prihlaseni, klubova role, kredit a bonusova pravidla pochazeji z lokalni D1.
Hrac `radim@siruch.cz` ma heslo `siruch-radim`, spravce `spravce@siruch.cz` ma heslo
`siruch-admin` a provozni spravce `provoz@siruch.cz` ma heslo `siruch-provoz`. `npm run v2:seed` lokalni v2 databazi vzdy znovu vycisti a naplni testovacimi ucty.

Architektura a pravidla oddeleni klubu jsou popsana v `docs/ARCHITECTURE_V2.md`.
Stav pripravenosti je v `docs/PRODUCT_READINESS.md`; provisioning, aktualizace a zalohy jsou v `docs/OPERATIONS.md`.

## Spusteni

Otevri `index.html` v prohlizeci, nebo spust lokalni staticky server:

```powershell
npx http-server tennis-club-portal -p 4173
```

Pro testovani se spolecnou malou DB/API pouzij vestaveny lokalni server:

```powershell
$env:PORT="4213"
node dev-server.mjs
```

Pak otevri `http://localhost:4213/`. Server uklada sdileny stav do `data/portal-db.json`; jde pouze o legacy offline rezim.
Sdilene testovani a produkce pouzivaji v2 API a D1.

Rychla kontrola API:

```powershell
node -e "fetch('http://localhost:4213/api/health').then(r=>r.json()).then(console.log)"
```

## Funkcni rozsah

- mobilni domovskou obrazovku ve smeru Klubovy hub + Hracska komunita
- rezervace kurtu v pulhodinovych slotech
- cely den kurtu bez horizontalniho scrollu
- nastin nastavitelne oteviraci doby klubu
- povrchy kurtu: antuka, umely povrch, trava
- fotku kurtu v karte kurtu
- jednorazove zruseni trvale rezervace
- tydenni souhrn vlastnich rezervaci vcetne stale sestavy
- mesicni kalendar rezervaci s rychlym vytvorenim rezervace
- hledani spoluhracu
- rozdeleni hracu na kamarady a sbaleny seznam hracu klubu
- klubove akce
- pridani akce do kalendare portalu po prihlaseni
- detail hrace, detail akce a detail turnaje
- klubovy kredit s historii rucnich pripisu a bonusu
- navrh hostovske rezervace bez plne registrace
- oznameni k rezervacim a potvrzeni ucasti den predem
- omluva z rezervace, hledani nahradnika a hlasovani sestavy
- pozvani hrace na hru vcetne protinavrhu terminu
- lepsi mobilni sekce Rezervace s velkymi sloty po kurtech
- turnajovy detail s tabulkou prihlasenych
- sekce Moje navrhy na hru se stavem pozvanych hracu
- barevne stavy ucasti hracu v rezervaci
- motivacni hlasky k rezervacim podle historie
- historie rezervaci se skore, pary a fotkami
- archiv turnaju s vysledky, fotkami a YouTube odkazy
- detail slotu, kde rezervace hleda spoluhrace
- prihlaseni pres telefon/e-mail jako modal
- lokalni testovaci prepinac roli; pri pripojeni k v2 API vidi kazdy jen svou prihlasenou roli
- kredit hrace v horni liste a profilu
- kreditni system s rucnim pripisem spravcem a strzenim po odehrani hry
- typy hracu: klubovy hrac, kreditovy hrac a host s pevnou cenou
- individualni sleva hrace pres procenta a poznamku spravce
- spravcovsky prehled provozu, rezervaci, plateb a ukolu
- sprava kurtu vcetne fotky, povrchu, barvy, ceny a budouciho zamku
- casove sazby kurtu podle dne a useku dne
- editace cenovych useku kurtu primo v modalu kurtu
- vytizenost kazdeho kurtu pro spravce
- last minute navrhy hracu pro volne sloty
- ochrana last minute nabidek proti cekani na slevu
- bonus za vetsi dobiti kreditu evidovany oddelene od zaplacene castky
- finalni cena hrace na kurt podle sazby kurtu a individualni slevy
- vernostni sleva podle odehranych hodin
- vazeny hrac jako zaklad pro nepreveditelne produktove vyhody
- podnikatelske statistiky kurtu: potencial, realny vykon, trend, oblibenost
- partnersky prodej pri klubovych akcich pro klub, platformu a obchod
- anketu sortimentu s vazenymi hlasy aktivnich a utracivych hracu
- demo/prodejni dodavky na jednu klubovou adresu pro rakety, boty, obleceni a vyplety
- klubovy obchod mimo akce: mice, vyplet, test rakety, boty k vyzkouseni
- specialni obsazenost kurtu: turnaj, testovani raket, trening a servis
- specialni obsazenost zadavanou primo v administraci rezervaci i v detailu kurtu
- specialni obsazenost primo ze slotu v kontrole dne podle kurtu
- objednavky hracu pro spravce vcetne kluboveho balickovani
- prodejni pripominky pred/po rezervaci a navaznost na vyplet rakety
- 10+ testovacich hracu pro realnejsi provereni administrace
- zivy slider slevy v karte hrace a ukladani zakladnich udaju kurtu v prototypu
- lokalni perzistenci pres localStorage pro rychle testovani bez databaze
- upozorneni hracum podle obvykleho dne a casu hrani
- sprava hracu, hostu, oznameni a vyjimek pro potvrzovani ucasti
- sprava akci, turnaju, startovneho, prihlasenych hracu a vysledku
- zaklad PWA: manifest a service worker

## Nastaveni klubu

Konfigurace klubu se spravuje z administrace a uklada do kluboveho tenantu:

- nazev klubu, logo, barvy
- seznam kurtu
- fotky kurtu
- povrchy, styly a barvy kurtu
- provozni doba
- pravidla rezervaci
- cenik
- platebni pravidla
- kontakty a notifikace
