using MemoryPack;
using March7thHoney.Proto;

namespace March7thHoney.Database.Tutorial;

[DbTable("TutorialGuide")]
public class TutorialGuideData : BaseDatabaseDataHelper
{
    public Dictionary<int, TutorialStatus> Tutorials { get; set; } = [];
}
