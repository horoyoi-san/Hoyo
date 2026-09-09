using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainCakeCatch;

[Opcode(CmdIds.JGAMELLGLGE)]
public class HandlerRoomMovementCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = JGAMELLGLGE.Parser.ParseFrom(data);
        var player = connection.Player;
        if (player?.TrainCakeCatchManager == null)
            return;

        await player.TrainCakeCatchManager.HandleRoomMovement(req);
    }
}
