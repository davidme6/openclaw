---
name: smart-model-switcher
description: Automatically select and switch to the best available model for each task. Uses only models from the user's purchased plan (Coding Plan). Analyzes task type and selects optimal model: writing→qwen3.5-plus, coding→qwen3-coder-plus, reasoning→qwen3-max, etc. Always uses the strongest available model within the user's plan.
---

# 🧠 Smart Model Switcher

Automatically selects the best model for each task from your purchased plan.

## 🎯 Core Features

1. **Task Analysis** - Analyze what type of task you're doing
2. **Auto Selection** - Select the strongest model for that task
3. **Plan-Aware** - Only uses models from your purchased plan
4. **Auto Update** - Adapts when new models are added to your plan
5. **Transparent** - Always tells you which model it's using and why

## 📊 Model Selection Matrix

| Task Type | Best Model | Why |
|-----------|-----------|-----|
| **写小说/创意写作** | qwen3.5-plus | 1M 上下文，文笔流畅 |
| **写代码/编程** | qwen3-coder-plus | 代码能力最强 |
| **复杂推理/数学** | qwen3-max | 推理能力最强 |
| **数据分析** | qwen3.5-plus | 长上下文，分析全面 |
| **日常对话** | qwen3.5-plus | 平衡性能和速度 |
| **长文档处理** | qwen3.5-plus | 1M 上下文无敌 |
| **Debug/修复** | qwen3-coder-plus | 代码理解最强 |
| **翻译** | qwen3.5-plus | 多语言支持好 |

## 🔄 How It Works

```
1. User makes a request
   ↓
2. Analyze task type (writing/coding/reasoning/etc.)
   ↓
3. Check available models in user's plan
   ↓
4. Select strongest model for this task
   ↓
5. Switch to that model automatically
   ↓
6. Complete task and inform user
```

## 📋 Usage Examples

**User:** "帮我写一本科幻小说"
**Agent:** "🧠 已切换到 qwen3.5-plus（写小说最强）"

**User:** "帮我写个 Python 爬虫"
**Agent:** "🧠 已切换到 qwen3-coder-plus（写代码最强）"

**User:** "这道数学题怎么做？"
**Agent:** "🧠 已切换到 qwen3-max（推理最强）"

**User:** "分析这个 10 万字的文档"
**Agent:** "🧠 已切换到 qwen3.5-plus（1M 上下文，处理长文档最强）"

## ⚙️ Configuration

### Plan Detection

Automatically detects your plan:
- **Coding Plan** → Uses coding.dashscope.aliyuncs.com models
- **Standard Plan** → Uses dashscope.aliyuncs.com models
- **Custom Plan** → Uses configured models

### Model Priority

Models are ranked by capability for each task type. The skill always selects the highest-ranked available model.

## ⚠️ Limitations

| Limitation | Explanation |
|------------|-------------|
| **Plan-Bound** | Only uses models from your purchased plan |
| **No External** | Won't call models outside your plan |
| **Auto-Update** | Adapts when plan changes or new models added |
| **Transparent** | Always tells you which model it's using |

## 🔧 Technical Details

### Task Classification

| Category | Keywords | Model |
|----------|----------|-------|
| **Writing** | 小说，故事，文章，写作，创作 | qwen3.5-plus |
| **Coding** | 代码，编程，python,js,函数，类 | qwen3-coder-plus |
| **Reasoning** | 推理，数学，逻辑，证明，计算 | qwen3-max |
| **Analysis** | 分析，数据，统计，报告 | qwen3.5-plus |
| **Translation** | 翻译，translate，英文，中文 | qwen3.5-plus |
| **Debug** | 修复，bug，错误，异常 | qwen3-coder-plus |
| **Long-Context** | 长文档，万字，10 万，100 万 | qwen3.5-plus |

### Fallback Logic

If preferred model is unavailable:
1. Try next best model for task
2. Continue until available model found
3. Inform user of fallback

## 📈 Benefits

| Benefit | Description |
|---------|-------------|
| **Always Optimal** | Always uses best model for task |
| **Cost-Effective** | Maximizes value of your plan |
| **No Manual Switch** | No need to manually switch models |
| **Future-Proof** | Auto-adapts to new models |
| **Transparent** | Always tells you what it's doing |

## 🎯 Example Workflow

```
User: "帮我写个贪吃蛇游戏，然后用中文写个游戏说明"

Agent Analysis:
1. "写贪吃蛇游戏" → Coding → qwen3-coder-plus
2. "写游戏说明" → Writing → qwen3.5-plus

Agent Response:
"🧠 已切换到 qwen3-coder-plus（写代码最强）
[写完代码后]
🧠 已切换到 qwen3.5-plus（写小说/文章最强）
[写完说明后]
✅ 完成！"
```

## 📝 Related Skills

- `self-improving` - Learns from mistakes
- `fanqie-auto-reader` - Reads and analyzes novels
- `github-auto-uploader` - Uploads to GitHub

## 🆘 Troubleshooting

**Q: Why didn't it switch models?**
A: Check if the preferred model is in your plan.

**Q: Can I override the selection?**
A: Yes, manually specify a model and it will use that.

**Q: How do I know which model is being used?**
A: It always tells you at the start of each task.

## 📞 Support

- GitHub: https://github.com/davidme6/tomato-novel-private
- Issues: Report bugs or suggest improvements

---

**Version:** 1.0.0
**Author:** Created for Coding Plan users
**License:** MIT
