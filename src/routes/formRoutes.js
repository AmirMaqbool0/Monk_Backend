import express from "express";
import {  startForm, 
  saveStep, 
  getFormData, 
  getUserForms,
  getAllLeads,
  updateLeadStatus,
  getLeadStats } from "../controllers/formController.js";
import upload from "../middleware/upload.js";
const router = express.Router();

// User routes
router.post("/start", startForm);
router.post("/save", upload.array('files', 5), saveStep);
router.get("/data", getFormData);
router.get("/user-forms", getUserForms); // Get all forms 

// Admin routes
router.get("/admin/leads", getAllLeads);
router.patch("/admin/leads/:leadId/status", updateLeadStatus);
router.get("/admin/stats", getLeadStats);

export default router;
