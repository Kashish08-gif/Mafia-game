import mongoose from "mongoose";

export const dbConnect = async () => {
  const DB_URI = process.env.DB_URI;
  if (!DB_URI) {
    throw new Error("DB_URI environment variable is missing. Please set DB_URI in your .env or environment configuration.");
  }
  try {
    const connect = await mongoose.connect(DB_URI);
    console.log(
      `Database connected successfully: [HOST] ${connect.connection.host}`,
    );
    return connect;
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    throw error;
  }
};

