# VOFC Data Migration Script (PowerShell version)
# Requires env: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD

param(
    [Parameter(Mandatory=$true)]
    [string]$PGHOST,
    [Parameter(Mandatory=$true)]
    [string]$PGPORT,
    [Parameter(Mandatory=$true)]
    [string]$PGDATABASE,
    [Parameter(Mandatory=$true)]
    [string]$PGUSER,
    [Parameter(Mandatory=$true)]
    [string]$PGPASSWORD
)

$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent $PSScriptRoot
$CSV_DIR = Join-Path $ROOT "data\out"
$SQL_DIR = Join-Path $ROOT "sql"

$ConnectionString = "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD"

Write-Host "[1/5] Ensuring staging tables exist…" -ForegroundColor Green
& psql $ConnectionString -v ON_ERROR_STOP=1 -f "$SQL_DIR\staging.sql"

Write-Host "[2/5] Loading CSVs into staging via \copy…" -ForegroundColor Green
& psql $ConnectionString -v ON_ERROR_STOP=1 -c "TRUNCATE _staging_controls, _staging_ofc, _staging_assessments, _staging_links;"

# Load each CSV file
$ControlsCSV = Join-Path $CSV_DIR "rr_controls.csv"
$OFCsCSV = Join-Path $CSV_DIR "rr_ofcs.csv"
$AssessmentsCSV = Join-Path $CSV_DIR "rr_assessments.csv"
$LinksCSV = Join-Path $CSV_DIR "rr_question_ofc_link.csv"

& psql $ConnectionString -v ON_ERROR_STOP=1 -c "\copy _staging_controls(id_old,title,objective,resilience_function,version,is_deprecated) FROM '$ControlsCSV' CSV HEADER"
& psql $ConnectionString -v ON_ERROR_STOP=1 -c "\copy _staging_ofc(id_old,ofc_code,description,effort_level,effectiveness,cost_band,time_to_implement,capability_gain,reference_sources,version) FROM '$OFCsCSV' CSV HEADER"
& psql $ConnectionString -v ON_ERROR_STOP=1 -c "\copy _staging_assessments(id_old,question,readiness_state,mission_dependency,confidence_level,evidence_basis,vulnerability_detail,operational_consequence,cascading_effect,recommendation_summary,capability_gain,references_citations) FROM '$AssessmentsCSV' CSV HEADER"
& psql $ConnectionString -v ON_ERROR_STOP=1 -c "\copy _staging_links(assessment_id_old,ofc_id_old) FROM '$LinksCSV' CSV HEADER"

Write-Host "[3/5] Migrating from staging to live…" -ForegroundColor Green
& psql $ConnectionString -v ON_ERROR_STOP=1 -f "$SQL_DIR\migrate_from_csv.sql"

Write-Host "[4/5] Applying improvements (dedupe OFCs, backfill codes, indexes)…" -ForegroundColor Green
& psql $ConnectionString -v ON_ERROR_STOP=1 -f "$SQL_DIR\ofc_improvements.sql"

Write-Host "[5/5] Final counts:" -ForegroundColor Green
& psql $ConnectionString -v ON_ERROR_STOP=1 -c @"
select 'assessments' as t, count(*) from readiness_resilience_assessment
union all select 'ofcs', count(*) from ofc_option
union all select 'links', count(*) from question_ofc_link;
"@

Write-Host "✅ Done." -ForegroundColor Green

