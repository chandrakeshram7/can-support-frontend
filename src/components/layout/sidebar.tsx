import { Link } from "@tanstack/react-router";

export default function Sidebar() {
  return (
    <div className="w-64 border-r min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">CAN Support</h1>

      <div className="space-y-4">
        <Link to="/dashboard" className="block hover:underline">
          Dashboard
        </Link>

        <Link to="/tickets" className="block hover:underline">
          Tickets
        </Link>

        <Link to="/projects" className="block hover:underline">
          Projects
        </Link>
        <Link to="/users" className="block hover:underline">
          Users
        </Link>
      <Link to="/queues" className="block hover:underline">
        Queues
      </Link>
    </div>
    </div>
  );
}
