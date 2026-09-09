using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Message;

public class PacketFinishItemIdScRsp : BasePacket
{
    public PacketFinishItemIdScRsp(uint itemId) : base(CmdIds.FinishItemIdScRsp)
    {
        var proto = new FinishItemIdScRsp
        {
            ItemId = itemId
        };
        SetData(proto);
    }
}
