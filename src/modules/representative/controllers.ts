import { NextFunction, Request, Response } from "express";
import PromiseWrapper from "../../middleware/promiseWrapper";
import {
  registerRepresentativeHandler,
  loginRepresentativeHandler,
  fetchAllRepresentative,
  logoutRepresentativeHandler,
} from "./functions";
import { ObjectId } from "mongodb";
import {
  REPRESENTATIVE_DB,
  createGroup,
  deleteGroup,
  deleteGroupMembers,
  deleteRepresentative,
  findRepresentative,
  updateGroup,
  updateRepresentative,
} from "./crud";
import {
  GROUP,
  REPRESENTATIVE,
} from "../../types/representative/representative";
import MongoService from "../../utils/mongo";
export const register = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    // Convert string IDs to ObjectId only if they are provided
    const requestBody = {
      ...req.body,
      group: req.body.group ? new ObjectId(req.body.group) : null,
      department: req.body.department
        ? new ObjectId(req.body.department)
        : null,
      leadAssignedCount: 0,
    };
    const { status, body } = await registerRepresentativeHandler(requestBody);
    res.status(status).json(body);
  }
);
export const login = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await loginRepresentativeHandler(
      req.body.phone,
      req.body.password
    );
    res.status(status).json(body);
  }
);
export const getAllRepresentative = PromiseWrapper(
  async (req: Request, res: Response) => {
    const result = await fetchAllRepresentative();
    res.status(200).json(result);
  }
);
export const createGroupController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestBody = req.body;
    console.log(requestBody , "this sinijcsojnv ,v");
    const newGroup: GROUP = {
      _id: new ObjectId(),
      name: requestBody.name, // Generate a new ObjectId for the group
      Members: requestBody.members || [], // You can pass an array of member ObjectIds
    };
    const createdGroup = await createGroup(newGroup);
    res.status(200).json({ result: createdGroup, status: "Success" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred." });
  }
};
// update  representative
export const updateRepresentativeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const representativeId = new ObjectId(req.params.id);
    const updatedData = req.body;

    // Convert 'group' field to ObjectId if present
    if (updatedData.group) {
      updatedData.group = new ObjectId(updatedData.group);
    }

    const updatedRepresentative = await updateRepresentative(
      representativeId,
      updatedData
    );

    if (!updatedRepresentative) {
      return res.status(404).json({ message: "Representative not found" });
    }

    return res.status(200).json(updatedRepresentative);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// delete api
export const deleteRepresentativeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const representativeId = new ObjectId(req.params.id);
    const deleteSuccess = await deleteRepresentative(representativeId);
    if (!deleteSuccess) {
      return res.status(404).json({ message: "Representative not found" });
    }
    return res.status(204).end(); // 204 No Content for successful deletion
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// Update a group with the provided ID and updated data
export const updateGroupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const groupId = new ObjectId(req.params.id);
    const updatedData = req.body;
    const updatedGroup = await updateGroup(groupId, updatedData);
    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    return res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteGroupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const groupId = new ObjectId(req.params.id); // Extract the group ID from the request params
    const deleteSuccess = await deleteGroup(groupId);
    if (!deleteSuccess) {
      return res.status(404).json({ message: "Group not found" });
    }
    return res.status(204).end(); // 204 No Content for successful deletion
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
//delete and update
// In your controller file
export const updateGroupMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const groupId = new ObjectId(req.params.id);
    const newMembers = req.body.Members; // Assuming you pass the new members in the request body
    // Delete the existing members
    const deleteSuccess = await deleteGroupMembers(groupId);
    if (!deleteSuccess) {
      return res.status(404).json({ message: "Group not found" });
    }
    // Add the new members
    const updatedGroup = await updateGroup(groupId, { Members: newMembers });
    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    return res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const logout = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract representative ID from the request body or wherever it's stored in your app
console.log(req.body," this is request body from represenrtative")
    const representativeId = req.body.userId; // Assuming you send the representative ID in the request body
    const rep = new ObjectId(representativeId);
    // Call the logout handler function passing the representative ID
    const logoutResult = await logoutRepresentativeHandler(rep);

    if (logoutResult) {
      res
        .status(200)
        .json({ message: "Representative logged out successfully" });
    } else {
      res.status(500).json({ error: "Failed to log out representative" });
    }
  }
);