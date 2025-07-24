import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Reservation from "@/models/Reservation";
import Project from "@/models/Project";

// GET - Get all reservations across all projects (admin endpoint)
export async function GET(request) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const page = parseInt(searchParams.get("page")) || 1;
    const skip = (page - 1) * limit;

    console.log("Fetching all reservations with filters:", {
      status,
      projectId,
      limit,
      page,
    });

    // Build query filter
    const filter = {};
    if (status && ["new", "seen", "assigned"].includes(status)) {
      filter.status = status;
    }
    if (projectId) {
      filter.projectId = projectId;
    }

    // Get reservations with pagination
    const reservations = await Reservation.find(filter)
      .populate("projectId", "name location")
      .populate("unitId", "size price description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Reservation.countDocuments(filter);

    // Calculate overall stats
    const allReservations = await Reservation.find({});
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
      averageMonthlyPayment:
        allReservations.length > 0
          ? allReservations.reduce((sum, r) => sum + r.monthlyPayment, 0) /
            allReservations.length
          : 0,
    };

    // Group by project for additional insights
    const byProject = {};
    allReservations.forEach((reservation) => {
      const projectId = reservation.projectId.toString();
      if (!byProject[projectId]) {
        byProject[projectId] = {
          count: 0,
          totalValue: 0,
          statuses: { new: 0, seen: 0, assigned: 0 },
        };
      }
      byProject[projectId].count++;
      byProject[projectId].totalValue += reservation.totalPayment;
      byProject[projectId].statuses[reservation.status]++;
    });

    return NextResponse.json({
      success: true,
      reservations,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      stats,
      byProject,
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

// POST - Create a new reservation (general endpoint)
export async function POST(request) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const body = await request.json();
    console.log("Creating reservation:", body);

    // Verify project exists
    if (body.projectId) {
      const project = await Project.findById(body.projectId);
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }

    // If unitId is provided, verify it exists and belongs to the project
    if (body.unitId && body.projectId) {
      const Unit = (await import("@/models/Unit")).default;
      const unit = await Unit.findOne({
        _id: body.unitId,
        projectId: body.projectId,
      });

      if (!unit) {
        return NextResponse.json(
          {
            error: "Unit not found or doesn't belong to the specified project",
          },
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

    const newReservation = new Reservation(body);
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

// PUT - Bulk update reservations (admin endpoint)
export async function PUT(request) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const body = await request.json();
    const { reservationIds, updateData } = body;

    if (
      !reservationIds ||
      !Array.isArray(reservationIds) ||
      reservationIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Reservation IDs array is required" },
        { status: 400 }
      );
    }

    console.log("Bulk updating reservations:", reservationIds);

    // Update multiple reservations
    const updateResult = await Reservation.updateMany(
      { _id: { $in: reservationIds } },
      updateData,
      { runValidators: true }
    );

    // Get updated reservations to return
    const updatedReservations = await Reservation.find({
      _id: { $in: reservationIds },
    })
      .populate("projectId", "name location")
      .populate("unitId", "size price description");

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.modifiedCount} reservations`,
      modifiedCount: updateResult.modifiedCount,
      reservations: updatedReservations,
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
      { error: "Failed to update reservations" },
      { status: 500 }
    );
  }
}

// DELETE - Delete reservations
export async function DELETE(request) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const body = await request.json();
    const { reservationIds, reservationId } = body;

    if (reservationId) {
      // Delete single reservation
      console.log("Deleting reservation:", reservationId);
      const deletedReservation = await Reservation.findByIdAndDelete(
        reservationId
      );

      if (!deletedReservation) {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Reservation deleted successfully",
        deletedReservation,
      });
    } else if (reservationIds && Array.isArray(reservationIds)) {
      // Delete multiple reservations
      console.log("Deleting reservations:", reservationIds);
      const deleteResult = await Reservation.deleteMany({
        _id: { $in: reservationIds },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deleteResult.deletedCount} reservations`,
        deletedCount: deleteResult.deletedCount,
      });
    } else {
      return NextResponse.json(
        { error: "Either reservationId or reservationIds array is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete reservation(s)" },
      { status: 500 }
    );
  }
}
