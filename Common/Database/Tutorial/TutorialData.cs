using MemoryPack;
using March7thHoney.Proto;

namespace March7thHoney.Database.Tutorial;

[DbTable("Tutorial")]
public class TutorialData : BaseDatabaseDataHelper
{
    public Dictionary<int, TutorialStatus> Tutorials { get; set; } = [];
}
