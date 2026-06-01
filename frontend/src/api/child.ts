import api from './instance';
import type { ApiResponse } from '../types/auth';
import type { Child, ChildCreateRequest, ChildUpdateRequest } from '../types/child';

export const childApi = {
  create: (data: ChildCreateRequest) =>
    api.post<ApiResponse<Child>>('/api/children', data).then((r) => r.data.data),

  list: () =>
    api.get<ApiResponse<Child[]>>('/api/children').then((r) => r.data.data),

  get: (id: number) =>
    api.get<ApiResponse<Child>>(`/api/children/${id}`).then((r) => r.data.data),

  update: (id: number, data: ChildUpdateRequest) =>
    api.put<ApiResponse<Child>>(`/api/children/${id}`, data).then((r) => r.data.data),

  delete: (id: number) =>
    api.delete<ApiResponse<void>>(`/api/children/${id}`).then((r) => r.data.data),
};
