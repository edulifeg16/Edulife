import React, { useContext, useState } from 'react';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api/apiConfig';
import '../../index.css'; // Ensure styles are applied

const Profile = () => {
  const { user, token, login } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', disabilityType: user?.disabilityType || '' });
  const [saving, setSaving] = useState(false);

  // This handles the case where the page loads before user data is available
  if (!user) {
    return (
      <div className="dashboard-layout">
        <StudentSidebar />
        <main className="main-content">
          <h1>Loading Profile...</h1>
        </main>
      </div>
    );
  }

  // A simple inline style for the details card
  const cardStyle = {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    maxWidth: '500px',
  };

  const detailStyle = {
    fontSize: '18px',
    color: '#333',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
    marginBottom: '10px',
  };

  const labelStyle = {
    fontWeight: '600',
    color: '#555',
    marginRight: '10px',
  };

  return (
    <div className="dashboard-layout">
      <StudentSidebar />
      <main className="main-content">
        <h1>My Profile</h1>
          <div style={cardStyle}>
            {!editing ? (
              <>
                <p style={detailStyle}>
                  <span style={labelStyle}>Name:</span> {user.name}
                </p>
                <p style={detailStyle}>
                  <span style={labelStyle}>Email:</span> {user.email}
                </p>
                <p style={detailStyle}>
                  <span style={labelStyle}>Disability Type:</span> {user.disabilityType}
                </p>
                <p style={{...detailStyle, borderBottom: 'none', marginBottom: '0'}}>
                  <span style={labelStyle}>Role:</span> {user.role}
                </p>
                <div style={{ marginTop: '12px' }}>
                  <button onClick={() => setEditing(true)} style={{ padding: '8px 12px', borderRadius: '6px', background: '#3B82F6', color: '#fff', border: 'none' }}>Edit Profile</button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Disability Type</label>
                  <select value={form.disabilityType} onChange={(e) => setForm({ ...form, disabilityType: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
                    <option value="">Select</option>
                    <option value="hearing">Hearing Impaired</option>
                    <option value="visual">Visually Impaired</option>
                    <option value="cognitive">Cognitive Impaired</option>
                    <option value="mobility">Mobility Impaired</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button disabled={saving} onClick={async () => {
                    setSaving(true);
                    try {
                      const userId = user?._id || user?.id;
                      if (!userId) throw new Error('User id not available');
                      const headers = token ? { Authorization: `Bearer ${token}` } : {};
                      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', ...headers },
                        body: JSON.stringify(form)
                      });
                      if (!res.ok) throw new Error('Update failed');
                      const updated = await res.json();
                      // refresh auth context/user
                      login(updated, token);
                      setEditing(false);
                    } catch (err) {
                      console.error('Failed to update profile', err);
                      alert('Failed to update profile.');
                    } finally {
                      setSaving(false);
                    }
                  }} style={{ padding: '8px 12px', borderRadius: '6px', background: '#10B981', color: '#fff', border: 'none' }}>{saving ? 'Saving...' : 'Save'}</button>
                  <button disabled={saving} onClick={() => { setEditing(false); setForm({ name: user?.name || '', email: user?.email || '', disabilityType: user?.disabilityType || '' }); }} style={{ padding: '8px 12px', borderRadius: '6px', background: '#E5E7EB', color: '#111827', border: 'none' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
      </main>
    </div>
  );
};

// This line is essential. Your error is caused by it being missing.
export default Profile;