using March7thHoney.GameServer.Server.Packet.Send.Shop;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Shop;

[Opcode(CmdIds.GetShopListCsReq)]
public class HandlerGetShopListCsReq : Handler<GetShopListCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetShopListCsReq req)
    {
        await connection.SendPacket(new PacketGetShopListScRsp(req.ShopType));
    }
}
