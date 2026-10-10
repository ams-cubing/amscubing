import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

import { AccountBodyFallback } from "./_components/account-body-fallback";
import { AccountHeader } from "./_components/account-header";
import { ActionCard } from "./_components/action-card";
import { OrganizationTools } from "./_components/organization-tools";
import { PermissionManagement } from "./_components/permission-management";
import { ProfileOverview } from "./_components/profile-overview";
import { getProfileLevel, loadAccountData } from "./_lib/account-data";
import {
  getScopedActions,
  myCompetitionsAction,
  publicActions,
} from "./_lib/actions-config";

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
  const isEditor = user?.role === "editor";
  const scopedActions = getScopedActions({
    isDelegate,
    hasBlogPermission: Boolean(blogPermission),
    hasCoursePermission: Boolean(coursePermission),
  });
  const actions = [myCompetitionsAction, ...publicActions];

  return (
    <>
      <AccountHeader
        user={user}
        profileLevel={getProfileLevel(data)}
        hasWcaAccount={Boolean(data.wcaAccount)}
      />

      {user && (
        <>
          <ProfileOverview user={user} data={data} />
          {managedScopes.length > 0 && (
            <PermissionManagement
              managedScopes={managedScopes}
              blogTeam={data.blogTeam}
              courseTeam={data.courseTeam}
              audit={data.audit}
              isDelegate={isDelegate}
            />
          )}
        </>
      )}
      {scopedActions.length > 0 && (
        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          {scopedActions.map((action) => (
            <ActionCard key={action.title} action={action} />
          ))}
        </div>
      )}
      <div
        className={`grid gap-6 ${actions.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
      >
        {actions.map((action) => (
          <ActionCard key={action.title} action={action} />
        ))}
      </div>

      {isDelegate || isEditor ? (
        <OrganizationTools isDelegate={isDelegate} />
      ) : null}
    </>
  );
}
