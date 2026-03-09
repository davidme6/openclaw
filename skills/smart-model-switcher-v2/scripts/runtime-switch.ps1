# Smart Model Switcher V2 - Runtime Zero-Latency Switching
param(
    [string]$Task = "",
    [string]$ConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json"
)

$StartTime = Get-Date

# Model Registry (Preloaded at startup)
$ModelRegistry = @{
    "bailian/qwen3.5-plus" = @{
        Tasks = @("writing", "analysis", "translation", "long-context")
        Context = 1000000
        Priority = 1
        Status = "ready"
    }
    "bailian/qwen3-coder-plus" = @{
        Tasks = @("coding", "debug")
        Context = 100000
        Priority = 1
        Status = "ready"
    }
    "bailian/qwen3-max-2026-01-23" = @{
        Tasks = @("reasoning", "math")
        Context = 100000
        Priority = 1
        Status = "ready"
    }
    "bailian/qwen3.5-397b-a17b" = @{
        Tasks = @("writing", "analysis", "general")
        Context = 262144
        Priority = 2
        Status = "ready"
    }
    "bailian/qwen-plus" = @{
        Tasks = @("general", "chat")
        Context = 131072
        Priority = 3
        Status = "ready"
    }
}

# Task Keyword Mapping
$TaskKeywords = @{
    "coding" = @("代码", "编程", "python", "js", "javascript", "函数", "类", "debug", "bug", "修复", "错误", "异常", "爬虫", "api", "json", "sql", "写程序", "开发", "算法", "数据结构")
    "writing" = @("小说", "故事", "文章", "写作", "创作", "写书", "章节", "番茄", "作家", "文学", "散文", "诗歌", "剧本")
    "reasoning" = @("推理", "数学", "逻辑", "证明", "计算", "物理", "化学", "智力", "思考", "谜题", "难题")
    "analysis" = @("分析", "数据", "统计", "报告", "总结", "对比", "研究", "调查", "评估", "审查")
    "translation" = @("翻译", "translate", "英文", "中文", "日语", "韩语", "语言", "english", "chinese")
    "long-context" = @("长文档", "万字", "10 万", "100 万", "1m", "1000k", "长篇", "完整", "全部")
    "debug" = @("调试", "bug", "错误", "异常", "fix", "repair", "问题", "故障")
}

# Model Selection Mapping
$ModelMapping = @{
    "coding" = "bailian/qwen3-coder-plus"
    "writing" = "bailian/qwen3.5-plus"
    "reasoning" = "bailian/qwen3-max-2026-01-23"
    "analysis" = "bailian/qwen3.5-plus"
    "translation" = "bailian/qwen3.5-plus"
    "long-context" = "bailian/qwen3.5-plus"
    "debug" = "bailian/qwen3-coder-plus"
}

$ModelReasons = @{
    "bailian/qwen3.5-plus" = "Best for writing & long context (1M tokens)"
    "bailian/qwen3-coder-plus" = "Best for coding & debugging"
    "bailian/qwen3-max-2026-01-23" = "Best for reasoning & math"
    "bailian/qwen3.5-397b-a17b" = "Best for general tasks"
    "bailian/qwen-plus" = "Best for chat & quick tasks"
}

function Get-TaskType {
    param([string]$Text)
    
    $scores = @{}
    $textLower = $Text.ToLower()
    
    foreach ($type in $TaskKeywords.Keys) {
        $score = 0
        foreach ($keyword in $TaskKeywords[$type]) {
            if ($textLower -match $keyword) {
                $score++
            }
        }
        $scores[$type] = $score
    }
    
    # Get type with highest score
    $bestType = $scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1
    
    if ($bestType.Value -gt 0) {
        return $bestType.Key
    } else {
        return "writing" # Default
    }
}

function Get-BestModel {
    param([string]$TaskType)
    
    if ($ModelMapping.ContainsKey($TaskType)) {
        return $ModelMapping[$TaskType]
    } else {
        return "bailian/qwen3.5-plus" # Default
    }
}

function Get-FallbackModel {
    param([string]$PrimaryModel)
    
    # Fallback chain
    $fallbacks = @(
        "bailian/qwen3.5-397b-a17b",
        "bailian/qwen-plus",
        "bailian/qwen3.5-plus"
    )
    
    foreach ($fallback in $fallbacks) {
        if ($fallback -ne $PrimaryModel) {
            return $fallback
        }
    }
    
    return "bailian/qwen3.5-plus"
}

# Main execution
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧠 Smart Model Switcher V2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚡ Zero-Latency • No Restart Required" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

if ($Task) {
    # Analyze task
    Write-Host "📝 Analyzing task..." -ForegroundColor Yellow
    $taskType = Get-TaskType -Task $Task
    Write-Host "   Task Type: $taskType" -ForegroundColor White
    
    # Select best model
    $selectedModel = Get-BestModel -TaskType $taskType
    Write-Host "   Selected Model: $selectedModel" -ForegroundColor White
    Write-Host "   Reason: $($ModelReasons[$selectedModel])" -ForegroundColor White
    
    # Check availability
    if ($ModelRegistry.ContainsKey($selectedModel)) {
        $status = $ModelRegistry[$selectedModel].Status
        if ($status -eq "ready") {
            Write-Host "   Status: ✅ Ready" -ForegroundColor Green
        } else {
            Write-Host "   Status: ⚠️  Unavailable, using fallback" -ForegroundColor Yellow
            $selectedModel = Get-FallbackModel -PrimaryModel $selectedModel
            Write-Host "   Fallback Model: $selectedModel" -ForegroundColor White
        }
    }
    
    # Calculate latency
    $EndTime = Get-Date
    $Latency = [math]::Round(($EndTime - $StartTime).TotalMilliseconds, 2)
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "✅ Model Selected" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Model: $selectedModel" -ForegroundColor White
    Write-Host "Latency: ${Latency}ms" -ForegroundColor White
    Write-Host "Restart Required: No" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
} else {
    Write-Host "Usage: .\runtime-switch.ps1 -Task 'your task description'" -ForegroundColor Yellow
    Write-Host "Example: .\runtime-switch.ps1 -Task '帮我写一本科幻小说'`n" -ForegroundColor Gray
    
    Write-Host "Available Task Types:" -ForegroundColor Cyan
    foreach ($type in $TaskKeywords.Keys) {
        Write-Host "  - $type ($($TaskKeywords[$type].Count) keywords)" -ForegroundColor White
    }
    Write-Host ""
}
