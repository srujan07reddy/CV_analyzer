// SDC Student Analytics Platform - Cognitive Analytics Engine

/**
 * Calculates detailed sub-scores and the final Leadership Score for a student.
 * 
 * Weights:
 * 1. Technical Mastery (40%): Based on Lead Talks delivery and Rubik's Cube events.
 * 2. Social Responsibility (35%): Based on rural outreach visits to PUPS Manivakkam.
 * 3. Soft-Growth & Wellness (25%): Mapped from MASK OFF seminar attendance and self-reports.
 * 
 * @param {Object} student - Student record containing activity stats
 * @returns {Object} Calculated scores breakdown and final score
 */
export function calculateStudentMetrics(student) {
  if (!student) {
    return {
      technicalMastery: 0,
      socialResponsibility: 0,
      softGrowth: 0,
      leadershipScore: 0
    };
  }

  // 1. Technical Mastery (Max 100)
  // Each Lead Talk gives 15 points, Rubik's Cube events give 10 points
  const leadTalksPoints = (student.lead_talks_delivered || 0) * 15;
  const rubiksPoints = (student.rubiks_cube_events || 0) * 10;
  const technicalMastery = Math.min(100, leadTalksPoints + rubiksPoints);

  // 2. Social Responsibility (Max 100)
  // Each rural outreach visit to PUPS Manivakkam gives 20 points
  const outreachPoints = (student.outreach_visits_pups_manivakkam || 0) * 20;
  const socialResponsibility = Math.min(100, outreachPoints);

  // 3. Soft-Growth & Emotional Wellness (Max 100)
  // Weighted blend of MASK OFF seminar attendance (10 points each) and wellness tracking logs (60% weight)
  const maskOffPoints = (student.mask_off_attendance || 0) * 10;
  const wellnessBase = (student.wellness_score || 0) * 0.6;
  const softGrowth = Math.min(100, Math.round(maskOffPoints + wellnessBase));

  // Cumulative weighted score
  const leadershipScore = parseFloat(
    ((technicalMastery * 0.40) + (socialResponsibility * 0.35) + (softGrowth * 0.25)).toFixed(2)
  );

  return {
    technicalMastery,
    socialResponsibility,
    softGrowth,
    leadershipScore
  };
}
