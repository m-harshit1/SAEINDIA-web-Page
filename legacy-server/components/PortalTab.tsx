'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import {
  Plus, Trash2, Shield, Calendar, Wrench,
  Clock, Users, ShieldAlert, Lock, CheckCircle2
} from 'lucide-react';
import { auth, db, googleProvider, MEMBER_DOMAIN } from '@/lib/firebase';
import { useFirebaseUser } from '@/lib/useFirebaseUser';

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: "Todo" | "In-Progress" | "Done";
  priority: "High" | "Medium" | "Low";
}

interface ChapterMember {
  id: string;
  membershipId?: string;
  name: string;
  role: string;
  department: string;
  email: string;
  yearJoined: number;
}

interface InventoryItem {
  id: string;
  name: string;
  qty: string;
  status: "In Stock" | "Low Stock" | "Allocated";
  dept: string;
}

interface AttendanceRecord {
  id: string;
  name: string;
  hours: number;
  role: string;
  status: "Present" | "Absent";
}

/** Read a whole collection, newest first. */
async function readAll<T>(name: string): Promise<T[]> {
  const snap = await getDocs(query(collection(db, name), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T);
}

export default function PortalTab() {
  // Authentication (Firebase Auth + Google sign-in). Firestore rules enforce the roles.
  const { user, loading: isLoadingSession } = useFirebaseUser();
  const isAuthenticated = !!user && user.role !== 'Guest';
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  const userRole = user?.role;
  const isAdmin = userRole === 'Admin';
  // Shape kept compatible with the dashboard markup below.
  const session = user ? { user: { name: user.name, role: user.role, membershipId: user.membershipId, department: user.department } } : null;

  // Local state structures
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ChapterMember[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");

  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<string>("");
  const [newMemberDept, setNewMemberDept] = useState<string>("BAJA Division");
  const [newMemberMembershipId, setNewMemberMembershipId] = useState<string>("");

  const [newInventoryName, setNewInventoryName] = useState<string>("");
  const [newInventoryQty, setNewInventoryQty] = useState<string>("");
  const [newInventoryDept, setNewInventoryDept] = useState<string>("Chassis");

  const [newAttendanceName, setNewAttendanceName] = useState<string>("");
  const [newAttendanceRole, setNewAttendanceRole] = useState<string>("");

  // Blog publishing states
  const [blogTitle, setBlogTitle] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogCategory, setBlogCategory] = useState<"Announcements" | "Testing" | "AWIM Outreach" | "Competitions">("Announcements");
  const [blogPublished, setBlogPublished] = useState(false);

  // Load dashboard data from Firestore once signed in.
  const fetchData = useCallback(async () => {
    try {
      const [t, m, inv, att] = await Promise.all([
        readAll<Task>('tasks'),
        readAll<ChapterMember>('members'),
        readAll<InventoryItem>('inventory'),
        readAll<AttendanceRecord>('attendance'),
      ]);
      setTasks(t); setMembers(m); setInventory(inv); setAttendance(att);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) fetchData(); });
    return () => { cancelled = true; };
  }, [isAuthenticated, fetchData]);

  const handleGoogleSignIn = async () => {
    setLoginError("");
    setIsAuthenticating(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code || "";
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setLoginError("Sign-in failed. Please try again.");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fail = (what: string) => (error: unknown) => {
    console.error(`Failed to ${what}:`, error);
    alert(`Could not ${what}. You may not have permission for this action.`);
  };

  // Blog post publish action (Admin only)
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim() || !blogContent.trim()) return;
    const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    try {
      await addDoc(collection(db, 'posts'), {
        title: blogTitle.trim().slice(0, 200),
        excerpt: (blogExcerpt.trim() || blogContent.trim().slice(0, 120) + "...").slice(0, 300),
        content: blogContent.trim().slice(0, 20000),
        category: blogCategory,
        author: session?.user?.name || "SAEINDIA Administrator",
        date: formattedDate,
        lastUpdated: formattedDate,
        readTime: `${Math.max(1, Math.ceil(blogContent.split(" ").length / 200))} min read`,
        createdAt: serverTimestamp(),
      });
      setBlogPublished(true);
      setBlogTitle(""); setBlogExcerpt(""); setBlogContent("");
      setTimeout(() => setBlogPublished(false), 3000);
    } catch (error) { fail('publish the post')(error); }
  };

  // Task actions
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskAssignee.trim()) return;
    const data = {
      title: newTaskTitle.trim().slice(0, 200),
      assignee: newTaskAssignee.trim().slice(0, 100),
      priority: newTaskPriority,
      status: "Todo" as const,
    };
    try {
      const ref = await addDoc(collection(db, 'tasks'), { ...data, createdAt: serverTimestamp() });
      setTasks([{ id: ref.id, ...data }, ...tasks]);
      setNewTaskTitle(""); setNewTaskAssignee("");
    } catch (error) { fail('add the task')(error); }
  };

  const handleDeleteTask = async (id: string) => {
    try { await deleteDoc(doc(db, 'tasks', id)); setTasks(tasks.filter(t => t.id !== id)); }
    catch (error) { fail('delete the task')(error); }
  };

  const handleStatusChange = async (id: string, newStatus: "Todo" | "In-Progress" | "Done") => {
    try {
      await updateDoc(doc(db, 'tasks', id), { status: newStatus });
      setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (error) { fail('update the task')(error); }
  };

  // Member actions (Admin only)
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    const data = {
      name: newMemberName.trim().slice(0, 100),
      role: newMemberRole.trim().slice(0, 100),
      department: newMemberDept.slice(0, 100),
      membershipId: (newMemberMembershipId.trim() || `SAEBAJA-${new Date().getFullYear()}-${String(members.length + 1).padStart(3, '0')}`).toUpperCase().slice(0, 30),
      email: `${newMemberName.toLowerCase().replace(/\s+/g, "")}${MEMBER_DOMAIN}`,
      yearJoined: new Date().getFullYear(),
    };
    try {
      const ref = await addDoc(collection(db, 'members'), { ...data, createdAt: serverTimestamp() });
      setMembers([{ id: ref.id, ...data }, ...members]);
      setNewMemberName(""); setNewMemberRole(""); setNewMemberMembershipId("");
    } catch (error) { fail('add the member')(error); }
  };

  const handleDeleteMember = async (id: string) => {
    try { await deleteDoc(doc(db, 'members', id)); setMembers(members.filter(m => m.id !== id)); }
    catch (error) { fail('remove the member')(error); }
  };

  // Inventory actions (Admin only)
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryName.trim() || !newInventoryQty.trim()) return;
    const data = {
      name: newInventoryName.trim().slice(0, 100),
      qty: newInventoryQty.trim().slice(0, 50),
      dept: newInventoryDept.slice(0, 50),
      status: "In Stock" as const,
    };
    try {
      const ref = await addDoc(collection(db, 'inventory'), { ...data, createdAt: serverTimestamp() });
      setInventory([{ id: ref.id, ...data }, ...inventory]);
      setNewInventoryName(""); setNewInventoryQty("");
    } catch (error) { fail('add the item')(error); }
  };

  const handleDeleteInventory = async (id: string) => {
    try { await deleteDoc(doc(db, 'inventory', id)); setInventory(inventory.filter(item => item.id !== id)); }
    catch (error) { fail('delete the item')(error); }
  };

  // Attendance actions (Admin only)
  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendanceName.trim()) return;
    const data = {
      name: newAttendanceName.trim().slice(0, 100),
      role: (newAttendanceRole.trim() || 'Team Member').slice(0, 50),
      hours: 0,
      status: "Present" as const,
    };
    try {
      const ref = await addDoc(collection(db, 'attendance'), { ...data, createdAt: serverTimestamp() });
      setAttendance([{ id: ref.id, ...data }, ...attendance]);
      setNewAttendanceName(""); setNewAttendanceRole("");
    } catch (error) { fail('add the record')(error); }
  };

  const toggleAttendanceStatus = async (id: string) => {
    const rec = attendance.find(r => r.id === id);
    if (!rec) return;
    const newStatus = rec.status === "Present" ? "Absent" : "Present";
    try {
      await updateDoc(doc(db, 'attendance', id), { status: newStatus });
      setAttendance(attendance.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (error) { fail('update attendance')(error); }
  };

  if (isLoadingSession) {
    return (
      <div className="p-6 space-y-8 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-white/5 rounded-md"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[#1E2025]/50 border border-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Sign-in gateway (Google). Members: @iiitk.ac.in accounts. Admins: allow-listed emails.
  if (!isAuthenticated) {
    return (
      <div className="py-20 px-4 max-w-lg mx-auto space-y-6 animate-fadeIn">
        <div className="bg-[#1E2025]/70 border border-white/10 rounded-2xl p-6 sm:p-8 glass-panel space-y-6 relative overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-apex-red/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-apex-red/15 border border-apex-red/30 text-apex-red">
              <Lock size={26} />
            </div>
            <div className="inline-block px-3 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest border bg-apex-red/10 border-apex-red/30 text-apex-red">
              SAEINDIA Chapter Portal
            </div>
            <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white">Team &amp; Admin Access</h3>
            <p className="text-slate-400 text-xs font-sans leading-relaxed">
              Sign in with your IIITDM Kurnool Google account (<span className="text-white">{MEMBER_DOMAIN}</span>) to track sprints and inventory.
              Chapter administrators get full access automatically.
            </p>
          </div>

          {(loginError || (user && user.role === 'Guest')) && (
            <div className="p-3 bg-apex-red/10 border border-apex-red/30 text-apex-red rounded-lg text-center font-mono font-semibold text-[11px] leading-relaxed">
              ⚠️ {loginError || `${user?.email} isn't a chapter account. Use your ${MEMBER_DOMAIN} email.`}
            </div>
          )}

          {user && user.role === 'Guest' ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3.5 rounded-lg border border-white/15 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/5 cursor-pointer"
            >
              Sign out and switch account
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full bg-white text-[#111] font-semibold py-3.5 rounded-lg transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg hover:bg-white/90 disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              {isAuthenticating ? "Signing in…" : "Continue with Google"}
            </button>
          )}

          <div className="border-t border-white/5 pt-4 text-center">
            <span className="font-mono text-[10px] text-slate-500">
              IIITDM KURNOOL // SAEINDIA COLLEGIATE CHAPTER
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Cockpit View
  return (
    <div className="animate-fadeIn py-16 px-4 max-w-7xl mx-auto space-y-12">
      
      {/* Cockpit Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-titanium-700/60 border border-white/10 rounded-lg p-6 glass-panel">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 led-pulse"></span>
            <span className="font-heading font-black text-lg uppercase tracking-tight text-white">
              {isAdmin ? "SAEBAJA ADMIN PORTAL & COCKPIT" : "SAEINDIA MEMBER PORTAL & SPRINT HUD"}
            </span>
            {isAdmin ? (
              <span className="ml-2 px-2.5 py-0.5 rounded bg-apex-red/20 text-apex-red border border-apex-red/30 font-mono text-[9px] uppercase font-bold tracking-wider">
                [🛡️ ROOT ADMINISTRATOR]
              </span>
            ) : (
              <span className="ml-2 px-2.5 py-0.5 rounded bg-torque-orange/20 text-torque-orange border border-torque-orange/30 font-mono text-[9px] uppercase font-bold tracking-wider">
                [🏎️ ACTIVE MEMBER]
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs font-sans">
            Authenticated as <strong className="text-white">{session?.user?.name || "Team Member"}</strong>
            {isAdmin 
              ? " — Full administrative privileges enabled. All chapter databases unlocked." 
              : " — Member access enabled. You can track sprints, update task progress, and view workshop inventory."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Role:</span>
            <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${
              isAdmin 
                ? "bg-apex-red/10 border-apex-red/30 text-apex-red" 
                : "bg-torque-orange/10 border-torque-orange/30 text-torque-orange"
            }`}>
              ● {isAdmin ? "Admin" : (session?.user as any)?.role || "Member"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-apex-red/35 hover:border-apex-red hover:bg-apex-red/10 text-apex-red font-mono text-[10px] uppercase font-bold rounded transition-all cursor-pointer shrink-0"
          >
            🔒 Sign Out
          </button>
        </div>
      </div>

      {/* Grid Row 1: Agile Sprint Board (Left) & Verifiable E-Card / Roster (Right) */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Sprint board */}
        <div className="lg:col-span-7 bg-titanium-700/30 border border-white/10 rounded-lg p-6 space-y-6 glass-panel flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-white">
                AGILE TASK SPRINT BOARD
              </h3>
              <span className="font-mono text-[10px] text-slate-400">Total: {tasks.length}</span>
            </div>

            {/* List */}
            <div className="space-y-3 font-mono text-xs max-h-[380px] overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div key={task.id} className="bg-carbon-900/60 p-4 border border-white/5 rounded flex items-center justify-between gap-4 hover:border-white/10 transition-all">
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold ${
                        task.priority === "High" ? "bg-apex-red/20 text-apex-red" : task.priority === "Medium" ? "bg-torque-orange/20 text-torque-orange" : "bg-slate-500/20 text-slate-400"
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-slate-400 text-[9px]">{task.assignee}</span>
                    </div>
                    <span className="text-white text-xs block font-bold leading-tight font-sans">{task.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                      className="bg-carbon-900 border border-white/10 p-1.5 rounded text-white text-[10px] focus:outline-none cursor-pointer"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In-Progress">In-Progress</option>
                      <option value="Done">Done</option>
                    </select>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-apex-red transition-colors cursor-pointer"
                        title="Remove task (Admin only)"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add form */}
          <form onSubmit={handleAddTask} className="border-t border-white/10 pt-4 mt-6 grid grid-cols-12 gap-3 font-mono text-xs">
            <input 
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task description..."
              className="col-span-12 md:col-span-5 bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
            />
            <input 
              type="text"
              required
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              placeholder="Assignee..."
              className="col-span-6 md:col-span-3 bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as any)}
              className="col-span-6 md:col-span-2 bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none cursor-pointer"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button
              type="submit"
              className="col-span-12 md:col-span-2 bg-apex-red hover:bg-apex-red/90 text-white font-bold uppercase p-2.5 rounded flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* E-Card & Member Database Roster */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Official Admin / Member Card */}
          <div className="bg-titanium-700/30 border border-white/10 rounded-lg p-6 space-y-4 glass-panel">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-white">
                {isAdmin ? "ADMINISTRATOR CREDENTIAL CARD" : "CHAPTER MEMBER DIGITAL CREDENTIAL"}
              </h3>
              <span className={`font-mono text-[10px] font-bold ${isAdmin ? "text-emerald-400" : "text-torque-orange"}`}>
                {isAdmin ? "[VERIFIED ROOT]" : "[VERIFIED ACTIVE MEMBER]"}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-[#1e2025] via-[#2a2d35] to-[#121316] p-5 shadow-2xl flex flex-col justify-between h-[180px] group transition-all duration-500 hover:scale-[1.02] hover:border-torque-orange/50">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">SAEINDIA STUDENT CHAPTER</span>
                  <span className="text-[8px] text-torque-orange font-bold uppercase tracking-widest">IIITDM KURNOOL // SAEBAJA</span>
                </div>
                <div className={`w-8 h-8 flex items-center justify-center font-heading font-black text-sm italic text-white skew-x-12 select-none ${
                  isAdmin ? "bg-apex-red" : "bg-torque-orange"
                }`}>
                  SAE
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-white text-sm uppercase font-bold tracking-wider block font-sans">
                  {session?.user?.name || (isAdmin ? "Harshit Kumar Mishra" : "Team Member")}
                </span>
                <span className="text-slate-400 text-[9px] block">
                  ROLE: <strong className="text-white">{isAdmin ? "ADMINISTRATOR (ROOT)" : ((session?.user as any)?.role || "TEAM MEMBER")}</strong>
                  {!isAdmin && (session?.user as any)?.membershipId && (
                    <span className="ml-2 text-torque-orange font-mono font-bold">ID: {(session?.user as any)?.membershipId}</span>
                  )}
                  {!isAdmin && (session?.user as any)?.department && (
                    <span className="ml-2 text-slate-300 font-mono">({(session?.user as any)?.department})</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-2 text-[8px] text-slate-400 font-mono">
                <div>
                  <span className="block font-bold">ACCESS LEVEL</span>
                  <strong className="text-white text-[10px] tracking-wider">
                    {isAdmin ? "FULL PORTAL ADMIN" : "SPRINT TRACKING & WORKSHOP HUD"}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="block font-bold">SECURITY CLEARANCE</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] led-pulse ${
                    isAdmin ? "bg-emerald-500/20 text-emerald-400" : "bg-torque-orange/20 text-torque-orange"
                  }`}>
                    {isAdmin ? "ROOT AUTHORIZED" : "MEMBER ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Member Roster List & Registration Form */}
          <div className="bg-titanium-700/30 border border-white/10 rounded-lg p-6 space-y-4 glass-panel">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-mono font-bold text-[11px] uppercase tracking-widest text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-apex-red rounded-full animate-pulse" />
                [ SAEBAJA_MEMBER_DATABASE_ROSTER ]
              </h3>
              <span className="font-mono text-[10px] text-slate-400">Total: {members.length}</span>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[220px] overflow-y-auto pr-1">
              {members.map((member) => (
                <div key={member.id} className="flex justify-between items-center bg-carbon-900/40 p-3 border border-white/5 rounded hover:border-white/10 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white block uppercase text-[11px]">{member.name}</strong>
                      {member.membershipId && (
                        <span className="px-1.5 py-0.5 rounded bg-torque-orange/15 border border-torque-orange/30 text-torque-orange font-mono text-[9px] font-bold">
                          {member.membershipId}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[10px]">{member.role} | {member.department}</span>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-1.5 text-slate-400 hover:text-apex-red transition-colors cursor-pointer"
                      title="Remove member (Admin only)"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin ? (
              <form onSubmit={handleAddMember} className="border-t border-white/5 pt-4 space-y-2 font-mono text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Full name"
                    className="bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
                  />
                  <input 
                    type="text" 
                    required
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    placeholder="Position role"
                    className="bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={newMemberMembershipId}
                    onChange={(e) => setNewMemberMembershipId(e.target.value)}
                    placeholder="ID (e.g. SAEBAJA-2026-011)"
                    className="bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none uppercase"
                  />
                  <select
                    value={newMemberDept}
                    onChange={(e) => setNewMemberDept(e.target.value)}
                    className="bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none cursor-pointer"
                  >
                    <option value="BAJA Division">BAJA Division</option>
                    <option value="Formula Student">Formula Student Division</option>
                    <option value="Aero Design">Aero Design Division</option>
                    <option value="Executive Board">Executive Board</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-apex-red/10 border border-apex-red hover:bg-apex-red hover:text-white text-apex-red font-bold uppercase py-2.5 rounded flex items-center justify-center gap-1 cursor-crosshair transition-all"
                >
                  <Plus size={14} />
                  <span>[ REGISTER MEMBER TO DATABASE ]</span>
                </button>
              </form>
            ) : (
              <div className="border-t border-white/5 pt-3 text-center">
                <span className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
                  <Shield size={12} className="text-apex-red" />
                  Roster registry locked. Executive Admin privileges required to enroll members.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid Row 2: Live Inventory (Left) & Budget Tracker / Attendance (Right) */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Inventory board */}
        <div className="lg:col-span-7 bg-titanium-700/30 border border-white/10 rounded-lg p-6 space-y-6 glass-panel flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-mono font-bold text-[11px] uppercase tracking-widest text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-torque-orange rounded-full animate-pulse" />
                [ WORKSHOP_PARTS_INVENTORY ]
              </h3>
              <span className="font-mono text-[10px] text-slate-400">Total: {inventory.length} items</span>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[280px] overflow-y-auto pr-1">
              {inventory.map((item) => (
                <div key={item.id} className="bg-carbon-900/60 p-3.5 border border-white/5 rounded flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <strong className="text-white text-xs block font-bold font-sans">{item.name}</strong>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Qty: {item.qty}</span>
                      <span className="text-slate-600 font-bold">|</span>
                      <span className="text-slate-400 text-[10px]">Dept: {item.dept}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold border ${
                      item.status === "In Stock" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : item.status === "Low Stock" ? "bg-apex-red/10 border-apex-red/30 text-apex-red" : "bg-torque-orange/10 border-torque-orange/30 text-torque-orange"
                    }`}>
                      {item.status}
                    </span>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteInventory(item.id)}
                        className="p-1.5 text-slate-400 hover:text-apex-red transition-colors cursor-pointer"
                        title="Remove item (Admin only)"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add inventory item form (Admin only) */}
          {isAdmin ? (
            <form onSubmit={handleAddInventory} className="border-t border-white/10 pt-4 mt-6 grid grid-cols-12 gap-3 font-mono text-xs">
              <input 
                type="text"
                required
                value={newInventoryName}
                onChange={(e) => setNewInventoryName(e.target.value)}
                placeholder="Component part name..."
                className="col-span-12 md:col-span-5 bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
              />
              <input 
                type="text"
                required
                value={newInventoryQty}
                onChange={(e) => setNewInventoryQty(e.target.value)}
                placeholder="e.g. 8 units / 12m"
                className="col-span-6 md:col-span-3 bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
              />
              <select
                value={newInventoryDept}
                onChange={(e) => setNewInventoryDept(e.target.value)}
                className="col-span-6 md:col-span-2 bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none cursor-pointer"
              >
                <option value="Chassis">Chassis</option>
                <option value="Suspension">Suspension</option>
                <option value="Powertrain">Powertrain</option>
                <option value="Brakes">Brakes</option>
                <option value="Electronics">Electronics</option>
              </select>
              <button
                type="submit"
                className="col-span-12 md:col-span-2 bg-apex-red/10 border border-apex-red hover:bg-apex-red hover:text-white text-apex-red font-bold uppercase p-2.5 rounded flex items-center justify-center gap-1 cursor-crosshair transition-all"
              >
                <Plus size={14} />
                <span>[ ADD ]</span>
              </button>
            </form>
          ) : (
            <div className="border-t border-white/10 pt-4 mt-6 text-center">
              <span className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
                <Shield size={12} className="text-torque-orange" />
                Workshop parts inventory stock managed by Subsystem Leads and Root Admins.
              </span>
            </div>
          )}
        </div>

        {/* Budget Tracker & Attendance Right Column */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Budget tracker */}
          <div className="bg-titanium-700/30 border border-white/10 rounded-lg p-6 space-y-4 glass-panel">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-mono font-bold text-[11px] uppercase tracking-widest text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                [ PROJECT_BUDGET_MATH_INR ]
              </h3>
              <span className="font-mono text-[10px] text-slate-400">Fiscal Year 2026/27</span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-white text-[11px]">
                  <span>Allocated BAJA Campaign Budget</span>
                  <span>₹2,10,000 / ₹3,00,000 Spent</span>
                </div>
                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                  <div className="bg-torque-orange h-3 rounded-full" style={{width: '70%'}}></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>70% Utilization Rate</span>
                  <span className="text-emerald-400 font-bold">₹90,000 Remaining</span>
                </div>
              </div>

              <div className="bg-carbon-900/60 p-3.5 border border-white/5 rounded text-[10px] text-slate-400 space-y-1">
                <strong className="text-white block uppercase text-[9px]">Audit Log Ledger</strong>
                All budget allocations comply with IIITDM Kurnool student welfare committee regulations. Scans and invoices reconciled.
              </div>
            </div>
          </div>

          {/* Workshop Attendance */}
          <div className="bg-titanium-700/30 border border-white/10 rounded-lg p-6 space-y-4 glass-panel">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-white">
                WORKSHOP ATTENDANCE RECORD
              </h3>
              <span className="font-mono text-[10px] text-slate-400">Session Check-in</span>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[200px] overflow-y-auto pr-1">
              {attendance.map((rec) => (
                <div key={rec.id} className="flex justify-between items-center bg-carbon-900/40 p-3 border border-white/5 rounded">
                  <div>
                    <strong className="text-white block uppercase text-[11px]">{rec.name}</strong>
                    <span className="text-slate-400 text-[10px]">{rec.role || "Team Member"} • Check-in Verified</span>
                  </div>

                  <button
                    onClick={() => toggleAttendanceStatus(rec.id)}
                    className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold border transition-all cursor-pointer ${
                      rec.status === "Present" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-apex-red/10 border-apex-red/30 text-apex-red"
                    }`}
                  >
                    {rec.status}
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddAttendance} className="border-t border-white/5 pt-4 space-y-2 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input 
                  type="text" 
                  required
                  value={newAttendanceName}
                  onChange={(e) => setNewAttendanceName(e.target.value)}
                  placeholder="Member name..."
                  className="bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
                />
                <input 
                  type="text" 
                  value={newAttendanceRole}
                  onChange={(e) => setNewAttendanceRole(e.target.value)}
                  placeholder="Role or Subsystem..."
                  className="bg-carbon-900 border border-white/10 p-2.5 rounded text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-apex-red hover:bg-apex-red/90 text-white font-bold uppercase py-2.5 rounded flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Log Member Check-in</span>
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Official Chapter News / Report Publisher (Admin only) */}
      <div className="bg-titanium-700/30 border border-white/10 rounded-lg p-6 lg:p-8 space-y-6 glass-panel font-mono text-xs animate-fadeIn">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isAdmin ? "bg-apex-red" : "bg-slate-500"} led-pulse`}></span>
            <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-white">
              {isAdmin ? "PUBLISH CHAPTER NEWS REPORT / BLOG POST" : "OFFICIAL CHAPTER BROADCAST NETWORK"}
            </h3>
          </div>
          <span className="font-mono text-[9px] text-slate-400">Database Broadcast Node</span>
        </div>

        {isAdmin ? (
          <form onSubmit={handlePublishPost} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-slate-300 block">REPORT TITLE</label>
                <input 
                  type="text" 
                  required
                  value={blogTitle}
                  onChange={(e) => setBlogTitle(e.target.value)}
                  placeholder="e.g. B-26 Chassis TIG Weldments Quality Certification"
                  className="w-full bg-carbon-900 border border-white/10 p-3 rounded text-white focus:outline-none focus:border-apex-red"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-300 block">CATEGORY</label>
                <select 
                  value={blogCategory}
                  onChange={(e) => setBlogCategory(e.target.value as any)}
                  className="w-full bg-carbon-900 border border-white/10 p-3 rounded text-white focus:outline-none focus:border-apex-red cursor-pointer"
                >
                  <option value="Announcements">Announcements</option>
                  <option value="Testing">Testing</option>
                  <option value="AWIM Outreach">AWIM Outreach</option>
                  <option value="Competitions">Competitions</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 block">BRIEF EXCERPT (OPTIONAL - WILL AUTO-TRUNCATE CONTENT IF LEFT BLANK)</label>
              <input 
                type="text" 
                value={blogExcerpt}
                onChange={(e) => setBlogExcerpt(e.target.value)}
                placeholder="A short summary of the report to display on card lists..."
                className="w-full bg-carbon-900 border border-white/10 p-3 rounded text-white focus:outline-none focus:border-apex-red"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 block">FULL REPORT BODY CONTENT</label>
              <textarea 
                rows={5}
                required
                value={blogContent}
                onChange={(e) => setBlogContent(e.target.value)}
                placeholder="Write full article content here. Markdown formatting or paragraph splits supported..."
                className="w-full bg-carbon-900 border border-white/10 p-3 rounded text-white focus:outline-none focus:border-apex-red font-sans text-xs"
              ></textarea>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="text-slate-500 text-[10px] leading-tight font-sans">
                * Published author: <strong className="text-white font-mono">{session?.user?.name || "Harshit Kumar Mishra (President / Administrator)"}</strong>
              </span>
              <button
                type="submit"
                className="bg-apex-red hover:bg-apex-red/90 text-white font-bold uppercase py-3.5 px-8 rounded transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus size={14} />
                <span>Broadcast Post to Public Feed</span>
              </button>
            </div>

            {blogPublished && (
              <p className="text-center text-emerald-400 font-bold mt-2">
                ✓ Report successfully published to Chapter Blog!
              </p>
            )}
          </form>
        ) : (
          <div className="p-5 bg-carbon-900/60 border border-white/5 rounded-lg text-slate-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield size={22} className="text-apex-red shrink-0" />
              <div>
                <strong className="text-white block text-sm font-heading uppercase">Official Broadcast Station</strong>
                <span className="text-[11px] text-slate-400">Official chapter news publishing and public announcements are restricted to Root Administrators.</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-[9px] text-slate-400 uppercase font-bold self-start sm:self-center shrink-0">
              🔒 Root Protected
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
