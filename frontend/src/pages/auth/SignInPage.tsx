/**
 * Sign In page — Wonderly Design System.
 * Editorial split-screen layout with spacious auth card and quick login chips.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { ArrowRight, Sparkles, Clock, Calculator, ShieldCheck } from 'lucide-react';

export default function SignInPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ login: 'admin@dayflow.app', password: 'Admin@123' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      loginStore(data.access_token, data.refresh_token, {
        id: data.user_id,
        role: data.role,
        email: form.login,
        login_id: form.login,
        company_id: 0,
        must_change_password: data.must_change_password,
      });
      if (data.must_change_password) {
        navigate('/change-password');
      } else {
        toast.success('Welcome back to Dayflow!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (login: string, pass: string) => {
    setForm({ login, password: pass });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FAF5EE',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 48px',
        textAlign: 'left',
      }}
    >
      {/* Brand Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              backgroundColor: '#743A24',
              color: '#FFFFFF',
              fontWeight: '900',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(116, 58, 36, 0.25)',
            }}
          >
            D
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#1F1713', letterSpacing: '0.5px' }}>
              DAYFLOW
            </span>
          </div>
        </div>

        <Link to="/signup" className="btn-sand">
          Register Company
        </Link>
      </header>

      {/* Main Split Section */}
      <main
        style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '48px',
          alignItems: 'center',
          padding: '24px 0',
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span className="badge-pill-terracotta" style={{ alignSelf: 'flex-start' }}>
              <Sparkles size={13} color="#743A24" />
              MODERN HRMS PLATFORM
            </span>

            <h1
              style={{
                fontSize: '48px',
                fontWeight: '900',
                color: '#1F1713',
                letterSpacing: '-1px',
                lineHeight: '1.15',
                margin: 0,
              }}
            >
              Workplace Alignment{' '}
              <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: '400', color: '#743A24' }}>
                for High-Growth Teams.
              </span>
            </h1>

            <p style={{ fontSize: '16px', color: '#8A7970', lineHeight: '1.6', margin: 0, maxWidth: '520px' }}>
              Empowering HR, managers, and employees with real-time presence roster, automated 2-pass cascading payroll, and seamless time-off governance.
            </p>
          </div>

          {/* Feature Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', border: '1px solid #EFE7DC', borderRadius: '16px', padding: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#F7EDE7', color: '#743A24', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <Clock size={18} />
              </div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1F1713', margin: 0 }}>Live Punch Console</h4>
              <p style={{ fontSize: '11px', color: '#8A7970', margin: '4px 0 0 0' }}>Optimistic check-in with presence</p>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', border: '1px solid #EFE7DC', borderRadius: '16px', padding: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#FEF7EC', color: '#E69C24', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <Calculator size={18} />
              </div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1F1713', margin: 0 }}>2-Pass Salary Engine</h4>
              <p style={{ fontSize: '11px', color: '#8A7970', margin: '4px 0 0 0' }}>Basic ➔ HRA cascade calculation</p>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', border: '1px solid #EFE7DC', borderRadius: '16px', padding: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#E8F8F0', color: '#27AE60', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <ShieldCheck size={18} />
              </div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1F1713', margin: 0 }}>Time Off & Leave</h4>
              <p style={{ fontSize: '11px', color: '#8A7970', margin: '4px 0 0 0' }}>Paid, sick, and auto quota sync</p>
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            className="wonderly-card"
            style={{ width: '100%', maxWidth: '440px', padding: '36px' }}
          >
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1F1713', margin: 0 }}>
                Sign in to Dayflow
              </h2>
              <p style={{ fontSize: '12px', color: '#8A7970', margin: '4px 0 0 0' }}>
                Enter your Login ID or company email to access your portal
              </p>
            </div>

            <form onSubmit={handleSubmit} className="form-section">
              <div className="form-group">
                <label className="label">Login ID / Email</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. admin@dayflow.app or ORDIME20260001"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-terracotta"
                style={{ width: '100%', padding: '13px', marginTop: '4px' }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : (
                  <>
                    <span>Continue to Workspace</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid #F0E8DD', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: '#8A7970', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Quick Demo Access
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => quickLogin('admin@dayflow.app', 'Admin@123')}
                  className="badge-pill-terracotta"
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  Admin / HR
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('priya.nair@dayflow.app', 'Employee@123')}
                  className="badge-pill-amber"
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  HR Officer
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('divya.menon@dayflow.app', 'Employee@123')}
                  style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: '#FAF5EE', color: '#4A3B33', border: '1px solid #E5DACD', cursor: 'pointer' }}
                >
                  Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', textAlign: 'center', fontSize: '12px', color: '#8A7970', paddingTop: '16px', borderTop: '1px solid #EFE8DD' }}>
        © 2026 Dayflow HRMS • Every workday, perfectly aligned.
      </footer>
    </div>
  );
}
