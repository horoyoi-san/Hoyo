import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { connectPersistedSchema } from '@/zod';
import { createValidatedJSONStorage } from './persistStorage';


interface ConnectState {
    connectionType: string;
    privateType: string;
    serverUrl: string;
    username: string;
    password: string;
    setConnectionType: (newConnectionType: string) => void;
    setPrivateType: (newPrivateType: string) => void;
    setServerUrl: (newServerUrl: string) => void;
    setUsername: (newUsername: string) => void;
    setPassword: (newPassword: string) => void;
}


const PASSWORD_KEY = 'connect-password-session';

export const readSessionPassword = (): string => {
    if (typeof window === 'undefined') return '';
    try {
        return window.sessionStorage.getItem(PASSWORD_KEY) ?? '';
    } catch {
        return '';
    }
};

const writeSessionPassword = (password: string) => {
    if (typeof window === 'undefined') return;
    try {
        if (password) window.sessionStorage.setItem(PASSWORD_KEY, password);
        else window.sessionStorage.removeItem(PASSWORD_KEY);
    } catch {
    }
};

type ConnectPersistedState = Pick<ConnectState, "connectionType" | "privateType" | "serverUrl" | "username">;

const useConnectStore = create<ConnectState>()(
    persist<ConnectState, [], [], ConnectPersistedState>(
        (set) => ({
            connectionType: "FireflyGo",
            privateType: "Local",
            serverUrl: "http://localhost:21000",
            username: "",
            password: readSessionPassword(),
            setConnectionType: (newConnectionType: string) => set({ connectionType: newConnectionType }),
            setPrivateType: (newPrivateType: string) => set({ privateType: newPrivateType }),
            setServerUrl: (newServerUrl: string) => set({ serverUrl: newServerUrl }),
            setUsername: (newUsername: string) => set({ username: newUsername }),
            setPassword: (newPassword: string) => {
                writeSessionPassword(newPassword);
                set({ password: newPassword });
            },
        }),
        {
            name: 'connect-storage',
            storage: createValidatedJSONStorage(() => localStorage, connectPersistedSchema),
            partialize: (state) => ({
                connectionType: state.connectionType,
                privateType: state.privateType,
                serverUrl: state.serverUrl,
                username: state.username,
            }),
        }
    )
);

export default useConnectStore;
