# Smart Model Switcher - Automatically select best model for task
param(
    [string]$Task = "",
    [string]$ConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧠 智能模型切换器" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Load config
if (!(Test-Path $ConfigPath)) {
    Write-Host "❌ Config not found: $ConfigPath" -ForegroundColor Red
    exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$availableModels = $config.models.providers.GetEnumerator() | ForEach-Object {
    $provider = $_.Key
    $_.Value.models | ForEach-Object {
        @{
            Id = "$provider/$($_.id)"
            Name = $_.name
            Api = $_.api
            ContextWindow = $_.contextWindow
            Provider = $provider
        }
    }
}

Write-Host "✅ Available models in your plan:" -ForegroundColor Green
foreach ($model in $availableModels) {
    Write-Host "  - $($model.Id) (Context: $($model.ContextWindow))" -ForegroundColor White
}
Write-Host ""

# Task classification
function Get-BestModel {
    param([string]$Task)
    
    $taskLower = $Task.ToLower()
    
    # Coding tasks
    if ($taskLower -match "代码|编程|python|js|javascript|函数 | 类|debug|bug|修复 | 错误|异常|爬虫|api|json|sql") {
        $preferred = "coding-anthropic/claude-sonnet-4-5-20250929"
        $reason = "写代码最强"
    }
    # Writing tasks
    elseif ($taskLower -match "小说 | 故事 | 文章 | 写作 | 创作 | 写书 | 章节 | 番茄") {
        $preferred = "bailian/qwen3.5-plus"
        $reason = "写小说最强（1M 上下文）"
    }
    # Reasoning tasks
    elseif ($taskLower -match "推理 | 数学 | 逻辑 | 证明 | 计算 | 物理 | 化学") {
        $preferred = "bailian/qwen3-max-2026-01-23"
        $reason = "推理能力最强"
    }
    # Analysis tasks
    elseif ($taskLower -match "分析 | 数据 | 统计 | 报告 | 总结 | 对比") {
        $preferred = "bailian/qwen3.5-plus"
        $reason = "长上下文，分析全面"
    }
    # Translation
    elseif ($taskLower -match "翻译|translate|英文 | 中文|日语 | 韩语") {
        $preferred = "bailian/qwen3.5-plus"
        $reason = "多语言支持好"
    }
    # Long context
    elseif ($taskLower -match "长文档 | 万字|10 万|100 万|1m|1000k") {
        $preferred = "bailian/qwen3.5-plus"
        $reason = "1M 上下文无敌"
    }
    # Default
    else {
        $preferred = "bailian/qwen3.5-plus"
        $reason = "综合性能最强"
    }
    
    # Check if preferred model is available
    $available = $availableModels | Where-Object { $_.Id -eq $preferred }
    
    if ($available) {
        return @{Id = $preferred; Reason = $reason}
    } else {
        # Fallback to first available
        $fallback = $availableModels[0]
        return @{Id = $fallback.Id; Reason = "$reason (首选不可用，已切换到可用模型)"}
    }
}

# Analyze task
if ($Task) {
    Write-Host "📝 Analyzing task: $Task`n" -ForegroundColor Yellow
    $result = Get-BestModel -Task $Task
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Selected Model" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Model: $($result.Id)" -ForegroundColor White
    Write-Host "Reason: $($result.Reason)" -ForegroundColor White
    Write-Host "========================================`n" -ForegroundColor Cyan
} else {
    Write-Host "Usage: .\switch-model.ps1 -Task 'your task description'" -ForegroundColor Yellow
    Write-Host "Example: .\switch-model.ps1 -Task '帮我写一本科幻小说'`n" -ForegroundColor Gray
}
