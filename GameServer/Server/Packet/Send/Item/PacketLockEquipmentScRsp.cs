using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketLockEquipmentScRsp : BasePacket
{
    public PacketLockEquipmentScRsp(bool success) : base(CmdIds.LockEquipmentScRsp)
    {
        LockEquipmentScRsp proto = new();

        if (!success) proto.Retcode = (uint)Retcode.RetFail;

        SetData(proto);
    }
}
