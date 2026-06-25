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
  'leadtalks': 'lead_talks_delivered',
  'lead_talks': 'lead_talks_delivered',
  'leadtalksdelivered': 'lead_talks_delivered',
  'lead_talks_delivered': 'lead_talks_delivered',
  'rubiks': 'rubiks_cube_events',
  'rubikscube': 'rubiks_cube_events',
  'rubiks_cube_events': 'rubiks_cube_events',
  'rubiks_events': 'rubiks_cube_events',
  'outreach': 'outreach_visits_pups_manivakkam',
  'outreach_visits': 'outreach_visits_pups_manivakkam',
  'outreachvisits': 'outreach_visits_pups_manivakkam',
  'pups_outreach': 'outreach_visits_pups_manivakkam',
  'outreach_visits_pups_manivakkam': 'outreach_visits_pups_manivakkam',
  'maskoff': 'mask_off_attendance',
  'mask_off': 'mask_off_attendance',
  'maskoffattendance': 'mask_off_attendance',
  'mask_off_attendance': 'mask_off_attendance',
  'wellness': 'wellness_score',
  'wellnessscore': 'wellness_score',
  'wellness_score': 'wellness_score'
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
  const headers = rawHeaders.map(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return HEADER_MAPPING[clean] || clean;
  });

  // Verify necessary headers: roll_number and name are required
  if (!headers.includes('roll_number') || !headers.includes('name')) {
    return {
      success: false,
      errors: ['Invalid headers. Missing required fields: Roll Number (roll_number) or Name (name). Available columns: ' + rawHeaders.join(', ')],
      validRecords: []
    };
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
    // Map headers keys just in case
    const normalizedRecord = {};
    Object.keys(record).forEach(key => {
      const clean = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const mappedKey = HEADER_MAPPING[clean] || key;
      normalizedRecord[mappedKey] = record[key];
    });

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
  const rollRegex = /^\d{2}[A-Z]{3}\d{3}$/;
  if (!roll) {
    return { valid: false, message: 'Missing Roll Number' };
  }
  if (!rollRegex.test(roll)) {
    return { valid: false, message: `Invalid Roll Number template '${roll}'. Must match SDC template: 2 digits, 3 letters, 3 digits (e.g. 16SAM022).` };
  }

  // 2. Name
  let name = (record.name || '').toString().trim();
  if (!name) {
    return { valid: false, message: 'Missing Student Name' };
  }

  // 3. Department
  let rawDept = (record.department || '').toString().trim();
  let dept = 'Computer Science'; // default
  if (rawDept) {
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
        return { valid: false, message: `Invalid department '${rawDept}'. Must be one of: ${VALID_DEPARTMENTS.join(', ')}` };
      }
    }
  }

  // 4. Activity stats & Wellness
  const parseNum = (val, defaultValue = 0) => {
    if (val === undefined || val === null || val === '') return defaultValue;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? -1 : parsed;
  };

  const leadTalks = parseNum(record.lead_talks_delivered, 0);
  const rubiks = parseNum(record.rubiks_cube_events, 0);
  const outreach = parseNum(record.outreach_visits_pups_manivakkam, 0);
  const maskOff = parseNum(record.mask_off_attendance, 0);
  const wellness = parseNum(record.wellness_score, 80);

  if (leadTalks < 0) return { valid: false, message: 'Lead Talks must be a non-negative integer.' };
  if (rubiks < 0) return { valid: false, message: "Rubik's Cube Events must be a non-negative integer." };
  if (outreach < 0) return { valid: false, message: 'Outreach visits must be a non-negative integer.' };
  if (maskOff < 0) return { valid: false, message: 'MASK OFF attendance must be a non-negative integer.' };
  if (wellness < 0 || wellness > 100) return { valid: false, message: 'Wellness Score must be an integer between 0 and 100.' };

  return {
    valid: true,
    record: {
      roll_number: roll,
      name,
      department: dept,
      lead_talks_delivered: leadTalks,
      rubiks_cube_events: rubiks,
      outreach_visits_pups_manivakkam: outreach,
      mask_off_attendance: maskOff,
      wellness_score: wellness
    }
  };
}

export function generateCSVSampleTemplate() {
  const headers = [
    'roll_number',
    'name',
    'department',
    'lead_talks_delivered',
    'rubiks_cube_events',
    'outreach_visits_pups_manivakkam',
    'mask_off_attendance',
    'wellness_score'
  ].join(',');
  const sampleRow1 = '16SAM101,Rohan Sharma,Computer Science,3,2,1,4,85';
  const sampleRow2 = '16SAM102,Anjali Devi,Information Technology,1,4,3,2,90';
  return `${headers}\n${sampleRow1}\n${sampleRow2}`;
}
