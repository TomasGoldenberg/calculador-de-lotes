import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Reservation from "@/models/Reservation";
import Project from "@/models/Project";
import Unit from "@/models/Unit";
import mongoose from "mongoose";

// POST - Create a new reservation for a project
export async function POST(request, { params }) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const projectId = params.id;
    const body = await request.json();

    console.log("Creating reservation for project:", projectId);
    console.log("Reservation data:", body);

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // If unitId is provided, verify the unit exists and belongs to this project
    if (body.unitId) {
      const unit = await Unit.findOne({
        _id: body.unitId,
        projectId: projectId,
      });

      if (!unit) {
        return NextResponse.json(
          { error: "Unit not found or doesn't belong to this project" },
          { status: 404 }
        );
      }

      // Check if unit is available
      if (!unit.available) {
        return NextResponse.json(
          { error: "Unit is not available for reservation" },
          { status: 400 }
        );
      }
    }

    // Create the reservation with the project ID
    const reservationData = {
      ...body,
      projectId: new mongoose.Types.ObjectId(projectId),
    };

    const newReservation = new Reservation(reservationData);
    const savedReservation = await newReservation.save();

    // Populate the project and unit details for the response
    const populatedReservation = await Reservation.findById(
      savedReservation._id
    )
      .populate("projectId", "name location")
      .populate("unitId", "size price description");

    return NextResponse.json({
      success: true,
      message: "Reservation created successfully",
      reservation: populatedReservation,
    });
  } catch (error) {
    console.error("Database error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}

// GET - Get all reservations for a specific project
export async function GET(request, { params }) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // Optional filter by status

    console.log("Fetching reservations for project:", projectId);

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Build query filter
    const filter = { projectId };
    if (status && ["new", "seen", "assigned"].includes(status)) {
      filter.status = status;
    }

    // Get all reservations for this project
    const reservations = await Reservation.find(filter)
      .populate("projectId", "name location")
      .populate("unitId", "size price description")
      .sort({ createdAt: -1 }); // Most recent first

    // Calculate stats
    const allReservations = await Reservation.find({ projectId });
    const stats = {
      total: allReservations.length,
      byStatus: {
        new: allReservations.filter((r) => r.status === "new").length,
        seen: allReservations.filter((r) => r.status === "seen").length,
        assigned: allReservations.filter((r) => r.status === "assigned").length,
      },
      totalValue: allReservations.reduce((sum, r) => sum + r.totalPayment, 0),
      averageInitialPayment:
        allReservations.length > 0
          ? allReservations.reduce((sum, r) => sum + r.initialPayment, 0) /
            allReservations.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        location: project.location,
      },
      reservations,
      stats,
      count: reservations.length,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// PUT - Update a reservation status or details
export async function PUT(request, { params }) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const projectId = params.id;
    const body = await request.json();
    const { reservationId, ...updateData } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    console.log("Updating reservation:", reservationId);

    // Verify the reservation exists and belongs to this project
    const existingReservation = await Reservation.findOne({
      _id: reservationId,
      projectId: projectId,
    });

    if (!existingReservation) {
      return NextResponse.json(
        { error: "Reservation not found or doesn't belong to this project" },
        { status: 404 }
      );
    }

    // Update the reservation
    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("projectId", "name location")
      .populate("unitId", "size price description");

    return NextResponse.json({
      success: true,
      message: "Reservation updated successfully",
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error("Database error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 }
    );
  }
}
