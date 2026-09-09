using MemoryPack;
namespace March7thHoney.Data;

[MemoryPackable]
public partial class ExcelResource
{
    public virtual int GetId()
    {
        return 0;
    }

    public virtual void Loaded()
    {
    }

    public virtual void Finalized()
    {
    }

    public virtual void AfterAllDone()
    {
    }
}
