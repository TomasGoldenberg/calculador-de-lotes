import mongoose from "mongoose";

const LoteSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    available: {
      type: Boolean,
    },
    description: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    size: {
      type: Number, // Size in square meters
      min: 0,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexes for better performance
// Note: id field already has index due to unique: true
LoteSchema.index({ available: 1 });
LoteSchema.index({ price: 1 });

// Instance methods
LoteSchema.methods.markAsSold = function () {
  this.available = false;
  return this.save();
};

LoteSchema.methods.markAsAvailable = function () {
  this.available = true;
  return this.save();
};

// Static methods
LoteSchema.statics.findAvailable = function () {
  return this.find({ available: true }).sort({ id: 1 });
};

LoteSchema.statics.findSold = function () {
  return this.find({ available: false }).sort({ id: 1 });
};

LoteSchema.statics.getStats = async function () {
  const total = await this.countDocuments();
  const available = await this.countDocuments({ available: true });
  const sold = total - available;

  return { total, available, sold };
};

// Prevent re-compilation in development
export default mongoose.models.Lote || mongoose.model("Lote", LoteSchema);
