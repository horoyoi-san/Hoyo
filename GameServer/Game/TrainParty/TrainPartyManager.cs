using March7thHoney.Database.TrainParty;
using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.TrainParty;

// 4.4 port note: the TrainParty proto surface was fully re-obfuscated between 4.2 and 4.4 (field
// numbers reshuffled, names rotated). The static/decoration half (self-display, areas, prop timers,
// passengers, basic info) is mapped 1:1 against the 4.4 protos by structure. The gameplay board
// minigame was re-architected in 4.4 into a turn-based "next_pending_action" protocol; it is
// simulated server-side by TrainPartyGameplayRun with semantics inferred from field shapes — see the
// note on that class before changing the flow.
public class TrainPartyManager(PlayerInstance player) : BasePlayerManager<TrainData>(player)
{
    public TrainPartyGameplayRun? GameplayRun { get; private set; }

    public void MarkDataDirty()
    {
        MarkDirty();
    }

    public void EnsureDefaults()
    {
        var changed = false;

        if (Data.RecordId == 0)
        {
            Data.RecordId = 5;
            changed = true;
        }

        if (Data.WorldId == 0)
        {
            Data.WorldId = 501;
            changed = true;
        }

        if (Data.RefreshTime == 0)
        {
            Data.RefreshTime = 1780264800;
            changed = true;
        }

        if (Data.Fund == 0)
        {
            Data.Fund = 111712;
            changed = true;
        }

        if (Data.SelfDisplay.Count == 0)
        {
            Data.SelfDisplay.AddRange(DefaultSelfDisplay);
            changed = true;
        }

        if (Data.PassengerRecordMarks.Count == 0)
        {
            Data.PassengerRecordMarks.Add(1004);
            changed = true;
        }

        if (Data.UnlockedPassengerIds.Count == 0)
        {
            Data.UnlockedPassengerIds.AddRange(DefaultPassengers.Select(x => x.PassengerId));
            changed = true;
        }

        if (Data.PropTimes.Count == 0)
        {
            foreach (var (propId, time) in Props)
                Data.PropTimes[propId] = time;
            changed = true;
        }

        if (Data.TimedDynamicPropTimes.Count == 0)
        {
            foreach (var (_, dynamicId, time) in TimedDynamicProps)
                Data.TimedDynamicPropTimes[(int)dynamicId] = time;
            changed = true;
        }

        if (Data.Areas.Count == 0)
        {
            foreach (var area in DefaultAreas)
                Data.Areas[area.AreaId] = area;
            changed = true;
        }

        if (Data.Cards.Count == 0)
        {
            Data.Cards.AddRange(DefaultCards);
            changed = true;
        }

        if (Data.MoveHistory.Count == 0)
        {
            Data.MoveHistory.AddRange(DefaultMoveHistory);
            changed = true;
        }

        if (Data.GameplayPassengers.Count == 0)
        {
            Data.GameplayPassengers.AddRange(DefaultGameplayPassengers);
            changed = true;
        }

        if (Data.GameplaySkills.Count == 0)
        {
            Data.GameplaySkills.AddRange(DefaultGameplaySkills);
            changed = true;
        }

        if (Data.GameplayType == 0)
        {
            Data.GameplayType = 5;
            changed = true;
        }

        if (Data.GameplayRound == 0)
        {
            Data.GameplayRound = 1;
            changed = true;
        }

        if (changed) MarkDirty();
    }

    public TrainAreaInfo? SetDynamicId(int areaId, int slotId, int dynamicId)
    {
        EnsureDefaults();

        if (!Data.Areas.TryGetValue(areaId, out var area))
            return null;

        area.DynamicInfo[slotId] = dynamicId;
        if (!Data.PropTimes.ContainsKey(dynamicId))
            Data.PropTimes[dynamicId] = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        MarkDirty();
        return area;
    }

    public TrainPartyData ToProto()
    {
        EnsureDefaults();
        return new TrainPartyData
        {
            RecordId = (uint)Data.RecordId,
            HCJJPLKELGC = BuildGamePlayData(),
            TrainPartyInfo = ToPartyInfo(),
            PassengerInfo = ToPassenger(),
            UnlockAreaNum = (uint)Data.Areas.Count
        };
    }

    public TrainPartyInfo ToPartyInfo()
    {
        EnsureDefaults();

        var info = new TrainPartyInfo
        {
            IEEAPCFKOJC = true,                     // 4.2 EKLIAOBCHPI (bool flag)
            CurFund = (uint)Data.Fund,
            CMCNNJKJNPK = BuildSelfDisplayProto()   // 4.2 FCLJEACKGLE (self-display payload)
            // 4.2 cosmetic uint constants (HIHKGPJCDPK/NMBFMHLNPLM/OBAMHCIFFOC = 30/100/30) have no
            // recoverable 4.4 anchor — left unset rather than guess a wrong field.
        };

        foreach (var pair in Data.PropTimes)
            info.MHABCMLHCGD.Add(new GAGGCODGDLB { PropId = (uint)pair.Key, Time = pair.Value });

        info.AreaList.AddRange(Data.Areas.OrderBy(x => x.Key).Select(x => x.Value.ToProto()));
        return info;
    }

    public TrainPartyPassengerInfo ToPassenger()
    {
        EnsureDefaults();

        var info = new TrainPartyPassengerInfo();
        info.GHPFANGEMAN.AddRange(Data.PassengerRecordMarks);
        info.PassengerInfoList.AddRange(DefaultPassengers.Select(x => new TrainPartyPassenger
        {
            PassengerId = x.PassengerId,
            RecordId = x.RecordId,
            GHPFANGEMAN = { x.Badges }
        }));
        return info;
    }

    public uint GetWorldId()
    {
        EnsureDefaults();
        return Data.WorldId;
    }

    public ulong GetRefreshTime()
    {
        EnsureDefaults();
        return (ulong)Data.RefreshTime;
    }

    public OIIPJFDNPAH SetSelfDisplay(OIIPJFDNPAH? selfDisplay)
    {
        EnsureDefaults();

        if (selfDisplay != null)
        {
            Data.SelfDisplay = selfDisplay.OFOKOHGPEDO
                .Select(x => new TrainSelfDisplayEntry { Id = x.Id, Slot = x.Slot, Type = x.Type }).ToList();

            foreach (var dynamic in selfDisplay.GOEJIMNENDC)
            {
                var areaId = (int)(dynamic.DiceSlotId / 100000);
                if (Data.Areas.TryGetValue(areaId, out var area))
                    area.DynamicInfo[(int)dynamic.DiceSlotId] = (int)dynamic.DiyDynamicId;
            }

            MarkDirty();
        }

        return BuildSelfDisplayProto();
    }

    public uint SetBadgeAutoFill(bool enabled)
    {
        EnsureDefaults();
        Data.BadgeAutoFill = enabled;
        MarkDirty();
        return 0;
    }

    public uint BuildStartStep(uint areaId, uint stepId, AreaDynamicInfo? dynamicInfo, out uint curFund)
    {
        EnsureDefaults();
        curFund = (uint)Data.Fund;

        if (!Data.Areas.TryGetValue((int)areaId, out var area))
            return (uint)Retcode.RetFail;

        if (!area.StepList.Contains((int)stepId))
            area.StepList.Add((int)stepId);

        if (dynamicInfo != null)
            area.DynamicInfo[(int)dynamicInfo.DiceSlotId] = (int)dynamicInfo.DiyDynamicId;

        var cost = 0;
        if (GameData.TrainPartyStepConfigData.TryGetValue((int)stepId, out var stepExcel))
            cost = stepExcel.CoinCost;

        Data.Fund = Math.Max(0, Data.Fund - cost);
        curFund = (uint)Data.Fund;
        MarkDirty();
        return 0;
    }

    public uint UseCard(uint cardUniqueId)
    {
        EnsureDefaults();
        Data.LastUsedCardId = (int)cardUniqueId;
        MarkDirty();
        return 0;
    }

    // Gameplay (board minigame) — simulated by TrainPartyGameplayRun (best-effort 4.4 protocol).
    public uint StartGameplay(uint gameplayType, out EPHKIEHONGB gameplayData)
    {
        EnsureDefaults();

        Data.GameplayType = (int)gameplayType;
        Data.GameplayRound = 1;
        Data.GameplayQueuePosition = 0;
        MarkDirty();

        GameplayRun = TrainPartyGameplayRun.Create(Data, gameplayType);
        gameplayData = GameplayRun.BuildGameplayData();
        return 0;
    }

    public uint HandlePendingAction(TrainPartyHandlePendingActionCsReq req, out TrainPartyHandlePendingActionScRsp rsp)
    {
        EnsureDefaults();

        rsp = new TrainPartyHandlePendingActionScRsp();

        // Client may resume a board without an explicit start (e.g. after relog).
        GameplayRun ??= TrainPartyGameplayRun.Create(Data, (uint)Data.GameplayType);

        var ret = GameplayRun.HandleAnswer(req, rsp);

        Data.GameplayRound = (int)GameplayRun.Round;
        Data.GameplayQueuePosition = (int)GameplayRun.QueuePosition;
        MarkDirty();

        return ret;
    }

    // Drains the deltas produced by the last answered pending action; null when there is nothing to push.
    public TrainPartySyncUpdateScNotify? BuildGameplaySyncNotify()
    {
        if (GameplayRun == null || GameplayRun.PendingDeltas.Count == 0) return null;

        var notify = new TrainPartySyncUpdateScNotify();
        notify.JKPJFKCBIEM.AddRange(GameplayRun.PendingDeltas);
        GameplayRun.PendingDeltas.Clear();
        return notify;
    }

    // Ends the current board run (leave or settle). Returns true when a run was actually active.
    public bool ResetGameplay()
    {
        if (GameplayRun == null) return false;

        GameplayRun = null;
        Data.GameplayRound = 1;
        Data.GameplayQueuePosition = 0;
        MarkDirty();
        return true;
    }

    public uint TakeBuildLevelAward(out ItemList itemList)
    {
        EnsureDefaults();
        itemList = new ItemList();
        return 0;
    }

    public TrainPartyBuildingUpdateNotify BuildBuildingUpdateNotify(params uint[] areaIds)
    {
        var notify = new TrainPartyBuildingUpdateNotify();
        return notify;
    }

    public TrainPartySyncUpdateScNotify BuildSyncUpdateNotify(params TrainAreaInfo[] areas)
    {
        return new TrainPartySyncUpdateScNotify();
    }

    public TrainPartyMoveScNotify BuildMoveNotify()
    {
        var notify = new TrainPartyMoveScNotify { DNGKGLFMGGE = (uint)Data.GameplayRound };
        if (GameplayRun != null) notify.JABPLBJAKKM.AddRange(GameplayRun.Moves);
        return notify;
    }

    public TrainPartySettleNotify BuildSettleNotify()
    {
        var notify = new TrainPartySettleNotify { FGIHKKKOGJD = (uint)Data.LastUsedCardId };
        if (GameplayRun != null) notify.CBFPJAJAKGI = GameplayRun.BuildStatus();
        return notify;
    }

    public TrainPartyGamePlaySettleNotify BuildGamePlaySettleNotify()
    {
        var notify = new TrainPartyGamePlaySettleNotify
        {
            RecordId = (uint)Data.RecordId,
            UnlockAreaNum = (uint)Data.Areas.Count,
            ENBJCMPCMLK = ToPassenger()
        };

        notify.CEJPCMHEEMN.AddRange(Data.UnlockedPassengerIds);
        return notify;
    }

    private EPHKIEHONGB BuildGamePlayData()
    {
        // With an active run, expose its full state; otherwise return only the safely-known scalar
        // (gameplay type) so GetData always succeeds.
        if (GameplayRun != null) return GameplayRun.BuildGameplayData();

        return new EPHKIEHONGB
        {
            IDBDBICPBBG = (uint)Data.GameplayType
        };
    }

    private OIIPJFDNPAH BuildSelfDisplayProto()
    {
        var proto = new OIIPJFDNPAH();
        proto.OFOKOHGPEDO.AddRange(Data.SelfDisplay.Select(x => new CLLBJDEJFNF
        {
            Id = x.Id,
            Slot = x.Slot,
            Type = x.Type
        }));

        proto.GOEJIMNENDC.AddRange(DefaultSelfDisplayDynamics.Select(x => new AreaDynamicInfo
        {
            DiceSlotId = x.DiceSlotId,
            DiyDynamicId = x.DiyDynamicId
        }));

        proto.POLMJFIKNHN.AddRange(TimedDynamicProps.Select(x => new POFNNGOCEOK
        {
            DiceSlotId = x.DiceSlotId,
            EIKLMFPMJJD = x.DynamicId,
            ExpireTime = x.Time
        }));

        return proto;
    }

    private static readonly TrainSelfDisplayEntry[] DefaultSelfDisplay =
    [
        new() { Id = 1415, Slot = 1600301, Type = 1 },
        new() { Id = 1308, Slot = 1600302, Type = 1 },
        new() { Id = 5161, Slot = 1600303, Type = 4 },
        new() { Id = 5037, Slot = 1600304, Type = 4 },
        new() { Id = 23024, Slot = 1600305, Type = 3 },
        new() { Id = 23052, Slot = 1600306, Type = 3 }
    ];

    private static readonly AreaDynamicInfo[] DefaultSelfDisplayDynamics =
    [
        new() { DiceSlotId = 1600101, DiyDynamicId = 295603 },
        new() { DiceSlotId = 1600102, DiyDynamicId = 295610 },
        new() { DiceSlotId = 1600103, DiyDynamicId = 294003 },
        new() { DiceSlotId = 1600104, DiyDynamicId = 295609 },
        new() { DiceSlotId = 1600105, DiyDynamicId = 295604 },
        new() { DiceSlotId = 1600201, DiyDynamicId = 295601 }
    ];

    private static readonly (uint DiceSlotId, uint DynamicId, long Time)[] TimedDynamicProps =
    [
        (1600106, 295523, 1780264800),
        (1600107, 295527, 1783893600),
        (1600108, 295531, 1787522400)
    ];

    private static readonly (int propId, long time)[] Props =
    [
        (295123, 1776823846), (293008, 1776823846), (291006, 1776823846), (295606, 1776823846),
        (292005, 1776823846), (294005, 1776823846), (295603, 1776823846), (292006, 1776823846),
        (293001, 1776823846), (295125, 1776824028), (293005, 1776823846), (291005, 1776823846),
        (295611, 1776879877), (294001, 1776823846), (294004, 1776823846), (295602, 1776873318),
        (295124, 1776823846), (291007, 1776823846), (295607, 1776823846), (291001, 1776823846),
        (295605, 1776823846), (293006, 1776823846), (295121, 1776823846), (291004, 1776823846),
        (295610, 1776823846), (294002, 1776823846), (292001, 1776823846), (293004, 1776823846),
        (295609, 1776823846), (291003, 1776823846), (295604, 1776823846), (294006, 1776823846),
        (292004, 1776823846), (295122, 1776823846), (293007, 1776823846), (292003, 1776823846),
        (293003, 1776823846), (291002, 1776823846), (295608, 1776823846), (292002, 1776823846),
        (293002, 1776823846), (294003, 1776823846), (295601, 1776828054)
    ];

    private static readonly TrainAreaInfo[] DefaultAreas =
    [
        new()
        {
            AreaId = 11,
            StepList = [10001, 10003, 11001, 11002, 11003, 11004, 11005, 11006, 11007, 11008, 11009, 11011],
            DynamicInfo = new Dictionary<int, int> { [1100101] = 291004, [1100201] = 291005, [1100901] = 291006 }
        },
        new()
        {
            AreaId = 12,
            StepList = [10007, 10009, 10010, 12001, 12002, 12003, 12004, 12005, 12006, 12007, 12008, 12009, 12011, 12012, 12013],
            DynamicInfo = new Dictionary<int, int>
            {
                [1200201] = 294002, [1200401] = 292002, [1200501] = 294001,
                [1200701] = 293003, [1200703] = 291007, [1201201] = 291001
            }
        },
        new()
        {
            AreaId = 13,
            StepList = [10002, 10014, 13001, 13002, 13003, 13004, 13005, 13007],
            DynamicInfo = new Dictionary<int, int> { [1300301] = 293005, [1300302] = 293008, [1300401] = 292005, [1300402] = 292006 }
        },
        new()
        {
            AreaId = 14,
            StepList = [10004, 10008, 14001, 14002, 14003, 14004, 14005, 14006, 14007, 14008, 14009, 14010, 14011],
            DynamicInfo = new Dictionary<int, int> { [1400501] = 294006 }
        },
        new()
        {
            AreaId = 15,
            StepList = [10006, 10011, 15001, 15002, 15005, 15006, 15007, 15008],
            DynamicInfo = new Dictionary<int, int> { [1500101] = 293007, [1500601] = 292001, [1500701] = 292004 }
        },
        new()
        {
            AreaId = 16,
            StepList = [10005, 10012, 10013, 16001, 16002, 16003]
        }
    ];

    private static readonly TrainCardInfo[] DefaultCards =
    [
        new() { CardId = 107, UniqueId = 1 },
        new() { CardId = 321, CurIndex = 2, UniqueId = 3 },
        new() { CardId = 207, CurIndex = 4, UniqueId = 4 },
        new() { CardId = 206, CurIndex = 5, UniqueId = 5 }
    ];

    private static readonly TrainMoveInfo[] DefaultMoveHistory =
    [
        new() { CardId = 6101, BoardIndex = 2, UniqueId = 2 },
        new() { CardId = 6102, BoardIndex = 3, UniqueId = 3 },
        new() { CardId = 6103, BoardIndex = 4, UniqueId = 4 },
        new() { CardId = 6104, BoardIndex = 5, UniqueId = 5 },
        new() { CardId = 2001, BoardIndex = 6, UniqueId = 6 },
        new() { CardId = 8001, BoardIndex = 7, UniqueId = 7 },
        new() { CardId = 4001, BoardIndex = 8, UniqueId = 8 },
        new() { CardId = 6105, BoardIndex = 9, UniqueId = 9 },
        new() { CardId = 1001, BoardIndex = 10, UniqueId = 10 },
        new() { CardId = 6101, BoardIndex = 11, UniqueId = 11 },
        new() { CardId = 2001, BoardIndex = 12, UniqueId = 12 }
    ];

    private static readonly TrainPendingPassengerInfo[] DefaultGameplayPassengers =
    [
        new() { PassengerId = 1001, Hp = 350, Atk = 35 },
        new() { PassengerId = 1006, Hp = 300, Atk = 30 },
        new() { PassengerId = 1007, Hp = 300, Atk = 30 },
        new() { PassengerId = 1008, Hp = 300, Atk = 30 },
        new() { PassengerId = 1009, Hp = 300, Atk = 30 }
    ];

    private static readonly TrainSkillInfo[] DefaultGameplaySkills =
    [
        new() { SkillId = 214, SkillLevel = 1, Count = 1 },
        new() { SkillId = 208, SkillLevel = 1, Count = 1 }
    ];

    private static readonly (uint PassengerId, uint RecordId, uint[] Badges)[] DefaultPassengers =
    [
        (1001, 4, [103u, 101u, 102u]),
        (1002, 4, [202u, 203u, 201u]),
        (1003, 3, [301u, 302u, 303u]),
        (1004, 3, [502u, 501u]),
        (1005, 4, [401u, 403u, 402u]),
        (1006, 2, [601u]),
        (1007, 2, [701u]),
        (1008, 2, [801u]),
        (1009, 1, [901u])
    ];
}
