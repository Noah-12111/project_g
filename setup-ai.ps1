param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $projectRoot '.env'

function Get-EnvValue([string]$Name) {
    if (-not (Test-Path -LiteralPath $envPath)) { return $null }
    foreach ($line in Get-Content -LiteralPath $envPath) {
        if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$')) {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

$currentKey = Get-EnvValue 'GEMINI_API_KEY'
if (-not $Force -and $currentKey -and $currentKey -notmatch 'YOUR_|PUT_YOUR_|PLACEHOLDER|DAN_API_KEY') {
    Write-Host 'Da tim thay Gemini API key trong file .env.' -ForegroundColor Green
    exit 0
}

Write-Host ''
Write-Host 'HOBBYVERSE AI - CAU HINH GOOGLE GEMINI' -ForegroundColor Cyan
Write-Host 'Lay API key tai: https://aistudio.google.com/api-keys'
Write-Host 'Khi nhap, ky tu se duoc an tren man hinh.'
Write-Host 'API key se duoc luu trong file .env tren may nay.'
Write-Host ''

$secureKey = Read-Host 'Nhap Gemini API key' -AsSecureString
if ($secureKey.Length -lt 10) {
    Write-Host 'API key trong hoac qua ngan. Hay chay configure-ai.bat de thu lai.' -ForegroundColor Red
    exit 1
}

$pointer = [IntPtr]::Zero
try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)

    $content = @(
        'PORT=3000'
        'AI_PROVIDER=gemini'
        ('GEMINI_API_KEY=' + $plainKey)
        'GEMINI_MODEL=gemini-3.8-flash'
    ) -join [Environment]::NewLine

    # Ghi UTF-8 khong BOM de Node.js doc .env dung ngay ca tren Windows PowerShell cu.
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($envPath, $content + [Environment]::NewLine, $utf8)
    Write-Host ''
    Write-Host 'Da luu cau hinh Gemini vao .env.' -ForegroundColor Green
}
finally {
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    if ($secureKey) { $secureKey.Dispose() }
    $plainKey = $null
}

exit 0
