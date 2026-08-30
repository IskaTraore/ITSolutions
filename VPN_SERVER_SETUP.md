# Serveur L2TP/IPsec — guide d'installation pas à pas

Ce guide installe le **serveur VPN** qui reçoit les tunnels des routeurs MikroTik
gérés par la plateforme ITSOLUTIONS. Rappel d'architecture : le **backend ne
déploie pas le VPN**, il provisionne (IP `10.8.0.x`, identifiants, script). Ce
guide couvre l'infrastructure manquante : la machine qui **termine les tunnels**.

---

## 0. Les 2 valeurs à définir AVANT de commencer

| Valeur | C'est quoi | Comment l'obtenir |
|---|---|---|
| `VPN_SERVER` | L'adresse que les routeurs joindront (`connect-to` du script) | L'**IP publique de ce VPS**, ou un **domaine** que tu possèdes avec un enregistrement DNS `A` pointant vers cette IP. Ex. `vpn.itsolutions.tld` ou `185.120.12.34`. |
| `VPN_IPSEC_SECRET` | Le secret partagé IPsec (identique côté serveur **et** backend) | Génère-le toi-même : `openssl rand -base64 32` |

Le secret IPsec doit être **exactement le même** dans `/etc/ipsec.secrets` (étape 3)
et dans le `.env` du backend (étape 9).

---

## 1. Prérequis

- Un VPS **Debian 12 / Ubuntu 22.04+** avec **accès root** et une **IP publique**.
  ⚠️ Pas de NAT/CGNAT : le serveur doit être joignable directement sur UDP
  **500**, **4500** et **1701** (à ouvrir chez l'hébergeur / pare-feu du VPS).
- (Optionnel) un domaine pointant vers l'IP publique du VPS.
- 2 Go de RAM suffisent amplement pour ce service.

```bash
apt update && apt upgrade -y
apt install -y xl2tpd strongswan
```

---

## 2. Activer le routage IP

```bash
cat > /etc/sysctl.d/99-vpn.conf <<'EOF'
net.ipv4.ip_forward = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
EOF
sysctl --system
```

---

## 3. Configurer IPsec (strongSwan)

`/etc/ipsec.conf` :

```
config setup
    charondebug="ike 1, knl 1, cfg 0"
    uniqueids=no

conn L2TP-PSK
    authby=secret
    pfs=no
    auto=add
    keyingtries=3
    rekey=no
    ikelifetime=8h
    keylife=1h
    type=transport
    left=%any
    leftprotoport=17/1701
    right=%any
    rightprotoport=17/%any
    dpddelay=10
    dpdtimeout=20
    dpdaction=clear
```

`/etc/ipsec.secrets` — remplace `<VPN_IPSEC_SECRET>` par la valeur générée :

```
%any %any : PSK "<VPN_IPSEC_SECRET>"
```

```bash
chmod 600 /etc/ipsec.secrets
```

---

## 4. Configurer xl2tpd (L2TP)

`/etc/xl2tpd/xl2tpd.conf` :

```
[global]
port = 1701

[lns default]
ip range = 10.8.0.2-10.8.0.254
local ip = 10.8.0.1
require chap = yes
refuse pap = yes
require authentication = yes
name = itsolutions-vpn
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
```

- `local ip = 10.8.0.1` : l'adresse du serveur dans la plage VPN
  (10.8.0.1 est **réservé au serveur**, comme dans le backend).
- `ip range = 10.8.0.2-10.8.0.254` : la plage attribuée aux routeurs, dans
  `10.8.0.0/16` — **la même plage que celle utilisée par le backend**.

---

## 5. Configurer pppd

`/etc/ppp/options.xl2tpd` :

```
ipcp-accept-local
ipcp-accept-remote
require-mschap-v2
noccp
idle 1800
mtu 1410
mru 1410
nodefaultroute
lock
proxyarp
connect-delay 5000
name itsolutions-vpn
```

---

## 6. Créer un compte client par routeur

Chaque routeur créé sur la plateforme doit avoir un compte PPP sur ce serveur.

**Nom d'utilisateur** : il est généré par le backend avec la formule
`router_` + les **8 derniers caractères du nom du routeur**
(`vpnUsername(name)` dans `backend/src/lib/ids.js`).
Exemples : routeur `maison` → `router_maison` ; routeur `monrouteur` → `router_nrouteur`.

**Mot de passe** : celui généré par le backend. ⚠️ Il n'est **pas stocké en
clair** en base (hash bcrypt) : il faut le relever dans le **script fourni à la
création** du routeur (ou régénérer le script via l'API `POST
/api/routers/:id/rotate-script`).

Ajoute une ligne dans `/etc/ppp/chap-secrets` :

```
router_maison * <MOT_DE_PASSE_DU_SCRIPT> *
```

```bash
chmod 600 /etc/ppp/chap-secrets
```

---

## 7. Pare-feu (iptables)

Adapte `eth0` à l'interface publique réelle du VPS (`ip -br link`).

```bash
iptables -A INPUT  -p udp --dport 500  -j ACCEPT   # IKE
iptables -A INPUT  -p udp --dport 4500 -j ACCEPT   # NAT-T / ESP sur UDP
iptables -A INPUT  -p udp --dport 1701 -j ACCEPT   # L2TP
iptables -A FORWARD -i ppp+ -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o ppp+ -j ACCEPT
iptables -t nat -A POSTROUTING -s 10.8.0.0/16 -o eth0 -j MASQUERADE
```

Pour persister : `apt install -y iptables-persistent` puis
`netfilter-persistent save`.

---

## 8. Démarrer et vérifier

```bash
systemctl restart strongswan-starter xl2tpd
systemctl enable strongswan-starter xl2tpd
```

```bash
ipsec status        # doit montrer l'état du connect L2TP-PSK
journalctl -u xl2tpd --no-pager | tail -20
```

> Sur certaines distributions le service strongSwan s'appelle `strongswan`
> (sans `-starter`). Vérifie avec `systemctl list-units | grep -i strong`.

---

## 9. Aligner le backend

Dans le `.env` du backend :

```
# Adresse publique de ce serveur VPN (IP ou domaine)
VPN_SERVER=185.120.12.34

# Même valeur que celle mise dans /etc/ipsec.secrets
VPN_IPSEC_SECRET=TaValeurGeneree
```

Redémarre le backend. Depuis cette étape, le script généré contient la bonne
adresse (`connect-to`) et le bon `ipsec-secret`, et les liens API/Winbox
affichés dans le dashboard utilisent aussi cette adresse (lue dynamiquement).

---

## 10. Test de bout en bout

1. Crée un routeur dans le dashboard (ou utilise un routeur existant).
2. Récupère le script (onglet routeur → « Détails ») et colle-le dans le
   Terminal d'un MikroTik (ou d'un **CHR** en VM pour tester gratuitement).
3. Sur le MikroTik : `/interface l2tp-client print` → statut `connected`.
4. Depuis le VPS : `ping 10.8.0.2` → doit répondre.
5. Dans le dashboard : bouton ping de la carte routeur → « 12 ms » (vert).

---

## 11. ⚠️ Alignement exact des IP (important pour le ping)

`xl2tpd` attribue les IP **dynamiquement** dans la plage (ordre de connexion).
Or le backend **enregistre l'IP allouée** à la création du routeur. Après des
reconnexions, l'IP réelle du routeur peut donc **différer** de celle en base :
le bouton ping viserait alors une IP obsolète.

Trois options :

1. **Recommandée — RouterOS CHR comme serveur L2TP** : RouterOS permet une
   **IP fixe par utilisateur** (`/ppp secret` → champ `remote-address`). On crée
   le secret avec exactement l'IP allouée par le backend → alignement parfait,
   ping fiable. Le CHR gère L2TP **et** IPsec nativement (secret IPsec dans
   `/interface l2tp-server server`). C'est la solution à privilégier en
   production.
2. **Sur Linux (xl2tpd)** : l'IP fixe par utilisateur nécessite **FreeRADIUS**
   (attribut `Framed-IP-Address`) branché sur pppd — plus lourd à mettre en
   place.
3. **Accepter la dérive** (déploiement de test / petit volume) : le ping peut
   viser une IP réattribuée ; l'IP en base reste une information.

---

## Dépannage rapide

| Symptôme | Causes probables |
|---|---|
| Le client reste `connecting` | Ports UDP 500/4500/1701 fermés (pare-feu VPS) ; `ipsec status` vide ; secret IPsec différent côté serveur/backend |
| L2TP up mais pas de `connected` | Utilisateur absent de `chap-secrets` ou **username différent** (recalcule `router_<8 derniers du nom>`) ; mot de passe erroné |
| Tunnel up mais ping KO | L'IP pingée ne correspond pas à l'IP réelle (voir §11) ; `proxyarp`/`MASQUERADE` absents ; backend hors du réseau 10.8.0.0/16 sans route de retour |

Si le backend tourne sur **une autre machine** que le serveur VPN, il doit
pouvoir joindre `10.8.0.0/16` : ajoute une route statique
`10.8.0.0/16 via <IP du serveur VPN>` sur le backend.
