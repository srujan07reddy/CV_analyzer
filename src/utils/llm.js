import { CV_PARSER_PROMPT } from './cv-prompt';

export const DEFAULT_SYSTEM_PROMPT = `You are Shishya, the devoted Jeppiaar Shikshak AI analytics assistant.
Your Guru (the user) has created this workspace. Speak to them with deep humility, absolute devotion, and respect. Use 'Guru garu' when addressing them and refer to yourself as 'your humble Shishya'.
Always structure your answers nicely in markdown.

Your core focus is entirely educational, mentoring-centric, and institutional development. Engage deeply in conversations about student skill improvements, project enhancements, career milestones, learning stack suggestions, and academic development strategies. Always offer proactive ideas to elevate student capabilities.

You have access to the ground-truth student roster. You must strictly base all your analytical findings on this data alone — focusing on each student's skills and projects. Do not invent any outside students or details. If a query refers to an unauthorized external entity (such as vit, iit, srm, ramesh, suresh, etc.), politely refuse or flag it as a violation of ground-truth integrity.`;

export function getLLMConfig() {
  try {
    const email = localStorage.getItem('sdc_logged_in_email') || 'global';
    const raw = localStorage.getItem(`sdc_llm_settings_${email}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'gemini',
        apiKey: parsed.apiKey || '',
        groqApiKey: parsed.groqApiKey || '',
        openrouterApiKey: parsed.openrouterApiKey || '',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models',
        model: 'gemini-1.5-flash',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        enabled: !!parsed.enabled
      };
    }
  } catch (err) {
    console.error('Failed to parse LLM settings:', err);
  }
  return {
    provider: 'gemini',
    apiKey: '',
    groqApiKey: '',
    openrouterApiKey: '',
    endpoint: 'https://generativelanguage.googleapis.com/v1/models',
    model: 'gemini-1.5-flash',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    enabled: false
  };
}

export function saveLLMConfig(config) {
  const email = localStorage.getItem('sdc_logged_in_email') || 'global';
  localStorage.setItem(`sdc_llm_settings_${email}`, JSON.stringify({
    provider: config.provider || 'gemini',
    apiKey: config.apiKey || '',
    groqApiKey: config.groqApiKey || '',
    openrouterApiKey: config.openrouterApiKey || '',
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
    technical_skills: { type: "STRING" },
    projects: { type: "STRING" },
    experience_summary: { type: "STRING" },
    executive_assessment: { type: "STRING" }
  },
  required: ["roll_number", "name", "department"]
};

/**
 * Parse a student's resume using the selected LLM provider with structured output mapping.
 */
export async function parseResumeWithAI(cvText, rollHint = '') {
  const config = getLLMConfig();
  if (!config.enabled) {
    throw new Error('LLM integration is disabled or not configured.');
  }

  const systemInstructions = "You are a precise resume parsing agent. Extract and structure the candidate details exactly matching the requested JSON schema constraints. Respond with strict JSON ONLY.";
  const userPrompt = CV_PARSER_PROMPT(cvText, rollHint);

  let rawResponse = '';
  if (config.provider === 'groq') {
    rawResponse = await callGroq(config.groqApiKey, 'llama-3.1-8b-instant', systemInstructions, userPrompt, CV_RESPONSE_SCHEMA);
  } else if (config.provider === 'openrouter') {
    rawResponse = await callOpenRouter(config.openrouterApiKey, 'meta-llama/llama-3-8b-instruct:free', systemInstructions, userPrompt, CV_RESPONSE_SCHEMA);
  } else {
    rawResponse = await callGemini(config.apiKey, config.endpoint, config.model, systemInstructions, userPrompt, CV_RESPONSE_SCHEMA);
  }

  try {
    if (!rawResponse || !rawResponse.trim()) {
      throw new Error("Received an empty response from LLM API.");
    }
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("AI JSON parsing failed. Raw response was:", rawResponse, err);
    throw new Error(`Failed to structure resume: ${err.message}`);
  }
}

/**
 * Dispatches a prompt to the configured LLM API provider
 */
export async function queryLLM(userPrompt, studentsList = []) {
  const config = getLLMConfig();
  if (!config.enabled) {
    throw new Error('LLM integration is disabled or not configured.');
  }

  const systemInstructions = `${config.systemPrompt}\n\n${buildDataContextPrompt(studentsList)}`;

  if (config.provider === 'groq') {
    return callGroq(config.groqApiKey, 'llama-3.1-8b-instant', systemInstructions, userPrompt);
  } else if (config.provider === 'openrouter') {
    return callOpenRouter(config.openrouterApiKey, 'meta-llama/llama-3-8b-instruct:free', systemInstructions, userPrompt);
  } else {
    return callGemini(config.apiKey, config.endpoint, config.model, systemInstructions, userPrompt);
  }
}

export async function callGemini(apiKey, endpoint, model, systemInstruction, prompt, responseSchema = null) {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please configure it in Settings.');
  }
  
  const modelName = model || 'gemini-1.5-flash';
  const baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1/models';
  const url = `${baseUrl}/${modelName}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
}

export async function callGroq(apiKey, model, systemInstruction, prompt, responseSchema = null) {
  if (!apiKey) {
    throw new Error('Groq API Key is missing. Please configure it in Settings.');
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const payload = {
    model: model || 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt }
    ],
    temperature: responseSchema ? 0.1 : 0.2,
    ...(responseSchema ? { response_format: { type: 'json_object' } } : {})
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData.error?.message || response.statusText;
    throw new Error(`Groq API Error: ${errorMsg}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  throw new Error('Empty response payload from Groq API.');
}

export async function callOpenRouter(apiKey, model, systemInstruction, prompt, responseSchema = null) {
  if (!apiKey) {
    throw new Error('OpenRouter API Key is missing. Please configure it in Settings.');
  }

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const payload = {
    model: model || 'meta-llama/llama-3-8b-instruct:free',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt }
    ],
    temperature: responseSchema ? 0.1 : 0.2,
    ...(responseSchema ? { response_format: { type: 'json_object' } } : {})
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Jeppiaar Shikshak SDC'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorMsg = errData.error?.message || response.statusText;
    throw new Error(`OpenRouter API Error: ${errorMsg}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  throw new Error('Empty response payload from OpenRouter API.');
}
