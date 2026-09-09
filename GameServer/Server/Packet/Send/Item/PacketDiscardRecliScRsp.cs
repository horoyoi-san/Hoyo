using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketDiscardRelicScRsp : BasePacket
{
    public PacketDiscardRelicScRsp(bool success, bool isDiscard) : base(CmdIds.DiscardRelicScRsp)
    {
        DiscardRelicScRsp proto = new();

        if (success) proto.DKPCAIGPHNO = isDiscard;
        else proto.Retcode = (uint)Retcode.RetFail;

        SetData(proto);
    }
}

