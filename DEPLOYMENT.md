# Verejne testovaci nasazeni

## Adresy

- Portal: `https://tenissiruch.pages.dev`
- Produkcni Pages projekt: `tenissiruch`
- API Worker: `tenissiruch-api` (z portalu je dostupny jen pres `/api`)
- D1 databaze: `tenissiruch_portal`, region WEUR

Hracum se posila pouze adresa portalu. Interni Worker URL ani Cloudflare ucet nejsou soucasti verejneho odkazu.

## Bezna aktualizace

```powershell
cd C:\Users\martin.kadlcik\Documents\codex\tennis-club-portal
npm run test:ops
npm run v2:typecheck
npm run pages:deploy
```

`pages:deploy` sestavi pouze verejne soubory do `dist`, nahraje Pages Functions proxy a vytvori novy produkcni deployment. Zdrojove testy, migrace ani interni dokumentace se na web neposilaji.

## Aktualizace API

```powershell
npm run v2:typecheck
npm run v2:migrate:production
npm run v2:deploy:production
```

Po nasazeni spust smoke test s prihlasovacimi udaji urcenymi jen pro kontrolu releasu:

```powershell
$env:PLATFORM_API_URL = "https://tenissiruch.pages.dev"
$env:SMOKE_EMAIL = "radim@siruch.cz"
$env:SMOKE_PASSWORD = "siruch-radim"
npm run v2:smoke
```

## Testovaci ucty

| Role | E-mail | Heslo |
| --- | --- | --- |
| Radim | radim@siruch.cz | siruch-radim |
| Robin | robin@siruch.cz | siruch-robin |
| Bob | bob@siruch.cz | siruch-bob |
| Honza | honza@siruch.cz | siruch-honza |
| Marek | marek@siruch.cz | siruch-marek |
| Darek | darek@siruch.cz | siruch-darek |
| Filip | filip@siruch.cz | siruch-filip |
| Zbyna | zbyna@siruch.cz | siruch-zbyna |
| Handa | handa@siruch.cz | siruch-handa |
| Prema | prema@siruch.cz | siruch-prema |
| Viki | viki@siruch.cz | siruch-viki |
| Spravce | spravce@siruch.cz | siruch-admin |
| Spravce klubu | provoz@siruch.cz | siruch-provoz |
| Vypletac | vypletac@siruch.cz | siruch-vyplet |
| Obchod | obchod@siruch.cz | siruch-obchod |

## Zname omezeni testovaciho provozu

Cloudflare R2 zatim neni na uctu aktivovane. Nahravani novych uzivatelskych fotografii proto vrati kontrolovanou chybu `media_unavailable`; ostatni funkce pouzivaji D1 a bezi nezavisle. Po aktivaci R2 se prida bucket `tenissiruch-media` jako binding `MEDIA` do `wrangler.production.jsonc`.
