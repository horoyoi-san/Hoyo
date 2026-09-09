using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.SetGroupCustomSaveDataCsReq)]
public class HandlerSetGroupCustomSaveDataCsReq : Handler<SetGroupCustomSaveDataCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetGroupCustomSaveDataCsReq req)
    {
        // Persist the client's per-group custom save blob; it is replayed in SceneInfo.CustomDataList on the
        // next scene load (SceneInstance.Serialization, CustomSaveData[entryId][groupId]).
        player.SetGroupCustomSaveData((int)req.EntryId, (int)req.GroupId, req.SaveData);

        await connection.SendPacket(new PacketSetGroupCustomSaveDataScRsp(req.EntryId, req.GroupId));
    }
}
