using March7thHoney.GameServer.Server.Packet.Send.TrainParty;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyGamePlayStartCsReq)]
public class HandlerTrainPartyGamePlayStartCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainPartyGamePlayStartCsReq.Parser.ParseFrom(data);
        var manager = connection.Player!.TrainPartyManager!;
        var ret = manager.StartGameplay(req.IDBDBICPBBG, out var gameplayData);

        var rsp = new BasePacket(CmdIds.TrainPartyGamePlayStartScRsp);
        rsp.SetData(new TrainPartyGamePlayStartScRsp
        {
            FJKHJADDKLD = gameplayData,
            Retcode = ret
        });
        await connection.SendPacket(rsp);
        await connection.SendPacket(new PacketTrainPartyMoveScNotify(connection.Player!));
    }
}
