import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Project from "@/models/Project";

// Default projects data
const defaultProjects = [
  { name: "Vista Real", unitCount: 20, location: "Costa Rica, San José" },
  { name: "Montaña Verde", unitCount: 15, location: "Costa Rica, Cartago" },
  { name: "Playa Azul", unitCount: 30, location: "Costa Rica, Puntarenas" },
];

// GET - Get all projects with additional info
export async function GET() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Fetching projects");
    const projects = await Project.find({}).sort({ name: 1 });
    console.log("Projects fetched");

    const stats = await Project.getStats();

    return NextResponse.json({
      success: true,
      projects,
      stats,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST - Create a new project or reset/seed database with default projects
export async function POST(request) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const body = await request.json();

    // If body contains 'reset' flag, reset database
    if (body?.reset) {
      // Clear existing projects
      console.log("Clearing existing projects...");
      await Project.deleteMany({});

      // Insert default projects
      console.log("Inserting default projects...");
      const result = await Project.insertMany(defaultProjects);

      return NextResponse.json({
        success: true,
        message: "Database reset and seeded with default projects",
        insertedCount: result.length,
        projects: result,
      });
    }

    // Create a new project
    console.log("Creating new project...");
    const newProject = new Project(body);
    const savedProject = await newProject.save();

    return NextResponse.json({
      success: true,
      message: "Project created successfully",
      project: savedProject,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing project
export async function PUT(request) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const body = await request.json();
    const { projectId, ...updateData } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    console.log("Updating project:", projectId);
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE - Delete individual project by ID or clear all projects
export async function DELETE(request) {
  try {
    console.log("Connecting to database...");
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { projectId } = body;

    if (projectId) {
      // Delete individual project and its associated units
      console.log("Deleting project:", projectId);

      // First, delete all units associated with this project
      const Unit = (await import("@/models/Unit")).default;
      const unitsDeleteResult = await Unit.deleteMany({ projectId });
      console.log(
        `Deleted ${unitsDeleteResult.deletedCount} units for project ${projectId}`
      );

      // Then delete the project
      const deletedProject = await Project.findByIdAndDelete(projectId);

      if (!deletedProject) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Project and associated units deleted successfully",
        deletedProject,
        unitsDeleted: unitsDeleteResult.deletedCount,
      });
    } else {
      // Delete all projects (existing functionality)
      console.log("Deleting all projects...");

      // Also delete all units when deleting all projects
      const Unit = (await import("@/models/Unit")).default;
      const allUnitsResult = await Unit.deleteMany({});
      console.log(`Deleted ${allUnitsResult.deletedCount} units`);

      const result = await Project.deleteMany({});

      return NextResponse.json({
        success: true,
        message: "All projects and units deleted",
        deletedCount: result.deletedCount,
        unitsDeleted: allUnitsResult.deletedCount,
      });
    }
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete project(s)" },
      { status: 500 }
    );
  }
}
