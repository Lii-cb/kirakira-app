import { db } from "./firebase/client";
import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    orderBy,
    limit,
    getDoc,
    runTransaction,
    documentId,
    Timestamp,
    FieldValue
} from "firebase/firestore";
import { AttendanceRecord, Child, Reservation, SystemSettings, StaffUser } from "@/types/firestore";
import { StaffNotification } from "@/types/firestore";
import { Payment } from "@/types/firestore";
import { AppDocument } from "@/types/firestore";

export const getSystemSettings = async (): Promise<SystemSettings> => {
    const docRef = doc(db, "system_settings", "current");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as SystemSettings;
    }
    // Fallback defaults
    return {
        id: "current",
        fees: { basePrice: 0, snackPrice: 100 },
        notifications: { emailEnabled: true },
        features: { newReservationsEnabled: true }
    };
};

export const updateSystemSettings = async (data: Partial<SystemSettings>) => {
    const docRef = doc(db, "system_settings", "current");
    await setDoc(docRef, data, { merge: true });
};

// --- Children ---

export const getChildren = async (): Promise<Child[]> => {
    const q = query(collection(db, "children"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child));
};

export const seedChildren = async (count: number = 50) => {
    // Check if children already exist
    const existing = await getChildren();
    if (existing.length > 5) {
        return;
    }

    const returnMethods = ["お迎え", "集団下校", "一人帰り", "バス"];

    for (let i = 0; i < count; i++) {
        const id = `child-${i + 1}`;
        const newChild: Child = {
            id,
            name: `児童 ${i + 1}郎`,
            kana: `じどう ${i + 1}ろう`,
            grade: Math.floor(Math.random() * 6) + 1,
            defaultReturnMethod: returnMethods[Math.floor(Math.random() * returnMethods.length)],
            parentIds: [] // Initialize with empty array
        };
        await setDoc(doc(db, "children", id), newChild);
    }
};

// --- Attendance ---

export const getTodayAttendance = async (date: string): Promise<AttendanceRecord[]> => {
    const q = query(collection(db, "attendance"), where("date", "==", date));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
};

// Real-time subscription
export const subscribeTodayAttendance = (date: string, callback: (data: AttendanceRecord[]) => void) => {
    const q = query(collection(db, "attendance"), where("date", "==", date));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        callback(data);
    });
};

export const updateAttendanceStatus = async (
    childId: string,
    date: string,
    data: Partial<AttendanceRecord>
) => {
    // We try to find the document, or create if not exists
    // The document ID ideally should be `${date}-${childId}` to easily find it, or we use a query.
    // Using a composite ID is safer for single lookup.
    const docId = `${date}-${childId}`;
    const docRef = doc(db, "attendance", docId);

    // Check if exists
    // For MVP, we use setDoc with merge: true which creates or matches
    await setDoc(docRef, { ...data }, { merge: true });
};

// Function to ensure all children have an attendance record for today (Mock Scheduler)
export const ensureAttendanceRecords = async (date: string, children: Child[]) => {
    // In a real app, a backend function would do this at midnight.
    // Here we check if records exist for key children, if not, create "Scheduled" records.
    // For simplicity in this demo, we will create records for ALL children as "Scheduled" if they don't exist.

    const snapshot = await getDocs(query(collection(db, "attendance"), where("date", "==", date), limit(1)));
    if (!snapshot.empty) return;

    // Fetch confirmed reservations for today to reflect accurate scheduled times
    const reservations = await getReservations(date);
    const reservationMap = new Map();
    reservations.forEach(r => {
        if (r.status === "confirmed") {
            reservationMap.set(r.childId, r);
        }
    });

    const batchPromises = children.map(async (child) => {
        const docId = `${date}-${child.id}`;
        const docRef = doc(db, "attendance", docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            const reservation = reservationMap.get(child.id);
            // Use reservation time if exists, otherwise default
            const initialTime = reservation ? reservation.time : "14:00-17:00";

            const initialRecord: AttendanceRecord = {
                id: docId,
                date,
                childId: child.id,
                childName: child.name,
                className: `${child.grade}年`,
                // If they have a reservation, they are "scheduled", otherwise they might be just "registered" (but we treat all as pending for now)
                status: "pending",
                reservationTime: initialTime,
                returnMethod: child.defaultReturnMethod || "お迎え",
                arrivalTime: null,
                departureTime: null,
            };
            await setDoc(docRef, initialRecord);
        }
    });

    await Promise.all(batchPromises);
};

export const updateChild = async (id: string, data: Partial<Child>) => {
    await updateDoc(doc(db, "children", id), data);
};

// --- Reservations ---
export const addChild = async (childData: Partial<Child>) => {
    // Ensure ID
    if (!childData.id) {
        childData.id = `child-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    await setDoc(doc(db, "children", childData.id), childData);
    return childData.id;
};



export const submitReservations = async (childId: string, dates: Date[], time: string, options?: { fee: number, hasSnack: boolean }) => {
    const promises = dates.map(date => {
        const dateStr = date.toLocaleDateString("ja-JP", { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
        return addDoc(collection(db, "reservations"), {
            childId,
            date: dateStr,
            time,
            status: "pending",
            fee: options?.fee || 0,
            hasSnack: options?.hasSnack || false,
            createdAt: serverTimestamp()
        });
    });
    await Promise.all(promises);
};

export const getReservations = async (date: string): Promise<Reservation[]> => {
    const q = query(collection(db, "reservations"), where("date", "==", date));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
};

export const updateReservationStatus = async (id: string, status: "confirmed" | "rejected") => {
    await updateDoc(doc(db, "reservations", id), { status });
};

export const getReservationsForChild = async (childId: string): Promise<Reservation[]> => {
    const q = query(collection(db, "reservations"), where("childId", "==", childId), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
};

export const cancelReservation = async (id: string) => {
    await deleteDoc(doc(db, "reservations", id));
};

export const updateReservation = async (id: string, data: Partial<Reservation>) => {
    await updateDoc(doc(db, "reservations", id), data);
};

// --- Staff Notifications ---


export const sendPickupNotification = async (childId: string, childName: string, senderId: string = "Reception") => {
    await addDoc(collection(db, "notifications"), {
        type: "pickup_request",
        childId,
        childName,
        senderId,
        status: "pending",
        createdAt: serverTimestamp(),
        active: true
    });
};

export const subscribeNotifications = (callback: (notifications: StaffNotification[]) => void) => {
    // Listen for active notifications
    const q = query(collection(db, "notifications"), where("active", "==", true), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffNotification));
        callback(items);
    });
};

export const updateNotificationReply = async (id: string, reply: string) => {
    await updateDoc(doc(db, "notifications", id), {
        status: "acknowledged",
        reply
    });
};

export const completeNotification = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), {
        active: false,
        status: "completed"
    });
};


// --- Staff Master ---

export interface Staff {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Timestamp | FieldValue;
}

export const getStaffList = async (): Promise<Staff[]> => {
    const q = query(collection(db, "staff"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
};

export const addStaff = async (name: string) => {
    await addDoc(collection(db, "staff"), {
        name,
        isActive: true,
        createdAt: serverTimestamp()
    });
};

export const updateStaff = async (id: string, data: Partial<Staff>) => {
    await updateDoc(doc(db, "staff", id), data);
};

export const deleteStaff = async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
};

export const getSyncedStaffList = async (): Promise<StaffUser[]> => {
    const q = query(collection(db, "staff_users"), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffUser));
};

// Helper to get ALL staff attendance for a specific month (for stats)
// Note: This is read-heavy if many days.
export const getMonthlyStaffAttendance = async (year: number, month: number) => {
    // Construct date string range "YYYY-MM-01" to "YYYY-MM-31"
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-31`; // Loose end date

    // Query range on document IDs is not strictly possible directly without FieldPath logic for "between" if IDs are keys.
    // But our IDs are "YYYY-MM-DD". We can use >= and <= on __name__ (document ID).

    const q = query(
        collection(db, "staff_daily"),
        where(documentId(), ">=", startStr),
        where(documentId(), "<=", endStr)
    );

    const snapshot = await getDocs(q);
    // Aggregate result: { staffName: count } or { staffId: count }
    // Since legacy records don't have IDs, we might have to group by Name for now.

    const stats: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const list: StaffState[] = data.list || [];
        list.forEach(staff => {
            // Count if status is 'work', 'temp_out', 'left' (implies they came)
            if (['work', 'temp_out', 'left'].includes(staff.status)) {
                // Use Name as key for compatibility with legacy, or ID if available
                // To be safe, let's use Name for stats display for now.
                const key = staff.name;
                stats[key] = (stats[key] || 0) + 1;
            }
        });
    });

    return stats;
};

// --- Staff Attendance ---


export type StaffStatus = 'work' | 'temp_out' | 'left' | 'absent' | 'planned';

export interface StaffState {
    id: string;
    name: string;
    status: StaffStatus;
    shiftTime?: string; // Planned Start Time (HH:mm)
    time: string; // Current Status Time (Last Action Time)
    actualTime?: string; // Work Start Time
    actualEndTime?: string; // Work End Time
}

export const subscribeStaffAttendance = (date: string, callback: (staff: StaffState[]) => void) => {
    const docRef = doc(db, "staff_daily", date);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback(data.list || []);
        } else {
            callback([]);
        }
    });
};

export const updateStaffStatus = async (date: string, staff: StaffState) => {
    const docRef = doc(db, "staff_daily", date);
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(docRef);
            let list: StaffState[] = [];
            if (sfDoc.exists()) {
                list = sfDoc.data().list || [];
            }

            const index = list.findIndex(s => s.id === staff.id);
            if (index >= 0) {
                list[index] = staff;
            } else {
                list.push(staff);
            }

            transaction.set(docRef, { list }, { merge: true });
        });
    } catch (e) {
        console.error("Staff update failed: ", e);
    }
};

export const addStaffMember = async (date: string, name: string, staffId?: string) => {
    const newStaff: StaffState = {
        id: staffId || `staff-${Date.now()}`,
        name,
        status: 'absent',
        time: '--:--'
    };
    await updateStaffStatus(date, newStaff);
};

export const removeStaffMember = async (date: string, staffId: string) => {
    const docRef = doc(db, "staff_daily", date);
    await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) return;

        const list: StaffState[] = sfDoc.data().list || [];
        const newList = list.filter(s => s.id !== staffId);
        transaction.set(docRef, { list: newList }, { merge: true });
    });
};

// Batch register staff shifts
export const registerStaffShifts = async (name: string, dates: Date[], shiftTime: string = '14:00', staffId?: string) => {
    const promises = dates.map(async (date) => {
        const dateStr = date.toLocaleDateString("ja-JP", { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');

        // We need to check if record exists to merge, but updateStaffStatus does array replacement.
        // Ideally we should check if staff already exists in that day's list.
        // For simplicity, we assume we are adding/updating.
        // But since we use array replacement in updateStaffStatus, we can just call it.
        // Wait, updateStaffStatus uses "id" to find match.

        const newStaff: StaffState = {
            id: staffId || `staff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            status: 'planned', // New status for shift only
            shiftTime: shiftTime,
            time: '--:--'
        };
        await updateStaffStatus(dateStr, newStaff);
    });
    await Promise.all(promises);
};

// --- Payments ---


export const addPaymentRequest = async (childId: string, amount: number) => {
    const today = new Date().toISOString().split('T')[0];
    await addDoc(collection(db, "payments"), {
        childId,
        amount,
        date: today,
        status: "pending",
        createdAt: serverTimestamp()
    });
};

export const getPaymentsForChild = async (childId: string): Promise<Payment[]> => {
    const q = query(collection(db, "payments"), where("childId", "==", childId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
};

export const getAllPayments = async (): Promise<Payment[]> => {
    const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
};

export const confirmPayment = async (id: string) => {
    await updateDoc(doc(db, "payments", id), {
        status: "confirmed"
    });
};
// --- Documents ---


export const getDocuments = async (): Promise<AppDocument[]> => {
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppDocument));
};

export const addDocument = async (docData: Omit<AppDocument, "id" | "createdAt">) => {
    await addDoc(collection(db, "documents"), {
        ...docData,
        createdAt: serverTimestamp()
    });
};

export const deleteDocument = async (id: string) => {
    await deleteDoc(doc(db, "documents", id));
};

// --- Staff Memos ---

export const getStaffMemo = async (date: string): Promise<string> => {
    const docRef = doc(db, "staff_memos", date);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data().content || "";
    }
    return "";
};

export const updateStaffMemo = async (date: string, content: string, staffName: string = "Admin") => {
    const docRef = doc(db, "staff_memos", date);
    await setDoc(docRef, {
        content,
        updatedBy: staffName,
        updatedAt: serverTimestamp()
    }, { merge: true });
};
