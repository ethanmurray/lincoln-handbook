import { NextRequest, NextResponse } from "next/server";
import { answerWithRag } from "@/lib/rag";
import { logQuery, extractUserInfo } from "@/lib/queryLogger";

// Ensure Node.js runtime for OpenAI SDK compatibility
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const userInfo = extractUserInfo(request.headers);
  let question = "";

  try {
    const body = await request.json();

    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'question' field" },
        { status: 400 }
      );
    }

    question = body.question.trim();
    if (question.length === 0) {
      return NextResponse.json(
        { error: "Question cannot be empty" },
        { status: 400 }
      );
    }

    const result = await answerWithRag(question);
    const latency = Date.now() - startTime;

    // Log successful query (fire-and-forget)
    logQuery({
      question,
      answer: result.answer,
      sources_count: result.sources.length,
      latency_ms: latency,
      success: true,
      ...userInfo,
    });

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const latency = Date.now() - startTime;

    // Log failed query (fire-and-forget)
    logQuery({
      question: question || "(parse error)",
      error: errorMessage,
      latency_ms: latency,
      success: false,
      ...userInfo,
    });

    console.error("RAG processing failed:", errorMessage);
    return NextResponse.json(
      { error: "RAG processing failed", details: errorMessage },
      { status: 500 }
    );
  }
}
