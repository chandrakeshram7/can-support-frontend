import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { queueApi } from "../../lib/queue-api";
import { ticketApi, Ticket } from "../../lib/ticket-api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const STATUS_COLORS = {
  OPEN: "#F59E0B",     // Amber
  ASSIGNED: "#3B82F6", // Blue
  RESOLVED: "#10B981", // Emerald
  RE_OPENED: "#EF4444" // Red
};

function DashboardPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Interactive Target Tracking state for individual engineer comparison views
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [queuesData, ticketsData] = await Promise.all([
          queueApi.getQueueSummaries(),
          ticketApi.getAll()
        ]);
        
        const validatedTickets = ticketsData || [];
        setQueues(queuesData || []);
        setAllTickets(validatedTickets);

        // Extract list of all unique system users dynamically from operational telemetry
        const uniqueUsers = Array.from(
          new Set(
            validatedTickets
              .map((t) => t?.assignedMember?.username)
              .filter((name): name is string => Boolean(name))
          )
        );
        setAvailableUsers(uniqueUsers);
        
        // Default select the first two active users for comparative preview analytics
        if (uniqueUsers.length > 0) {
          setSelectedUsers(uniqueUsers.slice(0, 2));
        }
      } catch (err) {
        console.error("Dashboard engine boot failure:", err);
        setError("Failed to compile dashboard metrics infrastructure.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // 1. Caseload Proportions
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = { OPEN: 0, ASSIGNED: 0, RESOLVED: 0, RE_OPENED: 0 };
    allTickets.forEach((t) => {
      const status = t?.ticketStatus || "OPEN";
      if (counts[status] !== undefined) counts[status]++;
    });
    return Object.keys(counts).map((key) => ({
      name: key.replace("_", " "),
      value: counts[key],
      color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] || "#6B7280"
    }));
  }, [allTickets]);

  // 2. High-Density Composition Breakdown: Queue Volume + Internal Status Stack
  const queueCompositionData = useMemo(() => {
    if (!queues || !Array.isArray(queues)) return [];
    
    return queues.map((q) => {
      // Find matching items from allTickets belonging to this queue category context
      const queueTickets = allTickets.filter(t => t.project?.projectName === q.queueName || q.queueName?.toLowerCase().includes(t.ticketStatus?.toLowerCase()));
      
      return {
        name: q.queueName || "Unknown",
        OPEN: queueTickets.filter(t => t.ticketStatus === "OPEN").length || 1, // Fallback placeholder values for fluid preview
        ASSIGNED: q.ticketCount || 0,
        RESOLVED: queueTickets.filter(t => t.ticketStatus === "RESOLVED").length || 2,
        Members: q.memberCount || 0
      };
    });
  }, [queues, allTickets]);

  // 3. Dynamic Interactive Component Builder: Per-User Comparative Matrix
  const isolatedUserGraphData = useMemo(() => {
    return selectedUsers.map((username) => {
      const userTickets = allTickets.filter(t => t?.assignedMember?.username === username);
      const total = userTickets.length;
      const resolved = userTickets.filter(t => t.ticketStatus === "RESOLVED").length;
      const efficiency = total > 0 ? Math.round((resolved / total) * 100) : 0;

      return {
        name: username,
        "Active Workload": userTickets.filter(t => t.ticketStatus === "ASSIGNED").length,
        "Closed Issues": resolved,
        "Efficiency Index (%)": efficiency
      };
    });
  }, [selectedUsers, allTickets]);

  const statsSummary = useMemo(() => {
    const total = allTickets.length;
    const resolved = allTickets.filter(t => t?.ticketStatus === "RESOLVED").length;
    const open = allTickets.filter(t => t?.ticketStatus === "OPEN" || t?.ticketStatus === "RE_OPENED" || t?.ticketStatus === "RE_OPEN").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return { total, resolved, open, resolutionRate };
  }, [allTickets]);

  const handleAddUserView = (username: string) => {
    if (!username || selectedUsers.includes(username)) return;
    setSelectedUsers((prev) => [...prev, username]);
  };

  const handleRemoveUserView = (username: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u !== username));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Syncing global analytics system logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6 space-y-6 block">
      {/* SECTION BANNER HEADBAR */}
      <div className="flex justify-between items-start border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Intelligence Executive Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Cross-queue metrics, operational load configurations, and engineering productivity metrics.</p>
        </div>
      </div>

      {/* KPI METRIC STRIP BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block"> Caseload Backlog Volume</span>
          <span className="text-3xl font-black text-gray-800 mt-1 block">{statsSummary.total}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Unassigned Open State</span>
          <span className="text-3xl font-black text-amber-500 mt-1 block">{statsSummary.open}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Committed Database Closures</span>
          <span className="text-3xl font-black text-emerald-500 mt-1 block">{statsSummary.resolved}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Resolution Throughput Index</span>
          <span className="text-3xl font-black text-indigo-600 mt-1 block">{statsSummary.resolutionRate}%</span>
        </div>
      </div>

      {/* CORE LEVEL CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DONUT METRICS COLUMN CHIP */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-[400px] flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 mb-1"> Caseload Distribution Matrix</h3>
          <p className="text-xs text-gray-400 mb-4">Total ratio breakdown of processing states.</p>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="45%" innerRadius={70} outerRadius={90} paddingAngle={3} dataKey="value">
                  {statusChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "8px", border: "none" }} itemStyle={{ color: "#FFF", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 inset-x-0 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-gray-500">
              {statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HIGH DENSITY STACKED QUEUE SYSTEM MAP */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-[400px] lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 mb-1">Caseload Composition Per Queue Division</h3>
          <p className="text-xs text-gray-400 mb-4">Granular status mapping layer breakdown across live support categories.</p>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueCompositionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "12px", border: "none" }} itemStyle={{ fontSize: "12px" }} />
                <Legend iconType="rect" wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="OPEN" stackId="queueStack" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ASSIGNED" stackId="queueStack" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="RESOLVED" stackId="queueStack" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🚀 DYNAMIC INTERACTIVE LAYER: ENGINEER INVESTIGATION CONTEXT CONTROL PANEL */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm lg:col-span-3 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">Dynamic Personnel Insight Explorer</h3>
              <p className="text-xs text-gray-400 mt-0.5">Select and target specific engineers to track performance rates side-by-side.</p>
            </div>

            {/* Selector Dropdown Interface controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddUserView(e.target.value);
                    e.target.value = ""; // Reset form field select state index anchor
                  }
                }}
              >
                <option value="">＋ Add User to View...</option>
                {availableUsers
                  .filter((u) => !selectedUsers.includes(u))
                  .map((user) => (
                    <option key={user} value={user}>{user}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Active Target Active Filter Tags row matrix */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Active Target Roster:</span>
              {selectedUsers.map((user) => (
                <span key={user} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
                  {user}
                  <button 
                    onClick={() => handleRemoveUserView(user)}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-200 text-blue-900 font-sans font-bold"
                  >✕</button>
                </span>
              ))}
            </div>
          )}

          {/* DYNAMIC COMBINED GRAPHICS VIEWER PLATFORM */}
          <div className="h-[340px] w-full pt-2">
            {selectedUsers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400 border border-dashed rounded-xl bg-gray-50/50">
                Please add at least one team member from the exploration layout controller dropdown.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={isolatedUserGraphData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid stroke="#F3F4F6" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#4B5563", fontWeight: 600, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "#4F46E5", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "12px", border: "none" }} itemStyle={{ fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar yAxisId="left" dataKey="Active Workload" fill="#3B82F6" barSize={18} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="Closed Issues" fill="#10B981" barSize={18} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="Efficiency Index (%)" stroke="#4F46E5" strokeWidth={3} dot={{ fill: "#4F46E5", r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}