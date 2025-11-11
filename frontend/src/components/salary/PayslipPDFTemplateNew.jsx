import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles for the new format
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },

  // Header Section
  companyHeader: {
    textAlign: 'center',
    marginBottom: 15,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  companyAddress: {
    fontSize: 8,
    marginBottom: 5,
  },
  payslipTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 5,
  },

  // Employee Details Section
  detailsContainer: {
    flexDirection: 'row',
    border: '1px solid black',
    marginBottom: 10,
  },
  leftDetails: {
    width: '50%',
    borderRight: '1px solid black',
    padding: 5,
  },
  rightDetails: {
    width: '50%',
    padding: 5,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 8,
  },
  detailLabel: {
    width: '35%',
    fontWeight: 'bold',
  },
  detailValue: {
    width: '65%',
  },
  payableDaysRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 3,
    fontSize: 8,
  },
  payableDaysLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },

  // Main Table
  mainTable: {
    border: '1px solid black',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
    backgroundColor: '#f0f0f0',
  },
  earningsHeader: {
    width: '50%',
    padding: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    borderRight: '1px solid black',
  },
  deductionsHeader: {
    width: '50%',
    padding: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  // Earnings and Deductions Row
  contentRow: {
    flexDirection: 'row',
    minHeight: 300,
  },
  earningsSection: {
    width: '50%',
    borderRight: '1px solid black',
  },
  deductionsSection: {
    width: '50%',
  },

  // Earnings Sub-header
  earningsSubHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
    backgroundColor: '#f5f5f5',
    fontSize: 7,
    fontWeight: 'bold',
  },
  earningsDescCol: {
    width: '30%',
    padding: 3,
    borderRight: '1px solid black',
    textAlign: 'center',
  },
  earningsRateCol: {
    width: '17.5%',
    padding: 3,
    borderRight: '1px solid black',
    textAlign: 'center',
  },
  earningsMonthlyCol: {
    width: '17.5%',
    padding: 3,
    borderRight: '1px solid black',
    textAlign: 'center',
  },
  earningsArrearCol: {
    width: '17.5%',
    padding: 3,
    borderRight: '1px solid black',
    textAlign: 'center',
  },
  earningsTotalCol: {
    width: '17.5%',
    padding: 3,
    textAlign: 'center',
  },

  // Earnings Data Row
  earningsDataRow: {
    flexDirection: 'row',
    borderBottom: '0.5px solid #ddd',
    fontSize: 8,
  },
  earningsDataDesc: {
    width: '30%',
    padding: 3,
    borderRight: '1px solid #ddd',
  },
  earningsDataRate: {
    width: '17.5%',
    padding: 3,
    borderRight: '1px solid #ddd',
    textAlign: 'right',
  },
  earningsDataMonthly: {
    width: '17.5%',
    padding: 3,
    borderRight: '1px solid #ddd',
    textAlign: 'right',
  },
  earningsDataArrear: {
    width: '17.5%',
    padding: 3,
    borderRight: '1px solid #ddd',
    textAlign: 'right',
  },
  earningsDataTotal: {
    width: '17.5%',
    padding: 3,
    textAlign: 'right',
  },

  // Deductions Sub-header
  deductionsSubHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
    backgroundColor: '#f5f5f5',
    fontSize: 7,
    fontWeight: 'bold',
  },
  deductionsDescCol: {
    width: '70%',
    padding: 3,
    borderRight: '1px solid black',
    textAlign: 'center',
  },
  deductionsAmountCol: {
    width: '30%',
    padding: 3,
    textAlign: 'center',
  },

  // Deductions Data Row
  deductionsDataRow: {
    flexDirection: 'row',
    borderBottom: '0.5px solid #ddd',
    fontSize: 8,
  },
  deductionsDataDesc: {
    width: '70%',
    padding: 3,
    borderRight: '1px solid #ddd',
  },
  deductionsDataAmount: {
    width: '30%',
    padding: 3,
    textAlign: 'right',
  },

  // Footer Totals
  footerRow: {
    flexDirection: 'row',
    borderTop: '2px solid black',
    fontWeight: 'bold',
    fontSize: 9,
  },
  grossPaySection: {
    width: '50%',
    padding: 5,
    borderRight: '1px solid black',
  },
  grossDeductionSection: {
    width: '50%',
    padding: 5,
  },
  grossPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  grossDeductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Net Pay Row
  netPayRow: {
    flexDirection: 'row',
    borderTop: '1px solid black',
    backgroundColor: '#e0e0e0',
    fontWeight: 'bold',
    fontSize: 10,
  },
  netPayLabel: {
    width: '50%',
    padding: 5,
    textAlign: 'center',
    borderRight: '1px solid black',
  },
  netPayAmount: {
    width: '50%',
    padding: 5,
    textAlign: 'center',
  },

  // Amount in Words Row - Attached to Net Pay
  amountInWordsRow: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    fontWeight: 'normal',
    fontSize: 9,
    borderTop: '1px solid black',
  },
  amountInWordsContent: {
    width: '100%',
    padding: 5,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  amountLabel: {
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    marginTop: 15,
    fontSize: 8,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666',
  },
});

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  const num = Math.round(parseFloat(amount));
  const numStr = num.toString();
  let result = '';
  let count = 0;

  for (let i = numStr.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      result = ',' + result;
    }
    result = numStr[i] + result;
    count++;
  }

  return `₹${result}`;
};

// Helper function to convert number to words (Indian format)
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero Rupees Only';

  const convertHundreds = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
  };

  const convertLakhs = (n) => {
    if (n < 1000) return convertHundreds(n);
    if (n < 100000) return convertHundreds(Math.floor(n / 1000)) + ' Thousand ' + convertLakhs(n % 1000);
    if (n < 10000000) return convertHundreds(Math.floor(n / 100000)) + ' Lakh ' + convertLakhs(n % 100000);
    return convertHundreds(Math.floor(n / 10000000)) + ' Crore ' + convertLakhs(n % 10000000);
  };

  return convertLakhs(Math.floor(num)).trim() + ' Rupees Only';
};

// Main PDF Document Component
const PayslipPDFTemplateNew = ({ payslip, employee }) => {
  // Format month
  const monthYear = new Date(payslip.month + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate totals
  const grossPay = parseFloat(payslip.grossSalary) || 0;
  const totalDeductions =
    (parseFloat(payslip.pfDeduction) || 0) +
    (parseFloat(payslip.healthInsurance) || 0) +
    (parseFloat(payslip.esiDeduction) || 0) +
    (parseFloat(payslip.advanceDeduction) || 0) +
    (parseFloat(payslip.professionalTax) || 0) +
    (parseFloat(payslip.welfareDeduction) || 0);
  const netPay = parseFloat(payslip.netSalary) || 0;

  // Earnings breakdown
  const basicSalary = parseFloat(payslip.basicSalary) || 0;
  const hra = parseFloat(payslip.hra) || 0;
  const allowance = parseFloat(payslip.allowance) || 0;
  const otherAllowance = parseFloat(payslip.otherAllowances) || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Company Header */}
        <View style={styles.companyHeader}>
          <Text style={styles.companyName}>EHS STAFFING SOLUTIONS</Text>
          <Text style={styles.companyAddress}>
            Mega Center, F 507, Magarpatta, Hadapsar, Pune, Maharashtra 411028
          </Text>
          <Text style={styles.payslipTitle}>Pay Slip for the month of {monthYear}</Text>
        </View>

        {/* Employee and Bank Details */}
        <View style={styles.detailsContainer}>
          {/* Left Side - Employee Details */}
          <View style={styles.leftDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Emp. Code</Text>
              <Text style={styles.detailValue}>{employee?.employee_code || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{employee?.first_name} {employee?.last_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Designation</Text>
              <Text style={styles.detailValue}>{employee?.designation || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>{employee?.department || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Grade</Text>
              <Text style={styles.detailValue}>{employee?.grade || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>DOJ</Text>
              <Text style={styles.detailValue}>
                {(() => {
                  const joiningDate = employee?.joining_date || employee?.joiningDate || employee?.date_of_joining;
                  if (!joiningDate) return '-';
                  try {
                    const date = new Date(joiningDate);
                    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
                  } catch (e) {
                    return '-';
                  }
                })()}
              </Text>
            </View>
          </View>

          {/* Right Side - Bank Details */}
          <View style={styles.rightDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{employee?.site_name || 'PUNE'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank</Text>
              <Text style={styles.detailValue}>{employee?.bank_name || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank A/c No.</Text>
              <Text style={styles.detailValue}>{employee?.account_number || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>IFSC Code</Text>
              <Text style={styles.detailValue}>{employee?.ifsc_code || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PAN</Text>
              <Text style={styles.detailValue}>{employee?.pan_no || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PF No.</Text>
              <Text style={styles.detailValue}>{employee?.pf_no || employee?.uan_no || '-'}</Text>
            </View>
            <View style={styles.payableDaysRow}>
              <Text style={styles.payableDaysLabel}>Payable Days:</Text>
              <Text>{payslip.daysPresent || 0}</Text>
            </View>
          </View>
        </View>

        {/* Main Earnings and Deductions Table */}
        <View style={styles.mainTable}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.earningsHeader}>Earnings</Text>
            <Text style={styles.deductionsHeader}>Deductions</Text>
          </View>

          {/* Content Row */}
          <View style={styles.contentRow}>
            {/* Earnings Section */}
            <View style={styles.earningsSection}>
              {/* Earnings Sub-header */}
              <View style={styles.earningsSubHeader}>
                <Text style={styles.earningsDescCol}>Description</Text>
                <Text style={styles.earningsRateCol}>Rate</Text>
                <Text style={styles.earningsMonthlyCol}>Monthly</Text>
                <Text style={styles.earningsArrearCol}>Arrear</Text>
                <Text style={styles.earningsTotalCol}>Total</Text>
              </View>

              {/* Earnings Data Rows */}
              <View style={styles.earningsDataRow}>
                <Text style={styles.earningsDataDesc}>BASIC SAL</Text>
                <Text style={styles.earningsDataRate}>{formatCurrency(basicSalary)}</Text>
                <Text style={styles.earningsDataMonthly}>{formatCurrency(basicSalary)}</Text>
                <Text style={styles.earningsDataArrear}></Text>
                <Text style={styles.earningsDataTotal}>{formatCurrency(basicSalary)}</Text>
              </View>

              <View style={styles.earningsDataRow}>
                <Text style={styles.earningsDataDesc}>HRA</Text>
                <Text style={styles.earningsDataRate}>{formatCurrency(hra)}</Text>
                <Text style={styles.earningsDataMonthly}>{formatCurrency(hra)}</Text>
                <Text style={styles.earningsDataArrear}></Text>
                <Text style={styles.earningsDataTotal}>{formatCurrency(hra)}</Text>
              </View>

              <View style={styles.earningsDataRow}>
                <Text style={styles.earningsDataDesc}>ALLOWANCE</Text>
                <Text style={styles.earningsDataRate}>{formatCurrency(allowance)}</Text>
                <Text style={styles.earningsDataMonthly}>{formatCurrency(allowance)}</Text>
                <Text style={styles.earningsDataArrear}></Text>
                <Text style={styles.earningsDataTotal}>{formatCurrency(allowance)}</Text>
              </View>

              <View style={styles.earningsDataRow}>
                <Text style={styles.earningsDataDesc}>OTHER ALLOW</Text>
                <Text style={styles.earningsDataRate}>{formatCurrency(otherAllowance)}</Text>
                <Text style={styles.earningsDataMonthly}>{formatCurrency(otherAllowance)}</Text>
                <Text style={styles.earningsDataArrear}></Text>
                <Text style={styles.earningsDataTotal}>{formatCurrency(otherAllowance)}</Text>
              </View>
            </View>

            {/* Deductions Section */}
            <View style={styles.deductionsSection}>
              {/* Deductions Sub-header */}
              <View style={styles.deductionsSubHeader}>
                <Text style={styles.deductionsDescCol}>Description</Text>
                <Text style={styles.deductionsAmountCol}>Amount</Text>
              </View>

              {/* Deductions Data Rows */}
              <View style={styles.deductionsDataRow}>
                <Text style={styles.deductionsDataDesc}>PROV. FUND</Text>
                <Text style={styles.deductionsDataAmount}>{formatCurrency(payslip.pfDeduction)}</Text>
              </View>

              <View style={styles.deductionsDataRow}>
                <Text style={styles.deductionsDataDesc}>PROF TAX</Text>
                <Text style={styles.deductionsDataAmount}>{formatCurrency(payslip.professionalTax)}</Text>
              </View>

              <View style={styles.deductionsDataRow}>
                <Text style={styles.deductionsDataDesc}>MEDICLAIM</Text>
                <Text style={styles.deductionsDataAmount}>{formatCurrency(payslip.healthInsurance)}</Text>
              </View>

              <View style={styles.deductionsDataRow}>
                <Text style={styles.deductionsDataDesc}>SALARY ADVANCE</Text>
                <Text style={styles.deductionsDataAmount}>{formatCurrency(payslip.advanceDeduction)}</Text>
              </View>

              <View style={styles.deductionsDataRow}>
                <Text style={styles.deductionsDataDesc}>WELFARE FUND</Text>
                <Text style={styles.deductionsDataAmount}>{formatCurrency(payslip.welfareDeduction)}</Text>
              </View>
            </View>
          </View>

          {/* Footer - Gross Pay and Gross Deduction */}
          <View style={styles.footerRow}>
            <View style={styles.grossPaySection}>
              <View style={styles.grossPayRow}>
                <Text>GROSS PAY</Text>
                <Text>{formatCurrency(grossPay)}</Text>
              </View>
            </View>
            <View style={styles.grossDeductionSection}>
              <View style={styles.grossDeductionRow}>
                <Text>GROSS DEDUCTION</Text>
                <Text>{formatCurrency(totalDeductions)}</Text>
              </View>
            </View>
          </View>

          {/* Net Pay Row */}
          <View style={styles.netPayRow}>
            <Text style={styles.netPayLabel}>NET PAY</Text>
            <Text style={styles.netPayAmount}>{formatCurrency(netPay)}</Text>
          </View>

          {/* Amount in Words Row - Attached to Net Pay */}
          <View style={styles.amountInWordsRow}>
            <Text style={styles.amountInWordsContent}>
              <Text style={styles.amountLabel}>Amount in words: </Text>
              {numberToWords(netPay)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This is a computer-generated pay slip and no signature is required.
        </Text>
      </Page>
    </Document>
  );
};

export default PayslipPDFTemplateNew;
