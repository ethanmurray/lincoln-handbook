import * as dotenv from "dotenv";
import { createServerClient } from "../lib/supabaseClient";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Creating Supabase client...");
  const supabase = createServerClient();

  console.log("Inserting test row into handbook_chunks...");
  const { error: insertError } = await supabase.from("handbook_chunks").insert({
    doc_name: "TEST_DOC",
    page: 1,
    chunk_index: 0,
    content: "This is a test chunk.",
    embedding: null,
  });

  if (insertError) {
    console.error("Insert failed:", insertError.message);
    process.exit(1);
  }

  console.log("Insert successful. Querying for the inserted row...");
  const { data, error: selectError } = await supabase
    .from("handbook_chunks")
    .select("*")
    .eq("doc_name", "TEST_DOC");

  if (selectError) {
    console.error("Select failed:", selectError.message);
    process.exit(1);
  }

  console.log("Query result:");
  console.log(JSON.stringify(data, null, 2));

  console.log("\nSupabase connection test passed!");
}

main();
