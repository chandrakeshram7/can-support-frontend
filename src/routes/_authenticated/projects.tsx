import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState } from "react";

import {
  projectApi,
  Project,
} from "@/lib/project-api";

export const Route =
  createFileRoute(
    "/_authenticated/projects"
  )({
    component: ProjectsPage,
  });

function ProjectsPage() {

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {

    try {

      setLoading(true);

      const data =
        await projectApi.getAllProjects();

      setProjects(data || []);

    } catch (e) {

      console.error(e);

      setError(
        "Failed to load projects"
      );

    } finally {

      setLoading(false);
    }
  };

  const filteredProjects =
    projects.filter((project) => {

      const matchesSearch =

        project.projectName
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||

        project.manager
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesStatus =

        statusFilter === "ALL" ||

        project.projectStatus ===
          statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  if (loading) {

    return (
      <div className="p-6">
        Loading Projects...
      </div>
    );
  }

  if (error) {

    return (
      <div className="p-6 text-red-500">
        {error}
      </div>
    );
  }

  return (

    <div className="p-6 bg-gray-100 min-h-screen">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">

        <div>

          <h1 className="text-3xl font-bold">
            Projects
          </h1>

          <p className="text-gray-500">
            Manage all projects
          </p>

        </div>

      </div>

      {/* FILTERS */}

      <div className="bg-white p-5 rounded-lg shadow mb-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="border rounded px-3 py-2"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="border rounded px-3 py-2"
          >

            <option value="ALL">
              All Status
            </option>

            <option value="ACTIVE">
              ACTIVE
            </option>

            <option value="COMPLETED">
              COMPLETED
            </option>

            <option value="ON_HOLD">
              ON HOLD
            </option>

          </select>
        </div>
      </div>

      {/* PROJECTS */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {filteredProjects.map(
          (project) => (

            <div
              key={project.id}
              className="bg-white rounded-lg shadow p-5 border"
            >

              <div className="flex justify-between items-start">

                <div>

                  <h2 className="text-xl font-bold">
                    {project.projectName}
                  </h2>

                  <p className="text-sm text-gray-500">
                    Manager: {project.manager}
                  </p>

                </div>

                <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded">
                  {project.projectStatus}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">

                <p>
                  <strong>Cost:</strong>
                  {" "}
                  ₹{project.cost}
                </p>

                <p>
                  <strong>Start:</strong>
                  {" "}
                  {project.startDate}
                </p>

                <p>
                  <strong>End:</strong>
                  {" "}
                  {project.endDate}
                </p>

                <p>
                  <strong>Members:</strong>
                  {" "}
                  {project.members?.length || 0}
                </p>
              </div>

              {/* MEMBERS */}

              <div className="mt-4 flex flex-wrap gap-2">

                {project.members?.map(
                  (member) => (

                    <span
                      key={member.username}
                      className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full"
                    >
                      {member.username}
                    </span>
                  )
                )}
              </div>

              {/* ACTIONS */}

              <div className="mt-5 flex gap-3">

                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                >
                  View
                </button>

                <button
                  onClick={async () => {

                    if (
                      !confirm(
                        "Delete project?"
                      )
                    ) {
                      return;
                    }

                    try {

                      await projectApi.deleteProject(
                        project.id
                      );

                      await loadProjects();

                    } catch (e) {

                      console.error(e);

                      alert(
                        "Delete failed"
                      );
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  Delete
                </button>

              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}