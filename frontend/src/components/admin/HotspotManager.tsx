"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, formatFc, formatDate, downloadPdf } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { StatusBadge } from "@/components/StatusBadge";
import { IconPlus, IconTrash, IconShield, IconDownload, IconPrinter } from "@/components/Icons";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HotspotGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { sites: number; profiles: number; vouchers: number; users: number };
}

interface HotspotSite {
  id: string;
  name: string;
  location: string | null;
  nasId: string | null;
  groupId: string;
  createdAt: string;
  group: { name: string };
  nas: { nasIdentifier: string; status: string } | null;
}

interface HotspotProfile {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  downloadRate: number | null;
  uploadRate: number | null;
  quotaMb: number | null;
  maxDevices: number;
  macPolicy: string;
  validDays: number | null;
  groupId: string | null;
  createdAt: string;
  group: { name: string } | null;
  _count: { vouchers: number };
}

interface HotspotVoucher {
  id: string;
  code: string;
  status: string;
  macAddress: string | null;
  firstUsedAt: string | null;
  expiresAt: string | null;
  timesUsed: number;
  createdAt: string;
  group: { name: string };
  profile: { name: string; durationMinutes: number };
}

interface RadiusUser {
  id: string;
  username: string;
  status: string;
  macAddress: string | null;
  expiresAt: string | null;
  lastAuthAt: string | null;
  createdAt: string;
  group: { name: string };
  profile: { name: string } | null;
  voucher: { code: string } | null;
}

interface ActiveSession {
  id: string;
  username: string;
  sessionId: string;
  ipAddress: string | null;
  macAddress: string | null;
  startedAt: string;
  downloadOctets: number;
  uploadOctets: number;
  lastActivityAt: string;
  nas: { nasIdentifier: string; name: string } | null;
  group: { name: string } | null;
  site: { name: string } | null;
}

type Tab = "groups" | "sites" | "profiles" | "vouchers" | "users" | "sessions";

// ─── Main Component ──────────────────────────────────────────────────────────

export function HotspotManager() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("groups");
  const [groups, setGroups] = useState<HotspotGroup[]>([]);
  const [sites, setSites] = useState<HotspotSite[]>([]);
  const [profiles, setProfiles] = useState<HotspotProfile[]>([]);
  const [vouchers, setVouchers] = useState<HotspotVoucher[]>([]);
  const [users, setUsers] = useState<RadiusUser[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
    }
    try {
      const [groupsRes, sitesRes, profilesRes, vouchersRes, usersRes, sessionsRes] = await Promise.all([
        api<{ groups: HotspotGroup[] }>("/hotspot/groups"),
        api<{ sites: HotspotSite[] }>("/hotspot/sites"),
        api<{ profiles: HotspotProfile[] }>("/hotspot/profiles"),
        api<{ vouchers: HotspotVoucher[]; total: number }>("/hotspot/vouchers?limit=100"),
        api<{ users: RadiusUser[]; total: number }>("/hotspot/users?limit=100"),
        api<{ sessions: ActiveSession[] }>("/radius/sessions"),
      ]);
      setGroups(groupsRes.groups);
      setSites(sitesRes.sites);
      setProfiles(profilesRes.profiles);
      setVouchers(vouchersRes.vouchers);
      setUsers(usersRes.users);
      setSessions(sessionsRes.sessions);
    } catch (err) {
      const e = err as ApiError;
      toast("error", e.message || "Erreur de chargement des données Hotspot");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(false);
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  const tabs: [Tab, string][] = [
    ["groups", "Groupes"],
    ["sites", "Sites"],
    ["profiles", "Profils"],
    ["vouchers", "Vouchers"],
    ["users", "Utilisateurs"],
    ["sessions", "Sessions"],
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setShowForm(false); }}
            className={`btn btn-sm ${tab === key ? "btn-primary" : "btn-ghost"}`}
          >
            {label}
            {key === "groups" && <span className="ml-1 text-xs opacity-60">({groups.length})</span>}
            {key === "vouchers" && <span className="ml-1 text-xs opacity-60">({vouchers.length})</span>}
            {key === "sessions" && <span className="ml-1 text-xs opacity-60">({sessions.length})</span>}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--text-secondary)]">
          {tab === "groups" && `${groups.length} groupe(s) Hotspot`}
          {tab === "sites" && `${sites.length} site(s)`}
          {tab === "profiles" && `${profiles.length} profil(s)`}
          {tab === "vouchers" && `${vouchers.length} voucher(s)`}
          {tab === "users" && `${users.length} utilisateur(s) RADIUS`}
          {tab === "sessions" && `${sessions.length} session(s) active(s)`}
        </p>
        {tab !== "sessions" && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
            <IconPlus className="w-4 h-4 mr-1" />
            {tab === "groups" && "Nouveau groupe"}
            {tab === "sites" && "Nouveau site"}
            {tab === "profiles" && "Nouveau profil"}
            {tab === "vouchers" && "Générer"}
            {tab === "users" && "Nouvel utilisateur"}
          </button>
        )}
      </div>

      {/* Forms */}
      {showForm && (
        <div className="glass card-futuristic rounded-2xl p-6 animate-in">
          {tab === "groups" && <GroupForm onCreated={() => { setShowForm(false); loadData(); }} />}
          {tab === "sites" && <SiteForm groups={groups} onCreated={() => { setShowForm(false); loadData(); }} />}
          {tab === "profiles" && <ProfileForm groups={groups} onCreated={() => { setShowForm(false); loadData(); }} />}
          {tab === "vouchers" && <VoucherForm groups={groups} profiles={profiles} onCreated={() => { setShowForm(false); loadData(); }} />}
          {tab === "users" && <UserForm groups={groups} profiles={profiles} onCreated={() => { setShowForm(false); loadData(); }} />}
        </div>
      )}

      {/* Data Tables */}
      {tab === "groups" && <GroupsTable groups={groups} onRefresh={loadData} />}
      {tab === "sites" && <SitesTable sites={sites} onRefresh={loadData} />}
      {tab === "profiles" && <ProfilesTable profiles={profiles} onRefresh={loadData} />}
      {tab === "vouchers" && <VouchersTable vouchers={vouchers} onRefresh={loadData} />}
      {tab === "users" && <UsersTable users={users} onRefresh={loadData} />}
      {tab === "sessions" && <SessionsTable sessions={sessions} />}
    </div>
  );
}

// ─── Forms ───────────────────────────────────────────────────────────────────

function GroupForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/hotspot/groups", { method: "POST", body: { name, description: description || undefined } });
      toast("success", "Groupe créé");
      onCreated();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Nouveau groupe Hotspot</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Nom du groupe</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: BUKAVU-CENTRAL" required />
        </div>
        <div>
          <label className="form-label">Description</label>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting || !name}>
        {submitting ? "Création..." : "Créer le groupe"}
      </button>
    </form>
  );
}

function SiteForm({ groups, onCreated }: { groups: HotspotGroup[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/hotspot/sites", { method: "POST", body: { groupId, name, location: location || undefined } });
      toast("success", "Site créé");
      onCreated();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Nouveau site</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Groupe</label>
          <select className="form-input" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Nom du site</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Kavumu" required />
        </div>
        <div>
          <label className="form-label">Localisation</label>
          <input className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optionnel" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting || !name || !groupId}>
        {submitting ? "Création..." : "Créer le site"}
      </button>
    </form>
  );
}

function ProfileForm({ groups, onCreated }: { groups: HotspotGroup[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(0);
  const [downloadRate, setDownloadRate] = useState("");
  const [uploadRate, setUploadRate] = useState("");
  const [quotaMb, setQuotaMb] = useState("");
  const [maxDevices, setMaxDevices] = useState(1);
  const [validDays, setValidDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/hotspot/profiles", {
        method: "POST",
        body: {
          name,
          durationMinutes: duration,
          price,
          groupId: groupId || undefined,
          downloadRate: downloadRate ? parseInt(downloadRate) : undefined,
          uploadRate: uploadRate ? parseInt(uploadRate) : undefined,
          quotaMb: quotaMb ? parseInt(quotaMb) : undefined,
          maxDevices,
          validDays: validDays ? parseInt(validDays) : undefined,
        },
      });
      toast("success", "Profil créé");
      onCreated();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Nouveau profil tarifaire</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Groupe</label>
          <select className="form-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Global</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Nom</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: 1 Heure" required />
        </div>
        <div>
          <label className="form-label">Durée (minutes)</label>
          <input className="form-input" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} min={1} required />
        </div>
        <div>
          <label className="form-label">Prix (FC)</label>
          <input className="form-input" type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value))} min={0} />
        </div>
        <div>
          <label className="form-label">Débit ↓ (kbps)</label>
          <input className="form-input" type="number" value={downloadRate} onChange={(e) => setDownloadRate(e.target.value)} placeholder="Illimité" />
        </div>
        <div>
          <label className="form-label">Débit ↑ (kbps)</label>
          <input className="form-input" type="number" value={uploadRate} onChange={(e) => setUploadRate(e.target.value)} placeholder="Illimité" />
        </div>
        <div>
          <label className="form-label">Quota (Mo)</label>
          <input className="form-input" type="number" value={quotaMb} onChange={(e) => setQuotaMb(e.target.value)} placeholder="Illimité" />
        </div>
        <div>
          <label className="form-label">Appareils max</label>
          <input className="form-input" type="number" value={maxDevices} onChange={(e) => setMaxDevices(parseInt(e.target.value))} min={1} />
        </div>
        <div>
          <label className="form-label">Validité (jours)</label>
          <input className="form-input" type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} placeholder="Optionnel" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting || !name}>
        {submitting ? "Création..." : "Créer le profil"}
      </button>
    </form>
  );
}

function VoucherForm({ groups, profiles, onCreated }: { groups: HotspotGroup[]; profiles: HotspotProfile[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [profileId, setProfileId] = useState("");
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastGeneratedVouchers, setLastGeneratedVouchers] = useState<Array<{ id: string; code: string; plainPassword: string }>>([]);
  const [lastGeneratedGroupId, setLastGeneratedGroupId] = useState("");
  const [lastGeneratedProfileId, setLastGeneratedProfileId] = useState("");

  const filteredProfiles = profiles.filter((p) => !groupId || p.groupId === groupId || !p.groupId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api<{ vouchers: Array<{ id: string; code: string; plainPassword: string }>; count: number }>(
        "/hotspot/vouchers/generate",
        { method: "POST", body: { groupId, profileId, count, prefix: prefix || undefined } }
      );
      toast("success", `${res.count} voucher(s) généré(s)`);
      setLastGeneratedVouchers(res.vouchers);
      setLastGeneratedGroupId(groupId);
      setLastGeneratedProfileId(profileId);
      onCreated();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!lastGeneratedVouchers.length) return;
    try {
      const timestamp = new Date().getTime();
      await downloadPdf(
        "/hotspot/vouchers/generate-pdf",
        { groupId: lastGeneratedGroupId, profileId: lastGeneratedProfileId, count: lastGeneratedVouchers.length, prefix: prefix || undefined },
        `vouchers-${timestamp}.pdf`
      );
      toast("success", "PDF téléchargé");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur PDF");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Générer des vouchers</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="form-label">Groupe</label>
          <select className="form-input" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Profil</label>
          <select className="form-input" value={profileId} onChange={(e) => setProfileId(e.target.value)} required>
            <option value="">Choisir...</option>
            {filteredProfiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.durationMinutes} min — {formatFc(p.price)} FC)</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Quantité</label>
          <input className="form-input" type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value))} min={1} max={500} required />
        </div>
        <div>
          <label className="form-label">Préfixe (optionnel)</label>
          <input className="form-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="ex: BKV" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary" disabled={submitting || !groupId || !profileId}>
          {submitting ? "Génération..." : `Générer ${count} voucher(s)`}
        </button>
        {lastGeneratedVouchers.length > 0 && (
          <button type="button" onClick={handleDownloadPdf} className="btn btn-ghost">
            <IconDownload className="w-4 h-4 mr-1" />
            Télécharger PDF ({lastGeneratedVouchers.length})
          </button>
        )}
      </div>
    </form>
  );
}

function UserForm({ groups, profiles, onCreated }: { groups: HotspotGroup[]; profiles: HotspotProfile[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profileId, setProfileId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/hotspot/users", {
        method: "POST",
        body: { groupId, username, password: password || undefined, profileId: profileId || undefined },
      });
      toast("success", "Utilisateur RADIUS créé");
      onCreated();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Nouvel utilisateur RADIUS</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="form-label">Groupe</label>
          <select className="form-input" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Nom d&apos;utilisateur</label>
          <input className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: guest_abc" required />
        </div>
        <div>
          <label className="form-label">Mot de passe</label>
          <input className="form-input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Auto-généré si vide" />
        </div>
        <div>
          <label className="form-label">Profil</label>
          <select className="form-input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Aucun</option>
            {profiles.filter((p) => !p.groupId || p.groupId === groupId).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting || !username || !groupId}>
        {submitting ? "Création..." : "Créer l'utilisateur"}
      </button>
    </form>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────────

function GroupsTable({ groups, onRefresh }: { groups: HotspotGroup[]; onRefresh: () => void }) {
  const { toast } = useToast();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le groupe « ${name} » ?`)) return;
    try {
      await api(`/hotspot/groups/${id}`, { method: "DELETE" });
      toast("success", "Groupe supprimé");
      onRefresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    }
  }

  return (
    <DataTable
      headers={["Nom", "Description", "Sites", "Profils", "Vouchers", "Utilisateurs", ""]}
      rows={groups.map((g) => [
        <span key="n" className="font-medium">{g.name}</span>,
        <span key="d" className="text-[var(--text-secondary)]">{g.description || "—"}</span>,
        <span key="s" className="text-[var(--text-secondary)]">{g._count.sites}</span>,
        <span key="p" className="text-[var(--text-secondary)]">{g._count.profiles}</span>,
        <span key="v" className="text-[var(--text-secondary)]">{g._count.vouchers}</span>,
        <span key="u" className="text-[var(--text-secondary)]">{g._count.users}</span>,
        <button key="a" onClick={() => handleDelete(g.id, g.name)} className="btn btn-sm btn-ghost text-[var(--status-expired)]">
          <IconTrash className="w-4 h-4" />
        </button>,
      ])}
    />
  );
}

function SitesTable({ sites, onRefresh }: { sites: HotspotSite[]; onRefresh: () => void }) {
  const { toast } = useToast();

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce site ?")) return;
    try {
      await api(`/hotspot/sites/${id}`, { method: "DELETE" });
      toast("success", "Site supprimé");
      onRefresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    }
  }

  return (
    <DataTable
      headers={["Nom", "Groupe", "Localisation", "NAS", "Statut", ""]}
      rows={sites.map((s) => [
        <span key="n" className="font-medium">{s.name}</span>,
        <span key="g" className="text-[var(--text-secondary)]">{s.group.name}</span>,
        <span key="l" className="text-[var(--text-secondary)]">{s.location || "—"}</span>,
        <span key="a" className="text-[var(--text-secondary)] font-mono text-xs">{s.nas?.nasIdentifier || "—"}</span>,
        <StatusBadge key="s" status={s.nas?.status || "NOT_CONFIGURED"} />,
        <button key="a" onClick={() => handleDelete(s.id)} className="btn btn-sm btn-ghost text-[var(--status-expired)]">
          <IconTrash className="w-4 h-4" />
        </button>,
      ])}
    />
  );
}

function ProfilesTable({ profiles, onRefresh }: { profiles: HotspotProfile[]; onRefresh: () => void }) {
  const { toast } = useToast();

  function formatDuration(min: number) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m}` : `${h}h`;
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce profil ?")) return;
    try {
      await api(`/hotspot/profiles/${id}`, { method: "DELETE" });
      toast("success", "Profil supprimé");
      onRefresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    }
  }

  return (
    <DataTable
      headers={["Nom", "Durée", "Prix", "Débit ↓/↑", "Quota", "Appareils", "Vouchers", ""]}
      rows={profiles.map((p) => [
        <span key="n" className="font-medium">{p.name}</span>,
        <span key="d" className="text-[var(--text-secondary)]">{formatDuration(p.durationMinutes)}</span>,
        <span key="p" className="text-[var(--text-secondary)]">{formatFc(p.price)} FC</span>,
        <span key="dl" className="text-[var(--text-secondary)] font-mono text-xs">
          {p.downloadRate ? `${p.downloadRate}k` : "∞"} / {p.uploadRate ? `${p.uploadRate}k` : "∞"}
        </span>,
        <span key="q" className="text-[var(--text-secondary)]">{p.quotaMb ? `${p.quotaMb} Mo` : "∞"}</span>,
        <span key="m" className="text-[var(--text-secondary)]">{p.maxDevices}</span>,
        <span key="v" className="text-[var(--text-secondary)]">{p._count.vouchers}</span>,
        <button key="a" onClick={() => handleDelete(p.id)} className="btn btn-sm btn-ghost text-[var(--status-expired)]">
          <IconTrash className="w-4 h-4" />
        </button>,
      ])}
    />
  );
}

function VouchersTable({ vouchers, onRefresh }: { vouchers: HotspotVoucher[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pdfLoading, setPdfLoading] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === vouchers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(vouchers.map((v) => v.id)));
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Révoquer ce voucher ?")) return;
    try {
      await api(`/hotspot/vouchers/${id}/revoke`, { method: "POST" });
      toast("success", "Voucher révoqué");
      onRefresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    }
  }

  async function handleDownloadBatchPdf() {
    if (selected.size === 0) return;
    setPdfLoading(true);
    try {
      await downloadPdf(
        "/hotspot/vouchers/summary-pdf",
        { voucherIds: Array.from(selected) },
        `vouchers-${Date.now()}.pdf`
      );
      toast("success", "PDF téléchargé");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadSinglePdf(voucherId: string, code: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200/api"}/hotspot/vouchers/${voucherId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voucher-${code}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast("error", "Erreur lors du téléchargement");
    }
  }

  return (
    <div className="space-y-4">
      {/* Barre d'actions batch */}
      {selected.size > 0 && (
        <div className="glass card-futuristic rounded-xl p-4 flex items-center gap-4 animate-in">
          <span className="text-sm text-[var(--text-secondary)]">
            {selected.size} voucher(s) sélectionné(s)
          </span>
          <button
            onClick={handleDownloadBatchPdf}
            disabled={pdfLoading}
            className="btn btn-primary btn-sm"
          >
            <IconPrinter className="w-4 h-4 mr-1" />
            {pdfLoading ? "Génération..." : "Imprimer le résumé PDF"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="btn btn-ghost btn-sm"
          >
            Désélectionner
          </button>
        </div>
      )}

      <DataTable
        headers={["", "Code", "Groupe", "Profil", "Statut", "Utilisations", "Expire", "PDF", ""]}
        headerCheckbox={
          <input
            type="checkbox"
            checked={selected.size === vouchers.length && vouchers.length > 0}
            onChange={toggleSelectAll}
            className="checkbox"
          />
        }
        rows={vouchers.map((v) => [
          <input
            key="sel"
            type="checkbox"
            checked={selected.has(v.id)}
            onChange={() => toggleSelect(v.id)}
            className="checkbox"
          />,
          <span key="c" className="font-mono font-medium text-sm">{v.code}</span>,
          <span key="g" className="text-[var(--text-secondary)]">{v.group.name}</span>,
          <span key="p" className="text-[var(--text-secondary)]">{v.profile.name}</span>,
          <StatusBadge key="s" status={v.status} />,
          <span key="u" className="text-[var(--text-secondary)]">{v.timesUsed}</span>,
          <span key="e" className="text-[var(--text-secondary)]">{v.expiresAt ? formatDate(v.expiresAt) : "—"}</span>,
          <button
            key="pdf"
            onClick={() => handleDownloadSinglePdf(v.id, v.code)}
            className="btn btn-sm btn-ghost text-[var(--primary)]"
            title="Télécharger ce voucher en PDF"
          >
            <IconDownload className="w-4 h-4" />
          </button>,
          v.status !== "REVOKED" ? (
            <button key="a" onClick={() => handleRevoke(v.id)} className="btn btn-sm btn-ghost text-[var(--status-expired)]">
              <IconTrash className="w-4 h-4" />
            </button>
          ) : <span key="a" />,
        ])}
      />
    </div>
  );
}

function UsersTable({ users, onRefresh }: { users: RadiusUser[]; onRefresh: () => void }) {
  const { toast } = useToast();

  async function handleToggle(userId: string, currentStatus: string) {
    const action = currentStatus === "ACTIVE" ? "suspend" : "activate";
    try {
      await api(`/hotspot/users/${userId}/${action}`, { method: "POST" });
      toast("success", currentStatus === "ACTIVE" ? "Utilisateur suspendu" : "Utilisateur réactivé");
      onRefresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    }
  }

  return (
    <DataTable
      headers={["Utilisateur", "Groupe", "Profil", "Voucher", "Statut", "Dernière auth", ""]}
      rows={users.map((u) => [
        <span key="u" className="font-medium">{u.username}</span>,
        <span key="g" className="text-[var(--text-secondary)]">{u.group.name}</span>,
        <span key="p" className="text-[var(--text-secondary)]">{u.profile?.name || "—"}</span>,
        <span key="v" className="text-[var(--text-secondary)] font-mono text-xs">{u.voucher?.code || "—"}</span>,
        <StatusBadge key="s" status={u.status} />,
        <span key="a" className="text-[var(--text-secondary)]">{u.lastAuthAt ? formatDate(u.lastAuthAt) : "Jamais"}</span>,
        <button key="t" onClick={() => handleToggle(u.id, u.status)} className="btn btn-sm btn-ghost">
          {u.status === "ACTIVE" ? "Suspendre" : "Activer"}
        </button>,
      ])}
    />
  );
}

function formatTimeElapsed(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.max(0, Math.floor(diff / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}`;
}

function SessionsTable({ sessions }: { sessions: ActiveSession[] }) {
  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 o";
    const k = 1024;
    const sizes = ["o", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <DataTable
      headers={["Utilisateur", "IP", "NAS", "Site", "Débit ↓/↑", "Durée", "Dernière activité"]}
      rows={sessions.map((s) => [
        <span key="u" className="font-medium">{s.username}</span>,
        <span key="i" className="text-[var(--text-secondary)] font-mono text-xs">{s.ipAddress || "—"}</span>,
        <span key="n" className="text-[var(--text-secondary)]">{s.nas?.name || s.nas?.nasIdentifier || "—"}</span>,
        <span key="s" className="text-[var(--text-secondary)]">{s.site?.name || "—"}</span>,
        <span key="d" className="text-[var(--text-secondary)] font-mono text-xs">
          ↓{formatBytes(s.downloadOctets)} / ↑{formatBytes(s.uploadOctets)}
        </span>,
        <span key="t" className="text-[var(--text-secondary)]">{formatTimeElapsed(s.startedAt)}</span>,
        <span key="l" className="text-[var(--text-secondary)]">{formatTimeElapsed(s.lastActivityAt)}</span>,
      ])}
    />
  );
}

// ─── Shared Table ────────────────────────────────────────────────────────────

function DataTable({ headers, rows, headerCheckbox }: { headers: string[]; rows: React.ReactNode[][]; headerCheckbox?: React.ReactNode }) {
  if (rows.length === 0) {
    return (
      <div className="glass card-futuristic rounded-2xl p-12 text-center animate-in">
        <IconShield className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
        <p className="text-[var(--text-secondary)]">Aucune donnée</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in--2">
      {/* Adaptatif Mobile : Cartes empilées en verre dépoli */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="glass card-futuristic rounded-2xl p-5 space-y-3">
            {row.map((cell, colIndex) => {
              const header = headers[colIndex];
              return (
                <div key={colIndex} className="flex justify-between items-center text-sm gap-2 border-b border-[var(--border-glass)] last:border-0 pb-2.5 last:pb-0">
                  {header ? <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium shrink-0">{header}</span> : null}
                  <div className="text-right flex-1 flex justify-end items-center">{cell}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Vue Bureau : Tableau classique */}
      <div className="hidden md:block glass card-futuristic rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--border-glass)] bg-[rgba(255,255,255,0.03)]">
                {headers.map((h, hi) => (
                  <th key={hi} className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                    {h === "" && headerCheckbox ? headerCheckbox : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border-glass)] last:border-0 hover:bg-[var(--surface-glass-hover)] transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-4">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
