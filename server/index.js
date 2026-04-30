require("dotenv").config({ path: __dirname + "/src/.env" });
const app = require("./src/app");
const connectDB = require("./src/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});