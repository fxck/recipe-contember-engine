CREATE TABLE "language" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "language"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "front_page" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "front_page"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "front_page_location" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "front_page_location"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "front_page_reference_tile" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "front_page_reference_tile"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "front_page_featured_client" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "front_page_featured_client"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "front_page_button" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "front_page_button"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "page_seo" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "page_seo"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "front_page_locale" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "front_page_locale"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "menu_item" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "menu_item"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "team_page" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "team_page"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "person" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "person"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "person_locale" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "person_locale"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "what_we_do" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "what_we_do"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "reference_locale" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "reference_locale"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "reference" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "reference"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "contact_location_locale" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "contact_location_locale"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "contact_location" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "contact_location"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE TABLE "contact_page_locale" (
  "id" uuid PRIMARY KEY NOT NULL
);
CREATE TRIGGER "log_event"
  AFTER INSERT OR UPDATE OR DELETE ON "contact_page_locale"
  FOR EACH ROW
  EXECUTE PROCEDURE "system"."trigger_event"();
CREATE DOMAIN "one" AS text CHECK (VALUE IN('one'));
CREATE DOMAIN "location" AS text CHECK (VALUE IN('prague','london'));
ALTER TABLE "language"
  ADD "slug" text;
ALTER TABLE "language"
  ADD "name" text;
ALTER TABLE "language"
  ADD CONSTRAINT "unique_slug" UNIQUE ("slug");
ALTER TABLE "front_page"
  ADD "unique" "one";
ALTER TABLE "front_page"
  ADD "vimeo_id" text;
ALTER TABLE "front_page_location"
  ADD "location" "location";
ALTER TABLE "front_page_location"
  ADD "title" text;
ALTER TABLE "front_page_location"
  ADD "text" text;
ALTER TABLE "front_page_location"
  ADD "front_page_locale_id" uuid REFERENCES "front_page_locale"("id") ON DELETE restrict;
CREATE  INDEX  "front_page_location_front_page_locale_id_index" ON "front_page_location" ("front_page_locale_id");
ALTER TABLE "front_page_reference_tile"
  ADD "label" text;
ALTER TABLE "front_page_reference_tile"
  ADD "image" text;
ALTER TABLE "front_page_reference_tile"
  ADD "link_target" text;
ALTER TABLE "front_page_reference_tile"
  ADD "front_page_locale_id" uuid REFERENCES "front_page_locale"("id") ON DELETE restrict;
CREATE  INDEX  "front_page_reference_tile_front_page_locale_id_index" ON "front_page_reference_tile" ("front_page_locale_id");
ALTER TABLE "front_page_featured_client"
  ADD "image" text;
ALTER TABLE "front_page_featured_client"
  ADD "front_page_locale_id" uuid REFERENCES "front_page_locale"("id") ON DELETE restrict;
CREATE  INDEX  "front_page_featured_client_front_page_locale_id_index" ON "front_page_featured_client" ("front_page_locale_id");
ALTER TABLE "front_page_button"
  ADD "label" text;
ALTER TABLE "front_page_button"
  ADD "url" text;
ALTER TABLE "front_page_button"
  ADD "front_page_locale_id" uuid REFERENCES "front_page_locale"("id") ON DELETE restrict;
CREATE  INDEX  "front_page_button_front_page_locale_id_index" ON "front_page_button" ("front_page_locale_id");
ALTER TABLE "page_seo"
  ADD "title" text;
ALTER TABLE "page_seo"
  ADD "description" text;
ALTER TABLE "page_seo"
  ADD "og_image" text;
ALTER TABLE "page_seo"
  ADD "og_title" text;
ALTER TABLE "page_seo"
  ADD "og_description" text;
ALTER TABLE "front_page_locale"
  ADD "language_id" uuid UNIQUE REFERENCES "language"("id") ON DELETE restrict;
ALTER TABLE "front_page_locale"
  ADD "intro_short" text;
ALTER TABLE "front_page_locale"
  ADD "intro_main" text;
ALTER TABLE "front_page_locale"
  ADD "intro_long" text;
ALTER TABLE "front_page_locale"
  ADD "references_title" text;
ALTER TABLE "front_page_locale"
  ADD "button_label" text;
ALTER TABLE "front_page_locale"
  ADD "button_url" text;
ALTER TABLE "front_page_locale"
  ADD "locations_title" text;
ALTER TABLE "front_page_locale"
  ADD "featured_clients_text" text;
ALTER TABLE "front_page_locale"
  ADD "contact_button_label" text;
ALTER TABLE "front_page_locale"
  ADD "contact_button_url" text;
ALTER TABLE "front_page_locale"
  ADD "seo_id" uuid UNIQUE REFERENCES "page_seo"("id") ON DELETE restrict;
ALTER TABLE "menu_item"
  ADD "label" text;
ALTER TABLE "menu_item"
  ADD "url" text;
ALTER TABLE "menu_item"
  ADD "order" integer;
ALTER TABLE "menu_item"
  ADD "language_id" uuid REFERENCES "language"("id") ON DELETE restrict;
CREATE  INDEX  "menu_item_language_id_index" ON "menu_item" ("language_id");
ALTER TABLE "team_page"
  ADD "language_id" uuid UNIQUE REFERENCES "language"("id") ON DELETE restrict;
ALTER TABLE "team_page"
  ADD "title" text;
ALTER TABLE "team_page"
  ADD "seo_id" uuid UNIQUE REFERENCES "page_seo"("id") ON DELETE restrict;
ALTER TABLE "person"
  ADD "image_big" text;
ALTER TABLE "person"
  ADD "image_square" text;
ALTER TABLE "person"
  ADD "phone_number" text;
ALTER TABLE "person"
  ADD "email" text;
ALTER TABLE "person"
  ADD "facebook" text;
ALTER TABLE "person"
  ADD "twitter" text;
ALTER TABLE "person"
  ADD "likendin" text;
ALTER TABLE "person"
  ADD "github" text;
ALTER TABLE "person"
  ADD "instagram" text;
ALTER TABLE "person_locale"
  ADD "person_id" uuid REFERENCES "person"("id") ON DELETE restrict;
CREATE  INDEX  "person_locale_person_id_index" ON "person_locale" ("person_id");
ALTER TABLE "person_locale"
  ADD "language_id" uuid REFERENCES "language"("id") ON DELETE restrict;
CREATE  INDEX  "person_locale_language_id_index" ON "person_locale" ("language_id");
ALTER TABLE "person_locale"
  ADD "position" text;
ALTER TABLE "person_locale"
  ADD "short_name" text;
ALTER TABLE "person_locale"
  ADD "long_name" text;
ALTER TABLE "person_locale"
  ADD "text" text;
ALTER TABLE "person_locale"
  ADD CONSTRAINT "unique_language_person" UNIQUE ("language_id", "person_id");
ALTER TABLE "what_we_do"
  ADD "language_id" uuid UNIQUE REFERENCES "language"("id") ON DELETE restrict;
ALTER TABLE "what_we_do"
  ADD "title" text;
ALTER TABLE "what_we_do"
  ADD "quote" text;
ALTER TABLE "what_we_do"
  ADD "text" text;
ALTER TABLE "what_we_do"
  ADD "button_label" text;
ALTER TABLE "what_we_do"
  ADD "button_url" text;
ALTER TABLE "reference_locale"
  ADD "language_id" uuid REFERENCES "language"("id") ON DELETE restrict;
CREATE  INDEX  "reference_locale_language_id_index" ON "reference_locale" ("language_id");
ALTER TABLE "reference_locale"
  ADD "title" text;
ALTER TABLE "reference_locale"
  ADD "url" text;
ALTER TABLE "reference_locale"
  ADD "url_label" text;
ALTER TABLE "reference_locale"
  ADD "case_study_url" text;
ALTER TABLE "reference_locale"
  ADD "reference_id" uuid REFERENCES "reference"("id") ON DELETE restrict;
CREATE  INDEX  "reference_locale_reference_id_index" ON "reference_locale" ("reference_id");
ALTER TABLE "reference"
  ADD "image" text;
ALTER TABLE "contact_location_locale"
  ADD "language_id" uuid REFERENCES "language"("id") ON DELETE restrict;
CREATE  INDEX  "contact_location_locale_language_id_index" ON "contact_location_locale" ("language_id");
ALTER TABLE "contact_location_locale"
  ADD "contact_location_id" uuid REFERENCES "contact_location"("id") ON DELETE restrict;
CREATE  INDEX  "contact_location_locale_contact_location_id_index" ON "contact_location_locale" ("contact_location_id");
ALTER TABLE "contact_location_locale"
  ADD CONSTRAINT "unique_contactLocation_language" UNIQUE ("contact_location_id", "language_id");
ALTER TABLE "contact_location"
  ADD "location" "location";
ALTER TABLE "contact_location"
  ADD "top_title" text;
ALTER TABLE "contact_location"
  ADD "address" text;
ALTER TABLE "contact_location"
  ADD "email" text;
ALTER TABLE "contact_location"
  ADD "phone" text;
ALTER TABLE "contact_location"
  ADD "bottom_title" text;
ALTER TABLE "contact_location"
  ADD "company" text;
ALTER TABLE "contact_location"
  ADD "text" text;
ALTER TABLE "contact_page_locale"
  ADD "button_url" text;
ALTER TABLE "contact_page_locale"
  ADD "button_label" text;
ALTER TABLE "contact_page_locale"
  ADD "seo_id" uuid UNIQUE REFERENCES "page_seo"("id") ON DELETE restrict;
ALTER TABLE "contact_page_locale"
  ADD "language_id" uuid UNIQUE REFERENCES "language"("id") ON DELETE restrict;
