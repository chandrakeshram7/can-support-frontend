import { apiFetch } from "./api";

export interface MemberDTO {
  username: string;
  role: string;
}

export interface Project {
  id: number;

  projectName: string;

  manager: string;

  cost: number;

  startDate: string;

  endDate: string;

  projectStatus: string;

  members: MemberDTO[];
}

export interface ProjectDropdown {
  id: number;

  projectName: string;
}

export interface CreateProjectRequest {
  projectName: string;

  manager: string;

  cost: number;

  startDate: string;

  endDate: string;

  memberIds: number[];
}

export const projectApi = {

  async getProjectsByStatus(status: string) {

    const response = await apiFetch<{
      data: Project[];
    }>(
      `/projects/get/status?value=${status}`
    );

    return response.data;
  },

  async getProjectById(id: number) {

    const response = await apiFetch<{
      data: Project;
    }>(
      `/projects/get/${id}`
    );

    return response.data;
  },

  async createProject(
    body: CreateProjectRequest
  ) {

    const response = await apiFetch<{
      data: number;
    }>(
      "/projects/create",
      {
        method: "POST",

        body: JSON.stringify(body),
      }
    );

    return response.data;
  },

  async deleteProject(id: number) {

    const response = await apiFetch<{
      data: any;
    }>(
      `/projects/delete/${id}`,
      {
        method: "DELETE",
      }
    );

    return response.data;
  },

  async getAllProjects() {

    const response = await apiFetch<{
      data: ProjectDropdown[];
    }>(
      "/projects/getAll"
    );

    return response.data;
  },
};