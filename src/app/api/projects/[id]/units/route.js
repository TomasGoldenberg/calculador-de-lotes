import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Unit from "@/models/Unit";
import Project from "@/models/Project";
import mongoose from "mongoose";

// POST - Create units for a project based on configuration
export async function POST(request, { params }) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const projectId = params.id;
    const body = await request.json();
    const { unitDistribution } = body;

    console.log("Creating units for project:", projectId);
    console.log("Unit distribution:", unitDistribution);

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete existing units for this project to avoid duplicates
    console.log("Deleting existing units for project:", projectId);
    const deleteResult = await Unit.deleteMany({ projectId });
    console.log(`Deleted ${deleteResult.deletedCount} existing units`);

    const unitsToCreate = [];

    // Create units for each category
    Object.entries(unitDistribution).forEach(([category, config]) => {
      const { count, price } = config;

      for (let i = 0; i < count; i++) {
        unitsToCreate.push({
          price: Number(price),
          available: true,
          size: String(category),
          location: String(project.location),
          description: `${
            category.charAt(0).toUpperCase() + category.slice(1)
          } unit in ${project.name}`,
          projectId: new mongoose.Types.ObjectId(projectId),
        });
      }
    });

    console.log(`Creating ${unitsToCreate.length} units...`);

    // Insert all units
    console.log("Sample unit to create:", unitsToCreate[0]);
    const createdUnits = await Unit.insertMany(unitsToCreate);

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdUnits.length} units`,
      unitsCreated: createdUnits.length,
      distribution: {
        small: unitDistribution.small?.count || 0,
        medium: unitDistribution.medium?.count || 0,
        big: unitDistribution.big?.count || 0,
      },
      units: createdUnits,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create units" },
      { status: 500 }
    );
  }
}

// GET - Get all units for a specific project
export async function GET(request, { params }) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const projectId = params.id;

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all units for this project
    const units = await Unit.find({ projectId }).sort({
      size: 1,
      createdAt: 1,
    });

    // Calculate stats by category
    const stats = {
      total: units.length,
      available: units.filter((unit) => unit.available).length,
      sold: units.filter((unit) => !unit.available).length,
      byCategory: {
        small: {
          total: units.filter((unit) => unit.size === "small").length,
          available: units.filter(
            (unit) => unit.size === "small" && unit.available
          ).length,
        },
        medium: {
          total: units.filter((unit) => unit.size === "medium").length,
          available: units.filter(
            (unit) => unit.size === "medium" && unit.available
          ).length,
        },
        big: {
          total: units.filter((unit) => unit.size === "big").length,
          available: units.filter(
            (unit) => unit.size === "big" && unit.available
          ).length,
        },
      },
    };

    return NextResponse.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        location: project.location,
        interestRates: project.interestRates,
      },
      units,
      stats,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}
