import { Timestamp } from "firebase/firestore";

export type Role = "admin" | "staff" | "guardian";

export interface UserProfile {
    uid: string;
    email: string | null;
    fullName: string | null;
    role: Role;
    guardianId?: string; // Link to guardian profile if needed
    createdAt: Timestamp;
}

export interface Child {
    id: string; // Document ID
    name: string;
    kana: string;
    className: string; // e.g. "1-1"
    grade: number; // 1-6
    address?: string; // New: Address for records
    guardianName?: string; // New: Primary Guardian Name
    phoneNumbers?: string[]; // New: List of contact numbers (Max 2)
    guardianId?: string; // ID of the primary guardian
    defaultReturnMethod?: string; // "お迎え" etc.
    snackConfig?: {
        isExempt: boolean; // おやつ不要フラグ
    };
    authorizedEmails?: string[]; // List of allowed Google Emails
}

export interface AppDocument {
    id: string;
    title: string;
    category: "news" | "menu" | "event" | "other";
    url?: string; // External Link
    base64?: string; // Small file storage (MVP)
    fileName?: string;
    createdAt: any;
}

export interface Message {
    id: string;
    sender: "guardian" | "staff";
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
    createdAt: any; // Timestamp or FieldValue
}

export interface Application {
    id: string;
    childLastName: string;
    childFirstName: string;
    childLastNameKana: string;
    childFirstNameKana: string;
    grade: string;
    guardianLastName: string;
    guardianFirstName: string;
    phone: string;
    email: string;
    status: "new" | "processed";
    submissionDate: any;
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
    createdAt: any;
}
