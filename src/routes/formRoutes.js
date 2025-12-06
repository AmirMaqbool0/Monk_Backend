import express from "express";
import {  
  startForm, 
  saveStep, 
  submitForm,
  getFormData, 
  getUserForms,
  getAllLeads,
  updateLeadStatus,
  getLeadStats,
  getLeadAnalytics,
  trackWhatsAppOpen
} from "../controllers/formController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// User routes
router.post("/start", startForm);
router.post("/save", upload.array('files', 5), saveStep);
router.post("/submit", submitForm);
router.post("/track-whatsapp", trackWhatsAppOpen);
router.get("/data", getFormData);
router.get("/user-forms", getUserForms);

// Admin routes
router.get("/admin/leads", getAllLeads);
router.get("/admin/analytics", getLeadAnalytics);
router.patch("/admin/leads/:leadId/status", updateLeadStatus);
router.get("/admin/stats", getLeadStats);

export default router;