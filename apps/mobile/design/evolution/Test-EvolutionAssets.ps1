param(
  [Parameter(Mandatory = $true)]
  [string]$RuntimeRoot,
  [Parameter(Mandatory = $true)]
  [string]$PreviewPath
)

$skins = @('sunny', 'ruby', 'sky', 'kiwi', 'violet', 'onyx', 'pearl')
$expectedPaths = @(
  foreach ($skin in $skins) {
    for ($stageNumber = 1; $stageNumber -le 10; $stageNumber++) {
      Join-Path (Join-Path $RuntimeRoot $skin) ('stage-{0:D2}.png' -f $stageNumber)
    }
  }
)

if ($expectedPaths.Count -ne 70) {
  throw "Internal validation error: expected 70 paths, got $($expectedPaths.Count)."
}

$actualPaths = @(Get-ChildItem -LiteralPath $RuntimeRoot -Recurse -File -Filter 'stage-*.png')
if ($actualPaths.Count -ne 70) {
  throw "Asset-count validation failed: expected 70 PNGs, found $($actualPaths.Count)."
}

$totalBytes = [int64]0
foreach ($path in $expectedPaths) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing generated asset: $path"
  }

  $file = Get-Item -LiteralPath $path
  $totalBytes += $file.Length
  $image = [FlapFitEvolutionAssetProcessor]::LoadUnlocked($path)
  try {
    if ($image.Width -ne 512 -or $image.Height -ne 512) {
      throw ('Invalid dimensions for {0}: {1}x{2}.' -f $path, $image.Width, $image.Height)
    }
    if (-not [System.Drawing.Image]::IsAlphaPixelFormat($image.PixelFormat)) {
      throw "Asset does not use an alpha-capable pixel format: $path"
    }

    $corners = @(
      $image.GetPixel(0, 0).A,
      $image.GetPixel(511, 0).A,
      $image.GetPixel(0, 511).A,
      $image.GetPixel(511, 511).A
    )
    if (@($corners | Where-Object { $_ -ne 0 }).Count -gt 0) {
      throw "Transparent-corner validation failed: $path"
    }

    $visible = [FlapFitEvolutionAssetProcessor]::FindVisibleBounds($image)
    if ($visible.Width -le 0 -or $visible.Height -le 0) {
      throw "No visible bird pixels found: $path"
    }
    if ($visible.Left -lt 20 -or $visible.Top -lt 20 -or $visible.Right -gt 492 -or $visible.Bottom -gt 492) {
      throw ('Visible pixels entered the 20px transparent safety border in {0}: {1}' -f $path, $visible)
    }

    $skinName = Split-Path (Split-Path $path -Parent) -Leaf
    if ($skinName -ne 'kiwi') {
      $greenPixels = [FlapFitEvolutionAssetProcessor]::CountBrightGreenPixels($image)
      if ($greenPixels -gt 0) {
        throw "Detected $greenPixels residual chroma-green pixels in $path."
      }
    }
  }
  finally {
    $image.Dispose()
  }
}

if (-not (Test-Path -LiteralPath $PreviewPath -PathType Leaf)) {
  throw "Missing contact-sheet preview: $PreviewPath"
}

[pscustomobject]@{
  AssetCount = $expectedPaths.Count
  Width = 512
  Height = 512
  TotalBytes = $totalBytes
  TotalMiB = [Math]::Round($totalBytes / 1MB, 2)
  Preview = $PreviewPath
  RuntimeRoot = $RuntimeRoot
} | ConvertTo-Json
