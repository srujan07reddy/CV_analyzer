import React, { useState } from 'react';
import { MapPin, BookOpen, Clock, Users } from 'lucide-react';

export default function OutreachTracker({ outreachList, onSaveOutreach, onDeleteOutreach }) {
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

      {/* Outreach Logs */}
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
    </div>
  );
}
