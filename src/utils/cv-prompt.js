/**
 * Fast SDC CV Parser prompt generator.
 * Optimizes output token counts to reduce latency while retaining critical metrics.
 */
export const CV_PARSER_PROMPT = (text, rollHint = '') => {
  return `You are a fast SDC CV parser. Analyze the resume text.
Output a strict JSON object with NO formatting, NO markdown backticks, NO "json" label, and NO conversational text.

Candidate Roll Number Hint: ${rollHint} (This corresponds to their official register number in xxJUyyyzzz format. Use this if valid, otherwise extract standard xxJUyyyzzz roll number from text).

JSON Structure:
{
  "roll_number": "standard roll number (format: xxJUyyyzzz)",
  "name": "candidate name",
  "department": "Computer Science | Information Technology | Electronics & Communication | Mechanical Engineering",
  "lead_talks_delivered": integer,
  "rubiks_cube_events": integer,
  "outreach_visits_pups_manivakkam": integer,
  "mask_off_attendance": integer,
  "top_skills": "comma separated skills",
  "experience_summary": "1 sentence summary",
  "executive_assessment": "Short bullet summary of candidate strengths (Max 3 lines)"
}

Resume Text:
${text}`;
};
