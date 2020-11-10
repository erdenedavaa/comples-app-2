const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const markdown = require('marked');

const app = express();
const sanitizeHTML = require('sanitize-html');

const sessionOptions = session({
  secret: 'Javasript is soooooooo cooooool',
  // default aar session ni memory-d save hiigddeg.
  // yyniig doorh baidlaar overwrite hiine
  store: new MongoStore({ client: require('./db') }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
});

app.use(sessionOptions);
app.use(flash());

// every request-d ashiglah hesgiig oruulna
app.use(function (req, res, next) {
  // make our markdown function available from within ejs template
  res.locals.filterUserHTML = function (content) {
    // filterUserHTML bol zugeer l zohioson ner shuu
    return sanitizeHTML(markdown(content), {
      allowedTags: [
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'strong',
        'bold',
        'i',
        'em',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ],
      allowedAttributs: {},
    });
  };

  // make all error and success flash messages available from all templates
  res.locals.errors = req.flash('errors');
  res.locals.success = req.flash('success');

  // make current user is available on the req object
  if (req.session.user) {
    req.visitorId = req.session.user._id;
  } else {
    req.visitorId = 0;
    // if user not logged in 0
  }

  // make user session data available from within view templates
  res.locals.user = req.session.user;
  // deerh ni byh app dotor respond-iin user object iig req.session.user-eer ashiglah bolomjtoi bolgono
  next();
});

const { runInNewContext } = require('vm');
const router = require('./router');

app.use(express.urlencoded({ extended: false }));
// user submitted data to request object gesen tohirgoo
// request.body
app.use(express.json());

app.use(express.static('public'));
app.set('views', 'views');
app.set('view engine', 'ejs');

app.use('/', router);

module.exports = app;
