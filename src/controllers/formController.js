import Form from "../models/FormData.js";
import jwt from "jsonwebtoken";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { getCountryFromIP } from "../utils/geoUtils.js";

// Generate a unique token for each user session
export const startForm = async (req, res) => {
  try {
    const userIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Get UTM parameters from query string
    const utmParams = {
      source: req.query.utm_source,
      medium: req.query.utm_medium,
      campaign: req.query.utm_campaign,
      term: req.query.utm_term,
      content: req.query.utm_content
    };

    // Enhanced source detection
    let source = 'Direct';
    if (utmParams.source) {
      const sourceMap = {
        'google': 'Google',
        'fiverr': 'Fiverr',
        'social': 'Social',
        'facebook': 'Social',
        'instagram': 'Social',
        'linkedin': 'Social',
        'twitter': 'Social',
        'referral': 'Referral',
        'email': 'Referral'
      };
      source = sourceMap[utmParams.source.toLowerCase()] || 'Other';
    }

    // Get country from IP
    let country = 'Unknown';
    try {
      const countryInfo = await getCountryFromIP(userIp);
      country = countryInfo?.country || 'Unknown';
    } catch (error) {
      console.error('Error getting country from IP:', error);
    }

    const token = jwt.sign({ ip: userIp }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Find user's latest form to determine next lead number
    const latestForm = await Form.findOne({ userToken: token })
      .sort({ leadNumber: -1 })
      .exec();

    const nextLeadNumber = latestForm ? latestForm.leadNumber + 1 : 1;

    const newForm = await Form.create({ 
      userToken: token,
      leadNumber: nextLeadNumber,
      status: 'Pending',
      source,
      utm: Object.keys(utmParams).some(key => utmParams[key]) ? utmParams : undefined,
      userAgent,
      ipAddress: userIp,
      country,
      analyticsEvents: [{
        event: 'form_start',
        timestamp: new Date()
      }]
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

// Save step data with analytics
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
        'bigIdea', 'audience', 'problem', 'references', 'mustHaves', 'targetDate'
      ];
      
      formFields.forEach(field => {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      });

      // Add consent
      if (data.fullName || data.email || data.phone) {
        updateData.consent = true;
      }
    }

    // Add analytics event
    const analyticsEvent = {
      event: 'lead_step_view',
      step: step,
      timestamp: new Date()
    };

    if (data?.field && data?.value) {
      analyticsEvent.event = 'lead_option_select';
      analyticsEvent.field = data.field;
      analyticsEvent.value = data.value;
    }

    updateData.$push = { analyticsEvents: analyticsEvent };

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

    // Force save to trigger pre-save hooks for score calculation
    await form.save();

    res.json({ success: true, message: "Step saved successfully", form });
  } catch (error) {
    console.error("Save step error:", error);
    res.status(500).json({ success: false, message: "Error saving step" });
  }
};

// Submit final form with scoring - FORCE SCORE CALCULATION
export const submitForm = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token is required" });
    }

    // Verify token
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    let form = await Form.findOne({ userToken: token }).sort({ leadNumber: -1 });
    
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form data before calculation:', {
      budget: form.budgetPlan,
      vision: form.vision,
      timeline: form.timeline,
      bigIdea: form.bigIdea,
      mustHaves: form.mustHaves
    });

    // Manually trigger score calculation
    form.calculateScore();
    form.generateDerivedTags();

    console.log('Calculated score:', form.score);
    console.log('Calculated priority:', form.priority);

    // Add submit analytics event
    const submitEvent = {
      event: 'lead_submit',
      score: form.score,
      budget: form.budgetPlan,
      timeline: form.timeline,
      projectTypes: form.vision,
      timestamp: new Date()
    };

    // Update with calculated score and tags
    const updateData = {
      isCompleted: true,
      submittedAt: new Date(),
      status: 'Pending',
      score: form.score,
      priority: form.priority,
      derivedTags: form.derivedTags,
      $push: { analyticsEvents: submitEvent }
    };

    form = await Form.findByIdAndUpdate(
      form._id,
      updateData,
      { new: true, runValidators: true }
    );

    // Generate WhatsApp message
    const whatsappMessage = generateWhatsAppMessage(form);

    console.log('=== FORM SUBMISSION COMPLETE ===');
    console.log('Final score:', form.score);
    console.log('Final priority:', form.priority);

    res.json({ 
      success: true, 
      message: "Form submitted successfully", 
      form,
      whatsappMessage,
      priority: form.priority,
      score: form.score
    });
  } catch (error) {
    console.error("Submit form error:", error);
    res.status(500).json({ success: false, message: "Error submitting form" });
  }
};

// Generate WhatsApp prefill message
function generateWhatsAppMessage(form) {
  const projectTypesCSV = form.vision?.join(', ') || 'Not specified';
  const timelineText = form.timeline + (form.targetDate ? ` • ${form.targetDate}` : '');
  const bigIdeaPreview = form.bigIdea ? form.bigIdea.substring(0, 140) + (form.bigIdea.length > 140 ? '...' : '') : 'Not provided';
  const utmSource = form.utm?.source || 'Direct';

  const message = `New lead from MonkMaze.com
Name: ${form.fullName}
Email: ${form.email}
Phone: ${form.phone || 'Not provided'}
Project: ${projectTypesCSV}
Budget: ${form.budgetPlan}
Timeline: ${timelineText}
Notes: ${bigIdeaPreview}
Source: ${utmSource}
Score: ${form.score} (${form.priority})`;

  return encodeURIComponent(message);
}

// Track WhatsApp open
export const trackWhatsAppOpen = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token is required" });
    }

    const form = await Form.findOne({ userToken: token }).sort({ leadNumber: -1 });
    
    if (form) {
      await Form.findByIdAndUpdate(form._id, {
        $push: {
          analyticsEvents: {
            event: 'lead_whatsapp_open',
            score: form.score,
            timestamp: new Date()
          }
        }
      });
    }

    res.json({ success: true, message: "WhatsApp open tracked" });
  } catch (error) {
    console.error("Track WhatsApp error:", error);
    res.status(500).json({ success: false, message: "Error tracking WhatsApp open" });
  }
};

// Get leads with filtering and sorting
export const getAllLeads = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority,
      source,
      projectType,
      budgetTier,
      search,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    if (source && source !== 'all') {
      filter.source = source;
    }
    if (budgetTier && budgetTier !== 'all') {
      filter['derivedTags.budgetTier'] = budgetTier;
    }
    if (projectType) {
      filter['derivedTags.projectType'] = { $in: [projectType] };
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { bigIdea: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const leads = await Form.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-files -analyticsEvents');

    const total = await Form.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Get stats for filters
    const stats = await Form.aggregate([
      { $match: filter },
      {
        $facet: {
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          priorityCounts: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          sourceCounts: [
            { $group: { _id: '$source', count: { $sum: 1 } } }
          ],
          budgetTierCounts: [
            { $group: { _id: '$derivedTags.budgetTier', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      leads,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLeads: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: stats[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching leads" });
  }
};

// Get lead analytics
export const getLeadAnalytics = async (req, res) => {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 90d
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 30)) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 90)) };
        break;
    }

    const analytics = await Form.aggregate([
      { $match: { submittedAt: dateFilter } },
      {
        $facet: {
          leadsBySource: [
            { $group: { _id: '$source', count: { $sum: 1 } } }
          ],
          leadsByPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          leadsByStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          leadsOverTime: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          averageScores: [
            {
              $group: {
                _id: null,
                avgScore: { $avg: '$score' },
                hotLeads: { $sum: { $cond: [{ $eq: ['$priority', 'Hot'] }, 1, 0] } },
                totalLeads: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      analytics: analytics[0],
      period
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching analytics" });
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
      .select('-files -analyticsEvents');
    
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
      form = await Form.findOne({ _id: formId, userToken: token });
    } else {
      form = await Form.findOne({ userToken: token }).sort({ leadNumber: -1 });
    }
    
    if (!form) return res.status(404).json({ success: false, message: "Form not found" });

    res.json({ success: true, form });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching form" });
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

    const priorityStats = await Form.aggregate([
      {
        $group: {
          _id: '$priority',
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

    const avgScore = await Form.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$score' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        byStatus: stats,
        byPriority: priorityStats,
        total: totalLeads,
        today: todayLeads,
        avgScore: avgScore[0]?.avgScore || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching lead statistics" });
  }
};