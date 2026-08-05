const mongoose = require("mongoose");
const uri = "mongodb://asamnew1221_db_user:tcX8JMeIOkWDmyma@ac-oqtwm3p-shard-00-00.ruaiiuq.mongodb.net:27017,ac-oqtwm3p-shard-00-01.ruaiiuq.mongodb.net:27017,ac-oqtwm3p-shard-00-02.ruaiiuq.mongodb.net:27017/emare?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("Successfully connected to MongoDB Atlas!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection failed:");
    console.error(err);
    process.exit(1);
  });
