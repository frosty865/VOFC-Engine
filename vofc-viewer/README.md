# VOFC Engine

**Vulnerability and Options for Consideration Engine**

A comprehensive security document processing system that uses AI to extract vulnerabilities and options for consideration from security guidance documents.

## 🏗️ **Project Structure**

```
VOFC Engine/
├── 📚 documentation/          # All project documentation
├── 🛠️ scripts/               # Root-level utility scripts  
├── 📊 data/                  # Data files and libraries
├── ⚙️ config/                # Configuration files
├── 🔧 tools/                 # Development tools and parsers
├── 📁 docs/                  # Legacy documentation
├── 📁 vofc-viewer/           # Main Next.js application
└── 📁 node_modules/          # Dependencies
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- Ollama server running on `10.0.0.213:11434`
- Supabase account and database

### **Installation**
```bash
# Install dependencies
npm install

# Install AI backend dependencies
npm run ai-install

# Set up environment variables
cp vofc-viewer/.env.example vofc-viewer/.env
# Edit vofc-viewer/.env with your configuration
```

### **Development**
```bash
# Start frontend (Vercel)
cd vofc-viewer
npm run dev

# Start AI backend (separate terminal)
npm run ai-backend
```

## 📖 **Documentation**

### **Essential Reading**
- [`documentation/README.md`](documentation/README.md) - Main project overview
- [`documentation/PROJECT_STRUCTURE_SUMMARY.md`](documentation/PROJECT_STRUCTURE_SUMMARY.md) - Detailed architecture
- [`documentation/SECURITY_REVIEW.md`](documentation/SECURITY_REVIEW.md) - **CRITICAL** security issues
- [`documentation/API_DOCUMENTATION.md`](documentation/API_DOCUMENTATION.md) - API reference

### **Setup Guides**
- [`documentation/AI_SETUP_GUIDE.md`](documentation/AI_SETUP_GUIDE.md) - AI configuration
- [`documentation/PROJECT_CHECKLIST.md`](documentation/PROJECT_CHECKLIST.md) - Project status

### **Technical Guides**
- [`documentation/PERFORMANCE_OPTIMIZATION_GUIDE.md`](documentation/PERFORMANCE_OPTIMIZATION_GUIDE.md) - Performance tips
- [`documentation/IMPORT_ORGANIZATION_GUIDE.md`](documentation/IMPORT_ORGANIZATION_GUIDE.md) - Code standards

## ⚠️ **Critical Security Issues**

**🚨 DO NOT DEPLOY TO PRODUCTION** - Critical security vulnerabilities found:

1. **Hardcoded credentials** in authentication system
2. **Weak JWT secret** with fallback values
3. **No input validation** on AI endpoints
4. **File upload vulnerabilities** without validation
5. **Service role key exposure** bypassing security

See [`documentation/SECURITY_REVIEW.md`](documentation/SECURITY_REVIEW.md) for details and fixes.

## 🔧 **Available Scripts**

```bash
# AI Backend Management
npm run ai-backend          # Start AI backend server
npm run ai-install          # Install AI dependencies
npm run ai-test             # Test AI connection
npm run ai-reindex          # Reindex AI tools

# Database Management  
npm run create-tables       # Create submission tables
npm run migrate-data        # Migrate existing data
npm run setup-submissions   # Full submission setup

# Development
npm run dev                 # Start frontend development
npm run build               # Build for production
npm run find-ollama         # Scan for Ollama servers
```

## 🏛️ **Architecture**

### **Thin Client Architecture**
- **Field PCs**: No processing/storage (thin clients)
- **Vercel**: Public API gateway with Ollama tunnel
- **Ollama Server**: Private AI processing (10.0.0.213:11434)
- **Supabase**: Public database for processed data

### **Data Flow**
```
Field PC → Vercel → Private Ollama Server → Vercel → Supabase → Field PC
```

## 📊 **Current Status**

### **Project Health: 7/10 (GOOD)**
- ✅ **Architecture**: Clean and well-organized
- ✅ **Performance**: Optimized (34-50% improvements)
- ✅ **Code Quality**: Clean and maintainable
- ❌ **Security**: Critical issues need immediate attention
- ✅ **Documentation**: Comprehensive and up-to-date

### **Completed Tasks**
- ✅ Cleaned up 100+ unused files
- ✅ Optimized performance and bundle size
- ✅ Created comprehensive documentation
- ✅ Organized project structure
- ✅ Identified security vulnerabilities

## 🎯 **Next Steps**

### **Immediate (This Week)**
1. **Fix Security Issues** - Address hardcoded credentials and JWT secret
2. **Add Input Validation** - Implement Zod schemas for all API inputs
3. **File Upload Security** - Add proper file validation and limits

### **Short Term (Next 2 Weeks)**
1. **Authentication Overhaul** - Implement Supabase Auth properly
2. **Rate Limiting** - Add rate limiting to prevent abuse
3. **Testing** - Add comprehensive API tests

## 📞 **Support**

- **Documentation**: Check [`documentation/`](documentation/) folder
- **Issues**: Review [`documentation/SECURITY_REVIEW.md`](documentation/SECURITY_REVIEW.md) for critical fixes
- **API Reference**: See [`documentation/API_DOCUMENTATION.md`](documentation/API_DOCUMENTATION.md)

## 📄 **License**

MIT License - See LICENSE file for details.

---

**⚠️ Remember: Fix security issues before production deployment!**
