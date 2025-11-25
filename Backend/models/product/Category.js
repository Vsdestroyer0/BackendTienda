import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    type: { type: String, default: "calzado" },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
