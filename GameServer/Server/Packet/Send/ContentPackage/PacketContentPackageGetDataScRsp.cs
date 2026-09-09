using March7thHoney.Data;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ContentPackage;

public class PacketContentPackageGetDataScRsp : BasePacket
{
    public PacketContentPackageGetDataScRsp() : base(CmdIds.ContentPackageGetDataScRsp)
    {
        var proto = new ContentPackageGetDataScRsp
        {
            Data = new ContentPackageData
            {
                ContentPackageList =
                {
                    GameData.ContentPackageConfigData.Select(x => new ContentPackageInfo
                    {
                        ContentId = (uint)x.Key,
                        Status = ContentPackageStatus.Finished
                    })
                }
            }
        };

        SetData(proto);
    }
}
