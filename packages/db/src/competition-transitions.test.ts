import { describe, expect, it } from "vitest";

import {
  ALLOWED_INITIAL_PAIRS,
  assertCanApply,
  assertInitialStatuses,
  getTransition,
  normalizeStatusIntent,
  resolveStatusChange,
  transitionStatusLabel,
  type StatusPair,
} from "./competition-transitions";

const reservedLooking: StatusPair = {
  statusPublic: "reserved",
  statusInternal: "looking_for_venue",
};

const confirmedVenue: StatusPair = {
  statusPublic: "confirmed",
  statusInternal: "venue_found",
};

const announcedApproved: StatusPair = {
  statusPublic: "announced",
  statusInternal: "wca_approved",
};

const announcedRegistration: StatusPair = {
  statusPublic: "announced",
  statusInternal: "registration_open",
};

const suspendedCancelled: StatusPair = {
  statusPublic: "suspended",
  statusInternal: "cancelled",
};

describe("getTransition / assertCanApply", () => {
  it("allows confirm_venue from reserved or open", () => {
    expect(() => assertCanApply("confirm_venue", reservedLooking)).not.toThrow();
    expect(() =>
      assertCanApply("confirm_venue", {
        statusPublic: "open",
        statusInternal: "looking_for_venue",
      }),
    ).not.toThrow();
    expect(getTransition("confirm_venue").resolveTo(reservedLooking)).toEqual({
      statusPublic: "confirmed",
      statusInternal: "venue_found",
    });
  });

  it("rejects confirm_venue from announced or cancelled", () => {
    expect(() => assertCanApply("confirm_venue", announcedApproved)).toThrow(
      /confirmar sede/,
    );
    expect(() => assertCanApply("confirm_venue", suspendedCancelled)).toThrow(
      /confirmar sede/,
    );
  });

  it("allows announce from confirmed and rejects announced/cancelled", () => {
    expect(() => assertCanApply("announce", confirmedVenue)).not.toThrow();
    expect(() => assertCanApply("announce", announcedApproved)).toThrow(
      /anunciar/,
    );
    expect(() => assertCanApply("announce", suspendedCancelled)).toThrow(
      /anunciar/,
    );
    expect(getTransition("announce").effects.requiresSocialPublish).toBe(true);
  });

  it("allows open_registration only from announced active", () => {
    expect(() =>
      assertCanApply("open_registration", announcedApproved),
    ).not.toThrow();
    expect(() =>
      assertCanApply("open_registration", announcedRegistration),
    ).toThrow();
    expect(() => assertCanApply("open_registration", confirmedVenue)).toThrow();
  });

  it("allows celebrate from non-cancelled (forces announced)", () => {
    expect(() => assertCanApply("celebrate", announcedApproved)).not.toThrow();
    expect(() => assertCanApply("celebrate", confirmedVenue)).not.toThrow();
    expect(() => assertCanApply("celebrate", suspendedCancelled)).toThrow(
      /celebrar/,
    );
    expect(getTransition("celebrate").resolveTo(confirmedVenue)).toEqual({
      statusPublic: "announced",
      statusInternal: "celebrated",
    });
  });

  it("allows cancel once and archives board", () => {
    expect(() => assertCanApply("cancel", reservedLooking)).not.toThrow();
    expect(() => assertCanApply("cancel", suspendedCancelled)).toThrow(
      /cancelada/,
    );
    expect(getTransition("cancel").effects.archiveBoard).toBe(true);
  });

  it("ask_for_help keeps public status", () => {
    expect(() => assertCanApply("ask_for_help", reservedLooking)).not.toThrow();
    expect(getTransition("ask_for_help").resolveTo(reservedLooking)).toEqual({
      statusPublic: "reserved",
      statusInternal: "asked_for_help",
    });
  });
});

describe("normalizeStatusIntent", () => {
  it("forces wca_approved when announcing", () => {
    expect(
      normalizeStatusIntent({
        statusPublic: "announced",
        statusInternal: "looking_for_venue",
      }),
    ).toEqual(announcedApproved);
  });

  it("keeps registration_open under announced", () => {
    expect(normalizeStatusIntent(announcedRegistration)).toEqual(
      announcedRegistration,
    );
  });

  it("forces announced when celebrating", () => {
    expect(
      normalizeStatusIntent({
        statusPublic: "confirmed",
        statusInternal: "celebrated",
      }),
    ).toEqual({
      statusPublic: "announced",
      statusInternal: "celebrated",
    });
  });
});

describe("resolveStatusChange", () => {
  it("returns noop when pair unchanged", () => {
    expect(
      resolveStatusChange(
        reservedLooking,
        "reserved",
        "looking_for_venue",
      ),
    ).toEqual({ noop: true });
  });

  it("maps form pairs to transition ids", () => {
    expect(
      resolveStatusChange(reservedLooking, "confirmed", "venue_found"),
    ).toMatchObject({ id: "confirm_venue" });

    expect(
      resolveStatusChange(confirmedVenue, "announced", "looking_for_venue"),
    ).toMatchObject({ id: "announce", to: announcedApproved });

    expect(
      resolveStatusChange(announcedApproved, "announced", "registration_open"),
    ).toMatchObject({ id: "open_registration" });

    expect(
      resolveStatusChange(announcedApproved, "announced", "celebrated"),
    ).toMatchObject({ id: "celebrate" });

    expect(
      resolveStatusChange(reservedLooking, "suspended", "cancelled"),
    ).toMatchObject({ id: "cancel" });

    expect(
      resolveStatusChange(reservedLooking, "reserved", "asked_for_help"),
    ).toMatchObject({ id: "ask_for_help" });
  });

  it("rejects illegal combos", () => {
    expect(() =>
      resolveStatusChange(announcedApproved, "confirmed", "venue_found"),
    ).toThrow(/no permitido/);

    expect(() =>
      resolveStatusChange(reservedLooking, "announced", "registration_open"),
    ).toThrow(/no permitido/);
  });
});

describe("assertInitialStatuses", () => {
  it("allows whitelist pairs", () => {
    for (const pair of ALLOWED_INITIAL_PAIRS) {
      expect(() => assertInitialStatuses(pair)).not.toThrow();
    }
  });

  it("rejects non-whitelist pairs", () => {
    expect(() =>
      assertInitialStatuses({
        statusPublic: "announced",
        statusInternal: "looking_for_venue",
      }),
    ).not.toThrow(); // normalized to wca_approved

    expect(() =>
      assertInitialStatuses({
        statusPublic: "confirmed",
        statusInternal: "looking_for_venue",
      }),
    ).toThrow(/inicial no permitido/);
  });
});

describe("transitionStatusLabel", () => {
  it("prefers public label when public changes", () => {
    expect(transitionStatusLabel(reservedLooking, confirmedVenue)).toBe(
      "Sede Confirmada",
    );
  });

  it("uses internal label when only internal changes", () => {
    expect(
      transitionStatusLabel(announcedApproved, announcedRegistration),
    ).toBe("Registro abierto");
  });
});
