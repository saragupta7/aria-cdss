require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const Patient = require('./models/Patient');
  const p = await Patient.findOne();
  console.log(JSON.stringify(p, null, 2));
  process.exit(0);
}
check();
