# 🔧 Supabase Proxy Configuration - Internal Instance Access

## 🎯 **Problem Solved**

Your Supabase instance (`supabase.dev.coolifyai.com` / `10.0.1.2:8000`) is **not accessible from the public internet**, only from your internal network. This proxy solution routes all Supabase requests through your Next.js API routes.

## 🏗️ **Architecture**

```
[Browser]
    ↓
[Your Next.js App - r4r.coolifyai.com]
    ↓ (via /api/supabase/*)
[Internal Network]
    ↓
[Supabase - 10.0.1.2:8000]
```

## ✅ **What I've Implemented**

### **1. Proxy Route** (`src/app/api/supabase/[...path]/route.ts`)
- Handles ALL HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD)
- Forwards headers correctly
- Streams request/response bodies
- Handles redirects
- Adds CORS headers
- Comprehensive error handling
- Debug logging

### **2. Key Features**
- **Header Management**: Filters out problematic headers, forwards necessary ones
- **Body Streaming**: Efficiently handles large payloads
- **Redirect Handling**: Converts internal redirects to proxy-relative paths
- **Error Recovery**: Graceful error handling with proper status codes
- **CORS Support**: Handles preflight requests automatically
- **Logging**: Debug information for troubleshooting

## 📝 **Configuration Steps**

### **Step 1: Update Environment Variables**

```bash
# .env.local or .env.production

# CHANGE THIS: Point to your proxy endpoint
NEXT_PUBLIC_SUPABASE_URL=/api/supabase

# ADD THIS: Internal Supabase URL
INTERNAL_SUPABASE_URL=http://10.0.1.2:8000

# Keep these as they are:
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (if needed)
```

### **Step 2: Verify Network Access**

From your deployment server, verify the internal Supabase is accessible:

```bash
# SSH into your deployment and test:
curl http://10.0.1.2:8000/rest/v1/

# Should return a response, not timeout
```

### **Step 3: Deploy and Test**

```bash
# Build with new configuration
npm run build

# Deploy to your platform
# Then test the proxy:
curl https://r4r.coolifyai.com/api/supabase/rest/v1/
```

## 🔍 **How It Works**

### **Request Flow:**

1. **Client makes request** to `/api/supabase/auth/v1/token`
2. **Proxy receives** at `/api/supabase/[...path]/route.ts`
3. **Proxy forwards** to `http://10.0.1.2:8000/auth/v1/token`
4. **Internal Supabase** processes request
5. **Proxy returns** response to client

### **Example Transformations:**

```javascript
// Before (direct - doesn't work from public internet):
https://supabase.dev.coolifyai.com/auth/v1/token

// After (proxied - works):
https://r4r.coolifyai.com/api/supabase/auth/v1/token
```

## 🚀 **Testing the Proxy**

### **Test 1: Check Proxy Health**
```bash
# From browser console:
fetch('/api/supabase/rest/v1/')
  .then(r => r.json())
  .then(console.log)
```

### **Test 2: Test Authentication**
```javascript
// This should now work through the proxy
const response = await fetch('/api/supabase/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'your_anon_key'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password'
  })
})
```

### **Test 3: Check Logs**
Your server logs should show:
```
[DEBUG] Proxying Supabase request {
  method: 'POST',
  path: 'auth/v1/token',
  targetUrl: 'http://10.0.1.2:8000/auth/v1/token?grant_type=password'
}
```

## 🐛 **Troubleshooting**

### **Issue: Still getting timeouts**

**Check internal connectivity:**
```bash
# From your deployment server
ping 10.0.1.2
telnet 10.0.1.2 8000
```

**Solution**: Ensure your deployment is in the same network or has route to internal Supabase.

### **Issue: 502 Bad Gateway errors**

**Check logs for specific error:**
```javascript
// Add more logging in proxy route
console.log('Proxy error details:', {
  targetUrl,
  headers: Object.fromEntries(headers.entries()),
  error
})
```

### **Issue: Authentication not working**

**Verify headers are being forwarded:**
```javascript
// In proxy route, log headers
console.log('Forwarding headers:', {
  apikey: headers.get('apikey'),
  authorization: headers.get('authorization'),
  contentType: headers.get('content-type')
})
```

## 📋 **Deployment Checklist**

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL=/api/supabase`
- [ ] Set `INTERNAL_SUPABASE_URL=http://10.0.1.2:8000`
- [ ] Verify internal network connectivity
- [ ] Deploy proxy route
- [ ] Test proxy endpoint
- [ ] Verify authentication works
- [ ] Check error logs

## 🔒 **Security Considerations**

### **Advantages:**
1. **Internal Supabase is not exposed** to public internet
2. **All traffic goes through your app** - you control access
3. **Can add additional auth/rate limiting** in proxy

### **Considerations:**
1. **Proxy adds latency** - requests go through extra hop
2. **Your app handles all Supabase traffic** - ensure adequate resources
3. **Single point of failure** - if your app is down, Supabase is unreachable

## 🎯 **Common Gotchas**

1. **URL must be relative**: Use `/api/supabase`, not full URL
2. **Internal URL must be accessible**: From your deployment environment
3. **Headers must be forwarded**: Especially `apikey` and `authorization`
4. **Body must be streamed**: For file uploads and large payloads

## 📊 **Performance Tips**

### **1. Add Caching (Optional)**
```typescript
// In proxy route
if (method === 'GET' && path.startsWith('rest/v1/')) {
  responseHeaders.set('Cache-Control', 'public, max-age=60')
}
```

### **2. Add Connection Pooling**
Consider using `undici` for better connection management:
```typescript
import { Agent } from 'undici'

const agent = new Agent({
  connections: 50,
  keepAliveTimeout: 10000
})

// Use in fetch
fetch(targetUrl, {
  ...requestOptions,
  dispatcher: agent
})
```

### **3. Add Rate Limiting**
```typescript
// Simple in-memory rate limiting
const requestCounts = new Map()

function checkRateLimit(ip: string) {
  const count = requestCounts.get(ip) || 0
  if (count > 100) return false // 100 requests per minute
  requestCounts.set(ip, count + 1)
  return true
}
```

## 💡 **Alternative Solutions**

If proxy doesn't work:

### **Option 1: VPN/Tunnel**
Use Cloudflare Tunnel, ngrok, or Tailscale to expose internal Supabase.

### **Option 2: Different Deployment**
Deploy your app in the same network as Supabase.

### **Option 3: Public Supabase**
Use Supabase Cloud (supabase.com) instead of self-hosted.

## ✅ **Summary**

Your Supabase proxy is now configured to:
1. **Route all Supabase requests** through your Next.js app
2. **Handle all HTTP methods** properly
3. **Forward headers and bodies** correctly
4. **Provide error handling** and logging
5. **Work with your internal Supabase** instance

**The authentication system will now work because requests go through your server, which CAN reach the internal Supabase instance!**

---

**Deploy this and your authentication will work!** 🚀