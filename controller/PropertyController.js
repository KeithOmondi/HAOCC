// src/controller/PropertyController.js
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddlewares.js"; // Note: Changed to common ErrorHandler usage
import Property from "../models/Property.js";
import Category from "../models/Category.js";
import { uploadToCloudinary, cloudinaryDelete } from "../utils/cloudinaryUpload.js";
import shortid from "shortid";
import cloudinary from "../utils/cloudinary.js";

/* ============================================================
   🏡 CREATE PROPERTY
============================================================ */
export const createProperty = catchAsyncErrors(async (req, res, next) => {
  const { title, description, price, category } = req.body;

  // Parse location JSON string
  let locationData;
  try {
    locationData = JSON.parse(req.body.location);
  } catch (e) {
    return next(new ErrorHandler("Invalid location data format.", 400));
  }

  const { address, city } = locationData;

  if (!title || !description || !price || !address || !city || !category) {
    return next(new ErrorHandler("Please fill in all required fields.", 400));
  }

  const categoryDoc = await Category.findOne({
    $or: [{ _id: category }, { slug: category }],
  });
  if (!categoryDoc) {
    return next(new ErrorHandler("Invalid category.", 404));
  }

  /* ---------- Upload images to Cloudinary ---------- */
  const imageUploads = [];
  if (req.files && req.files.images && req.files.images.length > 0) {
    for (const file of req.files.images) {
      const base64String = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const uploaded = await cloudinary.uploader.upload(base64String, {
        folder: "properties",
      });
      imageUploads.push({ url: uploaded.secure_url });
    }
  }

  /* ---------- Create property with generated propertyId ---------- */
  const property = await Property.create({
    title,
    description,
    price,
    location: locationData,
    images: imageUploads,
    category: categoryDoc._id,
    listedBy: req.user._id,
    propertyId: `R${shortid.generate().toUpperCase()}`,
  });

  res.status(201).json({
    success: true,
    message: "Property created successfully.",
    property: {
      _id: property._id,
      propertyId: property.propertyId,
      title: property.title,
      slug: property.slug,
      price: property.price,
      images: property.images,
    },
  });
});


/* ============================================================
   📋 GET ALL PROPERTIES (with filters)
============================================================ */
export const getAllProperties = catchAsyncErrors(async (req, res, next) => {
  const {
    location,
    minPrice,
    maxPrice,
    search,
    status,
    featured,
    category,
    page = 1,
    limit = 12,
  } = req.query;

  const query = { approved: true };

  if (location) query.location = new RegExp(location, "i");
  if (status) query.status = status;
  if (featured) query.isFeatured = featured === "true";
  if (minPrice || maxPrice)
    query.price = {
      ...(minPrice && { $gte: Number(minPrice) }),
      ...(maxPrice && { $lte: Number(maxPrice) }),
    };
  if (search) query.$text = { $search: search };

  // Category filter
  if (category) {
    const categoryDoc = await Category.findOne({
      $or: [{ _id: category }, { slug: category }],
    });
    if (categoryDoc) query.category = categoryDoc._id;
  }

  const skip = (page - 1) * limit;
  const total = await Property.countDocuments(query);

  const properties = await Property.find(query)
    .populate("listedBy", "name email")
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    count: properties.length,
    page: Number(page),
    pages: Math.ceil(total / limit),
    properties,
  });
});


/* ============================================================
   🔍 GET SINGLE PROPERTY
============================================================ */
export const getSingleProperty = catchAsyncErrors(async (req, res) => {
  const { idOrSlug } = req.params;

  let property;

  // Check if idOrSlug is a valid Mongo ObjectId
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

  if (isObjectId) {
    property = await Property.findById(idOrSlug)
      .populate("category", "name")
      .populate("listedBy", "name email");
  } else {
    property = await Property.findOne({ slug: idOrSlug })
      .populate("category", "name")
      .populate("listedBy", "name email");
  }

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found",
    });
  }

  res.status(200).json({
    success: true,
    property,
  });
});


/* ============================================================
   🧾 ADMIN: GET ALL PROPERTIES (No filters, shows all)
============================================================ */
export const getAllPropertiesAdmin = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Access denied. Admins only.", 403));
  }

  const properties = await Property.find()
    .populate("listedBy", "name email")
    .populate("category", "name slug")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    total: properties.length,
    properties,
  });
});

/* ============================================================
   ✏️ UPDATE PROPERTY
============================================================ */
export const updateProperty = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const property = await Property.findById(id);

  if (!property) {
    return next(new ErrorHandler("Property not found.", 404));
  }

  // Authorization Check
  if (
    property.listedBy.toString() !== req.user._id.toString() &&
    req.user.role !== "Admin"
  ) {
    return next(
      new ErrorHandler("Not authorized to update this property.", 403)
    );
  }

  // 🔹 Validate category if updating
  if (req.body.category) {
    const categoryDoc = await Category.findOne({
      $or: [{ _id: req.body.category }, { slug: req.body.category }],
    });
    if (!categoryDoc) {
      return next(new ErrorHandler("Invalid category.", 404));
    }
    req.body.category = categoryDoc._id;
  }

  // 🖼️ Replace images if new ones uploaded
  if (req.files && req.files.images) {
    // 1. Delete old images
    for (const img of property.images) {
      await cloudinaryDelete(img.public_id);
    }

    // 2. Upload new images
    const files = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    const newImages = [];
    for (const file of files) {
      const result = await uploadToCloudinary(file.path, "properties");
      newImages.push({ public_id: result.public_id, url: result.secure_url });
    }

    req.body.images = newImages;
  }

  // 3. Update property
  const updated = await Property.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("listedBy", "name email")
    .populate("category", "name slug");

  res.status(200).json({
    success: true,
    message: "Property updated successfully.",
    property: updated,
  });
});

/* ============================================================
   ❌ DELETE PROPERTY
============================================================ */
export const deleteProperty = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const property = await Property.findById(id);

  if (!property) {
    return next(new ErrorHandler("Property not found.", 404));
  }

  // Authorization Check
  if (
    property.listedBy.toString() !== req.user._id.toString() &&
    req.user.role !== "Admin"
  ) {
    return next(
      new ErrorHandler("Not authorized to delete this property.", 403)
    );
  }

  // Delete images from Cloudinary
  for (const img of property.images) {
    await cloudinaryDelete(img.public_id);
  }

  await property.deleteOne();

  res.status(200).json({
    success: true,
    message: "Property deleted successfully.",
  });
});

/* ============================================================
   🧾 ADMIN: APPROVE OR REJECT PROPERTY
============================================================ */
export const updatePropertyApproval = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { approved } = req.body;

  const property = await Property.findById(id);
  if (!property) {
    return next(new ErrorHandler("Property not found.", 404));
  }
  
  // Ensure 'approved' is a boolean
  if (typeof approved !== 'boolean') {
      return next(new ErrorHandler("Approval status must be a boolean (true/false).", 400));
  }

  property.approved = approved;
  await property.save();

  res.status(200).json({
    success: true,
    message: approved
      ? "Property approved successfully."
      : "Property unapproved.",
    property,
  });
});