using March7thHoney.GameServer.Server.Packet.Send.Multiplayer;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Multiplayer;

[Opcode(CmdIds.MultiplayerGetFightGateCsReq)]
public class HandlerMultiplayerGetFightGateCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var room = ServerUtils.MultiPlayerGameServerManager.GetPlayerJoinedRoom(connection.Player!.Uid);
        if (room == null)
        {
            await connection.SendPacket(new PacketMultiplayerGetFightGateScRsp(Retcode.RetFightRoomNotExist));
            return;
        }

        await connection.SendPacket(new PacketMultiplayerGetFightGateScRsp(room));
    }
}
