const express = require("express");
const mongoose = require('mongoose');
const config = require("./config");
const ejs = require('ejs');
const bcrypt = require('bcrypt');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set('view engine', 'ejs');

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

//Timetable schema
mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// Define a schema for the timetable collection
const timetableSchema = new Schema({
  studentName: String,
  Subject: String,
  classDay: String,
  classTime: String,
  link: String,
});

const Timetable = mongoose.model('Timetable', timetableSchema);

//Admin schema
const adminSchema = new Schema({
  adminEmail: { // Change the field name to match the HTML form input name
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  adminPassword: { // Change the field name to match the HTML form input name
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        return v.length >= 6;
      },
      message: props => `Password must be at least 6 characters long!`
    },
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
});

//Admin model 
const Admin = mongoose.model('Admin', adminSchema);


// Function to hash the password
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10); 
};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/login.html');
});

app.get('/signup', function(req, res) {
  res.sendFile(__dirname + '/signup.html');
});

app.get('/admin', function(req, res) {
  res.sendFile(__dirname + '/timetable.html');
});

app.get('/admin-signup', function (req, res) {
  res.render('admin-signup'); 
});

app.get('/admin-login', function (req, res) {
  res.render('admin-login'); 
});


app.get('/students', (req, res) => {
  console.log('Request received for /students'); // Log the request
  Student.find({})
    .then(students => {
      console.log(students); // Log retrieved students
      res.render('students', { students: students }); // Render the EJS template
    })
    .catch(err => {
      console.error('Failed to find students:', err); // Log any errors
      res.status(500).send('Error fetching students'); // Send an error response
    });
});


app.get('/timetable', (req, res) => {
  Timetable.find({})
    .then(timetable => {
      console.log(timetable);
      res.render('timetable', { timetable: timetable });
    })
    .catch(err => console.error('Failed to find timetable entries:', err));
});

app.post('/login', (req, res) => {
  const email = req.body.parentEmail;
  const password = req.body.password;

  Student.findOne({ email: email })
    .then(student => {
      if (!student) {
        return res.status(400).send('Invalid Email or Password');
      }

      // Compare the hashed password from the request with the hashed password in the database
      if (bcrypt.compareSync(password, student.password)) {
        console.log('Logged in student:', student);
        res.redirect('/timetable');
      } else {
        return res.status(400).send('Invalid Email or Password');
      }
    })
    .catch(err => console.error('Failed to find student:', err));
});


app.post('/admin-signup', (req, res) => {
  const adminEmail = req.body.adminEmail;
  const adminPassword = req.body.adminPassword;

  // Check if the admin email and password are valid
  if (!adminEmail || !adminPassword) {
    return res.status(400).send('Invalid admin email or password');
  }

  const hashedAdminPassword = hashPassword(adminPassword);

  // Create a new Admin instance and save it to the database
  const admin = new Admin({
    adminEmail: adminEmail, // Use the correct field names from your Mongoose schema
    adminPassword: hashedAdminPassword, // Use the correct field names from your Mongoose schema
  });

  admin.save()
    .then(result => {
      console.log('Admin account created:', result);
      res.redirect('/admin-login'); // Redirect to the admin page
    })
    .catch(err => {
      console.error('Failed to create admin account:', err);
      res.status(500).send('Failed to create admin account');
    });
});



app.post('/admin-login', async (req, res) => {
  const adminEmail = req.body.adminEmail;
  const adminPassword = req.body.adminPassword;

  // Check if the admin email and password are provided
  if (!adminEmail || !adminPassword) {
    return res.status(400).send('Invalid email or password');
  }

  try {
    // Find the admin with the provided email in the admin database
    const admin = await Admin.findOne({ adminEmail: adminEmail }).exec();

    if (!admin) {
      return res.status(400).send('Admin not found');
    }

    // Check if the provided password matches the hashed password in the database
    if (bcrypt.compareSync(adminPassword, admin.adminPassword)) {
      // Passwords match, so redirect to the admin route
      return res.redirect('/admin');
    } else {
      return res.status(400).send('Admin not found');
    }
  } catch (err) {
    return res.status(500).send('Error finding admin');
  }
});


  

app.post('/process', (req, res) => {
  const studentName = req.body.studentName;
  const subject = req.body.Subject;
  const classDay = req.body.classDay;
  const classTime = req.body.classTime;
  const link = req.body.link;

  const timetableEntry = new Timetable({
    studentName: studentName,
    Subject: subject,
    classDay: classDay,
    classTime: classTime,
    link: link,
  });

  timetableEntry.save()
    .then(result => {
      console.log('Inserted new timetable entry:', result);
      res.redirect('/timetable');
    })
    .catch(err => console.error('Failed to insert timetable entry:', err));
});

app.post('/students', (req, res) => {
  const name = req.body.studentName
  const email = req.body.parentEmail;
  const phone = req.body.parentPhone;
  const password = hashPassword(req.body.password); // Hash the password

  const student = new Student({
    name: name,
    email: email,
    phone: phone,
    password: password // Store the hashed password
  });

  student.save()
    .then(result => {
      console.log('Inserted new student:', result);
      res.redirect('/');
    })
    .catch(err => console.error('Failed to insert student:', err));
});

// Checks if the email and password entered are correct
app.post('/admin-login', async (req, res) => {
  const adminEmail = req.body.adminEmail;
  const adminPassword = req.body.adminPassword;

  // Check if the admin email and password are provided
  if (!adminEmail || !adminPassword) {
    return res.status(400).send('Invalid email or password');
  }

  try {
    // Find the admin with the provided adminEmail in the admin database
    const admin = await Admin.findOne({ adminEmail: adminEmail }).exec();

    if (!admin) {
      return res.status(400).send('Admin not found');
    }

    // Check if the provided password matches the hashed adminPassword in the database
    if (bcrypt.compareSync(adminPassword, admin.adminPassword)) {
      // Passwords match, so redirect to the admin route
      return res.redirect('/admin');
    } else {
      return res.status(400).send('Invalid email or password');
    }
  } catch (err) {
    return res.status(500).send('Error finding admin');
  }
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started Successfully at localhost:3000");
});
