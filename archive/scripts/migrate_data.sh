#!/usr/bin/env bash
set -euo pipefail

# Requires env: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
: "${PGHOST:?Missing}"; : "${PGPORT:?Missing}"; : "${PGDATABASE:?Missing}"; : "${PGUSER:?Missing}"; : "${PGPASSWORD:?Missing}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CSV_DIR="$ROOT/data/out"
SQL_DIR="$ROOT/sql"

echo "[1/5] Ensuring staging tables exist…"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 -f "$SQL_DIR/staging.sql"

echo "[2/5] Loading CSVs into staging via \\copy…"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE _staging_controls, _staging_ofc, _staging_assessments, _staging_links;
SQL

# Map CSV headers -> staging columns in the same order as tables
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 -c "\copy _staging_controls(id_old,title,objective,resilience_function,version,is_deprecated) FROM '$CSV_DIR/rr_controls.csv' CSV HEADER"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 -c "\copy _staging_ofc(id_old,ofc_code,description,effort_level,effectiveness,cost_band,time_to_implement,capability_gain,reference_sources,version) FROM '$CSV_DIR/rr_ofcs.csv' CSV HEADER"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 -c "\copy _staging_assessments(id_old,question,readiness_state,mission_dependency,confidence_level,evidence_basis,vulnerability_detail,operational_consequence,cascading_effect,recommendation_summary,capability_gain,references_citations) FROM '$CSV_DIR/rr_assessments.csv' CSV HEADER"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 -c "\copy _staging_links(assessment_id_old,ofc_id_old) FROM '$CSV_DIR/rr_question_ofc_link.csv' CSV HEADER"

echo "[3/5] Migrating from staging to live…"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 -f "$SQL_DIR/migrate_from_csv.sql"

echo "[4/5] Applying improvements (dedupe OFCs, backfill codes, indexes)…"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 -f "$SQL_DIR/ofc_improvements.sql"

echo "[5/5] Counts:"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" -v ON_ERROR_STOP=1 <<'SQL'
select 'assessments' as t, count(*) from readiness_resilience_assessment
union all select 'ofcs', count(*) from ofc_option
union all select 'links', count(*) from question_ofc_link;
SQL

echo "✅ Done."

