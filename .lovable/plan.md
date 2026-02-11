

## Add `trial_start` column to `profiles` table

### What already exists
- `is_premium` (boolean, default false) -- already in the table, no changes needed

### What needs to be added
- `trial_start` (timestamp with time zone, nullable, default null) -- to track when a user's trial period began

### Database Migration

```sql
ALTER TABLE public.profiles
ADD COLUMN trial_start timestamp with time zone DEFAULT NULL;
```

### Code Updates
- Update `src/lib/cloudSync.ts` to include `trial_start` in the `UserProfile` interface
- No other code changes required unless you want to use this field in the UI

