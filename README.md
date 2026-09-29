<div align="center">

<img src="docs/readme/banner.svg" alt="CyberCardex, gestionnaire de collection pour Cyberpunk TCG" width="100%">

<img src="https://img.shields.io/badge/ANDROID-t%C3%A9l%C3%A9phone%20%2B%20tablette-fcee0a?style=for-the-badge&labelColor=06070a&logo=android&logoColor=fcee0a" alt="Android">
<img src="https://img.shields.io/github/v/release/PommeSauce0/CyberCardex?style=for-the-badge&label=VERSION&labelColor=06070a&color=00f0ff" alt="Version">
<img src="https://img.shields.io/badge/HORS%20LIGNE-100%25-00ff9c?style=for-the-badge&labelColor=06070a" alt="Offline">
<img src="https://img.shields.io/badge/LICENCE-MIT-ff003c?style=for-the-badge&labelColor=06070a" alt="MIT">

**Français** · [English](README.en.md)

</div>

Gestionnaire de collection pour le jeu de cartes **Cyberpunk TCG**, dans l'esprit de PokéCardex :
catalogue complet, suivi de collection, wishlist, scanner de cartes et decks. Application Android
qui fonctionne hors connexion.

```console
$ jack-in cybercardex
> catalogue ................ 709 impressions        [ OK ]
> scanner .................. reconnaissance locale  [ OK ]
> langues .................. FR / EN                [ OK ]
> serveur de cartes ........ aucun, tout est inclus [ OK ]
> connexion à Night City établie_
```

**L'app existe en français et en anglais.** Elle suit la langue du téléphone, et se change à tout
moment dans Réglages → Affichage. Les cartes s'affichent au choix en version française ou anglaise.

> **`// UNOFFICIAL FAN PROJECT`**
>
> Not affiliated with WeirdCo or CD PROJEKT.
>
> Projet de fan gratuit et non officiel, sans lien avec WeirdCo ni CD PROJEKT. Cyberpunk TCG est
> développé par WeirdCo en collaboration avec CD PROJEKT RED. Cyberpunk, Cyberpunk 2077 et les
> visuels des cartes appartiennent à CD PROJEKT S.A. et à leurs ayants droit.

<img src="docs/readme/divider.svg" width="100%" alt="">

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

<sub>Captures de l'interface en français ; l'app passe en anglais dans les Réglages (par défaut,
elle suit la langue du téléphone).</sub>

<img src="docs/readme/divider.svg" width="100%" alt="">

## Fonctionnalités

- **Catalogue** par séries (Beta / Retail, Promo, Decks) avec la progression de chaque série.
- **Page série** en grille (taille des cartes au choix) ou en **classeur** (pages de 9 ou 12
  pochettes qui se tournent), recherche et filtres Possédées / Manquantes / Wishlist.
- **Ajout rapide** : un appui sur une carte = +1 exemplaire, idéal à l'ouverture d'un booster.
- **Scanner** (app Android) : prends une carte en photo, elle est reconnue sur le téléphone, sans
  connexion.
- **Fiche carte** : visionneuse 3D (inclinaison, reflet foil, zoom), texte de la carte, toutes ses
  versions, lien Cardmarket (prix indicatif du jour en option).
- **Collection** : état, gradation, prix d'achat et notes par exemplaire ; statistiques,
  progression par série et par rareté, courbe de l'évolution de la collection.
- **Recherche** dans tout le catalogue (nom, numéro, artiste, affiliation, texte) avec
  suggestions pendant la saisie et filtres.
- **Decks** : création guidée par les 3 Légendes, règles de construction vérifiées (RAM, nombre
  de cartes, exemplaires), tri, statistiques, cartes possédées / manquantes, import et export de
  listes.
- **Wishlist** des cartes à trouver.
- **Sauvegarde** complète (collection, wishlist, decks et réglages) enregistrée où tu veux, et
  export CSV pour Excel.
- **Réglages** : langue de l'app et des cartes, taille de l'interface (compacte ou normale), mode
  de création des decks, Cardmarket (lien seul, lien + prix, ou désactivé).
- **Mises à jour dans l'app** : une banderole prévient quand une nouvelle version sort, et elle
  s'installe par-dessus en gardant ta collection.
- Interface en **français** ou en **anglais**, cartes en EN ou FR.

<img src="docs/readme/divider.svg" width="100%" alt="">

## Nouveautés de la version 1.1.0

- **Decks entièrement revus** : une page « Mes decks », une page par deck, les règles de
  construction vérifiées en direct, tri, statistiques et coût pour compléter un deck.
- **Création guidée** : tu choisis d'abord tes 3 Légendes (et leur version), puis tu complètes le
  deck. Ou création libre, au choix.
- **Prix Cardmarket du jour** (option « Lien + prix ») : mis à jour chaque jour.
- **Réglages réorganisés**, avec la taille de l'interface au choix.
- **Sauvegarde complète** : collection, wishlist, decks et réglages, enregistrée où tu veux sur le
  téléphone (plus besoin de passer par le partage).
- **Import plus sûr** : bilan de la sauvegarde, puis confirmation en deux temps avant de fusionner
  ou de remplacer tes données.
- **Vider sa Cardex** : double confirmation, avec un petit effet cyberpsychose.
- **Bouton retour** qui ramène toujours à la page d'où tu viens, et flèches de la fiche carte qui
  suivent la liste d'origine (deck, wishlist, cartes manquantes…).
- **Liens officiels** de Cyberpunk TCG dans « À propos » (site, règles, réseaux).
- **Scanner** : une photo importée se recadre avant l'analyse (glisser, pincer, tourner).
- **Tablettes** : l'app tourne en portrait comme en paysage (les téléphones restent en portrait).
- Catalogue complété (709 impressions), recherche utilisable au clavier, nombreuses corrections
  d'animations et de petits bugs.

Toutes les versions et leurs notes : [Releases](https://github.com/PommeSauce0/CyberCardex/releases).

<img src="docs/readme/divider.svg" width="100%" alt="">

## Installer l'app

CyberCardex existe uniquement sur **Android**, téléphone ou tablette (pas sur iPhone), et n'est pas
sur le Play Store :

1. Sur ton téléphone, ouvre la page de la
   [dernière version](https://github.com/PommeSauce0/CyberCardex/releases/latest) et télécharge le
   fichier `CyberCardex-….apk`.
2. Ouvre le fichier téléchargé. Android demande d'autoriser l'installation d'applications
   inconnues : accepte, puis installe.
3. C'est prêt. Les mises à jour se feront depuis l'app (bandeau « Mise à jour disponible »), et ta
   collection est conservée.

Pense à faire une sauvegarde de temps en temps (Réglages → Ma collection → Sauvegarder).

<img src="docs/readme/divider.svg" width="100%" alt="">

## Pourquoi l'app pèse environ 80 Mo ?

Parce que **tout Night City tient dans l'APK** : les 709 impressions en haute définition, leurs
miniatures, le catalogue complet et les empreintes du scanner. Aucun serveur d'images, aucun
catalogue téléchargé en douce.

| Ce que ça t'apporte         |                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **100 % hors ligne**        | Classeur, recherche, decks et scanner marchent en mode avion.                                                                                           |
| **Aucun serveur de cartes** | Images et catalogue sont dans l'app ; seul GitHub est contacté, pour les mises à jour et les prix en option (voir [Confidentialité](#confidentialité)). |
| **Rien ne disparaît**       | Tes cartes s'affichent même si un site tombe ou change.                                                                                                 |

**Et les nouvelles séries ?** Elles arrivent avec une nouvelle version de l'app : une banderole
« Mise à jour disponible » apparaît, deux appuis, c'est installé, et ta collection est gardée.

<img src="docs/readme/divider.svg" width="100%" alt="">

## Confidentialité

CyberCardex ne collecte aucune donnée : pas de compte, pas de publicité, pas de statistiques. La
collection reste sur l'appareil, sauf quand on l'exporte soi-même.

L'app ne contacte que GitHub, et seulement pour :

- savoir, au lancement, si une nouvelle version existe ;
- télécharger les prix du jour, si Cardmarket est réglé sur « Lien + prix » (Réglages → Fonctions
  expérimentales).

GitHub voit alors l'adresse IP, comme pour n'importe quel site. Les liens Cardmarket,
cyberpunktcg.com et les liens officiels de Cyberpunk TCG ouvrent ces sites dans le navigateur.

<img src="docs/readme/divider.svg" width="100%" alt="">

## Licence

Code sous licence [MIT](LICENSE), fourni tel quel, sans garantie. Les données et visuels des
cartes ne sont pas couverts par cette licence : ils restent la propriété de leurs ayants droit.
Les prix Cardmarket sont donnés à titre indicatif.

<img src="docs/readme/divider.svg" width="100%" alt="">

<div align="center"><sub><code>// SEE YOU IN NIGHT CITY, CHOOM_</code></sub></div>
