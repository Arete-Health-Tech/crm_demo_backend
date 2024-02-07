import { ClientSession, Collection, ObjectId } from "mongodb";
import Schedule from "node-schedule";
import { sendTemplateMessage } from "../../services/whatsapp/whatsapp";
import { iReminder, iRescheduler, iTodo } from "../../types/task/task";
import MongoService, { Collections } from "../../utils/mongo";
import { createReminderTemplate, createReschedulerTemplate } from "./utils";

export const createReminder = async (
  reminder: iReminder,
  session: ClientSession,
  phone: string
) => {
  const date = new Date(reminder.date);
  Schedule.scheduleJob(date, async () => {
    const components = createReminderTemplate(
      reminder.title,
      reminder.description
    );
    await sendTemplateMessage(
      phone.length !== 1 ?  phone : phone,
      "reminder",
      "en",
      components
    );
  });
  await MongoService.collection(Collections.REMINDER).insertOne(reminder, {
    session,
  });
  return reminder;
};

export const findCreatorReminders = async (creator: ObjectId) => {
  return await MongoService.collection(Collections.REMINDER)
    .find({ creator })
    .toArray();
};

export const findTicketReminders = async (ticket: ObjectId, currentUnixTimestamp: number | Date) => {
  return await MongoService.collection(Collections.REMINDER)
    .find({ date: {$gte: currentUnixTimestamp} })
    .toArray();
};

// todo

export const createTodo = async (todo: iTodo, session: ClientSession) => {
  await MongoService.collection(Collections.TODO).insertOne(todo, { session });
  return todo;
};

export const findCreatorTodo = async (creator: ObjectId) => {
  return await MongoService.collection(Collections.TODO)
    .find({ creator })
    .toArray();
};

export const findTicketTodo = async (ticket: ObjectId) => {
  return await MongoService.collection(Collections.TODO)
    .find({ ticket })
    .toArray();
};

export const findTodoById = async (_id: ObjectId) => {
  return await MongoService.collection(Collections.TODO).findOne<iTodo>({
    _id,
  });
};

export const updateTodoStatus = async (
  _id: ObjectId,
  status: boolean,
  session: ClientSession
) => {
  return await MongoService.collection(Collections.TODO).updateOne(
    { _id },
    { $set: { status } },
    { session }
  );
};

// call rescheduler
export const createRescheduler = async (
  rescheduler: iRescheduler,
  session: ClientSession,
  phone: string
) => {
  const date = new Date(rescheduler.date);
  Schedule.scheduleJob(date, async () => {
    const components = createReschedulerTemplate(
      rescheduler.title,
      rescheduler.description
    );
    // await sendTemplateMessage(
    //   phone.length === 10 ? "91" + phone : phone,
    //   "reminder",
    //   "en",
    //   components
    // );
  });
  await MongoService.collection(Collections.RESCHEDULAR).insertOne(
    rescheduler,
    {
      session,
    }
  );
  return rescheduler;
};

export const findCreatorRescheduler = async (creator: ObjectId) => {
  console.log(creator, "tarak mehta ka ulta chasma");
  return await MongoService.collection(Collections.RESCHEDULAR)
    .find({ creator })
    .toArray();
};

export const findTicketRescheduler = async (
  ticket: ObjectId,
  currentUnixTimestamp: number | Date
) => {
  return await MongoService.collection(Collections.RESCHEDULAR)
    .find({ date: { $gte: currentUnixTimestamp } })
    .toArray();
};



export const rescheduleTicket = async (query:any) => {
  try {
   
    const rescheduledTicket = await MongoService.collection(
      Collections.RESCHEDULAR
    ).find<iRescheduler>(query).toArray();
console.log(rescheduledTicket);
    // Return the rescheduled ticket or handle further processing as needed
    return rescheduledTicket;
  } catch (error) {
    // Handle any errors that may occur during the database operation
    console.error("Error while fetching rescheduled ticket:", error);
    throw error; // You may choose to handle the error differently based on your application's requirements
  }
};

export const remainderTicket = async (query: any) => {
  try {
    const remainderTicket = await MongoService.collection(
      Collections.REMINDER
    )
      .find<iReminder>(query)
      .toArray();
   
    // Return the rescheduled ticket or handle further processing as needed
    return remainderTicket;
  } catch (error) {
    // Handle any errors that may occur during the database operation
    console.error("Error while fetching rescheduled ticket:", error);
    throw error; // You may choose to handle the error differently based on your application's requirements
  }
};