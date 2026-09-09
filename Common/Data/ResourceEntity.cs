namespace March7thHoney.Data;

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public class ResourceEntity : Attribute
{
    public ResourceEntity(string fileName, bool isMultifile = false)
    {
        if (isMultifile)
            FileName = new List<string>(fileName.Split(','));
        else
            FileName = [fileName];
    }

    public ResourceEntity(string fileName)
    {
        FileName = [fileName];
    }

    public List<string> FileName { get; private set; }
}