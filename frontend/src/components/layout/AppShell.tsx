/**
 * App Shell — Wonderly Enterprise Responsive Layout.
 * Desktop sidebar + Mobile slide-out drawer + Adaptive header.
 */
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { TodayStatus, EmployeeDetail } from '../../types';
import {
  Users,
  CalendarDays,
  CalendarOff,
  User as UserIcon,
  LogOut,
  Clock,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export default function AppShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch current user's profile details
  const { data: profile } = useQuery<EmployeeDetail>({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => (await api.get(`/employees/${user?.id}`)).data,
    enabled: !!user?.id,
  });

  // Today's status for the live punch action
  const { data: todayStatus } = useQuery<TodayStatus>({
    queryKey: ['today-status'],
    queryFn: async () => (await api.get('/attendance/today')).data,
    refetchInterval: 15000,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: () => api.post('/attendance/check-in'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['today-status'] });
      const prev = queryClient.getQueryData(['today-status']);
      queryClient.setQueryData(['today-status'], {
        is_checked_in: true,
        check_in_time: new Date().toLocaleTimeString('en-GB'),
        status_dot: 'green',
      });
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-status'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('☀️ Checked in! Marked Present.');
    },
    onError: (err: any, _, context: any) => {
      if (context?.prev) queryClient.setQueryData(['today-status'], context.prev);
      toast.error(err.response?.data?.detail || 'Check-in failed');
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: () => api.post('/attendance/check-out'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['today-status'] });
      const prev = queryClient.getQueryData(['today-status']);
      queryClient.setQueryData(['today-status'], {
        is_checked_in: false,
        check_in_time: todayStatus?.check_in_time || null,
        status_dot: 'green',
      });
      return { prev };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['today-status'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`👋 Checked out! Recorded ${res.data.work_hours} hrs`);
    },
    onError: (err: any, _, context: any) => {
      if (context?.prev) queryClient.setQueryData(['today-status'], context.prev);
      toast.error(err.response?.data?.detail || 'Check-out failed');
    },
  });

  const isCheckedIn = todayStatus?.is_checked_in;
  const firstName = profile?.first_name || '';
  const lastName = profile?.last_name || '';
  const displayName = firstName ? `${firstName} ${lastName}` : user?.email?.split('@')[0] || 'User';
  const displayRole = user?.role === 'admin' ? 'Administrator' : user?.role === 'hr_officer' ? 'HR Officer' : (profile?.designation || 'Team Member');
  const initials = firstName ? `${firstName[0]}${lastName[0] || ''}`.toUpperCase() : 'U';

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '700',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
    color: isActive ? '#1F1713' : '#8A7970',
    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
    border: isActive ? '1px solid #EFE7DC' : '1px solid transparent',
  });

  const renderNavContent = (isMobile = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => {
              navigate('/');
              if (isMobile) setMobileMenuOpen(false);
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
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
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#1F1713',
                  letterSpacing: '0.5px',
                  display: 'block',
                }}
              >
                DAYFLOW
              </span>
              <span style={{ fontSize: '11px', color: '#8A7970', fontWeight: '600' }}>
                HRMS Platform
              </span>
            </div>
          </div>

          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#FFFFFF',
                color: '#8A7970',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* User Profile Mini-Card */}
        <div
          onClick={() => {
            navigate('/profile');
            if (isMobile) setMobileMenuOpen(false);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EFE7DC',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {profile?.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt={displayName}
              style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#F7EDE7',
                color: '#743A24',
                fontWeight: '800',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#1F1713',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0,
              }}
            >
              {displayName}
            </p>
            <p
              style={{
                fontSize: '11px',
                color: '#8A7970',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: '2px 0 0 0',
              }}
            >
              {displayRole}
            </p>
          </div>
          <ChevronRight size={14} color="#8A7970" />
        </div>

        {/* Workspace Nav Links */}
        <div>
          <p
            style={{
              fontSize: '10px',
              fontWeight: '800',
              color: '#A99B91',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '0 12px',
              marginBottom: '8px',
              textAlign: 'left',
            }}
          >
            Organization Workspace
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavLink
              to="/"
              end
              style={navLinkStyle}
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false);
              }}
            >
              <Users size={18} color="#743A24" />
              <span>Employee Directory</span>
            </NavLink>

            <NavLink
              to="/attendance"
              style={navLinkStyle}
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false);
              }}
            >
              <CalendarDays size={18} color="#E69C24" />
              <span>Attendance Console</span>
            </NavLink>

            <NavLink
              to="/time-off"
              style={navLinkStyle}
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false);
              }}
            >
              <CalendarOff size={18} color="#D9532F" />
              <span>Time Off & Leaves</span>
            </NavLink>

            <NavLink
              to="/profile"
              style={navLinkStyle}
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false);
              }}
            >
              <UserIcon size={18} color="#27AE60" />
              <span>My Profile</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Sign Out Button at Bottom */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid #EFE7DC' }}>
        <button
          onClick={() => {
            logout();
            navigate('/login');
            toast.success('Signed out');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: '700',
            color: '#D9532F',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* Desktop Sticky Sidebar */}
      <aside className="app-sidebar-desktop">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Slide-Out Drawer & Backdrop Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="mobile-drawer">
            {renderNavContent(true)}
          </aside>
        </>
      )}

      {/* Main Viewport */}
      <div className="app-main">
        {/* Sticky Header */}
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{
                padding: '8px',
                borderRadius: '12px',
                border: '1px solid #EFE7DC',
                backgroundColor: '#FFFFFF',
                color: '#1F1713',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#8A7970' }}>
              {user?.role === 'admin' ? 'Administrator Workspace' : 'Workplace Portal'}
            </span>
          </div>

          {/* Right Header: Live Presence + Punch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className={isCheckedIn ? 'badge-pill-green' : 'badge-pill-orange'}
              style={{ padding: '6px 12px' }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isCheckedIn ? '#27AE60' : '#D9532F',
                }}
              />
              <span>{isCheckedIn ? 'Checked In' : 'Checked Out'}</span>
            </div>

            {isCheckedIn ? (
              <button
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
                className="btn-danger"
              >
                <Clock size={14} />
                <span>{checkOutMutation.isPending ? 'Updating...' : 'Check Out'}</span>
              </button>
            ) : (
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="btn-terracotta"
              >
                <Clock size={14} />
                <span>{checkInMutation.isPending ? 'Updating...' : 'Check In'}</span>
              </button>
            )}

            <button
              onClick={() => navigate('/profile')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #EFE7DC',
                color: '#743A24',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="My Profile"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Routed Content */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
