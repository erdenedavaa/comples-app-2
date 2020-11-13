const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');

exports.apiGetPostsByUsername = async function (req, res) {
  try {
    const authorDoc = await User.findByUsername(req.params.username);
    const posts = await Post.findByAuthorId(authorDoc._id);
    res.json(posts);
  } catch (error) {
    res.json('Sorry, invalid user requested.');
  }
};

exports.apiMustBeLoggedIn = function (req, res, next) {
  try {
    req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET);
    next();
  } catch (error) {
    res.json('Sorry, you must provide a valid token.');
  }
};

exports.doesUsernameExist = function (req, res) {
  User.findByUsername(req.body.username)
    // this is axios request sending over to server
    .then(function () {
      res.json(true);
    })
    .catch(function () {
      res.json(false);
    });
};

exports.doesEmailExist = async function (req, res) {
  const emailBool = await User.doesEmailExist(req.body.email);
  res.json(emailBool);
};

exports.sharedProfileData = async function (req, res, next) {
  let isVisitorsProfile = false;
  // next-d final function to run orno
  // 1. current user is already followed or not esehiig shalgay
  let isFollowing = false;
  if (req.session.user) {
    isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
    // "_id"-g mongodb-iin ID object gej nerleed bn
    // if current visitor is logged in bval gesen ug
    // Follow model oruulahiin tuld deere require hiih yostoi
    isFollowing = await Follow.isVisitorFollowing(
      req.profileUser._id,
      req.visitorId
    );
    // current profile user id / current visitor's id
    // req object-d already assigned profileUser object
    // herev followed bolson bval isVisitorFollowing in "true" return

    req.isVisitorsProfile = isVisitorsProfile;
    req.isFollowing = isFollowing;
    // deerh true, or false value nuud ni next() function-d ashiglagdahaar shiljij bn gej bn
    // storing isFollowing value to request object. daraa ni haanaas ch handaj bolno

    // retreive post, follower, and following counts
    const postCountPromise = Post.countPostByAuthor(req.profileUser._id);
    // session eer damjval "id" ni engiin string bolj bn, harin busdaar bol mongodb object
    const followerCountPromise = Follow.countFollowersById(req.profileUser._id);
    const followingCountPromise = Follow.countFollowingById(
      req.profileUser._id
    );
    // deerh 3 iin await iig delete hiisen, uchir ni edgeer ni bie bieniihee utgaas hamaaralgui
    const [postCount, followerCount, followingCount] = await Promise.all([
      postCountPromise,
      followerCountPromise,
      followingCountPromise,
    ]);
    // ARRAY DISTRUCTURING arga ashiglalaa
    // Daraa ni deerh 3-aa request object-d hadgalah yostoi.

    req.postCount = postCount;
    req.followerCount = followerCount;
    req.followingCount = followingCount;

    next();
    // go to next function in the route. what is the next function?
    // answer. route.js deer yag yynii daraa bga function. see route.js
  }
};

exports.mustBeLoggedIn = function (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.flash('errors', 'You must be logged in to perform that action.');
    req.session.save(function () {
      res.redirect('/');
    });
  }
};

exports.login = function (req, res) {
  const user = new User(req.body);
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
        res.redirect('/');
      });
    })
    .catch(function (e) {
      // res.send(e)
      req.flash('errors', e);
      // flash package ni add/remove data from session, modify session data
      // deerh ni tsaana iim ium bolj bn
      // req.session.flash.errors = [e]
      req.session.save(function () {
        res.redirect('/');
      });
      //   redirect iig naidvartai hiihiin tul save dotor function oruulj bn
    });
  // login method return Promise
};

exports.apiLogin = function (req, res) {
  const user = new User(req.body);
  user
    .login()
    .then(function () {
      res.json(
        jwt.sign({ _id: user.data._id }, process.env.JWTSECRET, {
          expiresIn: '7d',
        })
      );
    })
    .catch(function () {
      res.json('Sorry, your value is not correct.');
    });
  // login method return Promise
};

exports.logout = function (req, res) {
  req.session.destroy(function () {
    res.redirect('/');
  });
};

exports.register = function (req, res) {
  const user = new User(req.body);
  user
    .register() // Promise tul then, catch() method ashiglaj bolno
    .then(() => {
      req.session.user = {
        username: user.data.username,
        avatar: user.avatar,
        _id: user.data._id,
      };
      req.session.save(function () {
        res.redirect('/');
      });
    })
    .catch((regErrors) => {
      regErrors.forEach(function (error) {
        req.flash('regErrors', error);
      });
      req.session.save(function () {
        res.redirect('/');
      });
    });
};

exports.home = async function (req, res) {
  if (req.session.user) {
    // fetch feed of posts for current user
    const posts = await Post.getFeed(req.session.user._id);
    res.render('home-dashboard', { posts });
    // { posts: posts } gedgiig tovchilchloo
  } else {
    res.render('home-guest', {
      regErrors: req.flash('regErrors'),
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
      res.render('404');
    });
};

exports.profilePostsScreen = function (req, res) {
  // ask our post model for posts for a certain author id
  Post.findByAuthorId(req.profileUser._id)
    .then(function (posts) {
      // posts ni Promise iin resolve-oos butsaasan utguud
      res.render('profile', {
        title: `Profile for ${req.profileUser.username}`,
        currentPage: 'posts',
        posts,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {
          postCount: req.postCount,
          followerCount: req.followerCount,
          followingCount: req.followingCount,
        },
      });
    })
    .catch(function () {
      res.render('404');
    });
};

exports.profileFollowersScreen = async function (req, res) {
  try {
    const followers = await Follow.getFollowersById(req.profileUser._id);
    res.render('profile-followers', {
      currentPage: 'followers',
      followers, // ene ni Follow-oos irsen resolve data, followers: followers
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postCount: req.postCount,
        followerCount: req.followerCount,
        followingCount: req.followingCount,
      },
    });
  } catch (e) {
    res.render('404');
  }
};

exports.profileFollowingScreen = async function (req, res) {
  try {
    const following = await Follow.getFollowingById(req.profileUser._id);
    res.render('profile-following', {
      currentPage: 'following',
      following, // ene ni Follow-oos irsen resolve data
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postCount: req.postCount,
        followerCount: req.followerCount,
        followingCount: req.followingCount,
      },
    });
  } catch (e) {
    res.render('404');
  }
};
