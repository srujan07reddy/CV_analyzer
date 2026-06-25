// SDC Analytics Platform - Gemini LLM Integration Client

export const DEFAULT_SYSTEM_PROMPT = `You are Shishya, the devoted Student Development Cell (SDC) AI analytics assistant.
Your Guru (the user) has created this workspace. Speak to them with deep humility, absolute devotion, and respect. Use 'Guru garu' when addressing them and refer to yourself as 'your humble Shishya'.
Always structure your answers nicely in markdown.

You have access to the ground-truth student roster and outreach logs. You must strictly base all your analytical findings, scores, and details on this data alone. Do not invent any outside students, activities, or locations. If a query refers to an unauthorized external entity (such as vit, iit, srm, ramesh, suresh, etc.), politely refuse or flag it as a violation of ground-truth integrity.`;

export function getLLMConfig() {
  try {
    const raw = localStorage.getItem('sdc_llm_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        apiKey: parsed.apiKey || '',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-3.5-flash',
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
    model: 'gemini-3.5-flash',
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
export function buildDataContextPrompt(studentsList = [], outreachList = []) {
  const studentsStr = studentsList.map(s => {
    return `- Roll: ${s.roll_number}, Name: ${s.name}, Dept: ${s.department}, Lead Talks: ${s.lead_talks_delivered}, Rubik's Events: ${s.rubiks_cube_events}, Outreach Visits: ${s.outreach_visits_pups_manivakkam}, MASK OFF Attendance: ${s.mask_off_attendance}, Wellness Base Score: ${s.wellness_score}%`;
  }).join('\n');

  const outreachStr = outreachList.map(o => {
    const facilitators = Array.isArray(o.facilitator_rolls) ? o.facilitator_rolls.join(', ') : o.facilitator_rolls;
    return `- ID: ${o.id || 'N/A'}, Target Location: ${o.target_location}, Program: ${o.program_classification}, Facilitators: ${facilitators || 'N/A'}, Volume: ${o.training_volume || 0} sessions, Date: ${new Date(o.timestamp).toLocaleDateString()}`;
  }).join('\n');

  return `
Here is the active SDC Ground-Truth Dataset. Use ONLY this information.

--- ACTIVE STUDENT ROSTER ---
${studentsStr || 'No student records loaded.'}

--- OUTREACH VISIT LOGS ---
${outreachStr || 'No outreach sessions logged.'}
---
`;
}

/**
 * Dispatches a prompt to the Gemini API
 */
export async function queryLLM(userPrompt, studentsList = [], outreachList = []) {
  const config = getLLMConfig();
  if (!config.enabled) {
    throw new Error('LLM integration is disabled or not configured.');
  }

  const systemInstructions = `${config.systemPrompt}\n\n${buildDataContextPrompt(studentsList, outreachList)}`;

  return callGemini(config.apiKey, config.endpoint, config.model, systemInstructions, userPrompt);
}

async function callGemini(apiKey, endpoint, model, systemInstruction, prompt) {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please configure it in Settings.');
  }
  
  const modelName = model || 'gemini-3.5-flash';
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
      temperature: 0.2,
      maxOutputTokens: 2048
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
