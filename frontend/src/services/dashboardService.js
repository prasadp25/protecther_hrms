import { employeeService } from './employeeService';
import { salaryService } from './salaryService';
import { siteService } from './siteService';
import { companyService } from './companyService';
import api from '../config/api';

export const dashboardService = {
  // Get comprehensive dashboard data
  getDashboardData: async () => {
    try {

      // Get current month for attendance
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Fetch all required data including attendance, sites, and site-wise salary report
      const [employeesResponse, salariesResponse, payslipsResponse, sitesResponse, attendanceResponse, siteWiseSalaryResponse] = await Promise.all([
        employeeService.getAllEmployees({ limit: 500 }), // Fetch all employees for dashboard
        salaryService.getAllSalaries({ limit: 500 }), // Fetch all salaries for dashboard
        salaryService.getAllPayslips({ limit: 500 }), // Fetch all payslips for dashboard
        siteService.getAllSites(),
        api.get(`/attendance/month/${currentMonth}`).catch(() => ({ data: { success: true, data: [] } })),
        api.get(`/salaries/report/site-wise`).catch(() => ({ data: { success: true, data: [] } }))
      ]);

      const employees = employeesResponse.data || [];
      const salaries = salariesResponse.data || [];
      const payslips = payslipsResponse.data || [];
      const sites = sitesResponse.data || [];
      const attendance = attendanceResponse.data?.data || [];
      const siteWiseSalary = siteWiseSalaryResponse.data?.data || [];

      // Calculate employee statistics
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter((emp) => emp.status === 'ACTIVE').length;
      const inactiveEmployees = employees.filter((emp) => emp.status === 'INACTIVE' || emp.status === 'TERMINATED').length;
      const onLeaveEmployees = employees.filter((emp) => emp.status === 'ON_LEAVE').length;

      // Calculate salary statistics
      const activeSalaries = salaries.filter((sal) => sal.status === 'ACTIVE');
      const totalMonthlySalary = activeSalaries.reduce((sum, sal) => sum + parseFloat(sal.net_salary || 0), 0);
      const avgSalary = totalMonthlySalary / (activeSalaries.length || 1);

      // Safe calculation for min/max with empty arrays
      const salaryAmounts = activeSalaries.map((sal) => parseFloat(sal.net_salary || 0));
      const maxSalary = salaryAmounts.length > 0 ? Math.max(...salaryAmounts) : 0;
      const minSalary = salaryAmounts.length > 0 ? Math.min(...salaryAmounts) : 0;

      // Calculate payslip statistics
      const currentMonthPayslips = payslips.filter((slip) => slip.month === currentMonth);
      const paidPayslips = currentMonthPayslips.filter((slip) => slip.payment_status === 'PAID');
      const pendingPayslips = currentMonthPayslips.filter(
        (slip) => slip.payment_status === 'PENDING'
      );

      const totalPaidAmount = paidPayslips.reduce((sum, slip) => sum + parseFloat(slip.net_salary || 0), 0);
      const totalPendingAmount = pendingPayslips.reduce((sum, slip) => sum + parseFloat(slip.net_salary || 0), 0);

      // Get recent payslips and transform field names
      const recentPayslips = payslips
        .sort((a, b) => new Date(b.month) - new Date(a.month))
        .slice(0, 5)
        .map(slip => ({
          payslipId: slip.payslip_id,
          employeeName: `${slip.first_name || ''} ${slip.last_name || ''}`.trim() || 'Employee',
          month: slip.month,
          netSalary: parseFloat(slip.net_salary || 0),
          paymentStatus: slip.payment_status
        }));

      // Calculate status distribution
      const statusDistribution = [
        { status: 'ACTIVE', count: activeEmployees, percentage: (activeEmployees / (totalEmployees || 1)) * 100 },
        { status: 'INACTIVE', count: inactiveEmployees, percentage: (inactiveEmployees / (totalEmployees || 1)) * 100 },
        { status: 'ON_LEAVE', count: onLeaveEmployees, percentage: (onLeaveEmployees / (totalEmployees || 1)) * 100 },
      ];

      // Calculate monthly salary trend (last 3 months)
      const last3Months = [];
      const today = new Date();
      for (let i = 2; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        const monthPayslips = payslips.filter((slip) => slip.month === monthStr);
        const monthTotal = monthPayslips.reduce((sum, slip) => sum + parseFloat(slip.net_salary || 0), 0);
        last3Months.push({
          month: monthStr,
          monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total: monthTotal,
          count: monthPayslips.length,
        });
      }

      // Calculate upcoming birthdays
      const upcomingBirthdays = calculateUpcomingBirthdays(employees);

      // Calculate attendance statistics
      const totalAttendanceRecords = attendance.length;
      const presentRecords = attendance.filter(att => att.status === 'PRESENT').length;
      const averageAttendance = totalAttendanceRecords > 0
        ? Math.round((presentRecords / totalAttendanceRecords) * 100)
        : 0;

      // Get today's date for leave tracking
      const todayDate = new Date().toISOString().split('T')[0];
      const employeesOnLeaveToday = employees.filter(emp => emp.status === 'ON_LEAVE').length;

      // Calculate site statistics
      const activeSites = sites.filter(site => site.status === 'ACTIVE').length;
      const totalSites = sites.length;

      // Calculate employees per site with salary breakdown
      const employeesPerSite = sites.map(site => {
        // Find salary data for this site
        const siteSalaryData = siteWiseSalary.find(s => s.site_id === site.site_id);

        return {
          siteId: site.site_id,
          siteName: site.site_name,
          siteCode: site.site_code,
          // Use backend's employee count which is accurate and company-filtered
          employeeCount: siteSalaryData ? parseInt(siteSalaryData.employee_count) : 0,
          status: site.status,
          location: site.location,
          clientName: site.client_name,
          // Salary breakdown
          totalGross: siteSalaryData ? parseFloat(siteSalaryData.total_gross) : 0,
          totalDeductions: siteSalaryData ? parseFloat(siteSalaryData.total_deductions) : 0,
          totalNet: siteSalaryData ? parseFloat(siteSalaryData.total_net) : 0,
          avgSalary: siteSalaryData && siteSalaryData.employee_count > 0
            ? parseFloat(siteSalaryData.total_net) / siteSalaryData.employee_count
            : 0
        };
      }).sort((a, b) => b.employeeCount - a.employeeCount);

      return {
        success: true,
        data: {
          employees: {
            total: totalEmployees,
            active: activeEmployees,
            resigned: inactiveEmployees,
            onLeave: onLeaveEmployees,
            statusDistribution,
          },
          salary: {
            totalMonthly: Math.round(totalMonthlySalary),
            average: Math.round(avgSalary),
            max: maxSalary,
            min: minSalary,
            employeesOnPayroll: activeSalaries.length,
          },
          payslips: {
            currentMonth: {
              total: currentMonthPayslips.length,
              paid: paidPayslips.length,
              pending: pendingPayslips.length,
              paidAmount: Math.round(totalPaidAmount),
              pendingAmount: Math.round(totalPendingAmount),
            },
            recent: recentPayslips,
            trend: last3Months,
          },
          attendance: {
            averagePercentage: averageAttendance,
            totalRecords: totalAttendanceRecords,
            presentRecords: presentRecords,
            employeesOnLeaveToday: employeesOnLeaveToday,
          },
          sites: {
            total: totalSites,
            active: activeSites,
            inactive: totalSites - activeSites,
            employeesPerSite: employeesPerSite,
          },
          recentActivities: generateRecentActivities(employees, payslips),
          upcomingBirthdays,
        },
        message: 'Dashboard data retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to load dashboard data',
        error: error.message,
      };
    }
  },

  // Get quick stats for header
  getQuickStats: async () => {
    try {

      const [employeesResponse, salaryResponse] = await Promise.all([
        employeeService.getActiveEmployees(),
        salaryService.getSalarySummary(),
      ]);

      return {
        success: true,
        data: {
          activeEmployees: employeesResponse.data?.length || 0,
          monthlySalaryBurden: salaryResponse.data?.totalSalaryBurden || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to load quick stats',
      };
    }
  },

  // Get company-wise summary for SUPER_ADMIN
  getCompanyWiseSummary: async () => {
    try {
      const companiesResponse = await companyService.getCompaniesSummary();

      if (!companiesResponse.success) {
        return { success: false, data: [] };
      }

      const companies = companiesResponse.data || [];

      // For each company, get detailed stats
      const companyStats = await Promise.all(
        companies.map(async (company) => {
          try {
            const statsResponse = await companyService.getCompanyStats(company.company_id);
            return {
              company_id: company.company_id,
              company_code: company.company_code,
              company_name: company.company_name,
              status: company.status,
              employee_count: statsResponse.data?.employee_count || company.employee_count || 0,
              site_count: statsResponse.data?.site_count || company.site_count || 0,
              user_count: statsResponse.data?.user_count || company.user_count || 0,
              total_salary_cost: statsResponse.data?.total_salary_cost || 0,
            };
          } catch (err) {
            return {
              company_id: company.company_id,
              company_code: company.company_code,
              company_name: company.company_name,
              status: company.status,
              employee_count: company.employee_count || 0,
              site_count: company.site_count || 0,
              user_count: company.user_count || 0,
              total_salary_cost: 0,
            };
          }
        })
      );

      // Filter out companies with 0 employees
      const filteredStats = companyStats.filter(stat => stat.employee_count > 0);

      return {
        success: true,
        data: filteredStats,
      };
    } catch (error) {
            return {
        success: false,
        data: [],
        message: 'Failed to load company summary',
      };
    }
  },

  // Get pending tasks for quick action dashboard
  getPendingTasks: async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const [employeesResponse, salariesResponse, payslipsResponse, attendanceResponse] = await Promise.all([
        employeeService.getAllEmployees({ limit: 500, status: 'ACTIVE' }),
        salaryService.getAllSalaries({ limit: 500 }),
        salaryService.getAllPayslips({ limit: 500 }),
        api.get(`/attendance/month/${currentMonth}`).catch(() => ({ data: { success: true, data: [] } }))
      ]);

      const employees = employeesResponse.data || [];
      const salaries = salariesResponse.data || [];
      const payslips = payslipsResponse.data || [];
      const attendance = attendanceResponse.data?.data || [];

      // Find employees without active salary structure
      const employeesWithSalary = new Set(
        salaries
          .filter(s => s.status === 'ACTIVE')
          .map(s => s.employee_id)
      );
      const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
      const employeesWithoutSalary = activeEmployees.filter(e => !employeesWithSalary.has(e.employee_id)).length;

      // Find employees with DRAFT attendance (not finalized) for current month
      const attendanceNotFinalized = attendance.filter(a => a.status === 'DRAFT' || !a.status).length;

      // Find pending payslips for current month
      const currentMonthPayslips = payslips.filter(p => p.month === currentMonth);
      const payslipsPending = currentMonthPayslips.filter(p => p.payment_status === 'PENDING').length;

      return {
        success: true,
        data: {
          employeesWithoutSalary,
          attendanceNotFinalized,
          payslipsPending
        }
      };
    } catch (error) {
            return {
        success: false,
        data: {
          employeesWithoutSalary: 0,
          attendanceNotFinalized: 0,
          payslipsPending: 0
        }
      };
    }
  },
};

// Helper function to calculate upcoming birthdays
function calculateUpcomingBirthdays(employees) {
  try {
    const now = new Date();
    // Compare against local midnight so a birthday today counts as today,
    // not as "passed" and pushed to next year
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = todayMidnight.getFullYear();

    // Filter active and on-leave employees with valid DOB
    const eligibleEmployees = employees.filter(
      (emp) =>
        (emp.status === 'ACTIVE' || emp.status === 'ON_LEAVE') && emp.dob
    );

    const birthdays = eligibleEmployees
      .map((emp) => {
        try {
          // dob arrives as an ISO timestamp like "2001-10-17T18:30:00.000Z"
          // (MySQL DATE shifted to UTC by the driver). Parsing via Date and
          // reading LOCAL components recovers the stored calendar date;
          // plain 'YYYY-MM-DD' strings also work this way.
          const dobDate = new Date(emp.dob);
          if (isNaN(dobDate.getTime())) return null;

          const year = dobDate.getFullYear();
          const month = dobDate.getMonth(); // 0-based
          const day = dobDate.getDate();

          // Calculate birthday for current year
          let birthday = new Date(currentYear, month, day);
          if (birthday < todayMidnight) {
            birthday = new Date(currentYear + 1, month, day);
          }

          const daysUntil = Math.round((birthday - todayMidnight) / (1000 * 60 * 60 * 24));
          const age = birthday.getFullYear() - year;

          // Format locally — toISOString() would shift the date back a day in IST
          const pad = (n) => String(n).padStart(2, '0');
          const birthdayDate = `${birthday.getFullYear()}-${pad(birthday.getMonth() + 1)}-${pad(birthday.getDate())}`;

          return {
            employeeId: emp.employee_id,
            employeeCode: emp.employee_code,
            employeeName: `${emp.first_name} ${emp.last_name}`,
            status: emp.status,
            dob: emp.dob,
            birthdayDate,
            daysUntil,
            age,
            isToday: daysUntil === 0,
          };
        } catch (err) {
                    return null;
        }
      })
      .filter((b) => b !== null);

    // Sort by days until birthday and return next 30 days
    return birthdays
      .filter((b) => b.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  } catch (error) {
        return [];
  }
}

// Helper function to generate recent activities
function generateRecentActivities(employees, payslips) {
  try {
    const activities = [];

    // Add recent employee additions
    const recentEmployees = employees
      .filter((emp) => emp.date_of_joining && emp.date_of_joining.trim() !== '')
      .filter((emp) => {
        const joiningDate = new Date(emp.date_of_joining);
        return !isNaN(joiningDate.getTime());
      })
      .sort((a, b) => {
        const dateA = new Date(a.date_of_joining);
        const dateB = new Date(b.date_of_joining);
        return dateB - dateA;
      })
      .slice(0, 3);

    recentEmployees.forEach((emp) => {
      activities.push({
        type: 'employee_joined',
        title: 'New Employee Joined',
        description: `${emp.first_name} ${emp.last_name} (${emp.employee_code}) joined the company`,
        date: emp.date_of_joining,
        icon: 'user-plus',
      });
    });

    // Add recent payslip generations
    const recentPayslips = payslips
      .filter((slip) => {
        const dateStr = slip.payment_date || slip.month;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      })
      .sort((a, b) => {
        const dateA = new Date(a.payment_date || a.month);
        const dateB = new Date(b.payment_date || b.month);
        return dateB - dateA;
      })
      .slice(0, 3);

    recentPayslips.forEach((slip) => {
      try {
        const employeeName = `${slip.first_name || ''} ${slip.last_name || ''}`.trim() || 'Employee';
        const monthDate = new Date(slip.month + '-01');
        const monthStr = !isNaN(monthDate.getTime())
          ? monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : slip.month;

        activities.push({
          type: slip.payment_status === 'PAID' ? 'payment_completed' : 'payslip_generated',
          title: slip.payment_status === 'PAID' ? 'Payment Completed' : 'Payslip Generated',
          description: `Payslip for ${employeeName} - ${monthStr}`,
          date: slip.payment_date || slip.month,
          icon: slip.payment_status === 'PAID' ? 'check-circle' : 'file-text',
        });
      } catch (err) {
              }
    });

    // Sort all activities by date and return top 5
    return activities
      .filter((activity) => {
        const date = new Date(activity.date);
        return !isNaN(date.getTime());
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      })
      .slice(0, 5);
  } catch (error) {
        return [];
  }
}
