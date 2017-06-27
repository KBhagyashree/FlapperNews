/**
 * Created by bhagyashree on 18/6/17.
 */

/**
 * flapperNews:
 * Main module for the Flapper News app.
 */
var app = angular.module('flapperNews', ['ui.router']);

/**
 * posts:
 * Factory to store all the posts related data.
 */

app.factory('posts', ['$http', 'auth', function($http, auth){
    var o = {
        posts: [
            {title: 'post 1', upvotes: 5},
            {title: 'post 2', upvotes: 7},
            {title: 'post 3', upvotes: 1},
            {title: 'post 4', upvotes: 2},
            {title: 'post 5', upvotes: 3}
        ]
    };

    // Function to retrieve(or GET) posts from the database
    o.getAll = function(){
        return $http.get('/posts').success(function(data){angular.copy(data, o.posts);
        });
    };

    // Function to create(or POST) a new post to the database
    o.create = function(post){
        return $http.post('/posts', post, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
        }).success(function(data){
           o.posts.push(data);
        });
    };

    // Function to update(or PUT) the upvotes of a post in the database
    o.upvote = function(post){
        return $http.put('/posts/' + post._id + '/upvote', null, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
        }).success(function(data){
           post.upvotes += 1;
        });
    };

    // Function to retrieve(or GET) a single post from the database given it's ID
    o.get = function(id){
      return $http.get('/posts/' + id).then(function(res){
         return res.data;
      });
    };

    // Function to create(or POST) a comment related to a post to the database
    o.addComment = function(id, comment){
      return $http.post('/posts/' + id + '/comments', comment, {
          headers: {Authorization: 'Bearer '+auth.getToken()}
      });
    };

    // Function to update(or PUT) the upvotes of a comment in the database
    o.upvoteComment = function(post, comment){
        return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote' , null, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
        }).success(function(data){
           comment.upvotes += 1;
        });
    };

    return o;
}]);

app.factory('auth', ['$http', '$window', function($http, $window){
    var auth = {};

    // Function to save token on LocalStorage
    auth.saveToken = function(token){
      $window.localStorage['flapper-news-token'] = token;
    };

    // Function to get token from LocalStorage
    auth.getToken = function(){
        return $window.localStorage['flapper-news-token'];
    };

    auth.isLoggedIn = function(){
      var token = auth.getToken();

      if(token){
          var payload = JSON.parse($window.atob(token.split('.')[1]));
          return payload.exp > Date.now()/1000;
      } else {
          return false;
      }
    };

    auth.currentUser = function(){
      if(auth.isLoggedIn()){
          var token = auth.getToken();
          var payload = JSON.parse($window.atob(token.split('.')[1]));

          return payload.username;
      }
    };

    auth.register = function(user){
         return $http.post('/register', user).success(function(data){
         auth.saveToken(data.token);
      });
    };

    auth.logIn = function(user){
        return $http.post('/login', user).success(function(data){
            auth.saveToken(data.token);
        });
    };

    auth.logOut = function(){
        $window.localStorage.removeItem('flapper-news-token');
    };

    return auth;
}]);

/**
 * MainCtrl:
 * Controller for the index/home page
 */
app.controller('MainCtrl', ['$scope', 'posts', 'auth', function($scope, posts, auth){
    $scope.posts = posts.posts;
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.addPost = addPost;
    $scope.incrementUpvotes = incrementUpvotes;

    // Function to add new posts
    function addPost(){
     if(!$scope.title || $scope.title === ''){return;}
     posts.create({
         title: $scope.title,
         link: $scope.link
     });
     $scope.title = '';
     $scope.link = '';
    };

    function incrementUpvotes(post){
        posts.upvote(post);
    };

}]);

/**
 * PostCtrl:
 * Controller for the posts page
 */
app.controller('PostsCtrl',[
    '$scope',
    'posts',
    'post',
    'auth',
    function($scope, posts, post, auth){

        // Add the state parameter Id to the posts list
        $scope.post = post;
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.addComment = addComment;
        $scope.incrementUpvotes = incrementUpvotes;

        function addComment() {
            // If the user has not entered a comment then return
            if($scope.body === ''){
                return;
            }

            posts.addComment(post._id, {
                body: $scope.body,
                author: 'user'
            }).success(function(comment){
               $scope.post.comments.push(comment);
            });

            // Clear comment body to avoid a recurring entry
            // of the previous comment
            $scope.body = '';
        };

        function incrementUpvotes(comment){
            posts.upvoteComment(post, comment);
        };
}]);

app.controller('AuthCtrl', [
    '$scope',
    '$state',
    'auth',
    function($scope, $state, auth){
    $scope.user = {};

    $scope.register = function(){
      auth.register($scope.user).error(function(error){
         $scope.error = error;
      }).then(function(){
         $state.go('home');
      });
    };

    $scope.logIn = function(){
     auth.logIn($scope.user).error(function(error){
        $scope.error = error;
     }).then(function(){
        $state.go('home');
     });
    };
}]);

app.controller('NavCtrl', [
    '$scope',
    'auth',
    function($scope, auth){
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.currentUser = auth.currentUser;
        $scope.logOut = auth.logOut;
    }]);


/**
 * config():
 * State Configuration for routing within the app using the
 * ui-router framework.
 * States defined:
 * home
 * posts
 */
app.config(function($stateProvider, $urlRouterProvider){

    $urlRouterProvider.otherwise('/home');

    $stateProvider
        .state('home', {
            url: '/home',
            templateUrl: '/home.html',
            controller: 'MainCtrl',
            resolve: {
                postPromise: ['posts', function(posts){
                    return posts.getAll();
                }]
            }
        })

        .state('posts',{
            url:'/posts/{id}',
            templateUrl: '/posts.html',
            controller: 'PostsCtrl',
            resolve: {
                post: ['$stateParams', 'posts', function($stateParams, posts){
                    return posts.get($stateParams.id);
                }]
            }
        })
        .state('login', {
            url: '/login',
            templateUrl: '/login.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth){
                if(auth.isLoggedIn()){
                    $state.go('home');
                }
            }]
        })
        .state('register', {
            url: '/register',
            templateUrl: '/register.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth){
                if(auth.isLoggedIn()){
                    $state.go('home');
                }
            }]
        });

});



// app.controller('AboutCtrl', function(){
//
//     console.log("In about controller");
// });

// .state('about', {
// url: '/about',
// templateUrl: '/about.html',
// // controller: 'aboutCtrl'
// })
//
// .state('home.list', {
//     url: '/list',
//     templateUrl: '/list.html',
//     controller: function($scope) {
//         $scope.dogs = ['Barney', 'Menthol', 'Sushi'];
//         console.log($scope);
//     }
// })
//
// .state('home.paragraph', {
//     url: '/paragraph',
//     template: '<div> Universe has my back in every situation</div>'
//     templateUrl: '/paragraph.html'
// controller: function($scope){
//     console.log("In paragraph controller function");
//     $scope.paragraphText = "Lorem Ipsum Text here"
//     console.log($scope);
// }
// })
