const SUPPORTED_LANGUAGE_CODES = ["en", "hi", "bn", "mr", "ta", "gu"];

const LANGUAGE_LABELS = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  mr: "Marathi",
  ta: "Tamil",
  gu: "Gujarati",
};

const isSupportedLanguage = (language) => SUPPORTED_LANGUAGE_CODES.includes(String(language || "").toLowerCase());

const normalizeLanguage = (language) => {
  const normalized = String(language || "").toLowerCase();
  return isSupportedLanguage(normalized) ? normalized : "en";
};

const toLanguageLabel = (language) => LANGUAGE_LABELS[normalizeLanguage(language)] || "English";

const getLanguageResponseInstruction = (language) => {
  const targetLanguage = toLanguageLabel(language);
  return `Respond ONLY in ${targetLanguage}. Do NOT mix languages. Keep it natural and human-like.`;
};

module.exports = {
  SUPPORTED_LANGUAGE_CODES,
  LANGUAGE_LABELS,
  isSupportedLanguage,
  normalizeLanguage,
  toLanguageLabel,
  getLanguageResponseInstruction,
};
