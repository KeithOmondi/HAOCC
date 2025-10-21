import asyncHandler from "express-async-handler";
import Blog from "../models/Blog.js";
import { uploadToCloudinary, cloudinaryDelete } from "../utils/cloudinaryUpload.js";

/* ========================================================
   📝 Create Blog
======================================================== */
export const createBlog = asyncHandler(async (req, res) => {
  const { title, content, author } = req.body;

  if (!title || !content) {
    res.status(400);
    throw new Error("Title and content are required");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("Please upload an image for the blog");
  }

  // Upload image
  const uploaded = await uploadToCloudinary(req.file.buffer, "blogs");

  const blog = await Blog.create({
    title,
    content,
    author: author || "Admin",
    image: uploaded?.secure_url || uploaded,
    createdBy: req.user?._id,
  });

  res.status(201).json({
    success: true,
    message: "Blog created successfully",
    blog,
  });
});

/* ========================================================
   📚 Get All Blogs
======================================================== */
export const getAllBlogs = asyncHandler(async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, blogs });
});

/* ========================================================
   📄 Get Blog By ID
   @route   GET /api/blogs/get/:id
   @access  Public
======================================================== */
export const getBlogById = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    res.status(404);
    throw new Error("Blog not found");
  }

  res.status(200).json({ success: true, blog });
});

/* ========================================================
   ✏️ Update Blog
======================================================== */
export const updateBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) {
    res.status(404);
    throw new Error("Blog not found");
  }

  let imageUrl = blog.image;

  if (req.file) {
    // Delete old image if it exists
    if (blog.image) await cloudinaryDelete(blog.image);
    const uploaded = await uploadToCloudinary(req.file.buffer, "blogs");
    imageUrl = uploaded?.secure_url || uploaded;
  }

  blog.title = req.body.title || blog.title;
  blog.content = req.body.content || blog.content;
  blog.author = req.body.author || blog.author;
  blog.image = imageUrl;

  const updatedBlog = await blog.save();

  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    blog: updatedBlog,
  });
});

/* ========================================================
   🗑️ Delete Blog
======================================================== */
export const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) {
    res.status(404);
    throw new Error("Blog not found");
  }

  if (blog.image) await cloudinaryDelete(blog.image);
  await blog.deleteOne();

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully",
  });
});
