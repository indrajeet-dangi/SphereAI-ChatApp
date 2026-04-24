const Groq = require("groq-sdk");
const { normalizeLanguage, toLanguageLabel } = require("./language");

const cleanModelOutput = (text) =>
  String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

const extractJsonObject = (text) => {
  const raw = String(text || "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return raw.slice(start, end + 1);
};

const extractTaskFromMessage = async (messageText, targetLanguage = "en") => {
  if (!messageText || !String(messageText).trim()) return null;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const langCode = normalizeLanguage(targetLanguage);
  const langLabel = toLanguageLabel(langCode);
  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const prompt = `
Extract any actionable task or reminder from the message.

Return ONLY JSON:
{
  "title": "...",
  "description": "...",
  "dueDate": "...",
  "priority": "low | medium | high"
}

Rules:
* If no task, return: null
* Title and description MUST be in ${langLabel}
* Use ONLY pure ${langLabel}
* Do NOT mix languages
* Do NOT add explanation
* Title must be short
* Description must be clear and useful

Message:
"${String(messageText).trim()}"
`;

  const response = await groq.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt.trim() }],
    temperature: 0.1,
  });

  const raw = cleanModelOutput(response?.choices?.[0]?.message?.content || "");
  if (!raw || raw.toLowerCase() === "null") return null;

  try {
    const jsonText = extractJsonObject(raw) || raw;
    const parsed = JSON.parse(jsonText);
    const title = cleanModelOutput(parsed?.title);
    const description = cleanModelOutput(parsed?.description);
    if (!title) return null;

    const dueDateValue = parsed?.dueDate ? new Date(parsed.dueDate) : null;
    const dueDate = dueDateValue && !Number.isNaN(dueDateValue.getTime()) ? dueDateValue : null;
    const priorityValue = String(parsed?.priority || "medium").toLowerCase();
    const priority = ["low", "medium", "high"].includes(priorityValue) ? priorityValue : "medium";

    return {
      title,
      description: description || title,
      dueDate,
      priority,
    };
  } catch {
    return null;
  }
};

module.exports = { extractTaskFromMessage };
