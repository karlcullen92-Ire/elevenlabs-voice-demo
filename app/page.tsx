"use client";

import { useMemo, useRef, useState } from "react";

type Preset = { title: string; text: string };

export default function Home() {
  const PRESETS: Preset[] = useMemo(
    () => [
      {
        title: "Invoice issue",
        text: "I think there’s an issue with my invoice. I may have been charged incorrectly.",
      },
      {
        title: "Can't log in",
        text: "I can't log into my account and password reset doesn't seem to work.",
      },
      {
        title: "Cancel / downgrade",
        text: "I'd like to cancel or downgrade my subscription. What are the steps and what will change?",
      },
    ],
    []
  );

  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [text, setText] = useState<string>(PRESETS[0].text);
  const [replyText, setReplyText] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  function selectPreset(i: number) {
    setSelectedIdx(i);
    setText(PRESETS[i].text);
    setReplyText("");
    setAudioUrl(null);
    setError("");
  }

  async function generate(usingText?: string) {
    const issueText = (usingText ?? text).trim();
    if (!issueText) return;

    setLoading(true);
    setError("");
    setReplyText("");
    setAudioUrl(null);

    try {
      // 1) Get support reply (server-side OpenAI)
      const replyRes = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: issueText }),
      });

      const replyJson = await replyRes.json().catch(() => ({}));

      if (!replyRes.ok) {
        const msg =
          replyJson?.error ||
          replyJson?.message ||
          `Reply API failed (${replyRes.status})`;
        throw new Error(msg);
      }

      const reply: string = replyJson.reply ?? "";
      if (!reply) throw new Error("Empty reply returned from /api/reply");

      setReplyText(reply);

      // 2) Convert reply to speech (server-side ElevenLabs)
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });

      if (!ttsRes.ok) {
        const ttsText = await ttsRes.text().catch(() => "");
        throw new Error(ttsText || `TTS API failed (${ttsRes.status})`);
      }

      const blob = await ttsRes.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // autoplay (best-effort)
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 50);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 980,
        margin: "48px auto",
        padding: 24,
        color: "white",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          background: "#0b1020",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 22,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Voice Support Agent Demo</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Select a common issue and the agent generates and speaks a reply.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {PRESETS.map((p, i) => {
            const active = i === selectedIdx;
            return (
              <button
                key={p.title}
                onClick={() => selectPreset(i)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: active
                    ? "1px solid rgba(255,255,255,0.28)"
                    : "1px solid rgba(255,255,255,0.14)",
                  background: active ? "#1b2a52" : "#121a33",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {p.title}
              </button>
            );
          })}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "#070b14",
            color: "white",
            outline: "none",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button
            onClick={() => generate(text)}   // <- IMPORTANT: pass text directly (fixes the “wrong button” issue)
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: loading ? "#2a7a45" : "#2fbf71",
              color: "#07110c",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating…" : "Generate reply"}
          </button>

          {error ? (
            <span style={{ color: "#ff6b6b", fontSize: 13 }}>{error}</span>
          ) : null}
        </div>

        <div style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 14, opacity: 0.9 }}>
            Agent reply
          </h3>

          <div
            style={{
              background: "#070b14",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              padding: 14,
              minHeight: 110,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {replyText || "No reply generated"}
          </div>

          {audioUrl ? (
            <div style={{ marginTop: 12 }}>
              <audio ref={audioRef} controls src={audioUrl} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
