import { Timestamp, FieldValue } from "firebase/firestore";

export type Role = "admin" | "staff" | "parent";


export interface UserProfile {
    uid: string;
    email: string | null;
    fullName: string | null;
    role: Role;
    parentId?: string; // Link to parent profile if needed
    createdAt: Timestamp;
}

export interface StaffUser {
    id: string; // Document ID (usually email or auto-id)
    email: string;
    name: string;
    role: "admin" | "staff";
    isActive: boolean;
    hourlyRate?: number; // Added for salary estimation
    createdAt?: Timestamp | FieldValue;
    updatedAt?: Timestamp | FieldValue;
}

export interface StaffMemo {
    id: string; // YYYY-MM-DD
    content: string;
    updatedBy: string;
    updatedAt: Timestamp;
}

export interface SystemSettings {
    id: string; // Changed from "current"
    fees: {
        basePrice: number;
        snackPrice: number;
    };
    notifications?: {
        emailEnabled: boolean;
        chatEmail?: string; // Target email for Google Chat link
        staffChatUrl?: string; // Direct link if available
    };
    features?: {
        newReservationsEnabled: boolean;
    };
    adminPin?: string; // PIN for admin mode switch (synced from Spreadsheet)
    updatedAt?: Timestamp | FieldValue;
}

export interface Child {
    id: string; // Document ID
    name: string;
    kana: string;
    grade: number; // 1-6
    phoneNumbers?: string[]; // List of contact numbers (Max 2)
    parentIds?: string[]; // IDs of the parents (Optional: may not exist for legacy records)
    defaultReturnMethod?: string; // "お迎え" etc.
    snackConfig?: {
        isExempt: boolean; // おやつ不要フラグ
    };
    authorizedEmails?: string[]; // List of allowed Google Emails
}

export interface StaffState {
    id: string;
    name: string;
    status: "work" | "temp_out" | "left" | "absent" | "planned";
    shiftTime?: string; // HH:mm
    time: string; // HH:mm (Legacy field, usually set to check-in/check-out time)
    actualTime?: string; // HH:mm (Start)
    actualEndTime?: string; // HH:mm (End)
}

export interface AppDocument {
    id: string;
    title: string;
    category: "news" | "event" | "other";
    url?: string; // External Link
    base64?: string; // Small file storage (MVP)
    fileName?: string;
    eventDate?: string; // "YYYY-MM-DD" Use this for calendar events
    createdAt: Timestamp | FieldValue;
}

export interface Message {
    id: string;
    sender: "parent" | "staff";
    senderName: string; // "Mother" or "Staff"
    content: string;
    timestamp: string; // ISO String
}

export interface AttendanceRecord {
    id: string; // Document ID
    date: string; // "YYYY-MM-DD"
    childId: string;
    childName: string; // Denormalized for display
    className: string; // Denormalized
    status: "pending" | "arrived" | "left" | "absent";
    arrivalTime?: string | null; // "HH:mm"
    departureTime?: string | null; // "HH:mm"
    reservationTime: string; // "14:00-17:00"
    returnMethod: string;
    returnDetails?: string | null;
    memo?: string; // Existing: Public memo or old field? Let's treat as "Admin Memo" or "Public"? 
    // Let's migrate to using staffMemo for internal and messages for chat.
    // For now, keep as is.

    staffMemo?: string; // New: Internal memo for Daily Report
    messages?: Message[]; // New: Chat log

    // Request logic
    changeRequest?: {
        type: "absence" | "returnMethod" | "pickupTime";
        value: string; // e.g., "newMethod" or "HH:mm"
        memo?: string;
        status: "pending" | "approved" | "rejected";
    };
}

export interface Reservation {
    id: string;
    childId: string;
    date: string; // "YYYY-MM-DD"
    time: string; // "14:00-17:00"
    status: "pending" | "confirmed" | "rejected";
    fee?: number;
    hasSnack?: boolean;
    createdAt: Timestamp | FieldValue;
}



export interface StaffNotification {
    id: string;
    type: "pickup_request";
    childId: string;
    childName: string;
    senderId: string;
    status: "pending" | "acknowledged" | "completed";
    reply?: string; // "アリーナ", "外", "探します" etc
    active: boolean;
}

export interface Payment {
    id: string;
    childId: string;
    amount: number;
    date: string; // "YYYY-MM-DD"
    status: "pending" | "confirmed" | "rejected";
    note?: string;
    createdAt: Timestamp | FieldValue;
}

// --- Shared UI Types ---

import { SiblingColorTheme } from "@/lib/constants";

export interface ChildData {
    id: string;
    master: Child;
    attendance?: AttendanceRecord | null;
    colorTheme: SiblingColorTheme;
}
