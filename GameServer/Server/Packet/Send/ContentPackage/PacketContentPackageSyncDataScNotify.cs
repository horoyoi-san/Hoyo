using March7thHoney.Data;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ContentPackage;

public class PacketContentPackageSyncDataScNotify : BasePacket
{
    public PacketContentPackageSyncDataScNotify() : base(CmdIds.ContentPackageSyncDataScNotify)
    {
        var proto = new ContentPackageSyncDataScNotify
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
