param(
  [string]$StageSheetPath = '',
  [string]$LegendPath = '',
  [string]$MobileRoot = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($MobileRoot)) {
  $MobileRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}
if ([string]::IsNullOrWhiteSpace($StageSheetPath)) {
  $StageSheetPath = Join-Path $PSScriptRoot 'source\stages-01-09-sprite-chroma.png'
}
if ([string]::IsNullOrWhiteSpace($LegendPath)) {
  $LegendPath = Join-Path $PSScriptRoot 'source\legend-stage-10-chroma.png'
}

Add-Type -AssemblyName System.Drawing
$processorPath = Join-Path $PSScriptRoot 'EvolutionAssetProcessor.cs'
$processorAssembly = Join-Path $PSScriptRoot 'EvolutionAssetProcessor.dll'
if (Test-Path -LiteralPath $processorAssembly -PathType Leaf) {
  Add-Type -Path $processorAssembly
}
elseif ($PSVersionTable.PSEdition -eq 'Desktop') {
  Add-Type -Path $processorPath -ReferencedAssemblies 'System.Drawing.dll'
}
else {
  $processorSource = Get-Content -LiteralPath $processorPath -Raw
  $processorReferences = @(
    [System.Drawing.Bitmap].Assembly.Location
    [System.Drawing.Rectangle].Assembly.Location
    [System.Object].Assembly.Location
    [System.Runtime.InteropServices.Marshal].Assembly.Location
    [System.IO.MemoryStream].Assembly.Location
  ) | Select-Object -Unique
  Add-Type -TypeDefinition $processorSource -ReferencedAssemblies $processorReferences
}

$runtimeRoot = Join-Path $MobileRoot 'assets\images\evolution'
$designRoot = Join-Path $MobileRoot 'design\evolution'
$sourceRoot = Join-Path $designRoot 'source'
$previewPath = Join-Path $designRoot 'preview-sunny-stages-01-10.png'

New-Item -ItemType Directory -Force -Path $runtimeRoot, $sourceRoot | Out-Null

$skins = @('sunny', 'ruby', 'sky', 'kiwi', 'violet', 'onyx', 'pearl')
$scales = @(0.72, 0.82, 0.84, 0.86, 0.88, 0.90, 0.92, 0.94, 0.95, 1.00)
$sunnyStages = [System.Collections.Generic.List[System.Drawing.Bitmap]]::new()
$sheet = [FlapFitEvolutionAssetProcessor]::LoadUnlocked($StageSheetPath)
$legend = [FlapFitEvolutionAssetProcessor]::LoadUnlocked($LegendPath)

try {
  if ($sheet.Width -ne 1254 -or $sheet.Height -ne 1254) {
    throw "Unexpected stage-sheet dimensions: $($sheet.Width)x$($sheet.Height); expected 1254x1254."
  }
  if ($legend.Width -ne 1254 -or $legend.Height -ne 1254) {
    throw "Unexpected Legend dimensions: $($legend.Width)x$($legend.Height); expected 1254x1254."
  }

  for ($stageIndex = 0; $stageIndex -lt 10; $stageIndex++) {
    if ($stageIndex -lt 9) {
      $column = $stageIndex % 3
      $row = [Math]::Floor($stageIndex / 3)
      $sourceRect = [System.Drawing.Rectangle]::new($column * 418, $row * 418, 418, 418)
      $keyed = [FlapFitEvolutionAssetProcessor]::ExtractAndKey($sheet, $sourceRect)
    }
    else {
      $sourceRect = [System.Drawing.Rectangle]::new(0, 0, $legend.Width, $legend.Height)
      $keyed = [FlapFitEvolutionAssetProcessor]::ExtractAndKey($legend, $sourceRect)
    }

    [FlapFitEvolutionAssetProcessor]::KeepPrimaryComponent($keyed)

    try {
      $normalized = [FlapFitEvolutionAssetProcessor]::Normalize($keyed, $scales[$stageIndex])
      [FlapFitEvolutionAssetProcessor]::RemoveResidualGreen($normalized)
    }
    finally {
      $keyed.Dispose()
    }

    $sunnyStages.Add($normalized)
    foreach ($skin in $skins) {
      $skinDirectory = Join-Path $runtimeRoot $skin
      New-Item -ItemType Directory -Force -Path $skinDirectory | Out-Null
      $variant = [FlapFitEvolutionAssetProcessor]::Recolor($normalized, $skin)
      try {
        $fileName = 'stage-{0:D2}.png' -f ($stageIndex + 1)
        [FlapFitEvolutionAssetProcessor]::SavePng($variant, (Join-Path $skinDirectory $fileName))
      }
      finally {
        $variant.Dispose()
      }
    }
    Write-Output ('Rendered stage {0}/10 across all 7 skins.' -f ($stageIndex + 1))
  }

  & (Join-Path $PSScriptRoot 'New-EvolutionContactSheet.ps1') -Stages $sunnyStages -OutputPath $previewPath
  Write-Output 'Render and contact sheet complete; starting strict validation.'
}
finally {
  foreach ($bitmap in $sunnyStages) { $bitmap.Dispose() }
  $legend.Dispose()
  $sheet.Dispose()
}

& (Join-Path $PSScriptRoot 'Test-EvolutionAssets.ps1') -RuntimeRoot $runtimeRoot -PreviewPath $previewPath
