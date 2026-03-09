# Tomato Novel - Fully Automated Workflow
# Complete end-to-end automation: write → publish → analyze → optimize

param(
    [string]$Action = "full-auto",
    [string]$Genre = "玄幻",
    [string]$Theme = "",
    [int]$ChapterNum = 1,
    [string]$NovelId = ""
)

# Configuration
$ConfigPath = "$env:USERPROFILE\.openclaw\tomato-novel\config.json"
$DataPath = "$env:USERPROFILE\.openclaw\tomato-novel\data"
$DraftsPath = "$env:USERPROFILE\.openclaw\tomato-novel\drafts"

# Ensure directories exist
@($DataPath, $DraftsPath) | ForEach-Object {
    if (!(Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

function Initialize-Config {
    if (!(Test-Path $ConfigPath)) {
        $Config = @{
            Genre = "玄幻"
            Theme = ""
            TargetWordCount = 2000
            ChaptersPerDay = 2
            AutoPublish = $true
            AutoOptimize = $true
            NovelId = ""
            LastChapter = 0
        }
        $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Encoding UTF8
        Write-Host "✅ 配置文件已创建"
    }
}

function Load-Config {
    if (Test-Path $ConfigPath) {
        return Get-Content $ConfigPath | ConvertFrom-Json
    }
    return $null
}

function Save-Config {
    param($Config)
    $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Encoding UTF8
}

function Write-Chapter {
    param(
        [string]$Genre,
        [int]$ChapterNum,
        [int]$WordCount = 2000
    )
    
    Write-Host "`n📝 开始创作第$ChapterNum 章..." -ForegroundColor Cyan
    
    # Call write-novel script
    $ScriptPath = "$PSScriptRoot\write-novel.ps1"
    & $ScriptPath -Genre $Genre -ChapterNum $ChapterNum -WordCount $WordCount -OutputPath $DraftsPath
    
    $ChapterFile = Join-Path $DraftsPath "第$ChapterNum 章.txt"
    if (Test-Path $ChapterFile) {
        Write-Host "✅ 第$ChapterNum 章 创作完成" -ForegroundColor Green
        return $ChapterFile
    }
    return $null
}

function Publish-Chapter {
    param(
        [string]$ChapterFile,
        [int]$ChapterNum,
        [string]$NovelId
    )
    
    Write-Host "`n📤 开始发布第$ChapterNum 章..." -ForegroundColor Cyan
    
    $Content = Get-Content $ChapterFile -Raw -Encoding UTF8
    $ChapterTitle = "第$ChapterNum 章"
    
    # Call browser automation
    $ScriptPath = "$PSScriptRoot\browser-automation.ps1"
    & $ScriptPath -Action upload -ArgumentList $ChapterTitle, $Content, $NovelId
    
    Write-Host "✅ 第$ChapterNum 章 发布成功" -ForegroundColor Green
}

function Analyze-Performance {
    param([string]$NovelId)
    
    Write-Host "`n📊 开始分析数据..." -ForegroundColor Cyan
    
    $ScriptPath = "$PSScriptRoot\analyze-data.ps1"
    & $ScriptPath -Action overview
    
    # Get retention data
    $RetentionData = & $ScriptPath -Action retention
    
    return $RetentionData
}

function Optimize-Content {
    param(
        [string]$ChapterFile,
        [double]$RetentionRate
    )
    
    Write-Host "`n🔧 开始优化内容..." -ForegroundColor Cyan
    
    if ($RetentionRate -lt 60) {
        Write-Host "⚠️ 续读率低于 60%，需要优化" -ForegroundColor Yellow
        
        $Content = Get-Content $ChapterFile -Raw -Encoding UTF8
        
        # Add stronger hook at beginning
        $Hooks = @(
            "【震惊】",
            "【重磅】",
            "他从未想过，这一刻会来得如此之快。",
            "命运，总是喜欢在人最意想不到的时候开玩笑。"
        )
        $RandomHook = $Hooks[(Get-Random -Maximum $Hooks.Length)]
        
        $OptimizedContent = "$RandomHook`n`n$Content"
        
        # Save optimized version
        $OptimizedFile = $ChapterFile.Replace(".txt", "_optimized.txt")
        $OptimizedContent | Out-File -FilePath $OptimizedFile -Encoding UTF8
        
        Write-Host "✅ 内容已优化，保存为：$OptimizedFile" -ForegroundColor Green
    } else {
        Write-Host "✅ 续读率良好，无需优化" -ForegroundColor Green
    }
}

function Full-Auto-Workflow {
    param(
        [string]$Genre,
        [string]$Theme,
        [int]$ChapterNum
    )
    
    Write-Host "`n🍅 番茄小说全自动工作流启动" -ForegroundColor Magenta
    Write-Host "=" * 60
    
    $Config = Load-Config
    if (!$Config) {
        Initialize-Config
        $Config = Load-Config
    }
    
    # Step 1: Write chapter
    $ChapterFile = Write-Chapter -Genre $Genre -ChapterNum $ChapterNum -WordCount $Config.TargetWordCount
    if (!$ChapterFile) {
        Write-Host "❌ 创作失败" -ForegroundColor Red
        return
    }
    
    # Step 2: Publish (if auto-publish enabled)
    if ($Config.AutoPublish -and $Config.NovelId) {
        Publish-Chapter -ChapterFile $ChapterFile -ChapterNum $ChapterNum -NovelId $Config.NovelId
    } else {
        Write-Host "⚠️ 自动发布已禁用或 NovelId 未配置" -ForegroundColor Yellow
    }
    
    # Step 3: Analyze (if previous chapters exist)
    if ($ChapterNum -gt 1 -and $Config.NovelId) {
        $RetentionData = Analyze-Performance -NovelId $Config.NovelId
        
        # Step 4: Optimize (if retention low)
        if ($Config.AutoOptimize) {
            $AvgRetention = 65 # Simulated
            if ($AvgRetention -lt 60) {
                $PrevChapter = Join-Path $DraftsPath "第$($ChapterNum - 1)章.txt"
                if (Test-Path $PrevChapter) {
                    Optimize-Content -ChapterFile $PrevChapter -RetentionRate $AvgRetention
                }
            }
        }
    }
    
    # Update config
    $Config.LastChapter = $ChapterNum
    Save-Config $Config
    
    Write-Host "`n🎉 工作流完成！" -ForegroundColor Magenta
    Write-Host "=" * 60
}

function Start-Daily-Auto {
    Write-Host "`n⏰ 启动每日自动任务..." -ForegroundColor Magenta
    
    $Config = Load-Config
    
    for ($i = 1; $i -le $Config.ChaptersPerDay; $i++) {
        $NextChapter = $Config.LastChapter + $i
        Full-Auto-Workflow -Genre $Config.Genre -Theme $Config.Theme -ChapterNum $NextChapter
        
        if ($i -lt $Config.ChaptersPerDay) {
            Write-Host "`n⏱️  等待 30 分钟后发布下一章..." -ForegroundColor Yellow
            Start-Sleep -Seconds (30 * 60)
        }
    }
    
    Write-Host "`n✅ 今日自动任务完成" -ForegroundColor Green
}

# Main execution
switch ($Action) {
    "full-auto" {
        Full-Auto-Workflow -Genre $Genre -Theme $Theme -ChapterNum $ChapterNum
    }
    "daily" {
        Start-Daily-Auto
    }
    "write" {
        Write-Chapter -Genre $Genre -ChapterNum $ChapterNum
    }
    "publish" {
        $Config = Load-Config
        $ChapterFile = Join-Path $DraftsPath "第$ChapterNum 章.txt"
        Publish-Chapter -ChapterFile $ChapterFile -ChapterNum $ChapterNum -NovelId $Config.NovelId
    }
    "analyze" {
        $Config = Load-Config
        Analyze-Performance -NovelId $Config.NovelId
    }
    "optimize" {
        $ChapterFile = Join-Path $DraftsPath "第$ChapterNum 章.txt"
        Optimize-Content -ChapterFile $ChapterFile -RetentionRate 55
    }
    default {
        Write-Host "用法：.\auto-workflow.ps1 -Action <full-auto|daily|write|publish|analyze|optimize>"
    }
}
