import express from "express";
import {
  getCareers,
  createCareer,
  getCareerById,
  updateCareer,
  deleteCareer,
} from "../controller/careerController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/get", getCareers);
router.post("/create" ,isAuthenticated, isAuthorized("Admin"), createCareer);
  
  router.get("/get/:id", getCareerById)
  router.put("/update", isAuthenticated, isAuthorized("Admin"), updateCareer)
  router.delete("/delete",isAuthenticated, isAuthorized("Admin"), deleteCareer);

export default router;
