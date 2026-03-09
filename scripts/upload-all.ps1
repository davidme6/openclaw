# Upload all tomato-novel-writer files to GitHub
$Token = Get-Content "$env:USERPROFILE\.openclaw\github.token" -Raw
$Owner = "davidme6"
$Repo = "openclaw"
$Branch = "main"

$Headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
}

$Files = @(
    @{Path = "SKILL.md"; Local = "$env:USERPROFILE\.openclaw\workspace\skills\public\tomato-novel-writer\SKILL.md"},
    @{Path = "scripts/write-novel.ps1"; Local = "$env:USERPROFILE\.openclaw\workspace\skills\public\tomato-novel-writer\scripts\write-novel.ps1"},
    @{Path = "scripts/analyze-data.ps1"; Local = "$env:USERPROFILE\.openclaw\workspace\skills\public\tomato-novel-writer\scripts\analyze-data.ps1"},
    @{Path = "scripts/publish.ps1"; Local = "$env:USERPROFILE\.openclaw\workspace\skills\public\tomato-novel-writer\scripts\publish.ps1"},
    @{Path = "scripts/browser-automation.ps1"; Local = "$env:USERPROFILE\.openclaw\workspace\skills\public\tomato-novel-writer\scripts\browser-automation.ps1"},
    @{Path = "scripts/auto-workflow.ps1"; Local = "$env:USERPROFILE\.openclaw\workspace\skills\public\tomato-novel-writer\scripts\auto-workflow.ps1"}
)

foreach ($File in $Files) {
    if (!(Test-Path $File.Local)) {
        Write-Host "⚠️ Skip (not found): $($File.Path)"
        continue
    }
    
    $Content = Get-Content $File.Local -Raw -Encoding UTF8
    $Base64Content = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Content))
    
    $Body = @{
        message = "Update tomato-novel-writer - $($File.Path)"
        content = $Base64Content
        branch = $Branch
    } | ConvertTo-Json
    
    $Uri = "https://api.github.com/repos/$Owner/$Repo/contents/skills/tomato-novel-writer/$($File.Path)"
    
    Write-Host "📤 Uploading $($File.Path)..."
    try {
        $Response = Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
        Write-Host "✅ $($File.Path) uploaded" -ForegroundColor Green
    } catch {
        Write-Host "❌ $($File.Path) failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Upload complete!"
Write-Host "📦 Repo: https://github.com/$Owner/$Repo/tree/main/skills/tomato-novel-writer"
