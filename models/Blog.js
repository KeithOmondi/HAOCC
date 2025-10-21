import mongoose from "mongoose";
import slugify from "slugify";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
    },
    author: {
      type: String,
      default: "Admin",
    },
    image: {
      type: String,
      required: [true, "Blog image is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Auto-generate slug before save
blogSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
