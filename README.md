# Lincoln Handbook

A Next.js app that answers questions using OpenAI and Supabase.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root:
   ```
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

   **Important:** The `SUPABASE_SERVICE_ROLE_KEY` is ONLY for local ingestion scripts and server-side API routes. It must NEVER be exposed to the browser.

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser.

## Supabase Setup

### Apply the database schema

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Paste the contents of `supabase/schema.sql`
4. Click **Run** to create the `handbook_chunks` table and vector index

### Test the connection

After setting up the schema and environment variables, run:

```bash
npm run ingest:test
```

Successful output should look like:

```
Creating Supabase client...
Inserting test row into handbook_chunks...
Insert successful. Querying for the inserted row...
Query result:
[
  {
    "id": "...",
    "doc_name": "TEST_DOC",
    "page": 1,
    "chunk_index": 0,
    "content": "This is a test chunk.",
    "embedding": null,
    "created_at": "..."
  }
]

Supabase connection test passed!
```
