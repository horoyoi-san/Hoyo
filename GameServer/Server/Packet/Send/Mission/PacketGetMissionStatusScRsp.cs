using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mission;

public class PacketGetMissionStatusScRsp : BasePacket
{
    public PacketGetMissionStatusScRsp(GetMissionStatusCsReq req, PlayerInstance player) : base(
        CmdIds.GetMissionStatusScRsp)
    {
        var proto = new GetMissionStatusScRsp();

        foreach (var item in req.MainMissionIdList)
        {
            var status = player.MissionManager!.GetMainMissionStatus((int)item);
            if (status == MissionPhaseEnum.Finish)
            {
                proto.FinishedMainMissionIdList.Add(item);
                proto.CurversionFinishedMainMissionIdList.Add(item);
            }
            else
            {
                proto.UnfinishedMainMissionIdList.Add(item);
            }
        }

        foreach (var item in req.SubMissionIdList)
        {
            var status = player.MissionManager!.GetSubMissionStatus((int)item);
            proto.SubMissionStatusList.Add(new Proto.Mission
            {
                Id = item,
                Status = status.ToProto()
            });
        }

        SetData(proto);
    }
}
