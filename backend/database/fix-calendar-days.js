const mysql = require('mysql2/promise');

async function fixCalendarDays() {
  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hrms_db'
    });

    console.log('✅ Connected to database');

    // Update all payslips to use calendar days
    const updateQuery = `
      UPDATE payslips
      SET total_working_days = total_days_in_month
      WHERE total_days_in_month IS NOT NULL
        AND total_days_in_month > 0
    `;

    const [updateResult] = await connection.execute(updateQuery);
    console.log(`✅ Updated ${updateResult.affectedRows} payslip records`);

    // Verify the update
    const verifyQuery = `
      SELECT
        payslip_id,
        employee_id,
        month,
        days_present,
        total_working_days,
        total_days_in_month,
        CONCAT(days_present, ' / ', total_working_days) as display
      FROM payslips
      ORDER BY month DESC
      LIMIT 10
    `;

    const [rows] = await connection.execute(verifyQuery);

    console.log('\n📊 Sample of updated records:');
    console.log('─'.repeat(70));
    console.log('Employee ID | Month     | Display      | Days in Month');
    console.log('─'.repeat(70));

    rows.forEach(row => {
      console.log(
        `${String(row.employee_id).padEnd(11)} | ${row.month} | ${row.display.padEnd(12)} | ${row.total_days_in_month}`
      );
    });

    console.log('─'.repeat(80));
    console.log('\n✅ Calendar days fix completed successfully!');
    console.log('💡 Please refresh your browser to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixCalendarDays();
