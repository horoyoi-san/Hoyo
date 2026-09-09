using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.StartChallengeCsReq)]
public class HandlerStartChallengeCsReq : Handler<StartChallengeCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, StartChallengeCsReq req)
    {
        ChallengeStoryBuffInfo? storyBuffInfo = null;
        if (req.StageInfo is { StoryInfo: not null })
            storyBuffInfo = req.StageInfo.StoryInfo;

        ChallengeBossBuffInfo? bossBuffInfo = null;
        if (req.StageInfo != null && req.StageInfo.BossInfo != null) bossBuffInfo = req.StageInfo.BossInfo;

        // 4.3 瀹㈡埛绔妸涓婁笅鍗婄紪闃熸媶鎴愪袱涓?AvatarIdentifier 鍒楄〃鍙戯紝鐩稿 4.2 瀛楁
        // 璇箟瀵硅皟锛?.2 鏃?field 13 = 涓婂崐锛?.3 鎶撳寘纭 field 1 ABNDFKFIKCI = 涓婂崐锛?
        // field 13 BKNKLEOCJNO = 涓嬪崐锛夈€傛棫鐗堟湰 client 鐢?first_lineup / second_lineup
        // packed uint32 浣?fallback銆?
        var firstLineup = req.AvatarLineupFirst.Count > 0
            ? req.AvatarLineupFirst.Select(x => (int)x.Id).Where(x => x > 0).ToList()
            : req.FirstLineup.Select(x => (int)x).Where(x => x > 0).ToList();
        if (firstLineup.Count > 0)
            await player.LineupManager!.ReplaceLineup(0, firstLineup, ExtraLineupType.LineupChallenge);

        var secondLineup = req.AvatarLineupSecond.Count > 0
            ? req.AvatarLineupSecond.Select(x => (int)x.Id).Where(x => x > 0).ToList()
            : req.SecondLineup.Select(x => (int)x).Where(x => x > 0).ToList();
        if (secondLineup.Count > 0)
            await player.LineupManager!.ReplaceLineup(0, secondLineup, ExtraLineupType.LineupChallenge2);

        await player.ChallengeManager!.StartChallenge((int)req.ChallengeId, storyBuffInfo, bossBuffInfo);
    }
}
