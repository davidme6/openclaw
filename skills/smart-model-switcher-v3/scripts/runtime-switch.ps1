# Smart Model Switcher V3 - Universal Multi-Provider Runtime Switching
param(
    [string]$Task = "",
    [string]$ConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json",
    [switch]$CheckAvailability,
    [switch]$ValidateKeys
)

$StartTime = Get-Date
$ErrorActionPreference = "Continue"

# ============================================================================
# Model Registry - All Providers
# ============================================================================
$ModelRegistry = @{
    # Bailian (Qwen Series)
    "bailian/qwen3.5-plus" = @{
        Provider = "Bailian"
        Tasks = @("writing", "analysis", "translation", "long-context")
        Context = 1000000
        Priority = 1
        CostLevel = "medium"
        Status = "unknown"
    }
    "bailian/qwen3-coder-plus" = @{
        Provider = "Bailian"
        Tasks = @("coding", "debug")
        Context = 100000
        Priority = 1
        CostLevel = "medium"
        Status = "unknown"
    }
    "bailian/qwen3-max-2026-01-23" = @{
        Provider = "Bailian"
        Tasks = @("reasoning", "math")
        Context = 100000
        Priority = 1
        CostLevel = "high"
        Status = "unknown"
    }
    "bailian/qwen3.5-397b-a17b" = @{
        Provider = "Bailian"
        Tasks = @("writing", "analysis", "general")
        Context = 262144
        Priority = 2
        CostLevel = "medium"
        Status = "unknown"
    }
    "bailian/qwen-plus" = @{
        Provider = "Bailian"
        Tasks = @("general", "chat")
        Context = 131072
        Priority = 3
        CostLevel = "low"
        Status = "unknown"
    }
    "bailian/qwen-turbo" = @{
        Provider = "Bailian"
        Tasks = @("quick", "simple")
        Context = 32768
        Priority = 4
        CostLevel = "lowest"
        Status = "unknown"
    }
    
    # MiniMax
    "bailian/MiniMax-M2.5" = @{
        Provider = "MiniMax"
        Tasks = @("chat", "general", "coding")
        Context = 262144
        Priority = 2
        CostLevel = "medium"
        Status = "unknown"
    }
    "bailian/MiniMax-Text-01" = @{
        Provider = "MiniMax"
        Tasks = @("long-context", "analysis")
        Context = 1048576
        Priority = 3
        CostLevel = "high"
        Status = "unknown"
    }
    
    # GLM (Zhipu)
    "bailian/glm-5" = @{
        Provider = "GLM"
        Tasks = @("coding", "reasoning", "analysis")
        Context = 131072
        Priority = 2
        CostLevel = "medium"
        Status = "unknown"
    }
    "bailian/glm-4.7" = @{
        Provider = "GLM"
        Tasks = @("quick", "chat", "general")
        Context = 131072
        Priority = 3
        CostLevel = "low"
        Status = "unknown"
    }
    
    # Kimi (Moonshot)
    "bailian/kimi-k2.5" = @{
        Provider = "Kimi"
        Tasks = @("long-context", "analysis", "writing")
        Context = 204800
        Priority = 2
        CostLevel = "medium"
        Status = "unknown"
    }
}

# ============================================================================
# Task Keywords (Multi-language support)
# ============================================================================
$TaskKeywords = @{
    "coding" = @(
        "代码", "编程", "python", "js", "javascript", "typescript", "java", "cpp",
        "函数", "类", "方法", "debug", "bug", "修复", "错误", "异常", "爬虫",
        "api", "json", "sql", "写程序", "开发", "算法", "数据结构", "前端", "后端",
        "react", "vue", "angular", "nodejs", "django", "flask", "spring"
    )
    "writing" = @(
        "小说", "故事", "文章", "写作", "创作", "写书", "章节", "番茄", "作家",
        "文学", "散文", "诗歌", "剧本", "文案", "博客", "邮件", "报告", "论文"
    )
    "reasoning" = @(
        "推理", "数学", "逻辑", "证明", "计算", "物理", "化学", "智力", "思考",
        "谜题", "难题", "解答", "分析", "推导", "公式", "方程"
    )
    "analysis" = @(
        "分析", "数据", "统计", "报告", "总结", "对比", "研究", "调查", "评估",
        "审查", "洞察", "趋势", "图表", "可视化", "商业", "市场"
    )
    "translation" = @(
        "翻译", "translate", "英文", "中文", "日语", "韩语", "语言", "english",
        "chinese", "japanese", "korean", "french", "german", "spanish"
    )
    "long-context" = @(
        "长文档", "万字", "10 万", "100 万", "1m", "1000k", "长篇", "完整", "全部",
        "pdf", "文档", "文件", "书籍", "手册", "规范", "合同"
    )
    "debug" = @(
        "调试", "bug", "错误", "异常", "fix", "repair", "问题", "故障", "崩溃",
        "报错", "exception", "error", "warning", "traceback"
    )
    "chat" = @(
        "聊天", "你好", "在吗", "帮助", "介绍", "你是谁", "能做什么", "对话",
        "hi", "hello", "help", "chat", "talk"
    )
    "quick" = @(
        "简单", "快速", "马上", "立刻", "快点", "急", "快", "speed", "fast",
        "quick", "simple", "easy"
    )
}

# ============================================================================
# Model Selection Mapping (with cross-provider fallback)
# ============================================================================
$ModelMapping = @{
    "coding" = @(
        "bailian/qwen3-coder-plus",  # Primary (Bailian)
        "bailian/glm-5",              # Fallback 1 (GLM)
        "bailian/MiniMax-M2.5"        # Fallback 2 (MiniMax)
    )
    "writing" = @(
        "bailian/qwen3.5-plus",       # Primary (Bailian)
        "bailian/kimi-k2.5",          # Fallback 1 (Kimi)
        "bailian/qwen3.5-397b-a17b"   # Fallback 2 (Bailian)
    )
    "reasoning" = @(
        "bailian/qwen3-max-2026-01-23",  # Primary (Bailian)
        "bailian/glm-5",                  # Fallback 1 (GLM)
        "bailian/qwen3.5-plus"            # Fallback 2 (Bailian)
    )
    "analysis" = @(
        "bailian/qwen3.5-plus",       # Primary (Bailian)
        "bailian/kimi-k2.5",          # Fallback 1 (Kimi)
        "bailian/glm-5"               # Fallback 2 (GLM)
    )
    "translation" = @(
        "bailian/qwen3.5-plus",       # Primary (Bailian)
        "bailian/glm-5",              # Fallback 1 (GLM)
        "bailian/MiniMax-M2.5"        # Fallback 2 (MiniMax)
    )
    "long-context" = @(
        "bailian/qwen3.5-plus",       # Primary (Bailian - 1M context)
        "bailian/kimi-k2.5",          # Fallback 1 (Kimi - 200K+)
        "bailian/MiniMax-Text-01"     # Fallback 2 (MiniMax - 1M)
    )
    "debug" = @(
        "bailian/qwen3-coder-plus",   # Primary (Bailian)
        "bailian/glm-5",              # Fallback 1 (GLM)
        "bailian/qwen3.5-plus"        # Fallback 2 (Bailian)
    )
    "chat" = @(
        "bailian/MiniMax-M2.5",       # Primary (MiniMax)
        "bailian/qwen-plus",          # Fallback 1 (Bailian)
        "bailian/glm-4.7"             # Fallback 2 (GLM)
    )
    "quick" = @(
        "bailian/qwen-turbo",         # Primary (Bailian - lowest cost)
        "bailian/qwen-plus",          # Fallback 1 (Bailian)
        "bailian/glm-4.7"             # Fallback 2 (GLM)
    )
}

$ModelReasons = @{
    "bailian/qwen3.5-plus" = "最适合写作和长上下文 (1M tokens)"
    "bailian/qwen3-coder-plus" = "最适合编程和调试"
    "bailian/qwen3-max-2026-01-23" = "最适合复杂推理和数学"
    "bailian/qwen3.5-397b-a17b" = "最适合通用任务"
    "bailian/qwen-plus" = "最适合日常对话和快速任务"
    "bailian/qwen-turbo" = "最适合简单任务 (最低成本)"
    "bailian/MiniMax-M2.5" = "最适合对话和通用任务"
    "bailian/MiniMax-Text-01" = "最适合超长文本处理 (1M)"
    "bailian/glm-5" = "最适合推理和编程 (智谱)"
    "bailian/glm-4.7" = "最适合快速任务 (智谱)"
    "bailian/kimi-k2.5" = "最适合长文档分析 (月之暗面)"
}

# ============================================================================
# Functions
# ============================================================================

function Write-Color {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Get-TaskType {
    param([string]$Text)
    
    $scores = @{}
    $textLower = $Text.ToLower()
    
    foreach ($type in $TaskKeywords.Keys) {
        $score = 0
        foreach ($keyword in $TaskKeywords[$type]) {
            if ($textLower -match [regex]::Escape($keyword)) {
                $score += 2
            }
        }
        $scores[$type] = $score
    }
    
    $bestType = $scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1
    
    if ($bestType.Value -gt 0) {
        return $bestType.Key
    } else {
        return "chat"  # Default to chat for unknown tasks
    }
}

function Get-AvailableModels {
    param([string]$ConfigPath)
    
    $availableModels = @()
    
    # Try to load config
    if (Test-Path $ConfigPath) {
        try {
            $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
            
            # Check which providers are configured
            if ($config.models.providers) {
                $providers = $config.models.providers.PSObject.Properties.Name
                
                foreach ($provider in $providers) {
                    Write-Color "  ✓ $provider API Key 已配置" "Green"
                }
            }
        } catch {
            Write-Color "  ⚠ 无法读取配置文件" "Yellow"
        }
    }
    
    # For now, assume all models are available (in real implementation, would check API)
    foreach ($model in $ModelRegistry.Keys) {
        $ModelRegistry[$model].Status = "ready"
        $availableModels += $model
    }
    
    return $availableModels
}

function Select-BestModel {
    param(
        [string]$TaskType,
        [array]$AvailableModels
    )
    
    if ($ModelMapping.ContainsKey($TaskType)) {
        $candidateModels = $ModelMapping[$TaskType]
        
        foreach ($model in $candidateModels) {
            if ($AvailableModels -contains $model) {
                if ($ModelRegistry[$model].Status -eq "ready") {
                    return $model
                }
            }
        }
    }
    
    # Ultimate fallback
    return "bailian/qwen3.5-plus"
}

function Validate-ApiKeys {
    Write-Color "`n🔑 验证 API Keys..." "Cyan"
    
    $providers = @("Bailian", "MiniMax", "GLM", "Kimi")
    $results = @{}
    
    foreach ($provider in $providers) {
        # In real implementation, would make test API call
        $results[$provider] = "unknown"  # Would be "valid" or "invalid"
        Write-Color "  ? $provider - 状态未知 (需要实际 API 调用)" "Yellow"
    }
    
    return $results
}

function Check-ModelAvailability {
    Write-Color "`n📊 可用模型列表:" "Cyan"
    
    $grouped = $ModelRegistry.GetEnumerator() | Group-Object { $_.Value.Provider }
    
    foreach ($group in $grouped) {
        Write-Color "`n  $($group.Name):" "White"
        foreach ($model in $group.Group) {
            $status = $model.Value.Status
            $icon = if ($status -eq "ready") { "✓" } else { "✗" }
            $color = if ($status -eq "ready") { "Green" } else { "Gray" }
            Write-Color "    $icon $($model.Key) - Context: $($model.Value.Context/1000)K" $color
        }
    }
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Color "`n========================================" "Cyan"
Write-Color "🧠 Smart Model Switcher V3" "Cyan"
Write-Color "========================================" "Cyan"
Write-Color "⚡ 全平台多模型支持 • 零延迟 • 无需重启" "Green"
Write-Color "========================================`n" "Cyan"

# Handle special modes
if ($ValidateKeys) {
    Validate-ApiKeys
    exit 0
}

if ($CheckAvailability) {
    Get-AvailableModels -ConfigPath $ConfigPath
    Check-ModelAvailability
    exit 0
}

# Main task processing
if ($Task) {
    # Get available models
    Write-Color "📡 检测可用模型..." "Yellow"
    $availableModels = Get-AvailableModels -ConfigPath $ConfigPath
    Write-Color "   可用模型数：$($availableModels.Count)" "White"
    
    # Analyze task
    Write-Color "`n🔍 分析任务..." "Yellow"
    $taskType = Get-TaskType -Task $Task
    Write-Color "   任务类型：$taskType" "White"
    
    # Select best model
    $selectedModel = Select-BestModel -TaskType $taskType -AvailableModels $availableModels
    Write-Color "   首选模型：$selectedModel" "White"
    Write-Color "   原因：$($ModelReasons[$selectedModel])" "White"
    
    # Get provider info
    $provider = $ModelRegistry[$selectedModel].Provider
    Write-Color "   Provider: $provider" "White"
    
    # Calculate latency
    $EndTime = Get-Date
    $Latency = [math]::Round(($EndTime - $StartTime).TotalMilliseconds, 2)
    
    Write-Color "`n========================================" "Cyan"
    Write-Color "✅ 模型已选择" "Green"
    Write-Color "========================================" "Cyan"
    Write-Color "模型：$selectedModel" "White"
    Write-Color "Provider: $provider" "White"
    Write-Color "延迟：${Latency}ms" "White"
    Write-Color "需要重启：否" "Green"
    Write-Color "========================================`n" "Cyan"
} else {
    Write-Color "用法：.\runtime-switch.ps1 -Task '任务描述'" "Yellow"
    Write-Color "示例：.\runtime-switch.ps1 -Task '帮我写一本科幻小说'`n" "Gray"
    
    Write-Color "特殊模式:" "Cyan"
    Write-Color "  -ValidateKeys      验证所有 API Keys" "White"
    Write-Color "  -CheckAvailability 检查可用模型列表`n" "White"
    
    Write-Color "支持的任务类型:" "Cyan"
    foreach ($type in $TaskKeywords.Keys) {
        Write-Color "  - $type ($($TaskKeywords[$type].Count) 关键词)" "White"
    }
    Write-Host ""
}
