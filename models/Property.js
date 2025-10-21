import mongoose from "mongoose";
import slugify from "slugify";
import shortid from "shortid";

/* ============================================================
   🏡 PROPERTY SCHEMA
============================================================ */
const propertySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      unique: true,
      default: () => `R${shortid.generate().toUpperCase()}`,
    },

    title: {
      type: String,
      required: [true, "Please enter a property title."],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters."],
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, "Please provide a property description."],
      trim: true,
      minlength: [20, "Description should be at least 20 characters long."],
    },

    price: {
      type: Number,
      required: [true, "Please enter the property price."],
    },

    location: { 
      type: {
        address: {
          type: String,
          required: [true, "Property address is required."],
          trim: true,
        },
        city: {
          type: String,
          required: [true, "Property city is required."],
          trim: true,
        },
      },
      required: true
    }, 

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please select a category."],
    },

    images: [
      {
        public_id: String,
        url: String,
      },
    ],

    videos: [
      {
        public_id: String,
        url: String,
      },
    ],

    status: {
      type: String,
      enum: ["Available", "Pending", "Sold", "Rented"],
      default: "Available",
    },

    listedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    views: {
      type: Number,
      default: 0,
    },

    approved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* ============================================================
   🔁 SLUGIFY TITLE BEFORE SAVE
============================================================ */
propertySchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

/* ============================================================
   ⚡ INDEXES FOR PERFORMANCE
============================================================ */
propertySchema.index({
  title: "text",
  description: "text",
  'location.address': "text",
  'location.city': "text",
});

const Property = mongoose.model("Property", propertySchema);
export default Property;
