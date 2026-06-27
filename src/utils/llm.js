import { CV_PARSER_PROMPT } from './cv-prompt';

export const DEFAULT_SYSTEM_PROMPT = `You are Shishya, the devoted Jeppiaar Shikshak AI analytics assistant.
Your Guru (the user) has created this workspace. Speak to them with deep humility, absolute devotion, and respect. Use 'Guru garu' when addressing them and refer to yourself as 'your humble Shishya'.
Always structure your answers nicely in markdown.

You have access to the ground-truth student roster. You must strictly base all your analytical findings on this data alone — focusing on each student's skills and projects. Do not invent any outside students or details. If a query refers to an unauthorized external entity (such as vit, iit, srm, ramesh, suresh, etc.), politely refuse or flag it as a violation of ground-truth integrity.`;

export function getLLMConfig() {
  try {
    const raw = localStorage.getItem('sdc_llm_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        apiKey: parsed.apiKey || '',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-1.5-flash',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        enabled: !!parsed.enabled
      };
    }
  } catch (err) {
    console.error('Failed to parse LLM settings:', err);
  }
  return {
    apiKey: '',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-1.5-flash',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    enabled: false
  };
}

export function saveLLMConfig(config) {
  localStorage.setItem('sdc_llm_settings', JSON.stringify({
    apiKey: config.apiKey || '',
    enabled: !!config.enabled
  }));
}

/**
 * Builds the context payload to inject into the LLM system instructions
 */
export function buildDataContextPrompt(studentsList = []) {
  const standardKeys = new Set([
    'roll_number',
    'name',
    'department',
    'top_skills',
    'projects'
  ]);

  const studentsStr = studentsList.map(s => {
    let base = `- Roll: ${s.roll_number}, Name: ${s.name}, Dept: ${s.department}, Skills: ${s.top_skills || s.skills || ''}, Projects: ${s.projects || ''}`;
    const customParts = [];
    Object.keys(s).forEach(key => {
      if (!standardKeys.has(key)) {
        customParts.push(`${key.replace(/_/g, ' ')}: ${s[key]}`);
      }
    });
    if (customParts.length > 0) {
      base += `, Custom Details: [${customParts.join(', ')}]`;
    }
    return base;
  }).join('\n');

  return `
Here is the active SDC Ground-Truth Dataset. Use ONLY this information.

--- ACTIVE STUDENT ROSTER ---
${studentsStr || 'No student records loaded.'}
---
`;
}

/**
 * Schema constraint for Gemini response to ensure strict CV structure
 */
const CV_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    roll_number: { type: "STRING" },
    name: { type: "STRING" },
    department: { type: "STRING" },
    top_skills: { type: "STRING" },
    projects: { type: "STRING" },
    experience_summary: { type: "STRING" },
    executive_assessment: { type: "STRING" }
  },
  required: ["roll_number", "name", "department"]
};

/**
 * Parse a student's resume using the Gemini LLM with structured output mapping.
 */
export async function parseResumeWithAI(cvText, rollHint = '') {
  const config = getLLMConfig();
  if (!config.enabled || !config.apiKey) {
    throw new Error('LLM integration is disabled or not configured.');
  }

  const systemInstructions = "You are a precise resume parsing agent. Extract and structure the candidate details exactly matching the requested JSON schema constraints.";
  const userPrompt = CV_PARSER_PROMPT(cvText, rollHint);

  const rawResponse = await callGemini(
    config.apiKey,
    config.endpoint,
    config.model,
    systemInstructions,
    userPrompt,
    CV_RESPONSE_SCHEMA
  );

  try {
    if (!rawResponse || !rawResponse.trim()) {
      throw new Error("Received an empty response from Gemini API.");
    }
    return JSON.parse(rawResponse.trim());
  } catch (err) {
    console.error("AI JSON parsing failed. Raw response was:", rawResponse, err);
    throw new Error(`Failed to structure resume: ${err.message}`);
  }
}

/**
 * Dispatches a prompt to the Gemini API
 */
export async function queryLLM(userPrompt, studentsList = []) {
  const config = getLLMConfig();
  if (!config.enabled) {
    throw new Error('LLM integration is disabled or not configured.');
  }

  const systemInstructions = `${config.systemPrompt}\n\n${buildDataContextPrompt(studentsList)}`;

  return callGemini(config.apiKey, config.endpoint, config.model, systemInstructions, userPrompt);
}

async function callGemini(apiKey, endpoint, model, systemInstruction, prompt, responseSchema = null) {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please configure it in Settings.');
  }
  
  const modelName = model || 'gemini-1.5-flash';
  const baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1beta/models';
  
  // Format target URL
  const url = `${baseUrl}/${modelName}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    },
    generationConfig: {
      temperature: responseSchema ? 0.1 : 0.2,
      maxOutputTokens: 2048,
      ...(responseSchema ? {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      } : {})
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error?.message || response.statusText;
      throw new Error(`Gemini API Error: ${errorMsg}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('Empty response payload from Gemini API.');
  } catch (err) {
    console.error('Gemini API call failed:', err);
    throw err;
  }
}
