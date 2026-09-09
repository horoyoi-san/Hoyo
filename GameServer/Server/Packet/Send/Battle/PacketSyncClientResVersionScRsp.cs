using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Battle;

public class PacketSyncClientResVersionScRsp : BasePacket
{
    public PacketSyncClientResVersionScRsp(uint clientResVersion) : base(CmdIds.SyncClientResVersionScRsp)
    {
        SetData(new SyncClientResVersionScRsp
        {
            ClientResVersion = clientResVersion
        });
    }
}
