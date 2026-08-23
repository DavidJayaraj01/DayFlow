/**
 * My Profile Page — Wonderly Design System.
 * Spacious, beautifully aligned profile management with clean form sections.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { EmployeeDetail } from '../../types';
import {
  User,
  Shield,
  KeyRound,
  Camera,
  Heart,
  Save,
  Phone,
  Mail,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function MyProfilePage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const userId = currentUser?.id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr_officer';

  const [activeTab, setActiveTab] = useState<'personal' | 'private' | 'security'>('personal');

  // Form states
  const [personalForm, setPersonalForm] = useState({
    first_name: '',
    last_name: '',
    department: '',
    designation: '',
    phone: '',
    about: '',
    job_love_note: '',
    hobbies_note: '',
    home_address: '',
    skills: [] as string[],
  });

  const [privateForm, setPrivateForm] = useState({
    date_of_birth: '',
    gender: '',
    marital_status: '',
    blood_group: '',
    personal_email: '',
    phone: '',
    home_address: '',
    date_of_joining: '',
  });

  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });

  // Fetch my profile
  const { data: employee } = useQuery<EmployeeDetail>({
    queryKey: ['my-profile', userId],
    queryFn: async () => (await api.get(`/employees/${userId}`)).data,
    enabled: !!userId,
  });

  useEffect(() => {
    if (employee) {
      setPersonalForm({
        first_name: employee.first_name || employee.profile?.first_name || '',
        last_name: employee.last_name || employee.profile?.last_name || '',
        department: employee.department || employee.profile?.department || '',
        designation: employee.designation || employee.profile?.designation || '',
        phone: employee.phone || '',
        about: employee.about || employee.profile?.about || '',
        job_love_note: employee.job_love_note || employee.profile?.job_love_note || '',
        hobbies_note: employee.hobbies_note || employee.profile?.hobbies_note || '',
        home_address: employee.home_address || employee.private_info?.home_address || '',
        skills: employee.skills?.map((s) => (typeof s === 'string' ? s : (s as any).skill_name)) || [],
      });

      setPrivateForm({
        date_of_birth: employee.date_of_birth ? String(employee.date_of_birth) : '',
        gender: employee.gender || employee.private_info?.gender || '',
        marital_status: employee.marital_status || employee.private_info?.marital_status || '',
        blood_group: employee.blood_group || employee.private_info?.blood_group || '',
        personal_email: employee.personal_email || employee.private_info?.personal_email || '',
        phone: employee.phone || employee.private_info?.phone || '',
        home_address: employee.home_address || employee.private_info?.home_address || '',
        date_of_joining: employee.date_of_joining ? String(employee.date_of_joining) : '',
      });
    }
  }, [employee]);

  // Mutations
  const savePersonalMutation = useMutation({
    mutationFn: (data: typeof personalForm) =>
      api.patch(`/employees/${userId}/personal`, {
        phone: data.phone,
        home_address: data.home_address,
        ...(isAdmin
          ? {
              first_name: data.first_name,
              last_name: data.last_name,
              department: data.department,
              designation: data.designation,
              about: data.about,
              job_love_note: data.job_love_note,
              hobbies_note: data.hobbies_note,
            }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Profile updated successfully!');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update'),
  });

  const savePrivateMutation = useMutation({
    mutationFn: (data: typeof privateForm) =>
      api.patch(`/employees/${userId}/private-info`, {
        phone: data.phone,
        home_address: data.home_address,
        ...(isAdmin ? data : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile', userId] });
      toast.success('Private info updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: typeof securityForm) => api.post('/auth/change-password', data),
    onSuccess: () => {
      setSecurityForm({ current_password: '', new_password: '', confirm_new_password: '' });
      toast.success('Password changed successfully!');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Password change failed'),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/employees/${userId}/profile-picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['my-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error('Failed to upload picture');
    }
  };

  const firstName = employee?.first_name || employee?.profile?.first_name || '';
  const lastName = employee?.last_name || employee?.profile?.last_name || '';
  const initials = firstName ? `${firstName[0]}${lastName[0] || ''}`.toUpperCase() : 'U';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      {/* Profile Hero Card */}
      <div className="wonderly-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Avatar with Camera Trigger */}
            <div style={{ position: 'relative' }}>
              {employee?.profile_picture_url ? (
                <img
                  src={employee.profile_picture_url}
                  alt={firstName}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    border: '2px solid #EFE7DC',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '20px',
                    backgroundColor: '#F7EDE7',
                    color: '#743A24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: '900',
                    border: '1.5px solid #EEDCD3',
                  }}
                >
                  {initials}
                </div>
              )}

              <label
                htmlFor="profile-photo-input"
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '10px',
                  backgroundColor: '#743A24',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(116, 58, 36, 0.3)',
                }}
                title="Update Profile Photo"
              >
                <Camera size={14} />
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>

            {/* User Title Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1F1713', margin: 0, letterSpacing: '-0.5px' }}>
                {firstName} {lastName}
              </h1>
              <p style={{ fontSize: '13px', color: '#8A7970', fontWeight: '600', margin: 0 }}>
                {employee?.designation || 'Team Member'} •{' '}
                <span style={{ color: '#743A24', fontWeight: '700' }}>{employee?.department || 'General'}</span>
              </p>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '6px', fontSize: '12px', color: '#6A5A52' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#743A24" /> {employee?.email}
                </span>
                {employee?.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="#743A24" /> {employee?.phone}
                  </span>
                )}
                {employee?.date_of_joining && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#743A24" /> Joined {String(employee?.date_of_joining)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Login ID Badge */}
          <div className="badge-pill-terracotta" style={{ fontFamily: 'monospace', fontSize: '12px', padding: '6px 14px' }}>
            Login ID: {employee?.login_id}
          </div>
        </div>

        {/* Tab Strip */}
        <div className="tabs-header" style={{ marginTop: '8px' }}>
          <button
            onClick={() => setActiveTab('personal')}
            className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          >
            <User size={15} />
            <span>Personal Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('private')}
            className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`}
          >
            <Shield size={15} />
            <span>Private Info</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          >
            <KeyRound size={15} />
            <span>Security</span>
          </button>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className="wonderly-card">
        {activeTab === 'personal' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePersonalMutation.mutate(personalForm);
            }}
            className="form-section"
          >
            <div className="form-row-2">
              <div className="form-group">
                <label className="label">First Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="input-field"
                  value={personalForm.first_name}
                  onChange={(e) =>
                    setPersonalForm({ ...personalForm, first_name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="label">Last Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="input-field"
                  value={personalForm.last_name}
                  onChange={(e) =>
                    setPersonalForm({ ...personalForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="label">Department (Managed by HR)</label>
                <input
                  type="text"
                  disabled
                  className="input-field"
                  value={personalForm.department}
                />
              </div>

              <div className="form-group">
                <label className="label">Designation (Managed by HR)</label>
                <input
                  type="text"
                  disabled
                  className="input-field"
                  value={personalForm.designation}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="label">Mobile Phone (Editable)</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+91-XXXXXXXXXX"
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Home Address (Editable)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your address"
                  value={personalForm.home_address}
                  onChange={(e) => setPersonalForm({ ...personalForm, home_address: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">About Me</label>
              <textarea
                rows={3}
                disabled={!isAdmin}
                className="input-field"
                value={personalForm.about}
                onChange={(e) => setPersonalForm({ ...personalForm, about: e.target.value })}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={14} color="#D9532F" /> What I Love About My Job
                </label>
                <textarea
                  rows={3}
                  disabled={!isAdmin}
                  className="input-field"
                  value={personalForm.job_love_note}
                  onChange={(e) =>
                    setPersonalForm({ ...personalForm, job_love_note: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="label">Interests & Hobbies</label>
                <textarea
                  rows={3}
                  disabled={!isAdmin}
                  className="input-field"
                  value={personalForm.hobbies_note}
                  onChange={(e) =>
                    setPersonalForm({ ...personalForm, hobbies_note: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Skills */}
            <div className="form-group">
              <label className="label">Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {personalForm.skills && personalForm.skills.length > 0 ? (
                  personalForm.skills.map((s, idx) => (
                    <span key={idx} className="badge-pill-terracotta">
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: '#8A7970' }}>No skills added yet.</span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
              <button
                type="submit"
                disabled={savePersonalMutation.isPending}
                className="btn-terracotta"
              >
                <Save size={16} />
                <span>{savePersonalMutation.isPending ? 'Saving...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        ) : activeTab === 'private' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePrivateMutation.mutate(privateForm);
            }}
            className="form-section"
          >
            <div style={{ padding: '14px 18px', borderRadius: '14px', backgroundColor: '#FAF5EE', border: '1px solid #EFE7DC', fontSize: '12px', color: '#743A24', fontWeight: '600' }}>
              Note: Contact information (phone and address) can be updated by you. Other private
              records are maintained by HR.
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="label">Date of Birth (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  className="input-field"
                  value={privateForm.date_of_birth || 'Not specified'}
                />
              </div>

              <div className="form-group">
                <label className="label">Date of Joining (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  className="input-field"
                  value={privateForm.date_of_joining || 'Not specified'}
                />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="label">Gender (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  className="input-field"
                  value={privateForm.gender || 'Not specified'}
                />
              </div>

              <div className="form-group">
                <label className="label">Marital Status (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  className="input-field"
                  value={privateForm.marital_status || 'Not specified'}
                />
              </div>

              <div className="form-group">
                <label className="label">Blood Group (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  className="input-field"
                  value={privateForm.blood_group || 'Not specified'}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="label">Personal Email</label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  className="input-field"
                  value={privateForm.personal_email}
                  onChange={(e) =>
                    setPrivateForm({ ...privateForm, personal_email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="label">Personal Phone (Editable)</label>
                <input
                  type="tel"
                  className="input-field"
                  value={privateForm.phone}
                  onChange={(e) => setPrivateForm({ ...privateForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Home Address (Editable)</label>
              <textarea
                rows={3}
                className="input-field"
                placeholder="Enter your home address"
                value={privateForm.home_address}
                onChange={(e) =>
                  setPrivateForm({ ...privateForm, home_address: e.target.value })
                }
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
              <button
                type="submit"
                disabled={savePrivateMutation.isPending}
                className="btn-terracotta"
              >
                <Save size={16} />
                <span>{savePrivateMutation.isPending ? 'Saving...' : 'Save Private Details'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Security Tab */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (securityForm.new_password !== securityForm.confirm_new_password) {
                toast.error('New passwords do not match');
                return;
              }
              changePasswordMutation.mutate(securityForm);
            }}
            className="form-section"
            style={{ maxWidth: '460px' }}
          >
            <div className="form-group">
              <label className="label">Current Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Enter current password"
                value={securityForm.current_password}
                onChange={(e) =>
                  setSecurityForm({ ...securityForm, current_password: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="label">New Secure Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Min 8 chars, 1 upper, 1 special"
                value={securityForm.new_password}
                onChange={(e) =>
                  setSecurityForm({ ...securityForm, new_password: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Confirm new password"
                value={securityForm.confirm_new_password}
                onChange={(e) =>
                  setSecurityForm({
                    ...securityForm,
                    confirm_new_password: e.target.value,
                  })
                }
              />
            </div>

            <div style={{ paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="btn-terracotta"
              >
                {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
