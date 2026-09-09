using March7thHoney.GameServer.Server.Packet.Send.TrainCakeCatch;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainCakeCatch;

[Opcode(CmdIds.TrainCakeCatchDiyCsReq)]
public class HandlerTrainCakeCatchDiyCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainCakeCatchDiyCsReq.Parser.ParseFrom(data);
        var player = connection.Player!;
        var diy = player.TrainCakeCatchManager!.ApplyDiy(req.NLJBJMDPBGN ?? new BFAKMCIJFCB());
        await connection.SendPacket(new PacketTrainCakeCatchDiyScRsp(diy));

        // The room snapshot already carries both DIY and cat-tree state, so rebroadcast it
        // whenever the visible room setup changes while the owner is in a social room.
        await player.TrainCakeCatchManager.BroadcastRoomSnapshotAsync();
    }
}
