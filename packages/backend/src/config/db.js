const mongoose = require('mongoose');

// mongodb+srv:// needs a DNS SRV lookup, which some routers'/ISPs' resolvers
// mishandle even though they resolve normal A/AAAA records fine (Node's
// resolver hits this differently than the OS's). dns-fix points Node at
// public DNS so the SRV lookup doesn't depend on the local network's resolver.
require('../dns-fix');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);  // Exit the whole program if database fails
  }
};

module.exports = connectDB;