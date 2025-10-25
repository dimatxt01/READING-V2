# 🚨 307 Temporary Redirect Issue - Analysis & Fix

## 📊 **What's Happening**

When accessing `/dashboard`, you're getting:
```
Status Code: 307 Temporary Redirect
Location: /auth/login
```

This means the middleware is redirecting unauthenticated requests to the login page.

## 🔍 **Root Cause Analysis**

### **The Redirect Chain:**

1. **User successfully logs in** → Cookies are set client-side
2. **Client redirects to /dashboard** (after 500ms delay)
3. **Middleware intercepts request** → Checks for user session
4. **`supabase.auth.getUser()` returns null** → No valid session found
5. **Line 373 in middleware.ts triggers** → 307 redirect to `/auth/login`

### **Where the Redirect Happens:**
```typescript
// middleware.ts:371-373
if (shouldRedirectToLogin(user, request.nextUrl.pathname) && !isLoginPageWithError) {
  logger.debug('Redirecting unauthenticated user to login')
  return NextResponse.redirect(new URL('/auth/login', request.url))  // ← 307 REDIRECT
}
```

## 🚨 **The Core Problem**

### **Cookie Mismatch Issue:**

The session isn't being recognized because of **cookie configuration conflicts**:

| Setting | Client (client.ts) | Middleware (middleware.ts) | Problem |
|---------|-------------------|---------------------------|----------|
| **SameSite** | `None` | `none` (supposed to be) | ✅ OK |
| **Secure** | `true` | `true` | ✅ OK |
| **HttpOnly** | N/A (can't set) | `true` ⚠️ | **MISMATCH** |
| **Domain** | `.coolifyai.com` | `.coolifyai.com` | ✅ OK |

### **The HttpOnly Problem:**

1. **Client sets cookies** (NOT httpOnly) → JavaScript can access
2. **Middleware overwrites with httpOnly** → JavaScript CAN'T access
3. **Cookie conflict** → Session not properly maintained

## 🔴 **Why This Causes 307 Redirect**

### **The Flow:**

```
1. Login Success
   ↓
2. Client sets cookies (not httpOnly)
   ↓
3. Redirect to /dashboard
   ↓
4. Middleware reads cookies
   ↓
5. Middleware tries to validate session
   ↓
6. Session validation fails (cookie issues)
   ↓
7. user = null
   ↓
8. shouldRedirectToLogin returns true
   ↓
9. 307 Redirect to /auth/login
```

## 🛠️ **The Solution**

### **Option 1: Fix HttpOnly Mismatch (Recommended)**

Remove httpOnly from middleware to match client behavior:

```typescript
// middleware.ts:173
const cookieOptions = {
  ...options,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  httpOnly: false  // ← Change from true to false
};
```

### **Option 2: Force Session Refresh**

Add session refresh after the retry logic:

```typescript
// After line 337 in middleware.ts
if (!user && isFromLogin) {
  // Force a session refresh
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData?.session) {
    user = sessionData.session.user
    logger.debug('Session found via getSession')
  }
}
```

### **Option 3: Increase Cookie Sync Time**

Give more time for cookies to fully synchronize:

```typescript
// auth-button.tsx
const redirectDelay = isProduction ? 1000 : 100  // Increase from 500ms to 1000ms
```

### **Option 4: Use Server-Side Login (Most Robust)**

Create a server action for login to ensure cookies are set server-side:

```typescript
// app/actions/auth.ts
'use server'

export async function loginAction(email: string, password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (!error && data.user) {
    redirect('/dashboard')  // Server-side redirect
  }

  return { error }
}
```

## 📋 **Immediate Fix to Apply**

### **Change in `middleware.ts` (Line 173):**

```diff
const cookieOptions = {
  ...options,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
- httpOnly: true
+ httpOnly: false  // Match client-side cookie behavior
};
```

### **Additional Safety - Add Session Check:**

After line 337, add:

```typescript
// Extra session check for login redirects
if (!user && isFromLogin) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session) {
      user = sessionData.session.user
      logger.debug('Session recovered via getSession')
    }
  } catch (err) {
    logger.debug('Session recovery failed', err)
  }
}
```

## 🔍 **Debugging the Issue**

To confirm this is the issue:

1. **Check Browser DevTools → Application → Cookies:**
   - Look for Supabase auth cookies
   - Check if they have `HttpOnly` flag
   - Check if values match between requests

2. **Check Network Tab:**
   - Look for the 307 redirect
   - Check the `Cookie` header in the request
   - Verify cookies are being sent

3. **Check Server Logs:**
   - Look for "Redirecting unauthenticated user to login"
   - Check if "Session found on retry" appears
   - Look for any error messages

## 📊 **Why It Works Locally But Not in Production**

| Factor | Local | Production | Impact |
|--------|-------|------------|---------|
| **Cookie Domain** | No domain | `.coolifyai.com` | Cross-subdomain complexity |
| **Network Latency** | ~0ms | 50-200ms | Timing issues |
| **SameSite** | `Lax` works | Needs `None` | Cross-origin requirements |
| **Cookie Sync** | Instant | Delayed | Race conditions |

## ✅ **Expected Result After Fix**

1. Login successful
2. Cookies properly set and maintained
3. Redirect to /dashboard
4. Middleware recognizes session
5. **No 307 redirect**
6. User lands on dashboard

## 🚀 **Implementation Priority**

1. **First**: Apply the httpOnly fix (quick fix)
2. **Second**: Add session recovery logic (safety net)
3. **Third**: Consider server-side login (long-term solution)

---

**The 307 redirect is caused by cookie configuration mismatches preventing proper session recognition. Apply the httpOnly fix to resolve this immediately.**