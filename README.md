# OpenClaw Skills by davidme6

🧠 为 OpenClaw 开发的高质量技能集合

## 📦 已发布的 Skills

| Skill | 版本 | 描述 | ClawHub |
|-------|------|------|---------|
| **smart-model-switcher-v3** | 3.0.0 | 全平台多模型智能切换工具 | [ClawHub](https://clawhub.com/skills/smart-model-switcher-v3) |
| smart-model-switcher-v2 | 2.0.0 | 优化的智能模型切换 (Qwen 系列) | [ClawHub](https://clawhub.com/skills/smart-model-switcher-v2) |

## 🚀 快速开始

### 安装 Skill

使用 ClawHub CLI:

```bash
# 安装 smart-model-switcher-v3
npx skills add davidme6/openclaw@smart-model-switcher-v3
```

或手动安装:

```bash
git clone https://github.com/davidme6/openclaw.git
cp -r openclaw/skills/smart-model-switcher-v3 ~/.openclaw/workspace/skills/
openclaw gateway restart
```

## 📁 目录结构

```
openclaw/
├── skills/
│   └── smart-model-switcher-v3/
│       ├── SKILL.md              # OpenClaw 技能定义
│       ├── README.md             # 使用文档
│       ├── LICENSE               # MIT 许可证
│       ├── _meta.json            # ClawHub 元数据
│       └── scripts/
│           ├── runtime-switch.ps1    # 运行时切换脚本
│           └── auto-monitor.ps1      # 后台监控服务
└── README.md                   # 本文件
```

## 🛠️ 开发 Skills

想开发自己的 Skill？参考：

1. [OpenClaw Skill Creator 文档](https://docs.openclaw.ai/skills/creating)
2. [ClawHub 发布指南](https://clawhub.com/publish)

## 📄 许可证

所有 Skills 均采用 MIT 许可证 - 详见各 Skill 目录下的 LICENSE 文件

## 👨‍ 作者

**davidme6**

- GitHub: [@davidme6](https://github.com/davidme6)
- ClawHub: [@davidme6](https://clawhub.com/@davidme6)

## 🙏 致谢

感谢 OpenClaw 团队提供的优秀框架！

---

**Happy Coding!** 🚀
