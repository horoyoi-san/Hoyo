using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketOpenChestScNotify : BasePacket
{
    public PacketOpenChestScNotify(int chestId) : base(CmdIds.OpenChestScNotify)
    {
        var proto = new OpenChestScNotify
        {
            ChestId = (uint)chestId
        };

        SetData(proto);
    }
}
