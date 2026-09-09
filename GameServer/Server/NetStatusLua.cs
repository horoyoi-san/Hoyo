using System.Globalization;
using March7thHoney.Configuration;

namespace March7thHoney.GameServer.Server;

public static class NetStatusLua
{
    private const string ResetScript = """
        do
            local state = rawget(_G, "__march7thhoney_netstatus")
            if state ~= nil and state.stop ~= nil then pcall(state.stop) end
        end
        """;

    public static string Build(NetStatusConfig? config)
    {
        if (config?.Enabled != true || !config.TryGetColor(out var rgb)) return ResetScript;
        var color = $"#{rgb:X6}";
        var latency = config.LatencyMs.ToString(CultureInfo.InvariantCulture);
        var red = ((rgb >> 16) & 255).ToString(CultureInfo.InvariantCulture);
        var green = ((rgb >> 8) & 255).ToString(CultureInfo.InvariantCulture);
        var blue = (rgb & 255).ToString(CultureInfo.InvariantCulture);

        return $$"""
            do
                local KEY = "__march7thhoney_netstatus"
                local COLOR = "{{color}}"
                local FIXED_MS = {{latency}}
                local UE = CS.UnityEngine
                local TINT = UE.Color({{red}} / 255, {{green}} / 255, {{blue}} / 255, 1)
                local previous = rawget(_G, KEY)
                local state
                local reported = {}

                local function report(stage, err)
                    if reported[stage] then return end
                    reported[stage] = true
                    local message = "[NetStatus] " .. stage .. ": " .. tostring(err)
                    pcall(function() UE.Debug.LogWarning(message) end)
                    pcall(function()
                        local file = io.open("netstatus-error.log", "a")
                        if file ~= nil then
                            file:write(message .. "\n")
                            file:close()
                        end
                    end)
                end

                local function attempt(stage, fn, ...)
                    local ok, err = pcall(fn, ...)
                    if not ok then report(stage, err) end
                    return ok
                end

                local function alive(obj)
                    return obj ~= nil
                end

                local function replace_handlers(old, replacement)
                    local g = rawget(_G, "G")
                    local nm = g ~= nil and g.NotifyManager or nil
                    if nm == nil or nm._NotifyHandlers == nil then return false end
                    local hit = false
                    for _, by_group in pairs(nm._NotifyHandlers) do
                        for _, list in pairs(by_group) do
                            for i = 1, #list do
                                if list[i][1] == old then
                                    list[i][1] = replacement
                                    hit = true
                                end
                            end
                        end
                    end
                    return hit
                end

                local function recolor(sp)
                    local rt, tex, output
                    local active = UE.RenderTexture.active
                    local ok, err = pcall(function()
                        local tr = sp.textureRect
                        local src = sp.texture
                        local w, h = math.floor(tr.width), math.floor(tr.height)
                        rt = UE.RenderTexture.GetTemporary(w, h, 0)
                        UE.Graphics.Blit(src, rt,
                            UE.Vector2(tr.width / src.width, tr.height / src.height),
                            UE.Vector2(tr.x / src.width, tr.y / src.height))
                        UE.RenderTexture.active = rt
                        tex = UE.Texture2D(w, h)
                        tex:ReadPixels(UE.Rect(0, 0, w, h), 0, 0)
                        tex:Apply()
                        UE.RenderTexture.active = active
                        UE.RenderTexture.ReleaseTemporary(rt)
                        rt = nil
                        local pixels = tex:GetPixels()
                        for i = 0, pixels.Length - 1 do
                            local pixel = pixels[i]
                            if pixel.a > 0 then pixels[i] = UE.Color(TINT.r, TINT.g, TINT.b, pixel.a) end
                        end
                        tex:SetPixels(pixels)
                        tex:Apply()
                        tex.hideFlags = UE.HideFlags.HideAndDontSave
                        local pivot = UE.Vector2(sp.pivot.x / tr.width, sp.pivot.y / tr.height)
                        output = UE.Sprite.Create(tex, UE.Rect(0, 0, w, h), pivot, sp.pixelsPerUnit)
                        output.name = tostring(sp.name) .. "_netstatus_{{color}}"
                        output.hideFlags = UE.HideFlags.HideAndDontSave
                    end)
                    UE.RenderTexture.active = active
                    if rt ~= nil then UE.RenderTexture.ReleaseTemporary(rt) end
                    if not ok then
                        if output ~= nil then UE.Object.Destroy(output) end
                        if tex ~= nil then UE.Object.Destroy(tex) end
                        error(err)
                    end
                    return { original = sp, sprite = output, texture = tex }
                end

                local function ensure_tinted(img)
                    local sp = img.sprite
                    if not alive(sp) then return end
                    local id = sp:GetInstanceID()
                    local hit = state.tinted[id]
                    if hit == nil then
                        local cache_key = COLOR .. ":" .. tostring(id)
                        hit = state.cache[cache_key]
                        if hit == nil then
                            hit = recolor(sp)
                            state.cache[cache_key] = hit
                            state.tinted[hit.sprite:GetInstanceID()] = hit
                        end
                    end
                    if state.images[img] == nil then
                        state.images[img] = { sprite = hit.original, color = img.color }
                    end
                    img.sprite = hit.sprite
                    img.color = UE.Color(1, 1, 1, img.color.a)
                end

                local function signal_rate()
                    local g = rawget(_G, "G")
                    local cls = g ~= nil and g.NetStatusPanel or nil
                    if cls == nil or cls._get_signal_rate == nil then return 1 end
                    local ok, rate = pcall(cls._get_signal_rate, cls, FIXED_MS)
                    if ok and rate ~= nil then return rate / 3 end
                    return 1
                end

                local function paint(bar, text)
                    if alive(bar) then
                        if state.bars[bar] == nil then state.bars[bar] = bar.CurRate end
                        bar.CurRate = signal_rate()
                        if bar.BarNodes ~= nil then
                            for i = 0, bar.BarNodes.Count - 1 do
                                local node = bar.BarNodes[i]
                                if alive(node) then
                                    local img = node:GetComponent(typeof(UE.UI.Image))
                                    if alive(img) then attempt("recolor", ensure_tinted, img) end
                                end
                            end
                        end
                    end
                    if alive(text) then
                        if state.texts[text] == nil then
                            state.texts[text] = { text = text.text, color = text.color }
                        end
                        text:SafeSetTextID("UIText_Network_Signal_Suffix", FIXED_MS)
                        text:SafeSetTextColor(COLOR)
                    end
                end

                local function apply(self)
                    state.panels[self] = true
                    local binder = self._binder
                    if binder ~= nil then attempt("panel", paint, binder.bar_signal, binder.text_time) end
                end

                local function try_hook()
                    local g = rawget(_G, "G")
                    local cls = g ~= nil and g.NetStatusPanel or nil
                    if cls == nil or cls._refresh_rtt == nil then return false end
                    local old = cls._refresh_rtt
                    if not replace_handlers(old, apply) then return false end
                    state.class = cls
                    state.old_refresh = old
                    state.old_color = cls._get_text_color
                    state.color_function = function() return COLOR end
                    cls._get_text_color = state.color_function
                    cls._refresh_rtt = apply
                    return true
                end

                local function prune(objects)
                    for obj in pairs(objects) do
                        local ok = pcall(function() return obj.name end)
                        if not ok then objects[obj] = nil end
                    end
                end

                local function sweep()
                    prune(state.images)
                    prune(state.texts)
                    prune(state.bars)
                    local bars = UE.GameObject.FindObjectsOfType(typeof(CS.RPG.Client.DiscreteBar))
                    if bars == nil then return end
                    for i = 0, bars.Length - 1 do
                        local bar = bars[i]
                        if alive(bar) then
                            attempt("sweep bar", function()
                                local time = bar.transform:Find("Connected/Time")
                                if alive(time) then paint(bar, time:GetComponent(typeof(UE.UI.Text))) end
                            end)
                        end
                    end
                end

                local function stop()
                    state.active = false
                    if state.class ~= nil then
                        pcall(replace_handlers, apply, state.old_refresh)
                        if state.class._refresh_rtt == apply then state.class._refresh_rtt = state.old_refresh end
                        if state.class._get_text_color == state.color_function then
                            state.class._get_text_color = state.old_color
                        end
                    end
                    for img, original in pairs(state.images) do
                        pcall(function()
                            if alive(img) then
                                img.sprite = original.sprite
                                img.color = original.color
                            end
                        end)
                    end
                    for text, original in pairs(state.texts) do
                        pcall(function()
                            if alive(text) then
                                text.text = original.text
                                text.color = original.color
                            end
                        end)
                    end
                    for bar, rate in pairs(state.bars) do
                        pcall(function() if alive(bar) then bar.CurRate = rate end end)
                    end
                    for panel in pairs(state.panels) do
                        if state.old_refresh ~= nil then pcall(state.old_refresh, panel) end
                    end
                    for _, entry in pairs(state.cache) do
                        pcall(UE.Object.Destroy, entry.sprite)
                        pcall(UE.Object.Destroy, entry.texture)
                    end
                    if rawget(_G, KEY) == state then rawset(_G, KEY, nil) end
                    state.images, state.texts, state.bars, state.panels = {}, {}, {}, {}
                    state.cache, state.tinted = {}, {}
                end

                local function main()
                    if previous ~= nil then
                        if previous.revision == 2 and previous.active and previous.color == COLOR and previous.latency == FIXED_MS then
                            previous.refresh()
                            return
                        end
                        previous.stop()
                    end
                    state = {
                        active = true, revision = 2, color = COLOR, latency = FIXED_MS,
                        images = {}, texts = {}, bars = {}, panels = setmetatable({}, { __mode = "k" }),
                        cache = {}, tinted = {}, stop = stop
                    }
                    rawset(_G, KEY, state)
                    local hooked = false
                    state.refresh = function()
                        if not hooked then hooked = try_hook() end
                        sweep()
                    end
                    state.refresh()
                    local util = require("xlua.util")
                    CS.RPG.Client.CoroutineUtils.StartCoroutine(util.cs_generator(function()
                        while state.active do
                            for _ = 1, 30 do
                                coroutine.yield(0)
                                if not state.active then return end
                            end
                            attempt("refresh", state.refresh)
                        end
                    end))
                end

                local ok = attempt("initialize", main)
                if not ok and state ~= nil then attempt("cleanup", stop) end
            end
            """;
    }
}
