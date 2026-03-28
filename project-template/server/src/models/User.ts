import { Document, Schema, Model, model } from 'mongoose'

interface IUser extends Document {
    email: string
    password: string
    username: string
    isAdmin: boolean
}

const userSchema: Schema = new Schema({
    email: { type: String, required: true },
    password: { type: String, required: true },
    username: { type: String, required: true },
    isAdmin: { type: Boolean, required: true },
})

const User: Model<IUser> = model<IUser>('User', userSchema)

export { User, IUser }
