// controllers/formController.js
import Form from "../models/FormData.js";
import jwt from "jsonwebtoken";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// Generate a unique token for each user session
export const startForm = async (req, res) => {
  try {
    const userIp = req.ip;
    const token = jwt.sign({ ip: userIp }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Find user's latest form to determine next lead number
    const latestForm = await Form.findOne({ userToken: token })
      .sort({ leadNumber: -1 })
      .exec();

    const nextLeadNumber = latestForm ? latestForm.leadNumber + 1 : 1;

    const newForm = await Form.create({ 
      userToken: token,
      leadNumber: nextLeadNumber,
      status: 'Pending'
    });

    res.json({ 
      success: true, 
      message: "Form started", 
      token, 
      form: newForm,
      leadNumber: nextLeadNumber 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Save step data
export const saveStep = async (req, res) => {
  try {
    let token, step, data;

    // Handle both JSON and form-data
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      token = req.body.token;
      step = parseInt(req.body.step);
      data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      token = req.body.token;
      step = req.body.step;
      data = req.body.data;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Token is required" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    // Check if form exists, if not create it
    let form = await Form.findOne({ userToken: token }).sort({ leadNumber: -1 });
    
    if (!form) {
      form = await Form.create({ 
        userToken: token,
        leadNumber: 1,
        status: 'Pending',
        currentStep: step
      });
    }

    let updateData = {
      currentStep: step,
      ...(step === 5 && { isCompleted: true, submittedAt: new Date() })
    };

    // Add form data fields
    if (data) {
      const formFields = [
        'fullName', 'email', 'phone', 'vision', 'budgetPlan', 'timeline',
        'bigIdea', 'audience', 'problem', 'references', 'mustHaves'
      ];
      
      formFields.forEach(field => {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      });
    }

    // If files were uploaded, process them with Cloudinary
    if (req.files && req.files.length > 0) {
      try {
        const fileUploads = req.files.map(async (file) => {
          const result = await uploadToCloudinary(file.buffer, file.originalname);
          return {
            originalName: file.originalname,
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes,
            format: result.format,
            resourceType: result.resource_type,
            uploadedAt: new Date()
          };
        });
        
        const uploadedFiles = await Promise.all(fileUploads);
        updateData.files = uploadedFiles;
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        return res.status(500).json({ success: false, message: "Error uploading files" });
      }
    }

    // Update the form
    form = await Form.findOneAndUpdate(
      { _id: form._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: "Step saved successfully", form });
  } catch (error) {
    console.error("Save step error:", error);
    res.status(500).json({ success: false, message: "Error saving step" });
  }
};

// Get all forms for a user (to show their lead history)
export const getUserForms = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }
    
    const forms = await Form.find({ userToken: token })
      .sort({ leadNumber: -1 })
      .select('-files'); // Exclude files for list view
    
    res.json({ success: true, forms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching forms" });
  }
};

// Get specific form data
export const getFormData = async (req, res) => {
  try {
    const { token, formId } = req.query;
    
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }
    
    let form;
    if (formId) {
      // Get specific form by ID
      form = await Form.findOne({ _id: formId, userToken: token });
    } else {
      // Get latest form
      form = await Form.findOne({ userToken: token }).sort({ leadNumber: -1 });
    }
    
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    res.json({ success: true, form });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching form" });
  }
};

// Admin: Get all leads with pagination
export const getAllLeads = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Form.find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-files'); // Exclude files for list view

    const total = await Form.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      leads,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLeads: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching leads" });
  }
};

// Admin: Update lead status
export const updateLeadStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['Pending', 'Contacted', 'Qualified', 'Converted', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const lead = await Form.findByIdAndUpdate(
      leadId,
      { 
        status,
        ...(adminNotes && { adminNotes })
      },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, message: "Lead status updated", lead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating lead status" });
  }
};

// Get lead statistics
export const getLeadStats = async (req, res) => {
  try {
    const stats = await Form.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalLeads = await Form.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLeads = await Form.countDocuments({
      submittedAt: { $gte: today }
    });

    res.json({
      success: true,
      stats: {
        byStatus: stats,
        total: totalLeads,
        today: todayLeads
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching lead statistics" });
  }
};