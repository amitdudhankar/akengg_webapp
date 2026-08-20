const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const path = require("path");

const blogRoutes = require("./routes/blog.routes");
const contactRoutes = require("./routes/contact.routes");
const userRoutes = require("./routes/user.routes");
const serviceRoutes = require("./routes/service.routes");
const projectRoutes = require("./routes/project.routes");
const industryRoutes = require("./routes/industry.routes");
const industryStatRoutes = require("./routes/industryStat.routes");
const testimonialRoutes = require("./routes/testimonial.routes");
const teamRoutes = require("./routes/team.routes");
const newsletterRoutes = require("./routes/newsletter.routes");
const settingRoutes = require("./routes/setting.routes");
const sellerProfileRoutes = require("./routes/sellerProfile.routes");
const partyRoutes = require("./routes/party.routes");
const itemCatalogRoutes = require("./routes/itemCatalog.routes");
const documentRoutes = require("./routes/document.routes");
const leadRoutes = require("./routes/lead.routes");
const followupRoutes = require("./routes/followup.routes");
const reportRoutes = require("./routes/report.routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

const corsOptions = {
  origin(origin, callback) {
    console.log("CORS Origin:", origin);
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("combined"));
app.use(compression());

app.use("/blog-images", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.static(path.join(__dirname, "public/blog_images")));

// Generic uploads (services, projects, team, …). Storage-driver aware: when
// STORAGE_DRIVER=s3 these are served by S3/CDN instead and this route is unused.
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.static(path.join(__dirname, "public/uploads")));

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/contacts", contactRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/industries", industryRoutes);
app.use("/api/v1/industry-stats", industryStatRoutes);
app.use("/api/v1/testimonials", testimonialRoutes);
app.use("/api/v1/team", teamRoutes);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/settings", settingRoutes);
app.use("/api/v1/seller-profile", sellerProfileRoutes);
app.use("/api/v1/parties", partyRoutes);
app.use("/api/v1/item-catalog", itemCatalogRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/followups", followupRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use(errorHandler);

module.exports = app;
