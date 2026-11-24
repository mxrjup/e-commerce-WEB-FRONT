# log · back-office

L'interface d'administration de **log** : catalogue, ventes et administration.
React + Vite + TypeScript, MUI aux couleurs de la charte, connexion Keycloak.
Réservé aux comptes **collaborator** et **admin** ; les API passent toutes par
la gateway de `e-commerce-BACK`.

## Démarrer

Prérequis : Node.js 22.18 ou plus récent, et la pile de `e-commerce-BACK`
(au minimum Keycloak, pour se connecter).

```bash
# Dans e-commerce-BACK : Keycloak et sa base, puis la gateway et les services si besoin
docker compose up -d postgres keycloak
docker compose --profile services up -d --build
```

```bash
# Ici
npm ci
npm run dev
```

Ouvrir <http://localhost:5173>. Sans session, l'application redirige vers
Keycloak. Le port **5173** est imposé : c'est le seul que le client `web-bo` du
realm accepte.

Comptes de démonstration importés par `e-commerce-BACK` :

| Compte | Mot de passe | Accès |
|---|---|---|
| `admin.demo@ecommerce.test` | `demo1234` | tout le back-office, administration comprise |
| `client.demo@ecommerce.test` | `demo1234` | refusé : un compte client n'entre pas |

Les valeurs par défaut visent Docker Compose. Pour les changer, copier
`.env.example` en `.env.local` (Keycloak, realm, client, gateway).

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement sur le port 5173 |
| `npm run build` | vérification TypeScript, puis build de production dans `dist/` |
| `npm run lint` | lint (oxlint) |
| `npm test` | tests (Vitest, Testing Library) |

## Ajouter son écran

Tout le back-office part de **`src/navigation.tsx`** : le menu, les routes et
le garde par rôle sont construits à partir de cette liste. Chaque entrée prévue
par le board y est déjà, avec la tâche et son propriétaire ; tant que l'écran
n'existe pas, elle mène à une page « bientôt » qui les affiche.

Pour livrer son écran, remplacer `task` par `element` dans son entrée :

```tsx
{ path: '/orders', label: 'Commandes', icon: <LocalShippingOutlined />, element: <OrdersPage /> },
```

- Mettre la page dans `src/pages/` (ou un dossier par domaine si elle grandit).
- `roles: ['admin']` réserve une entrée aux administrateurs : le menu la cache
  et la route répond « Accès refusé » à un collaborateur. C'est une règle
  d'interface : la gateway applique la même sur l'API.
- Appeler l'API avec **`apiFetch`** (`src/api/client.ts`) et le `getToken` de
  `useAuth()` : le jeton est renouvelé si besoin, ajouté en `Bearer`, et une
  erreur arrive en `ApiError` avec le `status` et le `message` du contrat
  commun.

```tsx
const { getToken } = useAuth()
const inventory = await apiFetch<Page<InventoryItem>>(getToken, '/api/admin/catalog/inventory?lowStock=true')
```

### Briques communes

Avant d'écrire un composant, vérifier qu'il n'existe pas déjà :

| Besoin | Où |
|---|---|
| Appeler l'API sans recharger l'écran à chaque renouvellement du jeton | `useApi()` (`src/api/useApi.ts`) |
| Charger une liste, la recharger après une modification | `useList()` (`src/api/useList.ts`) |
| Une recherche envoyée quand on arrête de taper, qui suit l'adresse | `SearchField` |
| Charger autre chose qu'une liste (une page de résultats), à chaque changement de filtre, en ignorant une réponse arrivée trop tard | `useLoad()` (`src/api/useLoad.ts`), sur lequel repose `useList()` |
| Dire une erreur d'API en français | `errorMessage()` (`src/api/errors.ts`) |
| Titre d'écran et action principale | `PageHeader` |
| Tableau dans son panneau : chargement, erreur avec « Réessayer », liste vide, défilement horizontal | `TableFrame` |
| Formulaire dans une fenêtre, qui garde la saisie si l'enregistrement échoue | `FormDialog` |
| Confirmation d'une action destructrice (bouton jamais rempli, comme le veut la charte) | `ConfirmDialog` |
| Badge d'état avec libellé (`ok`, `neutral`, `danger`) | `StatusBadge` |
| Confirmation d'une action réussie | `useNotify()` (`src/components/Notifications.tsx`) |
| Copier une valeur (jeton, adresse) en le disant sur le bouton | `CopyButton` |
| Texte riche (gras, italique, intertitre, listes, liens) qui ne renvoie que du HTML propre | `RichTextEditor` (TipTap) |
| Une valeur à recopier telle quelle, avec son bouton « Copier » | `CodeLine` |
| « il y a 5 minutes » qui reste juste tant que la page est ouverte | `formatRelative()` et `useNow()` |
| Vérifier un champ comme l'API le fera | `src/lib/validation.ts` |
| Prix (« 89,90 € »), pourcentages, dates, décimaux saisis « 5,5 » | `src/lib/format.ts` |

Les nombres, slugs et identifiants s'écrivent en `monoFont` (JetBrains Mono),
alignés à droite dans une colonne. Pour tester un écran sans la pile
`e-commerce-BACK`, `fakeApi()` (`src/test/fakeApi.ts`) remplace la gateway.

## Ce qui est en place

- **Connexion** (`src/auth/AuthProvider.tsx`) : flux *authorization code* avec
  **PKCE** sur le client public `web-bo`, connexion obligatoire dès
  l'ouverture, jeton renouvelé avant expiration, déconnexion qui ferme la
  session Keycloak. Si Keycloak ne répond pas, un écran l'explique et propose
  de réessayer, au lieu de la page d'erreur du navigateur.
- **Rôles** (`src/auth/roles.ts`) : les rôles du realm (`realm_access.roles`).
  `admin` est un composite qui inclut `collaborator` ; les deux sont testés,
  comme à la gateway. Un compte sans l'un des deux voit « Accès refusé » et un
  bouton pour changer de compte.
- **Mise en page** (`src/layout/AppLayout.tsx`) : menu latéral sombre (tiroir
  sur petit écran), barre du haut avec le rôle, l'utilisateur et la
  déconnexion.
- **Produits** (`src/pages/products/`, `C15`) : tout le catalogue, brouillons
  et produits archivés compris, sur l'API admin de `catalog-service` (`C04`).
  Recherche (titre, slug ou SKU, envoyée quand on arrête de taper), puces de
  statut avec leur compteur, marque, catégorie (sous-catégories comprises),
  tri par titre ou dernière modification, pagination côté serveur. Les
  filtres sont dans l'adresse, en français (`/products?statut=brouillon&page=2`) :
  un rechargement, le bouton retour ou un lien envoyé retombent sur la même
  vue. Un tableau MUI plutôt que le DataGrid de MUI X : le tri et la pagination
  se font déjà côté serveur, et c'est une dépendance lourde de moins.
- **Fiche produit** (`/products/nouveau` et `/products/{id}`, `C16`) : titre,
  slug, description en texte riche, caractéristiques (les clés déjà utilisées
  dans la catégorie sont proposées), marque, catégorie, TVA et univers. Le
  statut suit les règles de `C04` : publier demande une variante, un produit
  ne revient jamais en brouillon, seul un brouillon se supprime. Quitter la
  fiche avec des modifications non enregistrées demande confirmation.
  L'éditeur (TipTap, environ 450 ko) est chargé à part, à l'ouverture d'une
  fiche (`LazyProductFormPage`) : le reste du back-office ne le télécharge pas.
- **Variantes** (section de la fiche produit, `C17`) : prix HT, TTC (remise,
  écotaxe et TVA comprises, calculé comme `catalog-service`), marge et stock
  de chacune. On en ajoute une (une liste par attribut, donc jamais « Noir +
  Blanc »), on la modifie sans jamais envoyer son stock (il passe par
  l'inventaire), et on ne la supprime que sur un brouillon. « Générer les
  combinaisons » prépare les variantes manquantes à partir des valeurs
  cochées, avec un SKU proposé (`CLAVIER-K2-NOIR-AZERTY`) et un prix commun ;
  l'API n'ayant pas de création groupée, elles sont créées une par une et les
  refus sont listés avec leur raison. 50 combinaisons au plus à la fois.
- **Inventaire** (`/inventory`, `C20`) : le stock exact de chaque variante,
  tous statuts de produit confondus, sur l'API de stock de `catalog-service`
  (`C07`). Un bandeau compte les variantes à ou sous leur seuil, une puce les
  liste seules ; recherche par titre ou SKU, pagination côté serveur, filtres
  dans l'adresse (`/inventory?alertes=oui&q=g915`). « Ajuster le stock »
  envoie un **écart** (entrée ou sortie), jamais un stock final : une commande
  payée pendant que la fenêtre est ouverte garde sa vente ; une sortie plus
  grande que le stock est refusée avant l'envoi, et par le service si le stock
  a baissé entre-temps (la liste se recharge alors). Le seuil d'alerte se
  modifie à part. Pas d'historique des mouvements : le service ne garde que le
  niveau actuel.
- **Référentiels** (`src/pages/references/`, `C19`, `C17`) : marques,
  catégories (en arbre), univers, taux de TVA et attributs avec leurs valeurs
  (renommer une valeur la garde sur ses variantes ; une valeur utilisée ne se
  retire pas), un onglet chacun, l'onglet ouvert dans l'adresse
  (`/references?onglet=attributs`).
- **Accès MCP** (`src/pages/mcp/`, `M04`, administrateurs) : créer un jeton
  (affiché une seule fois), voir ses portées et sa dernière utilisation, le
  révoquer.
- **Collaborateurs** (`src/pages/collaborators/`, `U08`, administrateurs) :
  inviter un compte avec un mot de passe temporaire, changer son rôle, le
  désactiver ou le réactiver. Jamais sur son propre compte, comme l'API.
- **Paramètres** (`src/pages/settings/`, `U08`, administrateurs) : coordonnées,
  mentions légales et frais de port de `U05` ; quitter l'écran avec des
  modifications non enregistrées demande confirmation. **Limite connue :** les
  frais de port enregistrés ici ne sont pas encore lus par le calcul des
  commandes : `ShippingService` d'order-service (`e-commerce-BACK`) garde ses
  montants codés en dur tant qu'il ne lit pas `/api/admin/store-settings`.
- **Thème** (`src/theme.ts`) : les couleurs, la typographie (Manrope et
  JetBrains Mono, chargées depuis `@fontsource`, sans CDN) et les rayons de la charte
  `DESIGN-log.md`, partagée avec l'application mobile. Thème clair seulement
  pour l'instant.

Les tests couvrent les rôles, le menu selon le rôle, les routes (page
« bientôt », page réservée aux administrateurs, adresse inconnue, déconnexion,
compte client refusé) et le client d'API.
