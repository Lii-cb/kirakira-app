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
 * Checks parents collection first, falls back to authorizedEmails on children.
 * Redirects to /parent/login if not authenticated.
 */
export function useParentChildren() {
    const [childrenData, setChildrenData] = useState<ChildData[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/parent/login");
                return;
            }
            setUserEmail(user.email);

            try {
                // 1. Try parent record first (Ver 7.1+)
                let targetChildIds: string[] = [];
                const parentQuery = query(collection(db, "parents"), where("email", "==", user.email));
                const parentSnapshot = await getDocs(parentQuery);

                if (!parentSnapshot.empty) {
                    const parentData = parentSnapshot.docs[0].data();
                    targetChildIds = parentData.childIds || [];
                }

                // 2. Fallback: query children by authorizedEmails
                if (targetChildIds.length === 0) {
                    const q = query(
                        collection(db, "children"),
                        where("authorizedEmails", "array-contains", user.email)
                    );
                    const snapshot = await getDocs(q);
                    const directIds = snapshot.docs.map(d => d.id);
                    targetChildIds = Array.from(new Set([...targetChildIds, ...directIds]));
                }

                if (targetChildIds.length === 0) {
                    setLoading(false);
                    return;
                }

                // 3. Fetch child master data
                const childrenPromises = targetChildIds.map(async (id, index) => {
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
    }, [router]);

    return { childrenData, loading, userEmail };
}
