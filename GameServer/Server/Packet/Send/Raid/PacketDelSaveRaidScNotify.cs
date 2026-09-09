using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Raid;

public class PacketDelSaveRaidScNotify : BasePacket
{
    public PacketDelSaveRaidScNotify(int raidId, int worldLevel) : base(CmdIds.DelSaveRaidScNotify)
    {
        var proto = new DelSaveRaidScNotify
        {
            RaidId = (uint)raidId,
            WorldLevel = (uint)worldLevel
        };

        SetData(proto);
    }
}
