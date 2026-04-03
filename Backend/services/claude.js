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
  const fallback = { 
    location: 'Unknown', 
    urgency: 3, 
    peopleCount: 1, 
    needs: ['rescue'] 
  };

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

    let rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!rawText) throw new Error("Empty response from Gemini");

    // 1. Clean the response before parsing
    rawText = rawText.replace(/```json|```/g, '').trim();
    
    // Find first { and last } to extract only the JSON part
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    
    if (start === -1 || end === -1) {
      console.warn('Gemini response did not contain a valid JSON object');
      return fallback;
    }
    
    const jsonStr = rawText.slice(start, end + 1);

    // 2. Wrap JSON.parse in try/catch
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON Parse Error from Gemini response:', e.message);
      return fallback;
    }

    // 3. Validate the parsed object has required fields
    const result = {
      location: typeof parsed.location === 'string' ? parsed.location : fallback.location,
      urgency: (typeof parsed.urgency === 'number' && parsed.urgency >= 1 && parsed.urgency <= 5) ? parsed.urgency : fallback.urgency,
      peopleCount: typeof parsed.peopleCount === 'number' ? parsed.peopleCount : fallback.peopleCount,
      needs: Array.isArray(parsed.needs) ? parsed.needs : fallback.needs
    };

    return result;

  } catch (error) {
    console.error('Gemini classification error:', error.message);
    return fallback;
  }
}

module.exports = { classifyMessage };
