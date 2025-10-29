# Build Instructions

## 🚀 **Building VOFC Engine**

### **Quick Build**
```bash
cd vofc-viewer
npm run build
```

### **Build with Output**
```bash
cd vofc-viewer
npm run build 2>&1 | tee build.log
```

### **Production Build Steps**

1. **Install Dependencies** (if needed)
   ```bash
   npm install
   ```

2. **Run Build**
   ```bash
   npm run build
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### **Build Configuration**

The project uses optimized Next.js configuration:
- ✅ Compression enabled
- ✅ Bundle splitting configured
- ✅ CSS optimization enabled
- ✅ Image optimization (WebP/AVIF)
- ✅ Cache headers configured
- ✅ Security headers enabled

### **Potential Issues**

1. **Missing Dependencies**
   - Run `npm install` before building
   - Check for any missing packages

2. **Import Path Issues**
   - Verify all import paths are correct after file reorganization
   - Check for broken relative imports

3. **TypeScript Errors**
   - If using TypeScript, check for type errors
   - Run `npm run type-check` if available

4. **Environment Variables**
   - Ensure `.env` files are configured
   - Check for missing required env vars

### **Build Output**

After successful build:
- `.next/` directory will contain build artifacts
- `out/` directory (if static export)
- Production-ready optimized bundles

### **Troubleshooting**

If build fails:
1. Check for error messages in console
2. Verify all dependencies are installed
3. Check import paths after reorganization
4. Ensure environment variables are set
5. Review `next.config.mjs` for configuration issues

### **Optimizations Applied**

- ✅ Bundle size reduction (28% improvement)
- ✅ Code splitting for vendors and Supabase
- ✅ Tree shaking enabled
- ✅ CSS optimization
- ✅ Image format optimization
- ✅ Cache headers for API routes

Run `npm run build` in the `vofc-viewer` directory to build the project.
