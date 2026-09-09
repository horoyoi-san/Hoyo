using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Expedition;

public class PacketGetExpeditionDataScRsp : BasePacket
{
    public PacketGetExpeditionDataScRsp(PlayerInstance player) : base(CmdIds.GetExpeditionDataScRsp)
    {
        var manager = player.ExpeditionManager!;
        // 4.3: KAMBBFDEBAM -> BJMGDBCHEAN (refresh time), NBKFAEDOGPG -> CAALNNFJIAH (expedition ids)
        var proto = new GetExpeditionDataScRsp
        {
            BJMGDBCHEAN = manager.GetRefreshTime(),
            TotalExpeditionCount = manager.GetTotalExpeditionCount()
        };

        proto.CAALNNFJIAH.Add(manager.GetAllExpeditionIds());
        proto.ExpeditionInfo.Add(manager.GetActiveExpeditionInfo());

        SetData(proto);
    }
}
