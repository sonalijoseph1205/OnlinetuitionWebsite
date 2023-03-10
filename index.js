const express = require("express");
const mongoose = require('mongoose');
const config = require("./config");

const app = express();

app.use(express.urlencoded({extended:true}));

app.use(express.json()); 
app.use(express.static("public"));

const Schema = mongoose.Schema;

mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

const studentSchema = new Schema({
  name: String,
  email: {
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  password: {
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        return v.length >= 6;
      },
      message: props => `Password must be at least 6 characters long!`
    }
  }
});

const Student = mongoose.model('Student', studentSchema);


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


app.post('/students', (req, res) => {
  const name = req.body.studentName;
  const email = req.body.parentEmail;
  const phone = req.body.parentPhone;
  const password = req.body.password;

  const student = new Student({
    name: name,
    email: email,
    phone: phone,
    password: password
  });

  student.save()
    .then(result => {
      console.log('Inserted new student:', result);
      res.redirect('/students'); // Redirect to success page after successful insertion
    })
    .catch(err => console.error('Failed to insert student:', err));
});


app.get('/students', (req, res) => {
  Student.find()
    .then(students => {
      console.log('Retrieved all students:', students);
      res.json(students);
    })
    .catch(err => console.error('Failed to retrieve students:', err));
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started Successfully at localhost:3000");
});