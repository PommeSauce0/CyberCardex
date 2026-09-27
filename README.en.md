# CyberCardex

[Français](README.md) · **English**

A collection manager for the **Cyberpunk TCG** card game: full catalogue, collection tracking,
wishlist, card scanner and decks. An Android app in English and French that works offline.

> **Unofficial fan project**, free and not affiliated with WeirdCo or CD PROJEKT. Cyberpunk TCG is
> developed by WeirdCo in collaboration with CD PROJEKT RED. Cyberpunk, Cyberpunk 2077 and the card
> artwork belong to CD PROJEKT S.A. and their respective owners.

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/01-catalogue.webp" width="200" alt="Catalogue"><br><sub>Catalogue</sub></td>
    <td align="center"><img src="docs/screenshots/02-serie.webp" width="200" alt="Set page"><br><sub>Set page</sub></td>
    <td align="center"><img src="docs/screenshots/03-classeur.webp" width="200" alt="Binder"><br><sub>Binder</sub></td>
    <td align="center"><img src="docs/screenshots/04-carte.webp" width="200" alt="Card page"><br><sub>Card page</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/05-scanner.webp" width="200" alt="Scanner"><br><sub>Scanner</sub></td>
    <td align="center"><img src="docs/screenshots/06-collection.webp" width="200" alt="Collection"><br><sub>Collection</sub></td>
    <td align="center"><img src="docs/screenshots/07-recherche.webp" width="200" alt="Search"><br><sub>Search</sub></td>
    <td align="center"><img src="docs/screenshots/08-decks.webp" width="200" alt="Decks"><br><sub>Decks</sub></td>
  </tr>
</table>

<sub>Screenshots show the French interface; the app switches to English in Settings (by default
it follows the phone's language).</sub>

## Features

- **Catalogue** by set (Beta / Retail, Promo, Decks) with the progress of each set.
- **Set page** as a grid (choose the card size) or as a **binder** (pages of 9 or 12 pockets that
  turn), with search and Owned / Missing / Wishlist filters.
- **Quick add**: one tap on a card = +1 copy, perfect when opening a booster.
- **Scanner**: take a photo of a card and it is recognised on the phone, with no connection.
- **Card page**: 3D viewer (tilt, foil shine, zoom), card text, all its versions, Cardmarket link
  and price guide.
- **Collection**: condition, grading, purchase price and notes for each copy; statistics, progress
  by set and by rarity, a chart of how your collection grows.
- **Search** across the whole catalogue (name, number, artist, affiliation, text) with suggestions
  as you type and filters.
- **Wishlist** and **decks** (add cards by name or paste a list, see owned / missing cards, export
  the list as text to copy or share).
- **Backup**: JSON export / import, CSV export for Excel.
- Interface in **English** or **French**, cards in EN or FR.

## Install the app

CyberCardex is available for **Android only** (not iPhone) and is not on the Play Store:

1. On your phone, open the [latest release](https://github.com/PommeSauce0/CyberCardex/releases/latest)
   page and download the `CyberCardex-….apk` file.
2. Open the downloaded file. Android asks you to allow installing unknown apps: accept, then
   install.
3. You're done. Updates are installed from the app ("New version … available" banner) and your
   collection is kept.

Remember to export a backup from time to time (Settings → Backup).

## Privacy

CyberCardex collects no data: no account, no ads, no analytics. Your collection stays on your device unless you export it yourself; if Android backup is turned on, it is also included in your Google account backup, like other apps. When it starts, the Android app asks GitHub whether a new
version exists: GitHub then sees your IP address, as with any website. The Cardmarket and
cyberpunktcg.com buttons open those sites in your browser.

## License

Code under the [MIT](LICENSE) license, provided as is, without warranty. Card data and artwork are
not covered by this license: they remain the property of their owners. Cardmarket prices are for
reference only.
