import express, {Express, Request, Response } from 'express'
import dotenv from 'dotenv'
import path from 'path'
import morgan from 'morgan'
import userRouter from './src/routes/userRoutes'
import mongoose, {Promise} from 'mongoose'
import cors, {CorsOptions} from 'cors'

dotenv.config()

// mongoose.connect(process.env.MONGODB_URI)
mongoose.Promise = Promise
mongoose.connection.once("open", () => {console.log("Connected to MongoDB")})
mongoose.connection.on('error', console.error.bind(console,'MongoDB connection error'))

const app: Express = express()
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(morgan('dev'))
app.use("/api/user", userRouter)

if (process.env.NODE_ENV === 'development') {
    const corsOptions: CorsOptions = {
        origin: 'http://localhost:3000',
        optionsSuccessStatus: 200
    }
    app.use(cors(corsOptions))
}

if (process.env.NODE_ENV === 'production') {
    console.log("here", process.env.NODE_ENV)
    app.use(express.static(path.resolve('..', 'client', 'dist')))
    app.get('/{*any}', (req: Request, res: Response) => {
        res.sendFile(path.resolve('..', 'client', 'dist', 'index.html'))
    })
}

app.listen(process.env.PORT, () => { console.log(`project: Server running on port ${process.env.PORT}`) })
