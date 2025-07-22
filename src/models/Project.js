import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unitCount: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexes for better performance
ProjectSchema.index({ name: 1 });
ProjectSchema.index({ location: 1 });

// Static methods
ProjectSchema.statics.findByLocation = function (location) {
  return this.find({ location: new RegExp(location, "i") }).sort({ name: 1 });
};

ProjectSchema.statics.getStats = async function () {
  const total = await this.countDocuments();
  const totalUnits = await this.aggregate([
    { $group: { _id: null, total: { $sum: "$unitCount" } } },
  ]);

  return {
    total,
    totalUnits: totalUnits.length > 0 ? totalUnits[0].total : 0,
  };
};

// Prevent re-compilation in development
export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);
