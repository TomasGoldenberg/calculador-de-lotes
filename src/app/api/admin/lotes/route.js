import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Lote from "@/models/Lote";

// Default lotes data
const defaultLotes = [
  { id: 1, price: 10000, available: true },
  { id: 2, price: 11000, available: true },
  { id: 3, price: 12000, available: true },
  { id: 4, price: 13000, available: true },
  { id: 5, price: 14000, available: true },
  { id: 6, price: 15000, available: true },
  { id: 7, price: 16000, available: true },
  { id: 8, price: 17000, available: true },
  { id: 9, price: 18000, available: true },
  { id: 10, price: 19000, available: true },
  { id: 11, price: 20000, available: true },
  { id: 12, price: 21000, available: true },
  { id: 13, price: 22000, available: true },
  { id: 14, price: 23000, available: true },
  { id: 15, price: 24000, available: true },
  { id: 16, price: 25000, available: true },
  { id: 17, price: 26000, available: true },
  { id: 18, price: 27000, available: true },
  { id: 19, price: 28000, available: true },
  { id: 20, price: 29000, available: true },
];

// GET - Get all lotes with additional info
export async function GET() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Fetching lotes");
    const lotes = await Lote.find({}).sort({ id: 1 });
    console.log("Lotes fetched");
    const totalLotes = lotes.length;
    const availableLotes = lotes.filter((lote) => lote.available).length;
    const soldLotes = totalLotes - availableLotes;

    return NextResponse.json({
      success: true,
      lotes,
      stats: {
        total: totalLotes,
        available: availableLotes,
        sold: soldLotes,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lotes" },
      { status: 500 }
    );
  }
}

// POST - Reset/Seed database with default lotes
export async function POST() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    // Clear existing lotes
    console.log("Clearing existing lotes...");
    await Lote.deleteMany({});

    // Insert default lotes
    console.log("Inserting default lotes...");
    const result = await Lote.insertMany(defaultLotes);

    return NextResponse.json({
      success: true,
      message: "Database reset and seeded with default lotes",
      insertedCount: result.length,
      lotes: result,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to reset database" },
      { status: 500 }
    );
  }
}

// DELETE - Clear all lotes
export async function DELETE() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Deleting all lotes...");
    const result = await Lote.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All lotes deleted",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete lotes" },
      { status: 500 }
    );
  }
}
