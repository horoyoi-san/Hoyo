using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainCakeCatch;

[Opcode(CmdIds.TrainCakeCatchOpenBoxCsReq)]
public class HandlerTrainCakeCatchOpenBoxCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var packet = new BasePacket(CmdIds.TrainCakeCatchOpenBoxScRsp);
        var player = connection.Player!;
        packet.SetData(player.TrainCakeCatchManager!.OpenBox());
        await connection.SendPacket(packet);

        // Opening the box can seed or change the room's visible cat-tree setup.
        await player.TrainCakeCatchManager.BroadcastRoomSnapshotAsync();
    }
}
