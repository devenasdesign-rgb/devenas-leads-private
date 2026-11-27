CREATE TABLE `leads` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_id` text NOT NULL,
  `title` text NOT NULL,
  `source` text NOT NULL DEFAULT 'Другое',
  `url` text NOT NULL DEFAULT '',
  `excerpt` text NOT NULL DEFAULT '',
  `budget` text NOT NULL DEFAULT '',
  `notes` text NOT NULL DEFAULT '',
  `status` text NOT NULL DEFAULT 'new',
  `priority` text NOT NULL DEFAULT 'medium',
  `follow_up_at` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_owner_idx` ON `leads` (`owner_id`,`created_at`);
