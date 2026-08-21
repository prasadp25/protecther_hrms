# Leave Application — Specification (Simple, Unpaid)

Status: **DRAFT for review** · Owner: Engineering · Last updated: 2026-08-21

A lightweight leave-application flow: an employee applies for leave from the
portal, HR approves or rejects, and approved leave is **unpaid** — it reduces
that month's paid days. Deliberately simple: **no leave balances or quotas**
(the client does not track leave today). Grounded in the existing attendance
and payroll model.

---

## 1. Purpose & scope

Employees currently have no way to request leave; there is no leave record at
all. This adds:
1. **Self-service leave requests** from the employee portal (dates + type + reason).
2. An **HR approval** queue (approve / reject).
3. **Unpaid** handling — approved leave days reduce the employee's paid days for
   that month, through the attendance the payroll already uses.

**In scope:** applying for leave, approving/rejecting, and feeding approved
unpaid days into monthly attendance/payroll.
**Out of scope (deliberately):** leave *balances* / annual quotas, paid vs unpaid
mix, carry-forward, half-days, per-day attendance, a holiday calendar. All leave
is **unpaid** in this version (client decision). These are noted as future work.

---

## 2. Current state it plugs into

- **Employee portal** (`components/employeePortal/*`) is OTP-authenticated
  (`authenticateEmployee`) and read-only. Leave submission is a **write** action,
  so it follows the same care as any portal write.
- **Attendance** (`attendance` table) is a **monthly summary per employee**:
  `days_present` out of `total_days_in_month`, with a DRAFT → FINALIZED status.
  HR enters it on the Attendance screen and finalizes it.
- **Payroll** reads the FINALIZED attendance and prorates:
  `net ∝ days_present ÷ total_days_in_month` (`payslipController.js:251`,
  `payslipCalculator.js`). **No leave module exists.**

---

## 3. How "unpaid" works (the core mechanic)

Because pay is already `days_present ÷ total_days`, unpaid leave = **days not
present**. So approved unpaid leave must **lower `days_present`** for that month.

The flow, keeping HR in control (they finalize attendance):

1. Employee applies for leave dates → HR approves → the days are recorded as
   **approved unpaid leave**.
2. On the **monthly Attendance screen**, each employee shows their **approved
   unpaid-leave days for that month** (e.g. "3 unpaid leave days"). HR sets
   `days_present` accordingly — a one-click **"apply to days present"** subtracts
   them so HR doesn't do the math.
3. Payroll runs off that finalized `days_present` and the pay is reduced
   automatically. **No change to the payslip formula.**

> This deliberately does *not* auto-write attendance behind HR's back. HR still
> reviews and finalizes the month; the leave data just feeds the number.
> A fully automatic attendance mark is future work (§12).

---

## 4. Roles

| Actor | Can |
|---|---|
| **Employee** (portal) | Apply for leave, view own requests, withdraw while PENDING |
| **HR** | See all requests, approve/reject (adjusting the day count if needed) |
| **ADMIN** / SUPER_ADMIN | Everything HR can |
| **MANAGER** | Read-only today; manager-approval is a possible future step (§13) |

Portal submissions use `authenticateEmployee` (OTP); HR actions use the normal
JWT + `authorize('ADMIN','HR')`.

---

## 5. State machine

```
[Employee applies]              [HR raises on behalf — optional]
        │                                  │
        ▼                                  ▼
     PENDING ──withdraw (employee)──▶ WITHDRAWN
        │  \
        │   └─ reject (HR) ─────────▶ REJECTED
        │
     approve (HR)
        │
        ▼
     APPROVED  → counts as unpaid days for its month(s); shown on Attendance
        │
     cancel (HR/Admin) ───────────▶ CANCELLED
```

- Overlap guard: reject/flag a new request whose dates overlap an existing
  PENDING/APPROVED leave for the same employee.
- Editing after approval: to change an approved leave, cancel and re-raise
  (keeps the record clean, and the Attendance figure recomputes).

---

## 6. Data model

```sql
-- Migration 022
CREATE TABLE leave_requests (
  leave_id     INT AUTO_INCREMENT PRIMARY KEY,
  employee_id  INT NOT NULL,
  company_id   INT NOT NULL,
  leave_type   ENUM('CASUAL','SICK','PERSONAL','OTHER') DEFAULT 'CASUAL', -- label only; all unpaid
  from_date    DATE NOT NULL,
  to_date      DATE NOT NULL,
  days         INT NOT NULL,          -- unpaid days; defaults to inclusive from..to, HR can adjust
  reason       TEXT,
  status       ENUM('PENDING','APPROVED','REJECTED','CANCELLED','WITHDRAWN') DEFAULT 'PENDING',
  submitted_by ENUM('EMPLOYEE','HR') NOT NULL DEFAULT 'EMPLOYEE',
  decision_by  INT,
  decision_at  TIMESTAMP NULL,
  decision_note TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_leave_employee (employee_id),
  INDEX idx_leave_status (status),
  INDEX idx_leave_dates (from_date, to_date),
  INDEX idx_leave_company (company_id)
);
```

- `days` is stored (not derived on the fly) so HR can adjust for weekends/
  holidays that fall inside the range at approval time. Defaults to the inclusive
  `from_date..to_date` day count on submission.
- `leave_type` is a **label for the record only** — every type is unpaid in this
  version. Kept so a paid/unpaid distinction can be added later without a data
  migration.

---

## 7. API

**Employee portal** (`/api/v1/employee-portal`, `authenticateEmployee`):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/leaves` | Apply (type, from_date, to_date, reason) → PENDING |
| `GET` | `/leaves` | List own requests + statuses |
| `POST` | `/leaves/:id/withdraw` | Withdraw own PENDING request |

**Admin** (`/api/v1/leaves`, `authorize('ADMIN','HR')`):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List (filter status / month / employee) |
| `POST` | `/employees/:id` | HR raises on behalf (optional) |
| `POST` | `/:id/approve` | PENDING → APPROVED (may adjust `days`, note) |
| `POST` | `/:id/reject` | PENDING → REJECTED (note) |
| `POST` | `/:id/cancel` | Cancel a PENDING/APPROVED request |
| `GET` | `/month/:month/summary` | Per-employee approved unpaid-leave days for a month (drives the Attendance screen) |

All company-scoped; SUPER_ADMIN cross-company via header.

---

## 8. Frontend

**Employee portal** — a **Leave** nav item + page:
- Apply form: type, from date, to date, reason. Shows the computed day count.
- A list of the employee's requests with status (Pending / Approved / Rejected),
  and a Withdraw button while Pending.
- A clear note: **"Leave is unpaid — approved days reduce that month's salary."**

**Admin** — a **Leave** queue (like Resignations):
- Filter by status / month; approve (with an adjustable day count) / reject / cancel.
- On the **Attendance screen**, per employee: show "N approved unpaid leave days
  this month" with a one-click **"− apply to days present"**.

Reuse existing conventions (service layer, toasts, portal layout, the resignation
queue as a template).

---

## 9. Edge cases

- **Leave spanning two months** → the month summary counts only the days that
  fall within each month, so each month's attendance is reduced correctly.
- **Overlapping requests** → blocked at submission (one leave per date range).
- **Past dates** → allowed (HR may record leave already taken), but flagged.
- **Employee already relieved / not ACTIVE** → cannot apply (portal only
  authenticates ACTIVE employees).
- **Attendance already FINALIZED for the month** → the summary still shows the
  approved days; HR re-opens/adjusts attendance if a late approval lands.
- **Multi-company** → scoped throughout.

---

## 10. Phasing

- **Phase 1 (MVP)**: table + portal apply/view/withdraw + HR approve/reject/cancel
  queue + the month summary + the Attendance-screen "apply to days present". All
  unpaid. This is the whole of this spec.
- **Phase 2 (later, only if wanted)**: paid vs unpaid leave types + leave
  **balances/quotas** per employee; half-day leave; automatic attendance marking;
  manager approval; email notifications.

---

## 11. Open decisions (need answers before building)

1. **Who approves** — HR only, or the reporting manager too? (Assumed **HR** for
   the MVP; manager approval is Phase 2.)
2. **Leave types** — keep the simple label list (Casual / Sick / Personal /
   Other), or just a single "Leave" with a reason? (Assumed the short list.)
3. **Attendance integration** — the recommended "show on the Attendance screen +
   one-click apply to days present" (HR stays in control), or should approval
   **automatically** reduce days present with no HR step? (Assumed HR-in-control.)
4. **Employee self-service** — confirmed **yes** for leave (unlike resignation,
   which you kept HR-only). Just re-confirming, since it's a portal write action.
