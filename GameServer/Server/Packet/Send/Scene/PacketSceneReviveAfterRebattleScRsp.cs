using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSceneReviveAfterRebattleScRsp : BasePacket
{
    public PacketSceneReviveAfterRebattleScRsp(Retcode code = Retcode.RetSucc)
        : base(CmdIds.SceneReviveAfterRebattleScRsp)
    {
        SetData(new SceneReviveAfterRebattleScRsp
        {
            Retcode = (uint)code
        });
    }
}
