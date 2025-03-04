package dev.amizing25.srtool;

import java.io.File;
import java.net.URLClassLoader;

import dev.amizing25.srtool.handlers.SRToolAPIHandler;
import dev.amizing25.srtool.handlers.SRToolExporterHandler;
import io.javalin.plugin.bundled.CorsPluginConfig;
import org.slf4j.Logger;

import emu.lunarcore.LunarCore;
import emu.lunarcore.plugin.Plugin;

public class SRToolPlugin extends Plugin {

    public SRToolPlugin(Identifier identifier, URLClassLoader classLoader, File dataFolder, Logger logger) {
        super(identifier, classLoader, dataFolder, logger);
    }

    @Override
    public void onLoad() {
        super.onLoad();
    }

    @Override
    public void onEnable() {
        super.onEnable();
        var app = LunarCore.getHttpServer().getApp();
        app.updateConfig(cfg ->
                cfg.plugins.enableCors(cors ->
                        cors.add(CorsPluginConfig::anyHost)
                )
        );
        app.post("/sr-tools", new SRToolAPIHandler());
        app.get("/sr-tools-export", new SRToolExporterHandler());
    }

    @Override
    public void onDisable() {
        super.onDisable();
    }

}
