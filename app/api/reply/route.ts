import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const issue = (body?.issue ?? "").toString().trim();

    if (!issue) {
      return NextResponse.json({ error: "Missing 'issue' in request body" }, { status: 400 });
    }

    const prompt = `You are a helpful customer support agent. Write a clear, concise reply to the customer.\n\nCustomer issue:\n${issue}\n\nReply:`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return NextResponse.json({ error: errText }, { status: r.status });
    }

    const data = await r.json();

    // safest extraction across Responses API variants:
    const reply =
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.value ||
      "";

    if (!reply) {
      return NextResponse.json(
        { error: "OpenAI returned no output_text" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
