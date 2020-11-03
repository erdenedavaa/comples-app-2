const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const flash = require("connect-flash");
const app = express();

let sessionOptions = session({
  secret: "Javasript is soooooooo cooooool",
  // default aar session ni memory-d save hiigddeg.
  // yyniig doorh baidlaar overwrite hiine
  store: new MongoStore({ client: require("./db") }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
});

app.use(sessionOptions);
app.use(flash());

app.use(function (req, res, next) {
  // make all error and success flash messages available from all templates
  res.locals.errors = req.flash("errors")
  res.locals.success = req.flash("success")
  
  // make current user is available on the req object
  if (req.session.user) {
    req.visitorId = req.session.user._id;
  } else {
    req.visitorId = 0;
    // if user not logged in 0
  }

  // make user session data available from within view templates
  res.locals.user = req.session.user;
  // deerh ni byh app dotor user object iig req.session.user-eer ashiglah bolomjtoi bolgono
  next();
});

const router = require("./router");

app.use(express.urlencoded({ extended: false }));
// user submitted data to request object gesen tohirgoo
// request.body
app.use(express.json());

app.use(express.static("public"));
app.set("views", "views");
app.set("view engine", "ejs");

app.use("/", router);

module.exports = app;
