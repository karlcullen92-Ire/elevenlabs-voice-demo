import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!elevenKey) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    if (!voiceId) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_VOICE_ID in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const text = (body?.text ?? "").toString().trim();

    if (!text) {
      return NextResponse.json({ error: "Missing 'text' in request body" }, { status: 400 });
    }

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return NextResponse.json({ error: errText }, { status: r.status });
    }

    const audio = await r.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
