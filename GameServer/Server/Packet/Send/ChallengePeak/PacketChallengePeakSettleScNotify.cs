using March7thHoney.Data;
using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;

public class PacketChallengePeakSettleScNotify : BasePacket
{
    public PacketChallengePeakSettleScNotify(ChallengePeakInstance inst, List<uint> targetIdList) : base(
        CmdIds.ChallengePeakSettleScNotify)
    {
        var peak = inst.Data.Peak!;
        var isBoss = inst.Config.BossExcel != null;

        var proto = new ChallengePeakSettleScNotify
        {
            IsWin = inst.IsWin,
            PeakId = peak.CurrentPeakLevelId,
            CyclesUsed = peak.RoundCnt
        };

        if (inst.IsWin && !isBoss)
            proto.IsUnlockEasyBoss = inst.Player.ChallengePeakManager!.WillUnlockEasyBoss(
                (int)peak.CurrentPeakGroupId, (int)peak.CurrentPeakLevelId);

        if (inst.IsWin && isBoss && peak.IsHard)
        {
            // 绝境王棋通关：客户端按红色绝境模板渲染钻石+三星，不下发普通目标列表
            proto.HardModeHasPassed = true;
        }
        else
        {
            proto.FinishedTargetList.AddRange(targetIdList);
            if (inst.IsWin && isBoss)
            {
                // 普通王棋：仅0轮通关达成颜色目标→钻石；其余按完成目标数显示铜/银/金, turnLeft=最大轮次−已用
                var maxParam = inst.Config.NormalTargetList
                    .Select(t => GameData.BattleTargetConfigData.GetValueOrDefault(t)?.TargetParam ?? 0)
                    .DefaultIfEmpty(0).Max();
                var isDiamond = peak.RoundCnt == 0;
                proto.TurnLeft = (uint)Math.Max(0, maxParam - (int)peak.RoundCnt);
                proto.IsBossTargetBetter = isDiamond;
                proto.HardModeHasPassed = isDiamond;
            }
        }

        SetData(proto);
    }
}
