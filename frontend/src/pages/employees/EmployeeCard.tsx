/**
 * Employee Card — Wonderly Design System.
 * Clean, spacious card layout with generous breathing room and distinct status badges.
 */
import type { EmployeeCard as EmployeeCardType } from '../../types';
import { ChevronRight } from 'lucide-react';

interface EmployeeCardProps {
  employee: EmployeeCardType;
  onClick: () => void;
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const isPresent = employee.status_dot === 'green';
  const isOnLeave = employee.status_dot === 'yellow';

  const badgeClass = isPresent
    ? 'badge-pill-green'
    : isOnLeave
    ? 'badge-pill-amber'
    : 'badge-pill-orange';

  const dotColor = isPresent ? '#27AE60' : isOnLeave ? '#E69C24' : '#D9532F';
  const statusLabel = isPresent ? 'Present' : isOnLeave ? 'On Leave' : 'Absent';
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #EFE7DC',
        borderRadius: '20px',
        padding: '22px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(100, 70, 45, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
        minHeight: '200px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#D6C7B6';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(100, 70, 45, 0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#EFE7DC';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(100, 70, 45, 0.03)';
      }}
    >
      <div>
        {/* Top Header: Avatar + Name + Presence Badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {employee.profile_picture_url ? (
              <img
                src={employee.profile_picture_url}
                alt={`${employee.first_name} ${employee.last_name}`}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  objectFit: 'cover',
                  border: '1px solid #EFE7DC',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  backgroundColor: '#F7EDE7',
                  color: '#743A24',
                  fontWeight: '900',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #EEDCD3',
                  flexShrink: 0,
                }}
              >
                {initials || 'U'}
              </div>
            )}

            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: '#1F1713',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0,
                }}
              >
                {employee.first_name} {employee.last_name}
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: '#8A7970',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: '2px 0 0 0',
                }}
              >
                {employee.designation || 'Team Member'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={badgeClass} style={{ flexShrink: 0 }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: dotColor,
              }}
            />
            <span>{statusLabel}</span>
          </div>
        </div>

        {/* Metadata Details Box */}
        <div
          style={{
            backgroundColor: '#FAF5EE',
            border: '1px solid #EFE8DD',
            borderRadius: '14px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A7970', fontWeight: '500' }}>Department:</span>
            <span style={{ fontWeight: '700', color: '#1F1713' }}>{employee.department || 'General'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A7970', fontWeight: '500' }}>Login ID:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#743A24' }}>
              {employee.login_id}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A7970', fontWeight: '500' }}>Email:</span>
            <span
              style={{
                color: '#1F1713',
                fontWeight: '600',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {employee.email}
            </span>
          </div>
        </div>
      </div>

      {/* Footer link */}
      <div
        style={{
          paddingTop: '12px',
          borderTop: '1px solid #F0E8DD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: '600',
          color: '#8A7970',
        }}
      >
        <span style={{ textTransform: 'capitalize' }}>{employee.role.replace('_', ' ')}</span>
        <span
          style={{
            color: '#743A24',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          View Profile <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}
