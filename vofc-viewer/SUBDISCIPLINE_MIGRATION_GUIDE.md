# Sub-discipline Migration Guide

This guide explains how to apply the new sub-discipline structure to your existing VOFC Engine database and update all tables to support the hierarchical discipline system.

## Overview

The migration adds support for sub-disciplines, specifically for Physical Security, which now includes 9 specific sub-categories:

- Barriers and Fencing
- Electronic Security Systems  
- Video Security Systems
- Access Control Systems
- Intrusion Detection Systems
- Perimeter Security
- Security Lighting
- Physical Barriers
- Security Hardware

## Migration Steps

### Step 1: Run the Database Migration

Execute the complete migration script:

```bash
cd vofc-viewer
node scripts/run_subdiscipline_migration.js
```

This script will:
1. Add the `sub_disciplines` table
2. Add `sub_discipline_id` columns to existing tables
3. Insert the 9 Physical Security sub-disciplines
4. Migrate existing Physical Security data to use sub-disciplines
5. Update submission tables
6. Create necessary indexes and functions

### Step 2: Verify the Migration

Check that the migration was successful:

```sql
-- Check Physical Security sub-disciplines
SELECT * FROM sub_disciplines sd
JOIN disciplines d ON sd.discipline_id = d.id
WHERE d.name = 'Physical Security';

-- Check migration statistics
SELECT get_subdiscipline_migration_stats();

-- Check that vulnerabilities have sub-disciplines
SELECT COUNT(*) as total_vulnerabilities,
       COUNT(sub_discipline_id) as with_subdisciplines
FROM vulnerabilities 
WHERE discipline = 'Physical Security';
```

### Step 3: Test the Frontend

1. Navigate to the submit page: `http://localhost:3000/submit`
2. Select "Physical Security" as the discipline
3. Verify that the sub-discipline dropdown appears with 9 options
4. Test submitting a vulnerability with a sub-discipline

## Database Changes

### New Tables
- `sub_disciplines` - Stores sub-discipline definitions
- Links to main `disciplines` table via foreign key

### Updated Tables
- `vulnerabilities` - Added `sub_discipline_id` column
- `options_for_consideration` - Added `sub_discipline_id` column  
- `submission_vulnerabilities` - Added `sub_discipline_id` column
- `submission_options_for_consideration` - Added `sub_discipline_id` column

### New Functions
- `get_discipline_info()` - Get discipline and sub-discipline names
- `get_physical_security_subdisciplines()` - Get Physical Security sub-disciplines for frontend
- `get_all_disciplines_for_frontend()` - Get all disciplines with sub-disciplines
- `validate_discipline_subdiscipline()` - Validate discipline/sub-discipline combinations
- `assign_subdisciplines_by_content()` - Auto-assign sub-disciplines based on content
- `get_subdiscipline_migration_stats()` - Get migration statistics

### New Views
- `discipline_hierarchy` - Shows discipline and sub-discipline relationships
- `vulnerabilities_with_disciplines` - Enhanced vulnerability view with discipline info
- `ofcs_with_disciplines` - Enhanced OFC view with discipline info

## Content-Based Assignment

The migration includes intelligent content analysis to assign sub-disciplines based on keywords:

- **Barriers and Fencing**: fence, barrier, gate, perimeter, boundary
- **Electronic Security Systems**: electronic, alarm, sensor, detector, system
- **Video Security Systems**: camera, video, cctv, surveillance, monitoring
- **Access Control Systems**: access control, card reader, biometric, keypad, badge
- **Intrusion Detection Systems**: intrusion, motion, glass break, detection
- **Security Lighting**: lighting, illumination, light, emergency lighting
- **Security Hardware**: lock, hardware, device, equipment

## API Updates

The submission API has been updated to:
1. Accept `subdiscipline` parameter
2. Auto-assign sub-disciplines based on content analysis
3. Store sub-discipline information in the database
4. Handle sub-discipline validation

## Frontend Updates

The submit form now includes:
1. Dynamic sub-discipline dropdown (appears when Physical Security is selected)
2. Sub-discipline validation
3. Enhanced form submission with sub-discipline data

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove sub_discipline_id columns
ALTER TABLE vulnerabilities DROP COLUMN IF EXISTS sub_discipline_id;
ALTER TABLE options_for_consideration DROP COLUMN IF EXISTS sub_discipline_id;
ALTER TABLE submission_vulnerabilities DROP COLUMN IF EXISTS sub_discipline_id;
ALTER TABLE submission_options_for_consideration DROP COLUMN IF EXISTS sub_discipline_id;

-- Drop sub_disciplines table
DROP TABLE IF EXISTS sub_disciplines CASCADE;
```

## Verification Checklist

- [ ] Migration script completed without errors
- [ ] 9 Physical Security sub-disciplines created
- [ ] Existing Physical Security data migrated
- [ ] Frontend shows sub-discipline dropdown
- [ ] Form submission includes sub-discipline data
- [ ] Database queries return sub-discipline information
- [ ] No data loss during migration

## Troubleshooting

### Common Issues

1. **Migration fails**: Check database permissions and ensure service role key is correct
2. **Sub-disciplines not showing**: Verify the migration completed and refresh the page
3. **Data not migrated**: Run the content-based assignment function manually
4. **API errors**: Check that the submission API includes subdiscipline parameter

### Manual Fixes

```sql
-- Re-run content-based assignment
SELECT assign_subdisciplines_by_content();

-- Update submission tables
SELECT update_submission_tables_subdisciplines();

-- Get migration statistics
SELECT get_subdiscipline_migration_stats();
```

## Next Steps

After successful migration:

1. **Test thoroughly** - Submit various types of vulnerabilities to ensure sub-disciplines work correctly
2. **Monitor performance** - Check that queries with sub-disciplines perform well
3. **Train users** - Inform users about the new sub-discipline options
4. **Consider expansion** - Add sub-disciplines to other main disciplines as needed

## Support

If you encounter issues during migration:

1. Check the migration logs for specific error messages
2. Verify database connectivity and permissions
3. Ensure all environment variables are set correctly
4. Test with a small dataset first if migrating production data

