# March7thHoney

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20Linux%20%7C%20macOS-2ea44f" alt="Platform" />
  <img src="https://img.shields.io/badge/状态-持续开发-f39c12" alt="Status" />
  <img src="https://img.shields.io/badge/许可证-GPLv3-blue" alt="License" />
</p>

March7thHoney 是一个基于 .NET 10 的服务器项目。
项目仍在持续开发中，功能会持续更新。

[EN](../README.md) | [简中](README_zh-CN.md) | [繁中](README_zh-TW.md) | [JP](README_ja-JP.md)

## 目录

- [功能进度](#功能进度)
- [开发计划](#开发计划)
- [仓库结构](#仓库结构)
- [环境要求](#环境要求)
- [快速启动](#快速启动)
- [构建](#构建)
- [产物](#产物)
- [说明](#说明)
- [故障排查](#故障排查)
- [致谢](#致谢)

## 功能进度

| 模块 | 状态 | 备注 |
|---|---|---|
| 商店系统 | 稳定 | 浏览与购买流程可用 |
| 编队系统 | 稳定 | 队伍切换与槽位调整可用 |
| 抽卡系统 | 稳定 | 完整抽卡与结果展示流程 |
| 战斗流程 | 稳定 | 核心战斗循环可游玩 |
| 大世界场景 | 稳定 | 场景加载、交互、探索可用 |
| 角色养成 | 稳定 | 等级/突破基础链路可用 |
| 任务系统 | 持续完善 | 主线与常规任务可推进 |
| 好友系统 | 稳定 | 核心展示与交互可用 |
| 异相仲裁 | 稳定 | 已支持解锁、挑战、领奖主流程 |
| 挑战玩法 | 稳定 | 忘却之庭 / 虚构叙事 / 末日幻影可玩 |
| 货币战争 | 持续完善 | 基础流程已接入 |
| 成就系统 | 稳定 | 大多数成就可追踪与完成 |

详细开发进度： [英文](GameplayImplementationTree.md) | [简中](GameplayImplementationTree_zh-CN.md) | [繁中](GameplayImplementationTree_zh-TW.md) | [日文](GameplayImplementationTree_ja-JP.md)

## Muip API 入口

- Muip API 文档： [英文](MuipAPI.md) | [简中](MuipAPI_zh-CN.md) | [繁中](MuipAPI_zh-TW.md) | [日文](MuipAPI_ja-JP.md)

## 开发计划

1. 持续完善差分宇宙与高复杂玩法链路。
2. 补全剩余任务与特殊触发逻辑。
3. 提升结算和同步在边缘场景下的稳定性。
4. 扩展活动玩法覆盖范围。
5. 持续修复 UI 与状态同步问题。
6. 增加更多可配置项。

## 仓库结构

- `Program/` 启动入口与整体编排
- `GameServer/` 游戏逻辑、协议处理、运行时管理器
- `WebServer/` 分发与 HTTP 服务
- `Command/` 命令系统实现
- `Common/` 共享数据模型、配置、枚举、数据库实体
- `Config/` 运行资源与自定义数据
- `docs/` 多语言文档与 API 文档

## 环境要求

- .NET SDK 10
- Git
- Windows、Linux 或 macOS（`x64` / `arm64`）

## 快速启动

```bash
git clone --recurse-submodules https://github.com/Mar7thLover/March7thHoney.git
cd March7thHoney
dotnet restore
dotnet run --project program
```

## 构建

```bash
dotnet build program/program.csproj -c Release
```

## CI 产物

当前工作流发布以下自包含构建：

| 运行时 | 产物名 |
|---|---|
| `win-x64` | `March7thHoney-win-x64` |
| `linux-x64` | `March7thHoney-linux-x64` |
| `linux-arm64` | `March7thHoney-linux-arm64` |

<details>
<summary>手动发布说明</summary>

- 在 Actions 存储配额紧张时，建议仅手动触发上传产物。
- 如果配额超限，请清理历史产物或等待平台重新计算用量。

</details>

## 说明

- 拉取新提交后若出现行为异常，建议先清理缓存/运行数据，再用新账号复测。
- 部分模块仍在重构中，文档与实际协议行为可能存在短期差异。

## 故障排查

- 先检查你配置的日志目录输出。
- 常见问题可先尝试 `/scene reload`。
- 社区支持：<https://discord.gg/castoriceps>

## 致谢

### 协作者

- [Mar7thLover](https://github.com/Mar7thLover)
- [Cyrup](https://github.com/March7thHoney)
- [Melioli](https://github.com/Melioli)

### 贡献者

- [Yuki](https://github.com/Yuki8859)
- [Cyt](https://github.com/qinfyy)

### 相关项目

- [SqlSugar](https://github.com/donet5/SqlSugar)
- [LunarCore](https://github.com/Melledy/LunarCore)
- [DanhengServer](https://github.com/Mar7thLover/DanhengServer-OpenSource)
