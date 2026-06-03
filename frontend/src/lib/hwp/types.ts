import type { ParsedSection, ParsedMontessoriRecord, SectionCategory } from '../../types/activityPlan';

export type { ParsedSection, ParsedMontessoriRecord, SectionCategory };

export interface ParsedActivityPlan {
  planDate: string;
  subject: string;
  teacherName: string;
  classNameRaw: string;
  classTimeRaw: string;
  classDayCount: number;
  sections: ParsedSection[];
  montessoriRecords: ParsedMontessoriRecord[];
  rawJson: string;
}
