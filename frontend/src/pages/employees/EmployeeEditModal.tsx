/**
 * Edit Employee Modal (Admin Only) — Wonderly Design System.
 * Spacious modal with Work Info, Private Info, and Live Reactive Salary Calculator.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { EmployeeDetail, SalaryComponentInput, SalaryComponent } from '../../types';
import { X, Plus, Trash2, Calculator, Check, AlertCircle, Save } from 'lucide-react';

interface EmployeeEditModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployeeEditModal({
  userId,
  isOpen,
  onClose,
}: EmployeeEditModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'work' | 'private' | 'salary'>('work');

  // Work profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    department: '',
    designation: '',
    about: '',
  });

  // Private info form state
  const [privateForm, setPrivateForm] = useState({
    phone: '',
    home_address: '',
    personal_email: '',
    marital_status: 'Single',
    blood_group: 'A+',
  });

  // Salary Calculator State
  const [wageType, setWageType] = useState<'monthly' | 'yearly'>('monthly');
  const [wageAmount, setWageAmount] = useState<number>(50000);
  const [workingDays, setWorkingDays] = useState<number>(5);
  const [basicHours, setBasicHours] = useState<number>(8);
  const [components, setComponents] = useState<SalaryComponentInput[]>([
    { name: 'Basic Salary', compensation_type: 'percentage', percentage_of: 'wage', percentage_value: 60, amount: 30000 },
    { name: 'House Rent Allowance', compensation_type: 'percentage', percentage_of: 'basic', percentage_value: 50, amount: 15000 },
    { name: 'Standard Allowance', compensation_type: 'fixed', amount: 5000 },
  ]);

  // Load existing employee detail
  const { data: employee } = useQuery<EmployeeDetail>({
    queryKey: ['employee-detail', userId],
    queryFn: async () => (await api.get(`/employees/${userId}`)).data,
    enabled: isOpen && userId !== null,
  });

  // Populate form fields on open
  useEffect(() => {
    if (employee) {
      setProfileForm({
        first_name: employee.first_name || employee.profile?.first_name || '',
        last_name: employee.last_name || employee.profile?.last_name || '',
        department: employee.department || employee.profile?.department || '',
        designation: employee.designation || employee.profile?.designation || '',
        about: employee.about || employee.profile?.about || '',
      });
      setPrivateForm({
        phone: employee.phone || employee.private_info?.phone || '',
        home_address: employee.home_address || employee.private_info?.home_address || '',
        personal_email: employee.personal_email || employee.private_info?.personal_email || '',
        marital_status: employee.marital_status || employee.private_info?.marital_status || 'Single',
        blood_group: employee.blood_group || employee.private_info?.blood_group || 'A+',
      });

      if (employee.salary_structure) {
        setWageType(employee.salary_structure.wage_type);
        setWageAmount(
          employee.salary_structure.wage_type === 'monthly'
            ? Number(employee.salary_structure.month_wage)
            : Number(employee.salary_structure.yearly_wage)
        );
        setWorkingDays(employee.salary_structure.working_days_per_week);
        setBasicHours(employee.salary_structure.basic_hours);

        if (employee.salary_structure.components?.length) {
          setComponents(
            employee.salary_structure.components.map((c: SalaryComponent) => ({
              name: c.name,
              compensation_type: c.compensation_type,
              percentage_of: c.percentage_of,
              percentage_value: c.percentage_value,
              amount: Number(c.amount),
            }))
          );
        }
      }
    }
  }, [employee]);

  // Pure function 2-pass cascading calculator
  const recalculate = (currentWage: number, currentType: 'monthly' | 'yearly', compList: SalaryComponentInput[]) => {
    const monthlyWage = currentType === 'monthly' ? currentWage : currentWage / 12;
    let basicAmount = 0;

    // Pass 1: compute fixed & percentage of wage
    const pass1 = compList.map((c) => {
      if (c.compensation_type === 'percentage' && c.percentage_of === 'wage') {
        const val = Math.round((monthlyWage * (c.percentage_value || 0)) / 100);
        if (c.name.toLowerCase().includes('basic')) {
          basicAmount = val;
        }
        return { ...c, amount: val };
      }
      return c;
    });

    // Pass 2: compute percentage of basic
    const final = pass1.map((c) => {
      if (c.compensation_type === 'percentage' && c.percentage_of === 'basic') {
        const val = Math.round((basicAmount * (c.percentage_value || 0)) / 100);
        return { ...c, amount: val };
      }
      return c;
    });

    setComponents(final);
  };

  const handleWageChange = (val: number) => {
    setWageAmount(val);
    recalculate(val, wageType, components);
  };

  const handleTypeChange = (t: 'monthly' | 'yearly') => {
    const newWage = t === 'yearly' ? wageAmount * 12 : wageAmount / 12;
    setWageType(t);
    setWageAmount(newWage);
    recalculate(newWage, t, components);
  };

  const handleComponentChange = (index: number, field: keyof SalaryComponentInput, val: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: val };
    recalculate(wageAmount, wageType, updated);
  };

  const addComponent = () => {
    setComponents([
      ...components,
      { name: 'Special Allowance', compensation_type: 'fixed', amount: 1000 },
    ]);
  };

  const removeComponent = (index: number) => {
    const updated = components.filter((_, i) => i !== index);
    recalculate(wageAmount, wageType, updated);
  };

  const totalMonthlyComponents = components.reduce((sum, c) => sum + (c.amount || 0), 0);
  const targetMonthlyWage = wageType === 'monthly' ? wageAmount : wageAmount / 12;
  const isBalanced = Math.abs(totalMonthlyComponents - targetMonthlyWage) <= 1;

  // Save Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Update Profile & Private Info
      await api.patch(`/employees/${userId}/profile`, profileForm);
      await api.patch(`/employees/${userId}/private-info`, privateForm);

      // 2. Update Salary
      await api.put(`/employees/${userId}/salary`, {
        wage_type: wageType,
        month_wage: targetMonthlyWage,
        working_days_per_week: workingDays,
        basic_hours: basicHours,
        pf_employee_pct: 12.0,
        pf_employer_pct: 12.0,
        professional_tax: 200.0,
        components,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee and salary updated successfully!');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save changes');
    },
  });

  if (!isOpen || !userId) return null;

  const firstName = employee?.first_name || employee?.profile?.first_name || '';
  const lastName = employee?.last_name || employee?.profile?.last_name || '';

  const tabButtonStyle = (tab: 'work' | 'private' | 'salary') => ({
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
        style={{ maxWidth: '720px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1F1713', margin: 0 }}>
              Edit Employee: {firstName} {lastName}
            </h2>
            <p style={{ fontSize: '12px', color: '#8A7970', fontWeight: '600', margin: '2px 0 0 0' }}>
              Update workplace profile and salary structure
            </p>
          </div>
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

        {/* Tab switcher */}
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
          <button onClick={() => setActiveTab('work')} style={tabButtonStyle('work')}>
            Work Info
          </button>
          <button onClick={() => setActiveTab('private')} style={tabButtonStyle('private')}>
            Private Info
          </button>
          <button onClick={() => setActiveTab('salary')} style={tabButtonStyle('salary')}>
            Salary Auto-Calculator
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* TAB 1: WORK INFO */}
          {activeTab === 'work' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row-2">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="label">Department</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileForm.designation}
                    onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">About / Bio</label>
                <textarea
                  rows={3}
                  className="input-field"
                  value={profileForm.about}
                  onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PRIVATE INFO */}
          {activeTab === 'private' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row-2">
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={privateForm.phone}
                    onChange={(e) => setPrivateForm({ ...privateForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Personal Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={privateForm.personal_email}
                    onChange={(e) => setPrivateForm({ ...privateForm, personal_email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Home Address</label>
                <textarea
                  rows={2}
                  className="input-field"
                  value={privateForm.home_address}
                  onChange={(e) => setPrivateForm({ ...privateForm, home_address: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* TAB 3: SALARY AUTO-CALCULATOR */}
          {activeTab === 'salary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Wage Type & Base Amount */}
              <div className="form-row-3" style={{ backgroundColor: '#FAF5EE', padding: '16px', borderRadius: '16px', border: '1px solid #EFE7DC' }}>
                <div>
                  <label className="label">Wage Type</label>
                  <select
                    className="input-field"
                    value={wageType}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                  >
                    <option value="monthly">Monthly Wage</option>
                    <option value="yearly">Yearly CTC</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    {wageType === 'monthly' ? 'Monthly Wage (₹)' : 'Yearly CTC (₹)'}
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ fontWeight: '700', color: '#743A24' }}
                    value={wageAmount}
                    onChange={(e) => handleWageChange(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label">Computed Monthly Base</label>
                  <div className="input-field" style={{ fontFamily: 'monospace', fontWeight: '800', color: '#743A24', display: 'flex', alignItems: 'center' }}>
                    ₹{Math.round(targetMonthlyWage).toLocaleString()} / mo
                  </div>
                </div>
              </div>

              {/* Components table */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="section-subtitle" style={{ margin: 0 }}>
                    SALARY COMPONENTS & 2-PASS CASCADING FORMULA
                  </span>
                  <button
                    type="button"
                    onClick={addComponent}
                    className="btn-sand"
                    style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700' }}
                  >
                    <Plus size={12} /> Add Component
                  </button>
                </div>

                <div style={{ border: '1px solid #EFE7DC', borderRadius: '16px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F7EFE6', color: '#743A24', fontWeight: '700' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Component</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Rule</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((c, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #F0E8DD' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="text"
                              className="input-field"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              value={c.name}
                              onChange={(e) => handleComponentChange(i, 'name', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <select
                              className="input-field"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              value={c.compensation_type}
                              onChange={(e) => handleComponentChange(i, 'compensation_type', e.target.value)}
                            >
                              <option value="percentage">Percentage (%)</option>
                              <option value="fixed">Fixed (₹)</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {c.compensation_type === 'percentage' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="number"
                                  className="input-field"
                                  style={{ padding: '6px 10px', fontSize: '12px', width: '60px', textAlign: 'right', fontWeight: '700' }}
                                  value={c.percentage_value || 0}
                                  onChange={(e) => handleComponentChange(i, 'percentage_value', Number(e.target.value))}
                                />
                                <span style={{ fontSize: '11px', color: '#8A7970', fontWeight: '700' }}>% of</span>
                                <select
                                  className="input-field"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  value={c.percentage_of || 'wage'}
                                  onChange={(e) => handleComponentChange(i, 'percentage_of', e.target.value)}
                                >
                                  <option value="wage">Wage</option>
                                  <option value="basic">Basic</option>
                                </select>
                              </div>
                            ) : (
                              <span style={{ color: '#8A7970', fontSize: '12px', fontStyle: 'italic' }}>Fixed value</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#743A24' }}>
                            {c.compensation_type === 'fixed' ? (
                              <input
                                type="number"
                                className="input-field"
                                style={{ padding: '6px 10px', fontSize: '12px', width: '90px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}
                                value={c.amount || 0}
                                onChange={(e) => handleComponentChange(i, 'amount', Number(e.target.value))}
                              />
                            ) : (
                              `₹${Number(c.amount).toLocaleString()}`
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeComponent(i)}
                              style={{ background: 'none', border: 'none', color: '#D9532F', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Balance verification alert */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isBalanced ? '#E8F8F0' : '#FEF7EC',
                  color: isBalanced ? '#219653' : '#B57410',
                  border: isBalanced ? '1px solid #C8EFDB' : '1px solid #F8E3C0',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isBalanced ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>
                    {isBalanced
                      ? 'Components match total monthly wage (100% balanced).'
                      : `Total components (₹${totalMonthlyComponents.toLocaleString()}) differ from Monthly Wage (₹${targetMonthlyWage.toLocaleString()}).`}
                  </span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '800' }}>
                  ₹{totalMonthlyComponents.toLocaleString()} / ₹{targetMonthlyWage.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-sand">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-terracotta"
          >
            <Save size={14} />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
