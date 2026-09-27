# CyberCardex

**Français** · [English](README.en.md)

Gestionnaire de collection pour le jeu de cartes **Cyberpunk TCG**, dans l'esprit de PokéCardex :
catalogue complet, suivi de collection, wishlist, scanner de cartes et decks.
Application Android en français et en anglais, qui fonctionne hors connexion.

> **Unofficial fan project**, not affiliated with WeirdCo or CD PROJEKT.
>
> Projet de fan gratuit et non officiel, sans lien avec WeirdCo ni CD PROJEKT. Cyberpunk TCG est
> développé par WeirdCo en collaboration avec CD PROJEKT RED. Cyberpunk, Cyberpunk 2077 et les
> visuels des cartes appartiennent à CD PROJEKT S.A. et à leurs ayants droit.

## Captures d'écran

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/01-catalogue.webp" width="200" alt="Catalogue"><br><sub>Catalogue</sub></td>
    <td align="center"><img src="docs/screenshots/02-serie.webp" width="200" alt="Page série"><br><sub>Page série</sub></td>
    <td align="center"><img src="docs/screenshots/03-classeur.webp" width="200" alt="Classeur"><br><sub>Classeur</sub></td>
    <td align="center"><img src="docs/screenshots/04-carte.webp" width="200" alt="Fiche carte"><br><sub>Fiche carte</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/05-scanner.webp" width="200" alt="Scanner"><br><sub>Scanner</sub></td>
    <td align="center"><img src="docs/screenshots/06-collection.webp" width="200" alt="Collection"><br><sub>Collection</sub></td>
    <td align="center"><img src="docs/screenshots/07-recherche.webp" width="200" alt="Recherche"><br><sub>Recherche</sub></td>
    <td align="center"><img src="docs/screenshots/08-decks.webp" width="200" alt="Decks"><br><sub>Decks</sub></td>
  </tr>
</table>

## Fonctionnalités

- **Catalogue** par séries (Beta / Retail, Promo, Decks) avec la progression de chaque série.
- **Page série** en grille (taille des cartes au choix) ou en **classeur** (pages de 9 ou 12
  pochettes qui se tournent), recherche et filtres Possédées / Manquantes / Wishlist.
- **Ajout rapide** : un appui sur une carte = +1 exemplaire, idéal à l'ouverture d'un booster.
- **Scanner** (app Android) : prends une carte en photo, elle est reconnue sur le téléphone, sans
  connexion.
- **Fiche carte** : visionneuse 3D (inclinaison, reflet foil, zoom), texte de la carte, toutes ses
  versions, lien et prix indicatif Cardmarket.
- **Collection** : état, gradation, prix d'achat et notes par exemplaire ; statistiques,
  progression par série et par rareté, courbe de l'évolution de la collection.
- **Recherche** dans tout le catalogue (nom, numéro, artiste, affiliation, texte) avec
  suggestions pendant la saisie et filtres.
- **Wishlist** et **decks** (ajout par le nom ou liste collée, cartes possédées / manquantes,
  export de la liste en texte à copier ou partager).
- **Sauvegarde** : export / import JSON, export CSV pour Excel.
- Interface en **français** ou en **anglais**, cartes en EN ou FR.

## Installer l'app

CyberCardex existe uniquement sur **Android** (pas sur iPhone) et n'est pas sur le Play Store :

1. Sur ton téléphone, ouvre la page de la
   [dernière version](https://github.com/PommeSauce0/CyberCardex/releases/latest) et télécharge le
   fichier `CyberCardex-….apk`.
2. Ouvre le fichier téléchargé. Android demande d'autoriser l'installation d'applications
   inconnues : accepte, puis installe.
3. C'est prêt. Les mises à jour se feront depuis l'app (bandeau « Nouvelle version … disponible »),
   et ta collection est conservée.

Pense à exporter une sauvegarde de temps en temps (Réglages → Sauvegarde).

## Confidentialité

CyberCardex ne collecte aucune donnée : pas de compte, pas de publicité, pas de statistiques. La
collection reste sur l'appareil, sauf quand on l'exporte soi-même ; si la sauvegarde Android est activée sur le téléphone, elle est aussi incluse dans la sauvegarde de ton compte Google, comme les autres applis. Au lancement, l'app Android
interroge GitHub pour savoir si une nouvelle version existe : GitHub voit alors l'adresse IP, comme
pour n'importe quel site. Les boutons Cardmarket et cyberpunktcg.com ouvrent ces sites dans le
navigateur.

## Licence

Code sous licence [MIT](LICENSE), fourni tel quel, sans garantie. Les données et visuels des
cartes ne sont pas couverts par cette licence : ils restent la propriété de leurs ayants droit.
Les prix Cardmarket sont donnés à titre indicatif.
