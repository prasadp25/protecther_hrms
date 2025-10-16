import { employeeService } from './employeeService';
import { salaryService } from './salaryService';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardService = {
  // Get comprehensive dashboard data
  getDashboardData: async () => {
    try {
      await delay(500);

      // Fetch all required data
      const [employeesResponse, salariesResponse, payslipsResponse] = await Promise.all([
        employeeService.getAllEmployees(),
        salaryService.getAllSalaries(),
        salaryService.getAllPayslips(),
      ]);

      const employees = employeesResponse.data || [];
      const salaries = salariesResponse.data || [];
      const payslips = payslipsResponse.data || [];

      // Calculate employee statistics
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter((emp) => emp.status === 'ACTIVE').length;
      const resignedEmployees = employees.filter((emp) => emp.status === 'RESIGNED').length;
      const onLeaveEmployees = employees.filter((emp) => emp.status === 'ON_LEAVE').length;

      // Calculate salary statistics
      const activeSalaries = salaries.filter((sal) => sal.status === 'ACTIVE');
      const totalMonthlySalary = activeSalaries.reduce((sum, sal) => sum + sal.netSalary, 0);
      const avgSalary = totalMonthlySalary / (activeSalaries.length || 1);
      const maxSalary = Math.max(...activeSalaries.map((sal) => sal.netSalary), 0);
      const minSalary = Math.min(...activeSalaries.map((sal) => sal.netSalary), 0);

      // Calculate payslip statistics
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthPayslips = payslips.filter((slip) => slip.month === currentMonth);
      const paidPayslips = currentMonthPayslips.filter((slip) => slip.paymentStatus === 'PAID');
      const pendingPayslips = currentMonthPayslips.filter(
        (slip) => slip.paymentStatus === 'PENDING'
      );

      const totalPaidAmount = paidPayslips.reduce((sum, slip) => sum + slip.netSalary, 0);
      const totalPendingAmount = pendingPayslips.reduce((sum, slip) => sum + slip.netSalary, 0);

      // Get recent payslips
      const recentPayslips = payslips
        .sort((a, b) => new Date(b.month) - new Date(a.month))
        .slice(0, 5);

      // Calculate status distribution
      const statusDistribution = [
        { status: 'ACTIVE', count: activeEmployees, percentage: (activeEmployees / totalEmployees) * 100 },
        { status: 'RESIGNED', count: resignedEmployees, percentage: (resignedEmployees / totalEmployees) * 100 },
        { status: 'ON_LEAVE', count: onLeaveEmployees, percentage: (onLeaveEmployees / totalEmployees) * 100 },
      ];

      // Calculate monthly salary trend (last 3 months)
      const last3Months = [];
      const today = new Date();
      for (let i = 2; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        const monthPayslips = payslips.filter((slip) => slip.month === monthStr);
        const monthTotal = monthPayslips.reduce((sum, slip) => sum + slip.netSalary, 0);
        last3Months.push({
          month: monthStr,
          monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total: monthTotal,
          count: monthPayslips.length,
        });
      }

      // Calculate upcoming birthdays
      const upcomingBirthdays = calculateUpcomingBirthdays(employees);

      return {
        success: true,
        data: {
          employees: {
            total: totalEmployees,
            active: activeEmployees,
            resigned: resignedEmployees,
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
  const today = new Date();
  const currentYear = today.getFullYear();

  // Filter active and on-leave employees with valid DOB
  const eligibleEmployees = employees.filter(
    (emp) =>
      (emp.status === 'ACTIVE' || emp.status === 'ON_LEAVE') &&
      emp.dob
  );

  const birthdays = eligibleEmployees.map((emp) => {
    const [year, month, day] = emp.dob.split('-').map(Number);

    // Calculate birthday for current year
    let birthdayThisYear = new Date(currentYear, month - 1, day);

    // If birthday has passed this year, use next year
    if (birthdayThisYear < today) {
      birthdayThisYear = new Date(currentYear + 1, month - 1, day);
    }

    // Calculate days until birthday
    const daysUntil = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

    // Calculate age
    const age = currentYear - year + (birthdayThisYear.getFullYear() > currentYear ? 1 : 0);

    return {
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      status: emp.status,
      dob: emp.dob,
      birthdayDate: birthdayThisYear.toISOString().split('T')[0],
      daysUntil,
      age,
      isToday: daysUntil === 0,
    };
  });

  // Sort by days until birthday and return next 30 days
  return birthdays
    .filter((b) => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// Helper function to generate recent activities
function generateRecentActivities(employees, payslips) {
  const activities = [];

  // Add recent employee additions
  const recentEmployees = employees
    .filter((emp) => emp.dateOfJoining)
    .sort((a, b) => new Date(b.dateOfJoining) - new Date(a.dateOfJoining))
    .slice(0, 3);

  recentEmployees.forEach((emp) => {
    activities.push({
      type: 'employee_joined',
      title: 'New Employee Joined',
      description: `${emp.firstName} ${emp.lastName} (${emp.employeeCode}) joined the company`,
      date: emp.dateOfJoining,
      icon: 'user-plus',
    });
  });

  // Add recent payslip generations
  const recentPayslips = payslips
    .sort((a, b) => {
      const dateA = a.paymentDate || a.month;
      const dateB = b.paymentDate || b.month;
      return new Date(dateB) - new Date(dateA);
    })
    .slice(0, 3);

  recentPayslips.forEach((slip) => {
    activities.push({
      type: slip.paymentStatus === 'PAID' ? 'payment_completed' : 'payslip_generated',
      title: slip.paymentStatus === 'PAID' ? 'Payment Completed' : 'Payslip Generated',
      description: `Payslip for ${slip.employeeName} - ${new Date(slip.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      date: slip.paymentDate || slip.month,
      icon: slip.paymentStatus === 'PAID' ? 'check-circle' : 'file-text',
    });
  });

  // Sort all activities by date and return top 5
  return activities
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
}
