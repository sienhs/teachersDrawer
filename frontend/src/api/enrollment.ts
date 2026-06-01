import api from './instance';
import type { ApiResponse } from '../types/auth';
import type { Enrollment, EnrollmentCreateRequest } from '../types/enrollment';

export const enrollmentApi = {
  enroll: (data: EnrollmentCreateRequest) =>
    api.post<ApiResponse<Enrollment>>('/api/enrollments', data).then((r) => r.data.data),

  listByChild: (childId: number) =>
    api
      .get<ApiResponse<Enrollment[]>>(`/api/enrollments/children/${childId}`)
      .then((r) => r.data.data),

  listByClassroom: (classroomId: number) =>
    api
      .get<ApiResponse<Enrollment[]>>(`/api/enrollments/classrooms/${classroomId}`)
      .then((r) => r.data.data),

  unenroll: (enrollmentId: number) =>
    api.delete<ApiResponse<void>>(`/api/enrollments/${enrollmentId}`).then((r) => r.data.data),
};
