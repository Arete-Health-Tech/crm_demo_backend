import { io } from "../../server";

export const connectSocketIO = () => {
  io.on("connection", (socket) => {
    console.log(
      "connection successful! \n user connected ID: ",
      socket.id,
      "\n"
    );
    
    socket.on("disconnect", () => {
      console.log("Disconnected", "\n user ID: ", socket.id, "\n");
    });
  });

  return io;
};
