using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSetGroupCustomSaveDataScRsp : BasePacket
{
    public PacketSetGroupCustomSaveDataScRsp(uint entryId, uint groupId) : base(CmdIds.SetGroupCustomSaveDataScRsp)
    {
        var proto = new SetGroupCustomSaveDataScRsp
        {
            EntryId = entryId,
            GroupId = groupId
        };
        SetData(proto);
    }
}
