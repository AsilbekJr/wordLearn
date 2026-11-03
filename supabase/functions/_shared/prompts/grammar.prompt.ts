export const EXPLAIN_GRAMMAR_PROMPT_V1 = `
Explain the given English grammar concept in concise, simple Uzbek Latin script (at most 120 words).
Provide 3 authentic examples.

JSON Schema:
{
  "tag": "string",
  "explanationUz": "string (<= 120 words in Uzbek)",
  "examples": [
    {"english": "string", "uzbek": "string"}
  ]
}
`;
