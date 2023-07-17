import { ObjectId } from "mongodb";

export interface subStageCodeType {
  active: boolean;
  code: number;
}

export interface iTicket {
  _id?: ObjectId;
  consumer: ObjectId;
  stage: ObjectId;
  subStageCode: subStageCodeType;
  modifiedDate: Date | null;
  prescription: ObjectId;
  creator: ObjectId;
  assigned: ObjectId;
  value?: number;
  highlights?: string[];
  date: Date;
}
export interface iTicketUpdate {
  stage?: ObjectId;
  subStageCode?: subStageCodeType;
  modifiedDate?: Date | null;
}

export interface iPrescription {
  consumer: ObjectId;
  departments: ObjectId[]; // remove sub department
  doctor: name;
  condition: string; //-
  symptoms: string; //-
  followUp: Date;
  image: string;
  medicines: string[] | null; //-
  diagnostics: string[] | null;
  admission: string | null; // none to not advised
  service?: ObjectId;
  _id?: ObjectId;
  caregiver_name?: string;
  caregiver_phone?: string;
  created_Date: Date | number | string;
  // care giver
}

export interface iEstimate {
  _id: ObjectId;
  type: number; // 0 packaged, 1 non packaged
  wardDays: number;
  icuDays: number;
  icuType: ObjectId;
  isEmergency: boolean;
  paymentType: number; // 0 cash, 1 insurance, 2 cghs/echg
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insurancePolicyAmount?: number;
  service: {
    id: ObjectId;
    isSameSite: boolean;
  }[];
  investigation?: ObjectId[];
  procedure?: ObjectId[];
  investigationAmount?: number;
  procedureAmount?: number;
  medicineAmount?: number;
  equipmentAmount?: number;
  bloodAmount?: number;
  additionalAmount?: number;
  creator: ObjectId;
  prescription: ObjectId;
  ticket: ObjectId;
}

export interface iNote {
  text: string;
  ticket: ObjectId;
  creator: ObjectId;
  createdAt: string | number;
}

export interface ifollowUp {
  id?: ObjectId;
  name: string;
  followUpDate: Date | string | number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  followUpDate1: Date | string | number | null;
  followUpDate2: Date | string | number | null;
}
