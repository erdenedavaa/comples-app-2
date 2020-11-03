const User = require("../models/User");
const Post = require("../models/Post");

exports.mustBeLoggedIn = function (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.flash("errors", "You must be logged in to perform that action.");
    req.session.save(function () {
      res.redirect("/");
    });
  }
};

exports.login = function (req, res) {
  let user = new User(req.body);
  user
    .login()
    .then(function (result) {
      req.session.user = {
        avatar: user.avatar,
        username: user.data.username,
        _id: user.data._id,
      };
      // deerh ni "postController"-iin user iig tanihad ashiglagdana. Session-d "_id" hadgalagdana.
      // doorh ni disable intermediate screen
      req.session.save(function () {
        res.redirect("/");
      });
    })
    .catch(function (e) {
      // res.send(e)
      req.flash("errors", e);
      // flash package ni add/remove data from session, modify session data
      // deerh ni tsaana iim ium bolj bn
      // req.session.flash.errors = [e]
      req.session.save(function () {
        res.redirect("/");
      });
      //   redirect iig naidvartai hiihiin tul save dotor function oruulj bn
    });
  // login method return Promise
};

exports.logout = function (req, res) {
  req.session.destroy(function () {
    res.redirect("/");
  });
};

exports.register = function (req, res) {
  let user = new User(req.body);
  user
    .register() // Promise tul then, catch() method ashiglaj bolno
    .then(() => {
      req.session.user = {
        username: user.data.username,
        avatar: user.avatar,
        _id: user.data._id,
      };
      req.session.save(function () {
        res.redirect("/");
      });
    })
    .catch((regErrors) => {
      regErrors.forEach(function (error) {
        req.flash("regErrors", error);
      });
      req.session.save(function () {
        res.redirect("/");
      });
    });
};

exports.home = function (req, res) {
  if (req.session.user) {
    // res.send("Welcome to the actual application!!!")
    res.render("home-dashboard");
  } else {
    res.render("home-guest", {
      regErrors: req.flash("regErrors"),
    });
    // render-t var oruulj bga ni view-d var iig passlah arga ium
    // login hiij chadaagui humuust zuvhun 1 udaa haragdaad daraa ni delete
    // hiigdeh message iig flash aar passlah ni hyalbar
    // flash() ni user-t gants udaa haruulaad daraa ni DB-aas error iig delete hiideg
  }
};

exports.ifUserExists = function (req, res, next) {
  User.findByUsername(req.params.username)
    .then(function (userDocument) {
      req.profileUser = userDocument;
      // req object-ruu busad function aas acces hiij boldog ium shig bn!!!
      // req object-d profileUser iig save hiilee.
      next();
    })
    .catch(function () {
      res.render("404");
    });
};

exports.profilePostsScreen = function (req, res) {
  // ask our post model for posts for a certain author id
  Post.findByAuthorId(req.profileUser._id)
    .then(function (posts) {
      // posts ni Promise iin resolve-oos butsaasan utguud
      res.render("profile", {
        posts: posts,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
      });
    })
    .catch(function () {
      res.render("404");
    });
};
