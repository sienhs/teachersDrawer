// 백엔드 activityPlan DTO 대응
// 주의: 백엔드 응답에는 classroomName 이 없고 classroomId / classNameRaw 만 내려온다.
//       화면에서 "반"을 표기할 땐 classNameRaw(HWP 원본 학급명)를 사용한다.

export type SectionCategory =
  | 'MORNING'
  | 'SAFETY'
  | 'LUNCH'
  | 'OUTDOOR'
  | 'EVALUATION'
  | 'OTHER';

export interface ActivitySection {
  id: number;
  orderIndex: number;
  label: string;
  content: string;
  category: SectionCategory;
}

export interface MontessoriRecord {
  id: number;
  childNameRaw: string;
  childId?: number | null;
  area?: string | null;
  material?: string | null;
  confirmed?: string | null;
  planDate?: string | null; // 아이별 이력 조회 시에만 채워짐
}

// GET /api/activity-plans (목록) — ActivityPlanSummaryResponse
export interface ActivityPlanSummary {
  id: number;
  planDate: string; // yyyy-MM-dd
  subject?: string | null;
  teacherName?: string | null;
  classNameRaw?: string | null;
  classroomId?: number | null;
  fileName: string;
  createdAt: string;
}

// GET /api/activity-plans/{id} (상세) — ActivityPlanResponse
export interface ActivityPlanDetail extends ActivityPlanSummary {
  classTimeRaw?: string | null;
  classDayCount?: number | null;
  sections: ActivitySection[];
  montessoriRecords: MontessoriRecord[];
}

// GET /api/activity-plans/children/{childId}/montessori — planDate 포함
export interface MontessoriHistoryItem extends MontessoriRecord {
  planDate: string;
}
