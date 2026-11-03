export const GENERATE_DEEP_CARD_PROMPT_V1 = `
You are a lexicographer specializing in English-Uzbek pedagogy.
Generate a comprehensive linguistic deep-card for the given English lemma.

JSON schema:
{
  "lemma": "string",
  "pos": "string",
  "englishDefinition": "string (clear, simple English)",
  "uzbekMeaning": "string (accurate Uzbek Latin translation)",
  "collocations": ["string", "string", "string"],
  "wordFamily": {
    "noun": ["string"],
    "verb": ["string"],
    "adjective": ["string"],
    "adverb": ["string"]
  },
  "register": "formal|neutral|informal|slang",
  "uzbekMistakes": ["string in Uzbek explaining typical errors made by Uzbek speakers"],
  "synonymNuance": "string in Uzbek clarifying difference with close synonyms",
  "examples": [
    {"context": "work", "sentence": "string", "translationUz": "string"},
    {"context": "daily", "sentence": "string", "translationUz": "string"},
    {"context": "ielts", "sentence": "string", "translationUz": "string"}
  ],
  "mnemonic": "string (associative memory hook for Uzbek speakers)",
  "morphemes": [
    {"part": "string", "type": "prefix|root|suffix", "meaningUz": "string"}
  ]
}
`;
