using MemoryPack;
using March7thHoney.Data;
using March7thHoney.Enums.Mission;

namespace March7thHoney.Database.Scene;

[DbTable("HeartDial")]
public class HeartDialData : BaseDatabaseDataHelper
{
    public Dictionary<int, HeartDialInfo> DialList { get; set; } = [];

    public HeartDialInfo ChangeScriptEmotion(int scriptId, HeartDialEmoTypeEnum emoType, HeartDialStepTypeEnum stepType)
    {
        if (DialList.TryGetValue(scriptId, out var dialInfo))
        {
            dialInfo.EmoType = emoType;
            dialInfo.StepType = stepType;
        }
        else
        {
            DialList.Add(scriptId, new HeartDialInfo
            {
                ScriptId = scriptId,
                EmoType = emoType,
                StepType = stepType
            });

            dialInfo = DialList[scriptId];
        }

        return dialInfo;
    }

    public HeartDialInfo ChangeScriptEmotion(int scriptId, HeartDialEmoTypeEnum emoType)
    {
        if (DialList.TryGetValue(scriptId, out var dialInfo))
        {
            dialInfo.EmoType = emoType;
        }
        else
        {
            GameData.HeartDialScriptData.TryGetValue(scriptId, out var scriptData);
            DialList.Add(scriptId, new HeartDialInfo
            {
                ScriptId = scriptId,
                EmoType = emoType,
                StepType = scriptData?.StepList[0] ?? HeartDialStepTypeEnum.Normal
            });

            dialInfo = DialList[scriptId];
        }

        return dialInfo;
    }
}

[MemoryPackable]
public partial class HeartDialInfo
{
    public int ScriptId { get; set; }
    public HeartDialEmoTypeEnum EmoType { get; set; } = HeartDialEmoTypeEnum.Peace;
    public HeartDialStepTypeEnum StepType { get; set; } = HeartDialStepTypeEnum.Normal;
}
