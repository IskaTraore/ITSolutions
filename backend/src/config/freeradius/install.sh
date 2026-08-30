#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# install.sh — Installation et configuration de FreeRADIUS pour ITSOLUTIONS
#
# Ce script installe FreeRADIUS sur Debian/Ubuntu et le configure pour
# s'intégrer avec la base PostgreSQL du backend ITSOLUTIONS.
#
# Prérequis :
#   - Debian 12 / Ubuntu 22.04+
#   - PostgreSQL accessible (même base que le backend)
#   - Le backend ITSOLUTIONS doit tourner sur le même serveur (port 4200)
#
# Usage :
#   chmod +x install.sh
#   sudo ./install.sh
#
# Variables d'environnement (optionnelles) :
#   DB_HOST=localhost
#   DB_PORT=5433
#   DB_NAME=itsolutions
#   DB_USER=itsolutions
#   DB_PASS=itsolutions
#   BACKEND_URL=http://127.0.0.1:4200
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Couleurs ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Variables ────────────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-itsolutions}"
DB_USER="${DB_USER:-itsolutions}"
DB_PASS="${DB_PASS:-itsolutions}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4200}"
FREERADIUS_DIR="/etc/freeradius/3.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Vérification root ────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    error "Ce script doit être exécuté en tant que root (sudo)"
fi

info "═══════════════════════════════════════════════════════════════════"
info "  Installation FreeRADIUS pour ITSOLUTIONS"
info "═══════════════════════════════════════════════════════════════════"

# ─── 1. Installation de FreeRADIUS ────────────────────────────────────────────
info "Étape 1/7 : Installation de FreeRADIUS..."

apt-get update -qq
apt-get install -y -qq freeradius freeradius-postgresql freeradius-utils

ok "FreeRADIUS installé"

# ─── 2. Installation du driver PostgreSQL ──────────────────────────────────────
info "Étape 2/7 : Vérification du driver PostgreSQL..."

# Le paquet freeradius-postgresql inclut rlm_sql_postgresql
if [ ! -f "${FREERADIUS_DIR}/mods-available/sql" ]; then
    error "Module SQL introuvable. Installez : apt install freeradius-postgresql"
fi

ok "Driver PostgreSQL disponible"

# ─── 3. Arrêter FreeRADIUS temporairement ──────────────────────────────────────
info "Étape 3/7 : Arrêt temporaire de FreeRADIUS..."

systemctl stop freeradius 2>/dev/null || true
sleep 1

ok "FreeRADIUS arrêté"

# ─── 4. Backup de la configuration existante ──────────────────────────────────
info "Étape 4/7 : Sauvegarde de la configuration..."

BACKUP_DIR="${FREERADIUS_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "${FREERADIUS_DIR}/clients.conf" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "${FREERADIUS_DIR}/sites-enabled/" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "${FREERADIUS_DIR}/mods-enabled/sql" "$BACKUP_DIR/" 2>/dev/null || true

ok "Backup créé : $BACKUP_DIR"

# ─── 5. Configuration des clients NAS ──────────────────────────────────────────
info "Étape 5/7 : Configuration des clients NAS..."

# Générer un secret par défaut pour le client dynamic
DEFAULT_SECRET=$(openssl rand -base64 16)

cat > "${FREERADIUS_DIR}/clients.conf" << CLIENTSEOF
# ═══════════════════════════════════════════════════════════════════════════════
# clients.conf — ITSOLUTIONS FreeRADIUS
# Généré par install.sh le $(date -Iseconds)
# ⚠️  Ce fichier est mis à jour par le backend via radius-provision.service.js
# ═══════════════════════════════════════════════════════════════════════════════

# Client par défaut pour les NAS non enregistrés
client dynamic_default {
    ipaddr = dynamic
    secret = ${DEFAULT_SECRET}
    require_message_authenticator = yes

    limit {
        max_connections = 16
        lifetime = 0
        idle_timeout = 30
    }
}

# Localhost (pour le backend)
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    require_message_authenticator = yes
    shortname = localhost

    limit {
        max_connections = 16
        lifetime = 0
        idle_timeout = 30
    }
}
CLIENTSEOF

chmod 640 "${FREERADIUS_DIR}/clients.conf"
chown freeradius:freeradius "${FREERADIUS_DIR}/clients.conf"

ok "clients.conf configuré (secret par défaut: ${DEFAULT_SECRET})"

# ─── 6. Configuration SQL (PostgreSQL) ────────────────────────────────────────
info "Étape 6/7 : Configuration de la connexion PostgreSQL..."

cat > "${FREERADIUS_DIR}/mods-available/sql" << SQLEOF
# ═══════════════════════════════════════════════════════════════════════════════
# mods-available/sql — rlm_sql pour PostgreSQL (ITSOLUTIONS)
# Généré par install.sh le $(date -Iseconds)
# ═══════════════════════════════════════════════════════════════════════════════

sql {
    driver = "rlm_sql_postgresql"

    server = "${DB_HOST}"
    port = ${DB_PORT}
    login = "${DB_USER}"
    password = "${DB_PASS}"
    radius_db = "${DB_NAME}"

    pool {
        start = 5
        min = 3
        max = 20
        spare = 3
        uses = 0
        retry_delay = 30
        lifetime = 0
        idle_timeout = 60
    }

    read_clients = yes

    client_query = "SELECT id, \"nasIdentifier\", address, secret, name FROM \"RadiusNas\" WHERE status = 'ACTIVE'"

    authorize {
        revoke_reply = yes

        authorize_user = "SELECT \
            ru.id, \
            ru.username, \
            ru.\"passwordHash\" AS \"Cleartext-Password\", \
            ru.status, \
            ru.\"expiresAt\", \
            ru.\"groupId\", \
            hg.name AS \"group_name\", \
            hp.\"durationMinutes\", \
            hp.\"maxDevices\", \
            hp.\"quotaMb\", \
            hp.\"downloadRate\", \
            hp.\"uploadRate\" \
        FROM \"RadiusUser\" ru \
        LEFT JOIN \"HotspotGroup\" hg ON hg.id = ru.\"groupId\" \
        LEFT JOIN \"HotspotProfile\" hp ON hp.id = ru.\"profileId\" \
        WHERE ru.username = '%{SQL-User-Name}' \
        AND ru.status = 'ACTIVE'"

        simul_count_query = "SELECT COUNT(*) \
            FROM \"RadiusSession\" \
            WHERE \"userId\" = (SELECT id FROM \"RadiusUser\" WHERE username = '%{SQL-User-Name}') \
            AND status = 'ACTIVE'"
    }

    authenticate {
    }

    accounting {
        start = "INSERT INTO \"RadiusSession\" ( \
            id, \"ownerId\", \"nasId\", \"groupId\", \"userId\", \
            username, \"sessionId\", \"ipAddress\", \"macAddress\", \
            \"startedAt\", \"downloadOctets\", \"uploadOctets\", \
            \"lastActivityAt\", status \
        ) SELECT \
            gen_random_uuid(), \
            ru.\"ownerId\", \
            (SELECT id FROM \"RadiusNas\" WHERE \"nasIdentifier\" = '%{NAS-Identifier}' LIMIT 1), \
            ru.\"groupId\", \
            ru.id, \
            ru.username, \
            '%{Acct-Session-Id}', \
            '%{Framed-IP-Address}', \
            '%{Calling-Station-Id}', \
            NOW(), \
            0, 0, \
            NOW(), \
            'ACTIVE' \
        FROM \"RadiusUser\" ru \
        WHERE ru.username = '%{SQL-User-Name}'"

        stop = "UPDATE \"RadiusSession\" SET \
            status = 'BLOCKED', \
            \"downloadOctets\" = %{Acct-Input-Octets}, \
            \"uploadOctets\" = %{Acct-Output-Octets}, \
            \"lastActivityAt\" = NOW() \
        WHERE \"sessionId\" = '%{Acct-Session-Id}' \
        AND status = 'ACTIVE'"

        update = "UPDATE \"RadiusSession\" SET \
            \"downloadOctets\" = %{Acct-Input-Octets}, \
            \"uploadOctets\" = %{Acct-Output-Octets}, \
            \"lastActivityAt\" = NOW() \
        WHERE \"sessionId\" = '%{Acct-Session-Id}' \
        AND status = 'ACTIVE'"

        accounting_start = "INSERT INTO \"RadiusAccounting\" ( \
            id, \"ownerId\", \"nasId\", \"groupId\", \"userId\", \
            username, \"sessionId\", \"ipAddress\", \"macAddress\", \
            \"startedAt\", \"downloadOctets\", \"uploadOctets\" \
        ) SELECT \
            gen_random_uuid(), \
            ru.\"ownerId\", \
            (SELECT id FROM \"RadiusNas\" WHERE \"nasIdentifier\" = '%{NAS-Identifier}' LIMIT 1), \
            ru.\"groupId\", \
            ru.id, \
            ru.username, \
            '%{Acct-Session-Id}', \
            '%{Framed-IP-Address}', \
            '%{Calling-Station-Id}', \
            NOW(), \
            0, 0 \
        FROM \"RadiusUser\" ru \
        WHERE ru.username = '%{SQL-User-Name}'"

        accounting_stop = "UPDATE \"RadiusAccounting\" SET \
            \"endedAt\" = NOW(), \
            \"durationSeconds\" = %{Acct-Session-Time}, \
            \"downloadOctets\" = %{Acct-Input-Octets}, \
            \"uploadOctets\" = %{Acct-Output-Octets}, \
            \"disconnectCause\" = '%{Acct-Terminate-Cause}', \
            \"lastActivityAt\" = NOW() \
        WHERE \"sessionId\" = '%{Acct-Session-Id}' \
        AND \"endedAt\" IS NULL"

        accounting_update = "UPDATE \"RadiusAccounting\" SET \
            \"downloadOctets\" = %{Acct-Input-Octets}, \
            \"uploadOctets\" = %{Acct-Output-Octets}, \
            \"lastActivityAt\" = NOW() \
        WHERE \"sessionId\" = '%{Acct-Session-Id}' \
        AND \"endedAt\" IS NULL"
    }
}
SQLEOF

# Activer le module SQL
ln -sf "${FREERADIUS_DIR}/mods-available/sql" "${FREERADIUS_DIR}/mods-enabled/sql"

ok "Module SQL configuré (PostgreSQL: ${DB_HOST}:${DB_PORT}/${DB_NAME})"

# ─── 7. Virtual Server ────────────────────────────────────────────────────────
info "Étape 7/7 : Configuration du virtual server..."

# Supprimer le serveur par défaut
rm -f "${FREERADIUS_DIR}/sites-enabled/default"
rm -f "${FREERADIUS_DIR}/sites-enabled/inner-tunnel"

# Créer le serveur ITSOLUTIONS
cat > "${FREERADIUS_DIR}/sites-available/itsolutions" << VSEOF
server itsolutions {
    listen {
        type = auth
        ipaddr = *
        port = 1812
        limit {
            max_connections = 1024
            lifetime = 0
            idle_timeout = 30
        }
    }

    listen {
        type = acct
        ipaddr = *
        port = 1813
        limit {
            max_connections = 1024
            lifetime = 0
            idle_timeout = 30
        }
    }

    listen {
        type = coa
        ipaddr = *
        port = 3799
        limit {
            max_connections = 16
            lifetime = 0
            idle_timeout = 30
        }
    }

    authorize {
        preprocess
        chap
        mschap
        sql

        update control {
            Cleartext-Password := "%{sql:Cleartext-Password}"
        }

        update reply {
            Simultaneous-Use := "%{sql:maxDevices}"
        }
    }

    authenticate {
        Auth-Type CHAP {
            chap
        }
        Auth-Type MS-CHAP {
            mschap
        }
        Auth-Type PAP {
            pap
        }
    }

    preacct {
        preprocess
        acct_unique
        suffix
    }

    accounting {
        sql
    }

    post-auth {
        update {
            &reply: += &session-state:
        }
        sql
    }
}
VSEOF

ln -sf "${FREERADIUS_DIR}/sites-available/itsolutions" "${FREERADIUS_DIR}/sites-enabled/itsolutions"

ok "Virtual server ITSOLUTIONS configuré"

# ─── Vérification de la syntaxe ───────────────────────────────────────────────
info "Vérification de la syntaxe..."

if freeradius -XC 2>&1 | tail -5; then
    ok "Syntaxe FreeRADIUS valide"
else
    error "Erreur de syntaxe FreeRADIUS. Vérifiez les fichiers de config."
fi

# ─── Démarrage ────────────────────────────────────────────────────────────────
info "Démarrage de FreeRADIUS..."

systemctl enable freeradius
systemctl start freeradius

sleep 2

if systemctl is-active freeradius >/dev/null 2>&1; then
    ok "FreeRADIUS démarré avec succès"
else
    error "FreeRADIUS n'a pas démarré. Vérifiez : journalctl -u freeradius"
fi

# ─── Test de connexion ────────────────────────────────────────────────────────
info "Test de connexion..."

if radtest test test 127.0.0.1 1812 testing123 2>/dev/null | grep -q "Access-Reject\|Access-Accept"; then
    ok "FreeRADIUS répond sur le port 1812"
else
    warn "Le test radtest a échoué. FreeRADIUS est peut-même en mode debug."
fi

# ─── Résumé ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  FreeRADIUS installé et configuré pour ITSOLUTIONS${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Ports :"
echo "    Auth  : 1812/UDP"
echo "    Acct  : 1813/UDP"
echo "    CoA   : 3799/UDP"
echo ""
echo "  Base PostgreSQL :"
echo "    Host    : ${DB_HOST}:${DB_PORT}"
echo "    DB      : ${DB_NAME}"
echo "    User    : ${DB_USER}"
echo ""
echo "  Backend API :"
echo "    URL     : ${BACKEND_URL}"
echo ""
echo "  Commandes utiles :"
echo "    systemctl status freeradius"
echo "    systemctl restart freeradius"
echo "    freeradius -X              # mode debug"
echo "    radtest user pass 127.0.0.1 1812 secret"
echo ""
echo "  Prochaines étapes :"
echo "    1. Créez un NAS via le dashboard admin :"
echo "       POST /api/radius/nas { name: 'kavumu-001' }"
echo "    2. Le secret sera généré et synchronisé vers clients.conf"
echo "    3. Configurez le MikroTik avec le secret fourni"
echo ""
echo "  Backup : ${BACKUP_DIR}"
echo ""
