"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db, ADMIN_EMAILS, MEMBER_DOMAIN } from "./firebase";

export type Role = "Admin" | "Member" | "Guest";

export interface PortalUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  membershipId?: string;
  department?: string;
}

/** Signed-in user + their portal role (Admin by allow-list, Member by institute email). */
export function useFirebaseUser() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u: User | null) => {
      if (!u) { setUser(null); setLoading(false); return; }
      const email = (u.email || "").toLowerCase();
      const role: Role = ADMIN_EMAILS.includes(email) ? "Admin" : email.endsWith(MEMBER_DOMAIN) ? "Member" : "Guest";
      const base: PortalUser = { uid: u.uid, name: u.displayName || email, email, role };
      setUser(base);
      setLoading(false);
      // Enrich members with their roster entry (membership ID, department), if any.
      if (role !== "Guest") {
        try {
          const snap = await getDocs(query(collection(db, "members"), where("email", "==", email), limit(1)));
          const m = snap.docs[0]?.data();
          if (m) setUser({ ...base, membershipId: m.membershipId, department: m.department });
        } catch { /* roster lookup is optional */ }
      }
    });
  }, []);

  return { user, loading };
}
