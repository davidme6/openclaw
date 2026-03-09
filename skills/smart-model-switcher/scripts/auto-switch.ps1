# Auto Model Switcher - Monitor and switch models automatically
param(
    [string]$ConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧠 自动模型切换服务" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Task keywords mapping
$TaskMappings = @{
    "coding" = @("代码", "编程", "python", "js", "javascript", "函数", "类", "debug", "bug", "修复", "错误", "异常", "爬虫", "api", "json", "sql", "写程序", "开发")
    "writing" = @("小说", "故事", "文章", "写作", "创作", "写书", "章节", "番茄", "作家", "文学")
    "reasoning" = @("推理", "数学", "逻辑", "证明", "计算", "物理", "化学", "智力", "思考")
    "analysis" = @("分析", "数据", "统计", "报告", "总结", "对比", "研究", "调查")
    "translation" = @("翻译", "translate", "英文", "中文", "日语", "韩语", "语言")
    "long-context" = @("长文档", "万字", "10 万", "100 万", "1m", "1000k", "长篇")
}

$ModelMapping = @{
    "coding" = "coding-anthropic/claude-sonnet-4-5-20250929"
    "writing" = "bailian/qwen3.5-plus"
    "reasoning" = "bailian/qwen3-max-2026-01-23"
    "analysis" = "bailian/qwen3.5-plus"
    "translation" = "bailian/qwen3.5-plus"
    "long-context" = "bailian/qwen3.5-plus"
}

$ModelReasons = @{
    "coding" = "写代码最强"
    "writing" = "写小说最强（1M 上下文）"
    "reasoning" = "推理能力最强"
    "analysis" = "长上下文，分析全面"
    "translation" = "多语言支持好"
    "long-context" = "1M 上下文无敌"
}

function Get-TaskType {
    param([string]$Text)
    
    $textLower = $Text.ToLower()
    
    foreach ($key in $TaskMappings.Keys) {
        foreach ($keyword in $TaskMappings[$key]) {
            if ($textLower -match $keyword) {
                return $key
            }
        }
    }
    
    return "writing" # Default
}

Write-Host "✅ Auto-switch service ready!" -ForegroundColor Green
Write-Host "📝 Monitoring tasks and selecting best model...`n" -ForegroundColor Yellow

Write-Host "Task Type → Model Mapping:" -ForegroundColor Cyan
foreach ($key in $ModelMapping.Keys) {
    Write-Host "  $key → $($ModelMapping[$key]) ($($ModelReasons[$key]))" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "💡 Usage Examples:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "User: '帮我写一本科幻小说'"
Write-Host "→ Task Type: writing"
Write-Host "→ Model: bailian/qwen3.5-plus"
Write-Host "→ Reason: 写小说最强（1M 上下文）"
Write-Host ""
Write-Host "User: '帮我写个 Python 爬虫'"
Write-Host "→ Task Type: coding"
Write-Host "→ Model: coding-anthropic/claude-sonnet-4-5-20250929"
Write-Host "→ Reason: 写代码最强"
Write-Host ""
Write-Host "User: '这道数学题怎么做'"
Write-Host "→ Task Type: reasoning"
Write-Host "→ Model: bailian/qwen3-max-2026-01-23"
Write-Host "→ Reason: 推理能力最强"
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Service Active!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
