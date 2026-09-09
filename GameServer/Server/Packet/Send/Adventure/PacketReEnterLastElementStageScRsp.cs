using March7thHoney.GameServer.Game.Battle;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Adventure;

public class PacketReEnterLastElementStageScRsp : BasePacket
{
    public PacketReEnterLastElementStageScRsp() : base(CmdIds.ReEnterLastElementStageScRsp)
    {
        var rsp = new ReEnterLastElementStageScRsp
        {
            Retcode = 1
        };

        SetData(rsp);
    }

    public PacketReEnterLastElementStageScRsp(BattleInstance battle, int stageId) : base(
        CmdIds.ReEnterLastElementStageScRsp)
    {
        var rsp = new ReEnterLastElementStageScRsp
        {
            StageId = (uint)stageId,
            BattleInfo = battle.ToProto()
        };

        SetData(rsp);
    }
}
