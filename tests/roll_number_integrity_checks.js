// SDC Analytics Platform - CI/CD Roll Number Integrity Checks
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const ROLL_NUMBER_REGEX = /^\d{2}[A-Z]{3}\d{3}$/;

// Authorized master roster roll numbers (immutable 2018-2019 baseline)
const AUTHORIZED_ROSTER = new Set([
  '16SAM022',
  '16SAM025',
  '16SAM048',
  '16SAM099'
]);

function runIntegrityChecks() {
  console.log('[CI/CD] Starting Roll Number Integrity Checks...');

  const seedDataPath = path.resolve(__dirname, '../src/utils/seed-data.json');
  
  if (!fs.existsSync(seedDataPath)) {
    console.error(`[FAIL] Seed data file not found at: ${seedDataPath}`);
    process.exit(1);
  }

  let students = [];
  try {
    const rawData = fs.readFileSync(seedDataPath, 'utf8');
    students = JSON.parse(rawData);
  } catch (err) {
    console.error('[FAIL] Failed to parse seed-data.json:', err.message);
    process.exit(1);
  }

  let validationFailed = false;

  students.forEach((student, index) => {
    const { roll_number, name } = student;

    // Check 1: Format Validation
    if (!roll_number) {
      console.error(`[FAIL] Student record at index ${index} lacks a roll number.`);
      validationFailed = true;
      return;
    }

    if (!ROLL_NUMBER_REGEX.test(roll_number)) {
      console.error(`[FAIL] Format Mismatch: Roll number '${roll_number}' for student '${name}' does not match pattern '\\d{2}[A-Z]{3}\\d{3}' (e.g. 16SAM022).`);
      validationFailed = true;
    }

    // Check 2: Authorized Master Roster Match (Isolation & Domain constraint)
    if (!AUTHORIZED_ROSTER.has(roll_number)) {
      console.error(`[FAIL] Unauthorized Entry: Roll number '${roll_number}' for student '${name}' is not in the authorized SDC master roster.`);
      validationFailed = true;
    }
  });

  if (validationFailed) {
    console.error('[FAIL] Integrity check failed. Blocking branch compilation/commit.');
    process.exit(1);
  } else {
    console.log('[SUCCESS] All student roll numbers verified against SDC master roster.');
    process.exit(0);
  }
}

runIntegrityChecks();
