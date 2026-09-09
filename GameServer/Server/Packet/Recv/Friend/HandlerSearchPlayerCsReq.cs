using March7thHoney.Database.Player;
using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.SearchPlayerCsReq)]
public class HandlerSearchPlayerCsReq : Handler<SearchPlayerCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SearchPlayerCsReq req)
    {
        var playerList = new List<PlayerData>();

        foreach (var uid in req.UidList)
        {
            var match = player.FriendManager!.GetFriendPlayerData([(int)uid])
                .FirstOrDefault(x => x.Uid == (int)uid);
            if (match != null) playerList.Add(match);
        }

        if (playerList.Count == 0)
            await connection.SendPacket(new PacketSearchPlayerScRsp());
        else
            await connection.SendPacket(new PacketSearchPlayerScRsp(playerList));
    }
}
