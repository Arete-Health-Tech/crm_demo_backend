import MongoService, { Collections } from "../../utils/mongo";
import { ClientSession, ObjectId } from "mongodb";
import { iTicket } from "../../types/ticket/ticket";
import { TICKET_DB } from "../ticket/crud";
export const updateStatus = async (
  ticketId: ObjectId,
  newStatus: string | null
) => {
  console.log(ticketId, "658ab8fd27e81021128ed9e5");
  try {
    const updateQuery: { $set: { status: string | null } } = {
      $set: { status: newStatus },
    };
    if (newStatus === null) {
      // If newStatus is null, explicitly set status to null
      updateQuery.$set.status = null;
    }
    const result = await MongoService.collection(TICKET_DB).updateOne(
      { _id: ticketId },
      updateQuery
    );
    if (result.modifiedCount > 0) {
      console.log(`Ticket ${ticketId} updated successfully.`);
    } else {
      console.log(`Ticket ${ticketId} not found or not updated.`);
    }
  } catch (error: any) {
    console.error("Error updating ticket status:", error.message);
    throw new Error("Internal server error");
  }
};


export const findTicketsByStageAndRepresentative = async (
  stage: string,
  representativeId?: ObjectId
) => {
  try {
    const filterAssignedArray = representativeId
      ? [new ObjectId(representativeId)]
      : [];

    let query: any = {
      stage,
      assigned: { $in: filterAssignedArray },
    };

    const tickets = await MongoService.collection(TICKET_DB)
      .find(query)
      .toArray();
    return tickets;
  } catch (error: any) {
    console.error("Error finding tickets:", error.message);
    throw new Error("Internal server error");
  }
};