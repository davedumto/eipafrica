import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  numeric,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const orgRoleEnum = pgEnum("org_role", ["org_admin", "member"]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending_review",
  "live",
  "paused",
  "closed",
]);

export const listingVisibilityEnum = pgEnum("listing_visibility", [
  "public",
  "members_only",
  "private",
]);

export const projectStageEnum = pgEnum("project_stage", [
  "concept",
  "feasibility",
  "development",
  "financial_close",
  "construction",
  "operational",
]);

export const documentTagEnum = pgEnum("document_tag", ["public", "confidential"]);

export const enquiryTypeEnum = pgEnum("enquiry_type", [
  "interest",
  "question",
  "document_request",
  "bid",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "pending",
  "accepted",
  "declined",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_enquiry",
  "new_message",
  "enquiry_accepted",
  "enquiry_declined",
  "listing_approved",
  "listing_sent_back",
  "org_verified",
  "deadline_approaching",
]);

// ---------- users ----------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
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
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  isAdmin: boolean("is_admin").notNull().default(false),
  emailAlertsEnabled: boolean("email_alerts_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Only a hash of the token is stored — the raw token exists solely in the
  // emailed link and is never persisted.
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// ---------- organizations ----------

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  listings: many(listings),
}));

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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

export const organizationInvites = pgTable("organization_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: orgRoleEnum("role").notNull().default("member"),
  invitedByUserId: uuid("invited_by_user_id")
    .notNull()
    .references(() => users.id),
  // Only a hash of the token is stored, same pattern as password_reset_tokens —
  // the raw token exists solely in the emailed link.
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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

export const listingTypes = pgTable("listing_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  // Describes the extra/custom fields this listing type exposes, e.g.
  // [{ key: "capacity", label: "Capacity (MW/km/units)", type: "text" }, ...]
  fieldSchema: jsonb("field_schema").notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const countries = pgTable("countries", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 2 }).notNull().unique(),
  name: text("name").notNull(),
  region: text("region"),
  isActive: boolean("is_active").notNull().default(true),
});

export const sectors = pgTable("sectors", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): any => sectors.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
});

// ---------- listings ----------

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  listingTypeId: uuid("listing_type_id")
    .notNull()
    .references(() => listingTypes.id),

  title: text("title").notNull(),
  summary: text("summary").notNull(),
  description: text("description"),

  sectorId: uuid("sector_id").references(() => sectors.id),
  countryIds: jsonb("country_ids").notNull().default([]), // uuid[] as jsonb, one-or-more countries
  region: text("region"),
  city: text("city"),
  gpsLat: numeric("gps_lat", { precision: 9, scale: 6 }),
  gpsLng: numeric("gps_lng", { precision: 9, scale: 6 }),

  dealSizeAmount: numeric("deal_size_amount", { precision: 18, scale: 2 }),
  dealSizeCurrency: varchar("deal_size_currency", { length: 3 }),
  dealSizeUsd: numeric("deal_size_usd", { precision: 18, scale: 2 }),

  projectStage: projectStageEnum("project_stage"),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  deadlineReminderSentAt: timestamp("deadline_reminder_sent_at", { withTimezone: true }),

  status: listingStatusEnum("status").notNull().default("draft"),
  visibility: listingVisibilityEnum("visibility").notNull().default("public"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),

  // Type-specific extra fields, keyed per listing_types.field_schema
  extraFields: jsonb("extra_fields").notNull().default({}),

  tags: jsonb("tags").notNull().default([]),

  reviewComments: text("review_comments"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

  viewCount: integer("view_count").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  enquiries: many(enquiries),
  savedBy: many(savedListings),
}));

export const listingDocuments = pgTable("listing_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  tag: documentTagEnum("tag").notNull().default("public"),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listingDocumentsRelations = relations(listingDocuments, ({ one, many }) => ({
  listing: one(listings, {
    fields: [listingDocuments.listingId],
    references: [listings.id],
  }),
  downloads: many(documentDownloads),
}));

export const documentDownloads = pgTable("document_downloads", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => listingDocuments.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- enquiries & messaging ----------

export const enquiries = pgTable("enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  type: enquiryTypeEnum("type").notNull(),
  status: enquiryStatusEnum("status").notNull().default("pending"),
  bidAmount: numeric("bid_amount", { precision: 18, scale: 2 }),
  bidCurrency: varchar("bid_currency", { length: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  enquiryId: uuid("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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

export const savedListings = pgTable(
  "saved_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("saved_listings_user_listing_unique").on(t.userId, t.listingId)],
);

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  query: jsonb("query").notNull().default({}), // serialized filter state
  emailAlerts: boolean("email_alerts").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- notifications ----------

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
