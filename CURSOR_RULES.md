# Cursor AI Coding Rules - Desktop Support Project

## 🎯 Project Overview
This is a multi-tenant Desktop Support SaaS system built with Node.js/Express backend and React frontend. All implementations must follow these rules strictly.

---

## 🔍 Pre-Implementation Checklist (MANDATORY)

### 1. Check for Existing Implementation
**BEFORE writing any code, ALWAYS:**

1. **Search for existing features:**
   ```bash
   # Search in codebase for similar functionality
   - Use codebase_search tool to find similar features
   - Check controllers, models, routes, services
   - Review existing API endpoints
   - Check frontend components/pages
   ```

2. **Check related files:**
   - `IMPLEMENTATION_PHASES.md` - See what's already implemented
   - `PROJECT_STATUS_SUMMARY.md` - Check completion status
   - `FEATURE_TRACKING.md` - Verify feature status
   - `MISSING_FEATURES_REPORT.md` - See what's missing

3. **Avoid duplication:**
   - If similar function exists, EXTEND it, don't duplicate
   - Reuse existing utilities, middleware, components
   - Check for similar patterns in codebase

4. **File modification strategy:**
   - Only edit files directly related to the feature
   - Create new files only when necessary
   - Avoid modifying unrelated files
   - Use existing patterns and structures

---

## 🛡️ Security Rules (MANDATORY)

### Authentication & Authorization
- ✅ Always use `authenticate` middleware for protected routes
- ✅ Use `authorize` middleware for role-based access
- ✅ Validate `company_id` isolation (multi-tenant)
- ✅ Never expose sensitive data in responses
- ✅ Always hash passwords with bcrypt (10+ rounds)
- ✅ Use JWT tokens with proper expiry
- ✅ Implement token refresh mechanism

### Input Validation
- ✅ Validate ALL user inputs (use Joi/express-validator)
- ✅ Sanitize ALL inputs (use sanitize middleware)
- ✅ Validate agent keys (64 hex characters)
- ✅ Validate device IDs
- ✅ Check data types and ranges
- ✅ Prevent SQL injection (use Sequelize, parameterized queries)
- ✅ Prevent XSS attacks (sanitize outputs)

### API Security
- ✅ Rate limiting on all endpoints
- ✅ CORS configuration (specific origins)
- ✅ CSRF protection
- ✅ Security headers (helmet)
- ✅ Request size limits
- ✅ Timeout protection
- ✅ Agent key validation on agent endpoints

### Data Security
- ✅ Never log sensitive data (passwords, tokens, keys)
- ✅ Encrypt sensitive data at rest
- ✅ Use HTTPS in production
- ✅ Secure file permissions
- ✅ Audit log all security events

---

## 💰 Free/Open Source Only Rule (MANDATORY)

### Allowed Technologies
✅ **Backend:**
- Node.js, Express.js (free)
- PostgreSQL (free, open source)
- Redis (free, open source)
- Sequelize ORM (free)
- Winston logging (free)
- bcryptjs (free)
- jsonwebtoken (free)
- express-rate-limit (free)
- helmet (free)
- joi/express-validator (free)

✅ **Frontend:**
- React (free, open source)
- Vite (free, open source)
- Tailwind CSS (free, open source)
- Axios (free)
- Zustand (free)
- Recharts (free, open source)
- Lucide React icons (free, open source)

✅ **Agent:**
- PowerShell (built-in Windows)
- Native Windows APIs (free)

### NOT Allowed
❌ **Paid Services:**
- No AWS/Azure/GCP paid services
- No paid APIs (unless completely free tier)
- No commercial licenses
- No freemium services (only completely free)

❌ **Third-Party Services:**
- No paid monitoring services
- No paid email services (use self-hosted)
- No paid storage services
- No paid CDN (use self-hosted or free CDN)

### Alternatives for Common Needs
- **Email:** Use nodemailer with self-hosted SMTP or free SMTP (Gmail SMTP with app password)
- **File Storage:** Use local filesystem or self-hosted storage
- **Real-time:** Use WebSockets (socket.io - free) or polling
- **Remote Desktop:** Use open-source solutions (TightVNC, noVNC)
- **AI/ML:** Use free APIs only (Gemini free tier if available, or remove if not)

---

## 📁 File Structure Rules

### Backend Structure
```
backend/src/
├── controllers/     # Business logic
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── services/        # External service integrations
├── utils/           # Utility functions
└── config/          # Configuration files
```

### Frontend Structure
```
frontend/src/
├── pages/           # Page components
├── components/      # Reusable components
│   ├── Common/      # Common components
│   └── Admin/       # Admin-specific components
├── services/        # API services
├── store/           # State management
└── hooks/           # Custom hooks
```

### Naming Conventions
- **Files:** camelCase (e.g., `userController.js`)
- **Components:** PascalCase (e.g., `UserManagement.jsx`)
- **Functions:** camelCase (e.g., `getUserById`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Database tables:** snake_case (e.g., `user_roles`)

---

## 🧩 Code Patterns

### Controller Pattern
```javascript
// Always follow this pattern
exports.functionName = async (req, res) => {
    try {
        // 1. Validate input
        // 2. Check authorization
        // 3. Business logic
        // 4. Database operations
        // 5. Audit logging
        // 6. Response
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
```

### Model Pattern
```javascript
// Use Sequelize models
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ModelName', {
        // Fields with proper types
    }, {
        tableName: 'table_name',
        timestamps: true,
        underscored: true
    });
};
```

### Route Pattern
```javascript
// Always use middleware
router.get('/endpoint', authenticate, authorize('admin'), controller.function);
```

### Frontend Component Pattern
```jsx
// Use functional components with hooks
const ComponentName = () => {
    const [state, setState] = useState();
    const { data, loading, error } = useApiHook();
    
    // Component logic
    
    return (
        <div className="component-name">
            {/* JSX */}
        </div>
    );
};
```

---

## 🧪 Testing Requirements

### Before Marking Complete
1. ✅ **Manual Testing:**
   - Test all CRUD operations
   - Test error cases
   - Test edge cases
   - Test security (unauthorized access)
   - Test multi-tenant isolation

2. ✅ **Code Review:**
   - Check for security vulnerabilities
   - Verify no hardcoded secrets
   - Check error handling
   - Verify logging

3. ✅ **Documentation:**
   - Update API documentation
   - Update implementation phases
   - Add code comments
   - Update README if needed

---

## 🔄 Implementation Workflow

### Step 1: Planning
1. Read `IMPLEMENTATION_PHASES.md` for current phase
2. Check `PROJECT_STATUS_SUMMARY.md` for status
3. Search codebase for existing similar features
4. Plan file changes (minimal, targeted)

### Step 2: Implementation
1. Create/update database schema if needed
2. Create/update models
3. Create/update controllers
4. Create/update routes
5. Create/update frontend components
6. Add middleware if needed
7. Add validation

### Step 3: Testing
1. Test backend endpoints (Postman/curl)
2. Test frontend UI
3. Test error cases
4. Test security
5. Test multi-tenant isolation

### Step 4: Documentation
1. Update `IMPLEMENTATION_PHASES.md`
2. Update `PROJECT_STATUS_SUMMARY.md`
3. Update API documentation
4. Add code comments

### Step 5: Review
1. Check for duplicate code
2. Verify security
3. Verify free/open source compliance
4. Mark phase as complete

---

## 🚫 Common Mistakes to Avoid

1. ❌ **Don't duplicate existing code** - Always check first
2. ❌ **Don't use paid services** - Only free/open source
3. ❌ **Don't skip validation** - Always validate inputs
4. ❌ **Don't expose sensitive data** - Sanitize responses
5. ❌ **Don't modify unrelated files** - Only edit what's needed
6. ❌ **Don't hardcode values** - Use environment variables
7. ❌ **Don't skip error handling** - Always handle errors
8. ❌ **Don't skip logging** - Log important events
9. ❌ **Don't skip testing** - Test before marking complete
10. ❌ **Don't skip documentation** - Document all changes

---

## 📝 Code Quality Standards

### Code Style
- Use ESLint configuration
- Follow existing code patterns
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### Error Handling
- Always use try-catch
- Log errors with context
- Return user-friendly messages
- Don't expose stack traces in production

### Performance
- Use database indexes
- Implement pagination
- Use caching where appropriate
- Optimize queries
- Lazy load when possible

### Security
- Never trust user input
- Always validate and sanitize
- Use parameterized queries
- Implement rate limiting
- Log security events

---

## 🔗 Related Files to Check

Before implementing any feature, check these files:
1. `IMPLEMENTATION_PHASES.md` - Current phase status
2. `PROJECT_STATUS_SUMMARY.md` - Overall status
3. `FEATURE_TRACKING.md` - Feature tracking
4. `MISSING_FEATURES_REPORT.md` - Missing features
5. `SECURITY_CHECKLIST.md` - Security requirements
6. `API_DOCUMENTATION_PHASE6.md` - API documentation

---

## ✅ Completion Checklist

Before marking any feature as complete:
- [ ] Code implemented and tested
- [ ] No duplicate code
- [ ] Security validated
- [ ] Free/open source compliance verified
- [ ] Documentation updated
- [ ] Related files updated
- [ ] Error handling complete
- [ ] Logging implemented
- [ ] Multi-tenant isolation verified
- [ ] Manual testing passed

---

**Last Updated:** 2025-01-XX
**Version:** 1.0
**Maintained By:** Development Team






