"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { StaffNotification } from "@/types/firestore";
import { subscribeNotifications, sendPickupNotification, updateNotificationReply, completeNotification } from "@/lib/firestore";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface StaffNotificationContextType {
    notifications: StaffNotification[];
    sendCall: (childId: string, childName: string) => Promise<void>;
    replyCall: (id: string, reply: string) => Promise<void>;
    completeCall: (id: string) => Promise<void>;
    cancelCall: (id: string) => Promise<void>;
    addAction: (id: string, type: string, staffName: string) => Promise<void>;
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

    const cancelCall = async (id: string) => {
        await updateDoc(doc(db, "notifications", id), {
            active: false,
            status: "cancelled"
        });
    };

    const addAction = async (id: string, type: string, staffName: string) => {
        await updateDoc(doc(db, "notifications", id), {
            actions: arrayUnion({
                type,
                staffName,
                timestamp: new Date().toISOString()
            })
        });
    };

    return (
        <StaffNotificationContext.Provider value={{ notifications, sendCall, replyCall, completeCall, cancelCall, addAction }}>
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
