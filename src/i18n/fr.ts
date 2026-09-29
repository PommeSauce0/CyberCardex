/*
 * Textes de l'interface en français (langue de référence : l'anglais doit avoir les
 * mêmes clés). Les fonctions servent aux phrases avec des nombres ou des noms.
 */

/** « a, b et c » */
const list = (parts: string[]) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}` : (parts[0] ?? '');

/** Pluriel français : à partir de 2 (« 0 carte », « 1 carte », « 2 cartes »). */
const s = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count > 1 ? plural : singular}`;

export const fr = {
  locale: 'fr-FR',
  cardmarketPath: 'fr',
  isPlural: (count: number) => count > 1,

  common: {
    loading: 'Chargement…',
    card: 'carte',
    cards: 'cartes',
    copy: 'exemplaire',
    copies: 'exemplaires',
    add: '+ Ajouter',
    added: '✓ Ajoutée',
    cancel: 'Annuler',
    close: 'Fermer',
    inWishlist: 'Dans ta wishlist',
    setComplete: '✓ Série complète',
    finishUnknown: 'À confirmer',
  },

  nav: {
    main: 'Navigation principale',
    brand: 'CyberCardex — accueil',
    home: 'Catalogue',
    search: 'Recherche',
    scan: 'Scanner',
    collection: 'Collection',
    wishlist: 'Wishlist',
    settings: 'Réglages',
  },

  colors: { Red: 'Rouge', Blue: 'Bleu', Green: 'Vert', Yellow: 'Jaune' },
  cardTypes: { Legend: 'Légende', Unit: 'Unité', Gear: 'Équipement', Program: 'Programme' },

  filters: { all: 'Toutes', owned: 'Possédées', missing: 'Manquantes', wished: 'Wishlist' },

  home: {
    subtitle: 'Gère ta collection, retrouve tes cartes et complète chaque série.',
    myCollection: 'Ma collection',
    progress: 'Progression',
    categories: 'Catégories',
    tabs: { core: 'Beta / Retail', promo: 'Promo', decks: 'Decks' },
    tabTitles: { core: 'Beta / Retail', promo: 'Promos & événements', decks: 'Decks' },
    emptyTab: 'Aucun groupe dans cette catégorie.',
    cardsCount: (owned: number, total: number) => `${owned} / ${total} cartes`,
    percentComplete: (percent: number) => `${percent} % complété`,
  },

  dates: {
    cyberpunkDate: '10 décembre 2020',
    cyberpunkText: (age: number) => `Cyberpunk 2077 fête ses ${s(age, 'an')} aujourd'hui.`,
    kickstarterDate: '17 mars 2026',
    kickstarterTitle: 'Financé en 7 minutes',
    kickstarterText: (age: number) =>
      age > 0
        ? `Il y a ${s(age, 'an')}, le Kickstarter de Cyberpunk TCG atteignait son objectif en 7 minutes. Merci, chooms.`
        : 'Le Kickstarter de Cyberpunk TCG a atteint son objectif en 7 minutes. Merci, chooms.',
  },

  set: {
    cardSize: 'Taille des cartes',
    cardSizes: { small: 'Petites cartes', medium: 'Cartes moyennes', large: 'Grandes cartes' },
    notFoundTitle: 'Série introuvable',
    notFoundText: 'Ce lien ne correspond à aucune série du catalogue.',
    replayBraindance: 'Rejouer le braindance',
    display: 'Affichage',
    grid: 'Grille',
    binder: 'Classeur',
    searchPlaceholder: 'Rechercher une carte ou un numéro…',
    emptyTitle: 'Aucune carte',
    emptyText: 'Aucune carte ne correspond aux filtres.',
  },

  binder: {
    format: 'Pochettes par page',
    missing: (label: string) => `${label} (manquante)`,
    tabs: 'Intercalaires du classeur',
    tabLabel: (
      from: string,
      to: string,
      start: number,
      end: number,
      owned: number,
      total: number,
    ) => `Cartes ${from} à ${to} (pages ${start} à ${end}) : ${owned} / ${total}`,
    pages: 'Pages du classeur',
    previous: 'Page précédente',
    next: 'Page suivante',
    page: (page: number) => `Page ${page}`,
    pagesRange: (first: number, second: number) => `Pages ${first}–${second}`,
  },

  quickAdd: {
    title: 'Ajout rapide',
    hint: 'Touche une carte pour ajouter 1 exemplaire.',
    last: (label: string) => `Dernière : ${label}`,
    condition: 'État des exemplaires ajoutés',
    language: 'Langue des exemplaires ajoutés',
    undo: 'Annuler',
    done: 'Terminer',
    addOne: (label: string) => `Ajouter 1 exemplaire de ${label}`,
    removeOne: (label: string) => `Retirer 1 exemplaire de ${label}`,
  },

  card: {
    notFoundTitle: 'Carte introuvable',
    notFoundText: "Cette impression n'existe pas (ou plus) dans le catalogue.",
    previous: 'Carte précédente',
    next: 'Carte suivante',
    imageUnavailable: 'Image indisponible',
    viewCloser: (name: string) => `Voir ${name} de plus près`,
    closeUp: 'Voir de près',
    versions: 'Versions',
    effect: 'Effet',
    cost: 'Coût',
    power: 'Puissance',
    inWishlist: '★ Dans ma wishlist',
    addWishlist: '☆ Wishlist',
    printing: 'Impression',
    set: 'Série',
    number: 'Numéro',
    rarity: 'Rareté',
    language: 'Langue',
    finish: 'Finition',
    treatments: 'Traitements',
    artist: 'Illustrateur',
    unknown: 'Non renseigné',
    cardmarketView: 'Voir sur Cardmarket',
    cardmarketSearch: 'Chercher sur Cardmarket',
    cardmarketPrice: (price: string, date: string) => `Cardmarket : ${price} · tendance au ${date}`,
    officialSite: 'Voir sur cyberpunktcg.com',
  },

  addCopy: {
    condition: 'État',
    more: "Gradée, prix d'achat, notes",
    noteShort: 'note',
    graded: 'Carte gradée',
    company: 'Société',
    grade: 'Note',
    purchasePrice: "Prix d'achat",
    notes: 'Notes',
    notesPlaceholder: 'Notes facultatives…',
    errorGradeMissing: 'Indique une note de grading.',
    errorGradeRange: 'La note doit être comprise entre 1 et 10.',
    errorPrice: "Le prix d'achat n'est pas valide.",
  },

  owned: {
    graded: 'Gradée',
    notGraded: 'Non gradée',
    addSame: 'Ajouter un exemplaire identique',
    removeOne: 'Retirer 1',
    delete: 'Supprimer',
  },

  viewer: {
    label: (name: string) => `Visionneuse de ${name}`,
    close: 'Fermer la visionneuse',
    helpDesktop: 'Survoler pour incliner • Molette pour zoomer • Double-clic pour basculer le zoom',
    helpTouch:
      'Pincer pour zoomer • Glisser pour déplacer • Double-tap pour zoomer • Glisser vers le bas pour fermer',
    zoomControls: 'Contrôles de zoom',
    zoomOut: 'Dézoomer',
    reset: 'Réinitialiser la vue',
    zoomIn: 'Zoomer',
  },

  search: {
    eyebrow: 'Toutes les séries',
    placeholder: 'Nom, numéro, artiste, affiliation, texte de règle…',
    filters: 'Filtres',
    hideFilters: 'Masquer les filtres',
    color: 'Couleur',
    type: 'Type',
    foilOnly: 'Foil uniquement',
    sort: 'Tri',
    sorts: {
      set: 'Par série',
      name: 'Nom (A → Z)',
      cost: 'Coût',
      rarity: "Rareté (plus rare d'abord)",
    },
    reset: 'Réinitialiser',
    result: 'résultat',
    results: 'résultats',
    showMore: (left: number) => `Afficher plus (${left} restantes)`,
    emptyTitle: 'Aucun résultat',
    emptyText: 'Essaie un autre mot-clé ou retire des filtres.',
    blackwallTitle: "Ce que tu cherches n'est pas de ce côté du mur.",
    blackwallText: 'Retourne en lieu sûr, netrunner.',
  },

  collection: {
    emptyTitle: 'Ta collection est vide',
    emptyText: 'Ouvre une carte du catalogue et ajoute tes exemplaires.',
    emptyBackup: 'Tu as une sauvegarde ? Importe-la depuis les réglages.',
    browse: 'Parcourir le catalogue',
    printingsCount: (owned: number, total: number) => `${owned} / ${total} impressions`,
    copies: 'Exemplaires',
    distinctPrinting: 'impression différente',
    distinctPrintings: 'impressions différentes',
    uniqueCards: 'Cartes uniques',
    outOf: (total: number) => `sur ${total}`,
    foilGraded: 'Foil / gradées',
    spent: 'Dépensé',
    spentHint: "prix d'achat renseignés",
    bySet: 'Par série',
    byRarity: 'Par rareté',
    rarityMissing: 'Voir les cartes manquantes de cette rareté',
    myCards: 'Mes cartes',
    filterPlaceholder: 'Filtrer ma collection…',
    sorts: {
      recent: 'Ajout récent',
      set: 'Série',
      name: 'Nom',
      rarity: 'Rareté',
      quantity: 'Quantité',
    },
    noMatch: 'Aucune carte de ta collection ne correspond à cette recherche.',
  },

  wishlist: {
    eyebrow: 'Cartes recherchées',
    subtitle:
      'Ajoute une carte avec le bouton ☆ de sa fiche. Elle quitte la liste dès que tu en enregistres un exemplaire.',
    emptyTitle: 'Ta wishlist est vide',
    emptyText: 'Repère les cartes qui te manquent dans le catalogue ou la recherche.',
    seeMissing: 'Voir les cartes manquantes',
    ownedElsewhere: (count: number) => `Tu en as déjà ×${count} dans une autre version`,
    toFind: 'À trouver',
    price: 'Prix',
    cardmarket: 'Cardmarket',
    remove: 'Retirer',
  },

  settings: {
    groupDisplay: 'Affichage',
    appLanguage: "Langue de l'app",
    cardLanguage: 'Langue des cartes',
    cardLanguageHint: "Si une carte n'existe pas dans cette langue, l'autre version s'affiche.",
    uiSize: "Taille de l'interface",
    uiSizeHint: 'Boutons et filtres, sur téléphone.',
    uiSizes: { compact: 'Compacte', normal: 'Normale' },
    backupHint:
      "Tout reste sur cet appareil. La sauvegarde contient ta collection, ta wishlist, tes decks et tes réglages : garde-la pour ne rien perdre ou changer d'appareil.",
    deckCreation: 'Création de deck',
    deckCreationHint:
      "Guidée : tu choisis d'abord tes 3 Légendes, qui fixent tes couleurs et ta RAM. Libre : tu pars d'un deck vide.",
    deckCreations: { guided: 'Guidée', free: 'Libre' },
    groupExperimental: 'Fonctions expérimentales',
    experimentalIntro: 'En test : elles peuvent changer ou disparaître.',
    cardmarketHint: 'Lien vers la carte sur Cardmarket, avec ou sans prix indicatif.',
    cardmarketModes: { link: 'Lien', price: 'Lien + prix', off: 'Désactivé' },
    aboutCredits: 'Crédits et sources',
    groupDanger: 'Zone sensible',
    resetHint: 'Supprime tes exemplaires, ta wishlist et tes decks de cet appareil.',
    resetButton: 'Vider…',
    exportJson: 'Sauvegarder',
    exportCsv: 'Export Excel',
    import: 'Importer…',
    confirmImport: "Confirmer l'import",
    importNow: 'Importer',
    importReady: 'Sauvegarde prête à importer',
    importSummary: (copies: number, wishes: number, rejected: number, unknown: number) =>
      [
        s(copies, 'exemplaire'),
        `${s(wishes, 'carte')} en wishlist`,
        rejected > 0 && `${s(rejected, 'entrée invalide ignorée', 'entrées invalides ignorées')}`,
        unknown > 0 && `${s(unknown, 'impression inconnue', 'impressions inconnues')} du catalogue`,
      ]
        .filter(Boolean)
        .join(' • '),
    merge: 'Fusionner avec ma collection',
    replace: 'Remplacer ma collection',
    imported: (added: number, duplicates: number, unknown: number) =>
      `${s(added, 'exemplaire importé', 'exemplaires importés')}` +
      (duplicates > 0 ? ` (${s(duplicates, 'déjà présent', 'déjà présents')})` : '') +
      (unknown > 0 ? ` • ${unknown} liés à des impressions absentes du catalogue` : '') +
      '.',
    wipeKicker: '// Alerte — zone sensible',
    wipeTitle: 'Effacer ta Cardex ?',
    wipeText: (copies: number, wishes: number, decks: number) =>
      `Ta collection (${s(copies, 'exemplaire')}), ta wishlist (${s(wishes, 'carte')}) et tes decks (${s(decks, 'deck')}) seront supprimés de cet appareil.`,
    wipeKeep:
      'Seuls tes réglages sont conservés. Pense à sauvegarder avant : la sauvegarde garde aussi tes decks.',
    confirmBackup: "Sauvegarder d'abord",
    confirmContinue: 'Continuer',
    confirmFinalTitle: 'Dernière confirmation',
    wipeFinalText: "C'est définitif : sans sauvegarde, impossible de revenir en arrière.",
    wipeHold: 'Maintenir pour effacer',
    wipeHolding: 'Effacement…',
    psychoWarning: 'Cyberpsychose détectée',
    psychoMaxTac: '// MaxTac en route',
    replaceKicker: '// Restauration — sauvegarde',
    replaceTitle: 'Remplacer tes données ?',
    replaceText: (copies: number, wishes: number, decks: boolean, settings: boolean) =>
      `${list([
        `Ta collection (${s(copies, 'exemplaire')})`,
        `ta wishlist (${s(wishes, 'carte')})`,
        ...(decks ? ['tes decks'] : []),
        ...(settings ? ['tes réglages'] : []),
      ])} seront remplacés par ceux de la sauvegarde.`,
    replaceFrom: (copies: number, wishes: number, decks?: number) =>
      `La sauvegarde contient ${list([
        s(copies, 'exemplaire'),
        `${s(wishes, 'carte')} en wishlist`,
        ...(decks === undefined ? [] : [s(decks, 'deck')]),
      ])}.`,
    replaceFinalText:
      "Tes données actuelles seront écrasées. Sauvegarde-les d'abord si tu veux pouvoir revenir en arrière.",
    replaceHold: 'Maintenir pour remplacer',
    replaceHolding: 'Remplacement…',
    mergeKicker: '// Fusion — sauvegarde',
    mergeTitle: 'Fusionner avec tes données ?',
    mergeText:
      "Tout s'ajoute à tes données actuelles, sans rien supprimer. Les exemplaires et les decks déjà présents ne sont pas doublés, et tes réglages restent inchangés.",
    mergeFinalText:
      "Cette action est irréversible : les données ajoutées ne pourront pas être retirées d'un coup. Sauvegarde d'abord si tu veux pouvoir revenir en arrière.",
    mergeHold: 'Maintenir pour fusionner',
    mergeHolding: 'Fusion…',
    resetDone: 'Cardex vidée : collection, wishlist et decks supprimés.',
    importedDecks: (count: number) => `${s(count, 'deck importé', 'decks importés')}.`,
    decksCount: (count: number) => s(count, 'deck'),
    exportFailed: "Échec de l'export : le fichier n'a pas pu être enregistré. Réessaie.",
    exportSaved: (name: string) => `Fichier enregistré : ${name}`,
    catalogCounts: (cards: number, printings: number, sets: number) =>
      `${s(cards, 'carte')} • ${s(printings, 'impression')} • ${s(sets, 'série')}`,
    collectionCounts: (copies: number, wishes: number) =>
      `${s(copies, 'exemplaire')} • ${wishes} en wishlist`,
    reset: 'Vider ma Cardex',
  },

  about: {
    title: 'À propos',
    version: 'Version',
    officialLinks: 'Liens officiels de Cyberpunk TCG',
    officialSite: 'Site officiel',
    howToPlay: 'Comment jouer',
    unofficial:
      'CyberCardex est un projet de fan gratuit et non officiel, sans lien avec WeirdCo ni CD PROJEKT.',
    credits:
      'Cyberpunk TCG est développé par WeirdCo en collaboration avec CD PROJEKT RED. Cyberpunk, Cyberpunk 2077 et les visuels des cartes appartiennent à CD PROJEKT S.A. et à leurs ayants droit.',
    cardData: 'Cartes : données et images officielles de',
    prices: 'Prix : Cardmarket, à titre indicatif.',
    privacyTitle: 'Confidentialité',
    privacy:
      "Aucune donnée n'est collectée : pas de compte, pas de publicité, pas de statistiques. Ta collection reste sur cet appareil, sauf quand tu l'exportes toi-même.",
    privacyUpdates:
      "Dans l'app Android, la recherche de mises à jour interroge GitHub : GitHub voit alors ton adresse IP, comme pour n'importe quel site.",
    privacyPrices:
      'Avec Cardmarket en « Lien + prix », les prix du jour sont téléchargés depuis GitHub au lancement (même principe).',
    licenseTitle: 'Licence',
    license: 'Code open source sous licence MIT, fourni tel quel, sans garantie.',
    sourceCode: 'Code source sur GitHub',
  },

  update: {
    title: 'Application',
    text: "Les nouvelles versions sont publiées sur GitHub et s'installent par-dessus l'app : ta collection est conservée.",
    check: 'Rechercher une mise à jour',
    checking: 'Recherche en cours…',
    upToDate: 'Tu as la dernière version.',
    available: (version: string) => `Nouvelle version ${version} disponible`,
    size: (mb: number) => `${mb} Mo`,
    kicker: 'Mise à jour disponible',
    notes: 'Nouveautés',
    install: 'Installer',
    downloading: (percent: number) =>
      percent >= 0 ? `Téléchargement… ${percent} %` : 'Téléchargement…',
    needsPermission:
      "Autorise CyberCardex à installer des applis dans l'écran qui s'ouvre, puis reviens : l'installation reprendra toute seule.",
    openPermission: 'Ouvrir le réglage',
    installing: "L'installeur d'Android est ouvert. Tes cartes sont conservées.",
    retry: 'Réessayer',
    timeout: 'GitHub ne répond pas (délai de 15 s dépassé).',
    checkFailed: 'Impossible de joindre GitHub. Vérifie ta connexion.',
    failed: (message: string) => `Échec : ${message}`,
  },

  scan: {
    eyebrow: 'Reconnaissance visuelle',
    subtitle: 'Prends une carte en photo : elle est reconnue sur le téléphone, sans connexion.',
    loading: 'Chargement des empreintes…',
    recognised: 'Carte reconnue',
    aim: 'Cadre la carte, puis appuie sur le déclencheur',
    notRecognised:
      'Aucune carte reconnue. Remplis le cadre avec la carte, tiens le téléphone immobile et évite les reflets.',
    notRecognisedPhoto:
      "Aucune carte reconnue sur cette photo. Place la carte pour qu'elle remplisse le cadre, puis réessaie.",
    cropHint:
      'Place la carte dans le cadre : glisse pour déplacer, pince pour zoomer, tourne à deux doigts.',
    rotateShort: 'Tourner',
    zoomIn: 'Zoomer',
    zoomOut: 'Dézoomer',
    analyse: 'Analyser',
    imageError: 'Impossible de lire cette image.',
    cameraDenied: 'Accès à la caméra refusé. Autorise-le dans les réglages, ou importe une photo.',
    cameraError: "Impossible d'ouvrir la caméra. Tu peux importer une photo à la place.",
    indexError: (status: number) => `Index du scanner introuvable (HTTP ${status})`,
    streak: 'Tes optiques Kiroshi chauffent, choom.',
    preview: 'Aperçu de la caméra',
    stop: 'Couper',
    gallery: 'Galerie',
    resume: 'Reprendre la visée',
    shoot: 'Prendre la photo',
    ready: 'Prêt à scanner',
    readyText: 'Pose la carte à plat, bien éclairée et sans reflet.',
    noCamera:
      'La caméra en direct nécessite une connexion sécurisée (HTTPS ou localhost). Tu peux importer une photo de la carte à la place.',
    start: 'Activer la caméra',
    importPhoto: 'Importer une photo',
    alreadyOwned: (count: number) => `Déjà dans ta collection : ×${count}`,
    chooseVersion: 'Choisis la version exacte',
    openCard: 'Voir la fiche',
    rescan: 'Rescanner',
    session: 'Ajoutées pendant ce scan',
  },

  decks: {
    eyebrow: 'Deckbuilding',
    title: 'Decks',
    searchPlaceholder: 'Ajouter une carte : tape son nom…',
    noMatch: 'Aucune carte ne correspond.',
    ownedCount: (count: number) => `possédée ×${count}`,
    notOwned: 'pas possédée',
    inDeck: (count: number) => `×${count} dans le deck`,
    importToggle: 'Importer une liste',
    importButton: 'Ajouter ces cartes au deck',
    copy: 'Copier',
    copied: 'Copié ✓',
    fileSaved: 'Enregistré ✓',
    copyFailed: 'Copie impossible ici : utilise « Exporter » (fichier .txt).',
    exportFile: 'Exporter',
    otherType: 'Autres',
    less: (name: string) => `Retirer 1 ${name}`,
    more: (name: string) => `Ajouter 1 ${name}`,
    emptyTitle: 'Deck vide',
    emptyText: 'Cherche une carte par son nom ci-dessus, ou importe une liste.',
    saved: 'Mes decks',
    untitled: 'Deck sans nom',
    namePlaceholder: 'Nom du deck',
    textPlaceholder: [
      '3x Adam Smasher - Ender of Legends',
      '2 Corpo Security',
      '3x MS01-131A',
      '…',
    ].join('\n'),
    delete: 'Supprimer',
    confirmDelete: (name: string) => `Supprimer le deck « ${name} » ?`,
    unknown: (count: number) => `${s(count, 'ligne non reconnue', 'lignes non reconnues')} :`,
    owned: 'Cartes possédées',
    addMissing: 'Ajouter les manquantes à la wishlist',
    wishAdded: (count: number) => `${s(count, 'carte ajoutée', 'cartes ajoutées')} à la wishlist.`,
    wishAlready: 'Déjà toutes dans ta wishlist.',
    complete: '✓ Tu as tout le deck !',
    rowMissing: (owned: number, missing: number) => `possédée ×${owned} • il en manque ${missing}`,
    rowNone: (missing: number) => `il en manque ${missing}`,
    rowOk: (owned: number) => `possédée ×${owned} • ✓`,
    pickTitle: 'Choisis tes 3 Légendes',
    pickSubtitle:
      'Elles fixent les couleurs du deck et la RAM de chaque couleur. Deux Légendes ne peuvent pas avoir le même nom.',
    pickCount: (count: number) => `Légendes ${count}/3`,
    pickContinue: 'Continuer',
    pickSkip: 'Passer',
    pickSameName: 'Nom déjà pris',
    pickSelected: 'Choisie',
    versionTitle: 'Quelle version ?',
    versionsCount: (count: number) => `${count} versions`,
    versionChange: (name: string) => `Changer la version de ${name}`,
    listSubtitle: 'Tes decks, avec les cartes que tu as déjà et les règles de construction.',
    listEmptyTitle: "Aucun deck pour l'instant",
    listEmptyText: 'Crée ton premier deck, ou colle une liste pour la retrouver ici.',
    create: 'Créer un deck',
    createShort: 'Créer',
    importShort: 'Importer',
    importCreate: 'Créer le deck',
    newDeck: 'Nouveau deck',
    noLegend: 'Aucune Légende',
    legendsCount: (count: number) => `Légendes ${count}/3`,
    cardsCount: (count: number) => `Cartes ${count} (40–50)`,
    legal: '✓ Légal',
    issuesCount: (count: number) => s(count, 'problème'),
    ownedPercent: (value: number) => `${value} % possédé`,
    ram: (color: string, value: number) => `${color} ${value}`,
    ramTitle: 'RAM apportée par les Légendes, par couleur',
    issueLegendCount: (count: number) => `${s(count, 'Légende')} (il en faut 3)`,
    issueLegendName: (name: string) => `Plusieurs Légendes nommées ${name}`,
    issueCardCount: (count: number) =>
      `${s(count, 'carte')} hors Légendes (${count < 40 ? 'minimum 40' : 'maximum 50'})`,
    issueCopies: (name: string, quantity: number, max: number) =>
      `${name} : ${quantity} exemplaires (${max} max)`,
    issueRam: (name: string, color: string, need: number, have: number) =>
      `${name} : RAM ${need} en ${color}, tes Légendes en donnent ${have}`,
    sortBy: 'Trier par',
    sorts: { type: 'Type', ram: 'RAM', color: 'Couleur', cost: 'Coût', name: 'Nom' },
    groupLegends: 'Légendes',
    groupCards: 'Cartes',
    groupNoRam: 'Sans RAM',
    groupNoCost: 'Sans coût',
    maxReached: (max: number) => `${max} max`,
    stats: 'Statistiques',
    costCurve: 'Courbe de coût (hors Légendes)',
    noCost: 'sans',
    byColor: 'Couleurs',
    byType: 'Types',
    completeCost: 'Coût pour compléter',
    completeCostHint: (date: string) => `Version la moins chère sur Cardmarket (prix du ${date})`,
    noPrice: (count: number) => s(count, 'carte sans prix', 'cartes sans prix'),
  },

  history: {
    title: 'Historique',
    chartLabel: (total: number, since: string) =>
      `Évolution de la collection depuis le ${since} : ${s(total, 'exemplaire')} aujourd'hui.`,
    total: (total: number) => s(total, 'exemplaire'),
    added: (count: number) => `+${count} ce jour-là`,
    notEnough: 'La courbe de ta collection apparaîtra après des ajouts sur au moins deux jours.',
    recent: 'Derniers ajouts',
  },

  notFound: {
    eyebrow: 'Erreur 404',
    title: 'Page introuvable',
    text: 'Ce lien ne mène nulle part dans Night City.',
    back: 'Retour au catalogue',
  },

  crash: {
    eyebrow: 'Erreur',
    title: 'Quelque chose a planté',
    text: "Cette page n'a pas pu s'afficher. Ta collection n'est pas touchée.",
    reload: 'Recharger',
  },

  storage: {
    writeFailed:
      "Enregistrement impossible sur l'appareil (stockage plein ou indisponible) : tes dernières modifications risquent d'être perdues. Fais une sauvegarde ci-dessous.",
  },

  importErrors: {
    notJson: "Ce fichier n'est pas un JSON valide.",
    otherApp: 'Ce fichier ne vient pas de CyberCardex.',
    unknownFormat: 'Format de sauvegarde non reconnu.',
    noCollection: 'La sauvegarde ne contient pas de collection.',
    newerVersion:
      "Cette sauvegarde vient d'une version plus récente de CyberCardex. Mets l'app à jour pour l'importer.",
  },

  /** Export Excel : format français (point-virgule, virgule décimale). */
  csv: {
    header: [
      'Carte',
      'Sous-titre',
      'Série',
      'Édition',
      'Numéro',
      'Langue',
      'Rareté',
      'Finition',
      'Traitements',
      'État',
      'Gradée',
      'Société',
      'Note',
      "Prix d'achat (€)",
      'Notes',
      'Ajoutée le',
      'Id impression',
    ],
    unknownCard: '(carte inconnue)',
    yes: 'Oui',
    no: 'Non',
    separator: ';',
    decimal: ',',
  },

  easter: {
    braindanceTitle: 'Enregistrement lancé',
    braindanceText: 'Night City en mode rejeu.',
    time2017: 'Plus que 60 ans avant 2077.',
    incoming: 'Contact au-dessus',
    flatlined: 'Night City ne pardonne rien.',
  },
};
