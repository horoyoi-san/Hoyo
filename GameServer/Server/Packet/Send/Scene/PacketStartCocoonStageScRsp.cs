using March7thHoney.GameServer.Game.Battle;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketStartCocoonStageScRsp : BasePacket
{
    public PacketStartCocoonStageScRsp() : base(CmdIds.StartCocoonStageScRsp)
    {
        var rsp = new StartCocoonStageScRsp
        {
            Retcode = 1
        };

        SetData(rsp);
    }

    public PacketStartCocoonStageScRsp(BattleInstance battle, int cocoonId, int wave) : base(
        CmdIds.StartCocoonStageScRsp)
    {
        var rsp = new StartCocoonStageScRsp
        {
            CocoonId = (uint)cocoonId,
            Wave = (uint)wave,
            BattleInfo = battle.ToProto()
        };

        SetData(rsp);
    }
}
