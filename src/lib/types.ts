/**
 * Shapes passed from the server to the client.
 * Dates are ISO strings so they survive the server/client boundary.
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type SharePermission = "view" | "edit";

export type DocumentListItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  role: "owner" | SharePermission;
  ownerName: string;
  ownerEmail: string;
};

export type DocumentShareView = {
  userId: string;
  name: string;
  email: string;
  permission: SharePermission;
};

export type DocumentDetail = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
  role: "owner" | SharePermission;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  canEdit: boolean;
  canManageSharing: boolean;
  canDelete: boolean;
  shares: DocumentShareView[];
};
