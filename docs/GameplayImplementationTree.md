# Gameplay Development Progress Tree

[EN](GameplayImplementationTree.md) | [简中](GameplayImplementationTree_zh-CN.md) | [繁中](GameplayImplementationTree_zh-TW.md) | [JP](GameplayImplementationTree_ja-JP.md)
[Multilingual Name Mapping](GameplayModuleNameMap.md)

Legend:
- [x] Implemented (core flow works)
- [ ] Not completed / not fully wired

- [x] Login & Session
  - [x] Account login
  - [x] Key exchange and session bootstrap
  - [x] Auto-register (when enabled)

- [x] Player Core
  - [x] Base profile sync
  - [x] Level/EXP/stamina baseline logic

- [x] Inventory & Items
  - [x] Add/remove/use item
  - [x] Relic / Light Cone inventory operations
  - [x] Sync pipeline (with ongoing edge-case fixes)

- [x] Character System
  - [x] Character obtain / level / promotion
  - [x] Skill tree unlock/upgrade
  - [x] Multi-path processing

- [x] Team Setup
  - [x] Switch lineup
  - [x] Deploy/undeploy avatars

- [x] Combat Core
  - [x] Enter battle
  - [x] Settle and result sync

- [x] World Scene
  - [x] Scene switch/reload
  - [x] Basic entity/prop interaction

- [x] Social Core
  - [x] Mail
  - [x] Friend
  - [x] Chat/Message
  - [x] Player board / phone basics

- [x] Warp/Gacha
  - [x] Warp request/result
  - [x] Basic pool/data support

- [ ] Missions & Quests
  - [ ] Mission full edge coverage
  - [ ] Quest special conditions
  - [ ] StoryLine branch completeness

- [x] Challenge Modes
  - [x] Challenge (FH/PF/AS family)
  - [x] Anomaly Arbitration
  - [ ] Combat Tutorial full feature coverage

- [ ] Simulated Universe Family
  - [ ] Base 
  - [ ] Divergent Universe 
  - [ ] Unknowable Domain 

- [ ] Currency War
  - [x] Core match flow
  - [x] Shop buy/refresh/sell baseline
  - [x] Orb use baseline
  - [ ] Full parity for all edge rules

- [ ] Event Modules
  - [ ] Activity umbrella full coverage
  - [ ] Aetherium Wars
  - [ ] Embers Collection
  - [ ] Permanent Chronicle
  - [ ] Fate
  - [ ] March 7th Sword Training
  - [ ] Party Car
  - [ ] Cat Cake Catch
  - [ ] RollShop
  - [ ] MapRotation
  - [ ] Clockie Trick
  - [ ] TreasureDungeon / Raid complete flow

- [x] Project-specific Extensions
  - [x] Muip API (`/muip/*`)
  - [x] Freesr sync API (`/sr-tools`, `/sr-tools-export`)
  - [x] Extended admin commands (`/json`, `/grid`, `/calyx`, etc.)

