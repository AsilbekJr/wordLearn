export const GENERATE_TRANSFORM_DRILLS_PROMPT_V1 = `
Generate 3 to 5 controlled grammar transformation drills based on the English sentence and its grammar tag.
Format strictly in JSON:
{
  "original": "string",
  "drills": [
    {
      "instructionUz": "string (masalan: 'Inkor shakliga oʻtkazing' yoki 'Egalik olmoshini She ga almashtiring')",
      "targetType": "subject|polarity|question|tense",
      "prompt": "string",
      "expectedAnswer": "string",
      "acceptedVariants": ["string"]
    }
  ]
}
`;
