import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface Persona {
  id: string;
  name: string;
  age: number;
  gender: string;
  education: string;
  income: string;
  interests: string[];
  proxy?: string; // Optional proxy URL: http://user:pass@host:port
  location: {
    city: string;
    country: string;
    timezone: string;
    locale: string;
    lat: number;
    lng: number;
  };
  behavior_traits: {
    hesitation: number; // 0-1
    inconsistency: number; // 0-1
    tone: string; // casual, formal, etc.
  };
}

export async function generateAnswer(persona: Persona, question: string, options: string[] = []) {
  const prompt = `
    You are ${persona.name}, a ${persona.age}-year-old ${persona.gender}.
    Education: ${persona.education}
    Income: ${persona.income}
    Interests: ${persona.interests.join(', ')}
    Behavior Traits: ${JSON.stringify(persona.behavior_traits)}

    You are completing a survey. 
    Question: "${question}"
    ${options.length > 0 ? `Options: ${options.join(', ')}` : 'This is an open-ended question.'}

    Respond as this persona would. 
    - If it's multiple choice, pick one of the options exactly as written.
    - If it's open-ended, give a short, natural response (1-2 sentences).
    - Include minor imperfections or casual tone if appropriate for the persona.
    - Avoid AI-like phrasing.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        },
        required: ["answer"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function analyzePage(persona: Persona, pageContext: any) {
  const prompt = `You are an expert survey automation assistant. 
  Persona: ${JSON.stringify(persona)}
  Page Title: ${pageContext.title}
  URL: ${pageContext.url}
  Questions & Elements: ${JSON.stringify(pageContext.questions)}

  Analyze the page and determine the best actions to take to answer the survey questions as this persona.
  For each question, identify the correct input element and the value to provide.
  
  CRITICAL: 
  1. Return a list of actions (click, type, select).
  2. For 'type' actions, provide the 'value'.
  3. For 'select' actions, provide the 'value' (option value).
  4. Use the most specific selector possible (id is best, otherwise use a robust CSS selector).
  5. If multiple elements are needed (e.g. clicking a radio button then 'Next'), include them in order.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          actions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["click", "type", "select"] },
                selector: { type: Type.STRING },
                value: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["type", "selector"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["actions", "summary"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function generatePersona() {
  const prompt = `Generate a realistic, diverse human persona for survey completion. 
  CRITICAL: The persona MUST be based in the United States of America.
  Include name, age (18-80), gender, education level, annual income range, 5 interests, and behavior traits (hesitation 0-1, inconsistency 0-1, tone).
  Also include a realistic USA location (city, state) with its corresponding timezone (e.g. America/New_York), locale (en-US), and approximate latitude/longitude.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          age: { type: Type.INTEGER },
          gender: { type: Type.STRING },
          education: { type: Type.STRING },
          income: { type: Type.STRING },
          interests: { type: Type.ARRAY, items: { type: Type.STRING } },
          location: {
            type: Type.OBJECT,
            properties: {
              city: { type: Type.STRING },
              country: { type: Type.STRING, description: "Must be 'United States'" },
              timezone: { type: Type.STRING },
              locale: { type: Type.STRING, description: "Must be 'en-US'" },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["city", "country", "timezone", "locale", "lat", "lng"]
          },
          behavior_traits: {
            type: Type.OBJECT,
            properties: {
              hesitation: { type: Type.NUMBER },
              inconsistency: { type: Type.NUMBER },
              tone: { type: Type.STRING }
            },
            required: ["hesitation", "inconsistency", "tone"]
          }
        },
        required: ["name", "age", "gender", "education", "income", "interests", "location", "behavior_traits"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}
