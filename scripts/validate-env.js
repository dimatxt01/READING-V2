#!/usr/bin/env node

/**
 * Environment validation script for production deployment
 * Checks that all required environment variables are properly set
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL'
];

const optionalEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'NEXT_PUBLIC_DOMAIN'
];

function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  const missing = [];
  const invalid = [];
  const warnings = [];
  
  // Check required variables
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    
    if (!value) {
      missing.push(envVar);
    } else if (envVar.includes('URL') && !value.startsWith('http')) {
      invalid.push(`${envVar} should be a valid URL`);
    } else if (envVar.includes('KEY') && value.length < 20) {
      invalid.push(`${envVar} appears to be too short for a valid key`);
    }
  }
  
  // Check optional variables
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    if (!value) {
      warnings.push(`${envVar} is not set (optional)`);
    }
  }
  
  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.dev.coolifyai.com')) {
    invalid.push('NEXT_PUBLIC_SUPABASE_URL should be a valid Supabase URL');
  }
  
  // Validate app URL format
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !appUrl.startsWith('http')) {
    invalid.push('NEXT_PUBLIC_APP_URL should be a valid URL');
  }
  
  // Report results
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('');
  }
  
  if (invalid.length > 0) {
    console.error('❌ Invalid environment variables:');
    invalid.forEach(error => console.error(`   - ${error}`));
    console.error('');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Optional environment variables not set:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }
  
  if (missing.length === 0 && invalid.length === 0) {
    console.log('✅ All required environment variables are properly configured!');
    
    // Additional validation
    console.log('\n🔧 Additional checks:');
    
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ Running in production mode');
      
      // Check HTTPS
      if (appUrl && appUrl.startsWith('https://')) {
        console.log('✅ App URL uses HTTPS');
      } else {
        console.warn('⚠️  App URL should use HTTPS in production');
      }
      
      // Check domain configuration
      if (appUrl && appUrl.includes('coolifyai.com')) {
        console.log('✅ App URL uses coolifyai.com domain');
      } else {
        console.warn('⚠️  App URL should use coolifyai.com domain for cookie sharing');
      }
    } else {
      console.log('ℹ️  Running in development mode');
    }
    
    return true;
  }
  
  console.error('❌ Environment validation failed!');
  return false;
}

// Run validation
if (require.main === module) {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateEnvironment };
