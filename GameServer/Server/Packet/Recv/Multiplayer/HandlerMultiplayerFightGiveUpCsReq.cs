using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Multiplayer;

[Opcode(CmdIds.MultiplayerFightGiveUpCsReq)]
public class HandlerMultiplayerFightGiveUpCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        // 4.4 request (IHGLPGLPDFF) is empty — the 4.2 version carried a room id, so resolve the
        // player's joined room server-side instead.
        var room = ServerUtils.MultiPlayerGameServerManager.GetPlayerJoinedRoom(connection.Player!.Uid);
        var player = room?.GetPlayerById(connection.Player!.Uid);
        if (player != null)
            player.LeaveGame = true;

        var rsp = new BasePacket(CmdIds.MultiplayerFightGiveUpScRsp);
        rsp.SetData(new JJAGFPLDCAF { Retcode = 0 });
        await connection.SendPacket(rsp);
    }
}
