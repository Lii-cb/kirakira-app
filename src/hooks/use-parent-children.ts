"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Child } from "@/types/firestore";
import { SIBLING_COLORS, SiblingColorTheme } from "@/lib/constants";

export type ChildData = {
    id: string;
    master: Child;
    colorTheme: SiblingColorTheme;
};

/**
 * Hook that resolves the current authenticated parent's children.
 * Checks parents collection first, falls back to parentIds and authorizedEmails on children collection.
 * Redirects to /parent/login if not authenticated.
 *
 * @param targetChildId - Optional childId for admin-viewing mode.
 *   When provided, verifies the user is admin and loads that specific child.
 */
export function useParentChildren(targetChildId?: string | null) {
    const [childrenData, setChildrenData] = useState<ChildData[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isAdminViewing, setIsAdminViewing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/parent/login");
                return;
            }
            setUserEmail(user.email);

            try {
                let targetChildIds = new Set<string>();
                let adminMode = false;

                // 1. Admin viewing a specific child via targetChildId
                if (targetChildId) {
                    const sanitizedEmail = (user.email || "").replace(/[.#$[\]]/g, "_");
                    const staffDoc = await getDoc(doc(db, "staff_users", sanitizedEmail));

                    if (staffDoc.exists() && staffDoc.data().role === "admin") {
                        const childDoc = await getDoc(doc(db, "children", targetChildId));
                        if (childDoc.exists()) {
                            targetChildIds.add(targetChildId);
                            adminMode = true;
                            setIsAdminViewing(true);
                        }
                    }
                }

                // 2. Normal parent flow (only if not admin-viewing)
                if (!adminMode) {
                    // Start multiple lookup strategies in parallel
                    const parentQuery = query(collection(db, "parents"), where("email", "==", user.email));
                    const childByEmailsQuery = query(collection(db, "children"), where("authorizedEmails", "array-contains", user.email));
                    const childByParentIdsQuery = query(collection(db, "children"), where("parentIds", "array-contains", user.email));

                    const [parentSnap, emailsSnap, pIdsSnap] = await Promise.all([
                        getDocs(parentQuery),
                        getDocs(childByEmailsQuery),
                        getDocs(childByParentIdsQuery)
                    ]);

                    // Strategy A: From parent record
                    if (!parentSnap.empty) {
                        (parentSnap.docs[0].data().childIds || []).forEach((id: string) => targetChildIds.add(id));
                    }

                    // Strategy B: From authorizedEmails array in children
                    emailsSnap.docs.forEach(d => targetChildIds.add(d.id));

                    // Strategy C: From parentIds array in children (GAS import standard)
                    pIdsSnap.docs.forEach(d => targetChildIds.add(d.id));
                }

                const uniqueIds = Array.from(targetChildIds);
                if (uniqueIds.length === 0) {
                    setChildrenData([]);
                    setLoading(false);
                    return;
                }

                // 3. Fetch child master data
                const childrenPromises = uniqueIds.map(async (id, index) => {
                    const d = await getDoc(doc(db, "children", id));
                    if (d.exists()) {
                        return {
                            id: d.id,
                            master: d.data() as Child,
                            colorTheme: SIBLING_COLORS[index % SIBLING_COLORS.length],
                        };
                    }
                    return null;
                });

                const loadedChildren = (await Promise.all(childrenPromises)).filter(
                    (c): c is ChildData => c !== null
                );

                setChildrenData(loadedChildren);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching children:", err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router, targetChildId]);

    return { childrenData, loading, userEmail, isAdminViewing };
}
