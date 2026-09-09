using March7thHoney.Database.Scene;
using March7thHoney.GameServer.Server.Packet.Send.MarkChest;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.MarkChest;

[Opcode(CmdIds.UpdateMarkChestCsReq)]
public class HandlerUpdateMarkChestCsReq : Handler<UpdateMarkChestCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UpdateMarkChestCsReq req)
    {
        List<SceneMarkedChestData> markedChestData = [];

        foreach (var markChestInfo in req.MarkChestInfoList)
            markedChestData.Add(new SceneMarkedChestData
            {
                ConfigId = (int)markChestInfo.ConfigId,
                FloorId = (int)markChestInfo.FloorId,
                GroupId = (int)markChestInfo.GroupId,
                PlaneId = (int)markChestInfo.PlaneId
            });

        foreach (var chestData in (player.SceneData!.MarkedChestData.GetValueOrDefault((int)req.FuncId) ?? []).Where(
                     chestData => markedChestData.All(x =>
                         !(x.ConfigId == chestData.ConfigId && x.FloorId == chestData.FloorId &&
                           x.GroupId == chestData.GroupId))))
            // Add the existing marked chest data if it is not in the new marked chest data
            markedChestData.Add(chestData);

        player.SceneData!.MarkedChestData[(int)req.FuncId] = markedChestData;

        await connection.SendPacket(new PacketUpdateMarkChestScRsp(req.FuncId, player));
    }
}
