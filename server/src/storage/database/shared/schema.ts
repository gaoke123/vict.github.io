import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// 保留系统表定义
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable(
  "users",
  {
    id: serial().primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull(),
    username: varchar("username", { length: 100 }).notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    usageStartTime: timestamp("usage_start_time", { withTimezone: true, mode: 'string' }),
    usageEndTime: timestamp("usage_end_time", { withTimezone: true, mode: 'string' }),
    loginCount: integer("login_count").default(0).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("users_phone_idx").on(table.phone),
    index("users_username_idx").on(table.username),
  ]
);

// 数据上传表
export const dataUploads = pgTable(
  "data_uploads",
  {
    id: serial().primaryKey(),
    category: varchar("category", { length: 50 }).notNull(), // realtime/heartbeat/focus/history
    title: varchar("title", { length: 255 }).notNull(),
    content: jsonb("content"), // 存储解析后的数据
    fileKey: text("file_key"), // 对象存储key
    fileUrl: text("file_url"), // 文件访问URL
    uploadedBy: integer("uploaded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("data_uploads_category_idx").on(table.category),
    index("data_uploads_uploaded_by_idx").on(table.uploadedBy),
  ]
);

// 股票数据缓存表
export const stockCache = pgTable(
  "stock_cache",
  {
    id: serial().primaryKey(),
    dataType: varchar("data_type", { length: 50 }).notNull(), // industry/limit_up
    dataContent: jsonb("data_content").notNull(), // 存储股票数据JSON
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("stock_cache_data_type_idx").on(table.dataType),
  ]
);
