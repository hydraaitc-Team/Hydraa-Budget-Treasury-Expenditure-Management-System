# HYDRAA - Budget, Treasury & Expenditure Management System
**Government of Telangana | Hyderabad Disaster Response and Asset Protection Agency (HYDRAA)**

Production-grade, secure, dynamic financial and expenditure management web platform developed for authorized Treasury Officers and Administrators.

---

## 1. Root Cause Analysis: Why "Site Can't Be Reached" (`192.168.0.210`)

When attempting to access `192.168.0.210` in Chrome after running `npm run backend:build` and `npm run web:build`, the browser displayed:
```
This site can't be reached
192.168.0.210 refused to connect. (ERR_CONNECTION_REFUSED)
```

### The Three Root Causes:

1. **`build` does NOT start the server**:
   * Running `npm run web:build` and `npm run backend:build` only generates the compiled, optimized bundles (into `.next/` and `dist/`).
   * Once compilation completes, the Node process **terminates**. There is **no active web server listening** until you execute the start command (`npm run web:start` / `npm run web:dev`).
2. **Missing Port Number in Browser URL**:
   * When typing `192.168.0.210` without a port, web browsers default to **Port 80 (HTTP)**.
   * The HYDRAA Web application runs on **Port 3000**, and the Backend REST API runs on **Port 4000**.
   * To view the application, the URL must include `:3000`:
     * On the host PC: `http://localhost:3000`
     * On other devices in the local network: `http://192.168.0.210:3000`
3. **Host Binding (`127.0.0.1` vs `0.0.0.0`)**:
   * By default, Next.js and NestJS bind strictly to `localhost` (`127.0.0.1`). When accessed from a different computer or mobile device over the LAN using your Wi-Fi/Ethernet IP (`192.168.0.210`), the connection is refused unless the servers listen on `0.0.0.0`.
   * **Fix already applied**: The scripts in `apps/web/package.json` now specify `-H 0.0.0.0 -p 3000`, and `apps/backend/src/main.ts` now listens on `0.0.0.0:4000`.

---

## 2. Project Architecture & Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend Portal** | Next.js 14 (App Router), React 18, TypeScript | Runs on **Port 3000**, styled with Tailwind CSS, Lucide Icons, Segoe UI typography scale |
| **Backend API** | NestJS 10, Express, TypeScript | Runs on **Port 4000**, Swagger OpenAPI at `/api/docs`, JWT Authentication, RBAC |
| **Database** | MySQL 8.x InnoDB, Prisma ORM 5.x | Normalized relational schema, strict `DECIMAL(18,2)` monetary fields, atomic transactions |
| **Document Vault** | Local Windows File System Storage | Located at `storage/` with SHA-256 integrity checksum verification |
| **Reporting Engine** | ExcelJS & PDFKit Tabular | Native `.xlsx` audit workbooks & certified Government Statement PDFs |

---

## 3. Scripts & Execution Commands

All scripts can be run directly from the root project folder:

```powershell
d:\Projects\Hydraa-Budget, Treasury & Expenditure Management System>
```

| Command | Purpose | When to use |
|---|---|---|
| `npm run backend:dev` | Starts NestJS Backend in watch mode with hot reload | Everyday backend development |
| `npm run backend:build` | Compiles NestJS backend into `dist/` | Prior to production launch |
| `npm run backend:start` | Runs compiled production backend from `dist/main` | Production deployment |
| `npm run web:dev` | Starts Next.js Web Portal in development mode | Everyday frontend development |
| `npm run web:build` | Builds production-optimized Next.js bundle into `.next/` | Prior to production launch |
| `npm run web:start` | Serves compiled Next.js production build on Port 3000 | Production deployment |
| `npm run build` | Builds **both** backend and web portal in one step | Automated CI/CD / Deployment |
| `npm run prisma:generate` | Regenerates Prisma Client models | After modifying schema.prisma |
| `npm run prisma:push` | Synchronizes database schema with MySQL | After changing database tables |
| `npm run seed` | Seeds default administrative officers & master data | Initial setup on a new system |

---

## 4. Fresh Installation Guide (Setting up on a New System)

Follow these steps to deploy the application on a new Windows, Linux, or macOS machine.

### Step 1: Install System Prerequisites
1. **Node.js**: Install Node.js v18 LTS, v20 LTS, or v24 (verify via `node -v` and `npm -v`).
2. **MySQL Server**: Install MySQL Server 8.0+ and ensure the MySQL Windows Service is running on port `3306`.

### Step 2: Configure MySQL Database
Open MySQL Workbench or MySQL CLI:
```sql
CREATE DATABASE hydraa_treasury_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 3: Configure Environment Variables
In `apps/backend/.env`:
```env
PORT=4000
DATABASE_URL="mysql://root:YourPassword@localhost:3306/hydraa_treasury_db"
JWT_SECRET="HYDRAA_GOVT_TELANGANA_TREASURY_SECRET_KEY_2026"
JWT_EXPIRES_IN="8h"
UPLOAD_DIR="../../storage"
```

In `apps/web/.env.local` (optional, automatically defaults to `http://localhost:4000` or host IP):
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Step 4: Install Dependencies
Open a terminal in the project root:
```powershell
# 1. Install Backend Dependencies
cd apps/backend
npm install

# 2. Push Prisma Schema to Database
npm run prisma:push

# 3. Seed Initial Financial Years, Roles, and Officer Accounts
npm run seed

# 4. Install Frontend Dependencies
cd ../web
npm install

# Return to root directory
cd ../..
```

---

## 5. How to Run the Application

### Option A: Local Development Mode (Live code changes)
Open two terminal windows:

* **Terminal 1 (Backend)**:
  ```powershell
  npm run backend:dev
  ```
  *Logs will show:*
  `HYDRAA Treasury Backend Server is running on: http://localhost:4000`

* **Terminal 2 (Frontend)**:
  ```powershell
  npm run web:dev
  ```
  *Logs will show:*
  `- Local: http://localhost:3000`
  `- Network: http://192.168.0.210:3000`

### Option B: Production Mode (Fastest & Optimized)
Open two terminal windows:

* **Step 1: Build both projects** (one-time or after code changes):
  ```powershell
  npm run build
  ```
* **Step 2: Start Backend Server**:
  ```powershell
  npm run backend:start
  ```
* **Step 3: Start Web Server** (in a second terminal):
  ```powershell
  npm run web:start
  ```

---

## 6. Accessing the Application

### On the Host Computer:
* **Web Application Portal**: [http://localhost:3000](http://localhost:3000)
* **Backend Swagger API**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### Across the Local Network (LAN / Wi-Fi):
To access the system from another laptop, tablet, or mobile phone on the same Wi-Fi network:
* **Web Application Portal**: `http://192.168.0.210:3000`
* **Backend Swagger API**: `http://192.168.0.210:4000/api/docs`

> **Note**: Replace `192.168.0.210` with your PC's actual IPv4 address (found via `ipconfig` in PowerShell).

---

## 7. Default Seeded Officer Login Credentials

All accounts come pre-configured with the default password: **`HydraaTreasury@2026`**

| Username | Role | Full Name / Designation | Permissions |
|---|---|---|---|
| `superadmin` | `SUPER_ADMIN` | HYDRAA Super Administrator | Full access: User management, Timeline settings, Master config, Audit logs |
| `treasury.admin` | `TREASURY_ADMIN` | Sri R. Venkatesh (Senior Treasury Officer) | Sanction releases, Bill processing, Payment settlements, Master configurations |
| `dataentry.officer` | `TREASURY_DATA_ENTRY` | K. Sridevi (Data Entry Officer) | Bill entry, Supporting document upload, Vendor records |
| `treasury.supervisor`| `TREASURY_SUPERVISOR` | M. Anand Rao (Treasury Supervisor) | Verification, Payment settlement, Budget reallocation |
| `auditor` | `AUDITOR_READ_ONLY` | State Audit Examiner | Read-only access to all dashboards, ledgers, vouchers, and PDF/Excel reports |

---

## 8. Basic Troubleshooting & FAQ

### Issue 1: `ERR_CONNECTION_REFUSED` in browser
* **Cause**: The server is not running, or the port `:3000` was omitted.
* **Resolution**:
  1. Verify the web server is running in terminal (`npm run web:dev` or `npm run web:start`).
  2. Confirm the URL in the browser includes `:3000` (e.g., `http://localhost:3000` or `http://192.168.0.210:3000`).

### Issue 2: Other devices on LAN cannot connect to `http://192.168.0.210:3000`
* **Cause**: Windows Defender Firewall is blocking inbound connections on ports 3000 or 4000.
* **Resolution**:
  Run this one-time command in PowerShell as Administrator to permit incoming traffic:
  ```powershell
  New-NetFirewallRule -DisplayName "HYDRAA Web (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
  New-NetFirewallRule -DisplayName "HYDRAA Backend (Port 4000)" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
  ```

### Issue 3: `Error: EADDRINUSE: address already in use :::3000` or `:::4000`
* **Cause**: A previous server process is still running in the background.
* **Resolution**:
  Run in PowerShell to kill any lingering processes on those ports:
  ```powershell
  # Find and kill process on port 3000:
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
  # Find and kill process on port 4000:
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess -Force
  ```

### Issue 4: `P1001: Can't reach database server at localhost:3306`
* **Cause**: MySQL service is stopped or MySQL root password in `.env` is incorrect.
* **Resolution**:
  1. Open Windows Services (`services.msc`), find **MySQL80**, and click **Start**.
  2. Check `apps/backend/.env` and verify the `DATABASE_URL` username and password.

### Issue 5: `EPERM: operation not permitted` on Windows during build
* **Cause**: A file lock held by an open terminal or file explorer inside the `.next/` cache.
* **Resolution**:
  Delete the temporary `.next` folder and rebuild:
  ```powershell
  Remove-Item -Recurse -Force apps\web\.next
  npm run web:build
  ```

---

## 9. System Modules Overview

1. **[Financial Dashboard](http://localhost:3000/dashboard)**: Real-time budget vs. expenditure reconciliation, active year selector, and multi-year comparative matrix.
2. **[Budget Management](http://localhost:3000/budgets)**: Government Order (GO/BRO) release entries, additional allotments, and immutable account ledgers.
3. **[Bills & Vouchers](http://localhost:3000/bills)**: Multi-head bill allocations, statutory percentage tax calculations (CGST, SGST, IT TDS), CPIN/CRI numbers, and file attachment preview.
4. **[Vendors Master](http://localhost:3000/vendors)**: Approved vendor profiles, GSTIN, PAN, and RBI-compliant bank accounts (9–18 digit validation, 11-character uppercase IFSC).
5. **[Treasury & Payments](http://localhost:3000/payments)**: Treasury settlements with UTR, Token, and Cheque tracking. Disbursing expenditure directly deducts from available budget balances.
6. **[GST & TDS Register](http://localhost:3000/gst-tds)**: Real-time tax withholding register, CPIN challan tracking, and CRI TDS remittance reconciliation.
7. **[Reports & Exports](http://localhost:3000/reports)**: Instant generation of native Excel (.xlsx) financial ledgers and certified Government PDF statements.
8. **[Masters Configuration](http://localhost:3000/masters)**: Calendar date picker for financial year timelines, funding source ledgers, originating wings, and budget purpose heads.
9. **[User & Role Management](http://localhost:3000/users)**: Provision officer accounts, reset credentials, and configure granular permissions per role.
10. **[Audit History](http://localhost:3000/audit)**: Security audit trail capturing every system event, record creation, modification, and export.
