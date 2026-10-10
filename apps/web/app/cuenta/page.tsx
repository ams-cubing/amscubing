import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

import { AccountBodyFallback } from "./_components/account-body-fallback";
import { AccountHeader } from "./_components/account-header";
import { ActionCard } from "./_components/action-card";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { OrganizationTools } from "./_components/organization-tools";
import { ProfileOverview } from "./_components/profile-overview";
import { getProfileLevel, loadAccountData } from "./_lib/account-data";
import { getAccountSections } from "./_lib/actions-config";

export const metadata: Metadata = {
  title: "Mi perfil | Asociación Mexicana de Speedcubing",
  description:
    "Acceso con cuenta WCA y centro de acciones para competidores, delegados y editores de AMS.",
};

export default function AccountPage() {
  return (
    <main>
      <SiteNav />
      <PageHero
        eyebrow="Comunidad AMS"
        title="Mi perfil AMS"
        description="Tu información, tus vinculaciones y tus permisos. Un mismo perfil para toda la comunidad AMS."
      />
      <section className="bg-white py-16 md:py-20">
        <div className="ams-container max-w-280">
          <Suspense fallback={<AccountBodyFallback />}>
            <AccountBody />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

async function AccountBody() {
  const data = await loadAccountData();
  const { user, blogPermission, coursePermission, managedScopes } = data;
  const isDelegate = user?.role === "delegate";
  const { member, organization } = getAccountSections({
    isDelegate,
    hasBlogPermission: Boolean(blogPermission),
    hasCoursePermission: Boolean(coursePermission),
    canManagePermissions: managedScopes.length > 0,
    hasCompetitionActivity: data.hasCompetitionActivity,
  });

  return (
    <>
      <AccountHeader
        user={user}
        profileLevel={getProfileLevel(data)}
        hasWcaAccount={Boolean(data.wcaAccount)}
      />

      {user && (
        <>
          <OnboardingChecklist user={user} data={data} />
          <ProfileOverview user={user} data={data} />
        </>
      )}
      {organization.length > 0 && <OrganizationTools actions={organization} />}

      <div>
        <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Comunidad AMS
        </p>
        <h2 className="ams-display mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">
          Tu comunidad
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {member.map((action) => (
            <ActionCard key={action.href} action={action} />
          ))}
        </div>
      </div>
    </>
  );
}
