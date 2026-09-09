using March7thHoney.Data.Excel;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;
using March7thHoney.GameServer.Game.Challenge;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Challenge.Definitions;

public abstract class BaseLegacyChallengeInstance(PlayerInstance player, ChallengeStateData data)
    : BaseChallengeInstance(player, data)
{
    public bool IsWin { get; set; }
    public abstract ChallengeConfigExcel Config { get; }
    public abstract CurChallenge ToProto();

    public abstract uint GetStars();
    public abstract int GetCurrentExtraLineupType();
    public abstract void SetStartPos(Position pos);
    public abstract void SetStartRot(Position rot);
    public abstract void SetSavedMp(int mp);

    public virtual uint GetScore1()
    {
        return 0;
    }

    public virtual uint GetScore2()
    {
        return 0;
    }

    public virtual ChallengeStageInfo ToStageInfo()
    {
        return new ChallengeStageInfo();
    }
}
