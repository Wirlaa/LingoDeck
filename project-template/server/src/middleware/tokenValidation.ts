import {Request, Response, NextFunction} from "express"
import jwt, { JwtPayload } from "jsonwebtoken"

export const validate = (req, res, next) => {
    const token = req.header('authorization')?.split(" ")[1]
    if(!token) return res.status(401).json({message: "Access denied, missing token"})
    try {
        req.user = jwt.verify(token, process.env.SECRET)
        next()
    } catch (error) {
        res.status(401).json({message: "Access denied, invalid token"})
    }
}

export interface CustomRequest extends Request {
    user?: JwtPayload
}

export const validateUser = (req: CustomRequest, res: Response, next: NextFunction)  => {
    const token = req.header('authorization')?.split(" ")[1]
    if (!token) return res.status(401).json({message: "Token not found."})
    try {
        req.user = jwt.verify(token, process.env.SECRET)
        next()
    } catch (error) {
        res.status(401).json({message: "Invalid token"})
    }
}

export const validateAdmin = (req: CustomRequest, res: Response, next: NextFunction)  => {
    const token = req.header('authorization')?.split(" ")[1]
    if (!token) return res.status(401).json({message: "Token not found."})
    try {
        req.user = jwt.verify(token, process.env.SECRET)
        if (req.user.isAdmin) return next()
        res.status(403).json({message: "Access denied."})
    } catch (error) {
        res.status(401).json({message: "Invalid token"})
    }
}