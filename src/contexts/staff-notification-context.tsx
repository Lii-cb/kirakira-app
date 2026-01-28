"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { StaffNotification } from "@/types/firestore";
import { subscribeNotifications, sendPickupNotification, updateNotificationReply, completeNotification } from "@/lib/firestore";

interface StaffNotificationContextType {
    notifications: StaffNotification[];
    sendCall: (childId: string, childName: string) => Promise<void>;
    replyCall: (id: string, reply: string) => Promise<void>;
    completeCall: (id: string) => Promise<void>;
}

const StaffNotificationContext = createContext<StaffNotificationContextType | undefined>(undefined);

export function StaffNotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<StaffNotification[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeNotifications((data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }, []);

    const sendCall = async (childId: string, childName: string) => {
        await sendPickupNotification(childId, childName);
    };

    const replyCall = async (id: string, reply: string) => {
        await updateNotificationReply(id, reply);
    };

    const completeCall = async (id: string) => {
        await completeNotification(id);
    };

    return (
        <StaffNotificationContext.Provider value={{ notifications, sendCall, replyCall, completeCall }}>
            {children}
        </StaffNotificationContext.Provider>
    );
}

export function useStaffNotifications() {
    const context = useContext(StaffNotificationContext);
    if (context === undefined) {
        throw new Error("useStaffNotifications must be used within a StaffNotificationProvider");
    }
    return context;
}
