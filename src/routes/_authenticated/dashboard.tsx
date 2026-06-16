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
import { LayoutDashboard, Download, FileSpreadsheet, FileText, Printer, UserCheck } from "lucide-react";

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
        if (loading) setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleAddUserView = (username: string) => {
    if (username && !selectedUsers.includes(username)) {
      setSelectedUsers((prev) => [...prev, username]);
    }
  };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Syncing operational data profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans antialiased text-gray-800 space-y-4 print:p-0 print:bg-white">
      
      {/* 1. TOP BANNER AND ACTIONS ROW */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-gray-200/60 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Performance Analytics</h1>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Real-time telemetry and resource capacity tracking desks.</p>
          </div>
        </div>

        {/* HIGH-DENSITY ACTION BUTTON ROW */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadCSVReport}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all"
          >
            <FileText size={13} className="text-gray-400" /> Export CSV
          </button>
          <button
            onClick={handleDownloadExcelWorkbook}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all"
          >
            <FileSpreadsheet size={13} className="text-gray-400" /> Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all"
          >
            <Printer size={13} /> PDF Report
          </button>
        </div>
      </div>

      {/* 2. HIGH-DENSITY KPI METRIC MATRIX CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Caseload</span>
          <span className="text-2xl font-black text-gray-900 mt-0.5 block leading-tight">{statsSummary.total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Open Backlog</span>
          <span className="text-2xl font-black text-amber-500 mt-0.5 block leading-tight">{statsSummary.open}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Resolutions</span>
          <span className="text-2xl font-black text-emerald-500 mt-0.5 block leading-tight">{statsSummary.resolved}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Efficiency Rate</span>
          <span className="text-2xl font-black text-indigo-600 mt-0.5 block leading-tight">{statsSummary.resolutionRate}%</span>
        </div>
      </div>

      {/* 3. METRIC VISUALIZATION CHART PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* PIE CHART CONTAINER CARD */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 h-[340px] flex flex-col page-break-inside-avoid">
          <div className="border-b border-gray-100 pb-2 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Caseload Apportionment</h3>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Distribution volume mapped by ticket status.</p>
          </div>
          
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="45%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {statusChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "8px", border: "none" }} itemStyle={{ color: "#FFF", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Elegant Dense Bottom Legend Indicator Row */}
            <div className="absolute bottom-0 inset-x-0 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-bold text-gray-500 bg-gray-50/50 border border-gray-100 rounded-lg p-1.5">
              {statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="capitalize">{item.name}: <span className="text-gray-900 font-black">{item.value}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BAR CHART DISTRIBUTION CARD */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 h-[340px] lg:col-span-2 flex flex-col page-break-inside-avoid">
          <div className="border-b border-gray-100 pb-2 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Global Channel Demands</h3>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Isolating system queues requiring operational staffing adjustments.</p>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueDistributionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "8px", border: "none" }} itemStyle={{ fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", pt: 10 }} />
                <Bar dataKey="Tickets" fill="#3B82F6" name="Queue Tickets" radius={[3, 3, 0, 0]} barSize={16} />
                <Bar dataKey="Members" fill="#9CA3AF" name="Assigned Staff" radius={[3, 3, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PERSONNEL PERFORMANCE ANALYSIS LAYER */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 lg:col-span-3 flex flex-col space-y-3 page-break-inside-avoid">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 print:hidden">
            <div className="flex items-center gap-2">
              <UserCheck size={15} className="text-indigo-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Personnel Diagnostics Explorer</h3>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Target specific team member engineers to track relative workload efficiency rates.</p>
              </div>
            </div>

            <div>
              <select
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 h-8 shadow-sm"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddUserView(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">＋ Benchmark Operator...</option>
                {availableUsers
                  .filter((u) => !selectedUsers.includes(u))
                  .map((user) => (
                    <option key={user} value={user}>{user}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* ACTIVE TARGET CAPSULE CHIPS */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center print:hidden bg-gray-50/60 p-1.5 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 px-1">Selected Cohort:</span>
              {selectedUsers.map((user) => (
                <span key={user} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-bold shadow-sm">
                  <span className="capitalize">{user}</span>
                  <button 
                    onClick={() => handleRemoveUserView(user)}
                    className="w-4 h-4 rounded-md flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-red-500 font-sans text-[10px] font-black transition-colors"
                  >✕</button>
                </span>
              ))}
            </div>
          )}

          {/* COMPOSED LINE/BAR CHART MATRIX CANVAS */}
          <div className="h-[280px] w-full pt-1">
            {selectedUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs font-bold text-gray-400 border border-dashed rounded-xl bg-gray-50/50 uppercase tracking-wider gap-1 select-none">
                <span>No active monitor cohort targeted</span>
                <span className="text-[10px] font-semibold text-gray-400/70 lowercase normal-case">Please provision an engineer via the selector node dropdown list.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={isolatedUserGraphData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid stroke="#F3F4F6" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#374151", fontWeight: 700, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "#4F46E5", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1F2937", borderRadius: "10px", border: "none" }} itemStyle={{ fontSize: "11px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar yAxisId="left" dataKey="Active Workload" fill="#3B82F6" barSize={14} radius={[2, 2, 0, 0]} name="Pending Load" />
                  <Bar yAxisId="left" dataKey="Closed Issues" fill="#10B981" barSize={14} radius={[2, 2, 0, 0]} name="Closed Cases" />
                  <Line yAxisId="right" type="monotone" dataKey="Efficiency Index (%)" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: "#4F46E5", r: 3.5 }} name="Resolution Ratio" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}