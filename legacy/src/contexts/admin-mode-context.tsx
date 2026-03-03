"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type AdminMode = 'admin' | 'staff';

interface AdminModeContextType {
    mode: AdminMode;
    toggleMode: () => void;
    setMode: (mode: AdminMode) => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export function AdminModeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<AdminMode>('admin');

    const toggleMode = () => {
        setModeState(prev => prev === 'admin' ? 'staff' : 'admin');
    };

    const setMode = (m: AdminMode) => setModeState(m);

    return (
        <AdminModeContext.Provider value={{ mode, toggleMode, setMode }}>
            {children}
        </AdminModeContext.Provider>
    );
}

export function useAdminMode() {
    const context = useContext(AdminModeContext);
    if (context === undefined) {
        throw new Error('useAdminMode must be used within an AdminModeProvider');
    }
    return context;
}
