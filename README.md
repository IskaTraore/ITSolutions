# ITSOLUTIONS

Plateforme SaaS de gestion centralisée de routeurs MikroTik : Mikhmon en ligne, VPN L2TP, Wallet et abonnements mensuels.

## Architecture

```
frontend/   Next.js 16 (App Router) - interface glassmorphism
backend/    Node.js / Express 5 - API REST
            PostgreSQL + Prisma - base de données
```

## VPN L2TP/IPsec — architecture

Le backend **ne déploie pas le serveur VPN** : il en gère uniquement le
**provisionnement**. Le tunnel lui-même est servi par une infrastructure séparée.

| Rôle | Qui | Détail |
|---|---|---|
| Provisionnement | Backend | Alloue les IP VPN `10.8.0.0/16` (`allocateVpnIp`), crée les identifiants L2TP (user, mot de passe, IP), les enregistre en base et génère le script RouterOS. |
| Terminaison du tunnel | Serveur VPN externe | Machine avec IP publique exécutant un serveur L2TP/IPsec (ex. `xl2tpd` + `strongSwan` sous Linux, ou un RouterOS CHR). C'est elle qui répond aux MikroTik sur UDP 1701 (+ 500/4500 avec IPsec). |
| Extrémité cliente | MikroTik du client | Exécute le script généré (client L2TP) pour rejoindre le serveur VPN. |

Le backend doit pouvoir **joindre les routeurs via le VPN** (plage `10.8.0.0/16`) :
l'endpoint `POST /api/routers/:id/ping` pingue l'IP VPN du routeur depuis le
serveur backend (le backend est conçu pour être sur le réseau du serveur VPN).

### Alignement des adresses IP

Le backend alloue les IP `10.8.0.x` et les enregistre en base. Pour que ces IP
correspondent à la réalité du réseau, le serveur L2TP/IPsec doit :

1. Utiliser la **même plage** `10.8.0.0/16` (`10.8.0.1` réservé au serveur).
2. Distribuer les IP **de la même façon que le backend** (ou au minimum dans la
   même plage), sinon les IP en base ne reflètent pas les IP réellement utilisées.

### Variables d'environnement (backend)

| Variable | Rôle | Défaut |
|---|---|---|
| `VPN_SERVER` | **Adresse (hôte) du serveur VPN** que les routeurs doivent joindre. C'est elle qui apparaît dans `connect-to` du script et dans les identifiants VPN en base. | `vpn.itsolutions.tld` |
| `VPN_IPSEC_SECRET` | Secret partagé IPsec du tunnel L2TP/IPsec. Vide = L2TP seul (non chiffré). Renseigné = le script intègre l'IPsec (`ipsec-secret` natif sur RouterOS 7.10+, peer IPsec manuel sur 6.x-7.9). | vide |

## Démarrage rapide

### 1. Base de données (PostgreSQL)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

`npm run dev` démarre automatiquement la base de données (relance Docker Desktop si
nécessaire) puis le serveur avec rechargement automatique. Le serveur écoute sur
`http://localhost:4200`.

> ⚠️ Le port 4200 est utilisé (et non 4000) car Docker Desktop réserve les ports
> 4000/4001 pour son API interne : une application sur 4000 ne reçoit pas ses
> requêtes HTTP (erreur CORS « status (null) »).

Commandes utiles :

| Commande | Rôle |
|---|---|
| `npm run dev` | Base de données + serveur (recommandé) |
| `npm run dev:server` | Serveur seul (si la base tourne déjà) |
| `npm run db:start` | Démarrer/relancer uniquement la base |
| `npm run build` | Vérifier la syntaxe + client Prisma |
| `npm run prisma:migrate` | Appliquer les migrations |
| `npm run db:seed` | Créer l'administrateur par défaut |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface est disponible sur `http://localhost:3000`.

## Documentation

- `VPN_SERVER_SETUP.md` : installation pas à pas du serveur L2TP/IPsec (VPS)
- `DOCUMENTATION_ITSOLUTIONS.md` : documentation produit
- `ITSOLUTIONS_DOCUMENTATION_EXHAUSTIVE.md` : spec technique complète (design system, modèles, API)
