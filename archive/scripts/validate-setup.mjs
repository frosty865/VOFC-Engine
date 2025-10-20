#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const out = (label, ok, note='') => {
  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${label}${note ? ' - ' + note : ''}`);
  return ok;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- VOFC Setup Validation ---');

let allGood = true;
allGood &= out('NEXT_PUBLIC_SUPABASE_URL present', !!url);
allGood &= out('NEXT_PUBLIC_SUPABASE_ANON_KEY present', !!anon);
allGood &= out('SUPABASE_SERVICE_ROLE_KEY present (server)', !!service);

if (!service || !url) {
  out('Server connection test skipped', false, 'missing server env(s)');
  process.exit(allGood ? 0 : 1);
}

try {
  const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('pg_settings').select('name', { head: true, count: 'exact' }).limit(1);
  const ok = !error;
  allGood &= out('DB reachability', ok, error ? error.message : '');
} catch (e) {
  allGood &= out('DB reachability', false, e?.message || 'unknown');
}

process.exit(allGood ? 0 : 1);
