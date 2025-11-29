import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { createServerClient } from "../lib/supabaseClient";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const CHUNK_TARGET_WORDS = 600; // Target ~600 words per chunk (400-800 range)
const CHUNK_MIN_WORDS = 400;
const CHUNK_MAX_WORDS = 800;
const CHUNK_OVERLAP_WORDS = 50;

interface Chunk {
  pageNumber: number;
  chunkIndex: number;
  content: string;
}

/**
 * Split text into chunks respecting paragraph/sentence boundaries
 * with overlap between chunks.
 */
function chunkText(text: string, pageNumber: number): Chunk[] {
  const chunks: Chunk[] = [];

  // Split into paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let currentChunk: string[] = [];
  let currentWordCount = 0;
  let chunkIndex = 0;
  let overlapWords: string[] = [];

  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const sentenceWords = trimmedSentence.split(/\s+/);
      const sentenceWordCount = sentenceWords.length;

      // If adding this sentence would exceed max, save current chunk and start new one
      if (currentWordCount + sentenceWordCount > CHUNK_MAX_WORDS && currentWordCount >= CHUNK_MIN_WORDS) {
        // Save current chunk
        const chunkContent = currentChunk.join(" ");
        if (chunkContent.trim()) {
          chunks.push({
            pageNumber,
            chunkIndex,
            content: chunkContent.trim(),
          });
          chunkIndex++;
        }

        // Calculate overlap: take last N words from current chunk
        const allCurrentWords = currentChunk.join(" ").split(/\s+/);
        overlapWords = allCurrentWords.slice(-CHUNK_OVERLAP_WORDS);

        // Start new chunk with overlap
        currentChunk = [...overlapWords, trimmedSentence];
        currentWordCount = overlapWords.length + sentenceWordCount;
      } else {
        currentChunk.push(trimmedSentence);
        currentWordCount += sentenceWordCount;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join(" ");
    if (chunkContent.trim()) {
      chunks.push({
        pageNumber,
        chunkIndex,
        content: chunkContent.trim(),
      });
    }
  }

  return chunks;
}

/**
 * Extract text from PDF, split by page
 */
async function extractPdfText(filePath: string): Promise<Map<number, string>> {
  // pdf-parse v2 uses a class-based API
  const parser = new PDFParse({ url: filePath });
  const textResult = await parser.getText();
  await parser.destroy();

  const pageTexts = new Map<number, string>();

  // pdf-parse v2 provides pages array with page-by-page text
  if (textResult.pages && textResult.pages.length > 0) {
    textResult.pages.forEach((page: any, index: number) => {
      const pageText = page.text?.trim();
      if (pageText) {
        pageTexts.set(index + 1, pageText);
      }
    });
  } else if (textResult.text) {
    // Fallback: split by form feed or multiple newlines
    const pages = textResult.text.split(/\f|\n{4,}/);
    pages.forEach((pageText: string, index: number) => {
      if (pageText.trim()) {
        pageTexts.set(index + 1, pageText.trim());
      }
    });
  }

  return pageTexts;
}

/**
 * Create embedding using OpenAI
 */
async function createEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Main ingestion function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("Lincoln Handbook Ingestion Script");
  console.log("=".repeat(60));
  console.log();

  // Initialize clients
  const supabase = createServerClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Find PDF directory
  const pdfDir = path.join(process.cwd(), "pdf");

  if (!fs.existsSync(pdfDir)) {
    console.error(`ERROR: PDF directory not found: ${pdfDir}`);
    console.error("Please create a 'pdf' folder and add PDF files to it.");
    process.exit(1);
  }

  // Get all PDF files
  const pdfFiles = fs.readdirSync(pdfDir).filter(f => f.toLowerCase().endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.error("ERROR: No PDF files found in the pdf/ directory.");
    process.exit(1);
  }

  console.log(`Found ${pdfFiles.length} PDF file(s) to process.\n`);

  let totalChunks = 0;
  let totalInserted = 0;
  let totalErrors = 0;

  for (const pdfFile of pdfFiles) {
    const filePath = path.join(pdfDir, pdfFile);
    const docName = path.basename(pdfFile, ".pdf");

    console.log(`Processing: ${pdfFile}`);
    console.log("-".repeat(40));

    try {
      // Extract text from PDF
      const pageTexts = await extractPdfText(filePath);
      console.log(`  Extracted text from ${pageTexts.size} page(s)`);

      // Generate chunks for all pages
      const allChunks: Chunk[] = [];
      for (const [pageNum, pageText] of pageTexts) {
        const pageChunks = chunkText(pageText, pageNum);
        allChunks.push(...pageChunks);
      }

      console.log(`  Generated ${allChunks.length} chunk(s)`);
      totalChunks += allChunks.length;

      // Process each chunk
      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const progress = `[${i + 1}/${allChunks.length}]`;

        try {
          process.stdout.write(`  Inserting chunk ${progress}...`);

          // Create embedding
          const embedding = await createEmbedding(openai, chunk.content);

          // Insert into Supabase
          const { error: insertError } = await supabase.from("handbook_chunks").insert({
            doc_name: docName,
            page: chunk.pageNumber,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            embedding: embedding,
          });

          if (insertError) {
            console.log(` ERROR: ${insertError.message}`);
            totalErrors++;
          } else {
            console.log(" done");
            totalInserted++;
          }
        } catch (chunkError: any) {
          console.log(` ERROR: ${chunkError.message}`);
          totalErrors++;
          // Continue to next chunk
        }
      }

      console.log();
    } catch (pdfError: any) {
      console.error(`  ERROR processing PDF: ${pdfError.message}`);
      totalErrors++;
      console.log();
      // Continue to next PDF
    }
  }

  // Print summary
  console.log("=".repeat(60));
  console.log("INGESTION COMPLETE");
  console.log("=".repeat(60));
  console.log(`  PDFs processed:    ${pdfFiles.length}`);
  console.log(`  Total chunks:      ${totalChunks}`);
  console.log(`  Successfully saved: ${totalInserted}`);
  console.log(`  Errors:            ${totalErrors}`);
  console.log("=".repeat(60));

  if (totalErrors > 0) {
    console.log("\nWARNING: Some chunks failed to process. Check the logs above.");
  } else {
    console.log("\nAll chunks ingested successfully!");
  }
}

main().catch(console.error);
