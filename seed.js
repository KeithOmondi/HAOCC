import mongoose from "mongoose";
import Category from "./models/categoryModel.js";

// Direct MongoDB URI (make sure the password is correct, no extra dot)
const MONGO_URI =
  "mongodb+srv://kdomondi1_db_user:keith.@cluster0.453fhwz.mongodb.net/ZenMart?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI) // no options needed
  .then(() => console.log("✅ MongoDB connected for seeding"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// --- categories data ---
const categoriesTop = [
  {
    name: "Fresh Fruits",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/3041/yIbH5Twy3OnnUDFawjMqpwkW8PMBs7UWrgQRpOZv.jpg",
    subCategories: ["Tropical Fruits", "Temperate Fruits"],
  },
  {
    name: "Vegetables",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/9268/Fresh%20Cabbage.jpg",
    subCategories: ["Root Vegetables", "Leafy Greens"],
  },
  {
    name: "Dairy & Eggs",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/539/Brookside%20Probiotic%20Strawberry%20450%20g.jpg",
    subCategories: ["Cheese", "Eggs"],
  },
  {
    name: "Bakery",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/11700/Joy%20Super%20Family%20Cake%20750g.jpg",
    subCategories: ["Bread", "Cakes"],
  },
  {
    name: "Meat & Fish",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/5444/Farmers%20Choice%20Beef%20Bacon%20200Gm.jpg",
    subCategories: ["Poultry", "Red Meat", "Seafood"],
  },
];

const categoriesBottom = [
  {
    name: "Beverages",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/5109/Afia%20Fruit%20Drink%20Apple%20300ml.jpg",
    subCategories: ["Soft Drinks", "Juices", "Coffee & Tea"],
  },
  {
    name: "Snacks",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/10916/Manji%20Choco%20Chip%20Cookies%20500g.jpg",
    subCategories: ["Chips & Crisps", "Biscuits", "Chocolate"],
  },
  {
    name: "Frozen Foods",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/6110/AlS%20Kitchen%20Beef%20Spring%20Roll%205%20Pieces.jpg",
    subCategories: ["Frozen Desserts", "Frozen Vegetables"],
  },
  {
    name: "Household",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/26094/Prolite-Fancy-Candle-Tivoli-Small-White-12-Pcs-1632684459.webp",
    subCategories: ["Cleaning Supplies", "Tissues & Towels"],
  },
  {
    name: "Personal Care",
    image:
      "https://d16zmt6hgq1jhj.cloudfront.net/product/5190/Ju2dRG5b9OhNDOyygoAyVx5rF1SlCBpsOTwKdHQr.png",
    subCategories: ["Hair Care", "Oral Care", "Bath & Body"],
  },
];

const importData = async () => {
  try {
    await Category.deleteMany(); // clear existing
    await Category.insertMany([...categoriesTop, ...categoriesBottom]);
    console.log("✅ Categories Seeded");
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding:", error);
    process.exit(1);
  }
};

importData();
