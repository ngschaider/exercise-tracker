const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

mongoose.connect(process.env.MONGO_URI);

const ExerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String,
});
const UserSchema = new mongoose.Schema({
  username: String,
  exercises: [ExerciseSchema],
});



const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false}));

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, data) => {
    res.json(data);
  });
})
app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username;
  isUsernameTaken(username, taken => {
    if(!taken) {
      addUser(username, (err, data) => {
        res.json({username: data.username, _id: data._id});
      });
    } else {
      res.json({error: "Username taken"});
    }
  })
});
app.post("/api/exercise/add", (req, res) => {
  var {description, duration, date, userId} = req.body;
  if(!date) {
    const dt = new Date();
    date = dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate();
  }
  User.findById(userId, (err, data) => {
    if(data) {
      const exercise = new Exercise({
        description,
        duration,
        date
      });
      data.exercises.push(exercise);
      data.save((err, data) => {
        if(err) {
          res.json({message: "error"});
        } else {
          res.json({
            _id: data._id,
            username: data.username,
            date: exercise.date,
            duration: exercise.duration,
            description: exercise.description,
          });
        }
      });
    } else {
      res.json({error: "userId not found"});
    }
  })
});
app.get("/api/exercise/log", (req, res) => {
  const userId = req.query.userId;
  var from = req.query.from;
  var to = req.query.to;
  var limit = req.query.limit;
  User.findById(userId, (err, data) => {
    var exercises = data.exercises.map(e => {
      return {
        description: e.description,
        duration: e.duration,
        date: e.date,
      };
    })
    exercises = exercises.filter(e => {
      if(from && new Date(e.date) < new Date(from)) {
        return false;
      }
      if(to && new Date(e.date) > new Date(to)) {
        return false;
      }
      return true;
    });
    if(limit) {
      exercises = exercises.slice(0, limit);
    }
    const payload = {
      _id: data._id,
      username: data.username,
      count: exercises.length,
      log: exercises,
    };
    if(req.query.from) {
      payload.from = req.query.from;
    }
    if(req.query.to) {
      payload.to = req.query.to;
    }
    res.json(payload);
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log("App listening on port " + listener.address().port);
});


function addUser(username, done) {
  const user = new User({
    username: username,
  });
  user.save(done);
}
function isUsernameTaken(username, cb) {
  const user = User.findById({
    username: username
  }, (err, data) => {
    if(!err && data) {
      cb(true);
    } else {
      cb(false);
    }
  });
}