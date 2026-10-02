# MULYANKAN
### Academic Project Evaluation Platform

> **Institutional Notice:** MULYANKAN is a production-quality institutional academic evaluation platform designed for college faculty and academic administrators. It is neither a demo nor a personal project. Official college Excel data is the sole source of truth; no simulated or fake academic records are used.

---

## 🏛️ System Overview

MULYANKAN standardizes and streamlines academic project evaluations across collegiate departments and academic cohorts. The platform enforces institutional evaluation policies, individual student accountability, and seamless role mobility between project guidance and evaluation.

### Core Architectural Pillars
- **Zero Mock Data Principle:** The official Excel ledger is the authoritative source of truth. Architectural boundaries guarantee clean integration for verified records.
- **Roll Number Identity:** The student Roll Number is the immutable unique primary identifier.
- **Project & Team Integrity:** Teams are identified by institutional Project IDs. The first listed student under a Project ID is designated as the Team Leader.
- **Student-Level Marks & Attendance:** Marks are never awarded at team aggregate level. Each student is evaluated individually based on criteria weights. Attendance and marks are collected within the same evaluation session while persisting as logically separate database records.
- **Extensible Cohort Engine:** Native support for current cohorts (2nd Year, 3rd Year) with an architecture extensible for future academic years without code modification.

---

## 🎨 Visual Identity: Arctic Glass

The locked visual system for MULYANKAN is **Arctic Glass**:
- **Interface Style:** Light-first institutional aesthetic with cool, icy undertones.
- **Surfaces:** Frosted glass panels with subtle blur (`backdrop-blur-md`) and cool-toned borders (`#DCE8F2`).
- **Shadows:** Soft diffused shadows (`box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04)`).
- **Typography:** Primary font `Geist`, with fallback to `Inter` and system sans-serif.

### Institutional Color Palette

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| **Background** | `#F3F8FC` | Main canvas background |
| **Surface** | `#FFFFFF` | Crisp card & panel backgrounds |
| **Primary Accent** | `#2563EB` | Institutional actions, brand accents |
| **Soft Blue** | `#60A5FA` | Secondary highlights & interactive focus |
| **Cyan** | `#06B6D4` | Evaluator badge & auxiliary indicators |
| **Main Text** | `#0F172A` | Primary typography & headers |
| **Secondary Text**| `#475569` | Explanatory labels & subheaders |
| **Muted Text** | `#94A3B8` | Metadata, helper texts, and timestamps |
| **Border** | `#DCE8F2` | Structural borders & divider lines |
| **Success** | `#10B981` | Completed evaluations & attendance Present |
| **Warning** | `#F59E0B` | Pending milestones & notifications |
| **Danger** | `#EF4444` | Absenteeism flags & critical actions |

---

## 🔑 Locked Business Rules & Evaluation Rubric

### 1. Authentication & Role Switcher
- **No Student Login:** Students do not log into the evaluation engine.
- **Single Faculty Login:** Teachers log in once (`firstname@abes` identifier).
- **Dual Operational Roles:** A teacher operates as either **Guide** or **Evaluator**.
- **Zero-Logout Switching:** Role transitions do not require logging out.
- **Confirmation Prompt:** Every role switch triggers the confirmation modal:  
  `"You really want to switch role from ${currentRole} to ${newRole}?"`
- **First Login Credential Policy:** Teachers receive an initial temporary password created by admin/system and are strictly required to change it on their first login.

### 2. Evaluation Criteria & Weightage Breakdown

Marks are dynamically computed from constituent rubrics rather than manual hardcoded totals:

| Phase / Criterion | Max Marks | Weightage Category |
| :--- | :--- | :--- |
| **Presentation-1** | `6` | Continuous Assessment Phase 1 |
| **Presentation-2** | `24` | Continuous Assessment Phase 2 |
| **Evaluation-1** | `30` | Mid-Term Evaluation Stage 1 |
| **Evaluation-2** | `30` | Mid-Term Evaluation Stage 2 |
| **Evaluation-3** | `40` | Final Viva & Project Review |
| **Grand Total** | `100` | Calculated Institutional Sum |

### 3. Evaluation Lifecycle Pipeline
```
[PENDING] 
   └──> [EVALUATION SESSION] 
           └──> [ATTENDANCE + MARKS] 
                   └──> [SAVE/SUBMIT] 
                           └──> [COMPLETED]
```

---

## 📂 Project Architecture

```
MULYANKAN/
├── package.json              # Monorepo configuration with npm workspaces
├── tsconfig.base.json        # Unified TypeScript compiler options
├── .env.example              # Institutional configuration template
├── README.md                 # System documentation & specifications
│
├── shared/                   # Shared TypeScript contracts & domain models
│   ├── src/
│   │   ├── constants/        # Roles, evaluation weights, lifecycle stages
│   │   ├── types/            # Student, ProjectTeam, Attendance, Marks, Auth
│   │   └── index.ts          # Barrel export
│   └── package.json
│
├── database/                 # Database layer with PostgreSQL & Drizzle ORM
│   ├── src/
│   │   ├── db.ts             # Connection client initialization
│   │   ├── schema/           # Schema definitions (ready for verified Excel models)
│   │   └── index.ts
│   ├── drizzle.config.ts     # Drizzle Kit configuration
│   └── package.json
│
├── backend/                  # Node.js + Express + TypeScript service
│   ├── src/
│   │   ├── config/           # Validated environment loader
│   │   ├── routes/           # Institutional API and health endpoints
│   │   ├── app.ts            # Express application middleware setup
│   │   └── server.ts         # Server entrypoint
│   └── package.json
│
└── frontend/                 # React 18 + Vite + Tailwind CSS (Arctic Glass)
    ├── public/               # Public assets & institutional favicon
    ├── src/
    │   ├── components/
    │   │   ├── base/         # Button, Card, Badge, Input, Modal
    │   │   ├── layout/       # AppShell with institutional header & footer
    │   │   └── role/         # RoleBadge & confirmation RoleSwitchModal
    │   ├── context/          # AuthContext with dynamic role switching
    │   ├── pages/            # LandingPage, LoginPage, TeacherDashboard
    │   ├── router/           # React Router route registry
    │   └── styles/           # index.css with Arctic Glass design tokens
    ├── vite.config.ts        # Vite build tool configuration
    ├── tailwind.config.js    # Tailwind palette extensions
    └── package.json
```

---

## 🚀 Running the Project

### 1. Install Dependencies
Run the installation command from the repository root:
```bash
npm install
```

### 2. Run the Frontend Development Server
Start the frontend with Vite:
```bash
npm run dev
# or
npm run dev:frontend
```
The application will be accessible at:  
👉 **`http://localhost:5173`**

### 3. Run Backend API Server
Start the backend Express service:
```bash
npm run dev:backend
```
The backend health check will be accessible at:  
👉 **`http://localhost:5000/api/health`**

### 4. Typecheck All Workspaces
Verify that there are zero TypeScript compiler errors across shared, backend, database, and frontend:
```bash
npm run typecheck
```

### 5. Build for Production
Create production distribution bundles:
```bash
npm run build
```