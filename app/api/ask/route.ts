import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant answering user questions.",
        },
        {
          role: "user",
          content: trimmedQuestion,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content || "No response from model.";

    return NextResponse.json({
      answer,
      sources: [],
    });
  } catch (error) {
    console.error("OpenAI request failed:", error);
    return NextResponse.json(
      { error: "OpenAI request failed" },
      { status: 500 }
    );
  }
}
