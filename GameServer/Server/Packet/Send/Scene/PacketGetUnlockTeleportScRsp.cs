using March7thHoney.Data;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketGetUnlockTeleportScRsp : BasePacket
{
    public PacketGetUnlockTeleportScRsp(GetUnlockTeleportCsReq req) : base(CmdIds.GetUnlockTeleportScRsp)
    {
        var rsp = new GetUnlockTeleportScRsp();
        foreach (var entranceId in req.EntryIdList)
        {
            GameData.MapEntranceData.TryGetValue((int)entranceId, out var excel);
            if (excel == null) continue;

            GameData.GetFloorInfo(excel.PlaneID, excel.FloorID, out var floorInfo);
            if (floorInfo == null) continue;

            foreach (var teleport in floorInfo.CachedTeleports)
                rsp.UnlockedTeleportList.Add((uint)teleport.Value.MappingInfoID);
        }

        SetData(rsp);
    }
}
