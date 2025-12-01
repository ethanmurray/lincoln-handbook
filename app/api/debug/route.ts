import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Ensure Node.js runtime for OpenAI SDK compatibility
export const runtime = "nodejs";
export const maxDuration = 60;

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

  // Test OpenAI - try both SDK and direct fetch
  const openaiStart = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set");
    }

    // First try direct fetch to isolate SDK vs network issues
    const fetchStart = Date.now();
    const fetchResponse = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });
    const fetchLatency = Date.now() - fetchStart;
    const fetchData = await fetchResponse.json();

    results.tests.openai = {
      success: fetchResponse.ok,
      error: fetchResponse.ok ? null : fetchData?.error?.message || "Unknown error",
      latency_ms: Date.now() - openaiStart,
      fetch_latency_ms: fetchLatency,
      fetch_status: fetchResponse.status,
      model_count: fetchData?.data?.length || 0,
      method: "direct_fetch",
    };
  } catch (error: any) {
    results.tests.openai = {
      success: false,
      error: error?.message || String(error),
      latency_ms: Date.now() - openaiStart,
      error_type: error?.constructor?.name,
      error_status: error?.status,
      error_code: error?.code,
      error_cause: error?.cause?.message || null,
      method: "direct_fetch",
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
