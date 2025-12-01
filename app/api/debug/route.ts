import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

function maskValue(value: string | undefined, showChars: number = 10): string {
  if (!value) return "NOT SET";
  if (value.length <= showChars) return "set (too short to mask)";
  return `set (${value.substring(0, showChars)}***)`;
}

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      OPENAI_API_KEY: maskValue(process.env.OPENAI_API_KEY),
      SUPABASE_URL: maskValue(process.env.SUPABASE_URL, 20),
      SUPABASE_SERVICE_ROLE_KEY: maskValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    tests: {
      openai: { success: false, error: null, latency_ms: null },
      supabase: { success: false, error: null, row_count: null },
    },
  };

  // Test OpenAI
  const openaiStart = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set");
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Use models.list() - it's a simple API call that doesn't cost tokens
    const models = await openai.models.list();
    results.tests.openai = {
      success: true,
      error: null,
      latency_ms: Date.now() - openaiStart,
      model_count: models.data?.length || 0,
    };
  } catch (error: any) {
    results.tests.openai = {
      success: false,
      error: error?.message || String(error),
      latency_ms: Date.now() - openaiStart,
      error_type: error?.constructor?.name,
      error_status: error?.status,
      error_code: error?.code,
    };
  }

  // Test Supabase
  const supabaseStart = Date.now();
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars not set");
    }
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { count, error } = await supabase
      .from("handbook_chunks")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    results.tests.supabase = {
      success: true,
      error: null,
      latency_ms: Date.now() - supabaseStart,
      row_count: count,
    };
  } catch (error: any) {
    results.tests.supabase = {
      success: false,
      error: error?.message || String(error),
      latency_ms: Date.now() - supabaseStart,
    };
  }

  return NextResponse.json(results);
}
