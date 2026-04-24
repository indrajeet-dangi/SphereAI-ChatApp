const Groq = require("groq-sdk");
const { normalizeLanguage, toLanguageLabel } = require("./language");

const cleanTranslatedText = (text) =>
  String(text || "")
    .trim()
    .replace(/^```[\w-]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

const extractJsonObject = (raw) => {
  const text = String(raw || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
};

const translateMessageStrict = async ({ message, targetLanguage }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "";

  const normalizedTarget = normalizeLanguage(targetLanguage);
  const groq = new Groq({ apiKey });
  const targetLabel = toLanguageLabel(normalizedTarget);
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const prompt = `
Translate the following message into ${targetLabel}.

STRICT RULES:

* Use ONLY pure ${targetLabel}
* Do NOT mix languages
* Do NOT use Hinglish or mixed language
* Keep meaning exact
* Make it natural and fluent

Message:
"${message}"

Return ONLY translated text.
`;

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a strict translation engine." },
      { role: "user", content: prompt.trim() },
    ],
    temperature: 0.1,
  });

  return cleanTranslatedText(response?.choices?.[0]?.message?.content || "");
};

const translateMessagesBatchStrict = async ({ messages, targetLanguage }) => {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return messages.map(() => "");

  const groq = new Groq({ apiKey });
  const targetLabel = toLanguageLabel(normalizeLanguage(targetLanguage));
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const numberedMessages = messages
    .map((msg, index) => `${index + 1}. "${String(msg || "").replace(/"/g, '\\"')}"`)
    .join("\n");

  const prompt = `
Translate the following messages into ${targetLabel}.

STRICT RULES:

* Use ONLY pure ${targetLabel}
* Do NOT mix languages
* Do NOT use Hinglish
* Keep meaning exact
* Keep it natural

Messages:
${numberedMessages}

Return ONLY valid JSON in this format:
{"translations":["translated message 1","translated message 2"]}
`;

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a strict translation engine." },
      { role: "user", content: prompt.trim() },
    ],
    temperature: 0.1,
  });

  const raw = response?.choices?.[0]?.message?.content || "";
  const jsonString = extractJsonObject(raw);

  if (jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed?.translations)) {
        return parsed.translations.map((item) => cleanTranslatedText(item));
      }
    } catch {
      // Fallback below.
    }
  }

  const fallbackLines = String(raw)
    .split("\n")
    .map((line) => line.replace(/^\s*[-*0-9.)]+\s*/, "").trim())
    .filter(Boolean)
    .map(cleanTranslatedText);

  return messages.map((_, index) => fallbackLines[index] || "");
};

module.exports = {
  normalizeLanguage,
  cleanTranslatedText,
  translateMessageStrict,
  translateMessagesBatchStrict,
};
