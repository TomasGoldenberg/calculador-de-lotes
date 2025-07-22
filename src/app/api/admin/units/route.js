import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Unit from "@/models/Unit";

// Default units data
const defaultUnits = [
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

// GET - Get all units with additional info
export async function GET() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Fetching units");
    const units = await Unit.find({}).sort({ id: 1 });
    console.log("Units fetched");
    const totalUnits = units.length;
    const availableUnits = units.filter((unit) => unit.available).length;
    const soldUnits = totalUnits - availableUnits;

    return NextResponse.json({
      success: true,
      units,
      stats: {
        total: totalUnits,
        available: availableUnits,
        sold: soldUnits,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}

// POST - Reset/Seed database with default units
export async function POST() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    // Clear existing units
    console.log("Clearing existing units...");
    await Unit.deleteMany({});

    // Insert default units
    console.log("Inserting default units...");
    const result = await Unit.insertMany(defaultUnits);

    return NextResponse.json({
      success: true,
      message: "Database reset and seeded with default units",
      insertedCount: result.length,
      units: result,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to reset database" },
      { status: 500 }
    );
  }
}

// DELETE - Clear all units
export async function DELETE() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Deleting all units...");
    const result = await Unit.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All units deleted",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete units" },
      { status: 500 }
    );
  }
}
