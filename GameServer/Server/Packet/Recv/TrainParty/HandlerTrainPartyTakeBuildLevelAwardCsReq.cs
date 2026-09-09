using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyTakeBuildLevelAwardCsReq)]
public class HandlerTrainPartyTakeBuildLevelAwardCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainPartyTakeBuildLevelAwardCsReq.Parser.ParseFrom(data);
        var manager = connection.Player!.TrainPartyManager!;
        // 4.4 TakeBuildLevelAward req carries no level field; awards are not driven under the display-layer port.
        var ret = manager.TakeBuildLevelAward(out var items);

        var rsp = new BasePacket(CmdIds.TrainPartyTakeBuildLevelAwardScRsp);
        rsp.SetData(new TrainPartyTakeBuildLevelAwardScRsp
        {
            ItemList = items,
            Retcode = ret
        });
        await connection.SendPacket(rsp);
    }
}
