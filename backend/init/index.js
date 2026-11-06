const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/list.js");
main().then((res) => {
    console.log("The mongoose dB connected");
}).catch(err => {
    console.log(err);
});
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/wunderlust');
};
const initDB = async () => {
    await Listing.deleteMany({});
    initdata.data = initdata.data.map((obj) => ({ ...obj, owner: "6998cdb42946a7e4f38cb338" }));  //insert the onwer
    await Listing.insertMany(initdata.data);
    console.log("data is initialized");
};
initDB();

