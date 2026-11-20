export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "tip"; title: string; text: string };

export interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  /** Date de publication, format AAAA-MM-JJ. */
  date: string;
  minutes: number;
  body: ArticleBlock[];
}

export const ARTICLES: Article[] = [
  {
    slug: "fin-de-promo-le-piege-du-prix-qui-double",
    title: "Fin de promo : le piège du prix qui double",
    description: "Un prix d'appel pendant quelques mois, puis un tarif bien plus élevé : comment repérer la date de fin de promotion et comparer le vrai coût d'une offre.",
    category: "Comparer",
    date: "2026-11-20",
    minutes: 3,
    body: [
      { type: "p", text: "C'est le scénario le plus courant dans les télécoms : une offre affichée à un prix très bas « pendant 6 mois » ou « pendant 12 mois ». Tu souscris, tu oublies, et un jour ta facture grimpe sans que rien n'ait changé dans ton usage. Rien d'illégal là-dedans : le prix après promotion était écrit quelque part. Simplement, il était écrit en plus petit." },
      { type: "h2", text: "Pourquoi ça marche si bien" },
      { type: "p", text: "Le prix d'appel est celui qu'on retient. Le prix définitif, lui, arrive des mois plus tard, à un moment où tu ne regardes plus tes prélèvements de près. Beaucoup de personnes continuent alors de payer le plein tarif pendant des années, alors que la même offre, ou une offre équivalente, est proposée moins cher aux nouveaux clients." },
      { type: "h2", text: "Le bon réflexe : raisonner en coût total" },
      { type: "p", text: "Comparer deux prix mensuels ne suffit pas quand l'un des deux est provisoire. Ce qu'il faut comparer, c'est ce que tu auras réellement payé au bout de 12 ou 24 mois. Le calcul est simple :" },
      { type: "ul", items: [
        "le prix promotionnel multiplié par le nombre de mois de promotion ;",
        "plus le prix normal multiplié par le nombre de mois restants ;",
        "plus les frais uniques : carte SIM, mise en service, activation ;",
        "plus, si tu quittes une offre, les frais de résiliation de l'ancienne.",
      ] },
      { type: "p", text: "Une offre un peu plus chère au départ mais sans hausse peut ainsi revenir moins cher sur deux ans qu'une promotion spectaculaire. L'inverse est vrai aussi : une promotion reste une bonne affaire si tu es prêt à changer de nouveau quand elle se termine." },
      { type: "h2", text: "Où trouver la date de fin de ta promotion" },
      { type: "ul", items: [
        "Sur ta facture : la remise apparaît sur une ligne à part, souvent avec sa date de fin.",
        "Dans ton espace client, rubrique contrat ou offre.",
        "Dans l'e-mail de confirmation reçu à la souscription, et dans le récapitulatif contractuel que le fournisseur doit te remettre avant la commande.",
      ] },
      { type: "tip", title: "À faire tout de suite", text: "Note la date de fin de promotion dans ton agenda, avec un rappel un mois avant. C'est le moment idéal pour comparer : tu as le temps de changer avant la première facture au plein tarif." },
      { type: "h2", text: "Que faire quand la promotion se termine" },
      { type: "ol", items: [
        "Vérifie si tu es encore engagé. Sans engagement, ou une fois l'engagement terminé, tu peux partir sans payer les mois restants.",
        "Compare le coût total des offres disponibles sur 12 mois, frais de changement compris.",
        "Si une offre est nettement plus intéressante, change. Pour un forfait mobile, ton numéro te suit grâce au RIO.",
        "Si l'écart est faible, rester est une décision tout à fait valable. Changer a aussi un coût en temps.",
      ] },
      { type: "p", text: "Dernier point : une fin de promotion prévue au contrat n'est pas une « modification du contrat ». Elle ne te donne donc pas, à elle seule, le droit de résilier sans frais pendant ta période d'engagement. D'où l'intérêt de connaître les deux dates, celle de fin de promotion et celle de fin d'engagement, avant de signer." },
      { type: "p", text: "Dans ECONOM., le comparateur intègre le prix après promotion dans le coût total, et les alertes d'échéance de la formule Plus te préviennent avant la date fatidique. Mais un simple rappel dans ton téléphone fait déjà l'essentiel du travail." },
    ],
  },
  {
    slug: "rio-changer-operateur-sans-perdre-son-numero",
    title: "RIO : changer d'opérateur sans perdre son numéro",
    description: "Le RIO s'obtient gratuitement au 3179 et permet de garder son numéro en changeant d'opérateur. Les étapes dans l'ordre, et l'erreur à ne pas commettre.",
    category: "Démarches",
    date: "2026-11-20",
    minutes: 3,
    body: [
      { type: "p", text: "Beaucoup de personnes gardent un forfait trop cher par peur de perdre leur numéro. C'est une crainte dépassée : conserver son numéro en changeant d'opérateur est un droit, c'est gratuit, et la démarche tient en un appel et un code. Ce code, c'est le RIO." },
      { type: "h2", text: "Le RIO, c'est quoi ?" },
      { type: "p", text: "RIO signifie « relevé d'identité opérateur ». C'est un code de 12 caractères, composé de chiffres et de lettres, propre à ta ligne. Il identifie ton opérateur actuel et ton contrat. En le transmettant à ton nouvel opérateur, tu l'autorises à récupérer ton numéro : c'est ce qu'on appelle la portabilité." },
      { type: "h2", text: "Comment l'obtenir" },
      { type: "p", text: "Compose le 3179 depuis la ligne dont tu veux garder le numéro. L'appel est gratuit et un serveur vocal répond à toute heure. Il t'annonce ton RIO et la date de fin de ton engagement éventuel, puis t'envoie ces informations par SMS. Pas besoin de parler à un conseiller, ni de te justifier." },
      { type: "p", text: "Le 3179 fonctionne aussi pour une ligne fixe : il faut alors appeler depuis le téléphone branché sur la box pour obtenir le RIO du numéro fixe." },
      { type: "h2", text: "Les étapes, dans l'ordre" },
      { type: "ol", items: [
        "Appelle le 3179 et note ton RIO ainsi que ta date de fin d'engagement.",
        "Choisis ta nouvelle offre et, à la souscription, indique que tu souhaites conserver ton numéro. Saisis ton RIO.",
        "Choisis la date de portabilité si on te le propose. Le transfert peut se faire en quelques jours ouvrables.",
        "Le jour prévu, mets la nouvelle carte SIM dans ton téléphone ou active ton eSIM. Une coupure de quelques heures au maximum est possible pendant la bascule.",
      ] },
      { type: "tip", title: "L'erreur à ne pas commettre", text: "Ne résilie jamais ton ancien forfait toi-même avant la portabilité. C'est le nouvel opérateur qui s'en charge, automatiquement, le jour du transfert. Une ligne résiliée trop tôt, c'est un numéro que tu risques de ne pas récupérer." },
      { type: "h2", text: "Ce que la portabilité ne change pas" },
      { type: "ul", items: [
        "Ton engagement : si tu es encore engagé chez l'ancien opérateur, il peut te facturer des frais de résiliation. La date annoncée par le 3179 te permet de le savoir à l'avance.",
        "Tes dettes éventuelles : la dernière facture de l'ancien opérateur reste due.",
        "Ton téléphone : il doit simplement être compatible avec le nouveau réseau et ne pas être verrouillé. Le déverrouillage est gratuit auprès de ton opérateur après quelques mois d'abonnement.",
      ] },
      { type: "h2", text: "Avant de te lancer" },
      { type: "p", text: "Pense à sauvegarder tes messages vocaux importants, car la messagerie de l'ancien opérateur disparaît avec le contrat. Vérifie aussi que ton adresse e-mail de contact n'est pas une adresse fournie par l'opérateur que tu quittes. Enfin, contrôle la couverture du nouveau réseau chez toi et sur ton lieu de travail : les cartes de couverture publiées par le régulateur des télécoms sont un bon point de départ." },
      { type: "p", text: "Une fois ces vérifications faites, changer de forfait prend moins de temps que de lire cet article. Le plus long reste de choisir la bonne offre, et c'est justement là que comparer le coût total sur 12 ou 24 mois t'évite les mauvaises surprises." },
    ],
  },
  {
    slug: "abonnements-oublies-la-methode-des-15-minutes",
    title: "Abonnements oubliés : la méthode des 15 minutes",
    description: "Un quart d'heure, un relevé bancaire et trois questions : une méthode simple pour retrouver les abonnements que tu paies sans t'en servir.",
    category: "Abonnements",
    date: "2026-11-20",
    minutes: 3,
    body: [
      { type: "p", text: "Un essai gratuit jamais annulé, une appli payée à l'année, une option ajoutée un jour chez ton opérateur : les petits prélèvements ont un talent particulier pour se faire oublier. Pris un par un, ils semblent négligeables. Additionnés sur douze mois, ils pèsent parfois plus lourd qu'une grosse dépense que tu aurais longuement hésité à faire." },
      { type: "p", text: "Pas besoin d'y passer un week-end. Voici une méthode qui tient en quinze minutes, chronomètre en main." },
      { type: "h2", text: "Minutes 1 à 5 : la chasse" },
      { type: "p", text: "Ouvre l'appli de ta banque et affiche les trois derniers mois d'opérations. Note tout ce qui revient à intervalle régulier : prélèvements et paiements par carte récurrents. Puis regarde deux endroits qu'on oublie presque toujours :" },
      { type: "ul", items: [
        "les abonnements gérés par ton téléphone, dans les réglages de ton compte Apple ou Google ;",
        "les options facturées par ton opérateur mobile ou internet, visibles sur ta facture ;",
        "les paiements annuels : cherche aussi sur douze mois les montants qui ne tombent qu'une fois par an.",
      ] },
      { type: "h2", text: "Minutes 6 à 10 : le tri" },
      { type: "p", text: "Pour chaque ligne, pose-toi trois questions, sans tricher :" },
      { type: "ol", items: [
        "Est-ce que je m'en suis servi le mois dernier ?",
        "Si on me le proposait aujourd'hui à ce prix, est-ce que je le prendrais ?",
        "Existe-t-il une formule moins chère qui me suffirait ?",
      ] },
      { type: "p", text: "Range ensuite chaque abonnement dans une case : je garde, je réduis, j'arrête. Dans le doute, choisis « j'arrête ». Un abonnement qui te manque vraiment se reprend en deux minutes ; un abonnement inutile, lui, ne se rembourse pas tout seul." },
      { type: "h2", text: "Minutes 11 à 15 : l'action" },
      { type: "p", text: "Résilie tout de suite ce qui peut l'être en ligne. Depuis 2023, un contrat souscrit en ligne doit pouvoir être résilié en ligne, au moyen d'un bouton facile à trouver sur le site ou l'appli du professionnel. Pour le reste, note la démarche à faire et la date limite." },
      { type: "tip", title: "Garde une trace", text: "Fais une capture d'écran ou conserve l'e-mail de confirmation de chaque résiliation. Le mois suivant, vérifie sur ton relevé que le prélèvement a bien cessé." },
      { type: "h2", text: "Les cas un peu plus coriaces" },
      { type: "ul", items: [
        "L'abonnement avec engagement : repère la date de fin et mets un rappel. Résilier avant peut coûter plus cher que d'attendre.",
        "Le renouvellement automatique annuel : le professionnel doit te prévenir avant l'échéance que tu peux ne pas reconduire. S'il ne l'a pas fait, tu peux résilier à tout moment après la reconduction.",
        "Le prélèvement que tu ne reconnais pas : contacte d'abord le commerçant, puis ta banque si tu n'as rien autorisé.",
      ] },
      { type: "h2", text: "Et après ?" },
      { type: "p", text: "La méthode ne vaut que si tu la refais. Deux fois par an suffisent, par exemple en janvier et à la rentrée. Entre-temps, prends une habitude : à chaque essai gratuit, mets immédiatement un rappel deux jours avant la fin." },
      { type: "p", text: "Si tu préfères tout avoir sous les yeux, le suivi des abonnements d'ECONOM. regroupe tes prélèvements récurrents et leurs échéances au même endroit. Mais un tableau sur une feuille de papier fonctionne aussi très bien. L'important, c'est le quart d'heure." },
    ],
  },
  {
    slug: "engagement-12-ou-24-mois-ce-que-dit-la-loi-chatel",
    title: "Engagement 12 ou 24 mois : ce que dit la loi Chatel",
    description: "Durée maximale d'engagement, sortie anticipée après le 12e mois, préavis de 10 jours, hausse de prix : tes droits face à un forfait ou une box avec engagement.",
    category: "Tes droits",
    date: "2026-11-20",
    minutes: 3,
    body: [
      { type: "p", text: "« Engagement 24 mois » : la mention fait hésiter, et c'est normal. S'engager, c'est accepter de payer pendant une durée minimale, même si une meilleure offre apparaît entre-temps. Mais l'engagement n'est pas une prison. Depuis la loi dite Chatel de 2008, dont les règles figurent aujourd'hui dans le Code de la consommation, plusieurs garde-fous s'appliquent aux contrats de téléphonie et d'accès à internet." },
      { type: "h2", text: "24 mois, c'est le maximum" },
      { type: "p", text: "Un opérateur ne peut pas t'imposer une durée d'engagement supérieure à 24 mois. Et lorsqu'il propose une offre avec un engagement de plus de 12 mois, il doit aussi proposer la même offre avec un engagement de 12 mois au plus, à des conditions qui ne la rendent pas dissuasive." },
      { type: "h2", text: "Après le 12e mois, la sortie coûte moins cher" },
      { type: "p", text: "C'est la règle la plus utile, et la moins connue. Si tu es engagé sur plus de 12 mois, tu peux résilier par anticipation à partir de la fin du douzième mois en payant au maximum un quart des mensualités restant dues jusqu'à la fin de l'engagement. Si tu pars avant le douzième mois, en revanche, les mensualités restantes de la première année restent dues en totalité." },
      { type: "p", text: "Concrètement, pour un engagement de 24 mois, partir au quinzième mois ne t'oblige pas à payer les neuf mois restants, mais au plus le quart de cette somme. Selon l'écart de prix avec une autre offre, changer peut donc devenir intéressant bien avant la fin du contrat." },
      { type: "h2", text: "Dix jours de préavis, pas plus" },
      { type: "p", text: "Une fois ta demande de résiliation reçue par l'opérateur, le contrat doit prendre fin dans un délai maximal de dix jours. Tu peux demander une date plus tardive si cela t'arrange, par exemple pour éviter une coupure avant l'installation d'une nouvelle box." },
      { type: "h2", text: "Si l'opérateur modifie le contrat" },
      { type: "p", text: "L'opérateur qui veut modifier tes conditions, par exemple augmenter le prix de ton forfait, doit t'en informer au moins un mois avant. Tu peux alors résilier sans frais et sans pénalité, même en cours d'engagement, jusqu'à quatre mois après l'entrée en vigueur de la modification. Attention : la fin d'une promotion prévue dès le départ n'est pas une modification du contrat." },
      { type: "tip", title: "Où trouver ta date de fin d'engagement", text: "Elle doit figurer sur ta facture. Tu peux aussi l'obtenir gratuitement en appelant le 3179 depuis ta ligne, en même temps que ton RIO." },
      { type: "h2", text: "Les frais qui peuvent rester" },
      { type: "ul", items: [
        "Les frais de résiliation prévus au contrat, fréquents pour les box internet, même sans engagement en cours.",
        "Le matériel non restitué : box, décodeur ou accessoires à renvoyer dans le délai indiqué.",
        "Le téléphone acheté à crédit ou à prix réduit avec le forfait : vérifie ce qu'il reste à payer.",
      ] },
      { type: "p", text: "Certains contrats prévoient aussi des « motifs légitimes » de résiliation sans frais, comme un déménagement dans une zone non couverte. Ils dépendent des conditions générales de chaque opérateur : relis les tiennes." },
      { type: "h2", text: "Avec ou sans engagement ?" },
      { type: "p", text: "Un engagement n'est pas mauvais en soi : il s'accompagne parfois d'un prix plus bas ou d'un équipement. La bonne question est celle du coût total sur la durée, frais de sortie compris. Cet article donne des informations générales et ne remplace pas la lecture de ton contrat ; en cas de litige, une association de consommateurs ou le médiateur des communications électroniques peuvent t'aider." },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
