/**
 * View Employee Profile Modal (Read-Only) — Wonderly Design System.
 * Clean, perfectly spaced modal with Resume, Private Info, and Salary tabs.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth';
import api from '../../lib/api';
import type { EmployeeDetail, SalaryComponent } from '../../types';
import { X, Edit3, Award, Mail, Phone, Calendar, MapPin, User, Heart } from 'lucide-react';

interface EmployeeViewModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (userId: number) => void;
}

export default function EmployeeViewModal({
  userId,
  isOpen,
  onClose,
  onEdit,
}: EmployeeViewModalProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr_officer';
  const [activeTab, setActiveTab] = useState<'resume' | 'private' | 'salary'>('resume');

  const { data: employee, isLoading } = useQuery<EmployeeDetail>({
    queryKey: ['employee-detail', userId],
    queryFn: async () => {
      const res = await api.get(`/employees/${userId}`);
      return res.data;
    },
    enabled: isOpen && userId !== null,
  });

  if (!isOpen || !userId) return null;

  const firstName = employee?.first_name || employee?.profile?.first_name || '';
  const lastName = employee?.last_name || employee?.profile?.last_name || '';
  const photoUrl = employee?.profile_picture_url || employee?.profile?.profile_picture_url;
  const designation = employee?.designation || employee?.profile?.designation || 'Team Member';
  const department = employee?.department || employee?.profile?.department || 'General';
  const initials = firstName ? `${firstName[0]}${lastName[0] || ''}`.toUpperCase() : 'U';

  const tabButtonStyle = (tab: 'resume' | 'private' | 'salary') => ({
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '700',
    borderBottom: activeTab === tab ? '2px solid #743A24' : '2px solid transparent',
    color: activeTab === tab ? '#743A24' : '#8A7970',
    backgroundColor: 'transparent',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '660px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${firstName} ${lastName}`}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '1px solid #EFE7DC',
                }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  backgroundColor: '#F7EDE7',
                  color: '#743A24',
                  fontWeight: '900',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #EEDCD3',
                }}
              >
                {initials}
              </div>
            )}

            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1F1713', margin: 0 }}>
                  {firstName} {lastName}
                </h2>
                <span className="badge-pill-terracotta" style={{ fontFamily: 'monospace' }}>
                  {employee?.login_id}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#8A7970', fontWeight: '600', margin: '2px 0 0 0' }}>
                {designation} • {department}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(userId);
                }}
                className="btn-terracotta"
                style={{ padding: '8px 14px', fontSize: '12px' }}
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              onClick={onClose}
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
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 28px',
            backgroundColor: '#FAF5EE',
            borderBottom: '1px solid #EFE7DC',
          }}
        >
          <button onClick={() => setActiveTab('resume')} style={tabButtonStyle('resume')}>
            Profile & Resume
          </button>
          <button onClick={() => setActiveTab('private')} style={tabButtonStyle('private')}>
            Private Info
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('salary')} style={tabButtonStyle('salary')}>
              Salary & Compensation
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#8A7970', fontSize: '13px' }}>
              Loading employee details...
            </div>
          ) : employee ? (
            <>
              {/* TAB 1: RESUME */}
              {activeTab === 'resume' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* 3 Metric Info Boxes */}
                  <div className="info-grid">
                    <div className="info-box">
                      <span className="info-box-label">Email Address</span>
                      <span className="info-box-value">{employee.email}</span>
                    </div>
                    <div className="info-box">
                      <span className="info-box-label">Phone</span>
                      <span className="info-box-value">{employee.phone || 'Not specified'}</span>
                    </div>
                    <div className="info-box">
                      <span className="info-box-label">Date of Joining</span>
                      <span className="info-box-value">
                        {String(employee.date_of_joining || employee.profile?.date_of_joining || 'Not specified')}
                      </span>
                    </div>
                  </div>

                  {/* About Section */}
                  <div>
                    <div className="section-subtitle">ABOUT</div>
                    <div
                      style={{
                        backgroundColor: '#FAF5EE',
                        border: '1px solid #EFE7DC',
                        borderRadius: '16px',
                        padding: '16px',
                        fontSize: '13px',
                        color: '#2C211B',
                        lineHeight: '1.6',
                      }}
                    >
                      {employee.about || employee.profile?.about || 'No about biography specified yet.'}
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div>
                    <div className="section-subtitle">
                      <Award size={14} /> SKILLS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {employee.skills && employee.skills.length > 0 ? (
                        employee.skills.map((s, idx) => (
                          <span key={idx} className="badge-pill-terracotta">
                            {typeof s === 'string' ? s : (s as any).skill_name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: '#8A7970' }}>No skills added yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRIVATE INFO */}
              {activeTab === 'private' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="info-grid">
                    <div className="info-box">
                      <span className="info-box-label">Date of Birth</span>
                      <span className="info-box-value">
                        {String(employee.date_of_birth || employee.private_info?.date_of_birth || 'Not specified')}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-box-label">Gender</span>
                      <span className="info-box-value">
                        {employee.gender || employee.private_info?.gender || 'Not specified'}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-box-label">Blood Group</span>
                      <span className="info-box-value">
                        {employee.blood_group || employee.private_info?.blood_group || 'Not specified'}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-box-label">Marital Status</span>
                      <span className="info-box-value">
                        {employee.marital_status || employee.private_info?.marital_status || 'Single'}
                      </span>
                    </div>
                  </div>

                  <div className="info-box" style={{ width: '100%' }}>
                    <span className="info-box-label">Home Address</span>
                    <span className="info-box-value">
                      {employee.home_address || employee.private_info?.home_address || 'Not specified'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: SALARY */}
              {activeTab === 'salary' && isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {employee.salary_structure ? (
                    <>
                      <div className="info-grid">
                        <div className="info-box" style={{ backgroundColor: '#F7EDE7', borderColor: '#EEDCD3' }}>
                          <span className="info-box-label" style={{ color: '#743A24' }}>Monthly Wage</span>
                          <span className="info-box-value" style={{ color: '#743A24', fontSize: '18px' }}>
                            ₹{Number(employee.salary_structure.month_wage).toLocaleString()}
                          </span>
                        </div>
                        <div className="info-box" style={{ backgroundColor: '#FEF7EC', borderColor: '#F8E3C0' }}>
                          <span className="info-box-label" style={{ color: '#B57410' }}>Yearly CTC</span>
                          <span className="info-box-value" style={{ color: '#B57410', fontSize: '18px' }}>
                            ₹{Number(employee.salary_structure.yearly_wage).toLocaleString()}
                          </span>
                        </div>
                        <div className="info-box">
                          <span className="info-box-label">Days / Week</span>
                          <span className="info-box-value">
                            {employee.salary_structure.working_days_per_week} days
                          </span>
                        </div>
                        <div className="info-box">
                          <span className="info-box-label">Work Hours/Day</span>
                          <span className="info-box-value">
                            {employee.salary_structure.basic_hours} hrs
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="section-subtitle">COMPONENT BREAKDOWN</div>
                        <div
                          style={{
                            border: '1px solid #EFE7DC',
                            borderRadius: '16px',
                            overflow: 'hidden',
                          }}
                        >
                          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F7EFE6', color: '#743A24', fontWeight: '700' }}>
                                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Component</th>
                                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Type</th>
                                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Calculation</th>
                                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {employee.salary_structure.components?.map((c: SalaryComponent, i: number) => (
                                <tr key={c.id || i} style={{ borderTop: '1px solid #F0E8DD' }}>
                                  <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1F1713' }}>{c.name}</td>
                                  <td style={{ padding: '10px 14px', color: '#6A5A52', textTransform: 'capitalize' }}>
                                    {c.compensation_type}
                                  </td>
                                  <td style={{ padding: '10px 14px', color: '#8A7970' }}>
                                    {c.compensation_type === 'percentage'
                                      ? `${c.percentage_value}% of ${c.percentage_of}`
                                      : 'Fixed amount'}
                                  </td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#743A24' }}>
                                    ₹{Number(c.amount).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#8A7970', backgroundColor: '#FAF5EE', borderRadius: '16px', border: '1px solid #EFE7DC', fontSize: '13px' }}>
                      No salary structure configured for this employee yet.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
