/**
 * Add Employee Modal — Wonderly Design System.
 * Provision a new employee with clean modal layout.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { EmployeeCard } from '../../types';
import { X, UserPlus, Sparkles, Check, Copy } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
  const queryClient = useQueryClient();
  const [createdInfo, setCreatedInfo] = useState<{ login_id: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: 'Engineering',
    designation: '',
    manager_id: '',
    date_of_joining: new Date().toISOString().split('T')[0],
  });

  const { data: employees } = useQuery<EmployeeCard[]>({
    queryKey: ['employees'],
    queryFn: async () => (await api.get('/employees')).data,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await api.post('/employees', {
        ...payload,
        manager_id: payload.manager_id ? Number(payload.manager_id) : null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee provisioned successfully!');
      setCreatedInfo({ login_id: data.login_id, email: data.email });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to provision employee');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const handleCopy = () => {
    if (createdInfo?.login_id) {
      navigator.clipboard.writeText(createdInfo.login_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Login ID copied to clipboard');
    }
  };

  const handleClose = () => {
    setCreatedInfo(null);
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: 'Engineering',
      designation: '',
      manager_id: '',
      date_of_joining: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                backgroundColor: '#F7EDE7',
                color: '#743A24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={20} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1F1713', margin: 0 }}>
                Provision New Employee
              </h3>
              <p style={{ fontSize: '12px', color: '#8A7970', margin: '2px 0 0 0' }}>
                Auto-generates Login ID & provisions leave balances
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#8A7970',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {createdInfo ? (
            <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#E8F8F0',
                  border: '1px solid #C8EFDB',
                  color: '#27AE60',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <Sparkles size={32} />
              </div>

              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1F1713', margin: 0 }}>
                  Employee Provisioned!
                </h3>
                <p style={{ fontSize: '13px', color: '#8A7970', marginTop: '6px' }}>
                  Temporary credentials and workspace invitation sent to{' '}
                  <strong style={{ color: '#743A24' }}>{createdInfo.email}</strong>.
                </p>
              </div>

              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  backgroundColor: '#FAF5EE',
                  border: '1px solid #EFE7DC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '11px', color: '#8A7970', fontWeight: '600' }}>
                    Generated Login ID
                  </span>
                  <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: '900', color: '#743A24', margin: '2px 0 0 0' }}>
                    {createdInfo.login_id}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="btn-sand"
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  {copied ? <Check size={14} color="#27AE60" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>

              <button onClick={handleClose} className="btn-terracotta" style={{ width: '100%', padding: '12px' }}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row-2">
                <div>
                  <label className="label">First Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Divya"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Menon"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="label">Work Email *</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="divya@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
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
                <div>
                  <label className="label">Department</label>
                  <select
                    className="input-field"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="label">Designation *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Software Engineer"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="label">Reporting Manager</label>
                  <select
                    className="input-field"
                    value={form.manager_id}
                    onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  >
                    <option value="">None / Self</option>
                    {employees?.map((emp) => (
                      <option key={emp.user_id} value={emp.user_id}>
                        {emp.first_name} {emp.last_name} ({emp.department || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Date of Joining *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={form.date_of_joining}
                    onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button type="button" onClick={handleClose} className="btn-sand">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="btn-terracotta"
                >
                  {mutation.isPending ? 'Provisioning...' : 'Provision Employee'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
