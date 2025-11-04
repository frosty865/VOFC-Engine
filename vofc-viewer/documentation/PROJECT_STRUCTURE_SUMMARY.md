# VOFC Engine Project Structure Summary

## 🏗️ **Overall Architecture**

### **Core Components:**
- **Frontend**: Next.js 14 App Router (`vofc-viewer/app/`)
- **Backend**: Express.js AI Server (`vofc-viewer/apps/backend/`)
- **Database**: Supabase (PostgreSQL)
- **AI Processing**: Private Ollama Server (10.0.0.213:11434)
- **Deployment**: Vercel (Frontend) + Private Ollama (AI Processing)

### **Architecture Pattern:**
```
Field PCs (Thin Clients) → Vercel (Instruction Gateway) → Private Ollama Server
Field PCs → Vercel → Supabase (Data Storage)
```

## 📁 **Project Structure**

### **Root Level (`VOFC Engine/`)**
```
├── 📄 Configuration Files
│   ├── package.json (Root workspace)
│   ├── vercel.json (Deployment config)
│   └── pnpm-workspace.yaml (Monorepo config)
│
├── 📚 Documentation
│   ├── README.md
│   ├── PROJECT_INDEX.md
│   ├── AI_SETUP_GUIDE.md
│   ├── CORRECT_ARCHITECTURE.md
│   └── Various workflow docs
│
├── 🛠️ Tools & Scripts
│   ├── ai-reindex.js (AI setup automation)
│   ├── find-ollama.js (Network scanner)
│   └── create-submission-tables.js (DB setup)
│
└── 📊 Data Files
    ├── safe_vofc_library.json
    ├── ofc_sources_import.csv
    └── vulnerability_ofc_links_import.csv
```

### **Main Application (`vofc-viewer/`)**

#### **Frontend (`app/`)**
```
├── 🎨 Pages (App Router)
│   ├── page.jsx (Home)
│   ├── login/ (Authentication)
│   ├── admin/ (Admin dashboard)
│   ├── submit/ (Document submission)
│   ├── review/ (Submission review)
│   ├── vulnerabilities/ (Vulnerability browser)
│   └── monitor/ (System monitoring)
│
├── 🔌 API Routes (`api/`)
│   ├── ai-tools/ (AI instruction endpoints)
│   ├── auth/ (Authentication)
│   ├── documents/ (Document processing)
│   ├── submissions/ (Data management)
│   ├── admin/ (Admin functions)
│   └── monitor/ (System monitoring)
│
├── 🧩 Components (`components/`)
│   ├── PSASubmission.jsx (Document upload)
│   ├── SubmissionReview.jsx (Review interface)
│   ├── AIToolsPanel.jsx (AI tools UI)
│   └── Various UI components
│
└── 📚 Libraries (`lib/`)
    ├── supabaseClient.js (Database client)
    ├── auth.js (Authentication)
    └── monitoring.js (System monitoring)
```

#### **Backend (`apps/backend/`)**
```
├── 🖥️ Server (`server/`)
│   ├── ai-server.js (Minimal AI backend)
│   ├── ollama-parser.js (Document processing)
│   ├── ai-tools-minimal.js (AI tools router)
│   └── adapters/ollamaClient.js (Ollama client)
│
├── 🐍 Python Services
│   ├── Various parsers and utilities
│   └── Data processing scripts
│
└── 📊 Data Storage
    ├── completed/ (Processed documents)
    ├── failed/ (Failed processing)
    └── processing/ (In-progress)
```

## 🔄 **Data Flow Architecture**

### **Document Processing Flow:**
1. **Field PC** → Upload document via web UI
2. **Vercel** → Receive document, send to Ollama server
3. **Ollama Server** → Process document, extract vulnerabilities/OFCs
4. **Vercel** → Receive processed data, store in Supabase
5. **Field PC** → View processed results

### **AI Tools Flow:**
1. **Field PC** → Request AI analysis via `/api/ai-tools/`
2. **Vercel** → Send instruction to Ollama server
3. **Ollama Server** → Process AI request, return results
4. **Vercel** → Return results to Field PC

## 🛡️ **Security Architecture**

### **Access Control:**
- **Field PCs**: Public internet access to Vercel only
- **Vercel**: Public API endpoints with authentication
- **Ollama Server**: Private network only (10.0.0.213:11434)
- **Supabase**: Public database with RLS policies

### **Authentication:**
- Supabase Auth for user management
- JWT tokens for session management
- RLS policies for data access control

## 📊 **Database Schema**

### **Core Tables:**
- `submissions` - Document processing results
- `vulnerabilities` - Security vulnerabilities
- `options_for_consideration` - OFCs
- `disciplines` - Security disciplines
- `sources` - Document sources
- `users` - User management

## 🚀 **Deployment**

### **Production Environment:**
- **Frontend**: Vercel (public)
- **AI Processing**: Private Ollama server
- **Database**: Supabase (public)
- **File Storage**: Ollama server file system

### **Development Environment:**
- **Frontend**: `npm run dev` (localhost:3000)
- **Backend**: `npm run ai-backend` (localhost:4000)
- **Ollama**: Private server (10.0.0.213:11434)

## 🔧 **Key Technologies**

### **Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Supabase Client

### **Backend:**
- Express.js
- Node.js
- Python (parsing utilities)
- Ollama Client

### **Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Real-time subscriptions

### **AI/ML:**
- Ollama (Local LLM server)
- Custom models (vofc-engine:latest)
- Heuristic parsing algorithms

## 📈 **Performance Considerations**

### **Optimizations:**
- Thin client architecture (minimal field PC resources)
- Server-side processing (Ollama handles heavy lifting)
- Database indexing and RLS optimization
- API route optimization for speed
- Import organization for faster builds

### **Monitoring:**
- System health endpoints
- Processing status tracking
- Error logging and alerting
- Performance metrics collection

## 🎯 **Current Status**

### **Completed:**
- ✅ Clean architecture implementation
- ✅ AI tools integration
- ✅ Document processing pipeline
- ✅ Security and authentication
- ✅ Database schema and RLS
- ✅ Legacy code cleanup

### **Active Features:**
- Document submission and processing
- AI-powered vulnerability analysis
- OFC generation and management
- Admin dashboard and user management
- System monitoring and health checks

This architecture provides a scalable, secure, and efficient system for processing security documents with AI assistance while maintaining thin client requirements for field PCs.
