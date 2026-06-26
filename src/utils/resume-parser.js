// Lightweight resume section parser
// If `templateSections` is provided (array of section names), the parser will try to find those headings first.
export function extractSections(rawText, templateSections = []) {
  if (!rawText) return {};
  const text = String(rawText).replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);

  // Build a set of possible headings (lowercased)
  const defaultHeadings = ['objective', 'summary', 'skills', 'technical skills', 'projects', 'project', 'education', 'experience', 'work experience', 'contact', 'achievements', 'certifications'];
  const headings = Array.from(new Set([...templateSections.map(s => s.toLowerCase()), ...defaultHeadings]));

  const sections = {};
  let current = 'header';
  sections[current] = [];

  const headingRegex = new RegExp('^(' + headings.map(h => h.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')).join('|') + ')[\s:\-]*$', 'i');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const low = line.toLowerCase();
    // A line that is a heading if it matches heading words or is ALL CAPS short
    const isAllCaps = /^[A-Z0-9 &]{2,}$/.test(line) && line.split(' ').length <= 5;
    if (headingRegex.test(low) || isAllCaps) {
      // normalize heading
      const match = headingRegex.exec(low);
      const head = match ? match[1] : line;
      current = head.toLowerCase();
      if (!sections[current]) sections[current] = [];
      continue;
    }
    sections[current].push(line);
  }

  // Post-process sections: join lines
  const out = {};
  Object.keys(sections).forEach(k => {
    out[k] = sections[k].join('\n');
  });

  // Extract skills as comma/line separated tokens if present
  if (out['skills'] && out['skills'].length > 0) {
    out['skills_list'] = out['skills'].split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  }

  // Extract projects as list: split by lines or bullets
  const projectCandidates = out['projects'] || out['project'] || '';
  if (projectCandidates) {
    const projList = projectCandidates.split(/\n+|\r+|\u2022|\u2023|\-|\*|—/).map(s => s.trim()).filter(Boolean);
    out['projects_list'] = projList;
  }

  return out;
}

export default extractSections;
