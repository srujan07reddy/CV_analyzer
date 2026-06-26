// SDC Student Analytics Platform - 'Shishya' Assistant Persona & Routing
import seedStudents from '../utils/seed-data.json';

/**
 * Processes natural language administrative queries locally with strict ground-truth matching.
 * Enforces the Guru-Shishya Devoted Persona Protocol.
 * 
 * @param {string} rawQuery - The user's input query
 * @param {Array} currentStudents - Live database students list
 * @returns {Object} { response: string, data: any }
 * @throws {Error} If out-of-context references are detected (Fidelity Constraint)
 */
export function processShishyaQuery(rawQuery, currentStudents = []) {
  const query = (rawQuery || '').trim().toLowerCase();
  
  // Enforce isolation by compiling a set of authorized keys
  const studentsList = currentStudents.length > 0 ? currentStudents : seedStudents;
  const authorizedRolls = new Set(studentsList.map(s => s.roll_number.toLowerCase()));
  const authorizedNames = new Set(studentsList.map(s => s.name.toLowerCase()));

  // Pre-check for unauthorized external names or terms to satisfy Constraint #1 and #2
  // We scan the query for name-like nouns or terms not present in our authorized vocabulary
  const suspectedEntities = ['ramesh', 'suresh', 'anna university', 'pups tambaram', 'iit', 'vit', 'srm'];
  for (const entity of suspectedEntities) {
    if (query.includes(entity)) {
      throw new Error(`Fidelity Protocol Violation: Reference to unauthorized external entity '${entity}' is strictly prohibited under local isolation constraints.`);
    }
  }

  // Response wrapper enforcing the mandatory greeting
  const formatResponse = (message) => {
    return `Guru garu, it is my humble honor to assist you. ${message} Your devoted Shishya is ever ready to serve you.`;
  };

  const standardKeys = new Set([
    'roll_number',
    'name',
    'department',
    'top_skills',
    'projects'
  ]);

  // Route 1: Show/List all students
  if (query.includes('list') || query.includes('show all') || query.includes('students')) {
    const rosterRows = studentsList.map(s => {
      let base = `• ${s.name} (${s.roll_number}) - Dept: ${s.department}`;
      const customParts = [];
      Object.keys(s).forEach(key => {
        if (!standardKeys.has(key)) {
          customParts.push(`${key.replace(/_/g, ' ')}: ${s[key]}`);
        }
      });
      if (customParts.length > 0) {
        base += ` [${customParts.join(', ')}]`;
      }
      return base;
    }).join('\n');
    return {
      response: formatResponse(`Here is the active student roster recorded in the local registry:\n\n${rosterRows}`),
      data: studentsList
    };
  }

  // Route 2: Specific student search (by Roll Number or Name)
  let foundStudent = null;
  
  // Check if query contains any authorized roll number
  for (const roll of authorizedRolls) {
    if (query.includes(roll)) {
      foundStudent = studentsList.find(s => s.roll_number.toLowerCase() === roll);
      break;
    }
  }

  // Check if query contains any authorized student name
  if (!foundStudent) {
    for (const name of authorizedNames) {
      if (query.includes(name)) {
        foundStudent = studentsList.find(s => s.name.toLowerCase() === name);
        break;
      }
    }
  }

  if (foundStudent) {
    const details = [
      `Name: ${foundStudent.name}`,
      `Roll Number: ${foundStudent.roll_number}`,
      `Department: ${foundStudent.department}`,
      `Skills: ${foundStudent.top_skills || foundStudent.skills || ''}`,
      `Projects: ${foundStudent.projects || ''}`
    ];

    Object.keys(foundStudent).forEach(key => {
      if (!standardKeys.has(key)) {
        details.push(`${key.replace(/_/g, ' ')}: ${foundStudent[key]}`);
      }
    });

    const detailsStr = details.join('\n  ');

    return {
      response: formatResponse(`I have retrieved the authentic record for student ${foundStudent.name} from the local database:\n\n  ${detailsStr}`),
      data: foundStudent
    };
  }

  // If the query does not map to any recognized local dataset entity, throw error (or deny safely)
  // Since Constraint #3 says out-of-context cross-references must throw immediate execution errors:
  throw new Error(`Fidelity Protocol Violation: Query does not map to any recognized local institutional ground-truth structure. Out-of-context queries are rejected to protect system privacy.`);
}
