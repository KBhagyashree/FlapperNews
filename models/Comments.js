/**
 * Created by bhagyashree on 25/6/17.
 */
var mongoose = require('mongoose');

var CommentSchema =  new mongoose.Schema({
    body: String,
    author: String,
    upvotes: {type: Number, default: 0},
    post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'}
});

/** Method to increment the upvotes for a Post */
CommentSchema.methods.upvote = function(cb){
    this.upvotes += 1;
    this.save(cb);
}

mongoose.model('Comment', CommentSchema);