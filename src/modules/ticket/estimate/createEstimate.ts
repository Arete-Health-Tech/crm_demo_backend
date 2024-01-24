import { ClientSession, ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import ErrorHandler from "../../../utils/errorHandler";
import { findConsumerById } from "../../consumer/functions";
import {
  findDoctorById,
  getAllDepartments,
  getAllWards,
  getDepartmentById,
  getWardById,
} from "../../department/functions";
import { findPrescriptionById, findServices, findServicesPck, findTicketById } from "../crud";
import { findEstimateById, updateEstimateTotal, updateTicketLocation } from "../functions";
import { putMedia } from "../../../services/aws/s3";
import {
  estimateTemplateMessage,
  sendMessage,
} from "../../../services/whatsapp/whatsapp";
import { whatsappEstimatePayload } from "./utils";
import {
  iEstimate,
  iPrescription,
  iTicket,
} from "../../../types/ticket/ticket";
import { getDoctors } from "../../department/controllers";
import { findOneDoctor } from "../../department/crud";
import { findConsumerFromWAID, saveMessage } from "../../../services/whatsapp/webhook";
import { getServiceById } from "../../service/functions";

const BUCKET_NAME = process.env.PUBLIC_BUCKET_NAME;

const generateEstimate = async (
  estimateId: ObjectId,
  session: ClientSession
) => { 
  let estimate: iEstimate,
    ticket: iTicket,
    prescription: iPrescription,
    servicesArray: any[] = [],
    investigationArray: any[] = [],
    procedureArray: any[] = [];

  findEstimateById(estimateId, session).then((res) => {
    if (res === null) throw new ErrorHandler("Invalid estimate", 400);
    estimate = res;
    estimate.service.forEach((item) => {
      const newid = new ObjectId(item.id);
      console.log(newid , "dusgusnd");
      servicesArray.push(newid);
    
    }); 
    console.log(servicesArray ,"servicesArrayservicesArray");
    const allTicket=new ObjectId(estimate.ticket)
    findTicketById(allTicket)
      .then((ticketRes) => {
        ticket = ticketRes!;
       
      })
      .then(async (_) => {
        Promise.all([
         
          findPrescriptionById(ticket!.prescription),

          findConsumerById(ticket!.consumer),
          getAllWards(),

          findServices({ _id: { $in: servicesArray } }),
          findServices({ _id: { $in: investigationArray } }),
          findServices({ _id: { $in: procedureArray } }),
          // findServicesPck({_id : {$in : servicesArray}}),
        ]).then(
          async ([
            prescription,
            consumer,
            wards,
            services,
            servicepck ,
            // investigations,
            // procedures,
          ]) => {
          
            const charges: {
              service: number[];
              MRD: number[];
              pharmacy: number[];
              pathology: number[];
              OTCharge: number[];
              OTgas: number[];
              Admission : number[];
              mrd : number[];
              BedCharge : number[];
              AnaesthetistCharge: number[];
              equipmentAmount: number[];
              Diet: number[];
              blood: number[];
              other: number[];
              total: number[];
            } = {
              service: [],
              MRD: [],
              pharmacy: [],
              pathology: [],
              OTCharge: [],
              OTgas: [],
              BedCharge:[],
              AnaesthetistCharge: [],
              equipmentAmount: [],
              Diet: [],
              blood: [],
              other: [],
              total: [],
              Admission: [],
              mrd: []
            };
            const  wardcodelist = new ObjectId(estimate.ward);
            
            const wardDetails = await getWardById(wardcodelist); 
            console.log(wardDetails ,"wardDetails");
            const wardCode = wardDetails?.code;
            console.log(wardCode ,"wardCode");
            const wardAccount : any = wardDetails?.name
            const wardAmount : any = wardDetails?.roomRent;
            wards
              .filter((ward: any) => ward.code === wardCode)
              .forEach(async (item: any) => { 
                
                let roomCharge: any = (wardAmount && estimate.wardDays) ? wardAmount * estimate.wardDays : 0;

            
                if (estimate.type === 1) {
                  let maxPrice = 0;
                  let minPrice = Infinity;
                  let serviceCount = 0;
                  let isSameSite = true;
            
                  services.forEach((service: Record<string, any>) => {
                    const charges = service.charges;
                    console.log(charges ,"chargescharges")
            
                    if (charges) {
                      const chargeObj = charges.find(
                        (c: Record<string, any>) => c.hasOwnProperty(wardCode ?? "")
                      );
                      console.log(chargeObj ,"chargeObj");
                      if (chargeObj && chargeObj.hasOwnProperty(wardCode ?? "")) {
                        const charge = chargeObj[wardCode ?? ""];

                       if (typeof charge === "number") {
                         serviceCount++;
             
                         if (charge > maxPrice) {
                           maxPrice = charge;
                         }

                         if (charge < minPrice) {
                           minPrice = charge;
                         }
                       }
                     }
                    }
      // Check if any service is not on the same site
                 if (service.service) {
                   service.service.forEach((s: Record<string, any>) => {
                     if (!s.isSameSite) {
                       isSameSite = false;
                     }
                   });
                 }
               });
    // Calculate the total service price
               let servicePrice = 0;

               services.forEach((service: Record<string, any>) => {
               const charges = service.charges;

              if (charges) {
              const chargeObj = charges.find(
               (c: Record<string, any>) => c.hasOwnProperty(item.code)
             );

            if (chargeObj && chargeObj.hasOwnProperty(item.code)) {
             const charge: number = chargeObj[item.code];

             if (typeof charge === "number") {
              servicePrice += charge;
              }
           }
         }
        });
           console.log(servicePrice ,"servicePrice");
    // Calculate the adjusted max and min prices if there is more than one service ID
    if (serviceCount > 1) {
      if (isSameSite) {
        maxPrice = maxPrice * Math.floor(0.35 + 0.7 + 0.1);
        minPrice =
          Math.floor(minPrice * 0.5) * Math.floor(0.35 + 0.7 + 0.1);
      } else {
        maxPrice = maxPrice * Math.floor(0.35 + 0.7 + 0.1);
        minPrice = minPrice * Math.floor(0.35 + 0.7 + 0.7);
      }

      // Add the adjusted max and min prices to the charges object
      servicePrice = maxPrice + minPrice;
    }

    // Surgeon fees, Anaesthesia fees, OT charges, OT gases, Total
    const surgeonFees = 0.3 * servicePrice || 0;
    console.log(surgeonFees, "surgeonFees");
    const anaesthesiaFees = 0.75 * servicePrice || 0;
    console.log(anaesthesiaFees, "anaesthesiaFees");
    const otCharges = 0.75 * servicePrice || 0;
    const OTgas = 0.20 * servicePrice || 0;

    // Push the calculated charges to their respective arrays
    charges.service.push(servicePrice);
    charges.BedCharge.push(roomCharge);
    charges.AnaesthetistCharge.push(anaesthesiaFees);
    charges.OTCharge.push(otCharges);
    charges.OTgas.push(OTgas);
    charges.Diet.push(estimate.Diet || 0);
    charges.Admission.push(estimate.Admission || 0);
    charges.equipmentAmount.push(estimate.equipmentAmount || 0);
    charges.pharmacy.push(estimate.pharmacy || 0);
    charges.pathology.push(estimate.pathology || 0);
    charges.mrd.push(estimate.mrd || 0);
    charges.total.push(
      servicePrice +
        (estimate.equipmentAmount || 0) +
        (estimate.Admission || 0) +
        (estimate.Diet || 0) +
        (estimate.mrd || 0) +
        (estimate.pharmacy || 0) +
        (estimate.pathology || 0) +
        surgeonFees +
        anaesthesiaFees +
        otCharges +
        OTgas
    );
  }else{
    let maxPrice = 0;
  let minPrice = Infinity;
  let serviceCount = 0;
  let isSameSite = true;

  services.forEach((service: Record<string, any>) => {
    const charges = service.charges;

    if (charges) {
      const chargeObj = charges.find(
        (c: Record<string, any>) => c.hasOwnProperty(wardCode ?? "")
      );

      if (chargeObj && chargeObj.hasOwnProperty(wardCode ?? "")) {
        const charge = chargeObj[wardCode ?? ""];

        if (typeof charge === "number") {
          serviceCount++;

          if (charge > maxPrice) {
            maxPrice = charge;
          }

          if (charge < minPrice) {
            minPrice = charge;
          }
        }
      }
    }
    // Check if any service is not on the same site
    if (service.service) {
      service.service.forEach((s: Record<string, any>) => {
        if (!s.isSameSite) {
          isSameSite = false;
        }
      });
    }
  });

  // Calculate the total service price
  let servicePrice = 0;

  services.forEach((service: Record<string, any>) => {
    const charges = service.charges;

    if (charges) {
      const chargeObj = charges.find(
        (c: Record<string, any>) => c.hasOwnProperty(item.code)
      );

      if (chargeObj && chargeObj.hasOwnProperty(item.code)) {
        const charge: number = chargeObj[item.code];

        if (typeof charge === "number") {
          servicePrice += charge;
        }
      }
    }
  });

  // Calculate the adjusted max and min prices if there is more than one service ID
  if (serviceCount > 1) {
    if (isSameSite) {
      maxPrice = maxPrice * Math.floor(0.35 + 0.7 + 0.1);
      minPrice =
        Math.floor(minPrice * 0.5) * Math.floor(0.35 + 0.7 + 0.1);
    } else {
      maxPrice = maxPrice * Math.floor(0.35 + 0.7 + 0.1);
      minPrice = minPrice * Math.floor(0.35 + 0.7 + 0.7);
    }

    // Add the adjusted max and min prices to the charges object
    servicePrice = maxPrice + minPrice;
  }
      charges.service.push(servicePrice);
      charges.service.push(servicePrice)
  }
});
            const doctorName = await findDoctorById(prescription!.doctor).then(
              (result) => {
                return result?.name;
              }
            );
            //departments nameconst departmentIds = prescription!.departments;
            const departmentPromises = prescription!.departments.map(
              (departmentId) => getDepartmentById(departmentId)
            );

            const departments = await Promise.all(departmentPromises);
            const departmentNames = departments.map((department) =>
              department?.name.toUpperCase()
            );
           
            const serviceFind = estimate.service[0];
            const id  = new ObjectId(serviceFind.id)
            const servicesss = await getServiceById(id);
            const serviceName = servicesss?.name;

            const document = new PDFDocument();
            let buffers: any = [];
            document.on("data", buffers.push.bind(buffers));
            //   hospital informationl,ojao
            if(estimate.type !== 1){
              document
              .fontSize(12)
              .font("Helvetica-Bold")
              .text("MEDIVERSAL MULTI SUPER SPECIALITY HOSPITAL", 50 , 25 , { align: "center" })
              .fontSize(12)
              .font("Helvetica-Bold")
              .text("(A Unit Of Mediversal Healthcare Pvt Ltd)", 50 , 38,{ align: "center" })
              .fontSize(10)
              .font("Helvetica")
              .text("Plot No. D/S-6, DOCTORS' COLONY, 90 FEET ROAD NEAR KANKARBAGH POLICE", 50  , 55 ,{ align: "center" })
              .fontSize(10)
              .font("Helvetica")
              .text("STATION, KANKARBAGH, PATNA - 800020", 50 ,67,{ align: "center" })
              // document.image('C:/Users/sk290/Downloads/Logo-Mediversal.png', 60, 67, { width: 80 })
              .fontSize(8)
              .font("Helvetica")
              .text("Phone No.: 06123500010", 50 , 80 , { align: "center" })
              .fontSize(8)
              .font("Helvetica")
              .text("Email: info@mediversal.in", 50 , 92 ,{ align: "center" })
              .fontSize(8)
              .font("Helvetica")
              .text("GSTIN No.: 10AAICM3529R1Z6", 50 ,104 , { align: "center" })
              .fontSize(12)
              .font("Helvetica-Bold")
              .text("Patient Bill Estimation", 50 , 118 , { align: "center", underline: true })
              .moveDown();
            
              document
              .moveDown()
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(46, 135)
              .lineTo(555, 135)
              .lineTo(555, 185)
              .lineTo(46, 185)
              .lineTo(46, 135)
              .stroke();
            
            document
              .fontSize(10)
              .font("Helvetica")
              .text(`S.NO: ${consumer?.uid + "-" + Date.now()}`, 52, 145)
              .text(`Estimate Date: ${new Date().toDateString()}`, 52, 158)
              .text(`Name: ${consumer?.firstName + " "}`, 250, 145)
              .text(`Phone: ${consumer?.phone}`, 250, 158)
              .text(`UHID: ${consumer?.uid}`, 410, 145)
              .text(`Doctor: ${doctorName?.toUpperCase()}`, 410, 158)
              .text(`Specialty: ${departmentNames}`, 410, 171)
              .moveDown();
            
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(46, 185)
              .lineTo(555, 185)
              .stroke();

              
          document
          .strokeColor("#aaaaaa")
          .lineWidth(1)
          .moveTo(80, 195)
          .lineTo(480, 195)
          .lineTo(480, 600)  // Connect to the next corner
          .lineTo(80, 600)   // Complete the box
          .lineTo(80, 195)   // Connect back to the starting point
          .stroke();
          
          document
            .fontSize(10)
            .font("Helvetica-Bold")
            .text("Sr. No.", 125, 205)
            .text("Services Name", 225, 205)
            .text("Estimation Amount", 360, 205);

            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 215)
              .lineTo(480, 215)
              .stroke();

             //surgery particulars
            document
              .fontSize(10)
              .font("Helvetica")
              .text("1", 125, 225 )
              document
              .fontSize(10)
              .font("Helvetica")
              .text(`${serviceName}`, 220, 225 )
              document
              .font("Helvetica-Bold")
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 240)
              .lineTo(480, 240)
              .stroke()
              .text("Total Estimation ", 245, 265);

              document
              .fontSize(10)
              .font("Helvetica")
              .text(`${charges.service}`, 360, 225 )

              document
              .font("Helvetica-Bold")
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 240)
              .lineTo(480, 240)
              .stroke()
              .text( `${charges.total}`, 360, 265);

              // this is page down 
              document
              .fontSize(10)
              .font("Helvetica")
              .text("Pathology Test Cost: Extra as per Actual", 55, 280, { align: "left" })  // Adjusted position
              .text("Medicine & Consumable: Extra as per Actual", 55, 295, { align: "left" })  // Adjusted position
              .text("Any Diagnostic / Investigations: Extra as per Actual ", 55, 310, { align: "left" })  // Adjusted position
              .text("Required Blood Units............", 55, 325, { align: "left" })  // Adjusted position
              .text("ICU/CCU stay Rs. 7,500/- Per Day", 280, 280, { align: "right" }) 
              .text("Private room stay Rs. 6,000/- Per Day", 280, 295, { align: "right" }) 
              .text("Step down ICU/HDUstay Rs. 6,000/- Per Day", 280, 310, { align: "right" }) 
              .text("Semi Pvt. Room stay Rs. 4,000/- Per Day", 280, 325, { align: "right" }) 
              .text("Multi Bed stay Rs. 2,500/- Per Day", 280, 340, { align: "right" })
              .text("Suite Room stay Rs. 9,900/- Per Day", 280, 355, { align: "right" });

              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(46, 370)
              .lineTo(555, 370)
              .stroke();
            // this is after line 

            document
             .fontSize(10)
             .font("Helvetica")
             .text("\u2022 Doctor Consultancy is extra on actual", 55, 390, { align: "left" })
             .text("\u2022 All implants/Stoking/Stent/Patch will be charged extra.", 55, 405, { align: "left" })
             .text("\u2022 Over and above stay will be charged extra.", 55, 420, { align: "left" })
             .text("\u2022 Any additional procedure performed will be charged extra on actual.", 55, 435, { align: "left" })
             .text("\u2022 Any special investigation done as per the patient medical condition will be charged extra", 55, 450, { align: "left" })
             .text("\u2022 Blood Processing Charges-(if any)additional blood consumptions will be charged on actual", 55, 465, { align: "left" })
             .text("\u2022 Physiotherapy Charges(if any)Extra", 55, 480, { align: "left" })
             .text("\u2022 Emergency Charges and High Risk Charges will be additional for any surgery or any package surgery", 55, 495, { align: "left" })
             .text("\u2022 Estimate may change if any other un-forseen medical complications arise during the stay.Cost estimate is for the specified bed category", 55, 510, { align: "left" })
             .text("\u2022 After admission, if a higher bed category is opted, the charges will be as per higher bill category.", 55, 525, { align: "left" })
             .text("\u2022 Hospital Reg. Cost, MRD Cost will be charged extra.", 55, 540, { align: "left" })
             .text("\u2022 There may be a cost variation of 10% to 15% in the final bill.", 55, 555, { align: "left" });
             
             document
             .strokeColor("#aaaaaa")
             .lineWidth(1)
             .moveTo(46, 570)
             .lineTo(555, 570)
             .stroke();

             document
             .fontSize(12)
             .font("Helvetica-Bold")
             .text("Term & Conditions:", 55, 590, { align: "left" , underline: true})
             .fontSize(10)
             .font("Helvetica")
             .text("The above amount is purely an estimate.The actual bill may vary based on the clinical condition of the patient and course of treatment", 55, 605, { align: "left" })
             .fontSize(10)
             .font("Helvetica")
             .text("ESTIMATION IS VALID FOR 30 DAYS FROM DATE OF ISSUE.", 55, 620, { align: "left" })

              //this is sis 
            }
            document
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("MEDIVERSAL MULTI SUPER SPECIALITY HOSPITAL", 50 , 25 , { align: "center" })
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("(A Unit Of Mediversal Healthcare Pvt Ltd)", 50 , 38,{ align: "center" })
            .fontSize(10)
            .font("Helvetica")
            .text("Plot No. D/S-6, DOCTORS' COLONY, 90 FEET ROAD NEAR KANKARBAGH POLICE", 50  , 55 ,{ align: "center" })
            .fontSize(10)
            .font("Helvetica")
            .text("STATION, KANKARBAGH, PATNA - 800020", 50 ,67,{ align: "center" })
            // document.image('C:/Users/sk290/Downloads/Logo-Mediversal.png', 60, 67, { width: 80 })
            .fontSize(8)
            .font("Helvetica")
            .text("Phone No.: 06123500010", 50 , 80 , { align: "center" })
            .fontSize(8)
            .font("Helvetica")
            .text("Email: info@mediversal.in", 50 , 92 ,{ align: "center" })
            .fontSize(8)
            .font("Helvetica")
            .text("GSTIN No.: 10AAICM3529R1Z6", 50 ,104 , { align: "center" })
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("Patient Bill Estimation", 50 , 118 , { align: "center", underline: true })
            .moveDown();
          
            document
            .moveDown()
            .strokeColor("#aaaaaa")
            .lineWidth(1)
            .moveTo(46, 135)
            .lineTo(555, 135)
            .lineTo(555, 185)
            .lineTo(46, 185)
            .lineTo(46, 135)
            .stroke();
          
          document
            .fontSize(10)
            .font("Helvetica")
            .text(`S.NO: ${consumer?.uid + "-" + Date.now()}`, 52, 145)
            .text(`Estimate Date: ${new Date().toDateString()}`, 52, 158)
            .text(`Name: ${consumer?.firstName + " "}`, 250, 145)
            .text(`Phone: ${consumer?.phone}`, 250, 158)
            .text(`UHID: ${consumer?.uid}`, 410, 145)
            .text(`Doctor: ${doctorName?.toUpperCase()}`, 410, 158)
            .text(`Specialty: ${departmentNames}`, 410, 171)
            .moveDown();
          
          document
            .strokeColor("#aaaaaa")
            .lineWidth(1)
            .moveTo(46, 185)
            .lineTo(555, 185)
            .stroke();
          
          // document
          //   .fontSize(10)
          //   .font("Helvetica-Bold")
          //   .text(
          //     `Payment Type: ${
          //       estimate.paymentType === 0
          //         ? "Cash"
          //         : estimate.paymentType === 1
          //         ? "Insurance"
          //         : "CGHS"
          //     }`,
          //     50,
          //     290
          //   )
          //   .text(
          //     `Insurance: ${
          //       estimate.paymentType === 1 ? estimate.insuranceCompany : ""
          //     }`,
          //     50,
          //     305
          //   )
          //   .text(
          //     `Reason for ADM: ${
          //       estimate.type === 0 ? "Packaged" : "Surgery"
          //     }`,
          //     400,
          //     290
          //   )
          //   .text(
          //     `Est LOS: ${
          //       estimate.type === 1
          //         ? estimate.wardDays + estimate.icuDays
          //         : ""
          //     }`,
          //     400,
          //     305
          //   )
          //   .text(
          //     `Policy Amount: ${
          //       estimate.paymentType === 1
          //         ? estimate.insurancePolicyNumber
          //         : ""
          //     }`,
          //     400,
          //     320);

          document
          .strokeColor("#aaaaaa")
          .lineWidth(1)
          .moveTo(80, 195)
          .lineTo(480, 195)
          .lineTo(480, 600)  // Connect to the next corner
          .lineTo(80, 600)   // Complete the box
          .lineTo(80, 195)   // Connect back to the starting point
          .stroke();
          
          document
            .fontSize(10)
            .font("Helvetica-Bold")
            .text("Sr. No.", 125, 205)
            .text("Services Name", 225, 205)
            .text("Estimation Amount", 360, 205);

            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 215)
              .lineTo(480, 215)
              .stroke();

             //surgery particulars
            document
              .fontSize(10)
              .font("Helvetica")
              .text("1", 125, 225 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 240)
              .lineTo(480, 240)
              .stroke()
              .text("2", 125, 255 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 270)
              .lineTo(480, 270)
              .stroke()
              .text("3", 125, 285 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 300)
              .lineTo(480, 300)
              .stroke()
              .text("4", 125, 315 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 330)
              .lineTo(480, 330)
              .stroke()
              .text("5", 125, 345 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 360)
              .lineTo(480, 360)
              .stroke()
              .text("6", 125, 375)
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 390)
              .lineTo(480, 390)
              .stroke()
              .text("7", 125, 405 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 420)
              .lineTo(480, 420)
              .stroke()
              .text("8", 125, 435 );
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 450)
              .lineTo(480, 450)
              .stroke()
              .text("9", 125, 465 );
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 480)
              .lineTo(480, 480)
              .stroke()
              .text("10", 125, 495);
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 510)
              .lineTo(480, 510)
              .stroke()
              .text("11", 125, 525);
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 540)
              .lineTo(480, 540)
              .stroke()
              .text("12", 125, 555);
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 570)
              .lineTo(480, 570)
              .stroke()
              .text("", 125, 585);

            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 600)
              .lineTo(480, 600)
              .stroke();
            
           // now service  

           document
              .fontSize(10)
              .font("Helvetica")
              .text(`${serviceName}`, 220, 225 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 240)
              .lineTo(480, 240)
              .stroke()
              .text("Anaesthetist Charge ", 220, 255 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 270)
              .lineTo(480, 270)
              .stroke()
              .text("OT Charge", 220, 285 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 300)
              .lineTo(480, 300)
              .stroke()
              .text("Gas Charge", 220, 315 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 330)
              .lineTo(480, 330)
              .stroke()
              .text("OT CHARGE NEURO", 220, 345 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 360)
              .lineTo(480, 360)
              .stroke()
              .text("Bed charges", 220, 375)
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 390)
              .lineTo(480, 390)
              .stroke()
              .text("Consultation", 220, 405 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 420)
              .lineTo(480, 420)
              .stroke()
              .text("pharmacy", 220, 435 );
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 450)
              .lineTo(480, 450)
              .stroke()
              .text("pathology", 220, 465 );
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 480)
              .lineTo(480, 480)
              .stroke()
              .text("Admission", 220, 495);
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 510)
              .lineTo(480, 510)
              .stroke()
              .text("MRD", 220, 525);
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 540)
              .lineTo(480, 540)
              .stroke()
              .text("Diet", 220, 555);
              document
              .font("Helvetica-Bold")
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 570)
              .lineTo(480, 570)
              .stroke()
              .text("Total Estimation ", 245, 585);

              // now amount 
              document
              .fontSize(10)
              .font("Helvetica")
              .text(`${charges.service}`, 360, 225 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 240)
              .lineTo(480, 240)
              .stroke()
              .text(`${charges.AnaesthetistCharge}`, 360, 255 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 270)
              .lineTo(480, 270)
              .stroke()
              .text(`${charges.OTCharge}`, 360, 285 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 300)
              .lineTo(480, 300)
              .stroke()
              .text(`${charges.OTgas}`, 360, 315 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 330)
              .lineTo(480, 330)
              .stroke()
              .text( `${0}`, 360, 345 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 360)
              .lineTo(480, 360)
              .stroke()
              .text(`${charges.BedCharge}`, 360, 375)
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 390)
              .lineTo(480, 390)
              .stroke()
              .text(`${0}`, 360, 405 )
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 420)
              .lineTo(480, 420)
              .stroke()
              .text(`${charges.pharmacy}`, 360, 435 );
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 450)
              .lineTo(480, 450)
              .stroke()
              .text(`${charges.pathology}`, 360, 465 );
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 480)
              .lineTo(480, 480)
              .stroke()
              .text(`${charges.Admission}`, 360, 495);
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 510)
              .lineTo(480, 510)
              .stroke()
              .text(`${charges.mrd}`, 360, 525);
              document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 540)
              .lineTo(480, 540)
              .stroke()
              .text(`${charges.Diet}`, 360, 555);
              document
              .font("Helvetica-Bold")
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(80, 570)
              .lineTo(480, 570)
              .stroke()
              .text( `${charges.total}`, 360, 585);

              // for text 

              document
              .fontSize(10)
              .font("Helvetica")
              .text("Pathology Test Cost: Extra as per Actual", 55, 620, { align: "left" })  // Adjusted position
              .text("Medicine & Consumable: Extra as per Actual", 55, 635, { align: "left" })  // Adjusted position
              .text("Any Diagnostic / Investigations: Extra as per Actual ", 55, 650, { align: "left" })  // Adjusted position
              .text("Required Blood Units............", 55, 665, { align: "left" })  // Adjusted position
              .text("ICU/CCU stay Rs. 7,500/- Per Day", 280, 620, { align: "right" }) 
              .text("Private room stay Rs. 6,000/- Per Day", 280, 635, { align: "right" }) 
              .text("Step down ICU/HDUstay Rs. 6,000/- Per Day", 280, 650, { align: "right" }) 
              .text("Semi Pvt. Room stay Rs. 4,000/- Per Day", 280, 665, { align: "right" }) 
              .text("Multi Bed stay Rs. 2,500/- Per Day", 280, 680, { align: "right" })
              .text("Suite Room stay Rs. 9,900/- Per Day", 280, 695, { align: "right" });

              document
             .fillColor("#aaaaaa")  // Use fill color
             .rect(46, 720, 509, 2)  // Draw a filled rectangle to simulate a bold line
             .fill(); 

             // // addin gnew page 
             document.addPage();

             // for intense
             document
             .fontSize(10)
             .font("Helvetica")
             .text("\u2022 Doctor Consultancy is extra on actual", 55, 50, { align: "left" })
             .text("\u2022 All implants/Stoking/Stent/Patch will be charged extra.", 55, 65, { align: "left" })
             .text("\u2022 Over and above stay will be charged extra.", 55, 80, { align: "left" })
             .text("\u2022 Any additional procedure performed will be charged extra on actual.", 55, 95, { align: "left" })
             .text("\u2022 Any special investigation done as per the patient medical condition will be charged extra", 55, 110, { align: "left" })
             .text("\u2022 Blood Processing Charges-(if any)additional blood consumptions will be charged on actual", 55, 125, { align: "left" })
             .text("\u2022 Physiotherapy Charges(if any)Extra", 55, 140, { align: "left" })
             .text("\u2022 Emergency Charges and High Risk Charges will be additional for any surgery or any package surgery", 55, 155, { align: "left" })
             .text("\u2022 Estimate may change if any other un-forseen medical complications arise during the stay.Cost estimate is for the specified bed category", 55, 170, { align: "left" })
             .text("\u2022 After admission, if a higher bed category is opted, the charges will be as per higher bill category.", 55, 200, { align: "left" })
             .text("\u2022 Hospital Reg. Cost, MRD Cost will be charged extra.", 55, 215, { align: "left" })
             .text("\u2022 There may be a cost variation of 10% to 15% in the final bill.", 55, 230, { align: "left" });

             document
             .strokeColor("#aaaaaa")
             .lineWidth(1)
             .moveTo(46, 250)
             .lineTo(555, 250)
             .stroke();

             document
             .fontSize(12)
             .font("Helvetica-Bold")
             .text("Term & Conditions:", 55, 270, { align: "left" , underline: true})
             .fontSize(10)
             .font("Helvetica")
             .text("The above amount is purely an estimate.The actual bill may vary based on the clinical condition of the patient and course of treatment", 55, 285, { align: "left" })
             .fontSize(10)
             .font("Helvetica")
             .text("ESTIMATION IS VALID FOR 30 DAYS FROM DATE OF ISSUE.", 55, 310, { align: "left" })
       

             document
             .moveDown()
             .strokeColor("#aaaaaa")
             .lineWidth(1)
             .moveTo(46, 325)
             .lineTo(555, 325)
             .lineTo(555, 395)
             .lineTo(46, 395)
             .lineTo(46, 325)
             .stroke();
           
           document
             .fontSize(10)
             .font("Helvetica")
             .text(`S.NO: ${consumer?.uid + "-" + Date.now()}`, 52, 345)
             .text(`Estimate Date: ${new Date().toDateString()}`, 52, 360)
             .text(`Name: ${consumer?.firstName + " "}`, 250, 345)
             .text(`Phone: ${consumer?.phone}`, 250, 360)
             .text(`UHID: ${consumer?.uid}`, 410, 345)
             .text(`Doctor: ${doctorName?.toUpperCase()}`, 410, 360)
             .text(`Specialty: ${departmentNames}`, 410, 375)
             .moveDown();
           
           document
             .strokeColor("#aaaaaa")
             .lineWidth(1)
             .moveTo(46, 395)
             .lineTo(555, 395)
             .stroke();

             // footer
             document
              .fontSize(12)
              .font("Helvetica-Bold")
              .text("Name of GRE/Co-ordinator", 55, 410, { align: "left" }) 
              .font("Helvetica")  // Adjusted position
              .text("Signature of GRE / Co-ordinator", 55, 430, { align: "left" })
              .font("Helvetica-Bold") // Adjusted position
              .text("Patient/Patient`s Relative Signature", 280, 410, { align: "right" }) 
              .font("Helvetica")
              .fontSize(10)  
              .text("Name of the relative", 350, 425)
              .font("Helvetica")
              .fontSize(10)  
              .text("Relation with Patient", 350, 440) 
              .font("Helvetica")
              .fontSize(10) 
              .text("Contact No.", 350, 455);
          // for Petient information 

          //   //room particulars
          //   // document
          //   //   .fontSize(10)
          //   //   .text("Room", 50, 260)
          //   //   .text(${charges.room[3]}, 200, 260)
          //   //   .text(${charges.room[1]}, 284, 260)
          //   //   .text(${charges.room[0]}, 368, 260)
          //   //   // .text(${charges.room[3]}, 450, 260)
          //   //   // .text(${charges.room[4]}, 450, 260)
          //   //   .text(${charges.room[7]}, 450, 260)
          //   //   .text(${charges.room[6]}, 0, 260, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 255)
          //     .lineTo(550, 255)
          //     .stroke();

          //   // investigation
          //   // document
          //   //   .fontSize(10)
          //   //   .text("Investigation", 50, 280)
          //   //   .text(${charges.investigation[0]}, 200, 280)
          //   //   .text(${charges.investigation[1]}, 284, 280)
          //   //   .text(${charges.investigation[2]}, 368, 280)
          //   //   .text(${charges.investigation[3]}, 450, 280)
          //   //   .text(${charges.investigation[4]}, 0, 280, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 275)
          //     .lineTo(550, 275)
          //     .stroke();

          //   // procedure
          //   document
          //     .fontSize(10)
          //     .text("Services Name", 50, 300)
          //   //   .text(${charges.procedure[0]}, 200, 300)
          //   //   .text(${charges.procedure[1]}, 284, 300)
          //   //   .text(${charges.procedure[2]}, 368, 300)
          //   //   .text(${charges.procedure[3]}, 450, 300)
          //      .text(${charges.mrd}, 0, 300, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 295)
          //     .lineTo(550, 295)
          //     .stroke();

          //   // medicines
          //   // document
          //   //   .fontSize(10)
          //   //   .text("Medicines", 50, 320)
          //   //   .text(${charges.medicines[0]}, 200, 320)
          //   //   .text(${charges.medicines[1]}, 284, 320)
          //   //   .text(${charges.medicines[2]}, 368, 320)
          //   //   .text(${charges.medicines[3]}, 450, 320)
          //   //   .text(${charges.medicines[4]}, 0, 320, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 315)
          //     .lineTo(550, 315)
          //     .stroke();

          //   // equipment
          //   // document
          //   //   .fontSize(10)
          //   //   .text("Equipment", 50, 340)
          //   //   .text(${charges.equipment[0]}, 200, 340)
          //   //   .text(${charges.equipment[1]}, 284, 340)
          //   //   .text(${charges.equipment[2]}, 368, 340)
          //   //   .text(${charges.equipment[3]}, 450, 340)
          //   //   .text(${charges.equipment[4]}, 0, 340, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 335)
          //     .lineTo(550, 335)
          //     .stroke();

          //   // equipment
          //   // document
          //   //   .fontSize(10)
          //   //   .text("Blood", 50, 360)
          //   //   .text(${charges.blood[0]}, 200, 360)
          //   //   .text(${charges.blood[1]}, 284, 360)
          //   //   .text(${charges.blood[2]}, 368, 360)
          //   //   .text(${charges.blood[3]}, 450, 360)
          //   //   .text(${charges.blood[4]}, 0, 360, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 355)
          //     .lineTo(550, 355)
          //     .stroke();

          //   //blood
          //   // document
          //   //   .fontSize(10)
          //   //   .text("Other Charges", 50, 380)
          //   //   .text(${charges.other[0]}, 200, 380)
          //   //   .text(${charges.other[1]}, 284, 380)
          //   //   .text(${charges.other[2]}, 368, 380)
          //   //   .text(${charges.other[3]}, 450, 380)
          //   //   .text(${charges.other[4]}, 0, 380, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 375)
          //     .lineTo(550, 375)
          //     .stroke();

          //   //total
          //   document
          //     .fontSize(10)
          //     .text("Total", 50, 420)
          //     // .text(${charges.total[0]}, 200, 420)
          //     // .text(${charges.total[1]}, 284, 420)
          //     // .text(${charges.total[2]}, 368, 420)
          //     // .text(${charges.total[3]}, 450, 420)
          //     .text(${charges.total[6]}, 0, 420, { align: "right" });
          //   document
          //     .strokeColor("#aaaaaa")
          //     .lineWidth(1)
          //     .moveTo(50, 410)
          //     .lineTo(550, 410)
          //     .stroke();
            document.end();
           document.on("end", async () => {
             const file = {
               originalname: "estimate",
               buffer: Buffer.concat(buffers),
               mimetype: "application/pdf",
             };
             console.log(file , " this is file of estimate ")
             const { Location } = await putMedia(
               file,
              ` patients/${consumer!._id}/${estimate.ticket}/estimates`,
               BUCKET_NAME
             );
             const uploadedPDFUrl = Location;
            //  console.log(uploadedPDFUrl , " thisnskosmc")
             await estimateTemplateMessage(
               consumer!.phone,
               "patient_estimate",
               "en",
               uploadedPDFUrl
             );
            //  console.log(uploadedPDFUrl, " this is what is was founding 2 ");
             // await updateTicketLocation(estimate.ticket ,uploadedPDFUrl , session );
             const { ticket } = await findConsumerFromWAID(consumer!.phone);
            //  console.log(ticket , "hello this is before ticket");
             saveMessage(ticket.toString(), {
               consumer: consumer!._id.toString(),
               messageType: "file",
               sender: consumer!._id.toString(),
               ticket: ticket.toString(),
               type: "sent",
             });
            //  console.log("hello this is after ticket");

             await updateEstimateTotal(estimateId, charges.total[0], session);
             await updateTicketLocation(
               estimate.ticket,
               uploadedPDFUrl,
               session
             );
           });
          }
        );
      });
  });
};

export default generateEstimate;