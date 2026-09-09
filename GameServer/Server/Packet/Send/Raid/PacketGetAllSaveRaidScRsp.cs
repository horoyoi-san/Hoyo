using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Raid;

public class PacketGetAllSaveRaidScRsp : BasePacket
{
    public PacketGetAllSaveRaidScRsp(PlayerInstance player) : base(CmdIds.GetAllSaveRaidScRsp)
    {
        var proto = new GetAllSaveRaidScRsp();

        foreach (var dict in player.RaidManager!.Data.RaidRecordDatas.Values)
        foreach (var record in dict.Values)
            proto.RaidDataList.Add(new RaidData
            {
                RaidId = (uint)record.RaidId,
                WorldLevel = (uint)record.WorldLevel
            });

        SetData(proto);
    }
}
