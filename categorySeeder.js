import mongoose from "mongoose";
import slugify from "slugify";
import Category from "./models/Category.js";

// 🔗 Direct connection string (replace with your actual DB URI)
const MONGO_URI = "mongodb+srv://kdomondi1_db_user:keith.@cluster0.wojldms.mongodb.net/HAOC?retryWrites=true&w=majority&appName=Cluster0"; 
// or if using MongoDB Atlas:
// const MONGO_URI = "mongodb+srv://<username>:<password>@cluster0.mongodb.net/land_management_system";

const categories = [
  // 🏠 Residential
  { name: "Apartment", type: "Residential" },
  { name: "Bungalow", type: "Residential" },
  { name: "Mansion", type: "Residential" },
  { name: "Villa", type: "Residential" },
  { name: "Townhouse", type: "Residential" },
  { name: "Studio", type: "Residential" },
  { name: "Bedsitter", type: "Residential" },
  { name: "Hostel / Shared Accommodation", type: "Residential" },

  // 🏢 Commercial
  { name: "Office Space", type: "Commercial" },
  { name: "Retail Shop", type: "Commercial" },
  { name: "Restaurant / Café", type: "Commercial" },
  { name: "Hotel / Lodge", type: "Commercial" },
  { name: "Co-working Space", type: "Commercial" },

  // 🏭 Industrial
  { name: "Warehouse", type: "Industrial" },
  { name: "Factory", type: "Industrial" },
  { name: "Workshop", type: "Industrial" },
  { name: "Cold Storage", type: "Industrial" },

  // 🌾 Land
  { name: "Residential Land", type: "Land" },
  { name: "Commercial Land", type: "Land" },
  { name: "Agricultural Land", type: "Land" },
  { name: "Industrial Land", type: "Land" },
  { name: "Mixed-use Land", type: "Land" },
  { name: "Plot", type: "Land" },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🗄️ Connected to MongoDB");

    await Category.deleteMany();

    const formatted = categories.map((c) => ({
      ...c,
      slug: slugify(c.name, { lower: true }),
    }));

    await Category.insertMany(formatted);
    console.log("✅ Categories seeded successfully");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding categories:", err.message);
    process.exit(1);
  }
};

seedCategories();
