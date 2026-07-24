const mongoose = require('mongoose');
const dns = require('dns');

// Node's `mongodb+srv://` SRV lookup uses c-ares, which on Windows can fail
// with `querySrv ECONNREFUSED` when the OS DNS server is IPv6 (e.g. some ISP
// routers). Force a reliable public resolver so the SRV lookup succeeds.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async (retries = 5, delayMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(
        `MongoDB connection error (attempt ${attempt}/${retries}):`,
        error.message
      );
      if (attempt === retries) {
        console.error('Exhausted MongoDB connection retries. Exiting.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

module.exports = connectDB;
