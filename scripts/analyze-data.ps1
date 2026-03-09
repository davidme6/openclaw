# Tomato Novel - Data Analysis Script
# Analyzes reader retention, revenue, and market trends

param(
    [string]$Action = "overview",
    [string]$NovelId = "",
    [int]$Days = 7
)

# Data storage path
$DataPath = "$env:USERPROFILE\.openclaw\tomato-novel\data"
if (!(Test-Path $DataPath)) {
    New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
}

function Get-RetentionData {
    param([int]$Days)
    
    # Simulated retention data (in real implementation, fetch from API)
    $RetentionData = @()
    for ($i = 1; $i -le $Days; $i++) {
        $RetentionData += @{
            Date = (Get-Date).AddDays(-$i).ToString("yyyy-MM-dd")
            Chapter = $i
            RetentionRate = (60 + (Get-Random -Maximum 25))
            Views = (1000 + (Get-Random -Maximum 5000))
            Favorites = (50 + (Get-Random -Maximum 200))
        }
    }
    return $RetentionData
}

function Get-MarketTrends {
    # Simulated market trends
    return @{
        HotGenres = @("玄幻系统", "都市神豪", "言情甜宠", "悬疑刑侦")
        RisingKeywords = @("逆袭", "打脸", "甜宠", "系统", "穿越")
        AvgRetention = 65
        TopPerformers = @("《神级系统》", "《总裁的替身前妻》", "《刑侦档案》")
    }
}

function Get-RevenueData {
    param([int]$Days)
    
    $RevenueData = @()
    for ($i = 1; $i -le $Days; $i++) {
        $RevenueData += @{
            Date = (Get-Date).AddDays(-$i).ToString("yyyy-MM-dd")
            Revenue = (50 + (Get-Random -Maximum 200))
            ReadCount = (5000 + (Get-Random -Maximum 10000))
            VIPReads = (500 + (Get-Random -Maximum 2000))
        }
    }
    return $RevenueData
}

function Show-Overview {
    Write-Host "`n🍅 番茄小说数据概览" -ForegroundColor Green
    Write-Host "=" * 50
    
    $Retention = Get-RetentionData -Days 7
    $Market = Get-MarketTrends
    $Revenue = Get-RevenueData -Days 7
    
    Write-Host "`n📊 续读率数据 (近 7 天):"
    $AvgRetention = ($Retention | Measure-Object -Property RetentionRate -Average).Average
    Write-Host "   平均续读率：$([math]::Round($AvgRetention, 1))%"
    Write-Host "   目标：>60%"
    if ($AvgRetention -lt 60) {
        Write-Host "   ⚠️ 低于目标，建议优化内容" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ 达到目标" -ForegroundColor Green
    }
    
    Write-Host "`n💰 收入数据 (近 7 天):"
    $TotalRevenue = ($Revenue | Measure-Object -Property Revenue -Sum).Sum
    Write-Host "   总收入：¥$TotalRevenue"
    Write-Host "   日均：¥$([math]::Round($TotalRevenue / 7, 2))"
    
    Write-Host "`n🔥 市场热点:"
    Write-Host "   热门类型：$($Market.HotGenres -join ', ')"
    Write-Host "   上升关键词：$($Market.RisingKeywords -join ', ')"
    
    Write-Host "`n📈 建议:"
    if ($AvgRetention -lt 60) {
        Write-Host "   1. 加强章节结尾悬念" -ForegroundColor Yellow
        Write-Host "   2. 加快前期节奏" -ForegroundColor Yellow
        Write-Host "   3. 增加冲突和高潮" -ForegroundColor Yellow
    } else {
        Write-Host "   1. 保持更新频率" -ForegroundColor Green
        Write-Host "   2. 考虑开启 VIP 章节" -ForegroundColor Green
    }
}

function Show-RetentionAnalysis {
    Write-Host "`n📊 续读率详细分析" -ForegroundColor Green
    Write-Host "=" * 50
    
    $Retention = Get-RetentionData -Days 7
    
    Write-Host "`n章节续读率:"
    foreach ($item in $Retention) {
        $Bar = "█" * ($item.RetentionRate / 5)
        Write-Host "  第$($item.Chapter)章：$($item.RetentionRate)% $Bar"
    }
    
    $LowestChapter = $Retention | Sort-Object RetentionRate | Select-Object -First 1
    Write-Host "`n⚠️ 续读率最低章节：第$($LowestChapter.Chapter)章 ($($LowestChapter.RetentionRate)%)"
    Write-Host "   建议：检查该章节内容，可能是节奏过慢或缺乏吸引力"
}

function Show-MarketAnalysis {
    Write-Host "`n🔥 市场趋势分析" -ForegroundColor Green
    Write-Host "=" * 50
    
    $Market = Get-MarketTrends
    
    Write-Host "`n热门类型 TOP5:"
    for ($i = 0; $i -lt $Market.HotGenres.Length; $i++) {
        Write-Host "  $($i + 1). $($Market.HotGenres[$i])"
    }
    
    Write-Host "`n上升关键词:"
    foreach ($keyword in $Market.RisingKeywords) {
        Write-Host "  • #$keyword"
    }
    
    Write-Host "`n畅销榜作品:"
    foreach ($book in $Market.TopPerformers) {
        Write-Host "  📚 $book"
    }
    
    Write-Host "`n💡 创作建议:"
    Write-Host "   结合热门类型和关键词，可以提高作品曝光率"
}

# Main execution
switch ($Action) {
    "overview" { Show-Overview }
    "retention" { Show-RetentionAnalysis }
    "market" { Show-MarketAnalysis }
    "revenue" { 
        $Revenue = Get-RevenueData -Days 7
        Write-Host "`n💰 收入详情 (近 7 天)"
        foreach ($item in $Revenue) {
            Write-Host "  $($item.Date): ¥$($item.Revenue) | 阅读：$($item.ReadCount)"
        }
    }
    default {
        Write-Host "用法：.\analyze-data.ps1 -Action <overview|retention|market|revenue>"
    }
}
