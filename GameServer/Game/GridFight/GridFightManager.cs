using March7thHoney.Data;
using March7thHoney.Enums.Avatar;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.GridFight.Battle;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.GridFight;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.GridFight;

public sealed partial class GridFightManager : BasePlayerManager
{
    private uint _nextSessionUniqueId = 1;
    private readonly Lazy<GridFightResourceCatalog> _catalog;
    private GridFightDamageSttInfo _lastBattleDamageStatistics = new();

    public GridFightResourceCatalog Catalog => _catalog.Value;
    public GridFightSession? Session { get; private set; }

    public GridFightManager(PlayerInstance player, Random? random = null) : base(player)
    {
        _catalog = new Lazy<GridFightResourceCatalog>(() =>
        {
            var catalog = new GridFightResourceCatalog(random);
            var errors = catalog.Validate();
            if (errors.Count > 0) throw new InvalidDataException(string.Join("; ", errors));
            return catalog;
        });
    }

    public bool Start(uint season, uint divisionId, bool isOverlock)
    {
        if (season != Catalog.CurrentSeason ||
            !GameData.GridFightDivisionInfoData.TryGetValue(divisionId, out var division) ||
            division.SeasonID != season)
            return false;
        Session = new GridFightSession(Catalog, season, divisionId, isOverlock, _nextSessionUniqueId++);
        _lastBattleDamageStatistics = new GridFightDamageSttInfo();
        return true;
    }

    public void ClearSession()
    {
        Session = null;
        _lastBattleDamageStatistics = new GridFightDamageSttInfo();
    }

    public GridFightSystemInfo BuildSystemInfo()
    {
        var handbook = new GridFightHandBookInfo
        {
            MonsterInfo = new GridFightHandBookMonsterInfo(),
            RoleInfo = new GridFightHandBookRoleInfo(),
            AugmentInfo = new GridFightHandBookAugmentInfo(),
            PortalInfo = new GridFightHandBookPortalInfo(),
            EquipInfo = new GridFightHandBookEquipInfo(),
        };
        handbook.MonsterInfo.MonsterIdList.Add(GameData.GridFightCampData.Values
            .Where(row => row.SeasonID == Catalog.CurrentSeason)
            .Select(row => row.ID)
            .Order());
        handbook.RoleInfo.RoleIdList.Add(GameData.GridFightRoleBasicInfoData.Values
            .Where(row => row.SeasonID == Catalog.CurrentSeason && row.IsInBook)
            .Select(row => row.ID)
            .Order());
        handbook.AugmentInfo.SeenAugmentIdList.Add(Catalog.AugmentPool);
        handbook.AugmentInfo.UnlockedAugmentIdList.Add(Catalog.AugmentPool);
        var portalIds = GameData.GridFightPortalBuffData.Values
            .Where(row => row.IfInBook)
            .Select(row => row.ID)
            .Order()
            .ToList();
        handbook.PortalInfo.SeenPortalIdList.Add(portalIds);
        handbook.PortalInfo.UnlockedPortalIdList.Add(portalIds);
        handbook.EquipInfo.GridFightItemList.Add(GameData.GridFightEquipmentData.Keys.Order());

        var seasonTalent = new GridFightTalentInfo();
        seasonTalent.TalentIdList.Add(GameData.GridFightSeasonTalentData.Values
            .Where(row => row.SeasonID == Catalog.CurrentSeason)
            .Select(row => row.ID)
            .Order());
        var permanentTalent = new GridFightTalentInfo();
        permanentTalent.TalentIdList.Add(GameData.GridFightTalentData.Keys.Order());

        return new GridFightSystemInfo
        {
            StaticInfo = new GridFightStaticGameInfo
            {
                Exp = new GridFightSeasonExpInfo
                {
                    Exp = Catalog.SeasonExpLimit,
                },
                TutorialCompletion = Catalog.TutorialCompletion,
                Handbook = handbook,
                DivisionId = Catalog.HighestDivision.ID,
                Season = Catalog.CurrentSeason,
                SubSeason = Catalog.CurrentSubSeason,
                SeasonTalent = seasonTalent,
            },
            PermanentInfo = new GridFightPermanentGameInfo
            {
                Talent = permanentTalent,
            },
        };
    }

    public GridFightCurrentInfo? BuildCurrentInfo()
    {
        var session = Session;
        if (session == null) return null;
        var current = new GridFightCurrentInfo
        {
            GameData = BuildGameData(),
            IsOverlock = session.IsOverlock,
            DivisionId = session.DivisionId,
            Season = session.Season,
            UniqueId = session.UniqueId,
            ContextData = new GridFightContextData(),
        };
        current.ContextData.InitialEquipmentIdList.Add(Catalog.InitialEquipmentIds);
        var pending = BuildPendingAction();
        if (pending != null) current.PendingAction = pending;
        current.GameInfoList.Add(BuildBasicInfo(pending != null));
        current.GameInfoList.Add(new GridFightGameInfo { TeamInfo = BuildTeamInfo() });
        current.GameInfoList.Add(new GridFightGameInfo { ItemsInfo = BuildItemsInfo() });
        current.GameInfoList.Add(new GridFightGameInfo { ShopInfo = BuildShopInfo() });
        current.GameInfoList.Add(new GridFightGameInfo { OrbInfo = BuildOrbInfo() });
        current.GameInfoList.Add(new GridFightGameInfo { LevelInfo = BuildLevelInfo() });
        var augmentInfo = new GridFightGameAugmentSync();
        augmentInfo.SyncAugmentInfo.Add(session.ActiveInvestmentIds.Select(BuildInvestment));
        current.GameInfoList.Add(new GridFightGameInfo { AugmentInfo = augmentInfo });
        current.GameInfoList.Add(new GridFightGameInfo { TraitInfo = BuildGameTraitInfo() });
        current.GameInfoList.Add(new GridFightGameInfo());
        current.GameInfoList.Add(new GridFightGameInfo
        {
            ContextValueInfo = new GridFightContextValueInfo { ContextValueVersion = 97 },
        });
        current.GameInfoList.Add(new GridFightGameInfo { PrayQuestInfo = new GridFightPrayQuestInfo() });
        return current;
    }

    public GridFightSettleNotify BuildSettleNotify(GridFightSettleReason reason)
    {
        var session = Session ?? throw new InvalidOperationException("GridFight session is not active");
        var context = new GridFightContextData();
        context.InitialEquipmentIdList.Add(Catalog.InitialEquipmentIds);

        var avatars = new GridFightSettleAvatarInfo();
        avatars.GridFightAvatarList.Add(session.Roles
            .Select(role => role.RoleId)
            .Distinct()
            .Order());

        var bosses = new GridFightBossInfo();
        bosses.MonsterList.Add(session.Bosses.Select(monster => new GridFightMonsterInfo
        {
            MonsterId = monster.MonsterID,
            RoleStar = 1,
        }));

        var finish = new GridFightFinishInfo
        {
            Reason = reason,
            ContextData = context,
            AvatarInfo = avatars,
            IsOverlock = session.IsOverlock,
            SettleRank = reason == GridFightSettleReason.Victory
                ? Catalog.GetSettleRank(session.LineupHp)
                : Catalog.GetMinimumSettleRank(),
            Basic = new GridFightSettleBasicInfo
            {
                RouteId = Catalog.StandardRouteId,
                ChapterId = session.ChapterId,
                SectionId = session.SectionId,
                DivisionId = session.DivisionId,
                LineupHp = session.LineupHp,
                MaxLineupHp = session.MaxLineupHp,
                BattlesFinished = session.BattlesFinished,
            },
            BossInfo = bosses,
        };
        finish.AffixInfoList.Add(session.AffixIds.Select(id => new GridFightAffixInfo { AffixId = id }));
        finish.GridGameRoleList.Add(session.Roles
            .OrderBy(role => role.Position)
            .ThenBy(role => role.UniqueId)
            .Select(BuildRole));
        finish.GridFightEquipmentList.Add(session.Equipments
            .OrderBy(equipment => equipment.UniqueId)
            .Select(BuildEquipment));
        finish.GridFightTraitInfo.Add(BuildGameTraitInfo().GridFightTraitInfo);
        finish.SyncAugmentInfo.Add(session.ActiveInvestmentIds.Select(BuildInvestment));
        finish.RoleStatistics.Add(_lastBattleDamageStatistics.RoleStatistics.Select(row => row.Clone()));
        finish.TraitStatistics.Add(_lastBattleDamageStatistics.TraitStatistics.Select(row => row.Clone()));
        finish.AugmentStatistics.Add(_lastBattleDamageStatistics.AugmentStatistics.Select(row => row.Clone()));
        if (session.SelectedPortalId != 0)
            finish.PortalBuffInfoList.Add(new GridFightGamePortalBuffInfo
            {
                PortalBuffId = session.SelectedPortalId,
            });

        return new GridFightSettleNotify
        {
            DivisionId = session.DivisionId,
            HighestDivisionId = Catalog.HighestDivision.ID,
            SeasonExp = Catalog.SeasonExpLimit,
            FinishInfo = finish,
        };
    }

    private GridFightGameData BuildGameData()
    {
        var levelProgression = new GridFightPlayerLevelProgressionInfo();
        foreach (var row in GameData.GridFightPlayerLevelData.Values.OrderBy(row => row.PlayerLevel))
            levelProgression.LevelUpExpByLevel[row.PlayerLevel] = row.LevelUpExp;

        var data = new GridFightGameData();
        data.GameItemList.Add(new GridFightGameItemInfo
        {
            UniqueId = 4,
            EmptyInfo = new GridFightEmptyGameItemInfo(),
            Descriptor_ = BuildGameItemDescriptor(GridFightGameItemCategory.Type105, 10101),
        });
        data.GameItemList.Add(new GridFightGameItemInfo
        {
            UniqueId = 8,
            PlayerLevelProgression = levelProgression,
            Descriptor_ = BuildGameItemDescriptor(GridFightGameItemCategory.Type105, 10601),
        });
        data.GameItemList.Add(new GridFightGameItemInfo
        {
            UniqueId = 9,
            RoleHistoryInfo = new GridFightRoleHistoryInfo(),
            Descriptor_ = BuildGameItemDescriptor(GridFightGameItemCategory.Type5, 0),
        });
        data.GameItemList.Add(new GridFightGameItemInfo
        {
            UniqueId = 19,
            SingleValueInfo = new GridFightSingleValueItemInfo(),
            Descriptor_ = BuildGameItemDescriptor(GridFightGameItemCategory.Type111, 8009),
        });
        data.GameItemList.Add(new GridFightGameItemInfo
        {
            UniqueId = 56,
            CountInfo = new GridFightCountItemInfo { Count = 2 },
            Descriptor_ = BuildGameItemDescriptor(GridFightGameItemCategory.Type107, 3011),
        });
        data.GameItemList.Add(new GridFightGameItemInfo
        {
            UniqueId = 94,
            CountInfo = new GridFightCountItemInfo { Count = 1 },
            Descriptor_ = BuildGameItemDescriptor(GridFightGameItemCategory.Type107, 4061),
        });
        if (Session?.HackConsole is { } hackConsole)
            data.GameItemList.Add(BuildHackConsoleItem(hackConsole));
        return data;
    }

    private static GridFightGameItemDescriptor BuildGameItemDescriptor(GridFightGameItemCategory category, uint parameter)
    {
        var descriptor = new GridFightGameItemDescriptor { Category = category };
        descriptor.ParameterList.Add(parameter);
        return descriptor;
    }

    public GridFightPendingAction? BuildPendingAction()
    {
        var session = Session;
        if (session == null) return null;
        if (session.EquipmentRecommendation is { } recommendation)
        {
            var action = new GridFightRecommendEquipmentActionInfo();
            action.EquipmentIdList.Add(recommendation.EquipmentIds);
            return new GridFightPendingAction
            {
                QueuePosition = recommendation.QueuePosition,
                RecommendEquipmentAction = action,
            };
        }
        if (session.TraitEffectSelectEnhanceQueuePosition is { } traitQueuePosition)
        {
            var action = new GridFightTraitEffectSelectEnhanceActionInfo
            {
                TraitId = GridFightSpecialFeatures.SilverWolfTraitId,
                // 档位不同 EffectId 也不同，取角色当前所在的 TraitEffect 组
                EffectId = session.SilverWolfPendingEffectGroupId,
                IsOptional = false,
            };
            foreach (var optionId in session.SilverWolfPendingOptionIds)
            {
                action.EnhanceIndexList.Add((uint)action.EnhanceOptionIdList.Count);
                action.EnhanceOptionIdList.Add(optionId);
            }
            return new GridFightPendingAction
            {
                QueuePosition = traitQueuePosition,
                TraitEffectSelectEnhanceAction = action,
            };
        }

        var pending = new GridFightPendingAction { QueuePosition = session.PendingQueuePosition };
        switch (session.Phase)
        {
            case GridFightSessionPhase.SelectingPortal:
                pending.PortalAction = new GridFightPortalBuffActionInfo
                {
                    FreeRerollCount = 1,
                    SelectCount = 1,
                };
                pending.PortalAction.PortalIdList.Add(session.PortalOffer);
                break;
            case GridFightSessionPhase.AwaitingInitialRound:
            case GridFightSessionPhase.AwaitingBattleRound:
            case GridFightSessionPhase.AwaitingSupplyRound:
                pending.RoundBeginAction = new GridFightRoundBeginActionInfo();
                break;
            case GridFightSessionPhase.SelectingInvestment:
                pending.InvestmentAction = new GridFightAugmentActionInfo();
                pending.InvestmentAction.PendingInvestmentList.Add(session.InvestmentOffer.Select(augmentId =>
                    new GridFightPendingAugmentInfo
                    {
                        AugmentId = augmentId,
                        FreeRerollCount = 1,
                        RerollCount = session.IsInvestmentRerolled(augmentId) ? 1u : 0u,
                    }));
                break;
            case GridFightSessionPhase.SelectingSupply:
                pending.SupplyAction = new GridFightSupplyActionInfo
                {
                    SelectCount = 1,
                    FreeRerollCount = 1,
                    RerollCount = session.SupplyRerollCount,
                };
                pending.SupplyAction.SupplyRoleInfoList.Add(session.SupplyOffer.Select(offer =>
                {
                    var role = new GridFightSupplyRoleInfo { RoleId = offer.RoleId };
                    role.GridFightItemList.Add(offer.EquipmentId);
                    return role;
                }));
                break;
            case GridFightSessionPhase.SelectingEncounter:
                pending.EliteBranchAction = new GridFightEliteBranchActionInfo
                {
                    FreeRerollCount = 1,
                    RerollCount = session.EncounterRerollCount,
                };
                break;
            case GridFightSessionPhase.AwaitingInitialOrb:
            case GridFightSessionPhase.AwaitingInitialReturn:
            case GridFightSessionPhase.AwaitingBattleReturn:
                pending.ReturnPreparationAction = new GridFightReturnPreparationActionInfo();
                break;
            default:
                return null;
        }
        return pending;
    }

    public GridFightSyncUpdateResultScNotify BuildSync(
        GridFightUpdateSrcType source,
        GridFightSessionChange? change = null,
        bool includeGold = false,
        bool includeShop = false,
        bool includeLevel = false,
        bool levelChanged = false,
        bool includePending = false,
        bool includeRoute = false)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        var session = Session;
        if (session == null) return notify;
        var result = new GridFightSyncResultData { UpdateSource = source };
        if (includeGold) result.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = session.Gold });
        // 始终下发总人口 + 后台席位上限（财富宝钻解锁后台格子）
        result.UpdateDynamicList.Add(new GridFightSyncData { MaxActiveRoleCount = session.MaxActiveRoles });
        if (includeShop) result.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
        if (includeLevel)
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                PlayerLevel = new GridFightPlayerLevelSyncInfo
                {
                    Level = session.PlayerLevel,
                    Exp = session.PlayerExp,
                    MaxLevel = Catalog.MaxPlayerLevel,
                },
            });
        if (includePending && BuildPendingAction() is { } pending)
            result.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
        if (includeRoute)
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                LevelInfo = new GridFightLevelSyncInfo
                {
                    ChapterId = session.ChapterId,
                    SectionId = session.SectionId,
                    LayerInfo = BuildLayerInfo(),
                },
            });
        if (change != null) AppendSessionChanges(result, change);
        notify.ResultList.Add(result);
        AppendRoleDerivedStateResult(notify, source);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildGoldSync()
    {
        return BuildSync(GridFightUpdateSrcType.KgridFightSrcNone, includeGold: true);
    }

    public GridFightSyncUpdateResultScNotify BuildRoleAddedSync(GridFightSessionChange change)
    {
        return BuildSync(GridFightUpdateSrcType.KgridFightSrcNone, change);
    }

    public GridFightSyncUpdateResultScNotify BuildRoleAcquisitionSync(
        GridFightRoleAcquisitionResult acquisition)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !acquisition.Success) return notify;
        var result = new GridFightSyncResultData();
        AppendAcquiredRoles(result, acquisition);
        notify.ResultList.Add(result);
        AppendRoleMergeResults(notify, GridFightUpdateSrcType.KgridFightSrcNone, [], acquisition);
        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcNone);
        AppendUnlockEffects(notify, acquisition);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildEquipmentAddedSync(GridFightEquipmentState equipment)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;
        var result = new GridFightSyncResultData();
        var items = new GridFightGameItemSyncInfo();
        items.GridFightEquipmentList.Add(BuildEquipment(equipment));
        result.UpdateDynamicList.Add(new GridFightSyncData { AddGameItemInfo = items });
        // 获得财富宝钻等改变人口的装备时，立刻尝试刷新后台席位
        AppendPopulationLimitSync(result);
        notify.ResultList.Add(result);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildForgeUseSync(GridFightForgeUseResult useResult)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !useResult.Success || useResult.Equipment == null) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcUseForge,
        };
        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            RemoveForgeUniqueId = useResult.RemovedForgeUniqueId,
        });
        var items = new GridFightGameItemSyncInfo();
        items.GridFightEquipmentList.Add(BuildEquipment(useResult.Equipment));
        result.UpdateDynamicList.Add(new GridFightSyncData { AddGameItemInfo = items });
        AppendPopulationLimitSync(result);
        AppendPositionChanges(result, useResult.UpdatedRoles, useResult.UpdatedForgeItems);
        notify.ResultList.Add(result);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildOrbAddedSync(GridFightOrbState orb)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;
        var result = new GridFightSyncResultData();
        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            OrbInfo = new GridFightOrbSyncInfo
            {
                UniqueId = orb.UniqueId,
                OrbItemId = orb.OrbItemId,
            },
        });
        notify.ResultList.Add(result);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildConsumableSync(GridFightConsumableChange change)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;
        var items = new GridFightGameItemSyncInfo();
        items.UpdateGridFightConsumableList.Add(BuildConsumableUpdate(change));
        var result = new GridFightSyncResultData();
        result.UpdateDynamicList.Add(change.IsNew
            ? new GridFightSyncData { AddGameItemInfo = items }
            : new GridFightSyncData { UpdateGameItemInfo = items });
        notify.ResultList.Add(result);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildSectionMoveSync(uint finishedPendingPosition)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;
        var finishResult = new GridFightSyncResultData();
        if (finishedPendingPosition != 0)
            finishResult.UpdateDynamicList.Add(new GridFightSyncData
            {
                FinishPendingActionPos = finishedPendingPosition,
            });
        finishResult.UpdateDynamicList.Add(new GridFightSyncData { LockInfo = new GridFightLockInfo() });
        notify.ResultList.Add(finishResult);

        var section = BuildSync(
            GridFightUpdateSrcType.KgridFightSrcEnterNode,
            includeShop: true,
            includeRoute: true);
        notify.ResultList.Add(section.ResultList);
        if (BuildPendingAction() is { } pending)
        {
            var pendingResult = new GridFightSyncResultData();
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData
            {
                LockInfo = new GridFightLockInfo
                {
                    LockType = GridFightLockType.Gameplay,
                    LockReason = GridFightLockReason.PendingAction,
                },
            });
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
            notify.ResultList.Add(pendingResult);
        }
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildBuyGoodsSync(
        IReadOnlyList<uint> goodsIndices,
        GridFightRoleAcquisitionResult acquisition)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        var session = Session;
        if (session == null || !acquisition.Success) return notify;

        var purchaseResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcBuyGoods,
        };
        purchaseResult.EffectParamList.Add(goodsIndices);
        purchaseResult.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = session.Gold });
        AppendAcquiredRoles(purchaseResult, acquisition);
        notify.ResultList.Add(purchaseResult);
        AppendRoleMergeResults(
            notify,
            GridFightUpdateSrcType.KgridFightSrcBuyGoods,
            goodsIndices,
            acquisition);
        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcBuyGoods);
        AppendUnlockEffects(notify, acquisition);

        var shopResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcBuyGoods,
        };
        shopResult.EffectParamList.Add(goodsIndices);
        shopResult.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
        notify.ResultList.Add(shopResult);
        notify.ResultList.Add(new GridFightSyncResultData());
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildRefreshShopSync()
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        var session = Session;
        if (session == null) return notify;

        var refreshResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcManualRefreshGoods,
        };
        refreshResult.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = session.Gold });
        refreshResult.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
        notify.ResultList.Add(refreshResult);
        notify.ResultList.Add(new GridFightSyncResultData());
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildSpecialGoodsSync(
        IReadOnlyList<GridFightSpecialGoodsPurchaseResult> purchases)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || purchases.Count == 0) return notify;
        foreach (var purchase in purchases)
        {
            var result = new GridFightSyncResultData
            {
                UpdateSource = GridFightUpdateSrcType.KgridFightSrcSpecialGoods,
            };
            result.EffectParamList.Add(purchase.SpecialGoodsId);
            result.EffectParamList.Add(purchase.GoodsIndex);
            AppendRewardApplication(result, purchase.Application);
            foreach (var acquisition in purchase.Application.RoleAcquisitions)
                AppendAcquiredRoles(result, acquisition);
            notify.ResultList.Add(result);
            foreach (var acquisition in purchase.Application.RoleAcquisitions)
            {
                AppendRoleMergeResults(
                    notify,
                    GridFightUpdateSrcType.KgridFightSrcSpecialGoods,
                    [purchase.SpecialGoodsId, purchase.GoodsIndex],
                    acquisition);
            }
        }

        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcSpecialGoods);
        foreach (var acquisition in purchases.SelectMany(purchase => purchase.Application.RoleAcquisitions))
            AppendUnlockEffects(notify, acquisition);
        var shopResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcBuyGoods,
        };
        shopResult.EffectParamList.Add(purchases.Select(purchase => purchase.GoodsIndex));
        shopResult.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
        notify.ResultList.Add(shopResult);
        notify.ResultList.Add(new GridFightSyncResultData());
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildOrbOpenSync(GridFightRewardApplication application)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !application.Success) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcUseOrb,
        };
        result.EffectParamList.Add(application.SourceUniqueId);
        result.EffectParamList.Add(application.SourceItemId);
        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            RemoveOrbUniqueId = application.SourceUniqueId,
        });
        AppendRewardApplication(result, application);
        foreach (var acquisition in application.RoleAcquisitions)
            AppendAcquiredRoles(result, acquisition);
        notify.ResultList.Add(result);
        foreach (var acquisition in application.RoleAcquisitions)
        {
            AppendRoleMergeResults(
                notify,
                GridFightUpdateSrcType.KgridFightSrcUseOrb,
                [application.SourceUniqueId, application.SourceItemId],
                acquisition);
        }
        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcUseOrb);
        foreach (var acquisition in application.RoleAcquisitions)
            AppendUnlockEffects(notify, acquisition);
        return notify;
    }

    public GridFightOpenOrbResultScNotify BuildOpenOrbResult(GridFightRewardApplication application)
    {
        var result = new GridFightOpenOrbResultScNotify
        {
            UniqueId = application.SourceUniqueId,
            DropInfo = new GridFightDropInfo(),
        };
        result.DropInfo.DropList.Add(application.Drops.Select(BuildDropEntry));
        return result;
    }

    /// <summary>激活失败时也解锁，避免客户端卡在「请选择骇入效果」。</summary>
    public GridFightSyncUpdateResultScNotify BuildTraitEnhanceForceUnlockSync(uint queuePosition)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance,
        };
        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            FinishPendingActionPos = queuePosition,
        });
        result.UpdateDynamicList.Add(new GridFightSyncData { LockInfo = new GridFightLockInfo() });
        notify.ResultList.Add(result);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildTraitEnhanceActivationSync(
        GridFightTraitEnhanceActivationResult activation)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !activation.Success) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance,
        };
        result.EffectParamList.Add(GridFightSpecialFeatures.SilverWolfEnhanceOptionId);

        if (activation.Equipment != null)
        {
            var items = new GridFightGameItemSyncInfo();
            items.GridFightEquipmentList.Add(BuildEquipment(activation.Equipment));
            result.UpdateDynamicList.Add(new GridFightSyncData { AddGameItemInfo = items });
        }

        if (Session.HackConsole is { } console)
        {
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                GameDataItemInfo = BuildHackConsoleItem(console),
            });
        }

        var updatedRoles = activation.UpdatedRoles is { Count: > 0 }
            ? activation.UpdatedRoles
            : activation.UpdatedRole != null
                ? (IReadOnlyList<GridFightRoleState>)[activation.UpdatedRole]
                : [];
        foreach (var role in updatedRoles.DistinctBy(role => role.UniqueId))
            result.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });

        if (activation.ShopNeedsRefresh)
            result.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });

        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            FinishPendingActionPos = activation.FinishedQueuePosition,
        });
        result.UpdateDynamicList.Add(new GridFightSyncData { LockInfo = new GridFightLockInfo() });
        notify.ResultList.Add(result);

        if (activation.FollowUpAcquisition is { Success: true } followUp)
        {
            AppendRoleMergeResults(
                notify,
                GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance,
                [],
                followUp);
            AppendRoleDerivedStateResult(
                notify,
                GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance);
            AppendUnlockEffects(notify, followUp);
        }
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildHackOptionSync(GridFightHackOptionResult option)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session?.HackConsole == null || !option.Success) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance,
        };
        result.EffectParamList.Add(GridFightSpecialFeatures.SilverWolfEnhanceOptionId);
        result.EffectParamList.Add(Session.HackConsole.GameItemUniqueId);
        AppendRewardApplication(result, option.Application);
        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            GameDataItemInfo = BuildHackConsoleItem(Session.HackConsole),
        });
        notify.ResultList.Add(result);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildPreparationSync()
    {
        var notify = BuildSync(GridFightUpdateSrcType.KgridFightSrcNone, includePending: true);
        if (Session?.HackConsole is not { } hackConsole) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance,
        };
        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            GameDataItemInfo = BuildHackConsoleItem(hackConsole),
        });
        notify.ResultList.Add(result);
        return notify;
    }

    private void AppendRewardApplication(
        GridFightSyncResultData result,
        GridFightRewardApplication application)
    {
        var session = Session!;
        if (application.GoldChanged)
            result.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = session.Gold });
        if (application.PlayerLevelChanged || application.PlayerExpChanged)
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                PlayerLevel = new GridFightPlayerLevelSyncInfo
                {
                    Level = session.PlayerLevel,
                    Exp = session.PlayerExp,
                    MaxLevel = Catalog.MaxPlayerLevel,
                },
            });
        if (application.PlayerLevelChanged)
            result.UpdateDynamicList.Add(new GridFightSyncData { MaxActiveRoleCount = session.MaxActiveRoles });
        if (application.LineupHpChanged)
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                LineupHp = new GridFightLineupHpSyncInfo
                {
                    CurrentHp = session.LineupHp,
                    MaxHp = session.MaxLineupHp,
                },
            });
        if (application.AddedEquipments.Count > 0)
        {
            var items = new GridFightGameItemSyncInfo();
            items.GridFightEquipmentList.Add(application.AddedEquipments.Select(BuildEquipment));
            result.UpdateDynamicList.Add(new GridFightSyncData { AddGameItemInfo = items });
            // 获得装备后刷新总人口 + 后台席位
            result.UpdateDynamicList.Add(new GridFightSyncData { MaxActiveRoleCount = session.MaxActiveRoles });
        }
        foreach (var change in application.ConsumableChanges)
        {
            var items = new GridFightGameItemSyncInfo();
            items.UpdateGridFightConsumableList.Add(BuildConsumableUpdate(change));
            result.UpdateDynamicList.Add(change.IsNew
                ? new GridFightSyncData { AddGameItemInfo = items }
                : new GridFightSyncData { UpdateGameItemInfo = items });
        }
        foreach (var orb in application.AddedOrbs)
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                OrbInfo = new GridFightOrbSyncInfo
                {
                    UniqueId = orb.UniqueId,
                    OrbItemId = orb.OrbItemId,
                },
            });
        foreach (var forgeItem in application.AddedForgeItems)
            result.UpdateDynamicList.Add(new GridFightSyncData { AddForgeItemInfo = BuildForgeItem(forgeItem) });
        if (application.RolePropertiesChanged)
            foreach (var role in session.Roles)
                result.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
    }

    private static GridFightDropEntry BuildDropEntry(GridFightRewardEntry reward)
    {
        var entry = new GridFightDropEntry
        {
            DropType = reward.Type switch
            {
                Enums.GridFight.GridFightBonusTypeEnum.Gold => GridFightDropType.Coin,
                Enums.GridFight.GridFightBonusTypeEnum.Exp => GridFightDropType.Exp,
                Enums.GridFight.GridFightBonusTypeEnum.SpecificAvatar => GridFightDropType.Role,
                Enums.GridFight.GridFightBonusTypeEnum.Item => GridFightDropType.Item,
                Enums.GridFight.GridFightBonusTypeEnum.Orb => GridFightDropType.Orb,
                _ => GridFightDropType.None,
            },
            ItemId = reward.ItemId,
            Num = reward.Count,
        };
        if (reward.RoleStar != 0)
            entry.Param = new GridFightDropParam { RoleStar = reward.RoleStar };
        return entry;
    }

    private void AppendSessionChanges(GridFightSyncResultData result, GridFightSessionChange change)
    {
        foreach (var role in change.AddedRoles)
            result.UpdateDynamicList.Add(new GridFightSyncData { AddRoleInfo = BuildRole(role) });
        foreach (var uniqueId in change.RemovedRoleIds)
            result.UpdateDynamicList.Add(new GridFightSyncData { RemoveRoleUniqueId = uniqueId });
        AppendPositionChanges(result, change.UpdatedRoles, change.UpdatedForgeItems);
    }

    private GridFightRoleSwitchInfo BuildRoleSwitchInfo()
    {
        var info = new GridFightRoleSwitchInfo();
        if (Session == null) return info;
        info.RoleSwitchList.Add(Session.RoleSwitchEntries.Select(entry =>
        {
            var result = new GridFightRoleSwitchEntry
            {
                CurrentRoleId = entry.CurrentRoleId,
            };
            result.RoleIdList.Add(entry.RoleIdList);
            return result;
        }));
        return info;
    }

    private void AppendRoleDerivedStateResult(
        GridFightSyncUpdateResultScNotify notify,
        GridFightUpdateSrcType source,
        bool includeShop = false)
    {
        var session = Session;
        var update = session?.ConsumeRoleSwitchUpdate();
        if (session == null) return;
        var savedValueChanges = session.RefreshRoleSavedValues();
        if (update == null && savedValueChanges.Count == 0) return;

        var result = new GridFightSyncResultData { UpdateSource = source };
        if (update != null)
        {
            result.UpdateDynamicList.Add(new GridFightSyncData { RoleSwitchInfo = BuildRoleSwitchInfo() });
            foreach (var uniqueId in update.ChangedRoleUniqueIds)
            {
                var role = session.Roles.FirstOrDefault(candidate => candidate.UniqueId == uniqueId);
                if (role != null)
                    result.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
            }
        }
        AppendRoleSavedValueUpdates(result, savedValueChanges);
        if (includeShop && update != null)
            result.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
        notify.ResultList.Add(result);
    }

    private static void AppendRoleSavedValueUpdates(
        GridFightSyncResultData result,
        IReadOnlyDictionary<string, uint> changes)
    {
        foreach (var (key, value) in changes)
        {
            var update = new GridFightSavedValueUpdate();
            update.SavedValues[key] = value;
            result.UpdateDynamicList.Add(new GridFightSyncData { SavedValueUpdate = update });
        }
    }

    private void AppendPositionChanges(
        GridFightSyncResultData result,
        IEnumerable<GridFightRoleState> roles,
        IEnumerable<GridFightForgeItemState> forgeItems)
    {
        foreach (var role in roles)
            result.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
        foreach (var forgeItem in forgeItems)
            result.UpdateDynamicList.Add(new GridFightSyncData { UpdateForgeItemInfo = BuildForgeItem(forgeItem) });
    }

    private void AppendAcquiredRoles(
        GridFightSyncResultData result,
        GridFightRoleAcquisitionResult acquisition)
    {
        foreach (var role in acquisition.AcquiredRoles)
            result.UpdateDynamicList.Add(new GridFightSyncData { AddRoleInfo = BuildRole(role) });
    }

    private void AppendRoleMergeResults(
        GridFightSyncUpdateResultScNotify notify,
        GridFightUpdateSrcType acquisitionSource,
        IEnumerable<uint> effectParameters,
        GridFightRoleAcquisitionResult acquisition)
    {
        foreach (var step in acquisition.MergeSteps)
        {
            var mergeResult = new GridFightSyncResultData
            {
                UpdateSource = GridFightUpdateSrcType.KgridFightSrcMergeRole,
            };
            foreach (var uniqueId in step.RemovedRoleIds)
                mergeResult.UpdateDynamicList.Add(new GridFightSyncData { RemoveRoleUniqueId = uniqueId });
            mergeResult.UpdateDynamicList.Add(new GridFightSyncData { AddRoleInfo = BuildRole(step.AddedRole) });
            notify.ResultList.Add(mergeResult);
        }

        if (acquisition.FinalMergedRoles.Count == 0) return;
        var finalResult = new GridFightSyncResultData { UpdateSource = acquisitionSource };
        finalResult.EffectParamList.Add(effectParameters);
        foreach (var role in acquisition.FinalMergedRoles)
            finalResult.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
        notify.ResultList.Add(finalResult);
    }

    private void AppendUnlockEffects(
        GridFightSyncUpdateResultScNotify notify,
        GridFightRoleAcquisitionResult acquisition)
    {
        foreach (var effect in acquisition.UnlockEffects)
        {
            var result = new GridFightSyncResultData
            {
                UpdateSource = effect == GridFightRoleUnlockEffect.CyrenePoemShop
                    ? GridFightUpdateSrcType.KgridFightSrcSpecialGoods
                    : GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance,
            };
            if (effect == GridFightRoleUnlockEffect.CyrenePoemShop)
            {
                result.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
            }
            else
            {
                result.UpdateDynamicList.Add(new GridFightSyncData
                {
                    LockInfo = new GridFightLockInfo
                    {
                        LockType = GridFightLockType.Gameplay,
                        LockReason = GridFightLockReason.PendingAction,
                    },
                });
                if (BuildPendingAction() is { } pending)
                    result.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
            }
            notify.ResultList.Add(result);
        }
    }

    public GridFightSyncUpdateResultScNotify BuildPortalSelectionSync(
        uint finishedQueuePosition,
        GridFightSessionChange change)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        var session = Session;
        if (session == null) return notify;

        var portalResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcSelectPortalBuff,
        };
        portalResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            PortalUpdate = new GridFightPortalBuffUpdateInfo { PortalBuffId = session.SelectedPortalId },
        });
        notify.ResultList.Add(portalResult);

        var supplyResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcInitialSupplySelect,
        };
        supplyResult.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = session.Gold });
        foreach (var role in change.AddedRoles)
            supplyResult.UpdateDynamicList.Add(new GridFightSyncData { AddRoleInfo = BuildRole(role) });
        if (session.Equipments.Count > 0)
        {
            var items = new GridFightGameItemSyncInfo();
            items.GridFightEquipmentList.Add(session.Equipments.Select(BuildEquipment));
            supplyResult.UpdateDynamicList.Add(new GridFightSyncData { AddGameItemInfo = items });
        }
        notify.ResultList.Add(supplyResult);
        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcInitialSupplySelect);

        var finishResult = new GridFightSyncResultData();
        finishResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            FinishPendingActionPos = finishedQueuePosition,
        });
        finishResult.UpdateDynamicList.Add(new GridFightSyncData { LockInfo = new GridFightLockInfo() });
        notify.ResultList.Add(finishResult);

        var levelResult = new GridFightSyncResultData();
        levelResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            LevelInfo = new GridFightLevelSyncInfo
            {
                ChapterId = session.ChapterId,
                SectionId = session.SectionId,
                LayerInfo = BuildLayerInfo(),
            },
        });
        notify.ResultList.Add(levelResult);

        var pendingResult = new GridFightSyncResultData();
        pendingResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            LockInfo = new GridFightLockInfo
            {
                LockType = GridFightLockType.Gameplay,
                LockReason = GridFightLockReason.PendingAction,
            },
        });
        if (BuildPendingAction() is { } pending)
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
        notify.ResultList.Add(pendingResult);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildPendingAdvanceSync(
        uint finishedQueuePosition,
        bool includeShop = false)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;

        var finishResult = new GridFightSyncResultData();
        finishResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            FinishPendingActionPos = finishedQueuePosition,
        });
        finishResult.UpdateDynamicList.Add(new GridFightSyncData { LockInfo = new GridFightLockInfo() });
        if (includeShop)
            finishResult.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
        notify.ResultList.Add(finishResult);

        if (BuildPendingAction() is { } pending)
        {
            var pendingResult = new GridFightSyncResultData();
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData
            {
                LockInfo = new GridFightLockInfo
                {
                    LockType = GridFightLockType.Gameplay,
                    LockReason = GridFightLockReason.PendingAction,
                },
            });
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
            notify.ResultList.Add(pendingResult);
        }
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildInitialRoundSync(
        uint finishedQueuePosition,
        IReadOnlyList<GridFightTalentOrbReward> talentRewards)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        AppendTalentOrbRewards(notify, talentRewards);
        notify.ResultList.Add(BuildSync(GridFightUpdateSrcType.KgridFightSrcNone, includeShop: true).ResultList);
        var pending = BuildPendingAdvanceSync(finishedQueuePosition);
        notify.ResultList.Add(pending.ResultList);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildBattleRoundSync(
        uint finishedQueuePosition,
        IReadOnlyList<GridFightTalentOrbReward> talentRewards)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        AppendTalentOrbRewards(notify, talentRewards);
        notify.ResultList.Add(BuildSync(GridFightUpdateSrcType.KgridFightSrcNone, includeShop: true).ResultList);
        var pending = BuildPendingAdvanceSync(finishedQueuePosition);
        notify.ResultList.Add(pending.ResultList);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildEncounterRerollSync()
    {
        return BuildSync(
            GridFightUpdateSrcType.KgridFightSrcNone,
            includePending: true,
            includeRoute: true);
    }

    public GridFightSyncUpdateResultScNotify BuildEncounterSelectionSync(
        uint finishedQueuePosition,
        uint eliteBranchId)
    {
        var notify = BuildEncounterSelectionUpdateSync(eliteBranchId);
        notify.ResultList.Add(BuildPendingAdvanceSync(finishedQueuePosition).ResultList);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildEncounterSelectionUpdateSync(uint eliteBranchId)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;
        var selection = new GridFightSyncResultData();
        selection.UpdateDynamicList.Add(new GridFightSyncData
        {
            EliteBranchSyncInfo = new GridFightEliteBranchSyncInfo { EliteBranchId = eliteBranchId },
        });
        notify.ResultList.Add(selection);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildBattleEndRouteSync()
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;
        var routeResult = new GridFightSyncResultData();
        routeResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            LevelInfo = new GridFightLevelSyncInfo
            {
                ChapterId = Session.ChapterId,
                SectionId = Session.SectionId,
                LayerInfo = BuildLayerInfo(),
            },
        });
        notify.ResultList.Add(routeResult);
        if (BuildPendingAction() is { } pending)
        {
            var pendingResult = new GridFightSyncResultData();
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData
            {
                LockInfo = new GridFightLockInfo
                {
                    LockType = GridFightLockType.Gameplay,
                    LockReason = GridFightLockReason.PendingAction,
                },
            });
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
            notify.ResultList.Add(pendingResult);
        }
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildInvestmentSelectionSync(
        uint finishedQueuePosition,
        uint augmentId)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;

        var selectionResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcSelectAugment,
        };
        selectionResult.EffectParamList.Add(augmentId);
        selectionResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            AddAugmentInfo = new GridFightGameAugmentAdd
            {
                UpdateAugmentInfo = BuildInvestment(augmentId),
            },
        });
        notify.ResultList.Add(selectionResult);
        notify.ResultList.Add(BuildPendingAdvanceSync(finishedQueuePosition).ResultList);
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildSupplySelectionSync(
        uint finishedQueuePosition,
        uint selectedIndex,
        GridFightSupplySelectionResult selection)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !selection.Success || selection.Equipment == null) return notify;

        var selectionResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcSelectSupply,
        };
        selectionResult.EffectParamList.Add(selectedIndex);
        var items = new GridFightGameItemSyncInfo();
        items.GridFightEquipmentList.Add(BuildEquipment(selection.Equipment));
        selectionResult.UpdateDynamicList.Add(new GridFightSyncData { AddGameItemInfo = items });
        notify.ResultList.Add(selectionResult);

        var roleResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcSelectSupply,
        };
        roleResult.EffectParamList.Add(selectedIndex);
        AppendAcquiredRoles(roleResult, selection.Acquisition);
        notify.ResultList.Add(roleResult);
        AppendRoleMergeResults(
            notify,
            GridFightUpdateSrcType.KgridFightSrcSelectSupply,
            [selectedIndex],
            selection.Acquisition);
        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcSelectSupply);
        AppendUnlockEffects(notify, selection.Acquisition);

        var finishResult = new GridFightSyncResultData();
        finishResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            FinishPendingActionPos = finishedQueuePosition,
        });
        finishResult.UpdateDynamicList.Add(new GridFightSyncData { LockInfo = new GridFightLockInfo() });
        notify.ResultList.Add(finishResult);

        var routeResult = new GridFightSyncResultData();
        routeResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            LevelInfo = new GridFightLevelSyncInfo
            {
                ChapterId = Session.ChapterId,
                SectionId = Session.SectionId,
                LayerInfo = BuildLayerInfo(),
            },
        });
        notify.ResultList.Add(routeResult);

        if (BuildPendingAction() is { } pending)
        {
            var pendingResult = new GridFightSyncResultData();
            pendingResult.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
            notify.ResultList.Add(pendingResult);
        }
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildPositionSync(GridFightSessionChange change)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !change.Success) return notify;
        var savedValueChanges = Session.RefreshRoleSavedValues();
        if (Session.ConsumeRoleSwitchUpdate() is { } update)
        {
            var previousResult = new GridFightSyncResultData();
            foreach (var role in change.UpdatedRoles)
            {
                var previousRoleId = update.PreviousRoleIds.GetValueOrDefault(role.UniqueId, role.RoleId);
                previousResult.UpdateDynamicList.Add(new GridFightSyncData
                {
                    UpdateRoleInfo = BuildRole(role, previousRoleId),
                });
            }
            foreach (var forgeItem in change.UpdatedForgeItems)
                previousResult.UpdateDynamicList.Add(new GridFightSyncData
                {
                    UpdateForgeItemInfo = BuildForgeItem(forgeItem),
                });
            notify.ResultList.Add(previousResult);

            var switchResult = new GridFightSyncResultData();
            switchResult.UpdateDynamicList.Add(new GridFightSyncData { RoleSwitchInfo = BuildRoleSwitchInfo() });
            foreach (var uniqueId in update.ChangedRoleUniqueIds)
            {
                var role = Session.Roles.FirstOrDefault(candidate => candidate.UniqueId == uniqueId);
                if (role != null)
                    switchResult.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
            }
            switchResult.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
            AppendRoleSavedValueUpdates(switchResult, savedValueChanges);
            notify.ResultList.Add(switchResult);
            notify.ResultList.Add(new GridFightSyncResultData());
            AppendSilverWolfPendingUnlockIfNeeded(notify);
            return notify;
        }
        var result = new GridFightSyncResultData();
        AppendPositionChanges(result, change.UpdatedRoles, change.UpdatedForgeItems);
        AppendRoleSavedValueUpdates(result, savedValueChanges);
        notify.ResultList.Add(result);
        AppendSilverWolfPendingUnlockIfNeeded(notify);
        return notify;
    }

    /// <summary>上阵触发银狼待生效骇入时，附带 Lock + Pending。</summary>
    private void AppendSilverWolfPendingUnlockIfNeeded(GridFightSyncUpdateResultScNotify notify)
    {
        if (Session == null || !Session.ConsumeSilverWolfPendingJustActivated())
            return;
        if (BuildPendingAction() is not { } pending)
            return;
        var unlock = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcTraitEffectSelectEnhance,
        };
        unlock.UpdateDynamicList.Add(new GridFightSyncData
        {
            LockInfo = new GridFightLockInfo
            {
                LockType = GridFightLockType.Gameplay,
                LockReason = GridFightLockReason.PendingAction,
            },
        });
        unlock.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
        notify.ResultList.Add(unlock);
    }

    public async ValueTask EndBattle(BattleInstance battle, PVEBattleResultCsReq request)
    {
        var session = Session;
        if (session == null) return;
        var battleEndedNormally = request.EndStatus == BattleEndStatus.BattleEndWin;
        var chapterId = session.ChapterId;
        var sectionId = session.SectionId;
        var previousLevel = session.PlayerLevel;
        var previousExp = session.PlayerExp;
        var previousMaxExp = Catalog.GetPlayerLevel(previousLevel).LevelUpExp;
        var statistics = ReadBattleStatistics(request);
        var settlement = session.ResolveBattle(battleEndedNormally, statistics);
        if (!settlement.Success) return;
        var damageStatistics = BuildDamageStatistics(battle, settlement.Statistics);
        _lastBattleDamageStatistics = damageStatistics.Clone();

        await Player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(BuildBattleSettlementSync(
            settlement,
            damageStatistics,
            chapterId,
            sectionId,
            session.PlayerLevel != previousLevel)));
        var endNotify = new GridFightEndBattleStageNotify
        {
            IsPerfectFinish = settlement.IsPerfectFinish,
            SectionId = sectionId,
            BasicGold = settlement.BasicGold,
            InterestGold = settlement.InterestGold,
            KeepWinGold = settlement.KeepWinGold,
            PreviousKeepWinCount = settlement.PreviousKeepWinCount,
            KeepWinCount = settlement.KeepWinCount,
            ProgressPercent = settlement.ProgressPercent,
            DeadLinePercent = settlement.DeadLinePercent,
            LineupHpBefore = settlement.LineupHpBefore,
            LineupHpAfter = settlement.LineupHpAfter,
            MaxLineupHp = session.MaxLineupHp,
            ChapterId = chapterId,
            RouteId = Catalog.StandardRouteId,
            DamageStatistics = damageStatistics,
            LevelUpdateInfo = new GridFightLevelUpdateInfo
            {
                AddedExp = settlement.AddedExp,
                PreviousLevelInfo = new GridFightLevelDisplayInfo
                {
                    Level = previousLevel,
                    Exp = previousExp,
                    MaxExp = previousMaxExp,
                },
                CurrentLevelInfo = new GridFightLevelDisplayInfo
                {
                    Level = session.PlayerLevel,
                    Exp = session.PlayerExp,
                    MaxExp = Catalog.GetPlayerLevel(session.PlayerLevel).LevelUpExp,
                },
            },
        };
        endNotify.HpModifyList.Add(settlement.HpChanges.Select(BuildHpModifyInfo));
        await Player.SendPacket(new PacketGridFightEndBattleStageNotify(endNotify));
        if (settlement.RouteAdvanced)
            await Player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(BuildBattleEndRouteSync()));
        else
        {
            var settle = BuildSettleNotify(GridFightSettleReason.Victory);
            await Player.SendPacket(new PacketGridFightSyncKeepWinCntNotify(1));
            await Player.SendPacket(new PacketGridFightSettleNotify(settle));
            ClearSession();
        }
    }

    private GridFightSyncUpdateResultScNotify BuildBattleSettlementSync(
        GridFightBattleSettlementResult settlement,
        GridFightDamageSttInfo damageStatistics,
        uint chapterId,
        uint sectionId,
        bool levelChanged)
    {
        var session = Session!;
        var notify = new GridFightSyncUpdateResultScNotify();
        var battleResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcBattleEnd,
        };
        battleResult.EffectParamList.Add(new[] { chapterId, sectionId });
        battleResult.UpdateDynamicList.Add(new GridFightSyncData { DamageStat = damageStatistics });
        battleResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            LineupHp = new GridFightLineupHpSyncInfo
            {
                CurrentHp = settlement.LineupHpAfter,
                MaxHp = session.MaxLineupHp,
            },
        });
        battleResult.UpdateDynamicList.Add(new GridFightSyncData { KeepWinCount = settlement.KeepWinCount });
        notify.ResultList.Add(battleResult);

        var rewardResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcBattleEnd,
        };
        rewardResult.EffectParamList.Add(new[] { chapterId, sectionId });
        if (levelChanged)
        {
            rewardResult.UpdateDynamicList.Add(new GridFightSyncData { MaxActiveRoleCount = session.MaxActiveRoles });
            rewardResult.UpdateDynamicList.Add(new GridFightSyncData { ShopInfo = BuildShopSyncInfo() });
        }
        rewardResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            PlayerLevel = new GridFightPlayerLevelSyncInfo
            {
                Level = session.PlayerLevel,
                Exp = session.PlayerExp,
                MaxLevel = Catalog.MaxPlayerLevel,
            },
        });
        rewardResult.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = settlement.GoldAfterBasic });
        if (settlement.InterestGold > 0)
            rewardResult.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = settlement.GoldAfterInterest });
        if (settlement.KeepWinGold > 0)
            rewardResult.UpdateDynamicList.Add(new GridFightSyncData { ItemValue = settlement.GoldAfterKeepWin });
        foreach (var orb in settlement.AddedBattleOrbs)
            rewardResult.UpdateDynamicList.Add(new GridFightSyncData
            {
                OrbInfo = new GridFightOrbSyncInfo
                {
                    UniqueId = orb.UniqueId,
                    OrbItemId = orb.OrbItemId,
                },
            });
        notify.ResultList.Add(rewardResult);
        AppendTalentOrbRewards(notify, settlement.TalentRewards);
        AppendDiceEquipmentRefreshSync(notify);
        return notify;
    }

    private static void AppendTalentOrbRewards(
        GridFightSyncUpdateResultScNotify notify,
        IReadOnlyList<GridFightTalentOrbReward> rewards)
    {
        foreach (var reward in rewards)
        {
            var result = new GridFightSyncResultData
            {
                UpdateSource = GridFightUpdateSrcType.KgridFightSrcTalent,
            };
            result.EffectParamList.Add(new[] { reward.TalentId, reward.EffectId });
            foreach (var orb in reward.AddedOrbs)
                result.UpdateDynamicList.Add(new GridFightSyncData
                {
                    OrbInfo = new GridFightOrbSyncInfo
                    {
                        UniqueId = orb.UniqueId,
                        OrbItemId = orb.OrbItemId,
                    },
                });
            notify.ResultList.Add(result);
        }
    }

    private static GridFightBattleStatistics ReadBattleStatistics(PVEBattleResultCsReq request)
    {
        var roundCount = request.Stt?.RoundCnt ?? 0;
        var statistics = request.Stt?.GridFightStatistics;
        if (statistics == null) return GridFightBattleStatistics.Empty with { RoundCount = roundCount };
        return new GridFightBattleStatistics(
            Math.Min(statistics.ProgressPercent, 100u),
            statistics.RoleStatistics.Select(row => new GridFightRoleBattleDamage(
                row.RoleId,
                NormalizeDamage(row.Damage),
                NormalizeDamage(row.SecondaryDamage))).ToList(),
            statistics.TraitStatistics.Select(row => new GridFightTraitBattleDamage(
                row.TraitId,
                NormalizeDamage(row.Damage),
                NormalizeDamage(row.SecondaryDamage))).ToList(),
            statistics.AugmentStatistics.Select(row => new GridFightAugmentBattleDamage(
                row.AugmentId,
                NormalizeDamage(row.Damage),
                NormalizeDamage(row.SecondaryDamage))).ToList(),
            statistics.WaveKilledMonsterInfoList.SelectMany(wave =>
                wave.KillMonsterList.Select(monster => new GridFightKilledMonsterInstance(
                    wave.WaveIndex,
                    monster.MonsterIndex,
                    monster.MonsterId))).ToList(),
            roundCount,
            true);
    }

    private GridFightDamageSttInfo BuildDamageStatistics(BattleInstance battle, GridFightBattleStatistics statistics)
    {
        var session = Session!;
        var result = new GridFightDamageSttInfo();
        if (!statistics.IsPresent) return result;
        var uploadedRoleDamage = statistics.RoleDamage
            .GroupBy(row => row.RoleId)
            .ToDictionary(group => group.Key, group => group.Sum(row => row.Damage));
        var activeRoles = session.Roles
            .Where(role => role.Position is >= 1 and <= 13)
            .GroupBy(role => role.RoleId)
            .Select(group => group.OrderBy(role => role.Position).First())
            .OrderBy(role => role.Position)
            .ToList();
        foreach (var role in activeRoles)
        {
            var isForeground = role.Position is >= 1 and <= 4;
            var isTrialRole = GridFightBattleProtoBuilder.IsTrialRole(battle, role.RoleId, isForeground);
            var row = new GridFightRoleDamageStatistics
            {
                RoleId = role.RoleId,
                RoleStar = role.Star,
                TotalDamage = uploadedRoleDamage.GetValueOrDefault(role.RoleId),
                IsTrialRole = isTrialRole,
                IsBackPosition = !isTrialRole && role.Position is >= 5 and <= 13,
            };
            row.GridFightEquipmentList.Add(session.GetEquippedEquipment(role)
                .Select(item => item.EquipmentId)
                .Distinct()
                .Order());
            result.RoleStatistics.Add(row);
        }
        foreach (var missing in uploadedRoleDamage.Where(pair => activeRoles.All(role => role.RoleId != pair.Key)))
            result.RoleStatistics.Add(new GridFightRoleDamageStatistics
            {
                RoleId = missing.Key,
                RoleStar = 1,
                TotalDamage = missing.Value,
            });

        foreach (var group in statistics.TraitDamage.GroupBy(row => row.TraitId))
        {
            var memberCount = (uint)activeRoles.Count(role => session.ResolveRoleTraitIds(role).Contains(group.Key)) +
                              session.ResolveTraitExtraMemberCount(group.Key, activeRoles);
            result.TraitStatistics.Add(new GridFightTraitDamageStatistics
            {
                TraitId = group.Key,
                Layer = GridFightBattleProtoBuilder.ResolveTraitLayer(group.Key, memberCount),
                Damage = group.Sum(row => row.Damage),
            });
        }
        foreach (var group in statistics.AugmentDamage.GroupBy(row => row.AugmentId))
        {
            var damage = group.Sum(row => row.Damage);
            var secondaryDamage = group.Sum(row => row.SecondaryDamage);
            if (damage == 0 && secondaryDamage == 0) continue;
            result.AugmentStatistics.Add(new GridFightAugmentDamageStatistics
            {
                AugmentId = group.Key,
                Damage = damage,
                SecondaryDamage = secondaryDamage,
            });
        }
        return result;
    }

    private static GridFightHpModifyInfo BuildHpModifyInfo(GridFightHpChange change)
    {
        return new GridFightHpModifyInfo
        {
            PreviousHp = checked((int)change.PreviousHp),
            CurrentHp = checked((int)change.CurrentHp),
            ChangeValue = change.Amount,
            SourceId = change.SourceId,
            Reason = change.Kind switch
            {
                GridFightHpChangeKind.BasicPenalty => GridFightUpdateGlobalHpReason.KsubGlobalHpBaseCost,
                GridFightHpChangeKind.ProgressPenalty => GridFightUpdateGlobalHpReason.KsubGlobalHpExtraCost,
                GridFightHpChangeKind.ThresholdPenalty => GridFightUpdateGlobalHpReason.KsubGlobalHpThresholdCost,
                GridFightHpChangeKind.TalentHealing => GridFightUpdateGlobalHpReason.KaddGlobalHpTalent,
                GridFightHpChangeKind.FinalBattleTurnHealing =>
                    GridFightUpdateGlobalHpReason.KaddGlobalHpFinalBattleTurn,
                _ => GridFightUpdateGlobalHpReason.KupdateGlobalHpNone,
            },
        };
    }

    private static double NormalizeDamage(double value)
    {
        return double.IsFinite(value) && value > 0 ? value : 0;
    }

    public GridFightGameInfo BuildBasicInfo(bool hasPendingAction)
    {
        var session = Session!;
        var lockInfo = new GridFightLockInfo();
        if (hasPendingAction)
        {
            lockInfo.LockType = GridFightLockType.Gameplay;
            lockInfo.LockReason = GridFightLockReason.PendingAction;
        }
        var basic = new GridFightGameBasicInfo
        {
            LineupHp = session.LineupHp,
            MaxLineupHp = session.MaxLineupHp,
            Gold = session.Gold,
            PlayerLevel = session.PlayerLevel,
            LevelExp = session.PlayerExp,
            MaxAvatarCount = Catalog.BenchSize,
            BuyExpCost = Catalog.BuyExpCost,
            MaxInterestGold = Catalog.MaxInterestGold,
            // 协议无法中途单独下发 OffFieldMaxCount，进局先预解锁到上限，实际人数仍由 MaxActiveRoleCount 限制
            OffFieldMaxCount = session.MaxOffFieldRolesCap,
            MaxActiveRoleCount = session.MaxActiveRoles,
            DepositPerInterest = Catalog.DepositPerInterest,
            BenchOverflowSize = Catalog.BenchOverflowSize,
            CurrentTaskInfo = new GridFightSyncCurrentTaskInfo(),
            LockInfo = lockInfo,
        };
        basic.ModuleIdList.Add(Catalog.ContentModuleId);
        return new GridFightGameInfo { BasicInfo = basic };
    }

    /// <summary>同步总出战人数上限 MaxActiveRoleCount；后台格已在进局时预解锁。</summary>
    public void AppendPopulationLimitSync(GridFightSyncResultData result)
    {
        if (Session == null) return;
        result.UpdateDynamicList.Add(new GridFightSyncData
        {
            MaxActiveRoleCount = Session.MaxActiveRoles,
        });
    }

    /// <summary>人口变化时的独立同步包，可与装备/合成回包一起发给客户端。</summary>
    public GridFightSyncUpdateResultScNotify BuildPopulationLimitNotify()
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcCraftEquip,
        };
        AppendPopulationLimitSync(result);
        notify.ResultList.Add(result);
        return notify;
    }

    private GridFightGameShopInfo BuildShopInfo()
    {
        var session = Session!;
        var info = new GridFightGameShopInfo
        {
            RefreshCost = Catalog.RefreshCost,
            RarityWeightInfo = BuildRarityWeights(),
        };
        info.RolePoolList.Add(Catalog.RolePool.Select(role => role.ID));
        info.GoodsList.Add(session.Shop.Select(BuildShopGoods));
        return info;
    }

    private GridFightGameItemsInfo BuildItemsInfo()
    {
        var session = Session!;
        var info = new GridFightGameItemsInfo();
        info.GridFightEquipmentList.Add(session.Equipments.Select(BuildEquipment));
        info.GridFightConsumableList.Add(session.Consumables.Select(consumable => new GridFightConsumableInfo
        {
            GroupId = consumable.GroupId,
            ItemId = consumable.ItemId,
            Num = consumable.Count,
        }));
        return info;
    }

    private static GridFightConsumableUpdateInfo BuildConsumableUpdate(GridFightConsumableChange change)
    {
        return new GridFightConsumableUpdateInfo
        {
            GroupId = change.Consumable.GroupId,
            ItemId = change.Consumable.ItemId,
            ItemStackCount = checked((int)change.StackDelta),
            Num = change.Consumable.Count,
        };
    }

    private GridFightGameOrbInfo BuildOrbInfo()
    {
        var info = new GridFightGameOrbInfo();
        info.GridGameOrbList.Add(Session!.Orbs.Select(orb => new GridGameOrbInfo
        {
            UniqueId = orb.UniqueId,
            OrbItemId = orb.OrbItemId,
        }));
        return info;
    }

    private static GridFightEquipmentInfo BuildEquipment(GridFightEquipmentState equipment)
    {
        return new GridFightEquipmentInfo
        {
            UniqueId = equipment.UniqueId,
            GridFightEquipmentId = equipment.EquipmentId,
            Source = equipment.Source,
        };
    }

    private static GridGameForgeItemInfo BuildForgeItem(GridFightForgeItemState forgeItem)
    {
        var info = new GridGameForgeItemInfo
        {
            UniqueId = forgeItem.UniqueId,
            ForgeItemId = forgeItem.ForgeItemId,
            Pos = forgeItem.Position,
        };
        info.ForgeGoodsList.Add(forgeItem.EquipmentChoices.Select(equipmentId =>
            new GridFightForgeGoodsInfo
            {
                EquipmentGoodsInfo = new GridFightForgeEquipmentInfo
                {
                    GridFightEquipmentId = equipmentId,
                },
            }));
        return info;
    }

    private static GridFightGameItemInfo BuildHackConsoleItem(GridFightHackConsoleState state)
    {
        var hackState = new GridFightHackStateInfo
        {
            MinimumEnemyHpPercent = GridFightSpecialFeatures.MinimumEnemyHpPercent,
            MaximumEnemyHpPercent = GridFightSpecialFeatures.MaximumEnemyHpPercent,
            EnemyHpPercent = state.EnemyHpPercent,
            EnhanceOptionId = GridFightSpecialFeatures.SilverWolfEnhanceOptionId,
        };
        hackState.RemainingActionCountList.Add(state.RemainingGoldActions);
        hackState.RemainingActionCountList.Add(state.RemainingHealActions);
        hackState.RemainingActionCountList.Add(state.RemainingOrbActions);
        return new GridFightGameItemInfo
        {
            UniqueId = state.GameItemUniqueId,
            Descriptor_ = BuildGameItemDescriptor(
                GridFightGameItemCategory.HackConsole,
                GridFightSpecialFeatures.SilverWolfEnhanceOptionId),
            HackStateInfo = hackState,
        };
    }

    private static GridGameAugmentInfo BuildInvestment(uint augmentId)
    {
        return new GridGameAugmentInfo
        {
            AugmentId = augmentId,
            IsActive = true,
        };
    }

    private GridFightShopSyncInfo BuildShopSyncInfo()
    {
        var session = Session!;
        var info = new GridFightShopSyncInfo
        {
            RefreshCost = Catalog.RefreshCost,
            RarityWeightInfo = BuildRarityWeights(),
        };
        info.GoodsList.Add(session.Shop.Select(BuildShopGoods));
        return info;
    }

    private GridFightRarityWeightInfo BuildRarityWeights()
    {
        var result = new GridFightRarityWeightInfo();
        var weights = Session!.ShopRarityDisplayWeights;
        for (var index = 0; index < weights.Count; index++)
            result.EntryList.Add(new GridFightRarityWeightEntry
            {
                Rarity = (uint)index + 1,
                Weight = weights[index],
            });
        return result;
    }

    private static GridFightShopGoodsInfo BuildShopGoods(GridFightShopSlot slot)
    {
        var goods = new GridFightShopGoodsInfo
        {
            SoldOut = slot.SoldOut,
            Price = slot.Price,
        };
        if (slot.SpecialGoodsId != 0)
            goods.SpecialGoodsInfo = new GridFightSpecialGoodsInfo
            {
                SpecialGoodsId = slot.SpecialGoodsId,
            };
        else
            goods.RoleGoodsInfo = new GridFightRoleGoodsInfo
            {
                RoleId = slot.RoleId,
                RoleStar = slot.Star,
            };
        return goods;
    }

    private GridFightLevelInfo BuildLevelInfo()
    {
        var session = Session!;
        var info = new GridFightLevelInfo
        {
            RouteId = Catalog.StandardRouteId,
            ChapterId = session.ChapterId,
            SectionId = session.SectionId,
            SectionProgressInfo = new GridFightSectionProgressInfo(),
            BossInfo = new GridFightBossInfo(),
            BattleStatisticsInfo = new GridFightBattleStatisticsInfo
            {
                DamageStatistics = _lastBattleDamageStatistics.Clone(),
            },
        };
        info.CampInfoList.Add(session.CampIds.Select(id => new GridFightCampInfo { CampId = id }));
        info.AffixInfoList.Add(session.AffixIds.Select(id => new GridFightAffixInfo { AffixId = id }));
        info.BossInfo.MonsterList.Add(session.Bosses.Select(monster => new GridFightMonsterInfo
        {
            MonsterId = monster.MonsterID,
            RoleStar = 1,
        }));
        return info;
    }

    private GridFightLayerInfo BuildLayerInfo()
    {
        var session = Session!;
        var data = new GridFightLayerData
        {
            FightCampId = session.BattlePlan?.CampId ??
                          session.EncounterOptions.FirstOrDefault()?.BattlePlan.CampId ?? 0,
            SelectedEliteBranchId = session.CurrentNode.NodeType == Enums.GridFight.GridFightNodeTypeEnum.EliteBranch
                ? session.EliteBranchId
                : 1,
        };
        var plans = session.CurrentNode.NodeType == Enums.GridFight.GridFightNodeTypeEnum.EliteBranch &&
                    session.BattlePlan == null
            ? session.EncounterOptions.Select(option => (option.BattlePlan, Option: option)).ToList()
            : session.BattlePlan == null
                ? []
                : [(session.BattlePlan, (GridFightEncounterOptionState?)null)];
        foreach (var (plan, option) in plans)
        {
            var encounter = new GridFightEncounterInfo
            {
                EncounterId = option?.EncounterId ?? 0,
                EnemyDifficultyAdd = plan.DifficultyAdd,
                PenaltyRuleId = plan.PenaltyRuleId,
            };
            if (option != null)
                encounter.DropInfo = BuildEncounterDropInfo(option.Quality, session.ChapterId);
            foreach (var wavePlan in plan.Waves)
            {
                var wave = new GridFightMonsterWaveInfo { WaveId = wavePlan.WaveId };
                wave.MonsterList.Add(wavePlan.Monsters.Select(monster => new GridFightMonsterInfo
                {
                    MonsterId = monster.Monster.MonsterID,
                    RoleStar = monster.RoleStar,
                }));
                encounter.MonsterWaveList.Add(wave);
            }
            data.EncounterList.Add(encounter);
        }
        return new GridFightLayerInfo { Data = data };
    }

    private static GridFightDropInfo BuildEncounterDropInfo(uint quality, uint chapterId)
    {
        var entry = quality switch
        {
            1 => new GridFightDropEntry
            {
                DropType = GridFightDropType.Coin,
                Num = chapterId + 1,
            },
            2 => new GridFightDropEntry
            {
                DropType = GridFightDropType.Refresh,
                Num = 4,
            },
            4 => new GridFightDropEntry
            {
                DropType = GridFightDropType.Item,
                ItemId = 350701,
                Num = 1,
            },
            _ => null,
        };
        var result = new GridFightDropInfo();
        if (entry != null) result.DropList.Add(entry);
        return result;
    }

    private GridFightGameTeamInfo BuildTeamInfo()
    {
        var team = new GridFightGameTeamInfo();
        team.GridGameRoleList.Add(Session!.Roles.Select(BuildRole));
        team.ForgeItemList.Add(Session.ForgeItems.Select(BuildForgeItem));
        return team;
    }

    private GridGameRoleInfo BuildRole(GridFightRoleState role)
    {
        return BuildRole(role, role.RoleId);
    }

    private GridGameRoleInfo BuildRole(GridFightRoleState role, uint roleId)
    {
        var info = new GridGameRoleInfo
        {
            Id = roleId,
            UniqueId = role.UniqueId,
            RoleStar = role.Star,
            Pos = role.Position,
        };
        info.EquippedEquipmentUniqueIdList.Add(role.EquippedEquipmentUniqueIds);
        PopulateRolePropertyScales(info.ConvertPropertyToFixpoint, Session?.HasCyreneCombatEnhancement == true);
        if (Session != null)
            foreach (var (key, value) in Session.ResolveRoleSavedValues(role, roleId))
                info.GridFightValueInitComponent[key] = value;
        return info;
    }

    internal static void PopulateRolePropertyScales(
        IDictionary<uint, uint> properties,
        bool hasCyreneCombatEnhancement = false)
    {
        properties[32] = 180;
        properties[33] = 480;
        properties[34] = 440;
        properties[44] = 304;
        properties[49] = 180;
        properties[52] = 240;
        properties[53] = 480;
        properties[57] = 240;
        properties[59] = 450;
        properties[1013] = 100;
        properties[1014] = 100;
        properties[1019] = 100;
        properties[1025] = 100;
        if (!hasCyreneCombatEnhancement) return;
        properties[(uint)AvatarPropertyTypeEnum.ExtraAllDamageTypeAddedRatio1] = 1090;
        properties[(uint)AvatarPropertyTypeEnum.ExtraAllDamageReduce] = 990;
    }
}
