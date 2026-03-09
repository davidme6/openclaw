# Tomato Novel Writer - Auto Writing Script
# Generates novel chapters based on genre and market data

param(
    [string]$Genre = "玄幻",
    [string]$Theme = "",
    [int]$ChapterNum = 1,
    [int]$WordCount = 2000,
    [string]$OutputPath = "$env:USERPROFILE\.openclaw\tomato-novel\drafts"
)

# Create output directory
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Genre templates
$GenreTemplates = @{
    "玄幻" = @{
        Opening = "苍穹大陆，强者为尊。少年@NAME@自幼经脉闭塞，被族人嘲笑为废物。"
        Conflict = "然而，一次意外中，@NAME@获得神秘系统，从此踏上逆天改命之路。"
        Climax = ""今日，我便要让这天地，因我而颤抖！""
    }
    "都市" = @{
        Opening = "@NAME@，一个普通的程序员，每天过着 996 的生活。"
        Conflict = "直到那天，他意外激活了【神豪系统】，从此人生彻底改变。"
        Climax = ""钱？对我来说，只是一串数字而已。""
    }
    "言情" = @{
        Opening = "@NAME@从未想过，会在这种场合再次遇见他。"
        Conflict = "五年前，他不告而别。五年后，他却成了她的顶头上司。"
        Climax = ""这一次，我不会再让你离开。""
    }
    "悬疑" = @{
        Opening = "雨夜，废弃的工厂里，一具尸体静静躺在血泊中。"
        Conflict = "@NAME@作为刑侦队长，敏锐地察觉到这不是普通的谋杀案。"
        Climax = ""真相，往往比谎言更可怕。""
    }
}

# Generate character name
function Get-CharacterName {
    $Surnames = @("林", "叶", "萧", "楚", "秦", "苏", "陆", "顾", "沈", "白")
    $Names = @("凡", "尘", "风", "云", "天", "辰", "逸", "轩", "浩", "宇")
    return $Surnames[(Get-Random -Maximum $Surnames.Length)] + $Names[(Get-Random -Maximum $Names.Length)]
}

# Generate chapter content
function Write-Chapter {
    param(
        [string]$Genre,
        [int]$ChapterNum,
        [int]$WordCount
    )
    
    $CharacterName = Get-CharacterName
    $Template = $GenreTemplates[$Genre]
    
    $Content = @"
第$ChapterNum 章 $(Get-ChapterTitle -Genre $Genre -ChapterNum $ChapterNum)

$($Template.Openning.Replace('@NAME@', $CharacterName))

$(Generate-Body -Genre $Genre -WordCount ($WordCount / 2))

$($Template.Conflict.Replace('@NAME@', $CharacterName))

$(Generate-Body -Genre $Genre -WordCount ($WordCount / 2))

$($Template.Climax)

$(Generate-Cliffhanger -Genre $Genre)

"@
    
    return $Content
}

function Get-ChapterTitle {
    param([string]$Genre, [int]$ChapterNum)
    
    $Titles = @{
        "玄幻" = @("废物崛起", "系统觉醒", "逆天改命", "初露锋芒", "宗门大比")
        "都市" = @("神豪降临", "打脸时刻", "商业帝国", "美人倾心", "身份曝光")
        "言情" = @("重逢", "误会", "心动", "表白", "在一起")
        "悬疑" = @("第一具尸体", "关键线索", "嫌疑人", "真相逼近", "最终对决")
    }
    
    return $Titles[$Genre][($ChapterNum - 1) % $Titles[$Genre].Length]
}

function Generate-Body {
    param([string]$Genre, [int]$WordCount)
    
    # Generate filler content based on genre
    $Paragraphs = @()
    $ParagraphWords = 150
    
    for ($i = 0; $i -lt ($WordCount / $ParagraphWords); $i++) {
        $Paragraphs += Get-GenreParagraph -Genre $Genre
    }
    
    return $Paragraphs -join "`n`n"
}

function Get-GenreParagraph {
    param([string]$Genre)
    
    $Paragraphs = @{
        "玄幻" = @(
            "他深吸一口气，感受着体内涌动的力量。",
            "周围的空气仿佛都因他的气势而凝固。",
            "这一步，他走了整整三年。",
            "从今往后，再无人敢轻视于他。",
            "天空中，雷云密布，似乎在预示着什么。"
        )
        "都市" = @(
            "他看着银行卡上的数字，嘴角露出一丝微笑。",
            "这一天，他等了太久。",
            "周围的人都用不可思议的眼神看着他。",
            "从今往后，他将站在巅峰。",
            "手机响起，是一个陌生号码。"
        )
        "言情" = @(
            "她的心跳不由自主地加快了。",
            "他的眼神深邃如海，让人捉摸不透。",
            "这一刻，时间仿佛静止了。",
            "有些话，终究还是没说出口。",
            "转身的那一刻，她的眼眶湿润了。"
        )
        "悬疑" = @(
            "现场没有留下任何指纹。",
            "这太不合常理了。",
            "他仔细检查着每一个细节。",
            "真相，似乎就在眼前。",
            "突然，他想到了一个关键问题。"
        )
    }
    
    return $Paragraphs[$Genre][(Get-Random -Maximum $Paragraphs[$Genre].Length)]
}

function Generate-Cliffhanger {
    param([string]$Genre)
    
    $Cliffhangers = @{
        "玄幻" = "就在@NAME@准备离开时，一个神秘的声音突然在他脑海中响起：`想变得更强吗？`"
        "都市" = "电话那头传来一个低沉的声音：`你父亲的事，我们知道真相。`"
        "言情" = "他转身离去，却没看到她手中紧握的那张孕检单。"
        "悬疑" = "当他翻开最后一页时，瞳孔猛地收缩——凶手竟然是..."
    }
    
    return $Cliffhangers[$Genre]
}

# Main execution
Write-Host "📝 正在创作第$ChapterNum 章..."
$Content = Write-Chapter -Genre $Genre -ChapterNum $ChapterNum -WordCount $WordCount

# Save to file
$FileName = "第$ChapterNum 章.txt"
$FilePath = Join-Path $OutputPath $FileName
$Content | Out-File -FilePath $FilePath -Encoding UTF8

Write-Host "✅ 章节已保存：$FilePath"
Write-Host "📊 字数：$($Content.Length) 字符"
