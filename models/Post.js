const postsCollection = require('../db').db().collection('posts');
const followsCollection = require('../db').db().collection('follows');
const { ObjectId } = require('mongodb');
// MongoDb ni "id"-d special aar handdag. iimees ingej duudaj bn
const User = require('./User');
const sanitizeHTML = require('sanitize-html');

const Post = function (data, userid, requestedPostId) {
  this.data = data;
  this.errors = [];
  this.userid = userid;
  this.requestedPostId = requestedPostId;
};
// This is constructor function

Post.prototype.cleanUp = function () {
  if (typeof this.data.title !== 'string') {
    this.data.title = '';
  }

  if (typeof this.data.body !== 'string') {
    this.data.body = '';
  }

  // get rid of any bogus properties
  this.data = {
    title: sanitizeHTML(this.data.title.trim(), {
      allowedTags: [],
      allowedAttributes: [],
    }),
    body: sanitizeHTML(this.data.body.trim(), {
      allowedTags: [],
      allowedAttributes: [],
    }),
    createdDate: new Date(), // this program executed current time
    // author: this.userid
    // mongoDb ni "id"-d special-eer handdag tul iim engiin bailgaj boldoggui. doorhoor shiidne
    author: ObjectId(this.userid), // ene ni "id" object return hiine
  };
};

Post.prototype.validate = function () {
  if (this.data.title == '') {
    this.errors.push('You must provide a title.');
  }

  if (this.data.body == '') {
    this.errors.push('You must provide post content.');
  }
};

Post.prototype.create = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    this.validate();

    if (!this.errors.length) {
      // save post into database
      postsCollection
        .insertOne(this.data) // We don't know how long it takes to store on DB, so await or then, catch need!
        .then((info) => {
          resolve(info.ops[0]._id);
          // Ene mash chuhal. MongoDB-ees newly created post iin ID butsaaj bn
        })
        .catch(() => {
          this.errors.push('Please try again later.');
          reject(this.errors);
        });
      //   resolve(); Үүнийг арилгаж байгаа шалтгаан нь дээр байгаа
      // insertOne ni Promise. Энэ promise-ийн ардаас "await" ашиглахгүйгээр
      // then, catch залгах гэж байгаа тул resolve хэрэггүй болдог юм байна
    } else {
      reject(this.errors);
      // reject ni create() iig duudaj bui Promise iin catch ruu error-iig ilgeej bn
    }
  });
};

Post.prototype.update = function () {
  return new Promise(async (resolve, reject) => {
    try {
      const post = await Post.findSingleById(this.requestedPostId, this.userid);
      // deert post var await bolson tul doorh ni "reliable can access to post var"
      // if "findSingleById" promise ni REJECT hiivel automataar door bga catch ajillana.
      // herhen reject hiihiig already in findSingleById-d zaasan bga
      if (post.isVisitorOwner) {
        // actually update db
        const status = await this.actuallyUpdate(); // mongoDb-d actually update hiisnii daraa main promise resolve() hiih yostoi
        resolve(status); // yndsen promise iin resolve()
      } else {
        reject(); // doorhtoi ajil bololtoi
      }
    } catch {
      reject();
      // ene reject ni "findSingleById"-giin reject shuu
    }
  });
};

Post.prototype.actuallyUpdate = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    this.validate();
    if (!this.errors.length) {
      await postsCollection.findOneAndUpdate(
        { _id: new ObjectId(this.requestedPostId) },
        { $set: { title: this.data.title, body: this.data.body } }
      );
      resolve('success');
    } else {
      resolve('failure');
      // neg udaa 2 uur resolve() return hiij boldogiig anhaar
    }
  });
};

// Ene hesegt baahan ergelzeetei zuils bn
// 1. post deer nemelteer "_id" orj irdeg. yaj orj ireed bgan bol???????
// 2. post author clear hiihed nuguuduul ni yaj auto oilgoltsood bgan bol???????
Post.reusablePostQuery = function (uniqueOperations, visitorId) {
  return new Promise(async function (resolve, reject) {
    const aggOperations = uniqueOperations.concat([
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorDocument',
        },
      },
      {
        $project: {
          title: 1,
          body: 1,
          createdDate: 1,
          authorId: '$author', // In mongoDb $ means that it's original field value
          author: { $arrayElemAt: ['$authorDocument', 0] },
        },
      },
    ]);

    let posts = await postsCollection.aggregate(aggOperations).toArray();
    // aggregate() ni run multiple operations

    // clean up author property in each post object
    posts = posts.map(function (post) {
      post.isVisitorOwner = post.authorId.equals(visitorId);
      // return boolean
      // search iin ur dund authorId reveal hiigeed bn. yyniig nuuhiin tuld daraah arga
      post.authorId = undefined;
      // delete post.authorId // gej boloh ch ene ni DB-d achaalal ugdug

      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar,
      };

      return post;
    });

    resolve(posts);
  });
};

// Sonirholtoi shiidel
Post.findSingleById = function (id, visitorId) {
  return new Promise(async function (resolve, reject) {
    if (typeof id !== 'string' || !ObjectId.isValid(id)) {
      reject();
      return;
    }

    const posts = await Post.reusablePostQuery(
      [{ $match: { _id: new ObjectId(id) } }],
      visitorId
    );

    if (posts.length) {
      console.log(posts[0]);
      resolve(posts[0]);
    } else {
      reject();
    }
  });
};

Post.findByAuthorId = function (authorId) {
  // userController-oos authorId pass hiisen.
  // author ni post gui baij boloh tul "no need to include any logic"
  // so no need to include PROMISE
  // reusablePostQeury ni Promise tul findByAuthorId ni promise boloh ium shig bn
  return Post.reusablePostQuery([
    { $match: { author: authorId } },
    { $sort: { createdDate: -1 } }, // descending order, 1 for accending order
  ]);
};

Post.delete = function (postIdToDelete, currentUserId) {
  return new Promise(async (resolve, reject) => {
    try {
      const post = await Post.findSingleById(postIdToDelete, currentUserId);
      if (post.isVisitorOwner) {
        await postsCollection.deleteOne({ _id: new ObjectId(postIdToDelete) });
        resolve();
      } else {
        reject();
        // something is not gooe, or trying to delete post that not own yed garah yed
      }
    } catch {
      reject();
      // Post Id is notvalid or post doesn't exist yed garah
    }
  });
};

Post.search = function (searchTerm) {
  return new Promise(async (resolve, reject) => {
    // 1. Incoming searchTerm iig check hiine (not object, not empty object etc.)
    if (typeof searchTerm === 'string') {
      const posts = await Post.reusablePostQuery([
        { $match: { $text: { $search: searchTerm } } },
        // ?????????? $search, $text haanaas garaad irev
        // MongoDb -iin funciton ium shig bn
        { $sort: { score: { $meta: 'textScore' } } },
        // score mean "best match on the top"
        // ???????????? "textScore" haanaas garaad irev
        // mongoDB using INDEXES gej bn
      ]);
      resolve(posts);
    } else {
      reject();
    }
  });
};

Post.countPostByAuthor = function (id) {
  return new Promise(async (resolve, reject) => {
    const postCount = await postsCollection.countDocuments({ author: id });
    resolve(postCount);
  });
};

Post.getFeed = async function (id) {
  // deerh id ni engiin string, not mongodb database object
  // create an array of the user ids that the current user follows
  let followedUsers = await followsCollection
    .find({ authorId: new ObjectId(id) })
    .toArray();
  // ObjectId ni return promise
  followedUsers = followedUsers.map(function (followDoc) {
    return followDoc.followedId;
  });

  // look for posts where the author is in the above array of followed users
  return Post.reusablePostQuery([
    { $match: { author: { $in: followedUsers } } },
    { $sort: { createdDate: -1 } },
  ]);
  // reUsablePostQuery ni avatar, username zergiig return hiideg
};

module.exports = Post;
