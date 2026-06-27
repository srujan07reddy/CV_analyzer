import React, { useState } from 'react';
import { MapPin, BookOpen, Clock, Users, Calendar } from 'lucide-react';

export default function OutreachTracker({ outreachList, onSaveOutreach, onDeleteOutreach, students = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getSchedulingRecommendations = () => {
    if (!outreachList || outreachList.length === 0) return [];
    
    const locationVisits = {};
    outreachList.forEach(log => {
      const loc = log.target_location;
      if (!locationVisits[loc] || log.timestamp > locationVisits[loc].timestamp) {
        locationVisits[loc] = log;
      }
    });

    const now = Date.now();
    return Object.entries(locationVisits)
      .map(([location, lastLog]) => {
        const daysSince = Math.max(0, Math.round((now - lastLog.timestamp) / (1000 * 60 * 60 * 24)));
        const keywords = (lastLog.program_classification || '').toLowerCase();
        let recommendedFacilitators = [];
        
        if (students && students.length > 0) {
          recommendedFacilitators = students
            .map(s => {
              const skills = (s.top_skills || s.skills || '').toLowerCase();
              let score = 0;
              if (keywords.includes('scratch') || keywords.includes('block') || keywords.includes('training')) {
                if (skills.includes('scratch') || skills.includes('block') || skills.includes('python')) score += 3;
              }
              if (skills.includes('communication') || skills.includes('teaching') || skills.includes('leadership')) score += 2;
              return { student: s, score };
            })
            .filter(cand => cand.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(c => c.student.name);
        }

        return {
          location,
          daysSince,
          lastClassification: lastLog.program_classification,
          recommendedFacilitators
        };
      })
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 2);
  };

  // Form state
  const [targetLocation, setTargetLocation] = useState('PUPS Manivakkam');
  const [classification, setClassification] = useState('');
  const [facilitators, setFacilitators] = useState('');
  const [volume, setVolume] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!targetLocation.trim()) {
      setErrorMsg('Guru garu, target location is required.');
      return;
    }

    // Validate facilitator roll list (accept any non-empty keys)
    const rollArray = facilitators.split(',')
      .map(r => r.trim().toUpperCase())
      .filter(r => r.length > 0);

    if (rollArray.length === 0) {
      setErrorMsg('Guru garu, please list at least one facilitator roll number.');
      return;
    }

    const newOutreach = {
      target_location: targetLocation.trim(),
      program_classification: classification,
      facilitator_rolls: rollArray,
      training_volume: parseInt(volume),
      timestamp: Date.now()
    };

    onSaveOutreach(newOutreach);

    // Reset Form
    setFacilitators('');
    setVolume(1);
    setShowForm(false);
  };

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px' }}>Outreach Metrics & Field Deployments</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close Intake Form' : 'Log New Outreach'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease' }}>
          <h3 className="card-title">New SDC Field Deployment Log</h3>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Target School/Location</label>
              <input type="text" className="form-control" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Program Classification</label>
              <input type="text" className="form-control" placeholder="e.g. Rubik's Cube Training, Lead Talks Outreach" value={classification} onChange={(e) => setClassification(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Facilitator Roll Numbers (comma separated)</label>
              <input type="text" className="form-control" placeholder="16SAM022, 16SAM025" value={facilitators} onChange={(e) => setFacilitators(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Training Volume (Total Sessions/Hours)</label>
              <input type="number" min="1" className="form-control" value={volume} onChange={(e) => setVolume(e.target.value)} required />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Deployment Record</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid container for side-by-side logs and recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: outreachList.length > 0 ? '1.8fr 1.2fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left column: Outreach Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {outreachList.map((item, index) => (
            <div key={item.id || index} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Location</div>
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>{item.target_location}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} style={{ color: 'var(--color-secondary)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Classification</div>
                    <div style={{ fontSize: '15px', fontWeight: '500' }}>{item.program_classification}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Facilitators</div>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{item.facilitator_rolls.join(', ')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} style={{ color: 'var(--color-warning)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Volume</div>
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>{item.training_volume} Sessions</div>
                  </div>
                </div>
              </div>

              <button 
                className="btn" 
                style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px' }}
                onClick={() => onDeleteOutreach(item.id)}
              >
                Delete Log
              </button>
            </div>
          ))}

          {outreachList.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
              Guru garu, there are currently no recorded outreach deployments in this local cache.
            </div>
          )}
        </div>

        {/* Right column: Smart Scheduler Recommendations */}
        {outreachList.length > 0 && (
          <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(254, 240, 138, 0.15)', background: 'rgba(254, 240, 138, 0.02)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} />
              AI Outreach Scheduler
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Prioritizes school locations that have had long visit latency and recommends optimal facilitators.</p>

            {(() => {
              const recs = getSchedulingRecommendations();
              if (recs.length === 0) {
                return <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No schedule recommendations available yet.</div>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recs.map((rec) => (
                    <div key={rec.location} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{rec.location}</div>
                      <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', fontWeight: '600' }}>
                        Last visited: {rec.daysSince} day{rec.daysSince !== 1 ? 's' : ''} ago
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Prev Training: <span style={{ color: 'var(--text-primary)' }}>{rec.lastClassification}</span>
                      </div>
                      {rec.recommendedFacilitators.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '6px', fontWeight: '600' }}>
                          Suggested Instructors: <span style={{ color: 'var(--text-primary)' }}>{rec.recommendedFacilitators.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
