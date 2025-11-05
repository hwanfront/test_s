# Database Migration Guide

## Issue Resolution: Missing `updated_at` Column in Users Table

The error `Could not find the 'updated_at' column of 'users' in the schema cache` indicates that the database schema needs to be properly migrated to match the application's data model.

## Quick Fix (Recommended)

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Execute Migration SQL

Copy and paste the entire contents of `src/shared/config/database/migrate.sql` into the SQL Editor and click **RUN**.

This will:
- ✅ Create all required tables with correct schema
- ✅ Add proper indexes for performance
- ✅ Set up Row Level Security (RLS) policies
- ✅ Create database functions for quota management
- ✅ Insert initial clause patterns for mobile gaming

### Step 3: Verify Migration

After running the migration, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'analysis_sessions', 'risk_assessments', 'daily_quotas', 'clause_patterns');
```

Expected result: 5 rows showing all table names.

### Step 4: Test User Creation

Test that the `updated_at` column exists:

```sql
-- Test insert (will be cleaned up)
INSERT INTO users (email, name, provider, provider_id) 
VALUES ('test@example.com', 'Test User', 'google', 'test123')
RETURNING id, created_at, updated_at;

-- Clean up test data
DELETE FROM users WHERE email = 'test@example.com';
```

Expected result: Shows both `created_at` and `updated_at` timestamps.

## Alternative: Programmatic Migration

If you prefer to run the migration programmatically:

```bash
# Make the script executable
chmod +x scripts/migrate-database.mjs

# Run the migration
node scripts/migrate-database.mjs
```

**Note**: This requires your environment variables to be properly set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Schema Overview

The migration creates these tables with the exact structure needed:

### `users` table
- ✅ `id` (UUID, primary key)
- ✅ `email` (VARCHAR, unique)
- ✅ `name` (VARCHAR)
- ✅ `avatar_url` (TEXT)
- ✅ `provider` (VARCHAR, 'google'|'naver')
- ✅ `provider_id` (VARCHAR)
- ✅ `created_at` (TIMESTAMP)
- ✅ `updated_at` (TIMESTAMP) ← **This fixes the error**
- ✅ `is_active` (BOOLEAN)
- ✅ `last_login_at` (TIMESTAMP)

### Additional tables created:
- `analysis_sessions` - Stores analysis metadata and results
- `risk_assessments` - Individual clause risk evaluations
- `daily_quotas` - User quota tracking (3 free analyses/day)
- `clause_patterns` - AI analysis patterns for mobile gaming

## Verification Commands

After migration, test the OAuth authentication:

1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **Visit the signin page**:
   ```
   http://localhost:3000/auth/signin
   ```

3. **Try Google OAuth authentication** - should work without the `updated_at` error

4. **Check debug information**:
   ```
   http://localhost:3000/api/auth/debug
   ```

## Common Issues

### Issue: "Permission denied for table users"
**Solution**: The migration sets up proper RLS policies. Ensure you're using the service role key for the migration.

### Issue: "Table already exists"
**Solution**: The migration includes `DROP TABLE IF EXISTS` statements to handle existing tables.

### Issue: "Function does not exist"
**Solution**: The migration creates all required database functions. Make sure the entire SQL script was executed.

## Support

If you encounter issues:

1. **Check Supabase logs**: Go to Logs section in Supabase dashboard
2. **Verify environment variables**: Ensure all OAuth and database credentials are set
3. **Test database connection**: Use the `/api/auth/debug` endpoint to verify configuration

---

**Next Steps**: After successful migration, the OAuth authentication should work properly without the `updated_at` column error.