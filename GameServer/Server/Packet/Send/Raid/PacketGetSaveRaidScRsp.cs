using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Raid;

public class PacketGetSaveRaidScRsp : BasePacket
{
    public PacketGetSaveRaidScRsp(PlayerInstance player, int raidId, int worldLevel) : base(CmdIds.GetSaveRaidScRsp)
    {
        var proto = new GetSaveRaidScRsp();

        if (player.RaidManager!.Data.RaidRecordDatas.TryGetValue(raidId, out var dict))
        {
            if (dict.TryGetValue(worldLevel, out var record))
            {
                proto.RaidId = (uint)record.RaidId;
                proto.WorldLevel = (uint)record.WorldLevel;
                proto.IsSave = record.Status != RaidStatus.Finish && record.Status != RaidStatus.None;
            }
            else
            {
                proto.Retcode = (uint)Retcode.RetRaidNoSave;
            }
        }
        else
        {
            proto.Retcode = (uint)Retcode.RetRaidNoSave;
        }

        SetData(proto);
    }
}
