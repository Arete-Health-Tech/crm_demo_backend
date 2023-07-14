import { ClientSession, ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import ErrorHandler from "../../../utils/errorHandler";
import { findConsumerById } from "../../consumer/functions";
import {
  findDoctorById,
  getAllDepartments,
  getAllWards,
  getDepartmentById,
} from "../../department/functions";
import { findPrescriptionById, findServices, findTicketById } from "../crud";
import { findEstimateById, updateEstimateTotal } from "../functions";
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
      servicesArray.push(item.id);
    });
    if (estimate.investigation) {
      estimate.investigation.forEach((item) =>
        investigationArray.push(item.id)
      );
    }
    if (estimate.procedure) {
      estimate.procedure.forEach((item) => procedureArray.push(item.id));
    }
    findTicketById(estimate!.ticket)
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
        ]).then(
          async ([
            prescription,
            consumer,
            wards,
            services,
            investigations,
            procedures,
          ]) => {
            const charges = {
              service: <number[]>[],
              room: <number[]>[],
              investigation: <number[]>[],
              procedure: <number[]>[],
              medicines: <number[]>[],
              equipment: <number[]>[],
              blood: <number[]>[],
              other: <number[]>[],
              total: <number[]>[],
            };
            // console.log(prescription);

            // findDoctorById(prescription!.doctor).then((result) => {
            //   console.log(result?.name);
            //   return result?.name;
            // }),

            wards
              .filter((ward: any) => ward.type === 0)
              .forEach((item: any) => {
                const icu = wards.find(
                  (ward: any) =>
                    ward.type === 1 &&
                    ward._id?.toString() === estimate.icuType.toString()
                );

                let roomCharge = 0;

                if (
                  icu &&
                  estimate.type === 1 &&
                  icu.charges[1].roomRent > 0 &&
                  estimate.icuDays > 0
                ) {
                  roomCharge += icu.charges[1].roomRent * estimate.icuDays;
                  // console.log(roomCharge , "this is icu")
                }
                if (item.charges) {
                  roomCharge += item.charges[0].roomRent * estimate.wardDays;
                  console.log(roomCharge, " this ward roomCharge");
                }

                charges.room.push(roomCharge);
                // console.log(charges.room , " this is Room charge s"); // this should now output the room charges array

                if (estimate.type === 1) {
                  let maxPrice = 0;
                  let minPrice = Infinity;
                  let serviceCount = 0;
                  let isSameSite = true;

                  services.forEach((service: Record<string, any>) => {
                    const charges = service.charges;
                    console.log(service, " this is service ");
                    if (charges) {
                      const chargeObj = charges.find((c: Record<string, any>) =>
                        c.hasOwnProperty(item.code)
                      );
                      if (chargeObj && chargeObj.hasOwnProperty(item.code)) {
                        const charge = chargeObj[item.code];
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
                      const chargeObj = charges.find((c: Record<string, any>) =>
                        c.hasOwnProperty(item.code)
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
                      // console.log(maxPrice , " maxprice this price is before the claculation")
                      maxPrice = maxPrice * Math.floor(0.35 + 0.7 + 0.1);
                      // console.log(maxPrice , " max price this price is after the claculation")
                      // console.log(minPrice, "minmum this price is before the claculation")
                      minPrice =
                        Math.floor(minPrice * 0.5) *
                        Math.floor(0.35 + 0.7 + 0.1);
                      // console.log(minPrice, "minimum this price is after the claculation")
                    } else {
                      maxPrice = maxPrice * Math.floor(0.35 + 0.7 + 0.1);
                      minPrice = minPrice * Math.floor(0.35 + 0.7 + 0.7);
                    }
                    // Add the adjusted max and min prices to the charges object
                    servicePrice = maxPrice + minPrice;
                    //  console.log(servicePrice , " this is after the serviceCount");
                  }

                  // Push the total service price to the charges.service array
                  // charges.service.push(servicePrice);

                  // console.log('Total service price:', servicePrice);
                  if (serviceCount > 1) {
                    // console.log('Adjusted maximum service price:', maxPrice);
                    // console.log('Adjusted minimum service price:', minPrice);
                  }
                  // console.log('Updated charges:', charges);
                  let investigationPrice = estimate.investigationAmount || 0;
                  investigations.forEach(
                    (investigation: Record<string, any>) => {
                      let charge: number = investigation[item.code];
                      investigationPrice += charge;
                    }
                  );
                  let procedurePrice = estimate.procedureAmount || 0;
                  procedures.forEach((procedure: Record<string, any>) => {
                    let charge: number = procedure[item.code];
                    procedurePrice += charge;
                  });

                  charges.service.push(servicePrice);
                  charges.investigation.push(investigationPrice);
                  charges.procedure.push(procedurePrice);
                  charges.medicines.push(
                    estimate.medicineAmount ? estimate.medicineAmount : 0
                  );
                  charges.equipment.push(
                    estimate.equipmentAmount ? estimate.equipmentAmount : 0
                  );
                  charges.blood.push(
                    estimate.bloodAmount ? estimate.bloodAmount : 0
                  );
                  charges.other.push(
                    estimate.additionalAmount ? estimate.additionalAmount : 0
                  );
                  charges.total.push(
                    servicePrice +
                      roomCharge +
                      investigationPrice +
                      procedurePrice +
                      (estimate.medicineAmount ? estimate.medicineAmount : 0) +
                      (estimate.bloodAmount ? estimate.bloodAmount : 0) +
                      (estimate.equipmentAmount
                        ? estimate.equipmentAmount
                        : 0) +
                      (estimate.additionalAmount
                        ? estimate.additionalAmount
                        : 0)
                  );
                  //console.log(charges.total , " totalalalaalazaaz")
                  // console.log(charges.service[0] , "above");
                }
              });
            // console.log(charges.service[0] , "below")
            // console.log(charges.service[1] , "below")

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

            console.log(departmentNames);

            const document = new PDFDocument();
            let buffers: any = [];
            document.on("data", buffers.push.bind(buffers));
            //   hospital informationl,ojao
            document
              .fontSize(10)
              .text("Paras Healthcare", 200, 50, { align: "right" })
              .text("123 Main Street", 200, 65, { align: "right" })
              .text("New Delhi, India", 200, 80, { align: "right" })
              .text("ESTIMATE", 50, 80, { align: "left" })
              .moveDown();
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 90)
              .lineTo(550, 90)
              .stroke();
            document
              .fontSize(10)
              .text(`S.NO: ${consumer?.uid + "-" + Date.now()}`, 50, 100)
              .font("Helvetica-Bold")
              .font("Helvetica")
              .text(`Estimate Date : ${new Date().toDateString()}`, 50, 115)
              .font("Helvetica-Bold")
              .text(`Name: ${consumer?.firstName + " "}`, 250, 100)
              .font("Helvetica")
              .text(`Phone: ${consumer?.phone}`, 250, 115)
              // .text(
              //   `Address: ${consumer?.address} ${consumer?.address.city} ${consumer?.address.state} ${consumer?.address.postalCode}`,
              //   250,
              //   130
              // )
              .text(`UHID: ${consumer?.uid}`, 400, 98)
              .text(`Doctor: ${doctorName?.toUpperCase()}`, 400, 113)
              .text("Specialty: " + `${departmentNames}`, 400, 128)
              .moveDown();
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 140)
              .lineTo(550, 140)
              .stroke();
            document
              .fontSize(10)
              .font("Helvetica")
              .text(
                `Payment Type: ${
                  estimate.paymentType === 0
                    ? "Cash"
                    : estimate.paymentType === 1
                    ? "Insurance"
                    : "CGHS"
                }`,
                50,
                150
              )
              .text(
                `Insurance: ${
                  estimate.paymentType === 1 ? estimate.insuranceCompany : ""
                }`,
                50,
                165
              )
              // .text(`Name of Surgery/Package: ${services[0].name}`, 50, 180)
              .text(
                `Reason for ADM: ${
                  estimate.type === 0 ? "Packaged" : "Surgery"
                }`,
                400,
                150
              )
              .text(
                `Est LOS: ${
                  estimate.type === 1
                    ? estimate.wardDays + estimate.icuDays
                    : ""
                }`,
                400,
                165
              )
              .text(
                `Policy Amount: ${
                  estimate.paymentType === 1
                    ? estimate.insurancePolicyNumber
                    : ""
                }`,
                400,
                180
              );

            document
              .fontSize(10)
              .text("Particulars", 50, 220)
              .text("Four Sharing", 200, 220)
              .text("Twin Sharing", 284, 220)
              .text("Single Sharing", 368, 220)
              .text("Deluxe", 450, 220)
              .text("VIP", 0, 220, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 215)
              .lineTo(550, 215)
              .stroke();
            //surgery particulars
            document
              .fontSize(10)
              .text("Surgery / Packages", 50, 240)
              .text(`${charges.service[0]}`, 200, 240)
              .text(`${charges.service[1]}`, 284, 240)
              .text(`${charges.service[2]}`, 368, 240)
              .text(`${charges.service[3]}`, 450, 240)
              .text(`${charges.service[4]}`, 450, 240)
              .text(`${charges.service[9]}`, 450, 240)
              .text(`${charges.service[6]}`, 450, 240)
              .text(`${charges.service[7]}`, 0, 240, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 235)
              .lineTo(550, 235)
              .stroke();
            //room particulars
            document
              .fontSize(10)
              .text("Room", 50, 260)
              .text(`${charges.room[0]}`, 200, 260)
              .text(`${charges.room[1]}`, 284, 260)
              .text(`${charges.room[2]}`, 368, 260)
              .text(`${charges.room[3]}`, 450, 260)
              .text(`${charges.room[4]}`, 450, 260)
              .text(`${charges.room[6]}`, 450, 260)
              .text(`${charges.room[7]}`, 0, 260, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 255)
              .lineTo(550, 255)
              .stroke();

            // investigation
            document
              .fontSize(10)
              .text("Investigation", 50, 280)
              .text(`${charges.investigation[0]}`, 200, 280)
              .text(`${charges.investigation[1]}`, 284, 280)
              .text(`${charges.investigation[2]}`, 368, 280)
              .text(`${charges.investigation[3]}`, 450, 280)
              .text(`${charges.investigation[4]}`, 0, 280, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 275)
              .lineTo(550, 275)
              .stroke();

            // procedure
            document
              .fontSize(10)
              .text("Procedure", 50, 300)
              .text(`${charges.procedure[0]}`, 200, 300)
              .text(`${charges.procedure[1]}`, 284, 300)
              .text(`${charges.procedure[2]}`, 368, 300)
              .text(`${charges.procedure[3]}`, 450, 300)
              .text(`${charges.procedure[4]}`, 0, 300, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 295)
              .lineTo(550, 295)
              .stroke();

            // medicines
            document
              .fontSize(10)
              .text("Medicines", 50, 320)
              .text(`${charges.medicines[0]}`, 200, 320)
              .text(`${charges.medicines[1]}`, 284, 320)
              .text(`${charges.medicines[2]}`, 368, 320)
              .text(`${charges.medicines[3]}`, 450, 320)
              .text(`${charges.medicines[4]}`, 0, 320, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 315)
              .lineTo(550, 315)
              .stroke();

            // equipment
            document
              .fontSize(10)
              .text("Equipment", 50, 340)
              .text(`${charges.equipment[0]}`, 200, 340)
              .text(`${charges.equipment[1]}`, 284, 340)
              .text(`${charges.equipment[2]}`, 368, 340)
              .text(`${charges.equipment[3]}`, 450, 340)
              .text(`${charges.equipment[4]}`, 0, 340, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 335)
              .lineTo(550, 335)
              .stroke();

            // equipment
            document
              .fontSize(10)
              .text("Blood", 50, 360)
              .text(`${charges.blood[0]}`, 200, 360)
              .text(`${charges.blood[1]}`, 284, 360)
              .text(`${charges.blood[2]}`, 368, 360)
              .text(`${charges.blood[3]}`, 450, 360)
              .text(`${charges.blood[4]}`, 0, 360, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 355)
              .lineTo(550, 355)
              .stroke();

            //blood
            document
              .fontSize(10)
              .text("Other Charges", 50, 380)
              .text(`${charges.other[0]}`, 200, 380)
              .text(`${charges.other[1]}`, 284, 380)
              .text(`${charges.other[2]}`, 368, 380)
              .text(`${charges.other[3]}`, 450, 380)
              .text(`${charges.other[4]}`, 0, 380, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 375)
              .lineTo(550, 375)
              .stroke();

            //total
            document
              .fontSize(10)
              .text("Total", 50, 420)
              .text(`${charges.total[0]}`, 200, 420)
              .text(`${charges.total[1]}`, 284, 420)
              .text(`${charges.total[2]}`, 368, 420)
              .text(`${charges.total[3]}`, 450, 420)
              .text(`${charges.total[6]}`, 0, 420, { align: "right" });
            document
              .strokeColor("#aaaaaa")
              .lineWidth(1)
              .moveTo(50, 410)
              .lineTo(550, 410)
              .stroke();

            document.end();
            document.on("end", async () => {
              const file = {
                originalname: "estimate",
                buffer: Buffer.concat(buffers),
                mimetype: "application/pdf",
              };
              const { Location } = await putMedia(
                file,
                `patients/${consumer!._id}/${estimate.ticket}/estimates`,
                BUCKET_NAME
              );
              await estimateTemplateMessage(
                "916397401855",
                "patient_estimate",
                "en",
                Location
              );
              await updateEstimateTotal(estimateId, charges.total[0], session);
            });
          }
        );
      });
  });
};
export default generateEstimate;
