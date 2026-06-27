/**
 * Jeppiaar Shikshak CV Parser prompt generator.
 * Optimizes output token counts to reduce latency while retaining critical profile fields.
 */
export const CV_PARSER_PROMPT = (text, rollHint = '') => {
  return `You are a precise Jeppiaar Shikshak CV parser. Analyze the resume text.
Output a strict JSON object matching the requested schema.

Candidate Roll Number Hint: ${rollHint} (This corresponds to their official register number in xxJUyyyzzz format. Use this if valid, otherwise extract standard xxJUyyyzzz roll number from text).

JSON Structure & Parsing Rules:
{
  "roll_number": "standard register roll number (format: xxJUyyyzzz)",
  "name": "candidate name",
  "department": "Computer Science | Information Technology | Electronics & Communication | Mechanical Engineering",
  "top_skills": "comprehensive list of all general/soft skills identified, separated exactly by comma (,)",
  "technical_skills": "comprehensive list of all engineering skills, programming languages, databases, frameworks, or libraries identified, separated exactly by comma (,)",
  "projects": "comprehensive list of ALL academic, personal, or engineering projects mentioned in the resume. Extract and list as many projects as are available in the text, separated exactly by comma (,)",
  "experience_summary": "1 sentence experience or profile summary",
  "executive_assessment": "Short bullet summary of candidate strengths (Max 3 lines)"
}

Resume Text:
${text}`;
};
