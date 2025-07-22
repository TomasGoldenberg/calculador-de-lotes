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

// DELETE - Clear all projects
export async function DELETE() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Deleting all projects...");
    const result = await Project.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All projects deleted",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete projects" },
      { status: 500 }
    );
  }
}
