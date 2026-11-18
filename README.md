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
| Dire une erreur d'API en français | `errorMessage()` (`src/api/errors.ts`) |
| Titre d'écran et action principale | `PageHeader` |
| Tableau dans son panneau : chargement, erreur avec « Réessayer », liste vide, défilement horizontal | `TableFrame` |
| Formulaire dans une fenêtre, qui garde la saisie si l'enregistrement échoue | `FormDialog` |
| Confirmation d'une action destructrice (bouton jamais rempli, comme le veut la charte) | `ConfirmDialog` |
| Badge d'état avec libellé (`ok`, `neutral`, `danger`) | `StatusBadge` |
| Confirmation d'une action réussie | `useNotify()` (`src/components/Notifications.tsx`) |
| Copier une valeur (jeton, adresse) en le disant sur le bouton | `CopyButton` |
| Une valeur à recopier telle quelle, avec son bouton « Copier » | `CodeLine` |
| « il y a 5 minutes » qui reste juste tant que la page est ouverte | `formatRelative()` et `useNow()` |
| Vérifier un champ comme l'API le fera | `src/lib/validation.ts` |
| Pourcentages, dates, décimaux saisis « 5,5 » | `src/lib/format.ts` |

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
- **Référentiels** (`src/pages/references/`, `C19`) : marques, catégories (en
  arbre), univers et taux de TVA, un onglet chacun, l'onglet ouvert dans
  l'adresse (`/references?onglet=tva`).
- **Accès MCP** (`src/pages/mcp/`, `M04`, administrateurs) : créer un jeton
  (affiché une seule fois), voir ses portées et sa dernière utilisation, le
  révoquer.
- **Collaborateurs** (`src/pages/collaborators/`, `U08`, administrateurs) :
  inviter un compte avec un mot de passe temporaire, changer son rôle, le
  désactiver ou le réactiver. Jamais sur son propre compte, comme l'API.
- **Paramètres** (`src/pages/settings/`, `U08`, administrateurs) : coordonnées,
  mentions légales et frais de port de `U05` ; quitter l'écran avec des
  modifications non enregistrées demande confirmation.
- **Thème** (`src/theme.ts`) : les couleurs, la typographie (Manrope et
  JetBrains Mono, chargées depuis `@fontsource`, sans CDN) et les rayons de la charte
  `DESIGN-log.md`, partagée avec l'application mobile. Thème clair seulement
  pour l'instant.

Les tests couvrent les rôles, le menu selon le rôle, les routes (page
« bientôt », page réservée aux administrateurs, adresse inconnue, déconnexion,
compte client refusé) et le client d'API.
