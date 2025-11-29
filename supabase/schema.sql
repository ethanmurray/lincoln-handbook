create extension if not exists vector;

create table if not exists handbook_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_name text not null,
  page int,
  chunk_index int,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- For small datasets (<1000 rows), use fewer lists or no index
-- Drop old index if exists and recreate with appropriate settings
drop index if exists handbook_chunks_embedding_idx;

-- For ~600 chunks, use lists = 10 (about 60 items per list)
-- Or skip index entirely since exact search is fast for small data
create index handbook_chunks_embedding_idx
  on handbook_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- Function for vector similarity search (exact scan, bypasses index)
create or replace function match_handbook_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  doc_name text,
  page int,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  -- Use SET LOCAL to bypass index for this transaction only
  set local enable_indexscan = off;
  set local enable_bitmapscan = off;

  return query
  select
    handbook_chunks.doc_name,
    handbook_chunks.page,
    handbook_chunks.content,
    1 - (handbook_chunks.embedding <=> query_embedding) as similarity
  from handbook_chunks
  order by handbook_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
