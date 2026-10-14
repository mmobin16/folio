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
  contentJson: string;
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

export type CommentAuthor = {
  id: string;
  name: string;
  email: string;
};

export type CommentView = {
  id: string;
  body: string;
  kind: "comment" | "suggestion";
  suggestion: string;
  createdAt: string;
  resolvedAt: string | null;
  author: CommentAuthor;
  replies: {
    id: string;
    body: string;
    createdAt: string;
    author: CommentAuthor;
  }[];
};

export type VersionListItem = {
  id: string;
  title: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export type VersionDetail = VersionListItem & {
  content: string;
  contentJson: string;
};

export type PresenceView = {
  userId: string;
  name: string;
  email: string;
  activity: "viewing" | "editing";
};

export type AttachmentView = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedByName: string;
  uploadedById: string;
};

export type UserMatch = {
  id: string;
  name: string;
  email: string;
};
