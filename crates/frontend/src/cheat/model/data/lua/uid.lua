local uid = function()
    local text = UID_TEXT
    CS.UnityEngine.QualitySettings.vSyncCount = 0
    local hint = CS.UnityEngine.GameObject.Find("/UIRoot/AboveDialog/BetaHintDialog(Clone)/Contents/VersionText")
    hint.transform.localScale = CS.UnityEngine.Vector3(1.5, 1.5, 1.5)
    hint.transform.localPosition = CS.UnityEngine.Vector3(1, 15, 1)
    hint:GetComponent("Text").text = tostring("<color=#FF0000>" .. text .. "</color>")
    
    local hint2 = CS.UnityEngine.GameObject.Find("/UIRoot/AboveDialog/BetaHintDialog(Clone)/Contents/HintText")
    local hint2text = hint2:GetComponent("Text")
    hint2text.text = tostring("<color=#FF000033>" .. text .. "</color>")
    hint2text.fontSize = 80.0
    hint2.transform.localPosition = CS.UnityEngine.Vector3(1050, 650, 0)
    hint2text.horizontalOverflow = 1
    hint2text.verticalOverflow = 1
    hint2:SetActive(true)
end

uid()