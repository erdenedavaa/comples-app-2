const { ObjectId } = require('mongodb');
// Ene ni ulamjlalm doorhtoi tentsuu
// const ObjectId = require('mongodb').ObjectId

const usersCollection = require('../db').db().collection('users');
const followsCollection = require('../db').db().collection('follows');
// '../db' ni DB user iig butsaana, db() ni database iig ni duudna
const User = require('./User');
// garvatar load hiih gol zorilgoor import hiij bn

const Follow = function (followedUsername, authorId) {
  // wants to follow username, current username
  this.followedUsername = followedUsername;
  this.authorId = authorId;
  this.errors = [];
};

Follow.prototype.cleanUp = function () {
  if (typeof this.followedUsername !== 'string') {
    this.followedUsername = '';
  }
};

Follow.prototype.validate = async function (action) {
  // followedUsername must exist in DB
  const followedAccount = await usersCollection.findOne({
    username: this.followedUsername,
  });
  if (followedAccount) {
    this.followedId = followedAccount._id;
  } else {
    this.errors.push('You cannot follow a user that does not exist.');
  }

  const doesFollowAlreadyExist = await followsCollection.findOne({
    followedId: this.followedId,
    authorId: new ObjectId(this.authorId),
  });

  if (action === 'create') {
    if (doesFollowAlreadyExist) {
      this.errors.push('You are already following this user.');
    }
  }

  if (action === 'delete') {
    if (!doesFollowAlreadyExist) {
      this.errors.push(
        'You cannot stop following someone you do not already follow.'
      );
    }
  }

  // Should not be able to follow yourself
  if (this.followedId.equals(this.authorId)) {
    this.errors.push('You cannot follow yourself.');
  }
};

Follow.prototype.create = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate('create');
    if (!this.errors.length) {
      await followsCollection.insertOne({
        followedId: this.followedId,
        authorId: new ObjectId(this.authorId),
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

Follow.prototype.delete = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate('delete');
    if (!this.errors.length) {
      await followsCollection.deleteOne({
        followedId: this.followedId,
        authorId: new ObjectId(this.authorId),
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

Follow.isVisitorFollowing = async function (followedId, visitorId) {
  const followDoc = await followsCollection.findOne({
    followedId,
    // asuult: yagaad followedId-g newObjectId-d zaaj uguugui hernee, visitorId-g zaaj ugj bgan bol
    // source-oos ni harahad adilhan "_id" utguugiie hadgalsan bh ium
    authorId: new ObjectId(visitorId),
  });
  if (followDoc) {
    return true;
  }
  return false;
};

Follow.getFollowersById = function (id) {
  // "id" ni incoming id from controller

  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection
        .aggregate([
          { $match: { followedId: id } },
          {
            $lookup: {
              from: 'users',
              localField: 'authorId',
              foreignField: '_id',
              as: 'userDoc',
              // create virtual field "userDoc" below mongodb:follows collection
              // ene ni array of objects return hiine
            },
          },
          {
            $project: {
              // what should be exist in object return
              // don't need to include "follows" collectionii "authorId", "followedId", harin
              // username and email of matching user account
              username: { $arrayElemAt: ['$userDoc.username', 0] },
              // first item in the array of "userDoc"
              email: { $arrayElemAt: ['$userDoc.email', 0] },
              // bid nar don't want to reveal email in frontEnd, only is it to gravatar, uunii
              // tuld door toArray() door code bichij bn
            },
          },
        ])
        .toArray();
      // aggregate ni mongodb-gees data iruulne, teriig ni raw JS bolgohiin tuld toArray()
      // toArray ni resolve a value of array, so need to return PROMISE, so use await

      followers = followers.map(function (follower) {
        // create a user
        const user = new User(follower, true);
        return { username: follower.username, avatar: user.avatar };
      });
      resolve(followers);
    } catch (error) {
      reject();
    }
  });
};

Follow.getFollowingById = function (id) {
  // "id" ni incoming id from controller

  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection
        // end yamar nertei bh ni chuhal bish, following gej boloh ch zoriud orhiv
        .aggregate([
          { $match: { authorId: id } },
          {
            // match-aar zuvhun 2 user return hiigddeg. Busad username, avatar zergiig yawuulahiin
            // tuld $lookup ashigldadag
            $lookup: {
              from: 'users',
              localField: 'followedId',
              foreignField: '_id',
              as: 'userDoc',
              // create virtual field "userDoc" below mongodb:follows collection
              // ene ni array of objects return hiine
            },
          },
          {
            $project: {
              // what should be exist in object return
              // don't need to include "follows" collectionii "authorId", "followedId", harin
              // username and email of matching user account
              username: { $arrayElemAt: ['$userDoc.username', 0] },
              // first item in the array of "userDoc"
              email: { $arrayElemAt: ['$userDoc.email', 0] },
              // bid nar don't want to reveal email in frontEnd, only is it to gravatar, uunii
              // tuld door toArray() door code bichij bn
            },
          },
        ])
        .toArray();
      // aggregate ni mongodb-gees data iruulne, teriig ni raw JS bolgohiin tuld toArray()
      // toArray ni resolve a value of array, so need to return PROMISE, so use await

      followers = followers.map(function (follower) {
        // create a user
        const user = new User(follower, true);
        return { username: follower.username, avatar: user.avatar };
      });
      resolve(followers);
    } catch (error) {
      reject();
    }
  });
};

Follow.countFollowersById = function (id) {
  return new Promise(async (resolve, reject) => {
    const followerCount = await followsCollection.countDocuments({
      followedId: id,
    });
    // ??? Hezee ni ObjectId geed8 hezee ni zugeer yawaad bnaa????
    // Hariult userController deer "Post.countPostByAuthor(req.profileUser._id)" gej bn
    // ene ni ter chigeeree ObjectId ium. "_id". uur bsan bol new ObjectId gene.
    resolve(followerCount);
  });
};

Follow.countFollowingById = function (id) {
  return new Promise(async (resolve, reject) => {
    const followingCount = await followsCollection.countDocuments({
      authorId: id,
    });
    // ??? Hezee ni ObjectId geed8 hezee ni zugeer yawaad bnaa????
    // Hariult userController deer "Post.countPostByAuthor(req.profileUser._id)" gej bn
    // ene ni ter chigeeree ObjectId ium. "_id". uur bsan bol new ObjectId gene.
    resolve(followingCount);
  });
};

module.exports = Follow;
