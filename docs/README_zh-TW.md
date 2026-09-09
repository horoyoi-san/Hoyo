# March7thHoney

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20Linux%20%7C%20macOS-2ea44f" alt="Platform" />
  <img src="https://img.shields.io/badge/狀態-持續開發-f39c12" alt="Status" />
  <img src="https://img.shields.io/badge/授權-GPLv3-blue" alt="License" />
</p>

March7thHoney 是一個基於 .NET 10 的伺服器專案。
專案仍在持續開發中，功能會持續更新。

[EN](../README.md) | [简中](README_zh-CN.md) | [繁中](README_zh-TW.md) | [JP](README_ja-JP.md)

## 目錄

- [功能進度](#功能進度)
- [開發計畫](#開發計畫)
- [倉庫結構](#倉庫結構)
- [環境需求](#環境需求)
- [快速啟動](#快速啟動)
- [建置](#建置)
- [CI 產物](#ci-產物)
- [說明](#說明)
- [疑難排解](#疑難排解)
- [致謝](#致謝)

## 功能進度

| 模組 | 狀態 | 備註 |
|---|---|---|
| 商店系統 | 穩定 | 瀏覽與購買流程可用 |
| 編隊系統 | 穩定 | 隊伍切換與槽位調整可用 |
| 抽卡系統 | 穩定 | 完整抽卡與結果展示流程 |
| 戰鬥流程 | 穩定 | 核心戰鬥循環可遊玩 |
| 大世界場景 | 穩定 | 場景載入、互動、探索可用 |
| 角色養成 | 穩定 | 等級/突破基礎鏈路可用 |
| 任務系統 | 持續完善 | 主線與常規任務可推進，仍有邊緣問題 |
| 好友系統 | 穩定 | 核心展示與互動可用 |
| 異相仲裁 | 持續完善 | 已支援解鎖、挑戰、領獎主流程 |
| 挑戰玩法 | 持續完善 | 忘卻之庭 / 虛構敘事 / 末日幻影可玩 |
| 貨幣戰爭 | 持續完善 | 基礎流程已接入 |
| 成就系統 | 持續完善 | 大多數成就可追蹤與完成 |

詳細開發進度： [英文](GameplayImplementationTree.md) | [簡中](GameplayImplementationTree_zh-CN.md) | [繁中](GameplayImplementationTree_zh-TW.md) | [日文](GameplayImplementationTree_ja-JP.md)

## Muip API 入口

- Muip API 文件： [英文](MuipAPI.md) | [簡中](MuipAPI_zh-CN.md) | [繁中](MuipAPI_zh-TW.md) | [日文](MuipAPI_ja-JP.md)

## 開發計畫

1. 持續完善差分宇宙與高複雜玩法鏈路。
2. 補齊剩餘任務與特殊觸發邏輯。
3. 提升結算與同步在邊緣場景下的穩定性。
4. 擴展活動玩法覆蓋範圍。
5. 持續修復 UI 與狀態同步問題。
6. 增加更多可配置選項。

## 倉庫結構

- `Program/` 啟動入口與整體編排
- `GameServer/` 遊戲邏輯、封包處理、執行期管理器
- `WebServer/` 分發與 HTTP 服務
- `Command/` 指令系統實作
- `Common/` 共用資料模型、設定、列舉、資料庫實體
- `Config/` 執行資源與自訂資料
- `docs/` 多語系文件與 API 文件

## 環境需求

- .NET SDK 10
- Git
- Windows、Linux 或 macOS（`x64` / `arm64`）

## 快速啟動

```bash
git clone --recurse-submodules https://github.com/Mar7thLover/March7thHoney.git
cd March7thHoney
dotnet restore
dotnet run --project program
```

## 建置

```bash
dotnet build program/program.csproj -c Release
```

## CI 產物

目前工作流程發佈以下自包含建置：

| 執行時 | 產物名稱 |
|---|---|
| `win-x64` | `March7thHoney-win-x64` |
| `linux-x64` | `March7thHoney-linux-x64` |
| `linux-arm64` | `March7thHoney-linux-arm64` |

<details>
<summary>手動發佈說明</summary>

- 在 Actions 儲存配額緊張時，建議僅手動觸發上傳產物。
- 若配額超限，請清理歷史產物或等待平台重新計算用量。

</details>

## 說明

- 拉取新提交後若行為異常，建議先清理快取/執行資料，再以新帳號重測。
- 部分模組仍在重構中，文件與實際封包行為可能存在短期落差。

## 疑難排解

- 先檢查你設定的日誌目錄輸出。
- 常見問題可先嘗試 `/scene reload`。
- 社群支援：<https://discord.gg/xRtZsmHBVj>

## 致謝

### 協作者

- [Mar7thLover](https://github.com/Mar7thLover)
- [Cyrup](https://github.com/March7thHoney)
- [Melioli](https://github.com/Melioli)

### 貢獻者

- [Yuki](https://github.com/Yuki8859)
- [Cyt](https://github.com/qinfyy)

### 相關專案

- [SqlSugar](https://github.com/donet5/SqlSugar)
- [LunarCore](https://github.com/Melledy/LunarCore)
- [DanhengServer](https://github.com/Mar7thLover/DanhengServer-OpenSource)
