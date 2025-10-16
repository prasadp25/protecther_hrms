// Mock attendance data for the HRMS system

// Generate attendance records for the current month
const generateAttendanceRecords = () => {
  const records = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Get number of days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Sample employee IDs
  const employeeIds = [1, 2, 3, 4];
  const employeeData = {
    1: { code: 'EMP001', name: 'Rajesh Kumar' },
    2: { code: 'EMP002', name: 'Priya Sharma' },
    3: { code: 'EMP003', name: 'Amit Patel' },
    4: { code: 'EMP004', name: 'Sunita Verma' },
  };

  let recordId = 1;

  // Generate records for each employee for current month
  employeeIds.forEach(employeeId => {
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // Skip future dates
      if (date > today) continue;

      // Default status based on day
      let status = 'PRESENT';
      let checkIn = '09:00:00';
      let checkOut = '18:00:00';
      let overtime = 0;
      let remarks = '';

      // Sunday is holiday
      if (dayOfWeek === 0) {
        status = 'HOLIDAY';
        checkIn = null;
        checkOut = null;
        remarks = 'Weekly off';
      }
      // Random variations for realistic data
      else if (Math.random() > 0.85) {
        status = 'ABSENT';
        checkIn = null;
        checkOut = null;
        remarks = 'Unauthorized absence';
      }
      else if (Math.random() > 0.9) {
        status = 'HALF_DAY';
        checkIn = '09:00:00';
        checkOut = '14:00:00';
        remarks = 'Half day leave';
      }
      else if (Math.random() > 0.95) {
        status = 'LEAVE';
        checkIn = null;
        checkOut = null;
        remarks = 'Approved leave';
      }
      else {
        // Random check-in time (8:45 - 9:30)
        const checkInMinutes = 525 + Math.floor(Math.random() * 45); // 8:45 AM to 9:30 AM
        const checkInHours = Math.floor(checkInMinutes / 60);
        const checkInMins = checkInMinutes % 60;
        checkIn = `${String(checkInHours).padStart(2, '0')}:${String(checkInMins).padStart(2, '0')}:00`;

        // Random check-out time (17:30 - 19:00)
        const checkOutMinutes = 1050 + Math.floor(Math.random() * 90); // 5:30 PM to 7:00 PM
        const checkOutHours = Math.floor(checkOutMinutes / 60);
        const checkOutMins = checkOutMinutes % 60;
        checkOut = `${String(checkOutHours).padStart(2, '0')}:${String(checkOutMins).padStart(2, '0')}:00`;

        // Calculate overtime (if checkout > 18:00)
        if (checkOutMinutes > 1080) {
          overtime = ((checkOutMinutes - 1080) / 60).toFixed(2);
        }

        // Mark late if check-in after 9:15
        if (checkInMinutes > 555) {
          remarks = 'Late arrival';
        }
      }

      records.push({
        attendanceId: recordId++,
        employeeId,
        employeeCode: employeeData[employeeId].code,
        employeeName: employeeData[employeeId].name,
        date: dateStr,
        status, // PRESENT, ABSENT, HALF_DAY, LEAVE, HOLIDAY
        checkIn,
        checkOut,
        workingHours: status === 'PRESENT' ? 9 : status === 'HALF_DAY' ? 4.5 : 0,
        overtime: parseFloat(overtime),
        remarks,
        markedBy: 'ADMIN',
        markedAt: dateStr + 'T09:00:00',
      });
    }
  });

  return records;
};

export const mockAttendanceRecords = generateAttendanceRecords();

// Sample holidays
export const mockHolidays = [
  {
    holidayId: 1,
    date: '2024-01-26',
    name: 'Republic Day',
    type: 'NATIONAL',
  },
  {
    holidayId: 2,
    date: '2024-08-15',
    name: 'Independence Day',
    type: 'NATIONAL',
  },
  {
    holidayId: 3,
    date: '2024-10-02',
    name: 'Gandhi Jayanti',
    type: 'NATIONAL',
  },
  {
    holidayId: 4,
    date: '2024-12-25',
    name: 'Christmas',
    type: 'NATIONAL',
  },
  {
    holidayId: 5,
    date: '2024-11-01',
    name: 'Diwali',
    type: 'FESTIVAL',
  },
];

// Function to calculate monthly attendance summary
export const calculateMonthlySummary = (employeeId, month, records) => {
  const monthRecords = records.filter(
    (rec) => rec.employeeId === employeeId && rec.date.startsWith(month)
  );

  const presentDays = monthRecords.filter((rec) => rec.status === 'PRESENT').length;
  const absentDays = monthRecords.filter((rec) => rec.status === 'ABSENT').length;
  const halfDays = monthRecords.filter((rec) => rec.status === 'HALF_DAY').length;
  const leaveDays = monthRecords.filter((rec) => rec.status === 'LEAVE').length;
  const holidays = monthRecords.filter((rec) => rec.status === 'HOLIDAY').length;

  const totalWorkingDays = monthRecords.length - holidays;
  const totalPresent = presentDays + (halfDays * 0.5);
  const totalOvertimeHours = monthRecords.reduce((sum, rec) => sum + rec.overtime, 0);
  const lateDays = monthRecords.filter((rec) => rec.remarks && rec.remarks.includes('Late')).length;

  return {
    employeeId,
    month,
    totalDays: monthRecords.length,
    totalWorkingDays,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    holidays,
    totalPresent,
    totalOvertimeHours: totalOvertimeHours.toFixed(2),
    lateDays,
    attendancePercentage: ((totalPresent / totalWorkingDays) * 100).toFixed(2),
  };
};

// Function to get attendance status color
export const getAttendanceStatusColor = (status) => {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-500';
    case 'ABSENT':
      return 'bg-red-500';
    case 'HALF_DAY':
      return 'bg-yellow-500';
    case 'LEAVE':
      return 'bg-blue-500';
    case 'HOLIDAY':
      return 'bg-gray-400';
    default:
      return 'bg-gray-300';
  }
};

// Function to get attendance status label
export const getAttendanceStatusLabel = (status) => {
  switch (status) {
    case 'PRESENT':
      return 'Present';
    case 'ABSENT':
      return 'Absent';
    case 'HALF_DAY':
      return 'Half Day';
    case 'LEAVE':
      return 'Leave';
    case 'HOLIDAY':
      return 'Holiday';
    default:
      return 'Unknown';
  }
};
