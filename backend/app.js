const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
console.log("Environment loaded successfully.");


const express = require("express");//express import
const mongoose = require("mongoose");//mongoose import
const app = express();//express app init
const engine = require("ejs-mate");//ye wla add kr ejs ko layout support krwa rha h
const methodOverride = require("method-override");//
const ExpressError = require("./utils/Expresserr");
const sessions = require("express-session")
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingsRouter = require("./routes/listing.js");//listing routes import
const reviewsRouter = require("./routes/review.js");//review routes import
const userRouter = require("./routes/user.js");
const wishlistRouter = require("./routes/wishlist.js");
const bookingRouter = require("./routes/booking.js");
const notificationRouter = require("./routes/notification.js");
const messageRouter = require("./routes/message.js");
const adminRouter = require("./routes/admin.js");
const Notification = require("./models/notification.js");


app.use(methodOverride('_method'));//method override middleware
app.set("view engine", "ejs");//ejs set as view engine kammand
app.set("views", path.join(__dirname, "../frontend/views"));// ye line views folder ka path set kr rha h
app.use(express.static(path.join(__dirname, "../frontend/public")));//static files k liye public folder set kr rha h
app.use(express.urlencoded({ extended: true }));// ye middleware form data ko read krne k liye h
app.use(express.json()); // JSON body parser for AJAX
app.engine("ejs", engine);//ye line ejs-mate ko use krne k liye h

// Trust reverse proxy (e.g. Render, Cloudflare, Heroku load balancers)
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";

const dbUrl = process.env.ATLAS_URI;

main().then((res) => {
    console.log("The mongoose dB connected");
}).catch(err => {
    console.log(err);
});
async function main() {
    await mongoose.connect(dbUrl);
};

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
});
store.on("error", function (e) {
    console.log("Session store error", e);
});

const sessionOptions = {
    store: store,
    secret: process.env.SECRET || "mysecrethasini",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 3,
        maxAge: 1000 * 60 * 60 * 24 * 3,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction
    },
};




app.use(sessions(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use(async (req, res, next) => {   // middle ware for the flash
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.curruser = req.user;  // may be you thinking about user in passport user information is strong 
    res.locals.currUser = req.user;
    res.locals.MAP_TOKEN = process.env.MAP_TOKEN;
    res.locals.currentPath = req.path;
    res.locals.isWishlisted = (listingId) => {
        if (!req.user || !req.user.wishlist || !listingId) return false;
        return req.user.wishlist.some(id => id.toString() === listingId.toString());
    };

    res.locals.unreadNotificationCount = 0;
    if (req.user) {
        try {
            res.locals.unreadNotificationCount = await Notification.countDocuments({
                user: req.user._id,
                isRead: false
            });
        } catch (err) {
            console.error("Notification count fetch error:", err);
        }
    }

    next();
})

if (process.env.NODE_ENV !== "production") {
    app.get("/demouser", async (req, res) => {
        let fakeuser = new User({
            email: "dnsd@gmail.com",
            username: "delta-IRH",
        });
        let registerUser = await User.register(fakeuser, "helloworld");
        res.send(registerUser);
    });
}







app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingsRouter);//listing routes use kr rha h
app.use("/listings/:id/reviews", reviewsRouter);//review routes use kr rha h
app.use("/wishlist", wishlistRouter);
app.use("/bookings", bookingRouter);
app.use("/notifications", notificationRouter);
app.use("/messages", messageRouter);
app.use("/admin", adminRouter);
app.use("/", userRouter);




//test

// app.get("/testing", async (req, res) => {
//     let firstinsert = listing({
//         title: "Are you ready...",
//         description: "You will do well",
//         price: 2000,
//         location: "Nellore",
//         country: "India",
//     });
//     await firstinsert.save().then((res) => {
//         console.log(res);
//     }).catch(err => {
//         console.log(err);
//     });
//     res.send("hey....");
// });
app.use((req, res, next) => {
    next(new ExpressError("Page is not found", 404));

});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;

    if (res.headersSent) {
        return next(err);   // ✅ prevents crash
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
        return res.status(statusCode).json({ success: false, message });
    }

    res.status(statusCode).render("err.ejs", { message });
});
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`server is working on port ${port}`);
});