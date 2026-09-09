using Google.Protobuf;
using March7thHoney.GameServer.Game.Activity;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.MultiPlayer.DiceCombat;

public class DiceCombatStageState
{
    public bool Completed { get; set; }
    public long CompletedTime { get; set; }
}

public class DiceCombatActivityInstance : BaseActivityInstance
{
    public GetSystemDataRsp Snapshot { get; }
    public Dictionary<uint, DiceCombatStageState> Stages { get; } = new();

    public DiceCombatActivityInstance(ActivityManager manager) : base(manager)
    {
        Snapshot = DiceCombatConfig.BuildOfficialCompletedSnapshot();

        foreach (var stage in Snapshot.KCNEKEGGAGG)
            Stages[stage.CLEKAKLPNBP] = new DiceCombatStageState
            {
                Completed = true,
                CompletedTime = stage.UnlockTime
            };
    }

    public DiceCombatAvatar? FindAvatar(uint avatarId)
    {
        foreach (var avatar in Snapshot.AvatarList)
            if (avatar.DiceAvatarId == avatarId) return avatar;
        return null;
    }

    public void RecordStageFinish(uint stageId, bool isWin)
    {
        if (!isWin) return;
        var time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (!Stages.TryGetValue(stageId, out var state))
        {
            state = new DiceCombatStageState();
            Stages[stageId] = state;
            Snapshot.KCNEKEGGAGG.Add(new PKENAGKIECB { CLEKAKLPNBP = stageId, UnlockTime = time });
        }
        state.Completed = true;
        state.CompletedTime = time;
    }

    public byte[] BuildSystemDataPayload() => DiceCombatConfig.BuildV3Payload(Snapshot);
}
