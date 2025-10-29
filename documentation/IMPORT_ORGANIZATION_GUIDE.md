# Import Organization Guide

## 📦 **Import Organization Standards**

### **1. Import Order (ESLint Style)**
```javascript
// 1. Node.js built-in modules
import fs from 'fs';
import path from 'path';

// 2. External libraries (alphabetical)
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { useState, useEffect } from 'react';

// 3. Internal modules (relative imports)
import { getCurrentUser } from '../lib/auth';
import Navigation from '../components/Navigation';
import './globals.css';
```

### **2. Import Grouping**
```javascript
// Group 1: React and Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NextResponse } from 'next/server';

// Group 2: External libraries
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';

// Group 3: Internal utilities
import { getCurrentUser } from '../lib/auth';
import { monitoring } from '../lib/monitoring';

// Group 4: Components
import Navigation from '../components/Navigation';
import PSASubmission from '../components/PSASubmission';

// Group 5: Styles
import './globals.css';
import '../styles/cisa.css';
```

### **3. Import Optimization**

#### **Named vs Default Imports:**
```javascript
// ✅ Good: Named imports for utilities
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ✅ Good: Default imports for components
import Navigation from '../components/Navigation';
import PSASubmission from '../components/PSASubmission';

// ❌ Bad: Mixed import styles
import React, { useState } from 'react';
import * as Supabase from '@supabase/supabase-js';
```

#### **Dynamic Imports:**
```javascript
// ✅ Good: Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('../components/HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});

// ✅ Good: Dynamic imports for code splitting
const AdminPanel = dynamic(() => import('../components/AdminPanel'), {
  loading: () => <div>Loading admin panel...</div>
});
```

### **4. Import Cleanup Rules**

#### **Remove Unused Imports:**
```javascript
// ❌ Bad: Unused imports
import { useState, useEffect, useCallback } from 'react';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export default function Component() {
  const [state, setState] = useState(null);
  // useEffect and useCallback are unused
  // NextResponse and createClient are unused
}

// ✅ Good: Only used imports
import { useState } from 'react';

export default function Component() {
  const [state, setState] = useState(null);
}
```

#### **Consolidate Related Imports:**
```javascript
// ❌ Bad: Multiple import statements
import { useState } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';

// ✅ Good: Single import statement
import { useState, useEffect, useCallback } from 'react';
```

### **5. File-Specific Import Patterns**

#### **API Routes:**
```javascript
// Standard API route imports
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Optional: Authentication
import { verifyToken } from '../lib/auth';

// Optional: Validation
import { z } from 'zod';
```

#### **React Components:**
```javascript
// Standard component imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Optional: External libraries
import { createClient } from '@supabase/supabase-js';

// Internal imports
import { getCurrentUser } from '../lib/auth';
import CustomComponent from '../components/CustomComponent';

// Styles
import './component.css';
```

#### **Layout Files:**
```javascript
// Layout-specific imports
import './globals.css';
import '../styles/cisa.css';

// Components
import Navigation from '../components/Navigation';
import AnalyticsProvider from '../components/AnalyticsProvider';

// Optional: Metadata
export const metadata = {
  title: 'VOFC Viewer',
  description: 'Vulnerability and Options for Consideration Viewer',
};
```

### **6. Import Performance Tips**

#### **Tree Shaking Optimization:**
```javascript
// ✅ Good: Specific imports (better tree shaking)
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ❌ Bad: Namespace imports (no tree shaking)
import * as React from 'react';
import * as Supabase from '@supabase/supabase-js';
```

#### **Bundle Splitting:**
```javascript
// ✅ Good: Separate vendor imports
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';

// ✅ Good: Group internal imports
import { getCurrentUser } from '../lib/auth';
import { monitoring } from '../lib/monitoring';
```

### **7. Common Import Issues**

#### **Circular Dependencies:**
```javascript
// ❌ Bad: Circular dependency
// File A imports File B
// File B imports File A

// ✅ Good: Extract shared logic
// Create shared utility file
// Both files import from utility
```

#### **Relative Path Issues:**
```javascript
// ❌ Bad: Deep relative paths
import Component from '../../../../components/Component';

// ✅ Good: Use absolute imports (configure in jsconfig.json)
import Component from '@/components/Component';
```

### **8. Import Validation**

#### **ESLint Rules:**
```json
{
  "rules": {
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external", 
        "internal",
        "parent",
        "sibling",
        "index"
      ],
      "newlines-between": "always"
    }],
    "import/no-unused-modules": "error",
    "import/no-duplicates": "error"
  }
}
```

#### **TypeScript Import Organization:**
```typescript
// Type-only imports
import type { NextRequest } from 'next/server';
import type { User } from '../types/user';

// Value imports
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
```

This import organization guide ensures consistent, performant, and maintainable code across the entire VOFC Engine project.
