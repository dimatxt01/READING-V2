# 🔧 Production Authentication Fix Guide

## Problem Analysis

The error `POST https://supabase.dev.coolifyai.com/auth/v1/token?grant_type=refresh_token 400 (Bad Request)` indicates that Supabase is failing to refresh authentication tokens. This typically happens due to:

1. **Invalid or expired refresh tokens**
2. **Cookie domain configuration issues**
3. **Environment variable misconfiguration**
4. **Network connectivity problems**

## ✅ Applied Fixes

### 1. Enhanced Error Handling
- **File**: `src/lib/supabase/auth-error-handler.ts`
- **Purpose**: Gracefully handle authentication errors and prevent infinite loops
- **Features**:
  - Automatic session clearing on token errors
  - Retry mechanisms for network failures
  - Comprehensive error logging

### 2. Improved Middleware
- **File**: `src/lib/supabase/middleware.ts`
- **Changes**:
  - Added environment validation
  - Better error handling for auth failures
  - Automatic session clearing on token refresh errors
  - Improved cookie domain handling

### 3. Robust Client Configuration
- **File**: `src/lib/supabase/client.ts`
- **Changes**:
  - Better cookie domain handling for production
  - Improved authentication flow configuration
  - Dynamic domain detection

### 4. Environment Validation
- **File**: `scripts/validate-env.js`
- **Purpose**: Validate all required environment variables before deployment
- **Usage**: `npm run validate:env`

## 🚀 Deployment Steps

### Step 1: Verify Environment Variables

Run the validation script to check your environment:

```bash
npm run validate:env
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

### Step 2: Check Your Supabase Configuration

1. **Verify your Supabase URL**:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   # Should be: https://your-project.supabase.co
   # Or: https://supabase.dev.coolifyai.com
   ```

2. **Test Supabase connectivity**:
   ```bash
   curl -I $NEXT_PUBLIC_SUPABASE_URL
   ```

### Step 3: Clear Existing Sessions

The token refresh errors might be caused by invalid sessions. Clear all user sessions:

1. **In Supabase Dashboard**:
   - Go to Authentication > Users
   - Revoke all active sessions

2. **Or via SQL**:
   ```sql
   DELETE FROM auth.sessions;
   ```

### Step 4: Deploy with Fixed Configuration

```bash
# Build and deploy
npm run deploy

# Or with Docker Compose
npm run compose:up
```

### Step 5: Monitor the Application

Check the logs for any remaining issues:

```bash
# Docker logs
npm run docker:logs

# Or Docker Compose logs
npm run compose:logs
```

## 🔍 Troubleshooting

### If you still see token refresh errors:

1. **Check cookie domain configuration**:
   - Ensure your domain matches the cookie domain settings
   - For `coolifyai.com`, cookies should use `.coolifyai.com` domain

2. **Verify HTTPS configuration**:
   - Production must use HTTPS
   - Supabase requires secure connections for token refresh

3. **Check network connectivity**:
   - Ensure your server can reach `supabase.dev.coolifyai.com`
   - Check for firewall or proxy issues

### Common Issues and Solutions:

| Issue | Solution |
|-------|----------|
| `400 Bad Request` on token refresh | Clear all user sessions in Supabase |
| Cookie domain mismatch | Update cookie domain in client configuration |
| Network connectivity issues | Check server network configuration |
| Environment variables missing | Run `npm run validate:env` |

## 📊 Monitoring

The enhanced error handling now provides better logging:

- **Session clearing events** are logged
- **Network errors** are tracked
- **Token refresh failures** are automatically handled
- **Environment validation** prevents configuration issues

## 🔄 Rollback Plan

If issues persist:

1. **Revert to previous deployment**:
   ```bash
   docker-compose down
   # Deploy previous version
   ```

2. **Clear all sessions**:
   - Go to Supabase Dashboard
   - Authentication > Users
   - Revoke all sessions

3. **Check environment variables**:
   ```bash
   npm run validate:env
   ```

## 📝 Next Steps

After successful deployment:

1. **Test authentication flow**:
   - Login/logout functionality
   - Session persistence
   - Token refresh

2. **Monitor error logs**:
   - Check for any remaining auth errors
   - Verify session management

3. **Performance monitoring**:
   - Monitor token refresh success rates
   - Track authentication errors

The fixes implemented should resolve the token refresh issues and provide better error handling for future authentication problems.
