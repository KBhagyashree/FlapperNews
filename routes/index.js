var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');

var passport = require('passport');
var jwt = require('express-jwt');

var auth = jwt({secret: 'SECRET', userProperty: 'payload'});

/** GET home page. */
router.get('/', function(req, res) {
    console.log('GET home page implemented successfully');

    res.render('index', { title: 'Express' });
});

/** GET /posts - return a list of posts and associated metadata */
router.get('/posts', function(req, res, next){

    Post.find(function(err, posts){
    // If posts not found, handle the error here
    if(err){
        console.log("An error occurred while getting all the Posts! ERR: " + err);
        return next(err);
    }

    // If posts found successfully, send them back to client
    res.json(posts);
    });

});

/** POST /posts - create a new post */
router.post('/posts', auth, function(req, res, next){
  var post = new Post(req.body);
  post.author = req.payload.username;

  // In case any error while saving the post, handle it here
  post.save(function(err, post){
    if(err){
        console.log("An error occurred while creating a new Post! ERR: " + err);
        return next(err);
    }

    // If post saved successfully, then send it back to the client
    res.json(post);
  });
});

/** Creating a route for pre-loading post objects in order to get a Post by ID */
router.param('post', function(req, res, next, id){
    var query = Post.findById(id);

    query.exec(function(err, post){
       if(err){
           return next(err);
       }
       if(!post){
           return next(new Error('Cannot find post!'))
       }
       req.post = post;
       return next();
    });
});

/** GET /posts/:id - return an individual post with associated comments */
router.get('/posts/:post', function(req, res, next){
    req.post.populate('comments', function(err, post){
       if(err){
           return next(err);
       }
        res.json(post);
    });
});

/** PUT /posts/:id/upvote - upvote a post, notice we use the post ID in the URL */
router.put('/posts/:post/upvote', auth, function(req, res, next){
    req.post.upvote(function(err, post){
        if(err){
            return next(err);
        }
        res.json(post);
    });
});

/** POST /posts/:id/comments - add a new comment to a post by ID */
router.post('/posts/:post/comments', auth, function(req, res, next){
   var comment = new Comment(req.body);
   comment.post = req.post;
   comment.author = req.payload.username;

   comment.save(function(err, comment){
      if(err){
          return next(err);
      }

      req.post.comments.push(comment);
      req.post.save(function(err, post){
         if(err){
             return next(err);
         }
         res.json(comment);
      });
   });
});

/** Creating a route for pre-loading comment objects in order to get a Comment by ID */
router.param('comment', function(req, res, next, id){
    var query = Comment.findById(id);

    query.exec(function(err, comment){
        if(err){
            return next(err);
        }
        if(!comment){
            return next(new Error('Cannot find comment!'))
        }
        req.comment = comment;
        return next();
    });
});


/** GET /posts/:post/comments/:comment - return an individual comment with associated ID */
router.get('/posts/:post/comments/:comment', function(req, res, next){
    res.json(req.comment);
});


/** PUT /posts/:id/comments/:id/upvote - upvote a comment, notice we use the post ID & comment ID in the URL */
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next){
    req.comment.upvote(function(err, comment){
        if(err){
            return next(err);
        }
        res.json(comment);
    });
});


/** POST /register - creates the given username and password entry*/
router.post('/register', function(req, res, next){

    if(!req.body.username || !req.body.password){
       return res.status(400).json({message: 'Please fill out all fields'});
   }

   var user = new User();
   user.username = req.body.username;
   user.setPassword(req.body.password);
   user.save(function(err){
      if(err){
          console.error("POST /register ERROR: " + err);
          return next(err);
      }

      return res.json({token: user.generateJWT()});
   });
});

/** POST /login - authenticates the user and returns the token to the client */
router.post('/login', function(req, res, next){
    console.log("In login post index.js");
    if(!req.body.username || !req.body.password){
        return res.status(400).json({message: 'Please fill out all fields'});
    }

    passport.authenticate('local', function(err, user, info){
        if(err){
            return next(err);
        }
        if(user){
            return res.json({token: user.generateJWT()});
        } else {
            return res.status(401).json(info);
        }
    })(req, res, next);
});


module.exports = router;
