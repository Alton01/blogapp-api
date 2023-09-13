

const express = require('express');
const User = require('./models/User');
const Post = require('./models/Post');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const dotenv = require('dotenv').config();



const salt = bcrypt.genSaltSync(10);
const JWT_SECRET = 'fhdbcbxvseyrufhggvbcndfh';

app.use(cors(
    {
        credentials: true, 
        methods: ("POST", "PUT", "GET"),
        origin: 'https://blogapp-r3lr.onrender.com'
        }
));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
 

mongoose.connect(process.env.MONGO_URL);
 
// ---------------------------TO CREATE A  USER -------------------------
app.post('/register', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {username, password} = req.body;
    try {
        const userDoc = await User.create({
            username, 
            password: bcrypt.hashSync(password,salt),
        });
   //     res.json(userDoc); 
   {
    jwt.sign({username,id:userDoc._id}, process.env.JWT_SECRET, {}, (err,token) => {
        if(err) throw err;
        res.cookie('token', token).json({
            id: userDoc._id,
            username,
        });
    });
    }
    } catch (e) {
        res.status(400).json(e);
    }  
});

//------------------------TO LOGIN A USER---------------------------------------
app.post('/login', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {username,password} = req.body;
    const userDoc = await User.findOne({username});

    if (!userDoc) {
        return res.json ({
            error: 'NO USER FOUND'
        })
    }
    
    const passOk = bcrypt.compareSync(password, userDoc.password);

    if (passOk) {
        jwt.sign({username,id:userDoc._id}, process.env.JWT_SECRET, {}, (err,token) => {
            if(err) throw err;
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            });
        });
    } else {
        res.status(400).json('Index wrong credentials');
    }

   
   
});

// TO CHECK FOR COOKIES
app.get('/profile', (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {token} = req.cookies;
    jwt.verify(token, process.env.JWT_SECRET, {}, (err,info) => {
        if (err) throw err;
        res.json(info);
    });
});


// TO LOG A USER OUT
app.post('/logout', (req,res) => {
    res.cookie('token', '').json('ok');
   
})




//TO CREATE A BLOG POST

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    //for saving file from blog post image
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext;
    fs.renameSync(path, newPath);

    const {token} = req.cookies;
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err,info) => {
        if (err) throw err;
        const {title,summary,content} = req.body;
        const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author:info.id,
    });
        res.json(postDoc);
    });

});

//--------------------------TO UPDATE A POST ----------------------------------------------

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    let newPath = null;
    if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
    }

    const {token} = req.cookies;
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err,info) => {
        if (err) throw err;
        const {id,title,summary,content} = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if (!isAuthor) {
           return res.status(400).json('You Are Not The Author Of This Post');
               }
           await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover,
           });
        res.json(postDoc);
    });
});


//FOR GETTING ALL POSTS
app.get('/post', async (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    res.json(await Post.find()
    .populate('author', ['username'])
    .sort({createdAt: -1})
    .limit(20)
    );
});


// To GET A  SINGLE POST
app.get('/post/:id', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
});






app.listen(process.env.PORT);