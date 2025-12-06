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

const utmSchema = new mongoose.Schema({
  source: String,
  medium: String,
  campaign: String,
  term: String,
  content: String
});

const formSchema = new mongoose.Schema(
  {
    userToken: { type: String, required: true },
    currentStep: { type: Number, default: 0 },
    
    // Lead Core Information
    fullName: String,
    email: String,
    phone: String,
    consent: { type: Boolean, default: false },
    
    // Project Information
    vision: [String],
    budgetPlan: String,
    timeline: String,
    targetDate: Date,
    
    // Detailed Project Information
    bigIdea: String,
    audience: String,
    problem: String,
    references: String,
    mustHaves: String,
    files: [fileSchema],

    // UTM & Tracking
    source: { 
      type: String, 
      enum: ['Direct', 'Google', 'Referral', 'Fiverr', 'Social', 'Other'],
      default: 'Direct'
    },
    utm: utmSchema,
    userAgent: String,
    ipAddress: String,
    country: String,

    // Derived Tags (for slicing)
    derivedTags: {
      channel: String,
      projectType: [String],
      commerce: [String],
      ai: [String],
      stackHints: [String],
      budgetTier: String,
      urgency: String,
      region: String,
      prioritySignals: [String]
    },

    // Scoring & Prioritization
    score: { type: Number, default: 0 },
    priority: { type: String, enum: ['Hot', 'Warm', 'Nurture'], default: 'Nurture' },
    
    // Lead Management
    status: { 
      type: String, 
      enum: ['Pending', 'Contacted', 'Qualified', 'Converted', 'Rejected'],
      default: 'Pending' 
    },
    leadNumber: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now },
    adminNotes: String,
    isCompleted: { type: Boolean, default: false },

    // Analytics
    analyticsEvents: [{
      event: String,
      step: Number,
      field: String,
      value: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Add indexes for better query performance
formSchema.index({ userToken: 1, leadNumber: 1 });
formSchema.index({ status: 1 });
formSchema.index({ submittedAt: -1 });
formSchema.index({ score: -1 });
formSchema.index({ priority: 1 });
formSchema.index({ 'derivedTags.channel': 1 });
formSchema.index({ 'derivedTags.projectType': 1 });

// SIMPLIFIED Pre-save middleware - ALWAYS calculate score and tags
formSchema.pre('save', function(next) {
  // Always calculate score and tags on every save
  this.calculateScore();
  this.generateDerivedTags();
  next();
});

// Enhanced Score calculation method
formSchema.methods.calculateScore = function() {
  let score = 0;
  
  console.log('=== CALCULATING SCORE ===');
  console.log('Budget:', this.budgetPlan);
  console.log('Vision:', this.vision);
  console.log('Timeline:', this.timeline);
  console.log('Big Idea:', this.bigIdea);
  console.log('Must Haves:', this.mustHaves);
  
  // Budget Tier scoring
  if (['8-12k', '12k+'].includes(this.budgetPlan)) {
    score += 3;
    console.log('✅ +3 for budget:', this.budgetPlan);
  } else if (this.budgetPlan === '4-8k') {
    score += 1;
    console.log('✅ +1 for mid-range budget:', this.budgetPlan);
  } else {
    console.log('❌ 0 for budget:', this.budgetPlan);
  }
  
  // Project Type scoring - Marketplace, WebSaaS
  const premiumProjectTypes = ['ecommerce', 'webapp'];
  const hasPremiumProject = this.vision && this.vision.some(type => premiumProjectTypes.includes(type));
  
  if (hasPremiumProject) {
    score += 2;
    console.log('✅ +2 for premium project type:', this.vision);
  } else {
    console.log('❌ 0 for project type:', this.vision);
  }
  
  // Urgency scoring
  if (this.timeline === '2-4w') {
    score += 1;
    console.log('✅ +1 for urgent timeline:', this.timeline);
  } else {
    console.log('❌ 0 for timeline:', this.timeline);
  }
  
  // Combine all text for keyword detection
  const allText = [
    this.bigIdea?.toLowerCase() || '',
    this.mustHaves?.toLowerCase() || '',
    this.audience?.toLowerCase() || '',
    this.problem?.toLowerCase() || '',
    this.references?.toLowerCase() || ''
  ].join(' ');

  console.log('All text for analysis:', allText);

  // AI/MultiTenant/SSO scoring - ENHANCED DETECTION
  const hasAI = /ai|automation|gpt|chatgpt|rag|llm|machine learning|ml|bot|chatbot/i.test(allText);
  const hasMultiTenant = /multi-tenant|multi tenant|saas|platform|b2b/i.test(allText);
  const hasSSO = /sso|single sign|oauth|auth|authentication/i.test(allText);
  
  if (hasAI || hasMultiTenant || hasSSO) {
    score += 1;
    console.log('✅ +1 for AI/MultiTenant/SSO - AI:', hasAI, 'MultiTenant:', hasMultiTenant, 'SSO:', hasSSO);
  } else {
    console.log('❌ 0 for AI/MultiTenant/SSO');
  }
  
  // Payments scoring - ENHANCED DETECTION
  const hasPayments = /payment|stripe|razorpay|wallet|payout|billing|subscription|transaction/i.test(allText);
  
  if (hasPayments) {
    score += 1;
    console.log('✅ +1 for payments');
  } else {
    console.log('❌ 0 for payments');
  }
  
  // Penalties
  if (this.budgetPlan === 'unsure' && this.timeline === 'unsure') {
    score -= 2;
    console.log('⚠️ -2 for unsure budget and timeline');
  }
  
  this.score = Math.max(0, score);
  console.log('🎯 FINAL SCORE:', this.score);
  
  // Set priority based on score
  if (this.score >= 7) {
    this.priority = 'Hot';
  } else if (this.score >= 4) {
    this.priority = 'Warm';
  } else {
    this.priority = 'Nurture';
  }
  console.log('🏷️ PRIORITY:', this.priority);
  console.log('=== SCORE CALCULATION COMPLETE ===');
};

// Enhanced Derived tags generation
formSchema.methods.generateDerivedTags = function() {
  const tags = {
    channel: this.source,
    projectType: [],
    commerce: [],
    ai: [],
    stackHints: [],
    budgetTier: this.budgetPlan === 'unsure' ? 'Unknown' : this.budgetPlan,
    urgency: this.timeline === 'unsure' ? 'Unknown' : this.timeline,
    region: this.country,
    prioritySignals: []
  };

  console.log('=== GENERATING DERIVED TAGS ===');
  console.log('Vision:', this.vision);

  // Project Type mapping
  const projectTypeMap = {
    'mobile': 'MobileApp',
    'webapp': 'WebSaaS', 
    'ecommerce': 'Marketplace',
    'dashboard': 'Dashboard',
    'ai': 'AI',
    'UI/UX': 'UIUX',
    'brnadlogo': 'BrandLogo',
    'marketing&seo': 'MarketingSEO',
    'chatbots': 'Chatbot',
    'landingpage': 'LandingPage',
    'contentOPS': 'ContentOps',
    'maintenance': 'Maintenance'
  };

  if (this.vision && this.vision.length > 0) {
    tags.projectType = this.vision.map(v => {
      const mapped = projectTypeMap[v];
      console.log(`Mapping ${v} to ${mapped}`);
      return mapped || v;
    });
  }

  // Combine all text for better keyword detection
  const allText = [
    this.bigIdea?.toLowerCase() || '',
    this.mustHaves?.toLowerCase() || '',
    this.audience?.toLowerCase() || '',
    this.problem?.toLowerCase() || '',
    this.references?.toLowerCase() || ''
  ].join(' ');

  console.log('All text for keyword detection:', allText);

  // Enhanced Commerce features detection
  const commerceKeywords = {
    'SingleVendor': ['single vendor', 'single-vendor', 'single seller'],
    'MultiVendor': ['multi vendor', 'multi-vendor', 'marketplace', 'ecommerce', 'multiple sellers'],
    'Subscriptions': ['subscription', 'recurring', 'monthly', 'yearly', 'recurring payment'],
    'WalletPayouts': ['wallet', 'payout', 'payment', 'money transfer', 'digital wallet']
  };

  Object.entries(commerceKeywords).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => allText.includes(keyword))) {
      tags.commerce.push(tag);
      console.log(`✅ Added commerce tag: ${tag}`);
    }
  });

  // Enhanced AI features detection
  const aiKeywords = {
    'RAG': ['rag', 'retrieval', 'vector', 'embedding'],
    'OpenAI': ['openai', 'gpt', 'chatgpt', 'llm', 'language model'],
    'BotSupport': ['bot', 'chatbot', 'support bot', 'assistant', 'virtual agent'],
    'Automation': ['automation', 'automate', 'workflow', 'process', 'auto']
  };

  Object.entries(aiKeywords).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => allText.includes(keyword))) {
      tags.ai.push(tag);
      console.log(`✅ Added AI tag: ${tag}`);
    }
  });

  // If vision includes 'ai', always add AI tag
  if (this.vision && this.vision.includes('ai') && !tags.ai.includes('AI')) {
    tags.ai.push('AI');
    console.log('✅ Added AI tag from vision');
  }

  // Enhanced Stack hints detection
  const stackKeywords = {
    'Flutter': ['flutter', 'mobile app', 'cross-platform', 'dart'],
    'NextJS': ['nextjs', 'next.js', 'react', 'frontend', 'vercel'],
    'Node': ['node', 'node.js', 'express', 'backend', 'server'],
    'Stripe': ['stripe', 'payment processing', 'stripe api'],
    'Razorpay': ['razorpay', 'payment gateway', 'razorpay api'],
    'SSO': ['sso', 'single sign', 'oauth', 'auth0', 'authentication'],
    'RBAC': ['rbac', 'role', 'permission', 'access control', 'user role'],
    'Multilingual': ['multi language', 'multilingual', 'translation', 'localization', 'i18n']
  };

  Object.entries(stackKeywords).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => allText.includes(keyword))) {
      tags.stackHints.push(tag);
      console.log(`✅ Added stack hint: ${tag}`);
    }
  });

  // Enhanced Priority signals detection
  const prioritySignals = {
    'Enterprise': ['enterprise', 'corporation', 'b2b', 'business', 'corporate'],
    'MultiTenant': ['multi-tenant', 'multi tenant', 'saas', 'platform', 'software as a service'],
    'SLA': ['sla', 'service level', 'support', 'maintenance', 'guarantee'],
    'Analytics': ['analytics', 'dashboard', 'reporting', 'metrics', 'insights'],
    'Payments': ['payment', 'billing', 'subscription', 'revenue', 'monetization']
  };

  Object.entries(prioritySignals).forEach(([signal, keywords]) => {
    if (keywords.some(keyword => allText.includes(keyword))) {
      tags.prioritySignals.push(signal);
      console.log(`✅ Added priority signal: ${signal}`);
    }
  });

  this.derivedTags = tags;
  console.log('🎯 FINAL DERIVED TAGS:', tags);
  console.log('=== TAGS GENERATION COMPLETE ===');
};

export default mongoose.model("Form", formSchema);