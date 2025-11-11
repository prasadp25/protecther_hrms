import { employeeService } from './employeeService';
import { salaryService } from './salaryService';
import { siteService } from './siteService';
import api from '../config/api';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardService = {
  // Get comprehensive dashboard data
  getDashboardData: async () => {
    try {
      await delay(500);

      console.log('🔍 Fetching dashboard API data...');

      // Get current month for attendance
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Fetch all required data including attendance, sites, and site-wise salary report
      const [employeesResponse, salariesResponse, payslipsResponse, sitesResponse, attendanceResponse, siteWiseSalaryResponse] = await Promise.all([
        employeeService.getAllEmployees(),
        salaryService.getAllSalaries(),
        salaryService.getAllPayslips(),
        siteService.getAllSites(),
        api.get(`/attendance/month/${currentMonth}`).catch(() => ({ data: { success: true, data: [] } })),
        api.get(`/salaries/report/site-wise`).catch(() => ({ data: { success: true, data: [] } }))
      ]);

      console.log('📦 API Responses received:', {
        employees: employeesResponse,
        salaries: salariesResponse,
        payslips: payslipsResponse,
        sites: sitesResponse,
        attendance: attendanceResponse
      });

      const employees = employeesResponse.data || [];
      const salaries = salariesResponse.data || [];
      const payslips = payslipsResponse.data || [];
      const sites = sitesResponse.data || [];
      const attendance = attendanceResponse.data?.data || [];
      const siteWiseSalary = siteWiseSalaryResponse.data?.data || [];

      console.log('📊 Data arrays:', {
        employeesCount: employees.length,
        salariesCount: salaries.length,
        payslipsCount: payslips.length
      });

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
        const siteEmployees = employees.filter(emp =>
          emp.site_id === site.site_id && emp.status === 'ACTIVE'
        );

        // Find salary data for this site
        const siteSalaryData = siteWiseSalary.find(s => s.site_id === site.site_id);

        return {
          siteId: site.site_id,
          siteName: site.site_name,
          siteCode: site.site_code,
          employeeCount: siteEmployees.length,
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
      await delay(200);

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
};

// Helper function to calculate upcoming birthdays
function calculateUpcomingBirthdays(employees) {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Filter active and on-leave employees with valid DOB
    const eligibleEmployees = employees.filter(
      (emp) =>
        (emp.status === 'ACTIVE' || emp.status === 'ON_LEAVE') &&
        emp.dob &&
        emp.dob.trim() !== ''
    );

    const birthdays = eligibleEmployees
      .map((emp) => {
        try {
          const dobParts = emp.dob.split('-');
          if (dobParts.length !== 3) return null;

          const [year, month, day] = dobParts.map(Number);
          if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

          // Calculate birthday for current year
          let birthdayThisYear = new Date(currentYear, month - 1, day);
          if (isNaN(birthdayThisYear.getTime())) return null;

          // If birthday has passed this year, use next year
          if (birthdayThisYear < today) {
            birthdayThisYear = new Date(currentYear + 1, month - 1, day);
          }

          // Calculate days until birthday
          const daysUntil = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

          // Calculate age
          const age = currentYear - year + (birthdayThisYear.getFullYear() > currentYear ? 1 : 0);

          return {
            employeeId: emp.employee_id,
            employeeCode: emp.employee_code,
            employeeName: `${emp.first_name} ${emp.last_name}`,
            status: emp.status,
            dob: emp.dob,
            birthdayDate: birthdayThisYear.toISOString().split('T')[0],
            daysUntil,
            age,
            isToday: daysUntil === 0,
          };
        } catch (err) {
          console.warn('Failed to parse birthday for employee:', emp.employee_id, err);
          return null;
        }
      })
      .filter((b) => b !== null);

    // Sort by days until birthday and return next 30 days
    return birthdays
      .filter((b) => b.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  } catch (error) {
    console.error('Error calculating birthdays:', error);
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
        console.warn('Failed to process payslip activity:', slip.payslip_id, err);
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
    console.error('Error generating recent activities:', error);
    return [];
  }
}
