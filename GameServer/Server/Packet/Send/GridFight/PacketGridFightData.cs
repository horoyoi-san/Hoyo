using March7thHoney.GameServer.Game.GridFight;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.GridFight;

public sealed class PacketGridFightGetDataScRsp : BasePacket
{
    public PacketGridFightGetDataScRsp(PlayerInstance player) : base(CmdIds.GridFightGetDataScRsp)
    {
        var manager = player.GridFightManager!;
        var response = new GridFightGetDataScRsp
        {
            SystemInfo = manager.BuildSystemInfo(),
        };
        if (manager.BuildCurrentInfo() is { } current) response.CurrentInfo = current;
        SetData(response);
    }
}

public sealed class PacketGridFightSyncUpdateResultScNotify : BasePacket
{
    public PacketGridFightSyncUpdateResultScNotify(GridFightSyncUpdateResultScNotify data)
        : base(CmdIds.GridFightSyncUpdateResultScNotify)
    {
        SetData(data);
    }
}

public sealed class PacketGridFightEndBattleStageNotify : BasePacket
{
    public PacketGridFightEndBattleStageNotify(GridFightEndBattleStageNotify data)
        : base(CmdIds.GridFightEndBattleStageNotify)
    {
        SetData(data);
    }
}

public sealed class PacketGridFightSyncKeepWinCntNotify : BasePacket
{
    public PacketGridFightSyncKeepWinCntNotify(uint keepWinCount)
        : base(CmdIds.GridFightSyncKeepWinCntNotify)
    {
        SetData(new GridFightSyncKeepWinCntNotify { KeepWinCount = keepWinCount });
    }
}

public sealed class PacketGridFightSettleNotify : BasePacket
{
    public PacketGridFightSettleNotify(GridFightSettleNotify data)
        : base(CmdIds.GridFightSettleNotify)
    {
        SetData(data);
    }
}

public sealed class PacketGridFightEnterBattleStageScRsp : BasePacket
{
    public PacketGridFightEnterBattleStageScRsp(SceneBattleInfo? battleInfo)
        : base(CmdIds.GridFightEnterBattleStageScRsp)
    {
        var response = new GridFightEnterBattleStageScRsp();
        if (battleInfo == null) response.Retcode = (uint)Retcode.RetFail;
        else response.BattleInfo = battleInfo;
        SetData(response);
    }
}
