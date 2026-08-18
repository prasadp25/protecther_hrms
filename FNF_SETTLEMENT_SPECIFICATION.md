# Full & Final (F&F) Settlement — Specification

Status: **DRAFT for review** · Owner: Engineering · Last updated: 2026-08-18

This spec defines the Full & Final settlement flow for ProtectHer HRMS. It is
grounded in the system's **existing** data model and payroll math (see
`SALARY_SYSTEM_SPECIFICATION.md`). Read the "Key policy decision" section first —
it changes what the settlement pays out.

---

## 1. Purpose & scope

When an employee **resigns** or is **terminated**, HR needs to compute and record
a single closing amount — the Full & Final settlement — and issue a statement.
Today the system only flips `employees.status` to `RESIGNED`/`TERMINATED` and
stamps `date_of_leaving`; it surfaces outstanding advances as a *warning* but
computes **nothing**. This spec adds:

1. A settlement **calculation** (final-month salary + dues − recoveries).
2. A stored settlement **record** with an approval lifecycle.
3. An F&F **statement PDF**.

Out of scope (later phases): resignation approval workflow, no-dues/clearance
checklist, relieving & experience letters, notice-period *serve/waive* tracking.

---

## 2. Key policy decision (must be signed off before building)

> **Gratuity and statutory bonus are already paid every month in this client's
> CTC model** — `payslipCalculator.js` carves 4.81% gratuity and 8.33% bonus out
> of the monthly allowance and includes them in each payslip's gross. They are
> **inside** the monthly CTC, not held back for exit.

Therefore, **by default the F&F must NOT add a lump-sum gratuity or bonus payout**,
or the employee is paid twice for the same component. The statutory figures are
still shown on the statement as **reference / compliance provision**, not as a
payable line.

The settlement screen will expose an explicit, per-employee override:

| Component | Default in F&F payable | Override available |
|---|---|---|
| Statutory gratuity `(last basic × 15/26) × completed years` | **Excluded** (already paid monthly) | HR may add it if this employee was NOT on the monthly-folded model |
| Statutory bonus (Payment of Bonus Act) | **Excluded** (already paid monthly) | HR may add a pending-bonus amount |

**Reference figures** (always shown, never auto-added): reuse
`complianceController.getGratuityLiability` — it already computes `accrued_gratuity`
(Σ monthly gratuity provisioned) and the statutory `(basic × 15/26) × years`
estimate. Display both so HR/finance can reconcile.

> ❗ Client sign-off needed: confirm "gratuity/bonus paid monthly ⇒ no exit lump
> sum" as the default. If any cohort is on a classic (held-back) gratuity model,
> we flag those employees for the override.

---

## 3. Settlement components

### 3.1 Earnings (additions)

| Line | Source | Auto / manual |
|---|---|---|
| **Final-month salary (prorated)** | Existing payslip math: `((Gross − Deductions) / total_working_days) × days_present`, for the month containing `date_of_leaving`, counting days up to and including the last working day | **Auto** (reuse payslip generation) |
| **Leave encashment** | No leave-balance module exists (`paid_leaves`/`unpaid_leaves` are per-payslip only). HR enters encashable days + per-day rate | **Manual** |
| **Pending reimbursements / arrears** | Not tracked in DB | **Manual** |
| **Gratuity lump sum** | Excluded by default (see §2); override adds `(last basic × 15/26) × completed years` | **Manual override** |
| **Bonus lump sum** | Excluded by default (see §2); override adds pending statutory bonus | **Manual override** |

### 3.2 Recoveries (deductions)

| Line | Source | Auto / manual |
|---|---|---|
| **Outstanding salary advances** | Reuse existing query (`employeeController.js:674`): `amount − Σ recoveries` for `salary_advances.status='ACTIVE'` | **Auto** |
| **Notice-period shortfall recovery** | Notice period not tracked yet; HR enters an amount if pay-in-lieu is owed | **Manual** |
| **Statutory deductions on final month** | PF / ESI / PT applied to the final (partial) month exactly as a normal payslip | **Auto** (inside 3.1 final salary) |
| **Other deductions** (asset non-return, loans) | Not tracked | **Manual** |

### 3.3 Net F&F payable

```
Net F&F = Σ earnings (3.1) − Σ recoveries (3.2)
```

Can be **negative** (employee owes the company) — the statement must show a
"Recoverable from employee" state, not clamp to zero.

---

## 4. Data model

Two new tables. Header + typed line items so we can render any statement and add
components later without schema churn.

```sql
-- Migration 018
CREATE TABLE fnf_settlements (
  fnf_id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id       INT NOT NULL,
  company_id        INT NOT NULL,
  separation_type   ENUM('RESIGNED','TERMINATED') NOT NULL,
  last_working_day  DATE NOT NULL,           -- may differ from date_of_leaving
  settlement_month  VARCHAR(7) NOT NULL,     -- YYYY-MM of final salary
  -- snapshots for the statement (so later salary edits don't rewrite history)
  last_basic        DECIMAL(10,2) DEFAULT 0,
  completed_years   DECIMAL(5,2)  DEFAULT 0,
  total_earnings    DECIMAL(12,2) DEFAULT 0,
  total_recoveries  DECIMAL(12,2) DEFAULT 0,
  net_payable       DECIMAL(12,2) DEFAULT 0, -- signed; negative = recoverable
  -- reference-only figures (never part of net_payable)
  ref_accrued_gratuity   DECIMAL(12,2) DEFAULT 0,
  ref_statutory_gratuity DECIMAL(12,2) DEFAULT 0,
  status            ENUM('DRAFT','APPROVED','PAID','CANCELLED') DEFAULT 'DRAFT',
  remarks           TEXT,
  created_by        INT,
  approved_by       INT,
  approved_at       TIMESTAMP NULL,
  paid_at           TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
  UNIQUE KEY uq_active_fnf (employee_id),    -- one live settlement per employee
  INDEX idx_status (status),
  INDEX idx_company (company_id)
);

CREATE TABLE fnf_line_items (
  item_id     INT AUTO_INCREMENT PRIMARY KEY,
  fnf_id      INT NOT NULL,
  kind        ENUM('EARNING','RECOVERY') NOT NULL,
  code        VARCHAR(40) NOT NULL,   -- FINAL_SALARY, LEAVE_ENCASH, ADVANCE, ...
  label       VARCHAR(120) NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  is_auto     BOOLEAN DEFAULT FALSE,  -- system-computed vs HR-entered
  source_ref  VARCHAR(60),            -- e.g. advance_id, payslip_id
  FOREIGN KEY (fnf_id) REFERENCES fnf_settlements(fnf_id) ON DELETE CASCADE,
  INDEX idx_fnf (fnf_id)
);
```

Notes:
- `net_payable` is **stored signed** and re-derived from line items on every save,
  so the header always matches the items.
- We snapshot `last_basic`, `completed_years`, and both reference gratuity figures
  at creation so editing the salary structure later never mutates a settled record.
- `UNIQUE (employee_id)` keeps one live settlement; a CANCELLED one must be cleared
  before a new one (or relax to `UNIQUE(employee_id, status<>CANCELLED)` via app logic).

---

## 5. Workflow & states

```
[employee marked RESIGNED/TERMINATED]
        │
        ▼
   Create F&F  ──▶  DRAFT  ──edit lines──▶  DRAFT
                     │
                (ADMIN approves)
                     ▼
                 APPROVED  ──mark paid──▶  PAID
                     │
                 (either) ─────────────▶  CANCELLED
```

- **DRAFT**: auto-lines populated (final salary, advances, reference figures);
  HR adds manual lines; recalculated on save.
- **APPROVED**: locked from edits; only ADMIN/SUPER_ADMIN can approve.
- **PAID**: records `paid_at`; statement stamped "Settled".
- Guard: a settlement can only be created for an employee whose `status` is
  `RESIGNED` or `TERMINATED` and who has a `date_of_leaving`.

---

## 6. API (backend, under `/api/v1/fnf`)

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/fnf/employees/:id/draft` | HR, ADMIN | Create DRAFT; auto-populate lines + reference figures |
| `GET` | `/fnf/:fnfId` | HR, ADMIN | Fetch settlement + line items |
| `GET` | `/fnf` | HR, ADMIN | List (filter by status/company) |
| `PUT` | `/fnf/:fnfId` | HR, ADMIN | Update manual lines / LWD / remarks (DRAFT only); recalc |
| `POST` | `/fnf/:fnfId/approve` | ADMIN | DRAFT → APPROVED |
| `POST` | `/fnf/:fnfId/pay` | ADMIN | APPROVED → PAID |
| `POST` | `/fnf/:fnfId/cancel` | ADMIN | → CANCELLED |
| `GET` | `/fnf/:fnfId/statement` | HR, ADMIN | F&F statement PDF |

All company-scoped via `buildCompanyFilter`; SUPER_ADMIN may pass `company_id`.
Every state transition writes an audit-log entry (`auditLogger`).

**Draft auto-population** reuses existing code paths:
- Final-month salary → payslip calculator (partial month to LWD).
- Outstanding advances → the `employeeController.js:674` balance query.
- Reference gratuity → `getGratuityLiability` logic (extract into a shared util).

---

## 7. Frontend

- **Entry point**: on `EmployeeList`, for `RESIGNED`/`TERMINATED` rows, add an
  **"F&F Settlement"** action → opens the settlement screen.
- **Settlement screen** (`components/fnf/FnFSettlement.jsx`):
  - Header: employee, separation type, DOJ, last working day (editable in DRAFT),
    completed years.
  - **Earnings** table and **Recoveries** table — auto rows shown read-only with a
    badge; HR adds/edits manual rows inline.
  - **Reference panel** (collapsed): accrued gratuity vs statutory estimate, with
    the "already paid monthly — not added" note and the per-employee override.
  - Live **Net F&F payable** with a clear "Recoverable from employee" state when
    negative.
  - Actions by state: Save (DRAFT) · Approve (ADMIN) · Mark Paid · Cancel ·
    Download Statement.
- **Service**: `services/fnfService.js` (mirror existing service pattern).
- Follow existing conventions: toast feedback, `formatCurrency`, dynamic import for
  the PDF renderer.

---

## 8. F&F statement PDF

Reuse the existing PDF stack (jsPDF/react-pdf, ProtectHer logo). Sections:
1. Header — company + employee identity, DOJ, LWD, completed service, statement date.
2. **Earnings** table with amounts.
3. **Recoveries** table with amounts.
4. **Net F&F payable** (or recoverable) in words + figures (`numberToWords`).
5. **Statutory reference** block — accrued vs statutory gratuity, bonus note, PF/ESI
   final-month figures — clearly labelled "for reference, already settled monthly".
6. Signatures — Employee / HR / Authorised signatory. Status watermark (DRAFT/PAID).

---

## 9. Edge cases

- **< 5 years service**: statutory gratuity reference shows ₹0 / "not eligible"
  (Payment of Gratuity Act 5-year rule); monthly-paid gratuity is unaffected.
- **Negative net** (advances > dues): allowed; statement says "Recoverable".
- **No active salary structure**: block draft creation with a clear message
  (same failure mode as payslip generation).
- **Final month already has a payslip**: reuse it rather than regenerate; do not
  double-count.
- **Salary edited after settlement**: header snapshots protect settled records.
- **Termination vs resignation**: same math; `separation_type` only affects the
  statement wording and reporting.
- **Multi-company**: strictly company-scoped; SUPER_ADMIN cross-company via header.

---

## 10. Phasing

- **Phase 1 (MVP)**: tables + draft with auto final-salary & advance recovery +
  manual lines + net calc + APPROVED/PAID lifecycle + statement PDF. Gratuity/bonus
  reference-only (no lump sum). Ships the core "close the record" need.
- **Phase 2**: gratuity/bonus override, notice-period recovery input, reimbursement
  arrears, richer statement.
- **Phase 3** (separate specs): resignation approval workflow, no-dues/clearance
  checklist, relieving & experience letters.

---

## 11. Open decisions (need answers before Phase 1 build)

1. **Confirm the §2 default** — gratuity/bonus already paid monthly ⇒ no exit lump
   sum. (Blocking.)
2. **Leave encashment** — is it owed at all under this client's policy, and if so
   what per-day rate (Basic/26? Gross/30?)? Manual entry needs a documented basis.
3. **Notice period** — is pay-in-lieu recovery in scope for Phase 1, or a manual
   line for now?
4. **Who approves** — ADMIN only, or also SUPER_ADMIN? (Assumed ADMIN+.)
5. **Rounding** — round each line, or only the net? (Assumed per-line, ₹ integer,
   matching payslip convention.)
