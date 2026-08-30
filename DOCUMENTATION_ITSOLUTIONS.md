# Documentation ITSOLUTIONS

*Plateforme SaaS de gestion centralisée de routeurs MikroTik, VPN, Mikhmon, Wallet et abonnements.*

> Ce document reprend la structure et le parcours fonctionnel de la documentation publique de WiFiZoneVPN (`wifizonevpn.net/documentation`), adaptés à l'identité, à la stack technique et aux règles métier propres à ITSOLUTIONS. ITSOLUTIONS doit reproduire fonctionnellement le même parcours utilisateur, avec sa propre marque, son propre backend et son propre design.

---

## Sommaire

1. [Introduction](#1-introduction)
2. [Stack technique](#2-stack-technique)
3. [Direction artistique — Glassmorphism](#3-direction-artistique--glassmorphism)
4. [Démarrage rapide](#4-démarrage-rapide)
5. [Créer un routeur et un Mikhmon](#5-créer-un-routeur-et-un-mikhmon)
6. [Configuration MikroTik](#6-configuration-mikrotik)
7. [Test de l'accès à distance](#7-test-de-laccès-à-distance)
8. [Renouvellement](#8-renouvellement)
9. [FAQ](#9-faq)
10. [Support](#10-support)

---

## 1. Introduction

Bienvenue dans la documentation officielle d'**ITSOLUTIONS**, la plateforme qui permet de gérer vos hotspots MikroTik avec **Mikhmon en ligne**, exactement comme sur WiFiZoneVPN, mais avec sa propre infrastructure, sa propre identité visuelle et son propre moteur applicatif.

**Trois piliers du service :**

| Pilier | Description |
|---|---|
| **Mikhmon en ligne** | Interface web hébergée pour gérer le hotspot |
| **VPN sécurisé** | Connexion chiffrée entre les routeurs et le serveur ITSOLUTIONS |
| **Gestion simplifiée** | Tableau de bord unique pour tous les services |

Le principe général s'inspire du fonctionnement de WiFiZoneVPN, sans reproduire son identité graphique. ITSOLUTIONS possède sa propre identité, son propre backend, ses propres règles métier et sa propre infrastructure.

**Parcours cœur du produit :**

```
Utilisateur → Wallet → Ajout routeur → Paiement → Provisioning VPN
→ Script MikroTik → Connexion du routeur → Accès Winbox/API
→ Workspace Mikhmon → Gestion distante
```

---

## 2. Stack technique

Le choix de stack retenu pour ITSOLUTIONS :

### Frontend — Next.js

- **Framework :** Next.js (App Router)
- **Rendu :** pages hybrides SSR/CSR selon le besoin (pages marketing en SSR/SSG, dashboard en CSR authentifié)
- **Styling :** Tailwind CSS, avec tokens de design dédiés au glassmorphism (voir section 3)
- **État & données :** appels API REST vers le backend Node.js, gestion d'état via hooks React (ou React Query/TanStack Query pour le cache et le polling des statuts routeur/VPN)
- **Authentification :** gestion de session via JWT (cookies httpOnly) côté client
- **Composants clés :** dashboard, wallet, formulaire d'ajout de routeur, page de détails routeur, workspace Mikhmon (iframe ou lien externe sécurisé), page de renouvellement, back-office admin

### Backend — Node.js

- **Framework :** Node.js avec Express (ou équivalent) exposant une API REST
- **ORM :** Prisma
- **Base de données :** PostgreSQL
- **Authentification :** JWT + hashing des mots de passe (bcrypt/argon2)
- **Modules métier :**
  - Service Wallet (recharge, débit, historique)
  - Service Routeur (création, provisioning, statut)
  - Service Provisioning VPN (génération d'identifiants, allocation de ports)
  - Service Mikhmon (création/association de workspace)
  - Service Abonnement (expiration, renouvellement auto/manuel)
  - Service Notifications (email, WhatsApp)
- **Sécurité :** middleware d'authentification, validation des entrées, transactions atomiques (Wallet ↔ Routeur ↔ Provisioning), idempotence des opérations financières

### Vue d'ensemble

```
Next.js (Frontend)  <──── API REST ────>  Node.js/Express (Backend)
                                                 |
                                        +--------+--------+
                                        |        |        |
                                    PostgreSQL  Wallet   Provisioning
                                    (Prisma)   Service    Service
                                                             |
                                                    +--------+--------+
                                                    |                 |
                                              Serveur VPN      Workspaces
                                                                 Mikhmon
                                                    |
                                              MikroTik distant
```

---

## 3. Direction artistique — Glassmorphism

ITSOLUTIONS doit adopter un design **très moderne et sophistiqué**, construit autour du **glassmorphism** (effet de verre dépoli), à l'opposé d'une interface SaaS générique.

### Principes visuels

- **Surfaces vitrées :** cartes et panneaux avec `backdrop-filter: blur()`, fond semi-transparent (`rgba`), bordure fine translucide (1px, blanc à faible opacité) et ombre douce diffuse
- **Fond :** dégradés profonds (dark mode par défaut) avec formes/orbes lumineux flous en arrière-plan pour créer de la profondeur derrière les surfaces vitrées
- **Hiérarchie par superposition :** plusieurs couches de verre avec opacités et flous différents pour distinguer dashboard, cartes de statut et modales
- **Typographie :** police moderne à forte lisibilité (ex. Inter, Geist ou Satoshi), contrastes marqués sur fond sombre, hiérarchie claire des tailles
- **Couleurs d'accent :** une ou deux couleurs vives (ex. bleu électrique / violet) utilisées avec parcimonie pour les statuts (actif, expiré, en attente), CTA et éléments interactifs
- **Micro-interactions :** transitions fluides (hover, focus), légers effets de lumière au survol des cartes vitrées, animations discrètes lors des changements de statut (routeur connecté, paiement validé)
- **Composants types à concevoir en glassmorphism :** cartes routeur, widget Wallet, barre de navigation flottante, modales de paiement/confirmation, tableau de bord admin

### Contraintes

- La lisibilité prime sur l'effet : le contenu critique (montants, statuts, ports) doit rester net malgré les effets de flou/transparence
- Le design doit rester cohérent sur mobile (responsive), où les effets de flou peuvent être allégés pour préserver la performance
- Respect du **principe de non-régression** : toute évolution future du design doit préserver la structure existante et ne modifier que ce qui est nécessaire

---

## 4. Démarrage rapide

Suivez ces 3 étapes simples pour démarrer avec ITSOLUTIONS :

**1. Créez votre compte**

Inscrivez-vous sur `itsolutions.tld/register`.

- Renseignez nom d'utilisateur, email et mot de passe
- Vérifiez votre email (lien de confirmation)

**2. Créez votre premier routeur**

Connectez-vous, puis depuis le tableau de bord cliquez sur **« Ajouter routeur »**.

- Choisissez la version RouterOS de votre MikroTik
- Donnez un nom à votre routeur (ex. `mikhmon1`) — s'il s'agit du premier routeur, votre Mikhmon portera le même nom
- Recevez votre URL personnalisée : `votrenom.itsolutions.tld`

**3. Configurez votre MikroTik**

Copiez le script fourni et collez-le dans le **Terminal** de votre MikroTik.

- Le script configure automatiquement la connexion VPN
- Le routeur se connecte au serveur ITSOLUTIONS
- Accédez à Mikhmon via votre URL personnalisée

> **Important :** assurez-vous que votre MikroTik a accès à Internet avant de lancer le script.

---

## 5. Créer un routeur et un Mikhmon

### Qu'est-ce qu'un Mikhmon ?

Mikhmon (MikroTik Hotspot Monitor) est une interface web qui facilite la gestion du hotspot MikroTik. Avec ITSOLUTIONS, le Mikhmon est hébergé en ligne et accessible depuis n'importe où.

### Versions RouterOS compatibles

| Version | Compatibilité | Public |
|---|---|---|
| **Mikhmon V1** | RouterOS 6.x à 7.9 | Anciens routeurs (RB750, hEX, hAP lite...) |
| **Mikhmon V2** | RouterOS 7.10 et supérieur | Routeurs récents |

Un utilisateur peut créer autant de Mikhmon que nécessaire, sans limite de nombre de routeurs.

### Procédure de création

1. **Accédez au tableau de bord** et cliquez sur **« Ajouter routeur »**
2. **Choisissez la version RouterOS** correspondant à votre routeur
   *Comment vérifier ? Dans Winbox : System → Resources → Version*
3. **Nommez votre routeur** (et le Mikhmon si c'est le premier) — lettres et chiffres uniquement, sans espace
   Exemple : `mikhmon1`, `hotspot2025` → URL finale : `votrenom.itsolutions.tld`
4. **Validez la création** — le coût est débité automatiquement du Wallet ([règle financière principale](#règle-financière)), et vous recevez :
   - URL Mikhmon : `https://votrenom.itsolutions.tld`
   - URL Webfig : `http://webfig.votrenom.itsolutions.tld`
   - Port API : `vpn.itsolutions.tld:40xxx`
   - Port Winbox : `vpn.itsolutions.tld:50xxx`
   - Script MikroTik à copier-coller

<a id="règle-financière"></a>
> **Règle financière principale :** chaque routeur coûte **23 000 FC par mois**, débités automatiquement du Wallet au moment de l'ajout, avec une validité de **30 jours**. En cas de solde insuffisant, la création est bloquée tant que le Wallet n'est pas rechargé.

---

## 6. Configuration MikroTik

### Prérequis

- Routeur MikroTik avec accès Internet
- Winbox ou WebFig pour l'administration
- Script fourni par ITSOLUTIONS

### Méthode 1 — Via Winbox (recommandé)

1. **Connectez-vous à Winbox** sur votre MikroTik
2. **Ouvrez le New Terminal** (menu *New Terminal* ou raccourci `Alt + T`)
3. **Collez le script** fourni par ITSOLUTIONS puis appuyez sur `Entrée`
4. **Vérifiez la connexion** via *PPP → Interface* : l'interface VPN doit afficher le statut **Connected**

### Méthode 2 — Via WebFig

1. Connectez-vous à WebFig : `http://192.168.88.1`
2. Menu **Terminal**
3. Collez le script et validez

### Vérification

```
/interface l2tp-client print
/ppp active print
```

Vous devriez voir la connexion VPN active avec une adresse de type `10.8.0.xxx`.

> **Problème de connexion ?** Vérifiez que :
> - votre MikroTik a accès à Internet ;
> - le port UDP 1701 (L2TP) n'est pas bloqué par le firewall ;
> - le script a été copié intégralement.

---

## 7. Test de l'accès à distance

1. **Changez de réseau** : déconnectez votre ordinateur du wifi de votre routeur et connectez-vous à un réseau distant (ex. 4G)
2. **Récupérez l'adresse Winbox** dans les détails du routeur sur le dashboard (ex. `vpn.itsolutions.tld:50xxx`)
3. **Connectez-vous** : dans Winbox, remplacez l'adresse MAC par l'adresse distante et cliquez sur *Connect*
4. **Résultat attendu** : vous êtes connecté au routeur via VPN, où que vous soyez

### Connexion et configuration de Mikhmon Online

1. **Accédez à Mikhmon** via l'URL fournie dans les détails du routeur (ex. `https://votrenom.itsolutions.tld`)
2. **Authentifiez-vous** avec les identifiants par défaut communiqués à la création
   ⚠️ Le mot de passe par défaut **doit être changé immédiatement** après la première connexion
3. **Configurez Mikhmon** : renseignez l'adresse API (`vpn.itsolutions.tld:40xxx`) et les identifiants MikroTik, puis enregistrez
4. **Connexion finale** : vous êtes prêt à gérer vos clients hotspot depuis Mikhmon

---

## 8. Renouvellement

### Durée de validité

Tous les services ITSOLUTIONS sont valables **30 jours** à partir de la date de création ou du dernier renouvellement.

### Renouvellement automatique

1. **Activez l'option** « Renouvellement automatique » depuis le tableau de bord
2. **Maintenez un solde suffisant** dans le Wallet (23 000 FC minimum par routeur)

> Si le renouvellement auto est activé et le solde suffisant, les services sont renouvelés automatiquement à l'expiration (traitement nocturne planifié). Une confirmation est envoyée par email (et WhatsApp si configuré).

### Renouvellement manuel

1. Accédez à la page **Renouveler**
2. Sélectionnez le routeur à renouveler
3. Cliquez sur **« Renouveler (23 000 FC) »**

### Alertes d'expiration

Des emails d'alerte sont envoyés :

- **3 jours avant** l'expiration
- **Le jour de** l'expiration

### Après expiration

| Élément | Statut |
|---|---|
| URL Mikhmon personnalisée | ✅ reste accessible |
| Routeur | ❌ suspendu (VPN déconnecté) |
| Accès Winbox / WebFig | ❌ coupé |
| Réactivation | ✅ immédiate après renouvellement |

---

## 9. FAQ

**Combien de Mikhmon puis-je créer ?**
Autant que nécessaire. Un Mikhmon V1 sert aux routeurs RouterOS 6.x–7.9, un Mikhmon V2 aux routeurs RouterOS 7.10+. Plusieurs Wi-Fi Zones avec des versions différentes peuvent donc avoir plusieurs Mikhmon de chaque type.

**Combien de routeurs puis-je ajouter ?**
Il n'y a pas de limite. Chaque routeur coûte 23 000 FC/mois.

**Comment vérifier la version de mon RouterOS ?**
Dans Winbox : *System → Resources*, ligne « Version ». Exemple : `7.15.2 (stable)` → Mikhmon V2 ; `6.49.10 (long-term)` → Mikhmon V1.

**Le VPN ne se connecte pas, que faire ?**
Vérifiez l'accès Internet du MikroTik, que le port UDP 1701 n'est pas bloqué, et que le script a été copié en entier. Dans *PPP → Interface*, contrôlez le statut de connexion. Si le problème persiste, contactez le support avec le nom exact du routeur.

**Puis-je changer le nom de mon Mikhmon ?**
Non, le nom d'un Mikhmon ou d'un routeur ne peut pas être modifié après création. Il faut créer un nouveau service avec le nom souhaité.

**Comment recharger mon compte ?**
Depuis le bouton « Recharger » du tableau de bord, via les moyens de paiement Mobile Money disponibles au Burkina Faso (Orange Money, Moov Money) et/ou carte bancaire, selon les intégrations retenues. Le crédit est ajouté automatiquement après confirmation du paiement.

**Que se passe-t-il si mon service expire ?**
Le routeur est suspendu (VPN coupé) mais l'URL Mikhmon reste accessible. Le service est réactivé immédiatement après renouvellement.

---

## 10. Support

Besoin d'aide ? L'équipe ITSOLUTIONS est disponible via :

- **WhatsApp** — support rapide par message
- **Email** — support technique (ex. `support@itsolutions.tld`)

**Avant de contacter le support :**

- Consultez la FAQ ci-dessus
- Vérifiez que votre compte est bien rechargé
- Testez la connexion Internet de votre MikroTik
- Notez le nom exact de votre Mikhmon/routeur

---

*Document de référence produit — à faire évoluer en parallèle du cahier des charges technique complet d'ITSOLUTIONS.*
