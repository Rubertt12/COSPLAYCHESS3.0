Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$buildDir = Join-Path $projectRoot "build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

# Usa a logo Fergorverse transparente e arte anime que já fazem parte do projeto.
$logoPath = Join-Path $projectRoot "img\fergorverse-logo-installer.png"
$animePath = Join-Path $projectRoot "img\img\kuroshitsuji.png"

if (-not (Test-Path $logoPath)) { throw "Logo do instalador não encontrada: $logoPath" }
if (-not (Test-Path $animePath)) { throw "Arte do instalador não encontrada: $animePath" }

$logoImage = [System.Drawing.Image]::FromFile($logoPath)
$animeImage = [System.Drawing.Image]::FromFile($animePath)

function C([int]$r,[int]$g,[int]$b) { [System.Drawing.Color]::FromArgb($r,$g,$b) }
function CA([int]$a,[int]$r,[int]$g,[int]$b) { [System.Drawing.Color]::FromArgb($a,$r,$g,$b) }

function Draw-VictorianFrame([System.Drawing.Graphics]$g, [int]$w, [int]$h) {
    $gold = [System.Drawing.Pen]::new((C 205 158 67), 2)
    $goldSoft = [System.Drawing.Pen]::new((C 104 71 39), 1)
    $ornament = [System.Drawing.Pen]::new((C 137 91 63), 1)
    $cornerBrush = [System.Drawing.SolidBrush]::new((C 226 184 93))
    try {
        $g.DrawRectangle($gold, 4, 4, $w - 9, $h - 9)
        $g.DrawRectangle($goldSoft, 8, 8, $w - 17, $h - 17)
        for ($x = 24; $x -lt ($w - 20); $x += 28) {
            $g.DrawArc($ornament, $x - 7, 12, 14, 12, 180, 180)
            $g.DrawArc($ornament, $x - 7, $h - 24, 14, 12, 0, 180)
        }
        $g.FillEllipse($cornerBrush, 7, 7, 6, 6)
        $g.FillEllipse($cornerBrush, $w - 13, 7, 6, 6)
        $g.FillEllipse($cornerBrush, 7, $h - 13, 6, 6)
        $g.FillEllipse($cornerBrush, $w - 13, $h - 13, 6, 6)
    } finally {
        $gold.Dispose(); $goldSoft.Dispose(); $ornament.Dispose(); $cornerBrush.Dispose()
    }
}

function Draw-CenteredText([System.Drawing.Graphics]$g, [string]$text, [System.Drawing.Font]$font, [System.Drawing.Brush]$brush, [float]$y, [int]$width) {
    $size = $g.MeasureString($text, $font)
    $g.DrawString($text, $font, $brush, (($width - $size.Width) / 2), $y)
}

# NSIS assisted installer: 164 x 314, BMP RGB 24-bit.
$sidebar = [System.Drawing.Bitmap]::new(164, 314, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($sidebar)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
try {
    $rect = [System.Drawing.Rectangle]::new(0, 0, 164, 314)
    $grad = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, (C 8 6 13), (C 52 13 27), 90.0)
    try { $g.FillRectangle($grad, $rect) } finally { $grad.Dispose() }

    # Arte anime/vitoriana bem sutil ao fundo.
    $g.DrawImage($animeImage, 0, 0, 164, 132)
    $veil = [System.Drawing.SolidBrush]::new((CA 150 7 5 12))
    try { $g.FillRectangle($veil, 0, 0, 164, 145) } finally { $veil.Dispose() }

    Draw-VictorianFrame $g 164 314

    # Logo Fergorverse no topo, em moldura dourada.
    $logoBack = [System.Drawing.SolidBrush]::new((CA 225 13 9 18))
    $logoPen = [System.Drawing.Pen]::new((C 213 168 79), 2)
    try {
        $g.FillEllipse($logoBack, 35, 17, 94, 94)
        $g.DrawEllipse($logoPen, 35, 17, 94, 94)
        $g.DrawImage($logoImage, 40, 22, 84, 84)
    } finally { $logoBack.Dispose(); $logoPen.Dispose() }

    $ivory = [System.Drawing.SolidBrush]::new((C 244 232 208))
    $goldBrush = [System.Drawing.SolidBrush]::new((C 226 184 93))
    $muted = [System.Drawing.SolidBrush]::new((C 181 170 184))
    $titleFont = [System.Drawing.Font]::new("Georgia", 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brandFont = [System.Drawing.Font]::new("Georgia", 10, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $tinyFont = [System.Drawing.Font]::new("Segoe UI", 8, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    try {
        Draw-CenteredText $g "COSPLAY" $titleFont $ivory 145 164
        Draw-CenteredText $g "CHESS" $titleFont $ivory 169 164
        $divider = [System.Drawing.Pen]::new((C 205 158 67), 1)
        try { $g.DrawLine($divider, 32, 205, 132, 205) } finally { $divider.Dispose() }
        Draw-CenteredText $g "FERGORVERSE" $brandFont $goldBrush 217 164
        Draw-CenteredText $g "INSTALADOR OFICIAL" $tinyFont $muted 241 164
        Draw-CenteredText $g "♜  •  ♛  •  ♞" $brandFont $goldBrush 270 164
    } finally {
        $ivory.Dispose(); $goldBrush.Dispose(); $muted.Dispose()
        $titleFont.Dispose(); $brandFont.Dispose(); $tinyFont.Dispose()
    }

    $sidebar.Save((Join-Path $buildDir "installerSidebar.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
} finally {
    $g.Dispose(); $sidebar.Dispose()
}

# Banner superior do instalador assistido: 150 x 57, BMP RGB 24-bit.
$header = [System.Drawing.Bitmap]::new(150, 57, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g2 = [System.Drawing.Graphics]::FromImage($header)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
try {
    $rect2 = [System.Drawing.Rectangle]::new(0, 0, 150, 57)
    $grad2 = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect2, (C 13 7 17), (C 67 17 33), 0.0)
    try { $g2.FillRectangle($grad2, $rect2) } finally { $grad2.Dispose() }
    $pen2 = [System.Drawing.Pen]::new((C 205 158 67), 1)
    try { $g2.DrawRectangle($pen2, 0, 0, 149, 56) } finally { $pen2.Dispose() }
    $g2.DrawImage($logoImage, 5, 5, 46, 46)

    $ivory2 = [System.Drawing.SolidBrush]::new((C 244 232 208))
    $gold2 = [System.Drawing.SolidBrush]::new((C 226 184 93))
    $f1 = [System.Drawing.Font]::new("Georgia", 11, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $f2 = [System.Drawing.Font]::new("Segoe UI", 7, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    try {
        $g2.DrawString("COSPLAY CHESS", $f1, $ivory2, 56, 11)
        $g2.DrawString("FERGORVERSE • SETUP", $f2, $gold2, 57, 33)
    } finally {
        $ivory2.Dispose(); $gold2.Dispose(); $f1.Dispose(); $f2.Dispose()
    }
    $header.Save((Join-Path $buildDir "installerHeader.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
} finally {
    $g2.Dispose(); $header.Dispose()
}

$logoImage.Dispose()
$animeImage.Dispose()
Write-Host "Assets anime/vitorianos do instalador gerados em $buildDir"
