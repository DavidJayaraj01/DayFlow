/**
 * Shared TypeScript types for the Dayflow frontend.
 */

export interface User {
  id: number;
  login_id: string;
  email: string;
  role: 'admin' | 'hr_officer' | 'employee';
  company_id: number;
  must_change_password: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  role: string;
  must_change_password: boolean;
}

export interface EmployeeCard {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  department: string | null;
  designation: string | null;
  login_id: string;
  email: string;
  status_dot: 'green' | 'yellow' | 'orange';
  role: string;
}

export interface EmployeeDetail {
  id: number;
  user_id: number;
  login_id: string;
  email: string;
  phone: string | null;
  role: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  department: string | null;
  designation: string | null;
  manager_id: number | null;
  manager_name: string | null;
  date_of_joining: string | null;
  about: string | null;
  job_love_note: string | null;
  hobbies_note: string | null;
  status_dot: string;
  skills: string[];
  certifications: Certification[];
  date_of_birth?: string | null;
  home_address?: string | null;
  anniversary_date?: string | null;
  personal_email?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  blood_group?: string | null;
  salary_structure?: SalaryStructure | null;
  profile?: {
    first_name?: string;
    last_name?: string;
    department?: string;
    designation?: string;
    profile_picture_url?: string;
    date_of_joining?: string;
    about?: string;
    job_love_note?: string;
    hobbies_note?: string;
  };
  private_info?: {
    date_of_birth?: string;
    home_address?: string;
    anniversary_date?: string;
    personal_email?: string;
    gender?: string;
    marital_status?: string;
    blood_group?: string;
    phone?: string;
  };
}

export interface Certification {
  id: number;
  cert_name: string;
  issued_by: string | null;
  issued_date: string | null;
}

export interface SalaryComponent {
  id?: number;
  name: string;
  compensation_type: 'fixed' | 'percentage';
  percentage_of?: 'wage' | 'basic' | null;
  amount: number;
  percentage_value?: number | null;
}

export interface SalaryComponentInput {
  name: string;
  compensation_type: 'fixed' | 'percentage';
  percentage_of?: 'wage' | 'basic' | null;
  amount: number;
  percentage_value?: number | null;
}

export interface SalaryStructure {
  id: number;
  user_id: number;
  wage_type: 'monthly' | 'yearly';
  month_wage: number;
  yearly_wage: number;
  working_days_per_week: number;
  basic_hours: number;
  pf_employee_pct: number;
  pf_employer_pct: number;
  pf_employee_amount?: number;
  pf_employer_amount?: number;
  professional_tax: number;
  components: SalaryComponent[];
  total_components?: number;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  employee_name?: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  work_hours: number | null;
  extra_hours: number | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
}

export interface AttendanceSummary {
  present_days: number;
  leave_days: number;
  absent_days: number;
  total_working_days: number;
  month: number;
  year: number;
}

export interface AttendanceListResponse {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
}

export interface LeaveType {
  id: number;
  name: string;
  default_annual_quota: number;
}

export interface LeaveBalance {
  id?: number;
  user_id?: number;
  employee_name?: string;
  leave_type_id: number;
  leave_type_name: string;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  employee_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  attachment_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_comment?: string | null;
  created_at?: string;
}

export interface TodayStatus {
  is_checked_in: boolean;
  check_in_time: string | null;
  status_dot: string;
}
