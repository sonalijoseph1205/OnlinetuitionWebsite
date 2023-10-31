const express = require("express");
const mongoose = require('mongoose');
const ejs = require('ejs');
const bcrypt = require('bcrypt');
const app = express();
const config = require("./config");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set('view engine', 'ejs');

const Schema = mongoose.Schema;

// Establish the MongoDB connection using the configured URI
mongoose.connect(process.env.MONGODB_URI || config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// Define the Student schema and model
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

// Define the Timetable schema and model
const timetableSchema = new Schema({
  studentName: String,
  Subject: String,
  classDay: String,
  classTime: String,
  link: String,
});

const Timetable = mongoose.model('Timetable', timetableSchema);

// Define the Admin schema and model
const adminSchema = new Schema({
  adminEmail: {
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  adminPassword: {
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

// Admin model
const Admin = mongoose.model('Admin', adminSchema);

// Function to hash the password
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

// Routes

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/signup.html');
});

app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/input.html');
});

app.get('/admin-signup', (req, res) => {
  res.render('admin-signup');
});

app.get('/admin-login', (req, res) => {
  res.render('admin-login');
});

app.get('/students', (req, res) => {
  console.log('Request received for /students');
  Student.find({})
    .then(students => {
      console.log(students);
      res.render('students', { students: students });
    })
    .catch(err => {
      console.error('Failed to find students:', err);
      res.status(500).send('Error fetching students');
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

  if (!adminEmail || !adminPassword) {
    return res.status(400).send('Invalid admin email or password');
  }

  const hashedAdminPassword = hashPassword(adminPassword);

  const admin = new Admin({
    adminEmail: adminEmail,
    adminPassword: hashedAdminPassword,
  });

  admin.save()
    .then(result => {
      console.log('Admin account created:', result);
      res.redirect('/admin-login');
    })
    .catch(err => {
      console.error('Failed to create admin account:', err);
      res.status(500).send('Failed to create admin account');
    });
});

app.post('/admin-login', async (req, res) => {
  const adminEmail = req.body.adminEmail;
  const adminPassword = req.body.adminPassword;

  if (!adminEmail || !adminPassword) {
    return res.status(400).send('Invalid email or password');
  }

  try {
    const admin = await Admin.findOne({ adminEmail: adminEmail }).exec();

    if (!admin) {
      return res.status(400).send('Admin not found');
    }

    if (bcrypt.compareSync(adminPassword, admin.adminPassword)) {
      return res.redirect('/admin');
    } else {
      return res.status(400).send('Invalid email or password');
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
  const password = hashPassword(req.body.password);

  const student = new Student({
    name: name,
    email: email,
    phone: phone,
    password: password
  });

  student.save()
    .then(result => {
      console.log('Inserted new student:', result);
      res.redirect('/');
    })
    .catch(err => console.error('Failed to insert student:', err));
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server has started successfully at localhost:${port}`);
});
