/**
 * Sign Up page — Wonderly Design System.
 * Creates a company + first admin user with clean form layout.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { ArrowRight, Building2 } from 'lucide-react';

export default function SignUpPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      const { data } = await api.post('/auth/signup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      login(data.access_token, data.refresh_token, {
        id: data.user_id,
        role: data.role,
        email: form.email,
        login_id: form.email,
        company_id: 0,
        must_change_password: data.must_change_password,
      });
      toast.success('Company created successfully!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Sign up failed');
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
        style={{ width: '100%', maxWidth: '560px', padding: '36px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              backgroundColor: '#743A24',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1F1713', margin: 0 }}>
              Register Your Company
            </h2>
            <p style={{ fontSize: '12px', color: '#8A7970', margin: '2px 0 0 0' }}>
              Create workspace and first administrator account
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-section">
          <div className="form-row-2">
            <div className="form-group">
              <label className="label">Company Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Orbit Tech"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Admin Full Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Divya Menon"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="label">Work Email *</label>
              <input
                type="email"
                className="input-field"
                placeholder="admin@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Phone Number</label>
              <input
                type="tel"
                className="input-field"
                placeholder="+91-XXXXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="label">Password *</label>
              <input
                type="password"
                className="input-field"
                placeholder="Min 8 chars, 1 uppercase"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password *</label>
              <input
                type="password"
                className="input-field"
                placeholder="Re-enter password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-terracotta"
            style={{ width: '100%', padding: '13px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Creating Company...' : (
              <>
                <span>Create Company & Admin</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #F0E8DD', marginTop: '8px' }}>
          <p style={{ fontSize: '12px', color: '#8A7970', margin: 0 }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#743A24', fontWeight: '800', textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
