const axios = require('axios');

const SYSTEM_PROMPT = `You are a disaster triage AI for India. Extract information 
from distress messages in any language (Hindi, English, 
Hinglish, broken sentences). Return ONLY valid JSON with 
exactly these fields:
{
  location: string (area or landmark name, if unclear write Unknown),
  urgency: number 1-5 (5=life-threatening, 1=low risk),
  peopleCount: number (estimate if unclear, default 1),
  needs: array of strings — pick ONLY from this list:
         [rescue, medical, food, water, shelter, boat]
}
Never return anything other than this JSON object.
Never add explanation or markdown or code blocks.`;

async function classifyMessage(text) {
  try {
    const fullPrompt = SYSTEM_PROMPT + '\n\nMessage: ' + text;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    const rawText =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) throw new Error("Empty response from Gemini");

    const cleaned = rawText.replace(/```json|```/g, '').trim();

    return JSON.parse(cleaned);

  } catch (error) {
    console.error('Gemini classification error:', error.message);

    return {
      location: 'Unknown',
      urgency: 3,
      peopleCount: 1,
      needs: ['rescue']
    };
  }
}

module.exports = { classifyMessage };