import {Request, Response, Router} from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {User, IUser} from '../models/User'
import {loginValidator, registerValidator} from "../middleware/inputValidation"

const router: Router = Router()

router.post('/register', registerValidator, async (req: Request, res: Response) => {
    const { username, email, password, confirmPassword } = req.body
    try {
        let user: IUser | null = await User.findOne({email: email})
        if (user) return res.status(400).json('Email already in use')
        if (password !== confirmPassword) return res.status(403).json("Passwords do not match")

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        user = await User.create({
            email: email,
            password: hashedPassword,
            username: username,
            isAdmin: false,
        })
        res.status(201).json({ id: user._id, username: user.username })
    } catch (error: any) {
        console.log(`Error while registering user: ${error}`)
        res.status(500).json('Internal server error')
    }
})

router.post('/login', loginValidator, async (req: Request, res: Response) => {
    const { email, password } = req.body
    try {
        let user: IUser | null = await User.findOne({email: email})
        if (!user) return res.status(404).json({message:'Login failed'})

        if (bcrypt.compareSync(password, user.password)) {
            // const token: string = jwt.sign({ _id: user._id, username: user.username, isAdmin: user.isAdmin}, process.env.SECRET, { expiresIn: '1h'})
            return res.status(200).json("Success")//.json({success: true, token})
        }
        res.status(401).json({message: 'Login failed'})
    } catch (error: any) {
        console.log(`Error while login user: ${error}`)
        res.status(500).json('Internal server error')
    }
})

export default router