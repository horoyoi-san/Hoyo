using March7thHoney.GameServer.Server.Packet.Send.RollShop;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.RollShop;

[Opcode(CmdIds.GetRollShopInfoCsReq)]
public class HandlerGetRollShopInfoCsReq : Handler<GetRollShopInfoCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetRollShopInfoCsReq req)
    {
        await connection.SendPacket(new PacketGetRollShopInfoScRsp(req.RollShopId));
    }
}
