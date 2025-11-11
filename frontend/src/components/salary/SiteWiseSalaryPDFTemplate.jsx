import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create styles for the salary sheet
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },

  // Header Section
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottom: '2px solid black',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  // Info Section
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#F5F5F5',
  },
  infoItem: {
    fontSize: 10,
  },
  infoLabel: {
    fontWeight: 'bold',
  },

  // Table
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4472C4',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 8,
    padding: 5,
    borderBottom: '1px solid black',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ddd',
    padding: 4,
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #ddd',
    padding: 4,
    fontSize: 8,
    backgroundColor: '#F9F9F9',
  },

  // Column widths
  colSrNo: { width: '5%', textAlign: 'center' },
  colEmpCode: { width: '8%' },
  colName: { width: '15%' },
  colDesignation: { width: '12%' },
  colDays: { width: '6%', textAlign: 'center' },
  colBasic: { width: '10%', textAlign: 'right' },
  colHRA: { width: '8%', textAlign: 'right' },
  colGross: { width: '10%', textAlign: 'right' },
  colDeductions: { width: '10%', textAlign: 'right' },
  colNet: { width: '12%', textAlign: 'right', fontWeight: 'bold' },

  // Total Row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#FFE066',
    fontWeight: 'bold',
    fontSize: 9,
    padding: 5,
    borderTop: '2px solid black',
    borderBottom: '2px solid black',
  },

  // Summary Section
  summarySection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#F0F0F0',
    border: '1px solid #333',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    fontSize: 9,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    borderTop: '1px solid #ddd',
    paddingTop: 5,
  },
});

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// Main PDF Document Component
const SiteWiseSalaryPDFTemplate = ({ payslips, siteName, siteCode, month, employees }) => {
  // Format month
  const monthYear = new Date(month + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate totals
  const totals = payslips.reduce(
    (acc, payslip) => ({
      gross: acc.gross + (parseFloat(payslip.grossSalary) || 0),
      deductions: acc.deductions + (
        (parseFloat(payslip.pfDeduction) || 0) +
        (parseFloat(payslip.healthInsurance) || 0) +
        (parseFloat(payslip.esiDeduction) || 0) +
        (parseFloat(payslip.advanceDeduction) || 0) +
        (parseFloat(payslip.professionalTax) || 0)
      ),
      net: acc.net + (parseFloat(payslip.netSalary) || 0),
      basic: acc.basic + (parseFloat(payslip.basicSalary) || 0),
      hra: acc.hra + (parseFloat(payslip.hra) || 0),
    }),
    { gross: 0, deductions: 0, net: 0, basic: 0, hra: 0 }
  );

  const totalEmployees = payslips.length;
  const avgSalary = totalEmployees > 0 ? totals.net / totalEmployees : 0;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/company-logo.png" style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.companyName}>EHS STAFFING SOLUTIONS</Text>
            <Text style={styles.headerTitle}>Site-wise Salary Sheet</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Site: </Text>
              {siteName} ({siteCode})
            </Text>
          </View>
          <View>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Month: </Text>
              {monthYear}
            </Text>
          </View>
          <View>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total Employees: </Text>
              {totalEmployees}
            </Text>
          </View>
          <View>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Generated: </Text>
              {new Date().toLocaleDateString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colSrNo}>Sr.</Text>
            <Text style={styles.colEmpCode}>Emp Code</Text>
            <Text style={styles.colName}>Employee Name</Text>
            <Text style={styles.colDesignation}>Designation</Text>
            <Text style={styles.colDays}>Days</Text>
            <Text style={styles.colBasic}>Basic</Text>
            <Text style={styles.colHRA}>HRA</Text>
            <Text style={styles.colGross}>Gross</Text>
            <Text style={styles.colDeductions}>Deductions</Text>
            <Text style={styles.colNet}>Net Salary</Text>
          </View>

          {/* Table Rows */}
          {payslips.map((payslip, index) => {
            const employee = employees.find(e => e.employee_id === payslip.employeeId);
            const deductions =
              (parseFloat(payslip.pfDeduction) || 0) +
              (parseFloat(payslip.healthInsurance) || 0) +
              (parseFloat(payslip.esiDeduction) || 0) +
              (parseFloat(payslip.advanceDeduction) || 0) +
              (parseFloat(payslip.professionalTax) || 0);

            const RowStyle = index % 2 === 0 ? styles.tableRow : styles.tableRowAlt;

            return (
              <View key={payslip.payslipId} style={RowStyle}>
                <Text style={styles.colSrNo}>{index + 1}</Text>
                <Text style={styles.colEmpCode}>{payslip.employeeCode}</Text>
                <Text style={styles.colName}>{payslip.employeeName}</Text>
                <Text style={styles.colDesignation}>{employee?.designation || '-'}</Text>
                <Text style={styles.colDays}>{payslip.daysPresent}/{payslip.totalDaysInMonth || payslip.totalWorkingDays}</Text>
                <Text style={styles.colBasic}>{formatCurrency(payslip.basicSalary)}</Text>
                <Text style={styles.colHRA}>{formatCurrency(payslip.hra)}</Text>
                <Text style={styles.colGross}>{formatCurrency(payslip.grossSalary)}</Text>
                <Text style={styles.colDeductions}>{formatCurrency(deductions)}</Text>
                <Text style={styles.colNet}>{formatCurrency(payslip.netSalary)}</Text>
              </View>
            );
          })}

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={styles.colSrNo}></Text>
            <Text style={styles.colEmpCode}></Text>
            <Text style={styles.colName}>TOTAL</Text>
            <Text style={styles.colDesignation}></Text>
            <Text style={styles.colDays}></Text>
            <Text style={styles.colBasic}>{formatCurrency(totals.basic)}</Text>
            <Text style={styles.colHRA}>{formatCurrency(totals.hra)}</Text>
            <Text style={styles.colGross}>{formatCurrency(totals.gross)}</Text>
            <Text style={styles.colDeductions}>{formatCurrency(totals.deductions)}</Text>
            <Text style={styles.colNet}>{formatCurrency(totals.net)}</Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text>Total Employees:</Text>
            <Text style={{ fontWeight: 'bold' }}>{totalEmployees}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total Gross Salary:</Text>
            <Text style={{ fontWeight: 'bold' }}>{formatCurrency(totals.gross)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total Deductions:</Text>
            <Text style={{ fontWeight: 'bold' }}>{formatCurrency(totals.deductions)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total Net Salary:</Text>
            <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>{formatCurrency(totals.net)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Average Salary per Employee:</Text>
            <Text style={{ fontWeight: 'bold' }}>{formatCurrency(avgSalary)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by EHS STAFFING SOLUTIONS - Confidential Document
        </Text>
      </Page>
    </Document>
  );
};

export default SiteWiseSalaryPDFTemplate;
