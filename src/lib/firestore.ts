import { db } from "./firebase/client";
import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    orderBy,
    limit,
    getDoc
} from "firebase/firestore";
import { AttendanceRecord, Child, Reservation, Application } from "@/types/firestore";

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
        console.log("Already seeded");
        return;
    }

    const classes = ["1-1", "1-2", "2-1", "3-1", "4-1", "5-1", "6-1"];
    const returnMethods = ["お迎え", "集団下校", "一人帰り", "バス"];

    for (let i = 0; i < count; i++) {
        const id = `child-${i + 1}`;
        const newChild: Child = {
            id,
            name: `児童 ${i + 1}郎`,
            kana: `じどう ${i + 1}ろう`,
            className: classes[Math.floor(Math.random() * classes.length)],
            grade: Math.floor(Math.random() * 6) + 1,
            defaultReturnMethod: returnMethods[Math.floor(Math.random() * returnMethods.length)],
        };
        await setDoc(doc(db, "children", id), newChild);
    }
    console.log("Seeding complete");
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
                className: child.className,
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


// --- Applications ---

export const getApplications = async (): Promise<Application[]> => {
    const q = query(collection(db, "applications"), orderBy("submissionDate", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
};

export const submitApplication = async (data: Omit<Application, "id" | "status" | "submissionDate">) => {
    await addDoc(collection(db, "applications"), {
        ...data,
        status: "new",
        submissionDate: serverTimestamp()
    });
};

export const processApplication = async (app: Application) => {
    // 1. Create Child Document
    const childId = `child-${Date.now()}`; // Simple ID generation
    const newChild: Child = {
        id: childId,
        name: `${app.childLastName} ${app.childFirstName}`,
        kana: `${app.childLastNameKana} ${app.childFirstNameKana}`,
        className: "", // To be assigned later
        grade: parseInt(app.grade, 10),
        defaultReturnMethod: "お迎え" // Default
    };
    await setDoc(doc(db, "children", childId), newChild);

    // 2. Update Application Status
    await updateDoc(doc(db, "applications", app.id), {
        status: "processed"
    });
};

// --- Reservations ---

// --- Reservations ---

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

// --- Staff Notifications ---

import { StaffNotification } from "@/types/firestore";

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
