package dev.amizing25.Exporter;

import java.io.File;
import java.net.URLClassLoader;

import org.slf4j.Logger;

import emu.lunarcore.LunarCore;
import emu.lunarcore.command.Command;
import emu.lunarcore.plugin.Plugin;

public class ExportPlugin extends Plugin {

    public ExportPlugin(Identifier identifier, URLClassLoader classLoader, File dataFolder, Logger logger) {
        super(identifier, classLoader, dataFolder, logger);
    }

    public void onLoad() {
        
    }
    
    public void onEnable() {
        LunarCore.getCommandManager().registerCommand(new ExportCommand());
    }
    
    public void onDisable() {
        LunarCore.getCommandManager().unregisterCommand(ExportCommand.class.getAnnotation(Command.class).label());
    }

}
