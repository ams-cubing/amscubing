"use client";

import { useRouter } from "next/navigation";

import { classifyCompetitionSocialStatus } from "@workspace/social/status";
import { CompetitionSocialStatusPanel } from "@workspace/ui/components/competition-social-status-panel";

import {
  completeCompetitionInstagram,
  markCompetitionSocialManual,
  retryCompetitionSocial,
} from "../_actions/social-publish-recovery";

function facebookUrl(facebookPostId: string) {
  return `https://www.facebook.com/${facebookPostId}`;
}

export function CompetitionSocialStatusSection({
  competitionId,
  statusPublic,
  facebookPostId,
  instagramMediaId,
  socialPublishedManually,
  announcedPostedAt,
}: {
  competitionId: number;
  statusPublic: string;
  facebookPostId: string | null;
  instagramMediaId: string | null;
  socialPublishedManually: boolean;
  announcedPostedAt: Date | string | null;
}) {
  const router = useRouter();
  const status = classifyCompetitionSocialStatus({
    statusPublic,
    facebookPostId,
    instagramMediaId,
    socialPublishedManually,
  });

  return (
    <CompetitionSocialStatusPanel
      status={status}
      facebookPostId={facebookPostId}
      facebookUrl={facebookPostId ? facebookUrl(facebookPostId) : null}
      instagramMediaId={instagramMediaId}
      announcedPostedAt={announcedPostedAt}
      canRetry
      onRetry={() => retryCompetitionSocial(competitionId)}
      onCompleteInstagram={() => completeCompetitionInstagram(competitionId)}
      onMarkManual={() => markCompetitionSocialManual(competitionId)}
      onActionSuccess={() => router.refresh()}
    />
  );
}
