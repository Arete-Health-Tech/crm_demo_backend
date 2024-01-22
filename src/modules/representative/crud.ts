import { ObjectId } from "mongodb";
import {
  REPRESENTATIVE,
  GROUP,
} from "../../types/representative/representative";
import MongoService from "../../utils/mongo";
export const REPRESENTATIVE_DB = "representative";
export const GROUPS_DB = "group";
export const createRepresentative = async (
  representative: REPRESENTATIVE
): Promise<REPRESENTATIVE> => {
  await MongoService.collection(REPRESENTATIVE_DB).insertOne(representative);
  return representative;
};
export const createGroup = async (group: GROUP) => {
  await MongoService.collection(GROUPS_DB).insertOne(group);
  return group;
};
export const findRepresentative = async (query: Object) => {
  return await MongoService.collection(
    REPRESENTATIVE_DB
  ).findOne<REPRESENTATIVE>(query);
};
// Find a group by the provided query
const findGroup = async (query: any) => {
  return await MongoService.collection(GROUPS_DB).findOne(query);
};
// update  representative
export const updateRepresentative = async (
  representativeId: any,
  updatedData: any
) => {
  const filter = { _id: representativeId };
  const update = { $set: updatedData };
  console.log(update , "this is update ");
  const result = await MongoService.collection(REPRESENTATIVE_DB).updateOne(
    filter,
    update
  );
  if (result.modifiedCount === 0) {
    return null; // No document was updated, representative not found
  }
  // Fetch and return the updated representative
  return findRepresentative(representativeId);
};
// delete rep
export const deleteRepresentative = async (
  representativeId: ObjectId
): Promise<boolean> => {
  const filter = { _id: representativeId };
  const result = await MongoService.collection(REPRESENTATIVE_DB).deleteOne(
    filter
  );
  if (result.deletedCount === 1) {
    return true; // Deleted successfully
  }
  return false; // No document was deleted, representative not found
};
// Update a group with the provided ID and updated data
export const updateGroup = async (
  groupId: ObjectId,
  updateData: { Members: any[],name?: string }
): Promise<GROUP | null> => {
  try {
    const filter = { _id: groupId };
    console.log(updateData, "this is update data");
    // Ensure that "Members" is an array of member IDs
    const updatedMembers = Array.isArray(updateData.Members)
      ? updateData.Members
      : [updateData.Members];
    const update: { [key: string]: any } = {
      $push: { Members: { $each: updatedMembers } },
    };
    if (updateData.name) {
      update.$set = { name: updateData.name };
    }
    const collection = MongoService.collection(GROUPS_DB);
    const result = await collection.updateOne(filter, update);
    if (result.matchedCount === 0) {
      return null; // No document was matched, group not found
    }
    if (result.modifiedCount === 0) {
      console.warn("No changes made to the document.");
    }
    // Fetch and return the updated group
    return findGroup(groupId) as unknown as GROUP;
  } catch (error) {
    console.error("Error updating group:", error);
    throw error; // Handle the error as needed
  }
};
// Define a function to delete a group by its _id
export const deleteGroup = async (groupId: any) => {
  try {
    const filter = { _id: groupId };
    const collection = MongoService.collection(GROUPS_DB);
    const result = await collection.deleteOne(filter);
    if (result.deletedCount === 1) {
      return true; // Document deleted successfully
    } else {
      return false; // Document not found or not deleted
    }
  } catch (error) {
    console.error("Error deleting group:", error);
    throw error; // Handle the error as needed
  }
};
//delete crud this its_id by member
export const deleteGroupMembers = async (
  groupId: ObjectId
): Promise<boolean> => {
  try {
    const filter = { _id: groupId };
    const update = {
      $unset: { Members: "" }, // Unset the Members field to remove it
    };
    const collection = MongoService.collection(GROUPS_DB);
    const result = await collection.updateOne(filter, update);
    if (result.modifiedCount === 1) {
      return true; // Members removed successfully
    } else {
      return false; // Group not found or members not removed
    }
  } catch (error) {
    console.error("Error deleting group members:", error);
    throw error; // Handle the error as needed
  }
};
// Import necessary dependencies and models
export const updateRepresentativeLoggedStatus = async (
  representativeId: ObjectId
): Promise<boolean> => {
  try {
    const updateResult = await MongoService.collection(
      REPRESENTATIVE_DB
    ).updateOne({ _id: representativeId }, { $set: { logged: 1 } });
    return updateResult.modifiedCount === 1;
  } catch (error) {
    console.error("Failed to update logged status:", error);
    return false;
  }
};


export const updateRepresentativeLoggedStatusforlogout = async (
  representativeId: ObjectId
): Promise<boolean> => {
  try {
    const updateResult = await MongoService.collection(
      REPRESENTATIVE_DB
    ).updateOne({ _id: representativeId }, { $set: { logged: 0 } });

    return updateResult.modifiedCount === 1;
  } catch (error) {
    console.error("Failed to update logged status:", error);
    return false;
  }
};