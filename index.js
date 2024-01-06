const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mdw7xv9.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "Unauthorized Access" })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "Unauthorized Access" })
        }
        req.decoded = decoded;
        next()
    })
}


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    const lawyersCollection = client.db("lawyer-finder").collection("allLawyer");
    const usersCollection = client.db("lawyer-finder").collection("users");
    const blogCollection = client.db("lawyer-finder").collection("blogs");
    const serviceCollection = client.db("lawyer-finder").collection("services");
    const jobCollection = client.db("lawyer-finder").collection("career");
    const applicationCollection = client.db("lawyer-finder").collection("jobApplication");
    const feedbackCollection = client.db("lawyer-finder").collection("feedbacks");
    const postCollection = client.db("lawyer-finder").collection("legalPost");
    const supportCollection = client.db("lawyer-finder").collection("support");
    try {

        // JWT
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "4h" })
            res.send({ token })
        })

        //Verify Admin

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            if (result?.role !== "admin") {
                // return res.status(403).send({ error: true, message: "Forbidden access" })
                const result = { admin: false }
                return res.send(result);
            }
            next()
        }

        const verifyAttorney = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            if (result?.role !== "attorney") {
                // return res.status(403).send({ error: true, message: "Forbidden access" })
                const result = { attorney: false }
                return res.send(result);
            }
            next()
        }

        app.get("/all-lawyers", async (req, res) => {
            const result = await lawyersCollection.find({}).toArray();
            res.send(result)
        })

        // Create lawyer
        app.post("/create-lawyer/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "attorney"
                }
            }
            const newData = req.body;
            const result = await lawyersCollection.insertOne(newData);
            if (result?.insertedId) {
                const updateRes = await usersCollection.updateOne(filter, updateDoc);
                if (updateRes?.modifiedCount > 0) {
                    res.send({ insertedId: result?.insertedId, modifiedCount: updateRes?.modifiedCount })
                }
            }

        })

        app.get("/single-lawyer-profile/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await lawyersCollection.findOne(filter);
            return res.send(result)
        })

        app.get("/all-blogs", async (req, res) => {
            const result = await blogCollection.find({}).toArray();
            return res.send(result)
        })

        app.get("/single-blog-details/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await blogCollection.findOne(filter);
            res.send(result)
        })

        app.get("/get-all-services", async (req, res) => {
            const result = await serviceCollection.find({}).toArray();
            res.send(result);
        })

        app.get("/single-service-details/:name", async (req, res) => {
            const name = req.params.name;
            const filter = { title: new RegExp(name, 'i') };
            const result = await serviceCollection.findOne(filter);
            res.send(result);
        });

        // Admin And Attorney

        app.get("/users/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            const result = { admin: user?.role === "admin" }
            res.send(result);
        })


        app.get("/users/attorney/:email", verifyJWT, verifyAttorney, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            const result = { attorney: user?.role === "attorney" }
            res.send(result);
        })

        app.patch("/users/attorney/:id", verifyJWT, verifyAttorney, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const userUpdate = {
                $set: {
                    role: "attorney"
                }
            };
            const result = await usersCollection.updateOne(filter, userUpdate);
            res.send(result);
        })

        // users api
        app.post("/users", async (req, res) => {
            const newUser = req.body;
            const email = { email: newUser.email };
            const existUser = await usersCollection.findOne(email);
            if (existUser) {
                return res.json("User Exist!")
            } else {
                const result = await usersCollection.insertOne(newUser);
                return res.send(result);
            }
        })

        app.get("/user", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            if (query) {
                const result = await usersCollection.findOne(query);
                res.send(result)
            }
        })


        app.patch("/update-user-profile-picture/:id", verifyJWT, async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    photo: data?.photo
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            return res.send(result)
        })


        app.patch("/edit-user-profile/:id", verifyJWT, async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    name: data?.name,
                    email: data?.email,
                    phone: data?.phone
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            return res.send(result)
        })


        app.get("/all-job-post", verifyJWT, async (req, res) => {
            const result = await jobCollection.find({}).toArray();
            return res.send(result)
        })
        app.get("/job-post/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const result = await jobCollection.findOne(filter);
            return res.send(result)
        })
        app.post("/create-job-application", async (req, res) => {
            const newData = req.body;
            const result = await applicationCollection.insertOne(newData);
            return res.send(result)
        })
        app.post("/create-feedback", verifyJWT, async (req, res) => {
            const newData = req.body;
            const result = await feedbackCollection.insertOne(newData);
            return res.send(result)
        })
        app.post("/create-post", verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await postCollection.insertOne(data);
            return res.send(result)
        })
        app.get("/get-single-post", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const filter = { userEmail: email };
            const result = await postCollection.find(filter).toArray();
            return res.send(result)
        })

        // Attorney apis

        app.post("/create-new-blogs", verifyJWT, verifyAttorney, async (req, res) => {
            const data = req.body;
            const result = await blogCollection.insertOne(data);
            return res.send(result)

        })

        app.get("/attorney-info", verifyJWT, verifyAttorney, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            if (query) {
                const result = await lawyersCollection.findOne(query);
                res.send(result)
            }
        })

        app.patch("/update-attorney-profile-picture/:id", verifyJWT, verifyAttorney, async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    image: data?.image
                }
            }
            const result = await lawyersCollection.updateOne(filter, updateDoc);
            return res.send(result)
        })

        app.patch("/edit-attorney-profile/:id", verifyJWT, verifyAttorney, async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    name: data?.name,
                    email: data?.email,
                    description: data?.description,
                    expert_in: data?.expert_in,
                    total_case: data?.total_case,
                    rating: data?.rating,
                    success_rate: data?.success_rate,
                    phone: data?.phone
                }
            }
            const result = await lawyersCollection.updateOne(filter, updateDoc);
            return res.send(result)
        })

        app.patch("/update-fee-structure/:id", verifyJWT, verifyAttorney, async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    fee_structure: data?.fee_structure,
                }
            }
            const result = await lawyersCollection.updateOne(filter, updateDoc);
            return res.send(result)
        })

        app.post("/create-job-post", verifyJWT, verifyAttorney, async (req, res) => {
            const data = req.body;
            const result = await jobCollection.insertOne(data);
            return res.send(result)
        })

        app.get("/lawyer-hiring-post/:email", verifyJWT, verifyAttorney, async (req, res) => {
            const email = req.params.email;
            const filter = { contact_email: email }
            const result = await jobCollection.find(filter).toArray();
            return res.send(result)
        })

        app.get("/job-applications/:email", verifyJWT, verifyAttorney, async (req, res) => {
            const email = req.params.email;
            const filter = { author: email }
            const result = await applicationCollection.find(filter).toArray();
            return res.send(result)
        })

        // Admin API
        app.post("/create-support", verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await supportCollection.insertOne(data);
            return res.send(result)
        })

        app.get("/get-all-support", verifyJWT, verifyAdmin, async (req, res) => {
            const result = await supportCollection.find({}).toArray();
            return res.send(result)
        })

        app.get("/get-all-blog", verifyJWT, verifyAdmin, async (req, res) => {
            const result = await blogCollection.find({}).toArray();
            return res.send(result)
        })

        app.delete("/delete-single-blog/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await blogCollection.deleteOne(filter);
            return res.send(result)
        })

        app.get("/get-all-user", verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find({}).toArray();
            return res.send(result)
        })


        app.get("/get-all-attorney", verifyJWT, verifyAdmin, async (req, res) => {
            const result = await lawyersCollection.find({}).toArray();
            return res.send(result)
        })

        app.delete("/delete-attorney/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await lawyersCollection.deleteOne(query);
            res.send(result)
        })

        app.patch("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const userUpdate = {
                $set: {
                    role: "admin"
                }
            };
            const result = await usersCollection.updateOne(filter, userUpdate);
            res.send(result);
        })

        app.patch("/users/remove/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const userUpdate = {
                $set: {
                    role: "User"
                }
            };
            const result = await usersCollection.updateOne(filter, userUpdate);
            res.send(result);
        })

        app.delete("/user-delete/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })



        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Server successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get("/", (req, res) => {
    res.send("Lawyer finder server is running")
})

app.listen(port, () => {
    console.log(`Server running at port ${port}`);
})