import Event from "../models/EventsModel.js";
import { uploadToCloudinary, cloudinaryDelete } from "../utils/cloudinaryUpload.js";
import asyncHandler from "express-async-handler";

// Create Event
export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, date, location } = req.body;

  if (!title || !description || !date || !location) {
    res.status(400);
    throw new Error("All required fields must be provided");
  }

  // Handle single image upload
  let imageUrl = "";
  if (req.file) {
    imageUrl = await uploadToCloudinary(req.file.buffer, "events");
  } else {
    res.status(400);
    throw new Error("Please upload an image for the event");
  }

  const event = await Event.create({
    title,
    description,
    date,
    location,
    image: imageUrl,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, message: "Event created successfully", event });
});

// Update Event
export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, date, location } = req.body;

  const event = await Event.findById(id);
  if (!event) {
    res.status(404);
    throw new Error("Event not found");
  }

  // Replace image if uploaded
  if (req.file) {
    if (event.image?.includes("res.cloudinary.com")) {
      const publicId = event.image.split("/").pop().split(".")[0];
      await cloudinaryDelete(publicId);
    }
    event.image = await uploadToCloudinary(req.file.buffer, "events");
  }

  event.title = title || event.title;
  event.description = description || event.description;
  event.date = date || event.date;
  event.location = location || event.location;

  const updatedEvent = await event.save();
  res.status(200).json({ success: true, message: "Event updated successfully", event: updatedEvent });
});


/* ============================================================
   GET ALL EVENTS
============================================================ */
export const getAllEvents = asyncHandler(async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, events });
});

/* ============================================================
   GET EVENT BY ID
============================================================ */
export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404);
    throw new Error("Event not found");
  }
  res.status(200).json({ success: true, event });
});



/* ============================================================
   DELETE EVENT (Admin only)
============================================================ */
export const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    res.status(404);
    throw new Error("Event not found");
  }

  if (event.image?.includes("res.cloudinary.com")) {
    const publicId = event.image.split("/").pop().split(".")[0];
    await cloudinaryDelete(publicId);
  }

  await event.deleteOne();

  res.status(200).json({ success: true, message: "Event deleted successfully" });
});
