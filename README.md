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
- **Thème** (`src/theme.ts`) : les couleurs, la typographie (Manrope, chargée
  depuis le paquet `@fontsource/manrope`, sans CDN) et les rayons de la charte
  `DESIGN-log.md`, partagée avec l'application mobile. Thème clair seulement
  pour l'instant.

Les tests couvrent les rôles, le menu selon le rôle, les routes (page
« bientôt », page réservée aux administrateurs, adresse inconnue, déconnexion,
compte client refusé) et le client d'API.
