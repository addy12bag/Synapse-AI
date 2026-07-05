import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });

// ─── Groq API Client Helper ─────────────────────────────────────────────
async function groqChat(
  messages: { role: string; content: string }[],
  systemPrompt?: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API Key is not set in environment variables");

  const groqMessages = [];
  if (systemPrompt) {
    groqMessages.push({ role: "system", content: systemPrompt });
  }
  groqMessages.push(
    ...messages.map((m) => ({
      role: m.role === "model" || m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }))
  );

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

async function groqGenerateQuiz(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API Key is not set in environment variables");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || "[]";
}

// Helper to parse quiz questions from JSON text (strips markdown code fences and external padding if present)
function parseQuestionsJson(raw: string, questionType: string, numQuestions: number) {
  let cleaned = raw.trim();
  const startIdx = cleaned.indexOf("[");
  const endIdx = cleaned.lastIndexOf("]");
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  } else {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, numQuestions).map((q: Record<string, unknown>, i: number) => ({
        text: String(q.text || `Question ${i + 1}`),
        type: questionType,
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        answer: String(q.answer || ""),
        explanation: String(q.explanation || ""),
      }));
    }
  } catch (err) {
    console.error("Failed to parse quiz questions JSON:", err, cleaned.substring(0, 200));
  }
  return [];
}

// ─── Quiz Generation ───────────────────────────────────────────────────
export async function generateQuizQuestions(
  text: string,
  numQuestions: number,
  questionType: "mcq" | "flashcard" | "short"
): Promise<
  {
    text: string;
    type: string;
    options: string[];
    answer: string;
    explanation: string;
  }[]
> {
  const typeInstructions = {
    mcq: `Generate ${numQuestions} multiple-choice questions. Each question must have exactly 4 options (A, B, C, D). The "answer" field should contain the full text of the correct option. The "options" array must have exactly 4 strings.`,
    flashcard: `Generate ${numQuestions} flashcard-style questions. The "answer" field contains the answer text to memorize. The "options" array should be empty [].`,
    short: `Generate ${numQuestions} short-answer questions. The "answer" field contains a concise correct answer (1-3 sentences). The "options" array should be empty [].`,
  };

  const prompt = `You are an expert academic quiz generator. Based on the following study material, ${typeInstructions[questionType]}

Respond ONLY with a valid JSON array. No markdown, no code fences, no explanation. Just the JSON array.

Each object in the array must have these fields:
- "text": the question text
- "type": "${questionType}"
- "options": array of option strings (4 for mcq, empty [] for others)
- "answer": the correct answer text
- "explanation": a brief explanation of why this is correct (1-2 sentences)

Study Material:
${text.slice(0, 15000)}`;

  // 1. Try Gemini
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const raw = response.text?.trim() || "[]";
    return parseQuestionsJson(raw, questionType, numQuestions);
  } catch (err) {
    console.error("Gemini quiz generation error, trying Groq fallback:", err);
    // 2. Try Groq
    if (process.env.GROQ_API_KEY) {
      try {
        const raw = await groqGenerateQuiz(prompt);
        return parseQuestionsJson(raw, questionType, numQuestions);
      } catch (groqErr) {
        console.error("Groq quiz generation fallback error:", groqErr);
      }
    }
  }

  return [];
}

// ─── Document Chat ──────────────────────────────────────────────────────
export async function chatWithDocContext(
  messages: { role: string; content: string }[],
  docContext: string
): Promise<string> {
  const systemPrompt = `You are StudyAI, an intelligent study assistant. You help students understand their uploaded study materials. You answer questions accurately based on the provided document context. If the answer isn't in the context, say so honestly but still try to help using your general knowledge.

Be concise, clear, and educational. Use markdown formatting when helpful (headers, lists, bold, code blocks). If explaining a concept, break it into simple steps.

Document Context:
${docContext.slice(0, 12000)}`;

  const conversationHistory = messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  // 1. Try Gemini
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "I understand. I'm ready to help you study this material. What would you like to know?" }] },
        ...conversationHistory,
      ],
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (err) {
    console.error("Gemini doc context chat error, trying Groq fallback:", err);
    // 2. Try Groq
    if (process.env.GROQ_API_KEY) {
      try {
        return await groqChat(messages, systemPrompt);
      } catch (groqErr) {
        console.error("Groq doc context chat fallback error:", groqErr);
      }
    }
    return "⚠️ **AI Tutor Service Unavailable**: Both Gemini and Groq API keys are currently rate-limited or exhausted. Please try again later.";
  }
}

// ─── General Tutor Chat ─────────────────────────────────────────────────
export async function tutorChat(
  messages: { role: string; content: string }[]
): Promise<string> {
  const systemPrompt = `You are StudyAI Tutor, a friendly and knowledgeable study companion. You help students with ANY academic topic — explaining concepts, solving problems, suggesting study strategies, and motivating them.

Rules:
- Be encouraging and supportive
- Use clear, simple language
- Use markdown formatting (headers, lists, bold, code blocks) when helpful
- Break complex topics into digestible steps
- Give examples when explaining abstract concepts
- If asked about non-academic topics, gently redirect to study-related help`;

  const conversationHistory = messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  // 1. Try Gemini
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Hey! 👋 I'm your StudyAI Tutor. I can help you with any subject — from math and science to history and literature. What would you like to learn about today?" }] },
        ...conversationHistory,
      ],
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (err) {
    console.error("Gemini general tutor chat error, trying Groq fallback:", err);
    // 2. Try Groq
    if (process.env.GROQ_API_KEY) {
      try {
        return await groqChat(messages, systemPrompt);
      } catch (groqErr) {
        console.error("Groq general tutor chat fallback error:", groqErr);
      }
    }
    return "⚠️ **AI Tutor Service Unavailable**: Both Gemini and Groq API keys are currently rate-limited or exhausted. Please try again later.";
  }
}
