using March7thHoney.GameServer.Game.Battle;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Adventure;

public class PacketQuickStartCocoonStageScRsp : BasePacket
{
    public PacketQuickStartCocoonStageScRsp() : base(CmdIds.QuickStartCocoonStageScRsp)
    {
        var rsp = new QuickStartCocoonStageScRsp
        {
            Retcode = 1
        };

        SetData(rsp);
    }

    public PacketQuickStartCocoonStageScRsp(BattleInstance battle, int cocoonId, int wave) : base(
        CmdIds.QuickStartCocoonStageScRsp)
    {
        var rsp = new QuickStartCocoonStageScRsp
        {
            CocoonId = (uint)cocoonId,
            Wave = (uint)wave,
            BattleInfo = battle.ToProto()
        };

        SetData(rsp);
    }
}

