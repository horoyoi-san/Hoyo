using March7thHoney.GameServer.Game.Battle;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSceneEnterStageScRsp : BasePacket
{
    public PacketSceneEnterStageScRsp() : base(CmdIds.SceneEnterStageScRsp)
    {
        var proto = new SceneEnterStageScRsp
        {
            Retcode = 1
        };

        SetData(proto);
    }

    public PacketSceneEnterStageScRsp(BattleInstance battleInstance) : base(CmdIds.SceneEnterStageScRsp)
    {
        var proto = new SceneEnterStageScRsp
        {
            BattleInfo = battleInstance.ToProto()
        };

        SetData(proto);
    }
}
