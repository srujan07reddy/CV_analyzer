export function isValidRollNumber(roll) {
  return /^[A-Za-z0-9]{2}JU[A-Za-z0-9]{3}\d{3}$/.test(String(roll || '').trim().toUpperCase());
}

export function isValidDob(dob) {
  return /^\d{2}-\d{2}-\d{4}$/.test(String(dob || '').trim());
}

export function buildResumeText(student, profile = {}) {
  const lines = [];
  lines.push(student.name || 'Student Name');
  lines.push(student.roll_number || '');
  lines.push(student.department || '');
  lines.push('');
  lines.push('Professional Summary');
  lines.push(profile.objective || 'Seeking opportunities to contribute with strong academic and practical skills.');
  lines.push('');
  lines.push('Contact');
  lines.push(profile.email || student.email || '');
  lines.push(profile.phone || '');
  lines.push(profile.address || '');
  lines.push('');
  lines.push('Education');
  lines.push(profile.education || 'Current student at Jeppiaar Shikshak');
  lines.push('');
  lines.push('Skills');
  lines.push(profile.skills || student.top_skills || '');
  lines.push('');
  lines.push('Projects');
  lines.push(profile.projects || student.projects || '');
  lines.push('');
  lines.push('Portfolio');
  lines.push(profile.portfolio || '');

  return lines.join('\n').trim();
}
