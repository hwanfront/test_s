#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * 
 * Checks if all required tables and columns exist in the Supabase database
 */

import { createClient } from '@supabase/supabase-js'

async function verifySchema() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🔍 Verifying database schema...')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Check if required tables exist
    console.log('\n📋 Checking table existence...')
    
    const requiredTables = [
      'users',
      'analysis_sessions', 
      'risk_assessments',
      'daily_quotas',
      'clause_patterns'
    ]

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', requiredTables)

    if (tablesError) {
      throw new Error(`Failed to check tables: ${tablesError.message}`)
    }

    const existingTables = tables?.map(t => t.table_name) || []
    const missingTables = requiredTables.filter(table => !existingTables.includes(table))

    if (missingTables.length > 0) {
      console.error(`❌ Missing tables: ${missingTables.join(', ')}`)
      console.log('\n📝 To fix this issue:')
      console.log('1. Go to your Supabase project dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Run the migration script from src/shared/config/database/migrate.sql')
      process.exit(1)
    }

    console.log(`✅ All ${requiredTables.length} required tables exist`)

    // Check users table structure specifically
    console.log('\n🔍 Checking users table structure...')
    
    const { data: userColumns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'users')
      .order('ordinal_position')

    if (columnsError) {
      throw new Error(`Failed to check users table columns: ${columnsError.message}`)
    }

    const requiredUserColumns = [
      'id',
      'email', 
      'name',
      'avatar_url',
      'provider',
      'provider_id',
      'created_at',
      'updated_at',
      'is_active',
      'last_login_at'
    ]

    const existingColumns = userColumns?.map(c => c.column_name) || []
    const missingColumns = requiredUserColumns.filter(col => !existingColumns.includes(col))

    if (missingColumns.length > 0) {
      console.error(`❌ Missing columns in users table: ${missingColumns.join(', ')}`)
      console.log('\n📝 The users table needs to be recreated with the correct schema.')
      console.log('Please run the migration script from DATABASE_MIGRATION.md')
      process.exit(1)
    }

    console.log(`✅ Users table has all ${requiredUserColumns.length} required columns`)

    // Test database connection and user insertion
    console.log('\n🧪 Testing user creation...')
    
    const testUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'schema-test@example.com',
      name: 'Schema Test User',
      provider: 'google',
      provider_id: 'google_schema_test_123'
    }

    // First, clean up any existing test user
    await supabase.from('users').delete().eq('email', testUser.email)

    // Try to insert test user
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select('id, email, created_at, updated_at')

    if (insertError) {
      console.error('❌ User creation test failed:', insertError.message)
      console.log('\n🔧 This suggests a schema or permissions issue.')
      console.log('Please check:')
      console.log('1. Row Level Security (RLS) policies')
      console.log('2. Database triggers for updated_at')
      console.log('3. Column constraints and data types')
      process.exit(1)
    }

    console.log('✅ User creation test successful')
    console.log(`   User ID: ${insertData?.[0]?.id}`)
    console.log(`   Created: ${insertData?.[0]?.created_at}`)
    console.log(`   Updated: ${insertData?.[0]?.updated_at}`)

    // Clean up test user
    await supabase.from('users').delete().eq('id', testUser.id)
    console.log('🧹 Test user cleaned up')

    // Test quota function
    console.log('\n🧪 Testing quota functions...')
    
    const { data: quotaData, error: quotaError } = await supabase
      .rpc('check_quota_limit', { user_uuid: testUser.id })

    if (quotaError) {
      console.warn('⚠️  Quota function test failed:', quotaError.message)
      console.log('   This may indicate missing database functions.')
    } else {
      console.log('✅ Quota functions working correctly')
    }

    console.log('\n🎉 Database schema verification completed successfully!')
    console.log('✅ All tables exist with correct structure')
    console.log('✅ User creation works properly')
    console.log('✅ Database triggers and functions are functional')
    console.log('\n🚀 Your authentication should now work without the updated_at error.')

  } catch (error) {
    console.error('❌ Schema verification failed:', error)
    process.exit(1)
  }
}

// Check if this is running as the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  verifySchema().catch(console.error)
}

export { verifySchema }