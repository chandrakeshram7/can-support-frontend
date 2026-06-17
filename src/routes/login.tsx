import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Terminal, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPendingApproval(false);
    setSubmitting(true);

    try {
      await login({ username, password });
      
      navigate({
        to: "/dashboard",
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Login failed";
      
      // Check if the backend rejected the login due to a pending verification status
      if (errMsg.toLowerCase().includes("approval") || errMsg.toLowerCase().includes("pending")) {
        setIsPendingApproval(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/60 p-4 font-sans antialiased text-gray-800">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm animate-in fade-in zoom-in-95 duration-200">
        
        {/* Branding Head Block */}
        <div className="space-y-1.5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-blue-600 font-black text-xs tracking-widest uppercase">
            <Terminal size={14} />
            <span>CAN Support Platform</span>
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Console Gateway Sign In
          </h1>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Internal Node Restricted Access
          </p>
        </div>

        {/* STAGED ACCOUNT PENDING WARNING PANEL */}
        {isPendingApproval ? (
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 border border-amber-200/40">
                <ShieldAlert size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Approval Verification Pending</h4>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Your signup request was received successfully. To prevent unauthenticated operations, your node profile must be signed off by an <strong className="font-bold text-amber-900">ADMIN</strong> or <strong className="font-bold text-amber-900">MANAGER</strong> before initialization.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsPendingApproval(false)} 
              className="w-full bg-white border border-amber-200 hover:bg-amber-50/50 text-amber-800 font-bold text-[10px] uppercase tracking-wider h-7 rounded-md transition-all focus:outline-none"
            >
              Return to Login Form
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Operator Username
              </Label>
              <Input
                id="username"
                // ✅ FIXED: Generic, fully professional production asset text token placeholders mapped cleanly
                placeholder="Enter workspace username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-9 font-semibold text-xs border-gray-200 focus-visible:ring-blue-500 bg-gray-50/30 text-gray-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Security Core Secret
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-9 font-semibold text-xs border-gray-200 focus-visible:ring-blue-500 bg-gray-50/30 text-gray-900"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-150">
                <Lock size={12} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm shadow-blue-600/10 transition-all focus:outline-none"
            >
              {submitting ? "Validating Node..." : "Authenticate Session"}
            </Button>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-center text-[11px] font-medium text-gray-400">
              <span>New platform personnel?</span>
              <Link
                to="/signup"
                className="ml-1 text-blue-600 font-bold hover:underline transition-all"
              >
                File entry application
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}