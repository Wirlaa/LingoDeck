import { Request, Response, NextFunction} from "express"
import { body, Result, ValidationError, validationResult } from 'express-validator'

export const registerValidator = [
    body("email").trim().isEmail().normalizeEmail().escape(),
    body("username").trim().isLength({ min: 3, max: 25 }).escape(),
    body("password").isLength({ min: 3 }),
    // body("password").isStrongPassword(), //no ui for this rn
    (req: Request, res: Response, next: NextFunction) => {
        const errors: Result<ValidationError>  = validationResult(req)
        if (!errors.isEmpty()) return res.status(400).json({message: 'Input validation failed', errors: errors.array()})
        next()
    }
]

export const loginValidator = [
    body("email").trim().isEmail().escape(),
    (req: Request, res: Response, next: NextFunction) => {
        const errors: Result<ValidationError>  = validationResult(req)
        if (!errors.isEmpty()) return res.status(400).json({message: 'Input validation failed', errors: errors.array()})
        next()
    }
]


