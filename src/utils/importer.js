// SDC Student Analytics - Bulk Upload Importer Utility

const VALID_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering'
];

const DEPT_MAPPING = {
  'cs': 'Computer Science',
  'cse': 'Computer Science',
  'computer science': 'Computer Science',
  'it': 'Information Technology',
  'information technology': 'Information Technology',
  'ece': 'Electronics & Communication',
  'electronics': 'Electronics & Communication',
  'electronics & communication': 'Electronics & Communication',
  'electronics and communication': 'Electronics & Communication',
  'mech': 'Mechanical Engineering',
  'me': 'Mechanical Engineering',
  'mechanical': 'Mechanical Engineering',
  'mechanical engineering': 'Mechanical Engineering'
};

export function getDeptFromRoll(roll) {
  if (!roll) return null;
  const match = roll.toString().trim().toUpperCase().match(/^\d{2}JU([A-Z]+)\d{3}$/);
  if (!match) return null;
  
  const deptCode = match[1];
  switch (deptCode) {
    case 'AI':
      return 'AIML';
    case 'DS':
    case 'AIDS':
      return 'AIDS';
    case 'CYS':
      return 'cybersecurity';
    case 'CS':
      return 'General CSE';
    case 'EC':
      return 'ECE';
    default:
      return null;
  }
}

export function getYearFromRoll(roll) {
  if (!roll) return 'Unknown';
  const cleanRoll = roll.toString().trim().toUpperCase();
  const match = cleanRoll.match(/^(\d{2})/);
  if (match) {
    return '20' + match[1];
  }
  return 'Unknown';
}


const HEADER_MAPPING = {
  'rollnumber': 'roll_number',
  'roll_number': 'roll_number',
  'roll': 'roll_number',
  'studentid': 'roll_number',
  'student_id': 'roll_number',
  'name': 'name',
  'fullname': 'name',
  'full_name': 'name',
  'dept': 'department',
  'department': 'department',
  'skills': 'top_skills',
  'top_skills': 'top_skills',
  'topskills': 'top_skills',
  'projects': 'projects'
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseAndValidateCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { success: false, errors: ['File is empty'], validRecords: [] };
  }

  const rawHeaders = parseCSVLine(lines[0]);
  
  // Try to match core structural columns, keeping all other headings exactly as they are in the CSV
  let headers = rawHeaders.map(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.includes('roll') || clean.includes('reg') || clean.includes('id') || clean.includes('num')) {
      return 'roll_number';
    }
    if (clean.includes('name') || clean.includes('stud') || clean.includes('full')) {
      return 'name';
    }
    if (clean.includes('dept') || clean.includes('bran') || clean.includes('special')) {
      return 'department';
    }
    return h.trim(); // Keep original header name exactly
  });

  if (!headers.includes('roll_number') || !headers.includes('name')) {
    // Positional fallback for at least roll_number (index 0) and name (index 1) if we have at least 2 columns
    if (rawHeaders.length >= 2) {
      console.log('[Importer] Falling back to positional mapping for Roll Number (Col 1) and Name (Col 2).');
      headers = rawHeaders.map((h, idx) => {
        if (idx === 0) return 'roll_number';
        if (idx === 1) return 'name';
        if (idx === 2) return 'department';
        return h.trim();
      });
    } else {
      return {
        success: false,
        errors: ['Invalid headers. Headers must contain keywords for Roll Number and Name, or have at least 2 columns for positional mapping. Available columns: ' + rawHeaders.join(', ')],
        validRecords: []
      };
    }
  }

  const validRecords = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const values = parseCSVLine(lines[i]);
    
    // Skip completely empty lines
    if (values.length === 1 && values[0] === '') continue;

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });

    const validation = validateStudentField(record, lineNum);
    if (validation.valid) {
      validRecords.push(validation.record);
    } else {
      errors.push(`Row ${lineNum}: ${validation.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    validRecords
  };
}

export function parseAndValidateJSON(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return { success: false, errors: [`Invalid JSON formatting: ${err.message}`], validRecords: [] };
  }

  const records = Array.isArray(parsed) ? parsed : [parsed];
  const validRecords = [];
  const errors = [];

  records.forEach((record, index) => {
    const indexNum = index + 1;
    const normalizedRecord = {};
    
    Object.keys(record).forEach(key => {
      const clean = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      let mappedKey;
      
      if (clean.includes('roll') || clean.includes('reg') || clean.includes('id') || clean.includes('num')) {
        mappedKey = 'roll_number';
      } else if (clean.includes('name') || clean.includes('stud') || clean.includes('full')) {
        mappedKey = 'name';
      } else if (clean.includes('dept') || clean.includes('bran') || clean.includes('special')) {
        mappedKey = 'department';
      } else if (clean.includes('skill')) {
        mappedKey = 'top_skills';
      } else if (clean.includes('project')) {
        mappedKey = 'projects';
      } else {
        mappedKey = key.trim();
      }
      
      normalizedRecord[mappedKey] = record[key];
    });

    // Also support positional key mapping for JSON if keys are generic
    if (!normalizedRecord.roll_number || !normalizedRecord.name) {
      const keys = Object.keys(record);
      if (keys.length >= 2) {
        if (!normalizedRecord.roll_number) normalizedRecord.roll_number = record[keys[0]];
        if (!normalizedRecord.name) normalizedRecord.name = record[keys[1]];
      }
    }

    const validation = validateStudentField(normalizedRecord, indexNum);
    if (validation.valid) {
      validRecords.push(validation.record);
    } else {
      errors.push(`Item ${indexNum} (Roll: ${record.roll_number || 'N/A'}): ${validation.message}`);
    }
  });

  return {
    success: errors.length === 0,
    errors,
    validRecords
  };
}

function validateStudentField(record, rowIdentifier) {
  // 1. Roll Number
  let roll = (record.roll_number || '').toString().trim().toUpperCase();
  if (!roll) {
    return { valid: false, message: 'Missing Roll Number' };
  }

  // 2. Name
  let name = (record.name || '').toString().trim();
  if (!name) {
    return { valid: false, message: 'Missing Student Name' };
  }

  // 3. Department
  let rawDept = (record.department || '').toString().trim();
  let dept = '';
  const derivedDept = getDeptFromRoll(roll);
  if (derivedDept) {
    dept = derivedDept;
  } else if (rawDept) {
    const cleanDept = rawDept.toLowerCase().replace(/[^a-z0-9 &]/g, '');
    const mapped = DEPT_MAPPING[cleanDept];
    if (mapped) {
      dept = mapped;
    } else {
      // Find approximate or capitalised version
      const found = VALID_DEPARTMENTS.find(d => d.toLowerCase() === rawDept.toLowerCase());
      if (found) {
        dept = found;
      } else {
        // Keep the custom department name to adapt to any data
        dept = rawDept;
      }
    }
  }

  // Build validated record containing only the fields that were actually provided in the input record
  const validatedRecord = {
    roll_number: roll,
    name
  };
  if (dept) {
    validatedRecord.department = dept;
  }

  // 4. Custom and profile fields
  Object.keys(record).forEach(key => {
    if (key === 'roll_number' || key === 'name' || key === 'department') return;

    const value = record[key];
    const parsedVal = parseInt(value, 10);
    validatedRecord[key] = isNaN(parsedVal) ? value : parsedVal;
  });

  return {
    valid: true,
    record: validatedRecord
  };
}

export function generateCSVSampleTemplate() {
  const headers = [
    'roll_number',
    'name',
    'department',
    'top_skills',
    'projects'
  ].join(',');
  const sampleRow1 = 'xxJUyyyzzz,Arjun Sharma,Computer Science,Python, SQL,AI Chatbot';
  const sampleRow2 = 'xxJUyyyzzz,Bhavana Reddy,Computer Science,Java, HTML,CSS,Portfolio Site';
  return `${headers}\n${sampleRow1}\n${sampleRow2}`;
}

export function parseAndValidateMembers(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { success: false, errors: ['File is empty'], validRecords: [] };
  }

  const rawHeaders = parseCSVLine(lines[0]);
  let headers = rawHeaders.map(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.includes('roll') || clean.includes('reg') || clean.includes('id') || clean.includes('num')) {
      return 'roll_number';
    }
    if (clean.includes('name') || clean.includes('stud') || clean.includes('full')) {
      return 'name';
    }
    if (clean.includes('pos') || clean.includes('role') || clean.includes('resp')) {
      return 'position';
    }
    if (clean.includes('cont') || clean.includes('mail') || clean.includes('phone') || clean.includes('info')) {
      return 'contact_info';
    }
    return h.trim();
  });

  // Roll number is optional but name is required
  if (!headers.includes('name')) {
    // If we have at least 2 columns, map positionally
    if (rawHeaders.length >= 2) {
      headers = rawHeaders.map((h, idx) => {
        if (idx === 0) return 'roll_number';
        if (idx === 1) return 'name';
        if (idx === 2) return 'position';
        if (idx === 3) return 'contact_info';
        return h.trim();
      });
    } else {
      headers = ['name'];
    }
  }

  const validRecords = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const values = parseCSVLine(lines[i]);
    if (values.length === 1 && values[0] === '') continue;

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });

    const name = (record.name || '').toString().trim();
    if (!name) {
      errors.push(`Row ${lineNum}: Missing member name.`);
      continue;
    }

    const roll = (record.roll_number || '').toString().trim().toUpperCase();
    const position = (record.position || 'Member').toString().trim();
    const contact = (record.contact_info || '').toString().trim();

    const finalMember = {
      name,
      roll_number: roll,
      position,
      contact_info: contact
    };

    Object.keys(record).forEach(k => {
      if (k !== 'name' && k !== 'roll_number' && k !== 'position' && k !== 'contact_info') {
        finalMember[k] = record[k];
      }
    });

    validRecords.push(finalMember);
  }

  return {
    success: errors.length === 0,
    errors,
    validRecords
  };
}
