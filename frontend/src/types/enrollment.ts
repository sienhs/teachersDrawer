// 백엔드 EnrollmentResponse 대응
export interface Enrollment {
  id: number;
  childId: number;
  childName: string;
  classroomId: number;
  classroomName: string;
  year: number;
}

export interface EnrollmentCreateRequest {
  childId: number;
  classroomId: number;
}
