import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  customType,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// SQLite has no native enum type — these stay as plain `text` columns.
// The TypeScript union types below are the enforcement layer (compile-time
// here, validated at every API boundary that writes one of these columns).
export type OrgRole = "org_admin" | "member";
export type ListingStatus = "draft" | "pending_review" | "live" | "paused" | "closed";
export type ListingVisibility = "public" | "members_only" | "private";
export type ProjectStage =
  | "concept"
  | "feasibility"
  | "development"
  | "financial_close"
  | "construction"
  | "operational";
export type DocumentTag = "public" | "confidential";
export type EnquiryType = "interest" | "question" | "document_request" | "bid";
export type EnquiryStatus = "pending" | "accepted" | "declined";
export type NotificationType =
  | "new_enquiry"
  | "new_message"
  | "enquiry_accepted"
  | "enquiry_declined"
  | "listing_approved"
  | "listing_sent_back"
  | "org_verified"
  | "deadline_approaching";

function uuidPk(name = "id") {
  return text(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}

// Stored as ISO-8601 text (so dates sort/compare correctly as strings,
// unlike SQLite's native CURRENT_TIMESTAMP format), but typed as a real `Date`
// on both read and write — every existing `new Date(row.createdAt)` read and
// `updatedAt: new Date()` write across the app keeps working unchanged.
// Drizzle's built-in SQLite `{ mode: "timestamp" }` stores unix-epoch
// integers instead, which would touch far more call sites than the schema.
const isoDate = customType<{ data: Date; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return value.toISOString();
  },
  fromDriver(value) {
    return new Date(value);
  },
});

function isoTimestamp(name: string) {
  return isoDate(name);
}

// ---------- users ----------

export const users = sqliteTable("users", {
  id: uuidPk(),
  // `name` stays as the combined "First Last" display name so every existing
  // read site (session.user.name, email templates, message sender labels,
  // etc.) keeps working unchanged. firstName/lastName are the source of
  // truth going forward (collected at signup) and are what the avatar's
  // initials are computed from.
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  emailVerified: isoTimestamp("email_verified"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  emailAlertsEnabled: integer("email_alerts_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: isoTimestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  enquiries: many(enquiries),
  messages: many(messages),
  savedListings: many(savedListings),
  savedSearches: many(savedSearches),
  passwordResetTokens: many(passwordResetTokens),
}));

// ---------- password reset ----------

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: uuidPk(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Only a hash of the token is stored — the raw token exists solely in the
  // emailed link and is never persisted.
  tokenHash: text("token_hash").notNull(),
  expiresAt: isoTimestamp("expires_at").notNull(),
  usedAt: isoTimestamp("used_at"),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// ---------- organizations ----------

export const organizations = sqliteTable("organizations", {
  id: uuidPk(),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  verifiedAt: isoTimestamp("verified_at"),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: isoTimestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  listings: many(listings),
}));

export const organizationMembers = sqliteTable(
  "organization_members",
  {
    id: uuidPk(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<OrgRole>().notNull().default("member"),
    createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("org_members_org_user_unique").on(t.organizationId, t.userId)],
);

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const organizationInvites = sqliteTable("organization_invites", {
  id: uuidPk(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").$type<OrgRole>().notNull().default("member"),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => users.id),
  // Only a hash of the token is stored, same pattern as password_reset_tokens —
  // the raw token exists solely in the emailed link.
  tokenHash: text("token_hash").notNull(),
  expiresAt: isoTimestamp("expires_at").notNull(),
  acceptedAt: isoTimestamp("accepted_at"),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

export const organizationInvitesRelations = relations(organizationInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvites.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [organizationInvites.invitedByUserId],
    references: [users.id],
  }),
}));

// ---------- reference data: listing types, countries, sectors ----------

export const listingTypes = sqliteTable("listing_types", {
  id: uuidPk(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  // Describes the extra/custom fields this listing type exposes, e.g.
  // [{ key: "capacity", label: "Capacity (MW/km/units)", type: "text" }, ...]
  fieldSchema: text("field_schema", { mode: "json" }).notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

export const countries = sqliteTable("countries", {
  id: uuidPk(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  region: text("region"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const sectors = sqliteTable("sectors", {
  id: uuidPk(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): any => sectors.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// ---------- listings ----------

export const listings = sqliteTable("listings", {
  id: uuidPk(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id),
  listingTypeId: text("listing_type_id")
    .notNull()
    .references(() => listingTypes.id),

  title: text("title").notNull(),
  summary: text("summary").notNull(),
  description: text("description"),

  sectorId: text("sector_id").references(() => sectors.id),
  countryIds: text("country_ids", { mode: "json" }).notNull().default([]), // uuid[] as JSON, one-or-more countries
  region: text("region"),
  city: text("city"),
  gpsLat: real("gps_lat"),
  gpsLng: real("gps_lng"),

  dealSizeAmount: real("deal_size_amount"),
  dealSizeCurrency: text("deal_size_currency"),
  dealSizeUsd: real("deal_size_usd"),

  projectStage: text("project_stage").$type<ProjectStage>(),
  deadlineAt: isoTimestamp("deadline_at"),
  deadlineReminderSentAt: isoTimestamp("deadline_reminder_sent_at"),

  status: text("status").$type<ListingStatus>().notNull().default("draft"),
  visibility: text("visibility").$type<ListingVisibility>().notNull().default("public"),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),

  // Type-specific extra fields, keyed per listing_types.field_schema
  extraFields: text("extra_fields", { mode: "json" }).notNull().default({}),

  tags: text("tags", { mode: "json" }).notNull().default([]),

  reviewComments: text("review_comments"),
  reviewedByUserId: text("reviewed_by_user_id").references(() => users.id),
  reviewedAt: isoTimestamp("reviewed_at"),

  viewCount: integer("view_count").notNull().default(0),

  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: isoTimestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const listingsRelations = relations(listings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [listings.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [listings.createdByUserId],
    references: [users.id],
  }),
  listingType: one(listingTypes, {
    fields: [listings.listingTypeId],
    references: [listingTypes.id],
  }),
  sector: one(sectors, {
    fields: [listings.sectorId],
    references: [sectors.id],
  }),
  documents: many(listingDocuments),
  images: many(listingImages),
  enquiries: many(enquiries),
  savedBy: many(savedListings),
}));

export const listingDocuments = sqliteTable("listing_documents", {
  id: uuidPk(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  tag: text("tag").$type<DocumentTag>().notNull().default("public"),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

export const listingDocumentsRelations = relations(listingDocuments, ({ one, many }) => ({
  listing: one(listings, {
    fields: [listingDocuments.listingId],
    references: [listings.id],
  }),
  downloads: many(documentDownloads),
}));

export const listingImages = sqliteTable("listing_images", {
  id: uuidPk(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  // Cloudinary's asset id — needed to delete the asset from Cloudinary itself,
  // not just the DB row, when a listing owner removes an image.
  publicId: text("public_id").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, {
    fields: [listingImages.listingId],
    references: [listings.id],
  }),
}));

export const documentDownloads = sqliteTable("document_downloads", {
  id: uuidPk(),
  documentId: text("document_id")
    .notNull()
    .references(() => listingDocuments.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  downloadedAt: isoTimestamp("downloaded_at").notNull().$defaultFn(() => new Date()),
});

// ---------- enquiries & messaging ----------

export const enquiries = sqliteTable("enquiries", {
  id: uuidPk(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").$type<EnquiryType>().notNull(),
  status: text("status").$type<EnquiryStatus>().notNull().default("pending"),
  bidAmount: real("bid_amount"),
  bidCurrency: text("bid_currency"),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: isoTimestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  listing: one(listings, {
    fields: [enquiries.listingId],
    references: [listings.id],
  }),
  fromUser: one(users, {
    fields: [enquiries.fromUserId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messages = sqliteTable("messages", {
  id: uuidPk(),
  enquiryId: text("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [messages.enquiryId],
    references: [enquiries.id],
  }),
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
  }),
}));

// ---------- saved listings / searches ----------

export const savedListings = sqliteTable(
  "saved_listings",
  {
    id: uuidPk(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("saved_listings_user_listing_unique").on(t.userId, t.listingId)],
);

export const savedSearches = sqliteTable("saved_searches", {
  id: uuidPk(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  query: text("query", { mode: "json" }).notNull().default({}), // serialized filter state
  emailAlerts: integer("email_alerts", { mode: "boolean" }).notNull().default(true),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

// ---------- notifications ----------

export const notifications = sqliteTable("notifications", {
  id: uuidPk(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<NotificationType>().notNull(),
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  readAt: isoTimestamp("read_at"),
  createdAt: isoTimestamp("created_at").notNull().$defaultFn(() => new Date()),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
