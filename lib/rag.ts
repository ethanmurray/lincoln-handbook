import OpenAI from "openai";
import { createServerClient } from "./supabaseClient";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChunkResult {
  doc_name: string;
  page: number;
  content: string;
}

export interface Source {
  doc_name: string;
  page: number;
  content: string;
}

export interface RagResponse {
  answer: string;
  sources: Source[];
}

/**
 * Create an embedding for the given text using OpenAI.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Query Supabase for the most relevant chunks using pgvector cosine similarity.
 */
export async function getRelevantChunks(
  question: string,
  k: number = 5
): Promise<ChunkResult[]> {
  const embedding = await embedText(question);
  const supabase = createServerClient();

  // Format embedding as a string for pgvector
  const embeddingStr = `[${embedding.join(",")}]`;

  // Query using pgvector cosine distance operator <=>
  const { data, error } = await supabase.rpc("match_handbook_chunks", {
    query_embedding: embeddingStr,
    match_count: k,
  });

  if (error) {
    console.error("RPC error:", error.message);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`Found ${data?.length || 0} relevant chunks`);
  return data || [];
}

/**
 * Format a readable document name from the raw doc_name.
 */
function formatDocName(docName: string): string {
  // Extract the meaningful parts from filenames like:
  // "LincolnHandbook2025HighSchoolEnglish1755706408612_8FBfTt"
  const match = docName.match(
    /LincolnHandbook\d{4}(Elementary|MiddleSchool|HighSchool)(English|Spanish)/i
  );

  if (match) {
    const level = match[1].replace("MiddleSchool", "Middle School").replace("HighSchool", "High School");
    const language = match[2];
    return `${level} Handbook (${language})`;
  }

  return docName;
}

/**
 * Build the RAG prompt with context from retrieved chunks.
 */
export function buildPrompt(chunks: ChunkResult[], question: string): string {
  const contextParts = chunks.map((chunk, index) => {
    const docLabel = formatDocName(chunk.doc_name);
    return `[${index + 1}] (${docLabel}, p.${chunk.page})\n"${chunk.content}"`;
  });

  const context = contextParts.join("\n\n");

  return `CONTEXT:
${context}

QUESTION:
${question}`;
}

/**
 * Full RAG flow: retrieve chunks, build prompt, call OpenAI, return answer with sources.
 */
export async function answerWithRag(question: string): Promise<RagResponse> {
  // Get relevant chunks from the handbook
  const chunks = await getRelevantChunks(question, 5);

  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't find any relevant information in the handbooks to answer your question.",
      sources: [],
    };
  }

  // Build the prompt with context
  const prompt = buildPrompt(chunks, question);

  // Call OpenAI with the RAG prompt
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that answers questions about Lincoln school handbooks. " +
          "Answer ONLY using the provided context from the handbooks. " +
          "If the context doesn't contain enough information to answer, say so honestly. " +
          "Do not invent rules or policies that aren't in the provided context. " +
          "Be concise and cite which source number(s) you're using when relevant.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
  });

  const answer =
    completion.choices[0]?.message?.content || "No response from model.";

  // Extract sources with content
  const sources: Source[] = chunks.map((chunk) => ({
    doc_name: formatDocName(chunk.doc_name),
    page: chunk.page,
    content: chunk.content,
  }));

  return {
    answer,
    sources,
  };
}
