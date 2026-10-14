import { describe, expect, it } from "vitest";
import { resolveAccess } from "../src/lib/permissions";

const owner = "owner";
const editor = "editor";
const viewer = "viewer";

describe("resolveAccess", () => {
  it("gives the owner full control", () => {
    expect(resolveAccess({ userId: owner, ownerId: owner, shares: [] })).toEqual({
      role: "owner",
      canRead: true,
      canEdit: true,
      canManageSharing: true,
      canDelete: true,
    });
  });

  it("lets an editor change the draft but not the access list", () => {
    const access = resolveAccess({
      userId: editor,
      ownerId: owner,
      shares: [{ userId: editor, permission: "edit" }],
    });
    expect(access.canEdit).toBe(true);
    expect(access.canManageSharing).toBe(false);
    expect(access.canDelete).toBe(false);
  });

  it("keeps a viewer read only", () => {
    const access = resolveAccess({
      userId: viewer,
      ownerId: owner,
      shares: [{ userId: viewer, permission: "view" }],
    });
    expect(access).toMatchObject({
      role: "view",
      canRead: true,
      canEdit: false,
      canDelete: false,
    });
  });

  it("refuses someone who was never invited", () => {
    const access = resolveAccess({
      userId: "stranger",
      ownerId: owner,
      shares: [{ userId: editor, permission: "edit" }],
    });
    expect(access.role).toBe("none");
    expect(access.canRead).toBe(false);
  });

  it("treats an unknown permission value as view", () => {
    const access = resolveAccess({
      userId: viewer,
      ownerId: owner,
      shares: [{ userId: viewer, permission: "admin" }],
    });
    expect(access.role).toBe("view");
    expect(access.canEdit).toBe(false);
  });
});
