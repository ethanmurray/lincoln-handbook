import { createServerClient } from "./supabaseClient";

export interface QueryLogData {
  question: string;
  answer?: string;
  sources_count?: number;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  latency_ms?: number;
  error?: string;
  success: boolean;
}

/**
 * Extract user info from request headers.
 * Vercel provides geo information via headers.
 */
export function extractUserInfo(headers: Headers): Partial<QueryLogData> {
  return {
    // IP address - Vercel provides this
    ip_address:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      undefined,

    // User agent
    user_agent: headers.get("user-agent") || undefined,

    // Referer
    referer: headers.get("referer") || undefined,

    // Vercel geo headers (available on Vercel deployments)
    country: headers.get("x-vercel-ip-country") || undefined,
    city: headers.get("x-vercel-ip-city") || undefined,
    region: headers.get("x-vercel-ip-country-region") || undefined,
    latitude: parseFloat(headers.get("x-vercel-ip-latitude") || "") || undefined,
    longitude: parseFloat(headers.get("x-vercel-ip-longitude") || "") || undefined,
  };
}

/**
 * Log a query to Supabase.
 * This is fire-and-forget - errors are logged but don't affect the response.
 */
export async function logQuery(data: QueryLogData): Promise<void> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("query_logs").insert({
      question: data.question,
      answer: data.answer,
      sources_count: data.sources_count,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      referer: data.referer,
      country: data.country,
      city: data.city,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      latency_ms: data.latency_ms,
      error: data.error,
      success: data.success,
    });

    if (error) {
      console.error("Failed to log query:", error.message);
    }
  } catch (err) {
    console.error("Query logging error:", err);
  }
}
