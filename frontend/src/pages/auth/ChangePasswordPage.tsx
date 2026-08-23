/**
 * Forced password change page — Wonderly Design System.
 * Clean, centered layout with balanced form styling.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { KeyRound, ArrowRight } from 'lucide-react';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_new_password) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', form);
      if (user) setUser({ ...user, must_change_password: false });
      toast.success('Password changed successfully! Welcome to Dayflow.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FAF5EE',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px 20px',
        textAlign: 'left',
      }}
    >
      <div
        className="wonderly-card"
        style={{ width: '100%', maxWidth: '440px', padding: '36px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              backgroundColor: '#F7EDE7',
              color: '#743A24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1F1713', margin: 0 }}>
              Set New Password
            </h2>
            <p style={{ fontSize: '12px', color: '#8A7970', margin: '2px 0 0 0' }}>
              Replace temporary credentials before entering
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-section">
          <div className="form-group">
            <label className="label">Temporary Password *</label>
            <input
              type="password"
              className="input-field"
              placeholder="Temporary password from email"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">New Secure Password *</label>
            <input
              type="password"
              className="input-field"
              placeholder="Min 8 chars, 1 upper, 1 special"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Confirm New Password *</label>
            <input
              type="password"
              className="input-field"
              placeholder="Re-enter new password"
              value={form.confirm_new_password}
              onChange={(e) => setForm({ ...form, confirm_new_password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-terracotta"
            style={{ width: '100%', padding: '13px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Updating Password...' : (
              <>
                <span>Change Password & Enter</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
