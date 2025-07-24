import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: "",
    },
    initialPayment: {
      type: Number,
      required: true,
    },
    monthsAmount: {
      type: Number,
      required: true,
    },
    monthlyPayment: {
      type: Number,
      required: true,
    },
    totalPayment: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "seen", "assigned", "rejected"],
      default: "new",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

export default mongoose.models.Reservation ||
  mongoose.model("Reservation", ReservationSchema);
