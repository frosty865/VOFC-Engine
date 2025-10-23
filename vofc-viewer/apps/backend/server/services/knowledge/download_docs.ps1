# ========================================
# VOFC Knowledge Base Downloader (ASCII Safe)
# Downloads all PDFs from ingestion_manifest.json into /data/
# ========================================

$manifestPath = ".\ingestion_manifest.json"
$dataDir = "apps\backend\data"

if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
}

Write-Host "Reading manifest from $manifestPath..."
$manifest = Get-Content $manifestPath | ConvertFrom-Json

foreach ($doc in $manifest) {
    $titleSanitized = ($doc.title -replace '[^a-zA-Z0-9_-]', '_')
    $filePath = Join-Path $dataDir "$titleSanitized.pdf"

    if ($doc.url -notmatch '\.pdf$') {
        Write-Host "Skipping non-PDF link: $($doc.url)"
        continue
    }

    Write-Host "Downloading: $($doc.title)"
    try {
        Invoke-WebRequest -Uri $doc.url -OutFile $filePath -ErrorAction Stop
        Write-Host "Saved: $filePath"
    } catch {
        Write-Warning "Failed to download: $($doc.title) ($($doc.url))"
    }
}
