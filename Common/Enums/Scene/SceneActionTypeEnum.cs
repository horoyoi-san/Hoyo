namespace March7thHoney.Enums.Scene;

public enum SceneActionTypeEnum
{
    Unknown = 0,
    SetGroupProperty,
    ChangeCurrentTargetPuzzle,
    SetGroupPropertyByCopyAnother,
    PropertyValueEqual,
    SetFloorSavedValue,
    CallCurrentTargetPuzzlePropertyAction,
    CallCurrentTargetPuzzlePropertyChanged
}