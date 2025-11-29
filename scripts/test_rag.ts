import * as dotenv from "dotenv";
import OpenAI from "openai";
import { createServerClient } from "../lib/supabaseClient";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testRag() {
  console.log("=".repeat(60));
  console.log("RAG Results Debug");
  console.log("=".repeat(60));

  const supabase = createServerClient();

  // Test query
  const query = "What is the cell phone policy?";
  console.log(`\nQuery: "${query}"\n`);

  // Create embedding
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const embedding = response.data[0].embedding;

  // Test with array format
  console.log("Results with array format:");
  const { data: results, error } = await supabase.rpc("match_handbook_chunks", {
    query_embedding: embedding,
    match_count: 5,
  });

  if (error) {
    console.log(`Error: ${error.message}`);
  } else if (results) {
    results.forEach((row: any, i: number) => {
      console.log(`\n[${i + 1}] ${row.doc_name}`);
      console.log(`    Page: ${row.page}, Similarity: ${row.similarity?.toFixed(4)}`);
      console.log(`    Content: "${row.content?.substring(0, 150)}..."`);
    });
  }

  // Also do a direct text search to compare
  console.log("\n" + "-".repeat(60));
  console.log("\nText search for 'cell phone':");
  const { data: textResults } = await supabase
    .from("handbook_chunks")
    .select("doc_name, page, content")
    .ilike("content", "%cell phone%")
    .limit(3);

  textResults?.forEach((row: any, i: number) => {
    console.log(`\n[${i + 1}] ${row.doc_name}`);
    console.log(`    Page: ${row.page}`);
    console.log(`    Content: "${row.content?.substring(0, 150)}..."`);
  });

  console.log("\n" + "=".repeat(60));
}

testRag().catch(console.error);
