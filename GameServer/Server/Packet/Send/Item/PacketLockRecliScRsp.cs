using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketLockRelicScRsp : BasePacket
{
    public PacketLockRelicScRsp(bool success) : base(CmdIds.LockRelicScRsp)
    {
        LockRelicScRsp proto = new();

        if (!success) proto.Retcode = (uint)Retcode.RetFail;

        SetData(proto);
    }
}
