# HRMS Salary System Specification

## Overview
This document outlines the salary calculation system for the HRMS application.

## Salary Structure

### 1. Fixed Salary (Reference)
The fixed salary serves as a reference point for the employee's standard monthly compensation.

**Components:**
- **Basic Salary** - Base pay
- **HRA** - House Rent Allowance
- **Incentive / Other Allowance** - Additional allowances
- **Gross Payable** = Basic + HRA + Incentive

### 2. Deductions

**Fixed Deductions (constant regardless of attendance):**
- **PF (Provident Fund)**
  - IF Basic >= ₹15,000 → PF = ₹1,800 (fixed)
  - IF Basic < ₹15,000 → PF = Basic × 12%

- **ESI (Employee State Insurance)**
  - IF Gross < ₹21,000 → ESI = Gross × 0.75%
  - IF Gross >= ₹21,000 → ESI = 0

- **Professional Tax (PT)** - Usually ₹200 (fixed)
- **Mediclaim** - Fixed amount per employee
- **Advance Deduction** - Manually entered per month
- **Other Deductions** - Any other deductions

**Total Deductions** = PF + ESI + PT + Mediclaim + Advance + Other

**Net Salary (Fixed)** = Gross Payable - Total Deductions

---

## Attendance-Based Salary Calculation

### Working Days Structure
- **Total Calendar Days**: 30 or 31 (depending on month)
- **Working Days**: 26 days per month
- **Weekly Offs**: 4-5 days (Sundays/designated offs)

### Days Present Counting
- **Days Present** = Total calendar days if employee is present all working days
- Example: If employee is present all 26 working days in January → Days Present = 31
- **Absent Days** = Days absent from working days (not including weekly offs)
- **Loss of Pay** = Deduction for absent days

### Actual Salary Formula

```
Net Payable (Actual) = ((Gross Payable - Deductions) / Total Days in Month) × Days Present
```

**Where:**
- Gross Payable = Fixed Gross (Basic + HRA + Incentive)
- Deductions = Fixed Deductions (PF + ESI + PT + Mediclaim + Advance + Other)
- Total Days in Month = Calendar days (30/31)
- Days Present = Actual attendance days

### Example Calculation

**Employee Details:**
- Net Payable (Full Month) = ₹45,000
- Deductions:
  - PF = ₹1,800
  - PT = ₹200
  - Mediclaim = ₹370
  - Total Deductions = ₹2,370

**Gross Payable Calculation:**
```
Gross Payable = Net Payable + Deductions
Gross Payable = ₹45,000 + ₹2,370 = ₹47,370
```

**Full Month (31 days present in January):**
```
Net Payable = ((₹47,370 - ₹2,370) / 31) × 31
Net Payable = (₹45,000 / 31) × 31
Net Payable = ₹45,000
```

**Partial Month (28 days present in January):**
```
Net Payable = ((₹47,370 - ₹2,370) / 31) × 28
Net Payable = (₹45,000 / 31) × 28
Net Payable = ₹40,645.16
```

---

## Payslip Layout

The payslip should display **both Fixed and Actual salary side-by-side**:

| Component | Fixed Salary | Actual Salary (Attendance-Based) |
|-----------|--------------|----------------------------------|
| Basic     | ₹20,000      | ₹18,064 (28/31 days)            |
| HRA       | ₹10,000      | ₹9,032                          |
| Incentive | ₹17,370      | ₹15,693                         |
| **Gross** | **₹47,370**  | **₹42,789**                     |
| PF        | -₹1,800      | -₹1,800                         |
| PT        | -₹200        | -₹200                           |
| Mediclaim | -₹370        | -₹370                           |
| **Deductions** | **₹2,370** | **₹2,370**                    |
| **Net Pay** | **₹45,000** | **₹40,419**                    |

---

## Payslip Columns (Excel Export)

1. EMP CODE
2. EMP NAME
3. Father's Name
4. Designation
5. Location
6. DOJ (Date of Joining)
7. Month Days (Total calendar days)
8. No of days Present
9. **Fixed Salary Section:**
   - BASIC
   - HRA
   - Incentive / Other Allowance
   - GROSS PAYABLE
10. **Actual Salary Section:**
    - BASIC
    - HRA
    - Incentive/Other Allowance
    - GROSS PAYABLE
11. **Deductions:**
    - PF Deposit
    - ESIC
    - Professional Tax (PT)
    - Mediclaim
    - Advance
12. **Summary:**
    - DEDUCTIONS (Total)
    - NET PAYABLE
13. REMARK
14. IFSC CODE
15. Account Number

---

## Implementation Notes

### Database Schema Updates
- Added `mediclaim_deduction` column to salaries
- Added `advance_deduction` column to salaries
- Renamed `other_allowances` to `incentive_allowance`
- Added `total_days_in_month` to payslips

### Automatic Calculations
1. **PF** - Auto-calculated based on Basic Salary
2. **ESI** - Auto-calculated based on Gross Salary
3. **Net Payable** - Calculated using attendance-based formula

### Manual Inputs Required
- Basic Salary
- HRA
- Incentive/Other Allowance
- Professional Tax
- Mediclaim
- Advance Deduction (per payslip)
- Days Present (per payslip)
- Other Deductions
- Remarks

---

## Status
✅ Salary Form Updated
✅ PF Auto-calculation (≥₹15000: ₹1800, <₹15000: 12%)
✅ ESI Auto-calculation (Gross < ₹21000: 0.75%)
🔄 Payslip Generation (In Progress)
🔄 PayslipView Component (Pending)

---

Last Updated: 2025-11-04
