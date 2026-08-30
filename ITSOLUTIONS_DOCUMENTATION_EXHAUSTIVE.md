# ITSOLUTIONS — Documentation Exhaustive

*Design system pixel par pixel · Modèles de données · Logique métier · API*

**Stack :** Next.js (frontend) · Node.js/Express (backend) · PostgreSQL + Prisma · Style Glassmorphism

---

## Sommaire

- **Partie I — Design System**
  1. Fondations visuelles
  2. Composants UI (specs pixel)
  3. Pages — layout détaillé
  4. Responsive & accessibilité
- **Partie II — Modèles de données** (schéma Prisma exhaustif)
- **Partie III — Logique métier**
- **Partie IV — API Backend** (routes Node.js/Express)
- **Partie V — Routes Frontend** (Next.js)

---

# PARTIE I — DESIGN SYSTEM

## 1. Fondations visuelles

### 1.1 Palette de couleurs

**Base (dark theme, thème par défaut) :**

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#05060A` | Fond de page (arrière-plan le plus profond) |
| `--bg-elevated` | `#0B0D14` | Fond des sections (au-dessus du base) |
| `--surface-glass` | `rgba(255,255,255,0.06)` | Fond des cartes vitrées |
| `--surface-glass-hover` | `rgba(255,255,255,0.10)` | Fond carte vitrée au survol |
| `--border-glass` | `rgba(255,255,255,0.12)` | Bordure des surfaces vitrées |
| `--border-glass-strong` | `rgba(255,255,255,0.20)` | Bordure accentuée (focus, hover) |

**Texte :**

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#F5F6FA` | Titres, texte principal |
| `--text-secondary` | `#A3A8BD` | Texte secondaire, descriptions |
| `--text-muted` | `#6B7086` | Légendes, placeholders |
| `--text-disabled` | `#4A4E5E` | Texte désactivé |

**Accents (utilisés avec parcimonie) :**

| Token | Hex | Usage |
|---|---|---|
| `--accent-primary` | `#5B7CFA` | CTA principal, liens, focus ring |
| `--accent-primary-hover` | `#7191FF` | Hover du CTA principal |
| `--accent-secondary` | `#B084F5` | Dégradés, accents secondaires (violet) |
| `--gradient-brand` | `linear-gradient(135deg, #5B7CFA 0%, #B084F5 100%)` | Boutons primaires, logo, orbes de fond |

**Statuts :**

| Token | Hex | Usage |
|---|---|---|
| `--status-active` | `#3DD68C` | Routeur actif / abonnement valide |
| `--status-active-bg` | `rgba(61,214,140,0.12)` | Fond badge actif |
| `--status-pending` | `#F5B04D` | En attente (paiement, provisioning) |
| `--status-pending-bg` | `rgba(245,176,77,0.12)` | Fond badge en attente |
| `--status-expired` | `#F5636B` | Expiré / suspendu |
| `--status-expired-bg` | `rgba(245,99,107,0.12)` | Fond badge expiré |
| `--status-info` | `#5B9DF5` | Information neutre |

### 1.2 Typographie

**Police :** `Geist` (ou `Inter` en fallback) pour l'ensemble de l'interface. Police monospace `Geist Mono` (ou `JetBrains Mono`) pour les scripts MikroTik, ports, adresses IP et blocs de code.

| Token | Taille | Line-height | Weight | Usage |
|---|---|---|---|---|
| `--text-display` | 48px | 56px | 700 | Titre landing page (hero) |
| `--text-h1` | 32px | 40px | 700 | Titre de page (dashboard, sections) |
| `--text-h2` | 24px | 32px | 600 | Titre de carte / bloc |
| `--text-h3` | 18px | 26px | 600 | Sous-titre |
| `--text-body-lg` | 16px | 24px | 400 | Corps de texte principal |
| `--text-body` | 14px | 20px | 400 | Corps de texte standard |
| `--text-caption` | 12px | 16px | 500 | Légendes, labels, badges |
| `--text-mono` | 13px | 20px | 500 | Scripts, ports, IP (police mono) |

Letter-spacing : `-0.02em` sur `--text-display` et `--text-h1` ; `0` sur le reste ; `0.04em` + majuscules sur `--text-caption` utilisé en label de formulaire.

### 1.3 Grille & espacements

Échelle basée sur un pas de **4px** :

| Token | Valeur |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-20` | 80px |

**Grille de page :** container max-width `1280px`, marges latérales `24px` (mobile) / `48px` (desktop). Grille 12 colonnes, gouttière `24px`.

### 1.4 Rayons de bordure

| Token | Valeur | Usage |
|---|---|---|
| `--radius-sm` | 8px | Badges, petits boutons |
| `--radius-md` | 12px | Champs de formulaire, boutons standards |
| `--radius-lg` | 16px | Cartes |
| `--radius-xl` | 24px | Grandes cartes, modales |
| `--radius-full` | 9999px | Pills de statut, avatars |

### 1.5 Élévation & ombres

| Token | Valeur |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.24)` |
| `--shadow-md` | `0 8px 24px rgba(0,0,0,0.32)` |
| `--shadow-lg` | `0 16px 48px rgba(0,0,0,0.40)` |
| `--shadow-glow-primary` | `0 0 32px rgba(91,124,250,0.35)` (halo au hover des CTA) |

### 1.6 Glassmorphism — tokens précis

| Propriété | Valeur | Élément |
|---|---|---|
| `backdrop-filter` | `blur(20px) saturate(140%)` | Carte standard |
| `backdrop-filter` | `blur(32px) saturate(160%)` | Modale / navbar flottante |
| `background` | `var(--surface-glass)` | Fond carte |
| `border` | `1px solid var(--border-glass)` | Contour carte |
| `box-shadow` | `var(--shadow-md)` | Élévation carte |
| Fond de page | 3 orbes radiaux flous (`blur(120px)`), couleurs `--accent-primary` / `--accent-secondary` à `opacity: 0.25`, positionnés en absolu derrière le contenu | Ambiance générale |

**Règle d'usage :** jamais plus de 3 niveaux de superposition vitrée simultanés (fond → carte → modale) pour préserver la lisibilité et la performance de rendu.

### 1.7 Breakpoints responsive

| Breakpoint | Largeur |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

En dessous de `md` : le `backdrop-filter` des cartes secondaires est réduit à `blur(8px)` pour préserver la performance ; la sidebar admin devient un menu burger plein écran.

### 1.8 Animations & transitions

| Token | Valeur | Usage |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transition par défaut |
| `--duration-fast` | 150ms | Hover, focus |
| `--duration-base` | 250ms | Ouverture de carte, changement de statut |
| `--duration-slow` | 400ms | Ouverture de modale, transition de page |
| Animation statut | Pulse discret (`opacity 0.6 → 1`, 1.5s, infini) sur badge « En attente » | Provisioning en cours |
| Animation succès | Scale `0.9 → 1` + fade-in (`250ms`) | Confirmation de paiement / connexion VPN établie |

---

## 2. Composants UI — spécifications pixel

### 2.1 Boutons

| Variant | Fond | Texte | Hauteur | Padding H | Radius | Border |
|---|---|---|---|---|---|---|
| Primary | `--gradient-brand` | `#FFFFFF` | 44px | 24px | `--radius-md` (12px) | none |
| Secondary | `--surface-glass` | `--text-primary` | 44px | 24px | 12px | `1px solid var(--border-glass)` |
| Ghost | transparent | `--text-secondary` | 40px | 16px | 12px | none |
| Danger | `#F5636B` | `#FFFFFF` | 44px | 24px | 12px | none |

**États :** hover → `--shadow-glow-primary` + luminosité +8% ; active → scale `0.98` ; disabled → opacité `0.4`, curseur `not-allowed` ; loading → spinner 16px remplaçant le label, largeur figée.

Taille icône dans bouton : 18px, gap texte/icône : 8px.

### 2.2 Champs de formulaire

- Hauteur : 48px · Padding horizontal : 16px · Radius : 12px
- Fond : `rgba(255,255,255,0.04)` · Bordure : `1px solid var(--border-glass)`
- Focus : bordure `1px solid var(--accent-primary)` + `box-shadow: 0 0 0 3px rgba(91,124,250,0.20)`
- Erreur : bordure `1px solid var(--status-expired)`, message d'erreur en `--text-caption` couleur `--status-expired`, `4px` sous le champ
- Label : `--text-caption`, majuscules, `--text-secondary`, `8px` au-dessus du champ
- Placeholder : `--text-muted`

### 2.3 Cartes glassmorphism

**Carte routeur (dashboard) — dimensions :**

- Largeur : fluide (grille 3 colonnes desktop / 1 colonne mobile), min-width 320px
- Padding interne : 24px
- Radius : `--radius-lg` (16px)
- En-tête : nom du routeur (`--text-h3`) + badge de statut aligné à droite
- Corps : liste de métadonnées (RouterOS version, URL Mikhmon, date d'expiration) en `--text-body`, icône 16px devant chaque ligne, gap 8px
- Pied : bouton secondaire « Détails » pleine largeur, hauteur 40px

**Carte Wallet :**

- Montant affiché en `--text-display` réduit à 36px, couleur dégradé `--gradient-brand` (`background-clip: text`)
- Bouton « Recharger » primary, pleine largeur, sous le montant
- Historique des 3 dernières transactions en liste compacte (`--text-body`, 14px), séparateur `1px solid var(--border-glass)`

### 2.4 Badges de statut

| Statut | Fond | Texte | Icône |
|---|---|---|---|
| Actif | `--status-active-bg` | `--status-active` | ● plein |
| En attente | `--status-pending-bg` | `--status-pending` | ◐ animé (pulse) |
| Expiré | `--status-expired-bg` | `--status-expired` | ● creux |
| Suspendu | `--status-expired-bg` | `--status-expired` | ⏸ |

Dimensions : hauteur 24px, padding horizontal 10px, radius `--radius-full`, `--text-caption` en gras (600).

### 2.5 Navigation

**Navbar flottante (desktop) :**

- Position `fixed`, `top: 16px`, centrée, largeur `calc(100% - 48px)` max `1280px`
- Hauteur : 64px · Radius : `--radius-xl` (24px) · glassmorphism niveau modale
- Logo à gauche (32px de haut), liens de navigation centrés, avatar + solde Wallet à droite

**Sidebar dashboard (desktop, ≥ lg) :**

- Largeur fixe : 260px · Fond `--bg-elevated` avec léger glass (`blur(12px)`)
- Items de menu : hauteur 44px, radius 10px, icône 20px + label `--text-body`, item actif → fond `--surface-glass` + barre verticale 3px `--accent-primary` à gauche

### 2.6 Modales

- Largeur : 480px (confirmation) / 640px (formulaire, ex. ajout routeur) / 800px (détails)
- Radius : `--radius-xl` (24px) · glassmorphism niveau modale (`blur(32px)`)
- Overlay : `rgba(5,6,10,0.72)` + `backdrop-filter: blur(4px)`
- Padding interne : 32px · Header : `--text-h2` + bouton fermeture (icône 20px, top-right, 16px de marge)
- Animation d'entrée : fade + translateY(12px→0), `--duration-slow`

### 2.7 Tableaux (admin)

- Ligne : hauteur 56px · Padding horizontal cellule : 16px
- En-tête : `--text-caption` majuscules `--text-secondary`, fond `rgba(255,255,255,0.03)`, hauteur 44px, sticky au scroll
- Ligne au survol : fond `--surface-glass-hover`
- Séparateurs : `1px solid var(--border-glass)` uniquement (pas de bordure verticale)

### 2.8 Toasts / notifications

- Position : `top-right`, largeur 360px
- Radius 12px, glassmorphism niveau carte, bordure colorée à gauche 3px selon le type (succès `--status-active`, erreur `--status-expired`, info `--status-info`)
- Durée d'affichage : 4s (succès/info), persistant jusqu'à fermeture manuelle (erreur critique)
- Animation : slide-in depuis la droite (`--duration-base`) + fade-out

### 2.9 Loaders / skeletons

- Skeleton : fond `rgba(255,255,255,0.06)`, shimmer animé (dégradé `rgba(255,255,255,0.12)` traversant en 1.6s, boucle infinie)
- Spinner : anneau 2px, couleur `--accent-primary`, rotation 800ms linéaire infinie

---

## 3. Pages — layout détaillé

### 3.1 Landing page

- **Hero** : titre `--text-display`, sous-titre `--text-body-lg` `--text-secondary`, deux CTA (Primary « Créer un compte », Ghost « Voir la documentation »), fond avec orbes glassmorphism animés en parallax léger
- **Section « 3 piliers »** : 3 cartes glassmorphism en grille (Mikhmon en ligne / VPN sécurisé / Gestion simplifiée), icône 40px, titre `--text-h3`, description `--text-body`
- **Section tarifs** : carte unique mettant en avant « 23 000 FC / routeur / mois », liste de features avec icônes check
- **Footer** : liens légaux, contact support, copyright

### 3.2 Register / Login

- Carte centrée, largeur 420px, glassmorphism niveau carte, sur fond avec orbes
- Champs : email, mot de passe (register : + confirmation), bouton primary pleine largeur
- Lien secondaire vers l'action opposée (« Déjà un compte ? Se connecter »)
- Register : encart d'information après soumission (« Vérifiez votre email »)

### 3.3 Dashboard utilisateur

- Layout : sidebar (260px) + zone de contenu fluide, padding 32px
- Header de zone : titre `--text-h1` « Mes routeurs » + bouton primary « Ajouter routeur » aligné à droite
- Grille de cartes routeur (3.3 → voir 2.3), 3 colonnes desktop / 2 tablette / 1 mobile, gap 24px
- État vide : illustration centrée + message + CTA « Ajouter mon premier routeur »

### 3.4 Wallet / Recharge

- Carte Wallet en tête de page (voir 2.3)
- Formulaire de recharge : sélection de montant (pills prédéfinies 10 000 / 25 000 / 50 000 FC + champ libre), sélection du moyen de paiement (Mobile Money / carte), bouton primary « Recharger »
- Historique complet des transactions en tableau (voir 2.7) : date, type (crédit/débit), montant, solde après opération, statut

### 3.5 Ajout de routeur (wizard multi-étapes)

Modale ou page dédiée, wizard à 4 étapes avec indicateur de progression en haut (4 points reliés par une ligne, étape active = `--accent-primary`) :

1. **Version RouterOS** : deux cartes sélectionnables (6.x–7.9 / 7.10+), radio custom en glassmorphism
2. **Nom du routeur** : champ texte + validation en direct (disponibilité du nom, format autorisé)
3. **Récapitulatif & paiement** : coût affiché, solde Wallet affiché, bouton de confirmation (débit automatique)
4. **Script généré** : bloc de code (police mono, fond `--bg-elevated`, bouton « Copier » en overlay top-right), rappel des étapes suivantes (coller dans Winbox)

### 3.6 Détails routeur

- En-tête : nom + badge statut + actions (Renouveler, Supprimer en Ghost/Danger)
- Bloc « Connexion » : URL Mikhmon, URL Webfig, port API, port Winbox — chaque valeur en `--text-mono` avec bouton copier (icône 14px) au survol
- Bloc « Abonnement » : date de création, date d'expiration, statut, toggle « Renouvellement automatique »
- Bloc « Script MikroTik » : script complet re-consultable, bouton copier

### 3.7 Renouvellement

- Liste des routeurs avec statut et date d'expiration, tri par urgence (expire bientôt en premier)
- Action rapide « Renouveler » par ligne + action groupée « Renouveler tout »

### 3.8 Mikhmon workspace

- Redirection sécurisée (lien signé/token) vers l'URL du workspace Mikhmon (`https://votrenom.itsolutions.tld`), ouverte dans un nouvel onglet — pas d'iframe pour éviter les restrictions CSP/X-Frame-Options
- Page intermédiaire glassmorphism avec rappel des identifiants et bouton « Ouvrir Mikhmon »

### 3.9 Back-office admin

- **Dashboard admin** : cartes de métriques (utilisateurs actifs, routeurs actifs, revenu du mois, tickets en attente), graphique de croissance (recharts, style glassmorphism)
- **Gestion utilisateurs** : tableau avec recherche, filtre par statut, actions (suspendre, voir détails)
- **Gestion routeurs** : tableau global tous utilisateurs confondus, filtre par statut/version RouterOS
- **Gestion paiements** : tableau des transactions, filtre par statut (validé/en attente/échoué), export CSV
- **Audit** : journal chronologique des actions sensibles (connexion admin, modification manuelle, suspension), format liste avec timestamp, acteur, action, cible

---

## 4. Responsive & accessibilité

- Contraste minimum : `4.5:1` pour le texte body sur fond glassmorphism (vérifié malgré la transparence — d'où l'usage de `--text-primary` quasi blanc)
- Cibles tactiles : 44×44px minimum sur mobile
- Navigation clavier : focus ring visible (`box-shadow` `--accent-primary`) sur tous les éléments interactifs
- `prefers-reduced-motion` : désactivation des animations de pulse/shimmer/parallax si activé côté utilisateur

---

# PARTIE II — MODÈLES DE DONNÉES

Schéma Prisma exhaustif (PostgreSQL).

```prisma
// ==================== UTILISATEURS ====================

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  username        String    @unique
  passwordHash    String
  emailVerified   Boolean   @default(false)
  role            UserRole  @default(USER)
  status          UserStatus @default(ACTIVE)
  autoRenew       Boolean   @default(false)
  phone           String?   // pour notifications WhatsApp
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  wallet          Wallet?
  routers         Router[]
  sessions        Session[]
  notifications   Notification[]
  auditLogs       AuditLog[]     @relation("ActorLogs")
}

enum UserRole {
  USER
  ADMIN
  SUPPORT
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  PENDING_VERIFICATION
}

model Session {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  tokenHash     String    @unique
  userAgent     String?
  ipAddress     String?
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
}

// ==================== WALLET ====================

model Wallet {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  balance         Int       @default(0) // en FCFA, entier (pas de centimes)
  currency        String    @default("XOF")
  updatedAt       DateTime  @updatedAt

  transactions    WalletTransaction[]
}

model WalletTransaction {
  id              String    @id @default(cuid())
  walletId        String
  wallet          Wallet    @relation(fields: [walletId], references: [id])
  type            TransactionType
  amount          Int       // positif = crédit, négatif = débit
  balanceAfter    Int
  status          TransactionStatus @default(COMPLETED)
  idempotencyKey  String    @unique // clé garantissant la non-duplication
  relatedRouterId String?
  paymentId       String?
  payment         Payment?  @relation(fields: [paymentId], references: [id])
  description     String
  createdAt       DateTime  @default(now())
}

enum TransactionType {
  RECHARGE
  ROUTER_CREATION_DEBIT
  ROUTER_RENEWAL_DEBIT
  REFUND
  ADMIN_ADJUSTMENT
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}

// ==================== PAIEMENTS ====================

model Payment {
  id              String    @id @default(cuid())
  userId          String
  amount          Int
  method          PaymentMethod
  provider        String    // ex: "orange_money", "moov_money", "carte"
  providerRef     String?   @unique // référence transaction côté PSP
  status          PaymentStatus @default(PENDING)
  createdAt       DateTime  @default(now())
  confirmedAt     DateTime?

  walletTransactions WalletTransaction[]
}

enum PaymentMethod {
  MOBILE_MONEY
  CARD
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
  CANCELLED
}

// ==================== ROUTEURS ====================

model Router {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id])
  name                String    @unique // ex: "mikhmon1" — slug DNS-safe
  routerOsFamily      RouterOsFamily
  status              RouterStatus @default(PENDING_PROVISIONING)

  vpnCredential       VpnCredential?
  mikhmonWorkspaceId  String?
  mikhmonWorkspace    MikhmonWorkspace? @relation(fields: [mikhmonWorkspaceId], references: [id])

  apiPort             Int?      @unique // port externe 40xxx
  winboxPort          Int?      @unique // port externe 50xxx

  subscription        Subscription?

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}

enum RouterOsFamily {
  V6_TO_7_9    // Mikhmon V1
  V7_10_PLUS   // Mikhmon V2
}

enum RouterStatus {
  PENDING_PROVISIONING
  PROVISIONING
  ACTIVE
  EXPIRED
  SUSPENDED
  FAILED
}

model VpnCredential {
  id          String    @id @default(cuid())
  routerId    String    @unique
  router      Router    @relation(fields: [routerId], references: [id])
  vpnServer   String    // ex: vpn.itsolutions.tld
  username    String    @unique
  passwordHash String
  vpnIp       String?   @unique // ex: 10.8.x.x, assignée à la connexion
  protocol    String    @default("L2TP")
  createdAt   DateTime  @default(now())
}

// ==================== MIKHMON ====================

model MikhmonWorkspace {
  id              String    @id @default(cuid())
  name            String    @unique // sous-domaine, ex: mikhmon1
  version         RouterOsFamily
  url             String    @unique // https://{name}.itsolutions.tld
  webfigUrl       String
  adminUsername   String    @default("admin")
  adminPasswordChanged Boolean @default(false)
  createdAt       DateTime  @default(now())

  routers         Router[]
}

// ==================== ABONNEMENTS ====================

model Subscription {
  id              String    @id @default(cuid())
  routerId        String    @unique
  router          Router    @relation(fields: [routerId], references: [id])
  monthlyPrice    Int       @default(23000) // FCFA
  startedAt       DateTime  @default(now())
  expiresAt       DateTime
  autoRenew       Boolean   @default(false)
  status          SubscriptionStatus @default(ACTIVE)
  lastRenewedAt   DateTime?

  renewals        SubscriptionRenewal[]
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRING_SOON  // J-3
  EXPIRED
}

model SubscriptionRenewal {
  id              String    @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  amount          Int
  method          RenewalMethod
  createdAt       DateTime  @default(now())
}

enum RenewalMethod {
  AUTO
  MANUAL
}

// ==================== NOTIFICATIONS ====================

model Notification {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  channel     NotificationChannel
  type        String    // "EXPIRATION_J3", "PAYMENT_CONFIRMED", "ROUTER_ACTIVE", ...
  payload     Json
  sentAt      DateTime?
  status      NotificationStatus @default(PENDING)
  createdAt   DateTime  @default(now())
}

enum NotificationChannel {
  EMAIL
  WHATSAPP
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}

// ==================== AUDIT ====================

model AuditLog {
  id          String    @id @default(cuid())
  actorId     String?
  actor       User?     @relation("ActorLogs", fields: [actorId], references: [id])
  action      String    // "ROUTER_CREATED", "USER_SUSPENDED", "MANUAL_ADJUSTMENT", ...
  targetType  String    // "Router", "User", "Payment", ...
  targetId    String
  metadata    Json?
  createdAt   DateTime  @default(now())
}
```

### Relations principales (vue textuelle)

```
User 1───1 Wallet 1───N WalletTransaction
User 1───N Router 1───1 VpnCredential
Router N───1 MikhmonWorkspace
Router 1───1 Subscription 1───N SubscriptionRenewal
User 1───N Payment 1───N WalletTransaction
User 1───N Notification
User 1───N AuditLog (en tant qu'acteur)
```

---

# PARTIE III — LOGIQUE MÉTIER

## 1. Authentification & sécurité

- Mot de passe hashé (argon2id), jamais stocké en clair
- Session basée sur JWT signé, stocké en cookie `httpOnly`, `secure`, `sameSite=strict`, durée de vie 7 jours glissants
- Vérification d'email obligatoire avant accès au dashboard (statut `PENDING_VERIFICATION` bloque la création de routeur)
- Middleware `requireAuth` sur toutes les routes `/api/*` sauf `auth/*` et pages publiques
- Middleware `requireAdmin` sur toutes les routes `/api/admin/*`
- Rate limiting : 5 tentatives de connexion / 15 minutes / IP, verrouillage progressif

## 2. Wallet — règles de recharge, débit, idempotence

- Le solde est **toujours un entier** en FCFA (pas de décimales)
- Toute opération de débit/crédit passe par une **transaction atomique** en base (Prisma `$transaction`) : mise à jour du solde + création de la ligne `WalletTransaction` sont indissociables
- Chaque opération financière porte une **clé d'idempotence** unique (générée côté client pour les actions déclenchées par formulaire, ex. `create-router-{routerId}-{timestamp}`) — une requête rejouée avec la même clé ne débite jamais deux fois
- Une recharge n'est créditée qu'après confirmation du PSP (webhook `Payment.status = CONFIRMED`) — jamais de crédit optimiste avant confirmation
- Si le solde est insuffisant lors d'une tentative de création/renouvellement de routeur, l'opération est bloquée **avant** toute écriture en base, avec message explicite du montant manquant

## 3. Ajout & provisioning d'un routeur — séquence complète

```
POST /api/routers
  ↓
1. Authentification (JWT)
  ↓
2. Validation des données (nom slug DNS-safe, unique, version RouterOS valide)
  ↓
3. Vérification idempotence (clé déjà traitée ? → retour du résultat existant)
  ↓
4. Vérification du solde Wallet (≥ 23 000 FC)
  ↓
5. Transaction atomique DB :
     a. Débit du Wallet (23 000 FC)
     b. Création du Router (status = PENDING_PROVISIONING)
     c. Création de la Subscription (expiresAt = now + 30 jours)
     d. Allocation des ports (voir §4)
     e. Génération des identifiants VPN (voir §5)
     f. Création ou réutilisation du MikhmonWorkspace (voir §6)
  ↓
6. Génération du script MikroTik (voir §7)
  ↓
7. Retour au frontend : script + informations de connexion
  ↓
8. Router.status = ACTIVE dès que le script est généré (le VPN se connectera au premier boot du script — le statut évolue ensuite selon la connexion réelle détectée par le service de monitoring)
```

Si une étape échoue après le débit (5.a), la transaction complète est annulée (rollback) — le Wallet n'est jamais débité si le routeur n'est pas créé.

## 4. Allocation des ports (algorithme)

- Deux pools de ports dédiés : API → `40000–49999`, Winbox → `50000–59999`
- À chaque provisioning, le service sélectionne le **premier port libre** de chaque pool (`Router.apiPort` et `Router.winboxPort` sont `@unique`, garantissant l'absence de collision au niveau base)
- Les ports libérés par un routeur supprimé sont remis dans le pool disponible

## 5. Génération des identifiants VPN

- `username` unique généré côté serveur (jamais choisi par l'utilisateur ni par le frontend), ex. `router_{id-court}`
- `password` généré aléatoirement (32 caractères, haute entropie), stocké hashé, communiqué en clair une seule fois dans le script généré
- `vpnIp` attribuée depuis un pool interne (`10.8.0.0/16`), unique par routeur
- Protocole : **L2TP** (port UDP 1701), conformément au comportement observé chez WiFiZoneVPN

## 6. Création / réutilisation du workspace Mikhmon

- Règle de version : RouterOS `6.x–7.9` → `MikhmonWorkspace` de type `V6_TO_7_9` ; RouterOS `7.10+` → `V7_10_PLUS`
- Si l'utilisateur ne possède **aucun** workspace de la version requise → création d'un nouveau workspace, nommé comme le routeur (si c'est son premier routeur) ou selon un nom choisi
- Si l'utilisateur possède **déjà** un workspace compatible → le routeur suivant compatible **doit réutiliser** ce workspace (pas de duplication inutile)
- Le mot de passe admin par défaut du workspace (`admin` / mot de passe généré) doit être signalé comme **à changer immédiatement**, avec `adminPasswordChanged` tracké pour relance si resté `false` après 48h

## 7. Génération du script MikroTik

- Script généré dynamiquement côté serveur (jamais stocké en clair de façon permanente au-delà de la session de génération), injectant : adresse du serveur VPN, identifiants générés (§5), configuration L2TP client
- Le script doit être **auto-suffisant** : son exécution seule dans le terminal RouterOS suffit à établir la connexion, sans étape manuelle supplémentaire
- Sécurité : le script n'expose aucune information au-delà de ce qui est strictement nécessaire à la connexion (pas de secrets globaux de la plateforme)

## 8. Abonnement — expiration, renouvellement, alertes

- **Durée** : 30 jours glissants à partir de `startedAt` ou du dernier renouvellement
- **Job planifié (cron nocturne, ex. 2h du matin)** :
  1. Marquer `EXPIRING_SOON` les abonnements à J-3
  2. Envoyer notification (email + WhatsApp si configuré) à J-3 et au jour J
  3. À expiration : si `autoRenew = true` et solde Wallet suffisant → renouvellement automatique (débit + `expiresAt += 30j` + notification de confirmation)
  4. Si `autoRenew = false` ou solde insuffisant → `Subscription.status = EXPIRED`, `Router.status = SUSPENDED`
- **Renouvellement manuel** : réactive immédiatement le routeur (`status = ACTIVE`) dès confirmation du débit
- **Effets de la suspension** : VPN déconnecté côté serveur, accès Winbox/API coupé ; **l'URL Mikhmon reste accessible** (le workspace n'est pas supprimé)

## 9. Machine à états du routeur

```
PENDING_PROVISIONING → PROVISIONING → ACTIVE ⇄ SUSPENDED (expiration/réactivation)
                                         ↓
                                      EXPIRED (si non renouvelé après délai de grâce)
       (à tout moment) → FAILED (échec technique, nécessite intervention support)
```

## 10. Administration

- **Utilisateurs** : recherche, filtre par statut, suspension (bloque login + toute action, ne supprime rien), consultation des routeurs/wallet liés
- **Routeurs** : vue globale tous utilisateurs, filtre par statut/version, action de réattribution de port en cas de conflit détecté
- **Paiements** : vue de toutes les transactions Wallet et Payment, filtre par statut, export CSV, possibilité d'ajustement manuel (`ADMIN_ADJUSTMENT`) tracé en audit
- **Audit** : toute action admin (suspension, ajustement, modification manuelle) crée une entrée `AuditLog` immuable (acteur, action, cible, horodatage, métadonnées)

## 11. Notifications

- Canaux : email (obligatoire), WhatsApp (optionnel, si `User.phone` renseigné)
- Déclencheurs : confirmation de paiement, routeur actif, alerte J-3, alerte jour J, renouvellement confirmé, suspension
- Statut de suivi (`PENDING` / `SENT` / `FAILED`) avec réessai automatique en cas d'échec d'envoi

## 12. Gestion des erreurs

- Toute erreur API retourne un format standard : `{ "error": { "code": "WALLET_INSUFFICIENT_BALANCE", "message": "...", "details": {...} } }`
- Codes principaux : `AUTH_REQUIRED`, `AUTH_INVALID`, `WALLET_INSUFFICIENT_BALANCE`, `ROUTER_NAME_TAKEN`, `IDEMPOTENCY_CONFLICT`, `PROVISIONING_FAILED`, `PORT_ALLOCATION_FAILED`, `SUBSCRIPTION_ALREADY_ACTIVE`
- Le frontend Next.js traduit chaque code en message localisé (français) affiché via toast (voir §2.8 Design System)

## 13. Principe de non-régression

- Toute intervention future doit respecter la structure, le design et les fonctions existantes, et ne modifier que ce qui est strictement nécessaire
- Aucune donnée critique (statuts, montants) ne doit être simulée côté frontend lorsque le backend est disponible

---

# PARTIE IV — API BACKEND (Node.js / Express)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Création de compte |
| POST | `/api/auth/verify-email` | — | Vérification email |
| POST | `/api/auth/login` | — | Connexion, émission JWT |
| POST | `/api/auth/logout` | User | Invalidation de session |
| GET | `/api/me` | User | Profil + solde Wallet |
| GET | `/api/wallet` | User | Détail Wallet + historique |
| POST | `/api/wallet/recharge` | User | Initier une recharge (redirection PSP) |
| POST | `/api/wallet/webhook/:provider` | Signature PSP | Webhook de confirmation de paiement |
| GET | `/api/routers` | User | Liste des routeurs de l'utilisateur |
| POST | `/api/routers` | User | Créer un routeur (voir séquence §III.3) |
| GET | `/api/routers/:id` | User (owner) | Détails d'un routeur |
| POST | `/api/routers/:id/renew` | User (owner) | Renouvellement manuel |
| PATCH | `/api/routers/:id/auto-renew` | User (owner) | Activer/désactiver le renouvellement auto |
| GET | `/api/routers/:id/script` | User (owner) | Récupérer à nouveau le script MikroTik |
| DELETE | `/api/routers/:id` | User (owner) | Suppression (libère les ports) |
| GET | `/api/admin/users` | Admin | Liste des utilisateurs |
| PATCH | `/api/admin/users/:id/suspend` | Admin | Suspension d'un utilisateur |
| GET | `/api/admin/routers` | Admin | Vue globale des routeurs |
| GET | `/api/admin/payments` | Admin | Vue globale des paiements |
| POST | `/api/admin/wallet/:userId/adjust` | Admin | Ajustement manuel du solde |
| GET | `/api/admin/audit-logs` | Admin | Journal d'audit |

---

# PARTIE V — ROUTES FRONTEND (Next.js — App Router)

| Route | Accès | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/register` | Public | Inscription |
| `/login` | Public | Connexion |
| `/dashboard` | Protégée | Liste des routeurs |
| `/dashboard/wallet` | Protégée | Wallet & recharge |
| `/dashboard/routers/new` | Protégée | Wizard d'ajout de routeur |
| `/dashboard/routers/[id]` | Protégée | Détails d'un routeur |
| `/dashboard/renew` | Protégée | Page de renouvellement groupé |
| `/admin` | Admin | Dashboard admin |
| `/admin/users` | Admin | Gestion utilisateurs |
| `/admin/routers` | Admin | Gestion routeurs |
| `/admin/payments` | Admin | Gestion paiements |
| `/admin/audit` | Admin | Journal d'audit |
| `/documentation` | Public | Documentation produit |

Middleware Next.js (`middleware.ts`) : vérifie la présence et la validité du cookie JWT sur `/dashboard/*` et `/admin/*` (avec vérification de rôle pour `/admin/*`), redirection vers `/login` sinon.

---

*Ce document constitue la référence exhaustive du produit ITSOLUTIONS et doit être maintenu en cohérence avec le CAHIER_DES_CHARGES_TECHNIQUE_COMPLET.md et la DOCUMENTATION_ITSOLUTIONS.md déjà produits.*
