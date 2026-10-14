/**
 * Sharing rules for a Folio document.
 *
 * The owner is not a row in DocumentShare. They can read, edit, delete,
 * and change access. An editor can change the title and body. A viewer
 * can only read. Anyone else is refused.
 *
 * The API enforces this function. The page also receives the resulting
 * flags so the editor can hide controls a person is not allowed to use.
 */

export const SHARE_PERMISSIONS = ["view", "edit"] as const;

export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

export type DocumentRole = "owner" | SharePermission;

export type Access = {
  role: DocumentRole | "none";
  canRead: boolean;
  canEdit: boolean;
  canManageSharing: boolean;
  canDelete: boolean;
};

const NONE: Access = {
  role: "none",
  canRead: false,
  canEdit: false,
  canManageSharing: false,
  canDelete: false,
};

export function parsePermission(value: string): SharePermission {
  return value === "edit" ? "edit" : "view";
}

export function resolveAccess(input: {
  userId: string;
  ownerId: string;
  shares: { userId: string; permission: string }[];
}): Access {
  if (input.userId === input.ownerId) {
    return {
      role: "owner",
      canRead: true,
      canEdit: true,
      canManageSharing: true,
      canDelete: true,
    };
  }

  const share = input.shares.find((item) => item.userId === input.userId);
  if (!share) return NONE;

  const permission = parsePermission(share.permission);
  return {
    role: permission,
    canRead: true,
    canEdit: permission === "edit",
    canManageSharing: false,
    canDelete: false,
  };
}
