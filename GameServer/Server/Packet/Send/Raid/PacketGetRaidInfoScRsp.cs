using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Raid;

public class PacketGetRaidInfoScRsp : BasePacket
{
    public PacketGetRaidInfoScRsp(PlayerInstance player) : base(CmdIds.GetRaidInfoScRsp)
    {
        var proto = new GetRaidInfoScRsp();

        foreach (var recordDict in player.RaidManager!.Data.RaidRecordDatas)
        foreach (var record in recordDict.Value)
            if (record.Value.Status == RaidStatus.Finish)
                proto.FinishedRaidInfoList.Add(new FinishedRaidInfo
                {
                    RaidId = (uint)record.Value.RaidId,
                    WorldLevel = (uint)record.Value.WorldLevel
                });

        SetData(proto);
    }
}
