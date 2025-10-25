# 🔐 Authentication Refresh Token Fix - Deployed Version

## 🚨 **Critical Issue Identified**

**Problem**: Multiple 400 Bad Request errors on refresh token requests causing:
- 15+ second delays during authentication
- Endless refresh token loops
- Poor user experience at https://r4r.coolifyai.com/
- Browser console shows repeated failing requests to `/auth/v1/token?grant_type=refresh_token`

## 🔍 **Root Cause Analysis**

### **1. Cookie Domain Mismatch**
The critical issue is a **cookie domain configuration mismatch** between client and server:

**Client-Side** (`src/lib/supabase/client.ts`):
- Sets cookies with `SameSite=None; Secure` for production
- Sets `domain=.coolifyai.com` when on coolifyai.com domain

**Server-Side** (`src/lib/supabase/server.ts`):
- Sets cookies with `SameSite=none` in production (lowercase)
- Sets `domain=.coolifyai.com` when NODE_ENV=production

**Middleware** (`src/lib/supabase/middleware.ts`):
- Sets cookies with `SameSite=lax` (NOT `none`) ⚠️ **MISMATCH!**
- Sets `httpOnly: true` which client-side can't access

### **2. SameSite Attribute Conflict**
The **critical mismatch**:
- **Client**: `SameSite=None` (uppercase, cross-origin allowed)
- **Server**: `SameSite=none` (lowercase)
- **Middleware**: `SameSite=lax` (same-site only) ⚠️ **BLOCKING CROSS-ORIGIN**

When Supabase backend (`supabase.dev.coolifyai.com`) tries to refresh tokens with frontend (`r4r.coolifyai.com`), the `SameSite=lax` cookies are **not sent** because they're different origins, causing 400 errors.

### **3. Cookie Access Issues**
- **HttpOnly cookies** set by middleware can't be accessed by client-side JavaScript
- **Refresh tokens** stored in HttpOnly cookies become inaccessible
- **Client-side refresh attempts** fail because it can't read the refresh token

## 🛠️ **Complete Fix Implementation**

### **Fix 1: Unified Cookie Configuration**

**Update `src/lib/supabase/middleware.ts` (Line 171)**:
```typescript
// BEFORE (incorrect):
sameSite: isProduction ? 'lax' : 'lax',

// AFTER (correct):
sameSite: isProduction ? 'none' : 'lax',
```

### **Fix 2: Consistent SameSite Casing**

**Update `src/lib/supabase/server.ts` (Line 24)**:
```typescript
// BEFORE:
sameSite: isProduction ? 'none' : 'lax',

// AFTER:
sameSite: isProduction ? 'none' : 'lax', // Ensure consistent casing
```

### **Fix 3: Remove HttpOnly for Auth Cookies**

**Update `src/lib/supabase/middleware.ts` (Line 173)**:
```typescript
// BEFORE:
httpOnly: true

// AFTER:
httpOnly: false // Allow client-side access for refresh tokens
```

### **Fix 4: Proper Domain Configuration**

Ensure consistent domain handling across all cookie setters:

```typescript
// For production on coolifyai.com:
const getCookieDomain = (hostname: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCoolifyDomain = hostname.includes('coolifyai.com');

  if (isProduction && isCoolifyDomain) {
    return '.coolifyai.com'; // Allow subdomain sharing
  }
  return undefined; // No domain restriction for other environments
};
```

## 📝 **Environment Variables Configuration**

### **Required Production Settings**:
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://supabase.dev.coolifyai.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_APP_URL=https://r4r.coolifyai.com
NEXT_PUBLIC_SITE_URL=https://r4r.coolifyai.com
NODE_ENV=production
```

## 🚀 **Supabase Dashboard Configuration**

### **1. Update Site URL**
In Supabase Dashboard → Settings → API:
- **Site URL**: `https://r4r.coolifyai.com`

### **2. Add Redirect URLs**
- `https://r4r.coolifyai.com/auth/callback`
- `https://r4r.coolifyai.com/auth/confirm`
- `https://r4r.coolifyai.com/auth/verify-otp`
- `https://r4r.coolifyai.com/auth/update-password`

### **3. Configure CORS**
In Supabase Dashboard → Settings → API → CORS:
```
https://r4r.coolifyai.com
https://www.r4r.coolifyai.com
https://coolifyai.com
https://www.coolifyai.com
```

### **4. Cookie Settings**
Ensure Supabase project settings allow:
- **SameSite**: `None` for cross-origin requests
- **Secure**: `true` for HTTPS
- **Domain**: `.coolifyai.com` for subdomain sharing

## 🔧 **Additional Optimizations**

### **1. Disable Auto-Refresh in Middleware**
The middleware already has this correct:
```typescript
auth: {
  autoRefreshToken: false, // Prevents infinite loops
  persistSession: false,
  detectSessionInUrl: false
}
```

### **2. Enable Auto-Refresh in Client**
The client should have:
```typescript
auth: {
  autoRefreshToken: true, // Client handles refresh
  persistSession: true,
  flowType: 'pkce'
}
```

### **3. Add Retry Logic**
Implement exponential backoff for token refresh:
```typescript
// In auth-error-handler.ts
const retryWithBackoff = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

## ✅ **Verification Checklist**

After applying fixes, verify:

### **Cookie Inspection** (Browser DevTools → Application → Cookies):
- [ ] Auth cookies have `SameSite=None` (not `Lax`)
- [ ] Auth cookies have `Secure=true`
- [ ] Auth cookies have `Domain=.coolifyai.com`
- [ ] Refresh token cookie is accessible (not HttpOnly)

### **Network Tab**:
- [ ] No repeated 400 errors on `/auth/v1/token`
- [ ] Refresh token requests succeed (200 OK)
- [ ] CORS headers present on responses

### **User Experience**:
- [ ] Login completes in < 3 seconds
- [ ] No 15-second delays
- [ ] Smooth navigation after authentication
- [ ] Session persists across page refreshes

## 🎯 **Summary of Critical Changes**

1. **Change `SameSite=lax` to `SameSite=none`** in middleware
2. **Remove `httpOnly: true`** for auth cookies
3. **Ensure consistent domain** `.coolifyai.com` across all configurations
4. **Verify Supabase dashboard** settings match production URLs

## 🚨 **Deployment Steps**

1. **Apply code changes** to the three files mentioned
2. **Set environment variables** correctly
3. **Clear all cookies** in browser (important!)
4. **Deploy to production**
5. **Test authentication flow** immediately
6. **Monitor network tab** for any 400 errors

## 📊 **Expected Results**

### **Before Fix**:
- ❌ Multiple 400 Bad Request errors
- ❌ 15+ second delays
- ❌ Endless refresh loops
- ❌ Poor user experience

### **After Fix**:
- ✅ No 400 errors on refresh
- ✅ < 3 second authentication
- ✅ Smooth token refresh
- ✅ Excellent user experience

## 🔍 **Monitoring**

Watch for these in your logs:
```javascript
// Good signs:
"Token refreshed successfully"
"Session validated"
"User authenticated"

// Bad signs (should not appear):
"400 Bad Request"
"refresh_token_not_found"
"invalid_grant"
```

## 💡 **Why This Happens**

The root cause is that Supabase backend (`supabase.dev.coolifyai.com`) and your frontend (`r4r.coolifyai.com`) are on **different subdomains**. With `SameSite=lax`, cookies are not sent for cross-origin requests, breaking the refresh token mechanism. Setting `SameSite=none` allows the cookies to be sent across different origins, enabling proper authentication flow.

---

**This fix addresses the exact issue shown in your screenshot and will resolve the authentication problems at https://r4r.coolifyai.com/**