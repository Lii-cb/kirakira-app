"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { StaffUser, Role } from "@/types/firestore";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    role: Role | "guest" | null; // null = loading
    loading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    login: async () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | "guest" | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const email = firebaseUser.email;
                if (!email) {
                    setRole("guest");
                    setLoading(false);
                    return;
                }

                try {
                    // 1. Check Staff (Admin/Staff)
                    // ID is email with special chars replaced by '_'
                    const staffId = email.replace(/[.#$[\]]/g, "_");
                    const staffDoc = await getDoc(doc(db, "staff_users", staffId));

                    if (staffDoc.exists() && staffDoc.data().isActive) {
                        const staffData = staffDoc.data() as StaffUser;
                        setRole(staffData.role); // "admin" or "staff"
                    } else {
                        // 2. Check Guardian
                        const q = query(collection(db, "children"), where("authorizedEmails", "array-contains", email));
                        const snapshot = await getDocs(q);

                        if (!snapshot.empty) {
                            setRole("guardian");
                        } else {
                            setRole("guest");
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole("guest");
                }
            } else {
                setUser(null);
                setRole("guest");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = async () => {
        await firebaseSignOut(auth);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
