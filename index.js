// Required modules
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var app = express();
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var logger = require('winston');
var mongoose = require('mongoose');
var admin = require('firebase-admin');
var serviceAccount = require('./your-stylist-firebase-adminsdk-co2s5-28a616cee5.json');
var cloudinary = require('cloudinary');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://your-stylist.firebaseio.com/"
});

logger.info('FCM initiated with service account: ' + serviceAccount);

mongoose.Promise = require('bluebird');


// User Schema for MongoDB
var userSchema = new mongoose.Schema({
    first_name: { type: String },
    last_name: { type: String },
    username: { type: String, unique: true },
    password: { type: String },
    type: { type: String },
    position: { type: String },
    pending_tasks: { type: Number }
});

var User = mongoose.model('User', userSchema);

var taskSchema = new mongoose.Schema({
    task_name: { type: String },
    video_url: { type: String },
    task_duration: { type: String },
    task_status: { type: String },
    assigned_to: { type: String },
    assigned_time: { type: String },
    notification_duration: { type: String },
    created_on: { type: String }
});

var Task = mongoose.model('Task', taskSchema);

var mongooseConnectString = 'mongodb://heroku_5z6k8h5w:cqg39dnk1u9vf6kohv2ooki2u3@ds143892.mlab.com:43892/heroku_5z6k8h5w';
//var mongooseConnectString='mongodb://127.0.0.1:27017/staff-manager-romina';

mongoose.connect(mongooseConnectString, function(err, res) {
    if (err) {
        logger.error('Error connecting to: ' + mongooseConnectString + '. ' + err);
    } else {
        logger.info('Successfully connected to: ' + mongooseConnectString);
    }
});

/*var admin=new User({
	first_name:"Abhilash",
	last_name:"Behera",
	username:"abhilashfancy",
	password:"AbhiLima2@",
	position:"admin",
	type:"admin"
});

admin.save(function(err){
	if(err){
		logger.info('Error in saving admin: '+err);
	}else{
		logger.info('Admin saved successfully');
	}
});*/

var app = express();
// Middlewares

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser('secret'));
app.use(session({ cookie: { maxAge: 60000 } }));


function sendPushNotificationsToAll(message, url, email) {
    if (email != null) {
        User.findOne({ email: email }, function(err, user) {
            if (err) {
                logger.error('Error in sending notifications: ' + err);
            } else {

                var payload = {
                    data: {
                        message: message,
                        url: url
                    }
                };

                admin.messaging().sendToDevice(user.device_token, payload)
                    .then(function(response) {
                        logger.info('Successfully sent notification to: ' + user.device_token);
                    })
                    .catch(function(error) {
                        logger.error('Error in sending notification: ' + error);
                    });
            }
        });
    } else {
        logger.info('Sending notifications to all');
        User.find(function(err, users) {
            if (err) {
                logger.error('Error in sending notifications: ' + err);
            } else {
                var payload = {
                    data: {
                        message: message,
                        url: url
                    }
                };

                var i;

                for (i = 0; i < users.length; i++) {
                    admin.messaging().sendToDevice(users[i].device_token, payload)
                        .then(function(response) {
                            logger.info('Successfully sent notification to: ' + user.device_token);
                        })
                        .catch(function(error) {
                            logger.error('Error in sending notifications: ' + error);
                        });
                }
            }
        });
    }
};

app.get('/', function(req, res) {
    res.send('Hello User!.\nIf you are seeing this message then it means that the server is up and running.');
});

app.post('/login', function(req, res) {
    logger.info('Requesting login with username: ' + req.body.username + ' and password: ' + req.body.password);
    User.findOne({ username: req.body.username, password: req.body.password }, { first_name: 1, last_name: 1, username: 1, type: 1, position: 1 }, function(err, user) {
        if (err) {
            logger.error('Error in login: ' + err);
            return res.status(209).json({ success: false, data: 'Could not login at this moment. Please try again later.' });
        } else {
            if (user) {
                logger.info('User logged in successfully: ' + user);
                return res.json({ success: true, data: user });
            } else {
                logger.info('Invalid username or password.');
                return res.status(309).json({ success: false, data: 'Invalid username or password.' });
            }
        }
    });
});

app.post('/createStaff', function(req, res) {
    logger.info('Creating New Staff');
    var user = new User({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        password: req.body.password,
        type: req.body.type,
        position: req.body.position,
        pending_tasks: 0
    });

    user.save(function(err) {
        if (err) {
            logger.error('Error in creating user: ' + err);
            res.status(309).json({ success: false, data: 'Could not create user at this moment. Please try again.' });
        } else {
            logger.info('User created successfully.');
            res.json({ success: true, data: 'Account created successfully.' });
        }
    });
});

app.get('/staffList', function(req, res) {
    User.find({ type: { $ne: 'admin' } }, { password: 0 }, function(err, users) {
        if (err) {
            logger.error('Error in getting staff list: ' + err);
            return res.status(209).json({ success: false, data: 'Could not get staff list at this moment. Please try again later.' });
        } else {
            return res.json({ success: true, data: users });
        }
    });
});

app.post('/usernameAvailability', function(req, res) {
    User.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
            return res.json({ success: false, data: 'Something went wrong. Please check again.' });
        } else {
            if (user) {
                return res.json({ success: false, data: 'This username is already taken. Try something else.' });
            } else {
                return res.json({ success: true, data: 'Username available. You can continue.' });
            }
        }
    });
});

app.post('/createTask', function(req, res) {
    var task = new Task({
        task_name: req.body.task_name,
        video_url: req.body.video_url,
        task_duration: req.body.task_duration,
        task_status: req.body.task_status,
        assigned_to: req.body.assigned_to,
        assigned_time: '',
        notification_duration: req.body.notification_duration,
        created_on: req.body.created_on
    });

    task.save(function(err) {
        if (err) {
            console.log('Error in saving task: ' + err);
            return res.json({ success: false, data: 'Task was not created. Please try again.' });
        } else {
            console.log('Task created Successfully: ' + task);
            return res.json({ success: true, data: 'Task created successfully.' });
        }
    });
});

app.get('/adminTasksList', function(req, res) {
    Task.find(function(err, tasks) {
        if (err) {
            console.log('Error in getting tasks: ' + err);
            return res.json({ success: false, data: 'Could not get tasks. Please try again.' });
        } else {
            console.log('Got tasks: ' + tasks);
            return res.json({ success: true, data: tasks });
        }
    });
});

app.post('/assignTask', function(req, res) {
    User.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
            return res.json({ success: false, data: 'Could not assign task at this moment. Please try again.' });
        } else {
            if (user) {
                Task.findOne({ created_on: req.body.created_on }, function(err, task) {
                    if (err) {
                        return res.json({ success: false, data: 'Could not assign task at this moment. Please try again.' });
                    } else {
                        if (task) {
                            task.assigned_to = req.body.username;
                            task.assigned_time = req.body.timestamp;
                            task.save(function(err) {
                                if (err) {
                                    return res.json({ success: false, data: 'Could not assign task at this moment. Please try again.' });
                                } else {
                                    user.pending_tasks = user.pending_tasks + 1;
                                    user.save(function(err) {
                                        if (err) {
                                            return res.json({ success: false, data: 'Could not assign task at this moment. Please try again.' });
                                        } else {
                                            return res.json({ success: true, data: 'Task Assigned Successfully' });
                                        }
                                    });
                                }
                            });
                        } else {
                            return res.json({ success: false, data: 'Could not assign task at this moment. Please try again.' });
                        }
                    }
                });
            } else {
                return res.json({ success: false, data: 'User not found. Please try again.' });
            }
        }
    });
});

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});