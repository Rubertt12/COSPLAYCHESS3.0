Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$buildDir = Join-Path $projectRoot "build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$logoBase64 = @'
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
'@
$logoBytes = [Convert]::FromBase64String($logoBase64.Trim())
$logoStream = [System.IO.MemoryStream]::new($logoBytes)
$logoImage = [System.Drawing.Image]::FromStream($logoStream)

function C([int]$r,[int]$g,[int]$b) { [System.Drawing.Color]::FromArgb($r,$g,$b) }

function Draw-VictorianFrame([System.Drawing.Graphics]$g, [int]$w, [int]$h) {
    $gold = [System.Drawing.Pen]::new((C 194 147 56), 2)
    $goldSoft = [System.Drawing.Pen]::new((C 111 75 39), 1)
    $diamond = [System.Drawing.Pen]::new((C 76 48 66), 1)
    $cornerBrush = [System.Drawing.SolidBrush]::new((C 226 184 93))
    try {
        $g.DrawRectangle($gold, 4, 4, $w-9, $h-9)
        $g.DrawRectangle($goldSoft, 8, 8, $w-17, $h-17)
        for ($y=25; $y -lt ($h-18); $y+=26) {
            for ($x=20; $x -lt ($w-16); $x+=26) {
                $pts = [System.Drawing.Point[]]@(
                    [System.Drawing.Point]::new($x,$y-4),
                    [System.Drawing.Point]::new($x+4,$y),
                    [System.Drawing.Point]::new($x,$y+4),
                    [System.Drawing.Point]::new($x-4,$y)
                )
                $g.DrawPolygon($diamond,$pts)
            }
        }
        $g.FillEllipse($cornerBrush, 7, 7, 6, 6)
        $g.FillEllipse($cornerBrush, $w-13, 7, 6, 6)
        $g.FillEllipse($cornerBrush, 7, $h-13, 6, 6)
        $g.FillEllipse($cornerBrush, $w-13, $h-13, 6, 6)
    } finally {
        $gold.Dispose(); $goldSoft.Dispose(); $diamond.Dispose(); $cornerBrush.Dispose()
    }
}

function Draw-CenteredText([System.Drawing.Graphics]$g, [string]$text, [System.Drawing.Font]$font, [System.Drawing.Brush]$brush, [float]$y, [int]$width) {
    $size = $g.MeasureString($text, $font)
    $x = ($width - $size.Width) / 2
    $g.DrawString($text, $font, $brush, $x, $y)
}

# Sidebar: NSIS assisted installer requires 164x314 BMP.
$sidebar = [System.Drawing.Bitmap]::new(164,314,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($sidebar)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
try {
    $rect = [System.Drawing.Rectangle]::new(0,0,164,314)
    $grad = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect,(C 9 7 16),(C 39 10 21),90.0)
    try { $g.FillRectangle($grad,$rect) } finally { $grad.Dispose() }
    Draw-VictorianFrame $g 164 314
    $g.DrawImage($logoImage, 20, 26, 124, 124)

    $ivory = [System.Drawing.SolidBrush]::new((C 244 232 208))
    $goldBrush = [System.Drawing.SolidBrush]::new((C 226 184 93))
    $muted = [System.Drawing.SolidBrush]::new((C 176 166 181))
    $titleFont = [System.Drawing.Font]::new("Georgia",18,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
    $subFont = [System.Drawing.Font]::new("Georgia",9,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
    $tinyFont = [System.Drawing.Font]::new("Segoe UI",7,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
    try {
        Draw-CenteredText $g "COSPLAY" $titleFont $ivory 164 164
        Draw-CenteredText $g "CHESS" $titleFont $ivory 188 164
        $divider = [System.Drawing.Pen]::new((C 194 147 56),1)
        try { $g.DrawLine($divider,37,222,127,222) } finally { $divider.Dispose() }
        Draw-CenteredText $g "FERGORVERSE" $subFont $goldBrush 232 164
        Draw-CenteredText $g "INSTALADOR OFICIAL" $tinyFont $muted 255 164
        Draw-CenteredText $g "R        N" $subFont $goldBrush 278 164
    } finally {
        $ivory.Dispose(); $goldBrush.Dispose(); $muted.Dispose()
        $titleFont.Dispose(); $subFont.Dispose(); $tinyFont.Dispose()
    }
    $sidebar.Save((Join-Path $buildDir "installerSidebar.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
} finally { $g.Dispose(); $sidebar.Dispose() }

# Header: 150x57 BMP.
$header = [System.Drawing.Bitmap]::new(150,57,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g2 = [System.Drawing.Graphics]::FromImage($header)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
try {
    $rect2 = [System.Drawing.Rectangle]::new(0,0,150,57)
    $grad2 = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect2,(C 12 8 18),(C 57 15 29),0.0)
    try { $g2.FillRectangle($grad2,$rect2) } finally { $grad2.Dispose() }
    $pen2 = [System.Drawing.Pen]::new((C 194 147 56),1)
    try { $g2.DrawRectangle($pen2,0,0,149,56) } finally { $pen2.Dispose() }
    $g2.DrawImage($logoImage,4,4,48,48)
    $ivory2 = [System.Drawing.SolidBrush]::new((C 244 232 208))
    $gold2 = [System.Drawing.SolidBrush]::new((C 226 184 93))
    $f1 = [System.Drawing.Font]::new("Georgia",11,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
    $f2 = [System.Drawing.Font]::new("Segoe UI",7,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
    try {
        $g2.DrawString("COSPLAY CHESS",$f1,$ivory2,55,10)
        $g2.DrawString("FERGORVERSE - SETUP",$f2,$gold2,57,33)
    } finally { $ivory2.Dispose(); $gold2.Dispose(); $f1.Dispose(); $f2.Dispose() }
    $header.Save((Join-Path $buildDir "installerHeader.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
} finally { $g2.Dispose(); $header.Dispose() }

# Installer icon generated from the same logo.
$iconBmp = [System.Drawing.Bitmap]::new(256,256,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gi = [System.Drawing.Graphics]::FromImage($iconBmp)
$gi.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gi.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
try {
    $darkBrush = [System.Drawing.SolidBrush]::new((C 13 7 17))
    $goldPen = [System.Drawing.Pen]::new((C 207 161 69),7)
    try {
        $gi.FillEllipse($darkBrush,7,7,242,242)
        $gi.DrawEllipse($goldPen,7,7,242,242)
        $gi.DrawImage($logoImage,18,18,220,220)
    } finally { $darkBrush.Dispose(); $goldPen.Dispose() }
    $hIcon = $iconBmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = [System.IO.File]::Create((Join-Path $buildDir "installerIcon.ico"))
    try { $icon.Save($fs) } finally { $fs.Dispose(); $icon.Dispose() }
} finally { $gi.Dispose(); $iconBmp.Dispose() }

$logoImage.Dispose()
$logoStream.Dispose()
Write-Host "Installer assets generated in $buildDir"
