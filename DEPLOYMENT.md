# Testovaci nasazeni zdarma

## GitHub Pages

Portal je staticky web, takze muze bezet zdarma na GitHub Pages.

1. Prihlas se do GitHub CLI:

```powershell
"C:\Program Files\GitHub CLI\gh.exe" auth login
```

2. Vytvor verejny repozitar a nahraj kod:

```powershell
cd C:\Users\martin.kadlcik\Documents\codex\tennis-club-portal
"C:\Program Files\GitHub CLI\gh.exe" repo create sportbar-siruch-portal --public --source . --remote origin --push
```

3. Zapni Pages:

```powershell
"C:\Program Files\GitHub CLI\gh.exe" api repos/:owner/sportbar-siruch-portal/pages -X POST -f source.branch=main -f source.path=/
```

Adresa bude ve tvaru:

```text
https://TVUJ_UCET.github.io/sportbar-siruch-portal/
```

GitHub Pages muze po prvnim zapnuti potrebovat nekolik minut.

## Testovaci ucty

| Role | E-mail | Heslo |
| --- | --- | --- |
| Robin | robin@siruch.cz | siruch-robin |
| Bob | bob@siruch.cz | siruch-bob |
| Honza | honza@siruch.cz | siruch-honza |
| Marek | marek@siruch.cz | siruch-marek |
| Darek | darek@siruch.cz | siruch-darek |
| Filip | filip@siruch.cz | siruch-filip |
| Radim | radim@siruch.cz | siruch-radim |
| Zbyna | zbyna@siruch.cz | siruch-zbyna |
| Handa | handa@siruch.cz | siruch-handa |
| Prema | prema@siruch.cz | siruch-prema |
| Viki | viki@siruch.cz | siruch-viki |
| Spravce | spravce@siruch.cz | siruch-admin |
| Vypletac | vypletac@siruch.cz | siruch-vyplet |
| Obchodnik | obchod@siruch.cz | siruch-obchod |

V teto staticke testovaci verzi se heslo neposila skutecnym e-mailem. Portal po kliknuti na "Poslat heslo" ukaze simulovany e-mail primo v prihlasovacim okne. Ostre posilani e-mailu bude potreba pres API/backend.

## Telefon a odznak zpráv

1. Otevri HTTPS adresu portalu na telefonu.
2. Android Chrome: menu se tremi teckami -> Pridat na plochu / Instalovat aplikaci.
3. iPhone Safari: Sdilet -> Pridat na plochu.
4. V aplikaci otevri Profil -> Zapnout notifikace a odznak.
5. Pouzij Test cisla na ikone.

Odznak s cislem funguje jen v podporovanych prohlizecich a hlavne pro nainstalovanou PWA aplikaci.
