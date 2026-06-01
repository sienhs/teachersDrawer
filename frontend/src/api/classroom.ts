import api from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  Classroom,
  ClassroomCreateRequest,
  ClassroomStatus,
  ClassroomUpdateRequest,
} from '../types/classroom';

export const classroomApi = {
  create: (data: ClassroomCreateRequest) =>
    api.post<ApiResponse<Classroom>>('/api/classrooms', data).then((r) => r.data.data),

  // status 미지정 시 전체 조회
  list: (status?: ClassroomStatus) =>
    api
      .get<ApiResponse<Classroom[]>>('/api/classrooms', {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data.data),

  get: (id: number) =>
    api.get<ApiResponse<Classroom>>(`/api/classrooms/${id}`).then((r) => r.data.data),

  update: (id: number, data: ClassroomUpdateRequest) =>
    api.put<ApiResponse<Classroom>>(`/api/classrooms/${id}`, data).then((r) => r.data.data),

  delete: (id: number) =>
    api.delete<ApiResponse<void>>(`/api/classrooms/${id}`).then((r) => r.data.data),

  archive: (id: number) =>
    api.post<ApiResponse<Classroom>>(`/api/classrooms/${id}/archive`).then((r) => r.data.data),

  activate: (id: number) =>
    api.post<ApiResponse<Classroom>>(`/api/classrooms/${id}/activate`).then((r) => r.data.data),
};
