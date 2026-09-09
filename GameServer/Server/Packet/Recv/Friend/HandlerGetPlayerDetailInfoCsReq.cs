using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.GetPlayerDetailInfoCsReq)]
public class HandlerGetPlayerDetailInfoCsReq : Handler<GetPlayerDetailInfoCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetPlayerDetailInfoCsReq req)
    {
        var playerData = player.FriendManager!.GetFriendPlayerData([(int)req.Uid]).FirstOrDefault();
        if (playerData == null)
        {
            await connection.SendPacket(new PacketGetPlayerDetailInfoScRsp());
            return;
        }

        await connection.SendPacket(new PacketGetPlayerDetailInfoScRsp(playerData.ToDetailProto()));
    }
}
