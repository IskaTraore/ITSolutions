"use client";

import { HotspotManager } from "@/components/admin/HotspotManager";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IconGlobe } from "@/components/Icons";

export default function AdminHotspotPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Hotspot & RADIUS"
        subtitle="Gérez les groupes, sites, profils tarifaires, vouchers et sessions Hotspot via FreeRADIUS."
        icon={<IconGlobe className="w-6 h-6" />}
      />
      <HotspotManager />
    </div>
  );
}
