export type SchoolType = 'KINDERGARTEN' | 'ELEMENTARY' | 'MIDDLE' | 'HIGH';

export interface SchoolInfo {
  schoolCode: string;
  schoolName: string;
  schoolType: SchoolType;
  address: string;
  region: string;
}

export interface Sigungu {
  name: string;
  code: string;
}

export interface RegionInfo {
  sidoName: string;
  sidoCode: string;
  sigunguList: Sigungu[];
}
