// models/FormData.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalName: String,
  url: String,
  publicId: String,
  size: Number,
  format: String,
  resourceType: String,
  uploadedAt: { type: Date, default: Date.now }
});

const formSchema = new mongoose.Schema(
  {
    userToken: { type: String, required: true }, // Remove unique constraint
    currentStep: { type: Number, default: 0 },
    
    // Lead information
    fullName: String,
    email: String,
    phone: String,

    // Step 1–4 fields
    vision: [String],
    budgetPlan: String,
    timeline: String,

    // Step 5 fields
    bigIdea: String,
    audience: String,
    problem: String,
    references: String,
    mustHaves: String,
    files: [fileSchema],

    // New fields for lead management
    status: { 
      type: String, 
      enum: ['Pending', 'Contacted', 'Qualified', 'Converted', 'Rejected'],
      default: 'Pending' 
    },
    leadNumber: { type: Number, default: 1 }, // Track which lead this is for the user
    submittedAt: { type: Date, default: Date.now },
    adminNotes: String,
    isCompleted: { type: Boolean, default: false },
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Add index for better query performance
formSchema.index({ userToken: 1, leadNumber: 1 });
formSchema.index({ status: 1 });
formSchema.index({ submittedAt: -1 });

export default mongoose.model("Form", formSchema);