/**
 * Time Off Page — Wonderly Design System.
 * Clean, perfectly aligned Leave & Time-Off Management
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
} from '../../types';
import {
  CalendarOff,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  Layers,
  X,
  Sliders,
} from 'lucide-react';

export default function TimeOffPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr_officer';

  const [adminTab, setAdminTab] = useState<'timeoff' | 'allocation'>('timeoff');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRejectId, setSelectedRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const [editingAllocation, setEditingAllocation] = useState<{
    user_id: number;
    leave_type_id: number;
    employee_name: string;
    leave_type_name: string;
    allocated: number;
  } | null>(null);

  const [requestForm, setRequestForm] = useState({
    leave_type_id: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    attachment: null as File | null,
  });

  const { data: leaveTypes } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: async () => (await api.get('/leave/types')).data,
  });

  const { data: myBalances } = useQuery<LeaveBalance[]>({
    queryKey: ['my-leave-balances'],
    queryFn: async () => (await api.get('/leave/balances/me')).data,
  });

  const { data: myRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leave-requests'],
    queryFn: async () => (await api.get('/leave/requests/me')).data,
    enabled: !isAdmin,
  });

  const { data: allRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['all-leave-requests', statusFilter, search],
    queryFn: async () => {
      const res = await api.get('/leave/requests', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
        },
      });
      return res.data;
    },
    enabled: isAdmin,
  });

  const { data: allAllocations } = useQuery<LeaveBalance[]>({
    queryKey: ['all-allocations'],
    queryFn: async () => (await api.get('/leave/allocations')).data,
    enabled: isAdmin && adminTab === 'allocation',
  });

  const startDateObj = new Date(requestForm.start_date);
  const endDateObj = new Date(requestForm.end_date);
  const calculatedDays =
    endDateObj >= startDateObj
      ? Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24)) + 1
      : 0;

  const selectedLeaveType = leaveTypes?.find(
    (lt) => lt.id === Number(requestForm.leave_type_id)
  );
  const isSickLeave = selectedLeaveType?.name.toLowerCase().includes('sick');

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      if (isSickLeave && !requestForm.attachment) {
        throw new Error('Medical certificate attachment is mandatory for Sick Leave.');
      }
      const formData = new FormData();
      formData.append('leave_type_id', String(requestForm.leave_type_id));
      formData.append('start_date', requestForm.start_date);
      formData.append('end_date', requestForm.end_date);
      formData.append('total_days', String(calculatedDays));
      if (requestForm.attachment) {
        formData.append('attachment', requestForm.attachment);
      }
      return (await api.post('/leave/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] });
      toast.success('Time off requested successfully!');
      setIsRequestModalOpen(false);
      setRequestForm({
        leave_type_id: leaveTypes?.[0]?.id || 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        attachment: null,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || 'Failed to submit request');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
      comment,
    }: {
      requestId: number;
      status: 'approved' | 'rejected';
      comment?: string;
    }) => {
      return (
        await api.patch(`/leave/requests/${requestId}`, {
          status,
          review_comment: comment,
        })
      ).data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-status'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Leave request ${vars.status}!`);
      setSelectedRejectId(null);
      setRejectComment('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Review action failed');
    },
  });

  const updateAllocationMutation = useMutation({
    mutationFn: async ({
      userId,
      leaveTypeId,
      allocated,
    }: {
      userId: number;
      leaveTypeId: number;
      allocated: number;
    }) => {
      return (
        await api.put(`/leave/allocations/${userId}/${leaveTypeId}`, {
          allocated,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['my-leave-balances'] });
      toast.success('Quota allocation updated!');
      setEditingAllocation(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update quota');
    },
  });

  const paidBalance = myBalances?.find((b) => b.leave_type_name.toLowerCase().includes('paid'));
  const sickBalance = myBalances?.find((b) => b.leave_type_name.toLowerCase().includes('sick'));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="badge-pill-green">
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="badge-pill-orange">
            <XCircle size={13} /> Rejected
          </span>
        );
      default:
        return (
          <span className="badge-pill-amber">
            <Clock size={13} /> Pending Review
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1F1713', margin: 0, letterSpacing: '-0.5px' }}>
            Time Off & Leave Center
          </h1>
          <p style={{ fontSize: '13px', color: '#8A7970', fontWeight: '500', marginTop: '4px' }}>
            {isAdmin
              ? 'Review pending time-off requests and manage annual employee quotas'
              : 'View your live leave balance, bookings, and request time off'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', borderRadius: '16px', backgroundColor: '#FFFFFF', padding: '4px', border: '1px solid #EFE7DC' }}>
              <button
                onClick={() => setAdminTab('timeoff')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: 'none',
                  backgroundColor: adminTab === 'timeoff' ? '#743A24' : 'transparent',
                  color: adminTab === 'timeoff' ? '#FFFFFF' : '#8A7970',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Requests & Approvals
              </button>
              <button
                onClick={() => setAdminTab('allocation')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: 'none',
                  backgroundColor: adminTab === 'allocation' ? '#743A24' : 'transparent',
                  color: adminTab === 'allocation' ? '#FFFFFF' : '#8A7970',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Quota Allocation
              </button>
            </div>
          )}

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="btn-terracotta"
          >
            <Plus size={16} />
            <span>Request Time Off</span>
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="wonderly-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#743A24', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Paid Time Off
            </span>
            <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: '#F7EDE7', color: '#743A24' }}>
              <CalendarOff size={18} />
            </div>
          </div>
          <p style={{ fontSize: '32px', fontWeight: '900', color: '#743A24', margin: '12px 0 0 0' }}>
            {paidBalance ? `${String(paidBalance.remaining).padStart(2, '0')} Days` : '24 Days'}
          </p>
          <p style={{ fontSize: '12px', color: '#8A7970', fontWeight: '500', marginTop: '4px' }}>
            Available ({paidBalance?.used || 0} used of {paidBalance?.allocated || 24} annual quota)
          </p>
        </div>

        <div className="wonderly-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#B57410', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Sick Time Off
            </span>
            <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: '#FEF7EC', color: '#B57410' }}>
              <Clock size={18} />
            </div>
          </div>
          <p style={{ fontSize: '32px', fontWeight: '900', color: '#B57410', margin: '12px 0 0 0' }}>
            {sickBalance ? `${String(sickBalance.remaining).padStart(2, '0')} Days` : '07 Days'}
          </p>
          <p style={{ fontSize: '12px', color: '#8A7970', fontWeight: '500', marginTop: '4px' }}>
            Available ({sickBalance?.used || 0} used of {sickBalance?.allocated || 7} annual quota)
          </p>
        </div>

        <div className="wonderly-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#8A7970', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Unpaid Leave
            </span>
            <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: '#FAF5EE', color: '#8A7970' }}>
              <Layers size={18} />
            </div>
          </div>
          <p style={{ fontSize: '32px', fontWeight: '900', color: '#1F1713', margin: '12px 0 0 0' }}>
            Unlimited
          </p>
          <p style={{ fontSize: '12px', color: '#8A7970', fontWeight: '500', marginTop: '4px' }}>
            Deducted from payable days upon approval
          </p>
        </div>
      </div>

      {/* Admin View: Requests Approval Table */}
      {isAdmin && adminTab === 'timeoff' && (
        <div className="wonderly-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #EFE7DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', backgroundColor: 'rgba(250, 245, 238, 0.6)' }}>
            <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8A7970' }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '36px', padding: '6px 12px 6px 36px', fontSize: '12px' }}
                placeholder="Search employee name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'capitalize',
                    border: 'none',
                    backgroundColor: statusFilter === st ? '#743A24' : 'transparent',
                    color: statusFilter === st ? '#FFFFFF' : '#8A7970',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7EFE6', color: '#743A24', fontWeight: '700' }}>
                  <th style={{ padding: '14px 24px' }}>Employee</th>
                  <th style={{ padding: '14px' }}>Start Date</th>
                  <th style={{ padding: '14px' }}>End Date</th>
                  <th style={{ padding: '14px' }}>Type</th>
                  <th style={{ padding: '14px' }}>Days</th>
                  <th style={{ padding: '14px' }}>Certificate</th>
                  <th style={{ padding: '14px' }}>Status</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allRequests && allRequests.length > 0 ? (
                  allRequests.map((req) => (
                    <tr key={req.id} style={{ borderTop: '1px solid #F0E8DD' }}>
                      <td style={{ padding: '14px 24px', fontWeight: '800', color: '#1F1713' }}>
                        {req.employee_name || `User #${req.user_id}`}
                      </td>
                      <td style={{ padding: '14px', color: '#6A5A52' }}>{String(req.start_date)}</td>
                      <td style={{ padding: '14px', color: '#6A5A52' }}>{String(req.end_date)}</td>
                      <td style={{ padding: '14px', fontWeight: '700', color: '#743A24' }}>
                        {req.leave_type_name}
                      </td>
                      <td style={{ padding: '14px', fontWeight: '700', color: '#1F1713' }}>
                        {req.total_days} {req.total_days === 1 ? 'day' : 'days'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        {req.attachment_url ? (
                          <a
                            href={req.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#743A24', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Paperclip size={13} /> Certificate
                          </a>
                        ) : (
                          <span style={{ color: '#A99B91' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px' }}>{getStatusBadge(req.status)}</td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedRejectId(req.id)}
                              className="btn-danger"
                              style={{ padding: '6px 12px', fontSize: '11px' }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() =>
                                reviewMutation.mutate({
                                  requestId: req.id,
                                  status: 'approved',
                                  comment: 'Approved by HR',
                                })
                              }
                              className="btn-success"
                              style={{ padding: '6px 12px', fontSize: '11px' }}
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#8A7970', fontStyle: 'italic', fontWeight: '500' }}>
                            {req.review_comment || 'Decided'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#8A7970' }}>
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin View: Quota Allocation Tab */}
      {isAdmin && adminTab === 'allocation' && (
        <div className="wonderly-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #EFE7DC', backgroundColor: 'rgba(250, 245, 238, 0.6)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1F1713', margin: 0 }}>
              Annual Leave Quotas & Allocation
            </h3>
            <p style={{ fontSize: '12px', color: '#8A7970', margin: '4px 0 0 0' }}>
              Adjust individual annual quota allowances for Paid Time Off and Sick Leave.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7EFE6', color: '#743A24', fontWeight: '700' }}>
                  <th style={{ padding: '14px 24px' }}>Employee</th>
                  <th style={{ padding: '14px' }}>Leave Type</th>
                  <th style={{ padding: '14px' }}>Allocated (Quota)</th>
                  <th style={{ padding: '14px' }}>Used</th>
                  <th style={{ padding: '14px' }}>Remaining</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right' }}>Edit Quota</th>
                </tr>
              </thead>
              <tbody>
                {allAllocations && allAllocations.length > 0 ? (
                  allAllocations.map((item) => (
                    <tr key={item.id} style={{ borderTop: '1px solid #F0E8DD' }}>
                      <td style={{ padding: '14px 24px', fontWeight: '800', color: '#1F1713' }}>
                        {item.employee_name || `Employee #${item.user_id}`}
                      </td>
                      <td style={{ padding: '14px', fontWeight: '700', color: '#743A24' }}>
                        {item.leave_type_name}
                      </td>
                      <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: '800', color: '#1F1713' }}>
                        {item.allocated} days
                      </td>
                      <td style={{ padding: '14px', fontFamily: 'monospace', color: '#8A7970' }}>{item.used} days</td>
                      <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: '800', color: '#27AE60' }}>
                        {item.remaining} days
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() =>
                            setEditingAllocation({
                              user_id: item.user_id || 0,
                              leave_type_id: item.leave_type_id,
                              employee_name: item.employee_name || '',
                              leave_type_name: item.leave_type_name,
                              allocated: item.allocated,
                            })
                          }
                          className="btn-sand"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                        >
                          <Sliders size={12} /> Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#8A7970' }}>
                      No allocations configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee View: Own Request History */}
      {!isAdmin && (
        <div className="wonderly-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #EFE7DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(250, 245, 238, 0.6)' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#743A24' }}>
              Your Time Off History
            </span>
            <span style={{ fontSize: '12px', color: '#8A7970', fontWeight: '600' }}>{myRequests?.length || 0} requests</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7EFE6', color: '#743A24', fontWeight: '700' }}>
                  <th style={{ padding: '14px 24px' }}>Leave Type</th>
                  <th style={{ padding: '14px' }}>Start Date</th>
                  <th style={{ padding: '14px' }}>End Date</th>
                  <th style={{ padding: '14px' }}>Days</th>
                  <th style={{ padding: '14px' }}>Attachment</th>
                  <th style={{ padding: '14px' }}>Status</th>
                  <th style={{ padding: '14px 24px' }}>Reviewer Remarks</th>
                </tr>
              </thead>
              <tbody>
                {myRequests && myRequests.length > 0 ? (
                  myRequests.map((req) => (
                    <tr key={req.id} style={{ borderTop: '1px solid #F0E8DD' }}>
                      <td style={{ padding: '14px 24px', fontWeight: '800', color: '#1F1713' }}>
                        {req.leave_type_name}
                      </td>
                      <td style={{ padding: '14px', color: '#6A5A52' }}>{String(req.start_date)}</td>
                      <td style={{ padding: '14px', color: '#6A5A52' }}>{String(req.end_date)}</td>
                      <td style={{ padding: '14px', fontWeight: '800', color: '#1F1713' }}>
                        {req.total_days} {req.total_days === 1 ? 'day' : 'days'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        {req.attachment_url ? (
                          <a
                            href={req.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#743A24', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Paperclip size={13} /> Certificate
                          </a>
                        ) : (
                          <span style={{ color: '#A99B91' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px' }}>{getStatusBadge(req.status)}</td>
                      <td style={{ padding: '14px 24px', color: '#8A7970', fontWeight: '500' }}>
                        {req.review_comment || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#8A7970' }}>
                      You have not submitted any time-off requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Time Off Modal */}
      {isRequestModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRequestModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', backgroundColor: '#F7EDE7', color: '#743A24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarOff size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1F1713', margin: 0 }}>Request Time Off</h3>
                  <p style={{ fontSize: '12px', color: '#8A7970', margin: '2px 0 0 0' }}>
                    Submit for approval. Sick leave requires medical proof.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', backgroundColor: 'transparent', color: '#8A7970', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitRequestMutation.mutate();
              }}
              className="modal-body"
            >
              <div>
                <label className="label">Time Off Type *</label>
                <select
                  className="input-field"
                  value={requestForm.leave_type_id}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, leave_type_id: Number(e.target.value) })
                  }
                >
                  {leaveTypes?.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} (Quota: {lt.default_annual_quota} days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={requestForm.start_date}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={requestForm.end_date}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Computed Days Banner */}
              <div style={{ padding: '14px 18px', borderRadius: '16px', backgroundColor: '#FAF5EE', border: '1px solid #EFE7DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#6A5A52', fontWeight: '600' }}>Requested Duration</span>
                <span style={{ fontWeight: '900', color: '#743A24', fontFamily: 'monospace', fontSize: '15px' }}>
                  {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                </span>
              </div>

              {/* Attachment */}
              <div>
                <label className="label">
                  Attachment {isSickLeave ? <strong style={{ color: '#D9532F' }}>(Required for Sick Leave)</strong> : '(Optional)'}
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="input-field"
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      attachment: e.target.files?.[0] || null,
                    })
                  }
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="btn-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitRequestMutation.isPending || calculatedDays <= 0}
                  className="btn-terracotta"
                >
                  {submitRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Comment Modal */}
      {selectedRejectId !== null && (
        <div className="modal-overlay" onClick={() => setSelectedRejectId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#D9532F', margin: 0 }}>Reject Time Off Request</h3>
            <p style={{ fontSize: '12px', color: '#8A7970', margin: '4px 0 16px 0' }}>
              Provide an optional comment explaining the reason for rejection.
            </p>

            <textarea
              rows={3}
              className="input-field"
              style={{ fontSize: '12px', marginBottom: '16px' }}
              placeholder="e.g. Project critical deadline on requested dates"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedRejectId(null)}
                className="btn-sand"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  reviewMutation.mutate({
                    requestId: selectedRejectId,
                    status: 'rejected',
                    comment: rejectComment || 'Rejected by Admin',
                  })
                }
                className="btn-danger"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Allocation Modal */}
      {editingAllocation !== null && (
        <div className="modal-overlay" onClick={() => setEditingAllocation(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1F1713', margin: 0 }}>
              Adjust Annual Quota
            </h3>
            <p style={{ fontSize: '12px', color: '#8A7970', margin: '4px 0 16px 0' }}>
              {editingAllocation.employee_name} • {editingAllocation.leave_type_name}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="label">Allocated Days per Year</label>
              <input
                type="number"
                min={0}
                max={365}
                className="input-field"
                style={{ fontFamily: 'monospace', fontWeight: '800', color: '#743A24' }}
                value={editingAllocation.allocated}
                onChange={(e) =>
                  setEditingAllocation({
                    ...editingAllocation,
                    allocated: Number(e.target.value),
                  })
                }
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingAllocation(null)}
                className="btn-sand"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  updateAllocationMutation.mutate({
                    userId: editingAllocation.user_id,
                    leaveTypeId: editingAllocation.leave_type_id,
                    allocated: editingAllocation.allocated,
                  })
                }
                className="btn-terracotta"
              >
                Save Quota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
