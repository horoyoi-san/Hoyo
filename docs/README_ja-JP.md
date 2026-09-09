# March7thHoney

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-2ea44f" alt="Platform" />
  <img src="https://img.shields.io/badge/Status-Active%20Development-f39c12" alt="Status" />
  <img src="https://img.shields.io/badge/License-GPLv3-blue" alt="License" />
</p>

March7thHoneyは、.NET 10をベースとしたサーバープロジェクトです。
このプロジェクトは現在も継続的に開発が進められており、新機能の追加やバグ修正が行われています。

[EN](../README.md) | [简中](README_zh-CN.md) | [繁中](README_zh-TW.md) | [JP](README_ja-JP.md)

## 目次

- [機能進捗](#機能進捗)
- [ロードマップ](#ロードマップ)
- [リポジトリ構成](#リポジトリ構成)
- [必要環境](#必要環境)
- [クイックスタート](#クイックスタート)
- [ビルド](#ビルド)
- [CI成果物](#ci成果物)
- [補足](#補足)
- [トラブルシューティング](#トラブルシューティング)
- [クレジット](#クレジット)

## 機能進捗

| モジュール | 状態 | メモ |
|---|---|---|
| ショップ | 安定 | 閲覧・購入フローに対応 |
| 編成 | 安定 | 編成切替・スロット変更に対応 |
| ガチャ | 安定 | 一連の抽選・表示フローに対応 |
| バトル | 安定 | コア戦闘ループはプレイ可能 |
| フィールド/シーン | 安定 | 読み込み・インタラクション・探索に対応 |
| キャラ育成 | 安定 | レベル/昇格の基本ループに対応 |
| クエスト | 改善中 | 進行可能だが一部エッジケースあり |
| フレンド | 安定 | 基本機能に対応 |
| 異相仲裁 | 安定 | 解放・挑戦・報酬受取に対応 |
| チャレンジ系 | 安定 | FH / PF / AS はプレイ可能 |
| 差分宇宙関連 | 改善中 | 基本フロー導入済み |
| 実績 | 安定 | 多くの実績に対応 |

詳細な開発進捗： [英語](GameplayImplementationTree.md) | [簡体字中国語](GameplayImplementationTree_zh-CN.md) | [繁体字中国語](GameplayImplementationTree_zh-TW.md) | [日本語](GameplayImplementationTree_ja-JP.md)

## Muip API 入口

- Muip API ドキュメント： [英語](MuipAPI.md) | [簡体字中国語](MuipAPI_zh-CN.md) | [繁体字中国語](MuipAPI_zh-TW.md) | [日本語](MuipAPI_ja-JP.md)

## ロードマップ

1. 差分宇宙と高複雑コンテンツの安定化。
2. 残タスクと特殊トリガー処理の補完。
3. 精算・同期の安定性をさらに改善。
4. イベント系コンテンツ対応範囲の拡張。
5. UI/状態同期の不整合を継続修正。
6. サーバー設定項目の拡充。

## リポジトリ構成

- `Program/` 起動エントリと全体オーケストレーション
- `GameServer/` ゲームロジック、パケット処理、ランタイム管理
- `WebServer/` ディスパッチ/HTTP サービス
- `Command/` コマンド実装
- `Common/` 共有データモデル、設定、列挙、DBエンティティ
- `Config/` 実行時リソースとカスタムデータ
- `docs/` 多言語ドキュメント/API

## 必要環境

- .NET SDK 10
- Git
- Windows、Linux または macOS（`x64` / `arm64`）

## クイックスタート

```bash
git clone --recurse-submodules https://github.com/Mar7thLover/March7thHoney.git
cd March7thHoney
dotnet restore
dotnet run --project program
```

## ビルド

```bash
dotnet build program/program.csproj -c Release
```

## CI成果物

現在のワークフローは以下の自己完結ビルドを出力します。

| ランタイム | 成果物名 |
|---|---|
| `win-x64` | `March7thHoney-win-x64` |
| `linux-x64` | `March7thHoney-linux-x64` |
| `linux-arm64` | `March7thHoney-linux-arm64` |

<details>
<summary>手動公開メモ</summary>

- Actions のストレージ逼迫時は手動実行時のみ成果物アップロードを推奨。
- 容量超過時は過去成果物の削除、または再計算待ちが必要です。

</details>

## 補足

- 更新後に挙動不整合が出る場合、まずキャッシュ/実行データを整理して再検証してください。
- 一部モジュールはリファクタ中のため、ドキュメントと実装に一時的な差分が出ることがあります。

## トラブルシューティング

- まず設定済みログ出力先を確認してください。
- よく使う復旧コマンドは `/scene reload`。
- コミュニティサポート: <https://discord.gg/castoriceps>

## クレジット

### 共同開発者

- [Mar7thLover](https://github.com/Mar7thLover)
- [Cyrup](https://github.com/March7thHoney)
- [Melioli](https://github.com/Melioli)

### 貢献者

- [Yuki](https://github.com/Yuki8859)
- [Cyt](https://github.com/qinfyy)

### 関連プロジェクト

- [SqlSugar](https://github.com/donet5/SqlSugar)
- [LunarCore](https://github.com/Melledy/LunarCore)
- [DanhengServer](https://github.com/Mar7thLover/DanhengServer-OpenSource)
