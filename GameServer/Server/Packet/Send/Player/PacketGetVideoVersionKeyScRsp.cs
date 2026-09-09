using March7thHoney.Data;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketGetVideoVersionKeyScRsp : BasePacket
{
    public PacketGetVideoVersionKeyScRsp() : base(CmdIds.GetVideoVersionKeyScRsp)
    {
        var proto = new GetVideoVersionKeyScRsp
        {
            ActivityVideoKeyInfoList =
            {
                GameData.VideoKeysConfig.ActivityVideoKeyData.Select(activity => new VideoKeyInfo
                {
                    Id = (uint)activity.Id
                })
            },
            VideoKeyInfoList =
            {
                GameData.VideoKeysConfig.VideoKeyInfoData.Select(video => new VideoKeyInfo
                {
                    Id = (uint)video.Id
                })
            }
        };

        SetData(proto);
    }
}
