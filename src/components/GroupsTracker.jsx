import React, { useState } from 'react';
import { Users, Plus, Trash2, Upload, Compass, Check, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import { parseAndValidateMembers } from '../utils/importer';

export default function GroupsTracker({ groupsList, onSaveGroup, onDeleteGroup }) {
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // New Group Form State
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [motto, setMotto] = useState('');

  // Inline forms state (keyed by group ID)
  const [activeAddMemberGroup, setActiveAddMemberGroup] = useState(null); // ID of group showing member form
  const [memberName, setMemberName] = useState('');
  const [memberRoll, setMemberRoll] = useState('');
  const [memberPosition, setMemberPosition] = useState('Member');
  const [memberContact, setMemberContact] = useState('');

  // Bulk Upload State (keyed by group ID)
  const [activeBulkGroup, setActiveBulkGroup] = useState(null);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Editing Group State
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMotto, setEditMotto] = useState('');

  const handleCreateGroup = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!groupName.trim()) {
      setErrorMsg('Guru garu, group name is required.');
      return;
    }

    const newGroup = {
      name: groupName.trim(),
      description: description.trim(),
      motto: motto.trim(),
      members: []
    };

    onSaveGroup(newGroup);

    // Reset Form
    setGroupName('');
    setDescription('');
    setMotto('');
    setShowAddGroupForm(false);
  };

  const handleAddMember = (group) => {
    if (!memberName.trim()) {
      alert('Guru garu, member name is required.');
      return;
    }

    const newMember = {
      name: memberName.trim(),
      roll_number: memberRoll.trim().toUpperCase(),
      position: memberPosition.trim(),
      contact_info: memberContact.trim()
    };

    const updatedGroup = {
      ...group,
      members: [...(group.members || []), newMember]
    };

    onSaveGroup(updatedGroup);

    // Reset form
    setMemberName('');
    setMemberRoll('');
    setMemberPosition('Member');
    setMemberContact('');
    setActiveAddMemberGroup(null);
  };

  const handleDeleteMember = (group, memberIndex) => {
    if (window.confirm('Guru garu, are you sure you wish to remove this member?')) {
      const updatedMembers = [...(group.members || [])];
      updatedMembers.splice(memberIndex, 1);

      const updatedGroup = {
        ...group,
        members: updatedMembers
      };

      onSaveGroup(updatedGroup);
    }
  };

  const handleBulkMemberUpload = (e, group) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkErrors([]);
    setBulkSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const result = parseAndValidateMembers(text);

      if (result.validRecords.length > 0) {
        const updatedGroup = {
          ...group,
          members: [...(group.members || []), ...result.validRecords]
        };
        onSaveGroup(updatedGroup);
        setBulkSuccessMsg(`Successfully imported ${result.validRecords.length} members!`);
        setTimeout(() => {
          setBulkSuccessMsg('');
          setActiveBulkGroup(null);
        }, 2000);
      }

      if (result.errors && result.errors.length > 0) {
        setBulkErrors(result.errors);
      }
    };
    reader.readAsText(file);
  };

  const getPositionBadgeStyle = (position) => {
    const pos = (position || '').toLowerCase();
    if (pos.includes('lead') || pos.includes('president') || pos.includes('founder')) {
      return { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)' };
    }
    if (pos.includes('coordinator') || pos.includes('head')) {
      return { background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-secondary)', border: '1px solid rgba(139, 92, 246, 0.2)' };
    }
    if (pos.includes('trainer') || pos.includes('speaker') || pos.includes('exec')) {
      return { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.2)' };
    }
    return { background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(6, 182, 212, 0.2)' };
  };

  return (
    <div className="tab-content">
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Users style={{ color: 'var(--color-primary)' }} />
          SDC Communities & Groups Manager
        </h2>
        <button className="btn btn-primary" onClick={() => setShowAddGroupForm(!showAddGroupForm)}>
          {showAddGroupForm ? 'Close Creation Form' : 'Create New Group'}
        </button>
      </div>

      {/* Add Group Form */}
      {showAddGroupForm && (
        <div className="glass-card" style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease' }}>
          <h3 className="card-title">Register New Student Community</h3>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Group A, Group B" 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Motto / Core Message</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Building hardware solutions, Spreading awareness" 
                value={motto} 
                onChange={(e) => setMotto(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Group Description</label>
              <textarea 
                className="form-control" 
                rows="3" 
                placeholder="Describe the roles, outreach focus, or goals of this group..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddGroupForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Group Profile</button>
            </div>
          </form>
        </div>
      )}

      {/* Groups List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {groupsList.map((group) => (
          <div key={group.id} className="glass-card" style={{ border: '1px solid var(--border-color)', position: 'relative' }}>
            {/* Group details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
              {editingGroupId === group.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, maxWidth: '500px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Group Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '6px' }} 
                      value={editGroupName} 
                      onChange={(e) => setEditGroupName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Motto</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '6px' }} 
                      value={editMotto} 
                      onChange={(e) => setEditMotto(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Description</label>
                    <textarea 
                      className="form-control" 
                      style={{ padding: '6px' }} 
                      rows="2" 
                      value={editDescription} 
                      onChange={(e) => setEditDescription(e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => {
                        if (!editGroupName.trim()) {
                          alert('Guru garu, group name is required.');
                          return;
                        }
                        const updated = {
                          ...group,
                          name: editGroupName.trim(),
                          motto: editMotto.trim(),
                          description: editDescription.trim()
                        };
                        onSaveGroup(updated);
                        setEditingGroupId(null);
                      }}
                    >
                      Save Changes
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => setEditingGroupId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '20px', margin: '0 0 4px 0', color: 'var(--color-primary)' }}>{group.name}</h3>
                  {group.motto && <div style={{ fontSize: '13px', color: 'var(--color-secondary)', fontStyle: 'italic', marginBottom: '8px' }}>"{group.motto}"</div>}
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{group.description || 'No description provided.'}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setActiveAddMemberGroup(activeAddMemberGroup === group.id ? null : group.id);
                    setActiveBulkGroup(null);
                    setEditingGroupId(null);
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus size={14} /> Add Member
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setActiveBulkGroup(activeBulkGroup === group.id ? null : group.id);
                    setActiveAddMemberGroup(null);
                    setEditingGroupId(null);
                    setBulkErrors([]);
                    setBulkSuccessMsg('');
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Upload size={14} /> Bulk Add
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    if (editingGroupId === group.id) {
                      setEditingGroupId(null);
                    } else {
                      setEditingGroupId(group.id);
                      setEditGroupName(group.name);
                      setEditDescription(group.description || '');
                      setEditMotto(group.motto || '');
                      setActiveAddMemberGroup(null);
                      setActiveBulkGroup(null);
                    }
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Edit Group
                </button>
                <button 
                  className="btn" 
                  style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px' }}
                  onClick={() => {
                    if (window.confirm('Guru garu, are you absolutely sure you want to delete this group and all its member associations?')) {
                      onDeleteGroup(group.id);
                    }
                  }}
                >
                  Delete Group
                </button>
              </div>
            </div>

            {/* Inline Add Member Form */}
            {activeAddMemberGroup === group.id && (
              <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', animation: 'fadeIn 0.2s ease' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Add Single Group Member</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Member Name</label>
                    <input type="text" className="form-control" style={{ padding: '6px' }} placeholder="e.g. Rajesh Kumar" value={memberName} onChange={(e) => setMemberName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Roll / Reg Number</label>
                    <input type="text" className="form-control" style={{ padding: '6px' }} placeholder="e.g. 16SAM022 (Optional)" value={memberRoll} onChange={(e) => setMemberRoll(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Position / Role</label>
                    <input type="text" className="form-control" style={{ padding: '6px' }} placeholder="e.g. Lead Coordinator, Member" value={memberPosition} onChange={(e) => setMemberPosition(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Contact Info</label>
                    <input type="text" className="form-control" style={{ padding: '6px' }} placeholder="e.g. email or phone number" value={memberContact} onChange={(e) => setMemberContact(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setActiveAddMemberGroup(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleAddMember(group)}>Save Member</button>
                </div>
              </div>
            )}

            {/* Inline Bulk Upload Form */}
            {activeBulkGroup === group.id && (
              <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Bulk Import Members via CSV</h4>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setActiveBulkGroup(null)}>
                    <X size={16} />
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                  Upload a CSV file containing columns like: `Student Name` (or `Name`), `Register Number` (or `Roll Number`), `Position`, `Contact Information`.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => handleBulkMemberUpload(e, group)}
                    style={{ fontSize: '12px' }}
                  />
                  {bulkSuccessMsg && <span style={{ color: 'var(--color-success)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> {bulkSuccessMsg}</span>}
                </div>

                {bulkErrors.length > 0 && (
                  <div style={{ marginTop: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--color-error)', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> Import Warnings:
                    </div>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {bulkErrors.map((err, idx) => <div key={idx}>• {err}</div>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Group Members ({group.members ? group.members.length : 0})
              </div>
              
              {group.members && group.members.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 4px' }}>Name</th>
                        <th style={{ padding: '8px 4px' }}>Roll / Reg Number</th>
                        <th style={{ padding: '8px 4px' }}>Position</th>
                        <th style={{ padding: '8px 4px' }}>Contact Info</th>
                        {/* Dynamic Custom Fields header */}
                        {group.members.some(m => Object.keys(m).some(k => k !== 'name' && k !== 'roll_number' && k !== 'position' && k !== 'contact_info')) && (
                          <th style={{ padding: '8px 4px' }}>Custom Details</th>
                        )}
                        <th style={{ padding: '8px 4px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.members.map((member, idx) => {
                        const customKeys = Object.keys(member).filter(k => 
                          k !== 'name' && k !== 'roll_number' && k !== 'position' && k !== 'contact_info'
                        );
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 4px', fontWeight: '500' }}>{member.name}</td>
                            <td style={{ padding: '8px 4px', fontFamily: 'monospace' }}>{member.roll_number || 'N/A'}</td>
                            <td style={{ padding: '8px 4px' }}>
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', ...getPositionBadgeStyle(member.position) }}>
                                {member.position || 'Member'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>{member.contact_info || 'N/A'}</td>
                            {/* Render custom keys if any */}
                            {group.members.some(m => Object.keys(m).some(k => k !== 'name' && k !== 'roll_number' && k !== 'position' && k !== 'contact_info')) && (
                              <td style={{ padding: '8px 4px', fontSize: '11px', color: 'var(--color-secondary)' }}>
                                {customKeys.map(k => `${k}: ${member[k]}`).join(', ')}
                              </td>
                            )}
                            <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                              <button 
                                style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px' }}
                                onClick={() => handleDeleteMember(group, idx)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No members registered in this group yet. Add single member or upload bulk CSV.
                </div>
              )}
            </div>
          </div>
        ))}

        {groupsList.length === 0 && (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Compass size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <div>Guru garu, no student groups/communities are registered in this database.</div>
            <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-muted)' }}>Click the 'Create New Group' button to establish a new group manifest.</div>
          </div>
        )}
      </div>
    </div>
  );
}
