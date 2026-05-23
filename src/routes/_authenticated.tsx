import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Sidebar from "@/components/layout/sidebar";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {

    // SAFE CHECK
    if (typeof window === "undefined") {
      return;
    }

    const token =
      window.localStorage.getItem("accessToken");

    if (!token) {
      throw redirect({
        to: "/login",
      });
    }
  },

  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}