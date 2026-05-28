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
  Line
} from "recharts";
import * as XLSX from "xlsx";
import { queueApi } from "../../lib/queue-api";
import { ticketApi, Ticket } from "../../lib/ticket-api";

// Safely loading classic CommonJS file saver via default export context to pass Vite runner parameters
import fileSaverPkg from "file-saver";
const { saveAs } = fileSaverPkg;

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const STATUS_COLORS = {
  OPEN: "#F59E0B",
  ASSIGNED: "#3B82F6",
  RESOLVED: "#10B981",
  RE_OPENED: "#EF4444"
};

function DashboardPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        const uniqueUsers = Array.from(
          new Set(
            validatedTickets
              .map((t) => t?.assignedMember?.username)
              .filter((name): name is string => Boolean(name))
          )
        );
        setAvailableUsers(uniqueUsers);
        
        if (uniqueUsers.length > 0) {
          setSelectedUsers(uniqueUsers.slice(0, 2));
        }
      } catch (err) {
        console.error("Dashboard metrics engine initialization failure:", err);
        setError("Failed to compile dashboard metrics infrastructure.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // ✅ ADDED: USER INCLUSION SELECTION STATE MODIFIER
  const handleAddUserView = (username: string) => {
    if (username && !selectedUsers.includes(username)) {
      setSelectedUsers((prev) => [...prev, username]);
    }
  };

  // ✅ ADDED: USER DELETION SELECTION STATE MODIFIER
  const handleRemoveUserView = (username: string) => {
    setSelectedUsers((prev) => prev.filter((user) => user !== username));
  };

  // Global Caseload Status Proportions
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

  // Global Queue Load Distributions
  const queueDistributionData = useMemo(() => {
    if (!queues || !Array.isArray(queues)) return [];
    return queues.map((q) => ({
      name: q?.queueName || "Unknown Queue",
      Tickets: q?.ticketCount || 0,
      Members: q?.memberCount || 0
    }));
  }, [queues]);

  // User Performance Matrix Profiles
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
    const resolved = allTickets.filter(t => t.ticketStatus === "RESOLVED").length;
    const open = allTickets.filter(t => t.ticketStatus === "OPEN" || t.ticketStatus === "RE_OPENED" || t.ticketStatus === "RE_OPEN").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return { total, resolved, open, resolutionRate };
  }, [allTickets]);

  const handleDownloadCSVReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Ticket ID,Subject Title,Status,Assigned Agent,Customer Email\n";
    
    allTickets.forEach((t: any) => {
      csvContent += `"${t.ticketNumber || "N/A"}","${t.ticketTitle || t.subject || "No Subject"}","${t.ticketStatus || "OPEN"}","${t.assignedMember?.username || "UNASSIGNED"}","${t.customerMail || "N/A"}"\n`;
    });

    saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8," }), "Full_Ticket_Statistics_Report.csv");
  };

  const handleDownloadExcelWorkbook = () => {
    const workbook = XLSX.utils.book_new();

    const reportRows = allTickets.map((t: any) => ({
      "Ticket Identifier Code": t.ticketNumber || "N/A",
      "Subject Summary Line": t.ticketTitle || t.subject || "No Subject",
      "Current Ticket Status": t.ticketStatus || "OPEN",
      "Assigned Support Resource": t.assignedMember?.username || "UNASSIGNED",
      "Origin Client Email": t.customerMail || "N/A"
    }));

    const dataSheet = XLSX.utils.json_to_sheet(reportRows);
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Caseload Telemetry");
    
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "Full_Caseload_Metrics_Report.xlsx");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Syncing operational data profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6 space-y-6 block print:p-0 print:bg-white">
      {/* HEADER SECTION PANEL */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Performance Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time stats tracking metrics across support queues.</p>
        </div>

        {/* DOWNLOAD ACTION ROW */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSVReport}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            Export CSV
          </button>
          <button
            onClick={handleDownloadExcelWorkbook}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            Download PDF Report
          </button>
        </div>
      </div>

      {/* KPI METRIC MATRIX CARDS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Total Workload Volume</span>
          <span className="text-3xl font-black text-gray-900 mt-1 block">{statsSummary.total}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Open Backlog</span>
          <span className="text-3xl font-black text-amber-500 mt-1 block">{statsSummary.open}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Completed Resolutions</span>
          <span className="text-3xl font-black text-emerald-500 mt-1 block">{statsSummary.resolved}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Global Efficiency Index</span>
          <span className="text-3xl font-black text-indigo-600 mt-1 block">{statsSummary.resolutionRate}%</span>
        </div>
      </div>

      {/* METRIC VISUALIZATION CHART LAYOUT ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PIE CHART */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-[380px] flex flex-col page-break-inside-avoid">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-1">Caseload Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Caseload breakdown mapped via active ticket statuses.</p>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="45%" innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="value">
                  {statusChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "8px", border: "none" }} itemStyle={{ color: "#FFF", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 inset-x-0 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold text-gray-600">
              {statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BAR CHART */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-[380px] lg:col-span-2 flex flex-col page-break-inside-avoid">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-1">Global Volume Metrics</h3>
          <p className="text-xs text-gray-400 mb-4">Isolating target workload areas requiring response staff assignment actions.</p>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueDistributionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "8px", border: "none" }} itemStyle={{ fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Tickets" fill="#3B82F6" name="Total Queue Tickets" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Members" fill="#9CA3AF" name="Queue Assigned Members" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PERSONNEL EXPLORER PANEL */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm lg:col-span-3 flex flex-col space-y-4 page-break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
            <div>
              <h3 className="text-base font-bold text-gray-800">Dynamic Personnel Insight Explorer</h3>
              <p className="text-xs text-gray-400 mt-0.5">Select and target specific engineers to track performance rates side-by-side.</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddUserView(e.target.value);
                    e.target.value = "";
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

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center print:hidden">
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

          <div className="h-[340px] w-full pt-2">
            {selectedUsers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400 border border-dashed rounded-xl bg-gray-50/50">
                Please add at least one team member from the exploration layout dropdown.
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