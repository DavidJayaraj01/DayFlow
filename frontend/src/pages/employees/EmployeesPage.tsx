/**
 * Employees Page — Wonderly Design System Directory.
 * Displays employee directory with spacious grid, search filter, and department pills.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth';
import api from '../../lib/api';
import type { EmployeeCard as EmployeeCardType } from '../../types';
import EmployeeCard from './EmployeeCard';
import AddEmployeeModal from './AddEmployeeModal';
import EmployeeViewModal from './EmployeeViewModal';
import EmployeeEditModal from './EmployeeEditModal';
import { Search, UserPlus, Users } from 'lucide-react';

export default function EmployeesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr_officer';

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Fetch employees list
  const { data: employees, isLoading } = useQuery<EmployeeCardType[]>({
    queryKey: ['employees', search],
    queryFn: async () => {
      const res = await api.get('/employees', {
        params: search ? { search } : {},
      });
      return res.data;
    },
    refetchInterval: 20000,
  });

  // Filter by department
  const filteredEmployees = employees?.filter((emp) => {
    if (departmentFilter === 'all') return true;
    return emp.department?.toLowerCase() === departmentFilter.toLowerCase();
  });

  const departments = [
    'all',
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Finance',
    'HR',
    'Sales',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1F1713', margin: 0, letterSpacing: '-0.5px' }}>
            Employee Directory
          </h1>
          <p style={{ fontSize: '13px', color: '#8A7970', fontWeight: '500', marginTop: '4px' }}>
            {employees?.length || 0} active team members • Real-time presence roster
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn-terracotta"
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Search & Department Filters (Wonderly pill tabs) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8A7970' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '40px' }}
            placeholder="Search by name, email, or Login ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Department Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                border: departmentFilter === dept ? '1px solid #E5DACD' : '1px solid transparent',
                backgroundColor: departmentFilter === dept ? '#FFFFFF' : 'transparent',
                color: departmentFilter === dept ? '#743A24' : '#8A7970',
                cursor: 'pointer',
                boxShadow: departmentFilter === dept ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {dept === 'all' ? 'All Departments' : dept}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="cards-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="wonderly-card" style={{ height: '200px', opacity: 0.5 }} />
          ))}
        </div>
      ) : filteredEmployees && filteredEmployees.length > 0 ? (
        <div className="cards-grid">
          {filteredEmployees.map((emp) => (
            <EmployeeCard
              key={emp.user_id}
              employee={emp}
              onClick={() => setViewingUserId(emp.user_id)}
            />
          ))}
        </div>
      ) : (
        <div
          className="wonderly-card"
          style={{ padding: '64px 32px', textAlign: 'center', backgroundColor: '#FFFFFF' }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#F7EDE7',
              color: '#743A24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Users size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1F1713', margin: 0 }}>
            No employees found
          </h3>
          <p style={{ fontSize: '13px', color: '#8A7970', marginTop: '6px', maxWidth: '380px', margin: '6px auto 0 auto' }}>
            {search
              ? `No members matching "${search}". Try clearing your search query.`
              : 'Provision your first team member using the Add Employee button.'}
          </p>
        </div>
      )}

      {/* Add Employee Modal (Admin) */}
      <AddEmployeeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* View Employee Profile Modal (Read-Only) */}
      <EmployeeViewModal
        userId={viewingUserId}
        isOpen={viewingUserId !== null}
        onClose={() => setViewingUserId(null)}
        onEdit={(uid) => setEditingUserId(uid)}
      />

      {/* Edit Employee Modal (Admin with Salary Auto-Calc) */}
      <EmployeeEditModal
        userId={editingUserId}
        isOpen={editingUserId !== null}
        onClose={() => setEditingUserId(null)}
      />
    </div>
  );
}
