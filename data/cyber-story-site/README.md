# Neon Archive Starter Site

This is a beginner-friendly static story website.

## Files

- `index.html` → homepage
- `extras.html` → extras page
- `chapters/chapter-1.html` → first chapter page
- `styles.css` → all styling
- `script.js` → password gate, countdown, chapter list, comments, chapter navigation
- `site-config.js` → the main file you'll edit most often

## What to edit first

Open `site-config.js` and change:

- `siteTitle`
- `password`
- `countdownLabel`
- chapter titles and release dates
- Supabase URL and anon key

## How to add a new chapter

1. Copy `chapters/chapter-1.html`
2. Rename it to `chapter-2.html` or whatever number you want
3. Paste your new chapter text into that file
4. Add the new chapter info to `site-config.js`
5. Push the changes to GitHub

## Important note about the password

This shared-password version is a **front-end gate**, not full secure authentication.
It works well enough for a private friend site, but someone determined could still get around it.
If you ever want real protection, move to actual login-based auth.

## Supabase comments setup

Create a `comments` table with these columns:

- `id` → bigint / identity / primary key
- `chapter_id` → text
- `name` → text
- `comment` → text
- `created_at` → timestamp with time zone / default now()

Example SQL:

```sql
create table public.comments (
  id bigint generated always as identity primary key,
  chapter_id text not null,
  name text not null,
  comment text not null,
  created_at timestamptz not null default now()
);
```

Then allow public reads and inserts with Row Level Security policies.

```sql
alter table public.comments enable row level security;

create policy "Public can read comments"
on public.comments
for select
using (true);

create policy "Public can insert comments"
on public.comments
for insert
with check (true);
```

## Hosting idea

- Put these files in a GitHub repo
- Connect the repo to Render as a Static Site
- Build command: leave blank
- Publish directory: `.`

