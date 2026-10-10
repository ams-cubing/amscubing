import { describe, expect, it } from "vitest";

import { getAccountSections } from "./actions-config";

const base = {
  isDelegate: false,
  hasBlogPermission: false,
  hasCoursePermission: false,
  canManagePermissions: false,
  hasCompetitionActivity: false,
};

const titles = (actions: { title: string }[]) => actions.map((a) => a.title);

describe("getAccountSections", () => {
  it("offers a date request instead of Mis competencias without activity", () => {
    const { member, organization } = getAccountSections(base);
    expect(titles(member)).toEqual([
      "Solicitar una fecha",
      "Blog",
      "Mis cursos",
    ]);
    expect(organization).toEqual([]);
  });

  it("shows Mis competencias for users with competition activity", () => {
    const { member } = getAccountSections({
      ...base,
      hasCompetitionActivity: true,
    });
    expect(titles(member)[0]).toBe("Mis competencias");
  });

  it("gives blog staff only the blog admin tool", () => {
    const { organization } = getAccountSections({
      ...base,
      hasBlogPermission: true,
    });
    expect(titles(organization)).toEqual(["Administrar Blog"]);
  });

  it("gives non-delegate permission managers the admin panel", () => {
    const { organization } = getAccountSections({
      ...base,
      hasBlogPermission: true,
      canManagePermissions: true,
    });
    expect(titles(organization)).toEqual([
      "Panel de administración",
      "Administrar Blog",
    ]);
  });

  it("gives delegates every tool once, with no duplicate destinations", () => {
    const { member, organization } = getAccountSections({
      ...base,
      isDelegate: true,
      hasBlogPermission: true,
      hasCoursePermission: true,
    });
    expect(titles(organization)).toEqual([
      "Panel de administración",
      "Crear competencias",
      "Tableros de organización",
      "Administrar Blog",
      "Administrar Cursos",
    ]);
    const hrefs = [...member, ...organization].map((a) => a.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
