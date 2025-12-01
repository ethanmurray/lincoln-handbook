import { NextRequest, NextResponse } from "next/server";
import { answerWithRag } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'question' field" },
        { status: 400 }
      );
    }

    const trimmedQuestion = body.question.trim();
    if (trimmedQuestion.length === 0) {
      return NextResponse.json(
        { error: "Question cannot be empty" },
        { status: 400 }
      );
    }

    const result = await answerWithRag(trimmedQuestion);

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("RAG processing failed:", errorMessage);
    return NextResponse.json(
      { error: "RAG processing failed", details: errorMessage },
      { status: 500 }
    );
  }
}
