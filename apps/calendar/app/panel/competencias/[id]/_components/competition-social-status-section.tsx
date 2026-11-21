"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  classifyCompetitionSocialStatus,
  facebookPostHref,
} from "@workspace/social/status";
import { Button } from "@workspace/ui/components/button";
import { CompetitionSocialStatusPanel } from "@workspace/ui/components/competition-social-status-panel";

import { AnnounceDialog } from "../../../_components/announce-dialog";
import {
  completeCompetitionInstagram,
  markCompetitionSocialManual,
  retryCompetitionSocial,
} from "../_actions/social-publish-recovery";

export function CompetitionSocialStatusSection({
  competitionId,
  city,
  wcaCompetitionUrl,
  statusPublic,
  statusInternal,
  facebookPostId,
  instagramMediaId,
  socialPublishedManually,
  announcedPostedAt,
}: {
  competitionId: number;
  city: string;
  wcaCompetitionUrl: string | null;
  statusPublic: string;
  statusInternal: string;
  facebookPostId: string | null;
  instagramMediaId: string | null;
  socialPublishedManually: boolean;
  announcedPostedAt: Date | string | null;
}) {
  const router = useRouter();
  const [announceOpen, setAnnounceOpen] = useState(false);
  const status = classifyCompetitionSocialStatus({
    statusPublic,
    facebookPostId,
    instagramMediaId,
    socialPublishedManually,
  });
  const canAnnounce =
    statusPublic !== "announced" &&
    statusPublic !== "suspended" &&
    statusInternal !== "cancelled";

  return (
    <>
      <CompetitionSocialStatusPanel
        status={status}
        facebookPostId={facebookPostId}
        facebookUrl={facebookPostHref(facebookPostId)}
        instagramMediaId={instagramMediaId}
        announcedPostedAt={announcedPostedAt}
        canRetry
        actions={
          canAnnounce ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setAnnounceOpen(true)}
            >
              Anunciar competencia
            </Button>
          ) : null
        }
        onRetry={() => retryCompetitionSocial(competitionId)}
        onCompleteInstagram={() => completeCompetitionInstagram(competitionId)}
        onMarkManual={() => markCompetitionSocialManual(competitionId)}
        onActionSuccess={() => router.refresh()}
      />
      {canAnnounce ? (
        <AnnounceDialog
          competitionId={competitionId}
          city={city}
          initialWcaCompetitionUrl={wcaCompetitionUrl}
          open={announceOpen}
          setOpen={setAnnounceOpen}
        />
      ) : null}
    </>
  );
}
