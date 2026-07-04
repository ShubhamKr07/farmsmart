CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "recommender_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"search_provider" text NOT NULL,
	"query_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommender_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sources" jsonb,
	"farm_context_used" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "recommender_cache_source_url_idx" ON "recommender_cache" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX "recommender_cache_embedding_hnsw" ON "recommender_cache" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "recommender_queries_user_idx" ON "recommender_queries" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "recommender_queries_created_at_idx" ON "recommender_queries" USING btree ("created_at");