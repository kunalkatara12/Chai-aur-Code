import { connect, disconnect } from "mongoose";

async function connectToDB() {
  const mongoURL: string = process.env.MONGODB_URL || "";
  if (mongoURL === "") {
    console.log("MongoDB URL not found in .env file");
    throw new Error("MongoDB URL not found in .env file");
  }
  try {
    const connectionInstance=await connect(mongoURL);
    console.log(`Connected to MongoDB successfully! && DB Host: ${connectionInstance.connection.host}`);
  } catch (err) {
    console.log("Error connecting to database in connection.ts:", err);
    throw new Error("Error connecting to database in connection.ts");
  }
}

async function closeDBConnection() {
  try {
    await disconnect();
    console.log("Connection closed successfully!");
  } catch (err) {
    console.log("Error closing connection in connection.ts:", err);
    throw new Error("Error closing connection in connection.ts");
  }
}

export { connectToDB, closeDBConnection };
