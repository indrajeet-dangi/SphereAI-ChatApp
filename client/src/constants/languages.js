export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
  { code: "ta", label: "Tamil" },
  { code: "gu", label: "Gujarati" },
];

export const LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES.map((item) => item.code));

export const normalizeLanguage = (language) => {
  const normalized = String(language || "").toLowerCase();
  return LANGUAGE_SET.has(normalized) ? normalized : "en";
};

export const getLanguageLabel = (language) => {
  const normalized = normalizeLanguage(language);
  return SUPPORTED_LANGUAGES.find((item) => item.code === normalized)?.label || "English";
};
