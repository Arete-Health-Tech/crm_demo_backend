import { ClientSession, Collection, ObjectId } from "mongodb";
import Schedule from "node-schedule";
import { sendTemplateMessage } from "../../services/whatsapp/whatsapp";
import { iReminder, iTodo } from "../../types/task/task";
import MongoService, { Collections } from "../../utils/mongo";
import { createReminderTemplate } from "./utils";

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
      phone.length === 10 ? "91" + phone : phone,
      "remainder",
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
