using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketServerAnnounceNotify : BasePacket
{
    public PacketServerAnnounceNotify(
        string? customContent = null,
        long? durationSeconds = null,
        uint? bannerFrequencySeconds = null) : base(CmdIds.ServerAnnounceNotify)
    {
        var announceCfg = ConfigManager.Config.ServerOption.ServerAnnounce;
        var content = string.IsNullOrWhiteSpace(customContent)
            ? announceCfg.AnnounceContent
            : customContent;
        if (string.IsNullOrWhiteSpace(content)) return;

        var proto = new ServerAnnounceNotify();
        var now = Extensions.GetUnixSec();
        var duration = Math.Clamp(durationSeconds ?? announceCfg.GetDurationSeconds(), 1, DurationParser.MaxDurationSeconds);
        var frequency = bannerFrequencySeconds ?? announceCfg.GetBannerFrequencySeconds();
        if (frequency == 0) frequency = 1;

        proto.AnnounceDataList.Add(new AnnounceData
        {
            BeginTime = now,
            EndTime = now + duration,
            ConfigId = 1,
            BannerFrequency = frequency,
            HasRecommand = true,
            EmergencyText = content,
            BannerText = content
        });

        SetData(proto);
    }
}
