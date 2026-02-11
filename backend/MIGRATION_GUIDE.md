# MongoDB to Supabase Migration Guide

## Overview
This project has been migrated from MongoDB/Mongoose to Supabase (PostgreSQL).

## Setup Instructions

### 1. Create Supabase Project
1. Go to https://supabase.com and create a new project
2. Note down your project URL and API keys

### 2. Run Database Migration
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migrations/001_create_tables.sql`
4. Execute the SQL script to create all tables, indexes, and policies

### 3. Update Environment Variables
Update your `.env` file with the following variables:

```env
# Remove this:
# MONGODBSTRING=your_mongodb_connection_string

# Add these:
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional (for admin operations):
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Install Dependencies
```bash
npm install
```

Note: `mongoose` and `mongodb` packages have been removed from package.json. The `@supabase/supabase-js` package is already included.

## Key Changes

### Database Schema
- **employees** table replaces Employee model
- **attendance** table replaces Attandance model  
- **lop** table replaces LOP model
- ObjectId references replaced with UUID foreign keys
- Nested `officelocation` object flattened to `office_latitude` and `office_longitude` columns

### Code Changes
- All Mongoose queries replaced with Supabase client queries
- MongoDB aggregation pipeline rewritten using JavaScript processing
- Date handling updated to work with PostgreSQL TIMESTAMP types
- Field names converted from camelCase to snake_case to match PostgreSQL conventions

### Field Name Mappings
| MongoDB Field | Supabase Field |
|---------------|---------------|
| `employeeId` | `employee_id` |
| `_id` | `id` (UUID) |
| `officelocation.latitude` | `office_latitude` |
| `officelocation.longitude` | `office_longitude` |
| `loginTime` | `login_time` |
| `logoutTime` | `logout_time` |
| `markingDate` | `marking_date` |
| `createdAt` | `created_at` |

## Testing
After migration, test all endpoints:
- `/emp/empregister` - Create employee
- `/emp/allemp` - Get all employees
- `/emp/delete/:id` - Delete employee
- `/emp/markattandance` - Mark attendance
- `/emp/empdata` - Get employee data (monthly report)
- `/emp/dailysheet` - Get daily attendance sheet
- `/emp/marklop` - Mark LOP

## Troubleshooting

### Connection Issues
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are set correctly
- Check that Row Level Security (RLS) policies allow your operations
- For admin operations, you may need to use SUPABASE_SERVICE_ROLE_KEY

### Data Migration
If you have existing MongoDB data, you'll need to:
1. Export data from MongoDB
2. Transform the data to match the new schema
3. Import into Supabase using the Supabase dashboard or API

### Query Errors
- Ensure all table names match exactly (case-sensitive)
- Check that foreign key relationships are correct
- Verify enum values match the database constraints

## Notes
- The old Mongoose model files (`Employee.js`, `Attandance.js`, `LOP.js`) are no longer used but kept for reference
- The new `supabaseModels.js` file contains table name constants
- All date queries now use ISO string format for consistency

