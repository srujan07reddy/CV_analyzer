/**
 * Jeppiaar Shikshak CV Parser prompt generator.
 * Optimizes output token counts to reduce latency while retaining critical profile fields.
 */
export const CV_PARSER_PROMPT = (text, rollHint = '') => {
  return `You are a precise Jeppiaar Shikshak CV parser. Analyze the resume text.
Output a strict JSON object with NO formatting, NO markdown backticks, NO "json" label, and NO conversational text.

Candidate Roll Number Hint: ${rollHint} (This corresponds to their official register number in xxJUyyyzzz format. Use this if valid, otherwise extract standard xxJUyyyzzz roll number from text).

JSON Structure:
{
  "roll_number": "standard roll number (format: xxJUyyyzzz)",
  "name": "candidate name",
  "department": "Computer Science | Information Technology | Electronics & Communication | Mechanical Engineering",
  "top_skills": "comma separated skills",
  "projects": "comma separated list of key projects developed by candidate",
  "experience_summary": "1 sentence summary",
  "executive_assessment": "Short bullet summary of candidate strengths (Max 3 lines)"
}

Resume Text:
${text}`;
};
