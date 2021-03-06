const Post = require('../models/Post');

exports.viewCreateScreen = function (req, res) {
  res.render('create-post');
};

exports.create = function (req, res) {
  const post = new Post(req.body, req.session.user._id);
  // "req.body" user submitted form data
  // session-d bga user ID ig avah gej bn
  // Post model iin constructor-t shineer parametr nemeh shaardlagatai bolloo
  post
    .create()
    .then(function (newId) {
      // newId ni mongoDB-iin insertOne promise-iin resolve-oor ijr bga ID
      req.flash('success', 'New post successfully created.');
      req.session.save(() => res.redirect(`/post/${newId}`));
      // "/post/id" post ni not yat created tul ID bhgui bga
      // herhen redirect hiihdee ID-g ni medeh ve????
      // hariult ni Post.js iin create() iin "insertOne" promise-d bga, haraarai
    })
    .catch(function (errors) {
      errors.foreach((error) => req.flash('errors', error));
      req.session.save(() => res.redirect('/create-post'));
    });
  // then ni sucessful RESOLVES
  // catch ni unsucessful REJECTS
};

exports.apiCreate = function (req, res) {
  const post = new Post(req.body, req.apiUser._id);
  // userController-iin apiUserMustBeLoggin deer "req.apiUser" onooson
  post
    .create()
    .then(function () {
      res.json('Congrats');
    })
    .catch(function (errors) {
      res.json(errors);
    });
};

exports.viewSingle = async function (req, res) {
  try {
    const post = await Post.findSingleById(req.params.id, req.visitorId);
    // deerh ni visitor is author or owner of the post bolohiig todorhoilno
    // "req"-iin var uud GLOBAL gedgiig martaj bolohgui
    res.render('single-post-screen', { post, title: post.title });
    // {post: post} iig deer tovchilson bn
  } catch {
    res.render('404');
  }
};

exports.viewEditScreen = async function (req, res) {
  try {
    const post = await Post.findSingleById(req.params.id, req.visitorId); // end visitorId bhgui bn yah ium bol?????
    if (post.isVisitorOwner) {
      res.render('edit-post', { post });
    } else {
      req.flash('errors', "You don't have permission to perform that action.");
      req.session.save(() => res.redirect('/'));
    }
  } catch {
    res.render('404');
  }
};

exports.edit = function (req, res) {
  const post = new Post(req.body, req.visitorId, req.params.id);
  post
    .update()
    .then((status) => {
      // Promise resolves hiisen utge
      // the post was successfully updated in the database
      // or user did have permission, but there were validation errors
      if (status == 'success') {
        // post was updated in db
        req.flash('success', 'Post successfully updated.');
        req.session.save(function () {
          res.redirect(`/post/${req.params.id}/edit`);
        });
      } else {
        // if title or body blank yed yah ve?
        post.errors.foreach(function (error) {
          req.flash('errors', error);
        });
        req.session.save(function () {
          res.redirect(`/post/${req.params.id}/edit`);
        });
      }
    })
    .catch(() => {
      // Promise reject utga oruulna
      // a post with the requested id doesn't exist
      // or if the current visitor is not the owner of the requested post
      req.flash('errors', 'You do not have premission to perform that action.');
      req.session.save(function () {
        res.redirect('/');
      });
    });
};

exports.delete = function (req, res) {
  Post.delete(req.params.id, req.visitorId)
    .then(() => {
      req.flash('success', 'Post successfully deleted');
      req.session.save(() =>
        res.redirect(`/profile/${req.session.user.username}`)
      );
    })
    .catch(() => {
      req.flash('errors', 'You do not have permission to perform that action.');
      req.session.save(() => res.redirect('/'));
    });
};

exports.apiDelete = function (req, res) {
  Post.delete(req.params.id, req.apiUser._id)
    // apiMustBeLoggedIn function make above "req.apiUser._id" available
    .then(() => {
      res.json('Success');
    })
    .catch(() => {
      res.json('You do not have permission to perform that action.');
    });
};

exports.search = function (req, res) {
  Post.search(req.body.searchTerm)
    .then((posts) => {
      // search promise resolve values, that value is end "posts" parametreer
      // butsaagadaj irne
      res.json(posts);
    })
    .catch(() => {
      // search promise hervee errortoi bsan bol iishee reject ee butsaana
      res.json([]);
      // hervee yamar negen aldaa bval empty array butsaana
    });
};
