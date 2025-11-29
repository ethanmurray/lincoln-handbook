"use client";

import { useState } from "react";

interface Source {
  doc_name: string;
  page: number;
  content: string;
}

interface ApiResponse {
  answer: string;
  sources: Source[];
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResponse(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResponse(data);
      }
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h1>Ask the Lincoln Handbook</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Ask questions about school policies, rules, and procedures.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., What is the cell phone policy?"
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            marginBottom: "0.75rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: loading || !question.trim() ? "not-allowed" : "pointer",
            backgroundColor: loading || !question.trim() ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {loading ? "Searching..." : "Ask"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f9f9f9",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Answer</h2>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
              {response.answer}
            </p>
          </div>

          {response.sources.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ marginBottom: "0.5rem", color: "#666" }}>Sources</h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                {response.sources.map((source, index) => (
                  <li
                    key={index}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "#e8f4fd",
                      border: "1px solid #b8daff",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      color: "#004085",
                    }}
                  >
                    {source.doc_name}, p.{source.page}
                  </li>
                ))}
              </ul>

              <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem", color: "#666" }}>
                Referenced Text
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {response.sources.map((source, index) => (
                  <details
                    key={index}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "0.75rem",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontWeight: "bold",
                        color: "#333",
                      }}
                    >
                      [{index + 1}] {source.doc_name}, p.{source.page}
                    </summary>
                    <p
                      style={{
                        marginTop: "0.75rem",
                        whiteSpace: "pre-wrap",
                        fontSize: "0.9rem",
                        lineHeight: "1.5",
                        color: "#444",
                        borderLeft: "3px solid #0070f3",
                        paddingLeft: "1rem",
                      }}
                    >
                      {source.content}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
