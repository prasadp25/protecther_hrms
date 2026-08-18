# Resignation Approval Workflow — Specification

Status: **DRAFT for review** · Owner: Engineering · Last updated: 2026-08-18

Defines a request → approval → relieve workflow for **resignations**, replacing
today's instant status flip. Grounded in the existing status model and the
employee portal. Read §2 (current state) and §3 (the notice-period decision)
first — §3 is the one that changes system behavior.

---

## 1. Purpose & scope

Today an employee becomes RESIGNED the instant an admin picks it from a dropdown
— no request, no approval, no notice period, no record of *why* or *who approved*.
This spec adds a governed flow:

1. A **resignation request** is raised (by the employee via the portal, or by HR
   on their behalf) with an intended last working day (LWD) and reason.
2. HR/Admin **approve or reject** it. Approval agrees the LWD.
3. The employee **keeps working through the notice period** and is **relieved**
   (status → RESIGNED) on/after the LWD.

**In scope:** employee-initiated resignations and their approval + relieving.
**Out of scope:** termination (employer-initiated — stays a direct admin action,
see §11); multi-level approval chains; automated payroll during notice (unchanged).

---

## 2. Current state (what a "resignation" is today)

Three code paths flip status directly, with no approval:
- **`EmployeeList.handleStatusChange`** (`EmployeeList.jsx`) — a per-row dropdown
  (ACTIVE / ON_LEAVE / RESIGNED / TERMINATED) → `updateEmployee({status})`.
- **`EmployeeList.handleDelete` → `deleteEmployee`** (`employeeController.js:630`)
  — the "mark as resigned" action; sets `status='RESIGNED'`, `date_of_leaving=NOW()`,
  and deactivates the salary row.
- **`EmployeeForm`** — the status field on the edit form.

Downstream, `status='ACTIVE'` is a **whitelist** everywhere that matters
(payroll `payslipController.js:320`, portal login, active lists). So the moment
status leaves ACTIVE the employee drops out of payroll and loses portal access.
**This is why the notice-period decision in §3 matters.**

The employee portal (`components/employeePortal/*`, OTP auth via
`authenticateEmployee`) is currently **read-only** — profile, payslips, notices.
A resignation submission would be its **first write action**.

---

## 3. Core decision — status during notice period (needs sign-off)

> An employee serving notice is **still employed**. They must keep drawing salary
> and keep portal access until their last working day.

Because ACTIVE is the payroll/portal whitelist, the workflow must **NOT** flip the
employee out of ACTIVE at approval time. Instead:

- On **approval**, the employee stays `ACTIVE`; the pending resignation is tracked
  on a new `resignation_requests` record (not on `employees.status`).
- On/after the **LWD**, a **Relieve** step flips `status='RESIGNED'` and
  `date_of_leaving = LWD` (reusing today's `deleteEmployee` effects: salary
  deactivation, advance-outstanding flag).

**How the flip is triggered on the LWD** — pick one (recommend A for MVP):
- **A. Manual "Relieve now" action** (recommended): HR clicks Relieve on/after the
  LWD. Simple, explicit, no scheduler; HR controls the exact moment. A dashboard
  list of "due to be relieved" surfaces them.
- **B. Scheduled job**: a nightly task auto-relieves employees whose approved LWD
  has passed. Less manual, but adds ops surface and a background process to trust.
- **C. Lazy**: compute "effectively relieved" on read. Rejected — leaves
  `employees.status` inconsistent with reality; every consumer would need the rule.

MVP = **A**, with the "due to be relieved" list. B can be added later as a
convenience on top of the same Relieve endpoint.

> ❗ Sign-off needed: confirm "approved resignation keeps the employee ACTIVE and
> on payroll until the LWD, then a manual Relieve flips them to RESIGNED."

---

## 4. Roles

| Actor | Can |
|---|---|
| **Employee** (portal) | Submit own resignation, view its status, withdraw while PENDING |
| **HR** | Submit on behalf, view all, approve/reject, edit agreed LWD, relieve |
| **ADMIN** / SUPER_ADMIN | Everything HR can, plus cancel/override |
| **MANAGER** | Read-only today; optional future "acknowledge/recommend" step (not MVP) |

Portal submissions authenticate via the existing `authenticateEmployee` (OTP);
admin actions via the normal JWT + `authorize('ADMIN','HR')`.

---

## 5. State machine

```
[Employee/HR submits]
        │
        ▼
     PENDING ──withdraw (employee)──▶ WITHDRAWN
        │  \
        │   └─reject (HR/Admin)────▶ REJECTED   (employee stays ACTIVE, no change)
        │
     approve (HR/Admin)
        │
        ▼
     APPROVED  ── employee keeps working (ACTIVE), notice period runs
        │
     relieve (HR/Admin, on/after LWD)
        │
        ▼
     RELIEVED  → employees.status = RESIGNED, date_of_leaving = LWD
        │
   (unlocks F&F settlement, clearance, exit documents)
```

- One **live** request (PENDING/APPROVED) per employee at a time.
- REJECTED/WITHDRAWN are terminal and leave the employee untouched.
- A cancel (Admin) from PENDING/APPROVED → CANCELLED, employee untouched.

---

## 6. Data model

```sql
-- Migration 020
CREATE TABLE resignation_requests (
  request_id       INT AUTO_INCREMENT PRIMARY KEY,
  employee_id      INT NOT NULL,
  company_id       INT NOT NULL,
  submitted_by     ENUM('EMPLOYEE','HR') NOT NULL,
  reason           TEXT,
  requested_lwd    DATE NOT NULL,      -- employee's intended last working day
  approved_lwd     DATE,               -- agreed LWD (may differ) — set on approval
  notice_days      INT,                -- policy notice period (snapshot)
  status           ENUM('PENDING','APPROVED','REJECTED','WITHDRAWN','CANCELLED','RELIEVED')
                     DEFAULT 'PENDING',
  decision_by      INT,                -- user who approved/rejected
  decision_at      TIMESTAMP NULL,
  decision_note    TEXT,
  relieved_by      INT,
  relieved_at      TIMESTAMP NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_resig_employee (employee_id),
  INDEX idx_resig_status (status),
  INDEX idx_resig_company (company_id)
);
```

No change to `employees` — the request lives alongside it; `employees.status`
only changes at the Relieve step. `notice_days` is snapshotted so later policy
changes don't rewrite history; the **notice shortfall** (approved_lwd −
submit_date vs notice_days) feeds the F&F notice-recovery line.

---

## 7. API

**Admin** (`/api/v1/resignations`, `authorize('ADMIN','HR')`):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/employees/:id` | HR raises a request on behalf |
| `GET` | `/` | List (filter status/company); includes a "due to relieve" view |
| `GET` | `/:id` | One request |
| `POST` | `/:id/approve` | PENDING → APPROVED (body: approved_lwd, note) |
| `POST` | `/:id/reject` | PENDING → REJECTED (body: note) |
| `POST` | `/:id/relieve` | APPROVED → RELIEVED; flips employee to RESIGNED @ LWD |
| `POST` | `/:id/cancel` | Admin cancel |

**Employee portal** (`/api/v1/employee-portal`, `authenticateEmployee`):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/resignation` | Submit own resignation (reason, requested_lwd) |
| `GET` | `/resignation` | View own current/last request + status |
| `POST` | `/resignation/withdraw` | Withdraw while PENDING |

The Relieve handler reuses the existing `deleteEmployee` effects (RESIGNED +
date_of_leaving + salary deactivation + outstanding-advance flag) inside one
transaction, so relieving and today's "mark resigned" converge on one code path.

---

## 8. Frontend

**Admin** — a new **Resignations** area (sidebar or under Employees):
- Queue of PENDING requests → approve (set agreed LWD + note) / reject.
- APPROVED list with notice-period countdown and a **Relieve** action once LWD ≤ today.
- Links out to F&F / clearance / exit documents for a relieved employee.
- The per-row status **dropdown's RESIGNED option is removed/guarded** (see §10).

**Employee portal** — a **Resign** action (e.g., on MyProfile):
- Form: reason + intended last working day (min = today + notice_days).
- After submit: a read-only status card (Pending / Approved with agreed LWD /
  Rejected), and a Withdraw button while Pending.

Reuse existing conventions (toasts, service layer, portal layout).

---

## 9. Notice period & ties to the rest of exit

- **notice_days** comes from company policy (new setting; default e.g. 30) —
  snapshotted onto the request.
- Portal enforces `requested_lwd ≥ today + notice_days`; HR can override the
  agreed LWD at approval (early release / extension).
- **Shortfall** (agreed LWD earlier than policy) → surfaced so HR can add the
  matching **notice-period recovery** line in the F&F settlement (Phase 2 already
  supports that line; this just feeds the number).
- Relieving an employee is the natural trigger to **start their clearance** and
  enables **F&F** and **exit documents** — the screens already gate on
  RESIGNED/TERMINATED.

---

## 10. Coexistence with today's direct flip

To avoid two competing ways to resign someone:
- Remove **RESIGNED** from the `EmployeeList` status dropdown and the EmployeeForm
  status options; resignation now only happens through the workflow.
- Keep the dropdown for **ON_LEAVE** and (admin) **TERMINATED** (termination stays
  direct — §11).
- The old "mark as resigned" delete button becomes **"Start resignation"** (opens
  the request) for ACTIVE employees, or is removed in favour of the portal/HR flow.
- SUPER_ADMIN retains a direct override for data fixes (documented, audited).

Migration note: existing RESIGNED employees have no request record — that's fine;
the workflow is forward-looking. No backfill required.

---

## 11. Termination (deliberately separate)

Termination is employer-initiated and often immediate — it does **not** fit a
"request/approve/notice" model. It stays a direct admin action (current dropdown /
a dedicated "Terminate" action with reason + effective date), optionally with a
single Admin confirmation. A future spec can add a termination-approval flow if
the client wants one.

---

## 12. Edge cases

- **Withdraw/reject** → employee stays exactly as-is (ACTIVE), request terminal.
- **LWD in the past at submission** → rejected by validation (portal) / warned (HR).
- **Employee already RESIGNED/TERMINATED** → cannot submit a request.
- **Approved but not yet relieved on LWD** → appears in "due to relieve"; payroll
  continues until relieved (correct — they were still employed until LWD).
- **Salary/payroll during notice** → unchanged; they are ACTIVE, so payslips
  generate normally for the notice months.
- **Company scoping / multi-company** → all endpoints company-scoped; SUPER_ADMIN
  cross-company via header.
- **Portal auth** → resignation write actions require a valid OTP session; rate-limited.

---

## 13. Phasing

- **Phase 1 (MVP)**: table + HR-side flow (raise on behalf, approve/reject,
  Relieve with the RESIGNED flip), the "due to relieve" list, and removal of the
  direct RESIGNED dropdown option. Notice period as a plain field.
- **Phase 2**: employee-portal self-service submission + withdraw, notice-period
  policy setting + shortfall auto-feed into F&F, optional scheduled auto-relieve.
- **Phase 3**: MANAGER acknowledge/recommend step; email/notice notifications on
  submit/approve/relieve.

---

## 14. Open decisions (need answers before Phase 1)

1. **Confirm §3** — approved resignation keeps the employee ACTIVE + on payroll
   until the LWD, then a manual Relieve flips to RESIGNED. (Blocking.)
2. **Who approves** — HR + ADMIN, or ADMIN only? (Assumed HR + ADMIN.)
3. **Portal self-service in Phase 1, or HR-only first?** (Assumed HR-only MVP,
   portal in Phase 2 — it's the portal's first write path, so more care.)
4. **Notice period** — is there a standard policy value (e.g. 30 days), and is it
   per-company? (Needed for portal validation and shortfall.)
5. **Direct flip** — OK to remove the RESIGNED dropdown option once the workflow
   ships (keeping a SUPER_ADMIN override), or must the old path stay?
