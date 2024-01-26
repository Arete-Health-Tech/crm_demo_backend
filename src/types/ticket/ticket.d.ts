import { ObjectId } from "mongodb";
export interface subStageCodeType {
  active: boolean;
  code: number;
}
// export interface iTicket {
//   _id?: ObjectId;
//   consumer: ObjectId;
//   stage: ObjectId;
//   subStageCode: subStageCodeType;
//   modifiedDate: Date | null;
//   department: ObjectId | null;
//   prescription: ObjectId;
//   creator: ObjectId;
//   assigned: ObjectId;
//   logged: boolean;
//   group: ObjectId | null;
//   value?: number;
//   highlights?: string[];
//   date: Date;
// }

export interface iTicket {
  _id?: ObjectId;
  consumer: ObjectId;
  stage: ObjectId;
  subStageCode: subStageCodeType;
  modifiedDate: Date | null;
  department: ObjectId | null;
  prescription: ObjectId;
  creator: ObjectId;
  assigned: ObjectId;
  logged: boolean;
  group: ObjectId | null;
  value?: number;
  highlights?: string[];
  date: Date;
  result: ObjectId | null;
  status: string | null;
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
  condition: string;
  symptoms: string;
  followUp: Date;
  isPharmacy: string;
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
  ward? : ObjectId | 0;
  wardDays?: number;
  icuDays?: number;
  isEmergency: boolean;
  paymentType: number; // 0 cash, 1 insurance, 2 cghs/echg
  insuranceCompany?: string | 0;
  insurancePolicyNumber?: string | 0;
  insurancePolicyAmount?: number;
  OTCharge? : number ;
  OTgas? : number ;
  AnaesthetistCharge ?: number ; 
  service: {
    id: ObjectId;
    isSameSite: boolean;
  }[];
  mrd?: number;
  pharmacy?: number;
  pathology?: number;
  equipmentAmount?: number;
  Diet?: number;
  Admission?: number;
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
export interface iSkip {
  text: string;
  ticket: ObjectId;
  creator: ObjectId;
  createdAt: string | number;
}
export interface iflowData {
  _id: string;
  nodeName: string;
  headerType: string;
  vedio: string;
  image: string;
  text: string;
}

export interface iTicketDate {
  modifiedDate?: Date | null;
}


export interface iUpdateTicketData {
  consumer?: Partial<{
    _id: ObjectId;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string;
    uid: string;
    age: string;
    gender: string;
    dob: Date;
  }>;
  prescription?: Partial<{
    _id: ObjectId;
    admission: string;
    service: ObjectId;
    condition: string | null;
    departments: ObjectId[];
    diagnostics: ObjectId[];
    medicines: ObjectId[]; // Assuming ObjectId for each medicine
    doctor: ObjectId;
    followUp: Date;
    isPharmacy: string;
    image: string;
    symptoms: string | null;
    caregiver_name: string | null;
    caregiver_phone: string | null;
    created_Date: Date;
  }>;
}









