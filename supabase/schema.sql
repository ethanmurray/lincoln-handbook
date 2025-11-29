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

create index if not exists handbook_chunks_embedding_idx
  on handbook_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
