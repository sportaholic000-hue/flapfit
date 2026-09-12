param(
  [Parameter(Mandatory = $true)]
  [System.Collections.IList]$Stages,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$sheet = [System.Drawing.Bitmap]::new(1580, 700, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
try {
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#071B33'))
    $titleFont = [System.Drawing.Font]::new('Segoe UI', 26, [System.Drawing.FontStyle]::Bold)
    $labelFont = [System.Drawing.Font]::new('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $tileBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#071B33'))
    try {
      $graphics.DrawString('Flap Fit bird evolution - Sunny', $titleFont, $whiteBrush, 34, 18)
      for ($stageIndex = 0; $stageIndex -lt 10; $stageIndex++) {
        $column = $stageIndex % 5
        $row = [Math]::Floor($stageIndex / 5)
        $x = 30 + $column * 310
        $y = 78 + $row * 302
        $graphics.FillRectangle($tileBrush, $x, $y, 280, 272)
        $graphics.DrawImage($Stages[$stageIndex], $x + 16, $y + 4, 248, 248)
        $graphics.DrawString(('Stage {0}' -f ($stageIndex + 1)), $labelFont, $whiteBrush, $x + 86, $y + 238)
      }
    }
    finally {
      $tileBrush.Dispose()
      $whiteBrush.Dispose()
      $labelFont.Dispose()
      $titleFont.Dispose()
    }
  }
  finally {
    $graphics.Dispose()
  }
  [FlapFitEvolutionAssetProcessor]::SavePng($sheet, $OutputPath)
}
finally {
  $sheet.Dispose()
}
