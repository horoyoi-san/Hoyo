"use client";
import { createContext, PropsWithChildren, useCallback } from "react";
import useLocaleStore from "@/stores/localeStore";
import { useShallow } from "zustand/react/shallow";

interface ThemeContextType {
    theme?: string;
    changeTheme?: (nextTheme: string | null) => void;
}
export const ThemeContext = createContext<ThemeContextType>({});

export const ThemeProvider = ({ children }: PropsWithChildren) => {
    const { theme, setTheme } = useLocaleStore(
        useShallow((state) => ({
            theme: state.theme,
            setTheme: state.setTheme,
        }))
    );

    const changeTheme = useCallback((nextTheme: string | null) => {
        if (nextTheme) {
            setTheme(nextTheme);
        } else {
            setTheme(theme === "winter" ? "night" : "winter");
        }
    }, [theme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};